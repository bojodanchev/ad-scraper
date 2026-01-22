'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AnalysisPanel } from '@/components/analysis/analysis-panel';

interface Ad {
  id: string;
  platform: string;
  advertiserId?: string | null;
  advertiserName?: string | null;
  advertiserPageUrl?: string | null;
  externalId?: string | null;
  headline?: string | null;
  bodyText?: string | null;
  ctaText?: string | null;
  landingUrl?: string | null;
  mediaType?: string | null;
  mediaUrls: string[];
  thumbnailUrl?: string | null;
  impressionsMin?: number | null;
  impressionsMax?: number | null;
  likes?: number | null;
  comments?: number | null;
  shares?: number | null;
  daysRunning?: number | null;
  countryTargeting: string[];
  firstSeenAt?: string | null;
  lastSeenAt?: string | null;
  scrapedAt?: string | null;
  analysis: unknown | null;
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

export default function AdDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [ad, setAd] = useState<Ad | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAd = async () => {
    try {
      const res = await fetch(`/api/ads/${id}`);
      if (!res.ok) throw new Error('Ad not found');
      const data = await res.json();
      setAd(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ad');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAd();
  }, [id]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="h-96 bg-muted rounded" />
      </div>
    );
  }

  if (error || !ad) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{error || 'Ad not found'}</p>
        <Link href="/ads">
          <Button variant="link">← Back to Library</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link href="/ads">
          <Button variant="ghost">← Back</Button>
        </Link>
        <div className="flex gap-2">
          {ad.landingUrl && (
            <a href={ad.landingUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline">View Landing Page</Button>
            </a>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left: Media */}
        <div className="space-y-4">
          {/* Video/Image Player */}
          <Card>
            <CardContent className="p-0">
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                {ad.mediaType === 'video' && ad.mediaUrls[0] ? (
                  <video
                    src={ad.mediaUrls[0]}
                    poster={ad.thumbnailUrl || undefined}
                    controls
                    className="w-full h-full object-contain"
                  />
                ) : ad.thumbnailUrl || ad.mediaUrls[0] ? (
                  <img
                    src={ad.thumbnailUrl || ad.mediaUrls[0]}
                    alt={ad.headline || 'Ad'}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    No media available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Ad Info */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Ad Details</CardTitle>
                <div className="flex gap-2">
                  <Badge variant={ad.platform === 'meta' ? 'default' : 'secondary'}>
                    {ad.platform === 'meta' ? 'Meta' : 'TikTok'}
                  </Badge>
                  {ad.mediaType && (
                    <Badge variant="outline" className="capitalize">
                      {ad.mediaType}
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Advertiser */}
              {ad.advertiserName && (
                <div>
                  <p className="text-sm text-muted-foreground">Advertiser</p>
                  <p className="font-medium">@{ad.advertiserName}</p>
                </div>
              )}

              {/* Copy */}
              {ad.headline && (
                <div>
                  <p className="text-sm text-muted-foreground">Headline</p>
                  <p>{ad.headline}</p>
                </div>
              )}

              {ad.bodyText && (
                <div>
                  <p className="text-sm text-muted-foreground">Body Copy</p>
                  <p className="whitespace-pre-wrap text-sm">{ad.bodyText}</p>
                </div>
              )}

              {ad.ctaText && (
                <div>
                  <p className="text-sm text-muted-foreground">CTA</p>
                  <Badge variant="secondary">{ad.ctaText}</Badge>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm text-muted-foreground">Days Running</p>
                  <p className="font-medium">
                    {ad.daysRunning ? `${ad.daysRunning} days` : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Impressions</p>
                  <p className="font-medium">
                    {ad.impressionsMin && ad.impressionsMax
                      ? `${formatNumber(ad.impressionsMin)} - ${formatNumber(ad.impressionsMax)}`
                      : '-'}
                  </p>
                </div>
                {ad.likes != null && (
                  <div>
                    <p className="text-sm text-muted-foreground">Likes</p>
                    <p className="font-medium">{formatNumber(ad.likes)}</p>
                  </div>
                )}
                {ad.shares != null && (
                  <div>
                    <p className="text-sm text-muted-foreground">Shares</p>
                    <p className="font-medium">{formatNumber(ad.shares)}</p>
                  </div>
                )}
              </div>

              {/* Targeting */}
              {ad.countryTargeting.length > 0 && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-2">Targeting</p>
                  <div className="flex flex-wrap gap-1">
                    {ad.countryTargeting.map((country) => (
                      <Badge key={country} variant="outline">
                        {country}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Dates */}
              <div className="pt-4 border-t text-xs text-muted-foreground">
                {ad.firstSeenAt && (
                  <p>First seen: {new Date(ad.firstSeenAt).toLocaleDateString()}</p>
                )}
                {ad.scrapedAt && (
                  <p>Scraped: {new Date(ad.scrapedAt).toLocaleDateString()}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Analysis */}
        <div>
          <AnalysisPanel
            adId={ad.id}
            analysis={ad.analysis as Parameters<typeof AnalysisPanel>[0]['analysis']}
            onAnalyze={loadAd}
          />
        </div>
      </div>
    </div>
  );
}
