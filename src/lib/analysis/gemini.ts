import { GoogleGenAI } from '@google/genai';
import type { Ad } from '../db/schema';

const VIDEO_ANALYSIS_PROMPT = `Watch this ad video completely and analyze it for a creative swipe file. Extract the following in JSON format:

{
  "transcript": {
    "full_text": "Complete transcription of all spoken words",
    "segments": [
      {"time": "0:00", "text": "First segment..."},
      {"time": "0:03", "text": "Next segment..."}
    ]
  },
  "hook": {
    "text": "Exact words/visuals in first 3 seconds",
    "technique": "curiosity_gap | contrarian | pain_point | bold_claim | question | story_open",
    "duration_seconds": 3,
    "why_it_works": "Brief explanation"
  },
  "visual_format": {
    "style": "ugc_selfie | talking_head | screen_recording | broll_heavy | animation | mixed",
    "scenes": [
      {"time": "0:00-0:08", "description": "Scene description"},
      {"time": "0:08-0:20", "description": "Next scene"}
    ],
    "text_overlays": ["List of all on-screen text"],
    "transitions": "jump_cuts | smooth | none | mixed",
    "thumbnail_frame": "Description of best thumbnail frame"
  },
  "audio": {
    "voice": "Description: gender, age estimate, accent, energy level",
    "music": "Description of background music mood/genre or 'none'",
    "sfx": ["List of sound effects used"],
    "energy_arc": "How energy/pace changes through the video"
  },
  "persuasion": {
    "pain_points": ["List of problems addressed with timestamps"],
    "desire": "What outcome/transformation is promised",
    "proof_elements": ["List of credibility elements shown"],
    "cta": {
      "type": "hard_sell | soft_curiosity | urgency | scarcity | social_proof",
      "text": "Exact CTA words",
      "timestamp": "When CTA appears"
    },
    "emotional_arc": "e.g., skeptical → discovery → excitement → invitation"
  },
  "production": {
    "budget_estimate": "low_phone | medium_basic | high_produced",
    "duration_breakdown": {
      "hook": "0-3s",
      "body": "3-40s", 
      "cta": "40-end"
    },
    "key_success_factors": ["What makes this ad work"]
  },
  "replication": {
    "script_template": "Fill-in-the-blank version of the script structure",
    "shot_list": ["List of shots needed to recreate"],
    "variations": [
      "Variation idea 1",
      "Variation idea 2",
      "Variation idea 3"
    ]
  },
  "niche": "Detected niche/vertical",
  "target_audience": "Who this ad is targeting",
  "estimated_performance": "Why this ad likely performs well"
}

Be thorough and specific. Include exact timestamps. Return ONLY valid JSON, no markdown.`;

const IMAGE_ANALYSIS_PROMPT = `Analyze this ad image for a creative swipe file. Extract the following in JSON format:

{
  "visual_elements": {
    "format": "static_image | carousel | graphic | photo | ugc_screenshot",
    "composition": "Description of layout and visual hierarchy",
    "colors": ["Primary colors used"],
    "text_overlays": ["All text visible in the image"],
    "focal_point": "What draws the eye first"
  },
  "copy_analysis": {
    "headline": "Main headline if visible",
    "body": "Body copy if visible",
    "cta": "Call to action text"
  },
  "persuasion": {
    "hook_type": "curiosity | pain | benefit | social_proof | urgency",
    "pain_points": ["Problems addressed"],
    "desire": "What's promised",
    "proof_elements": ["Credibility elements"]
  },
  "production": {
    "style": "professional | ugc | mixed",
    "estimated_cost": "low | medium | high"
  },
  "replication": {
    "template": "How to recreate this style",
    "variations": ["3 variation ideas"]
  },
  "niche": "Detected niche",
  "target_audience": "Who this targets"
}

Return ONLY valid JSON, no markdown.`;

export interface AdAnalysis {
  transcript?: {
    full_text: string;
    segments: Array<{ time: string; text: string }>;
  };
  hook: {
    text: string;
    technique: string;
    duration_seconds?: number;
    why_it_works?: string;
  };
  visual_format: {
    style: string;
    scenes?: Array<{ time: string; description: string }>;
    text_overlays: string[];
    transitions?: string;
    thumbnail_frame?: string;
    composition?: string;
    colors?: string[];
    focal_point?: string;
  };
  audio?: {
    voice: string;
    music: string;
    sfx: string[];
    energy_arc: string;
  };
  persuasion: {
    pain_points: string[];
    desire: string;
    proof_elements: string[];
    cta: {
      type: string;
      text: string;
      timestamp?: string;
    };
    emotional_arc?: string;
    hook_type?: string;
  };
  production: {
    budget_estimate?: string;
    style?: string;
    estimated_cost?: string;
    duration_breakdown?: {
      hook: string;
      body: string;
      cta: string;
    };
    key_success_factors?: string[];
  };
  replication: {
    script_template?: string;
    template?: string;
    shot_list?: string[];
    variations: string[];
  };
  niche: string;
  target_audience: string;
  estimated_performance?: string;
}

export class GeminiAnalyzer {
  private ai: GoogleGenAI;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY is required for analysis');
    }
    this.ai = new GoogleGenAI({ apiKey: key });
  }

  /**
   * Download media from URL and return as base64
   */
  private async downloadMedia(url: string): Promise<{ data: string; mimeType: string }> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download media: ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || 'video/mp4';
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');

    return { data: base64, mimeType: contentType };
  }

  /**
   * Analyze a video ad
   */
  async analyzeVideo(videoUrl: string): Promise<AdAnalysis> {
    const { data, mimeType } = await this.downloadMedia(videoUrl);

    const response = await this.ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType,
                data,
              },
            },
            { text: VIDEO_ANALYSIS_PROMPT },
          ],
        },
      ],
    });

    const text = response.text || '';
    // Clean up potential markdown code blocks
    const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(jsonStr) as AdAnalysis;
  }

  /**
   * Analyze an image ad
   */
  async analyzeImage(imageUrl: string): Promise<AdAnalysis> {
    const { data, mimeType } = await this.downloadMedia(imageUrl);

    const response = await this.ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType,
                data,
              },
            },
            { text: IMAGE_ANALYSIS_PROMPT },
          ],
        },
      ],
    });

    const text = response.text || '';
    const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(jsonStr) as AdAnalysis;
  }

  /**
   * Analyze an ad based on its type
   */
  async analyzeAd(ad: Ad): Promise<AdAnalysis | null> {
    const mediaUrls = ad.mediaUrls ? JSON.parse(ad.mediaUrls) : [];
    
    if (mediaUrls.length === 0) {
      console.warn(`Ad ${ad.id} has no media URLs to analyze`);
      return null;
    }

    const mediaUrl = mediaUrls[0];

    try {
      if (ad.mediaType === 'video') {
        return await this.analyzeVideo(mediaUrl);
      } else {
        return await this.analyzeImage(mediaUrl);
      }
    } catch (error) {
      console.error(`Failed to analyze ad ${ad.id}:`, error);
      throw error;
    }
  }
}

// Singleton instance
let analyzerInstance: GeminiAnalyzer | null = null;

export function getAnalyzer(): GeminiAnalyzer {
  if (!analyzerInstance) {
    analyzerInstance = new GeminiAnalyzer();
  }
  return analyzerInstance;
}
