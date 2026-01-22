'use client';

import { AdCard } from './ad-card';

interface Ad {
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

interface AdGridProps {
  ads: Ad[];
  loading?: boolean;
}

export function AdGrid({ ads, loading }: AdGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="aspect-[4/5] bg-muted rounded-lg animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (ads.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No ads found</p>
        <p className="text-sm mt-1">Try scraping some ads first</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {ads.map((ad) => (
        <AdCard key={ad.id} {...ad} />
      ))}
    </div>
  );
}
