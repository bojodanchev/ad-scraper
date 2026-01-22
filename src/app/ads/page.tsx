'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AdGrid } from '@/components/ads/ad-grid';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';

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

function AdsContent() {
  const searchParams = useSearchParams();
  const [ads, setAds] = useState<Ad[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [platform, setPlatform] = useState('all');
  const [mediaType, setMediaType] = useState('all');
  const [hasAnalysis, setHasAnalysis] = useState('all');
  const [offset, setOffset] = useState(0);
  const limit = 24;

  const loadAds = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (platform !== 'all') params.set('platform', platform);
      if (mediaType !== 'all') params.set('mediaType', mediaType);
      if (hasAnalysis !== 'all') params.set('hasAnalysis', hasAnalysis);
      params.set('limit', limit.toString());
      params.set('offset', offset.toString());

      const res = await fetch(`/api/ads?${params.toString()}`);
      const data = await res.json();
      setAds(data.ads || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Failed to load ads:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAds();
  }, [platform, mediaType, hasAnalysis, offset]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setOffset(0);
    loadAds();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Ad Library</h1>
        <p className="text-muted-foreground mt-1">
          Browse {total} scraped ads
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-end">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-[200px]">
          <Input
            placeholder="Search ads..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>

        <Select value={platform} onValueChange={(v) => { setPlatform(v); setOffset(0); }}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Platform" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            <SelectItem value="meta">Meta</SelectItem>
            <SelectItem value="tiktok">TikTok</SelectItem>
          </SelectContent>
        </Select>

        <Select value={mediaType} onValueChange={(v) => { setMediaType(v); setOffset(0); }}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Media Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="video">Video</SelectItem>
            <SelectItem value="image">Image</SelectItem>
            <SelectItem value="carousel">Carousel</SelectItem>
          </SelectContent>
        </Select>

        <Select value={hasAnalysis} onValueChange={(v) => { setHasAnalysis(v); setOffset(0); }}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Analysis" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="true">Analyzed</SelectItem>
            <SelectItem value="false">Not Analyzed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      <AdGrid ads={ads} loading={loading} />

      {/* Pagination */}
      {total > limit && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            disabled={offset === 0}
            onClick={() => setOffset(Math.max(0, offset - limit))}
          >
            Previous
          </Button>
          <span className="py-2 px-4 text-sm text-muted-foreground">
            {offset + 1} - {Math.min(offset + limit, total)} of {total}
          </span>
          <Button
            variant="outline"
            disabled={offset + limit >= total}
            onClick={() => setOffset(offset + limit)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

export default function AdsPage() {
  return (
    <Suspense fallback={<div className="animate-pulse h-96 bg-muted rounded-lg" />}>
      <AdsContent />
    </Suspense>
  );
}
