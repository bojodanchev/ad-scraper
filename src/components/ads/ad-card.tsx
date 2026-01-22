'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

interface AdCardProps {
  id: string;
  platform: string;
  advertiserName?: string | null;
  headline?: string | null;
  bodyText?: string | null;
  mediaType?: string | null;
  thumbnailUrl?: string | null;
  daysRunning?: number | null;
  impressionsMin?: number | null;
  impressionsMax?: number | null;
  hasAnalysis?: boolean;
}

function formatImpressions(min?: number | null, max?: number | null): string {
  if (!min && !max) return '-';
  if (min && max) {
    return `${formatNumber(min)} - ${formatNumber(max)}`;
  }
  return formatNumber(min || max || 0);
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

export function AdCard({
  id,
  platform,
  advertiserName,
  headline,
  bodyText,
  mediaType,
  thumbnailUrl,
  daysRunning,
  impressionsMin,
  impressionsMax,
  hasAnalysis,
}: AdCardProps) {
  return (
    <Link href={`/ads/${id}`}>
      <Card className="group cursor-pointer transition-all hover:shadow-lg hover:border-primary/50">
        <CardContent className="p-0">
          {/* Thumbnail */}
          <div className="relative aspect-video bg-muted overflow-hidden rounded-t-lg">
            {thumbnailUrl ? (
              <img
                src={thumbnailUrl}
                alt={headline || 'Ad thumbnail'}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                No preview
              </div>
            )}
            {/* Media type badge */}
            {mediaType && (
              <Badge
                variant="secondary"
                className="absolute top-2 left-2 capitalize"
              >
                {mediaType}
              </Badge>
            )}
            {/* Platform badge */}
            <Badge
              variant={platform === 'meta' ? 'default' : 'outline'}
              className="absolute top-2 right-2"
            >
              {platform === 'meta' ? 'Meta' : 'TikTok'}
            </Badge>
          </div>

          {/* Content */}
          <div className="p-4 space-y-2">
            {/* Headline */}
            <p className="font-medium line-clamp-2 text-sm">
              {headline || bodyText?.slice(0, 100) || 'No headline'}
            </p>

            {/* Advertiser */}
            {advertiserName && (
              <p className="text-xs text-muted-foreground">@{advertiserName}</p>
            )}

            {/* Stats */}
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
              <span>
                {daysRunning ? `${daysRunning}d` : '-'} running
              </span>
              <span>{formatImpressions(impressionsMin, impressionsMax)}</span>
              {hasAnalysis && (
                <Badge variant="outline" className="text-xs">
                  Analyzed
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
