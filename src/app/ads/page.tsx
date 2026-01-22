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
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';

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

  // Sorting
  const [sortBy, setSortBy] = useState('scrapedAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Days running filter
  const [daysRange, setDaysRange] = useState<[number, number]>([0, 365]);
  const [daysFilterEnabled, setDaysFilterEnabled] = useState(false);

  // Exclude DCO ads
  const [excludeDco, setExcludeDco] = useState(false);

  const loadAds = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (platform !== 'all') params.set('platform', platform);
      if (mediaType !== 'all') params.set('mediaType', mediaType);
      if (hasAnalysis !== 'all') params.set('hasAnalysis', hasAnalysis);
      params.set('sortBy', sortBy);
      params.set('sortOrder', sortOrder);
      if (daysFilterEnabled) {
        params.set('minDaysRunning', daysRange[0].toString());
        params.set('maxDaysRunning', daysRange[1].toString());
      }
      if (excludeDco) params.set('excludeDco', 'true');
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
  }, [platform, mediaType, hasAnalysis, offset, sortBy, sortOrder, daysFilterEnabled, daysRange, excludeDco]);

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

      {/* Filters Row 1 */}
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
            <SelectItem value="meta">Meta Ads</SelectItem>
            <SelectItem value="tiktok">TikTok</SelectItem>
            <SelectItem value="instagram">Instagram</SelectItem>
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

      {/* Filters Row 2: Sorting & Days Running */}
      <div className="flex flex-wrap gap-6 items-end border-t pt-4">
        {/* Sort Controls */}
        <div className="flex gap-2 items-end">
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Sort by</Label>
            <Select value={sortBy} onValueChange={(v) => { setSortBy(v); setOffset(0); }}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="scrapedAt">Date Scraped</SelectItem>
                <SelectItem value="daysRunning">Days Running</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Order</Label>
            <Select value={sortOrder} onValueChange={(v) => { setSortOrder(v); setOffset(0); }}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Desc</SelectItem>
                <SelectItem value="asc">Asc</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Days Running Filter */}
        <div className="flex-1 min-w-[280px] max-w-[400px]">
          <div className="flex items-center gap-2 mb-2">
            <input
              type="checkbox"
              id="daysFilter"
              checked={daysFilterEnabled}
              onChange={(e) => { setDaysFilterEnabled(e.target.checked); setOffset(0); }}
              className="rounded border-gray-300"
            />
            <Label htmlFor="daysFilter" className="text-xs text-muted-foreground cursor-pointer">
              Filter by days running: {daysRange[0]} - {daysRange[1]} days
            </Label>
          </div>
          <Slider
            value={daysRange}
            onValueChange={(v) => { setDaysRange(v as [number, number]); setOffset(0); }}
            min={0}
            max={365}
            step={1}
            disabled={!daysFilterEnabled}
            className={!daysFilterEnabled ? 'opacity-50' : ''}
          />
        </div>

        {/* Exclude DCO Ads */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="excludeDco"
            checked={excludeDco}
            onChange={(e) => { setExcludeDco(e.target.checked); setOffset(0); }}
            className="rounded border-gray-300"
          />
          <Label htmlFor="excludeDco" className="text-xs text-muted-foreground cursor-pointer">
            Hide template ads
          </Label>
        </div>
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
