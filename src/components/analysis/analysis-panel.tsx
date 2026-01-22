'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface AdAnalysis {
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
  };
  production: {
    budget_estimate?: string;
    style?: string;
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
}

interface AnalysisPanelProps {
  adId: string;
  analysis: AdAnalysis | null;
  onAnalyze?: () => void;
}

export function AnalysisPanel({ adId, analysis, onAnalyze }: AnalysisPanelProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [localAnalysis, setLocalAnalysis] = useState<AdAnalysis | null>(analysis);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setError(null);

    try {
      const response = await fetch(`/api/ads/${adId}/analyze`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze');
      }

      setLocalAnalysis(data.analysis);
      onAnalyze?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  if (!localAnalysis) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AI Analysis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Run Gemini analysis to extract hooks, scripts, visual breakdowns, and
            replication guides.
          </p>
          {error && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
              {error}
            </div>
          )}
          <Button onClick={handleAnalyze} disabled={analyzing}>
            {analyzing ? 'Analyzing with Gemini...' : 'Analyze Ad'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          AI Analysis
          <Badge variant="outline">{localAnalysis.niche}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="hook" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="hook">Hook</TabsTrigger>
            <TabsTrigger value="visual">Visual</TabsTrigger>
            <TabsTrigger value="persuasion">Persuasion</TabsTrigger>
            <TabsTrigger value="transcript">Transcript</TabsTrigger>
            <TabsTrigger value="replicate">Replicate</TabsTrigger>
          </TabsList>

          {/* Hook Tab */}
          <TabsContent value="hook" className="space-y-4 mt-4">
            <div>
              <h4 className="font-medium mb-1">Hook Text</h4>
              <p className="text-muted-foreground">&quot;{localAnalysis.hook.text}&quot;</p>
            </div>
            <div className="flex gap-2">
              <Badge>{localAnalysis.hook.technique}</Badge>
              {localAnalysis.hook.duration_seconds && (
                <Badge variant="outline">
                  {localAnalysis.hook.duration_seconds}s
                </Badge>
              )}
            </div>
            {localAnalysis.hook.why_it_works && (
              <div>
                <h4 className="font-medium mb-1">Why It Works</h4>
                <p className="text-sm text-muted-foreground">
                  {localAnalysis.hook.why_it_works}
                </p>
              </div>
            )}
          </TabsContent>

          {/* Visual Tab */}
          <TabsContent value="visual" className="space-y-4 mt-4">
            <div className="flex gap-2">
              <Badge>{localAnalysis.visual_format.style}</Badge>
              {localAnalysis.visual_format.transitions && (
                <Badge variant="outline">
                  {localAnalysis.visual_format.transitions}
                </Badge>
              )}
            </div>
            {localAnalysis.visual_format.scenes && (
              <div>
                <h4 className="font-medium mb-2">Scene Breakdown</h4>
                <div className="space-y-2">
                  {localAnalysis.visual_format.scenes.map((scene, i) => (
                    <div key={i} className="flex gap-3 text-sm">
                      <span className="font-mono text-muted-foreground w-20">
                        {scene.time}
                      </span>
                      <span>{scene.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {localAnalysis.visual_format.text_overlays.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Text Overlays</h4>
                <div className="flex flex-wrap gap-2">
                  {localAnalysis.visual_format.text_overlays.map((text, i) => (
                    <Badge key={i} variant="secondary">
                      {text}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Persuasion Tab */}
          <TabsContent value="persuasion" className="space-y-4 mt-4">
            <div>
              <h4 className="font-medium mb-2">Pain Points</h4>
              <ul className="list-disc list-inside text-sm text-muted-foreground">
                {localAnalysis.persuasion.pain_points.map((point, i) => (
                  <li key={i}>{point}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-1">Desire/Promise</h4>
              <p className="text-sm text-muted-foreground">
                {localAnalysis.persuasion.desire}
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Proof Elements</h4>
              <ul className="list-disc list-inside text-sm text-muted-foreground">
                {localAnalysis.persuasion.proof_elements.map((proof, i) => (
                  <li key={i}>{proof}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-1">CTA</h4>
              <div className="flex gap-2 items-center">
                <Badge>{localAnalysis.persuasion.cta.type}</Badge>
                <span className="text-sm">&quot;{localAnalysis.persuasion.cta.text}&quot;</span>
              </div>
            </div>
            {localAnalysis.persuasion.emotional_arc && (
              <div>
                <h4 className="font-medium mb-1">Emotional Arc</h4>
                <p className="text-sm text-muted-foreground">
                  {localAnalysis.persuasion.emotional_arc}
                </p>
              </div>
            )}
          </TabsContent>

          {/* Transcript Tab */}
          <TabsContent value="transcript" className="space-y-4 mt-4">
            {localAnalysis.transcript ? (
              <>
                <div>
                  <h4 className="font-medium mb-2">Full Transcript</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {localAnalysis.transcript.full_text}
                  </p>
                </div>
                {localAnalysis.transcript.segments.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Timestamped</h4>
                    <div className="space-y-1">
                      {localAnalysis.transcript.segments.map((seg, i) => (
                        <div key={i} className="flex gap-3 text-sm">
                          <span className="font-mono text-muted-foreground w-12">
                            {seg.time}
                          </span>
                          <span>{seg.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-muted-foreground">
                No transcript available (image ad)
              </p>
            )}
            {localAnalysis.audio && (
              <div className="border-t pt-4 mt-4">
                <h4 className="font-medium mb-2">Audio Notes</h4>
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="text-muted-foreground">Voice:</span>{' '}
                    {localAnalysis.audio.voice}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Music:</span>{' '}
                    {localAnalysis.audio.music}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Energy:</span>{' '}
                    {localAnalysis.audio.energy_arc}
                  </p>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Replicate Tab */}
          <TabsContent value="replicate" className="space-y-4 mt-4">
            {(localAnalysis.replication.script_template ||
              localAnalysis.replication.template) && (
              <div>
                <h4 className="font-medium mb-2">Script Template</h4>
                <pre className="text-sm bg-muted p-3 rounded-md whitespace-pre-wrap">
                  {localAnalysis.replication.script_template ||
                    localAnalysis.replication.template}
                </pre>
              </div>
            )}
            {localAnalysis.replication.shot_list && (
              <div>
                <h4 className="font-medium mb-2">Shot List</h4>
                <ol className="list-decimal list-inside text-sm text-muted-foreground">
                  {localAnalysis.replication.shot_list.map((shot, i) => (
                    <li key={i}>{shot}</li>
                  ))}
                </ol>
              </div>
            )}
            <div>
              <h4 className="font-medium mb-2">Variation Ideas</h4>
              <ul className="list-disc list-inside text-sm text-muted-foreground">
                {localAnalysis.replication.variations.map((v, i) => (
                  <li key={i}>{v}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-1">Target Audience</h4>
              <p className="text-sm text-muted-foreground">
                {localAnalysis.target_audience}
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
