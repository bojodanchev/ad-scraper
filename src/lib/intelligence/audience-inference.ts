import { GoogleGenAI } from '@google/genai';
import { nanoid } from 'nanoid';
import type { Ad, NewAudienceInference } from '../db/schema';

const AUDIENCE_INFERENCE_PROMPT = `Analyze this ad creative and infer the target audience. You are a media buyer with 10+ years experience. Based on the visual style, messaging, offer type, and production quality, determine who this ad is targeting.

Return JSON in this exact format:
{
  "demographics": {
    "age_min": 25,
    "age_max": 45,
    "age_reasoning": "Why this age range",
    "gender": "male | female | all",
    "gender_reasoning": "Why this gender",
    "income_level": "low | middle | high | affluent",
    "income_reasoning": "Why this income level"
  },
  "psychographics": {
    "interests": ["interest1", "interest2", "interest3"],
    "interests_reasoning": "Why these interests",
    "pain_points": ["pain1", "pain2"],
    "pain_points_reasoning": "What problems are addressed",
    "desires": ["desire1", "desire2"],
    "desires_reasoning": "What outcomes are promised"
  },
  "targeting": {
    "niche": "ecommerce | saas | finance | health | fitness | beauty | education | realestate | crypto | mmo | other",
    "niche_reasoning": "Why this niche",
    "buyer_type": "impulse | considered | b2b",
    "buyer_type_reasoning": "Why this buyer type",
    "likely_facebook_interests": ["Facebook interest targeting suggestions"],
    "likely_lookalike_source": "What type of custom audience would work"
  },
  "confidence": {
    "overall": 0.85,
    "demographics_confidence": 0.9,
    "psychographics_confidence": 0.8,
    "reasoning": "What signals gave you confidence or uncertainty"
  }
}

Be specific and data-driven. Base your inferences on:
- Visual style and production quality (indicates budget/audience sophistication)
- Language and tone (formal vs casual, jargon used)
- Pain points addressed (reveals target problems)
- Offer type and price signals
- Models/people shown in the ad
- Platform-specific cues

Return ONLY valid JSON, no markdown.`;

export interface AudienceInferenceResult {
  demographics: {
    age_min: number;
    age_max: number;
    age_reasoning: string;
    gender: 'male' | 'female' | 'all';
    gender_reasoning: string;
    income_level: 'low' | 'middle' | 'high' | 'affluent';
    income_reasoning: string;
  };
  psychographics: {
    interests: string[];
    interests_reasoning: string;
    pain_points: string[];
    pain_points_reasoning: string;
    desires: string[];
    desires_reasoning: string;
  };
  targeting: {
    niche: string;
    niche_reasoning: string;
    buyer_type: 'impulse' | 'considered' | 'b2b';
    buyer_type_reasoning: string;
    likely_facebook_interests: string[];
    likely_lookalike_source: string;
  };
  confidence: {
    overall: number;
    demographics_confidence: number;
    psychographics_confidence: number;
    reasoning: string;
  };
}

export class AudienceInferenceEngine {
  private ai: GoogleGenAI;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY is required for audience inference');
    }
    this.ai = new GoogleGenAI({ apiKey: key });
  }

  private async downloadMedia(url: string): Promise<{ data: string; mimeType: string }> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download media: ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');

    return { data: base64, mimeType: contentType };
  }

  async inferAudience(mediaUrl: string, mediaType: 'video' | 'image' = 'image'): Promise<AudienceInferenceResult> {
    const { data, mimeType } = await this.downloadMedia(mediaUrl);

    const response = await this.ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: mediaType === 'video' ? 'video/mp4' : mimeType,
                data,
              },
            },
            { text: AUDIENCE_INFERENCE_PROMPT },
          ],
        },
      ],
    });

    const text = response.text || '';
    const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(jsonStr) as AudienceInferenceResult;
  }

  async inferFromAd(ad: Ad): Promise<AudienceInferenceResult | null> {
    const mediaUrls = ad.mediaUrls ? JSON.parse(ad.mediaUrls) : [];

    if (mediaUrls.length === 0) {
      // Try thumbnail
      if (ad.thumbnailUrl) {
        return await this.inferAudience(ad.thumbnailUrl, 'image');
      }
      console.warn(`Ad ${ad.id} has no media URLs to analyze`);
      return null;
    }

    const mediaUrl = mediaUrls[0];
    const mediaType = ad.mediaType === 'video' ? 'video' : 'image';

    return await this.inferAudience(mediaUrl, mediaType as 'video' | 'image');
  }

  toDbRecord(adId: string, result: AudienceInferenceResult): NewAudienceInference {
    return {
      id: nanoid(),
      adId,
      inferredAgeMin: result.demographics.age_min,
      inferredAgeMax: result.demographics.age_max,
      inferredGender: result.demographics.gender,
      inferredIncomeLevel: result.demographics.income_level,
      inferredInterests: JSON.stringify(result.psychographics.interests),
      inferredPainPoints: JSON.stringify(result.psychographics.pain_points),
      inferredDesires: JSON.stringify(result.psychographics.desires),
      inferredNiche: result.targeting.niche,
      inferredBuyerType: result.targeting.buyer_type,
      confidence: result.confidence.overall.toString(),
      rawAnalysis: JSON.stringify(result),
      analyzedAt: new Date().toISOString(),
    };
  }
}

// Singleton
let inferenceEngine: AudienceInferenceEngine | null = null;

export function getAudienceInferenceEngine(): AudienceInferenceEngine {
  if (!inferenceEngine) {
    inferenceEngine = new AudienceInferenceEngine();
  }
  return inferenceEngine;
}
