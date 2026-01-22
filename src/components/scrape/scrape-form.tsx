'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function ScrapeForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [platform, setPlatform] = useState<'meta' | 'tiktok'>('meta');
  const [searchType, setSearchType] = useState<'keyword' | 'advertiser'>(
    'keyword'
  );
  const [query, setQuery] = useState('');
  const [country, setCountry] = useState('US');
  const [mediaType, setMediaType] = useState('ALL');
  const [maxItems, setMaxItems] = useState('100');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform,
          searchType,
          query,
          filters: {
            country,
            mediaType,
            maxItems: parseInt(maxItems),
            activeOnly: true,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start scrape');
      }

      // Redirect to jobs page to monitor progress
      router.push(`/jobs?highlight=${data.jobId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>New Scrape</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Platform */}
          <div className="space-y-2">
            <Label>Platform</Label>
            <Select
              value={platform}
              onValueChange={(v) => setPlatform(v as 'meta' | 'tiktok')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="meta">Meta (Facebook/Instagram)</SelectItem>
                <SelectItem value="tiktok">TikTok</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Search Type */}
          <div className="space-y-2">
            <Label>Search Type</Label>
            <Select
              value={searchType}
              onValueChange={(v) =>
                setSearchType(v as 'keyword' | 'advertiser')
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="keyword">Keyword Search</SelectItem>
                <SelectItem value="advertiser">
                  Advertiser / Page ID
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Query */}
          <div className="space-y-2">
            <Label>
              {searchType === 'keyword' ? 'Search Keyword' : 'Page ID'}
            </Label>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                searchType === 'keyword'
                  ? 'e.g., dropshipping, AI automation, weight loss'
                  : 'e.g., 123456789 or page URL'
              }
              required
            />
          </div>

          {/* Filters Row */}
          <div className="grid grid-cols-3 gap-4">
            {/* Country */}
            <div className="space-y-2">
              <Label>Country</Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="US">United States</SelectItem>
                  <SelectItem value="GB">United Kingdom</SelectItem>
                  <SelectItem value="CA">Canada</SelectItem>
                  <SelectItem value="AU">Australia</SelectItem>
                  <SelectItem value="DE">Germany</SelectItem>
                  <SelectItem value="FR">France</SelectItem>
                  <SelectItem value="ALL">All Countries</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Media Type */}
            <div className="space-y-2">
              <Label>Media Type</Label>
              <Select value={mediaType} onValueChange={setMediaType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Types</SelectItem>
                  <SelectItem value="VIDEO">Video Only</SelectItem>
                  <SelectItem value="IMAGE">Image Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Max Items */}
            <div className="space-y-2">
              <Label>Max Results</Label>
              <Select value={maxItems} onValueChange={setMaxItems}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="200">200</SelectItem>
                  <SelectItem value="500">500</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
              {error}
            </div>
          )}

          {/* Submit */}
          <Button type="submit" className="w-full" disabled={loading || !query}>
            {loading ? 'Starting Scrape...' : 'Start Scrape'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
