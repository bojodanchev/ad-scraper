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

type Platform = 'meta' | 'tiktok' | 'instagram';
type SearchType = 'keyword' | 'hashtag' | 'profile' | 'advertiser';
type TimePeriod = 'all' | '48h' | '7d' | '30d' | '90d';

// Time period options for filtering viral content
const timePeriodOptions: { value: TimePeriod; label: string; days: number | null }[] = [
  { value: 'all', label: 'All Time', days: null },
  { value: '48h', label: 'Last 48 Hours', days: 2 },
  { value: '7d', label: 'Last 7 Days', days: 7 },
  { value: '30d', label: 'Last 30 Days', days: 30 },
  { value: '90d', label: 'Last 90 Days', days: 90 },
];

// Platform-specific search type options
// Keyword/Search Query is first for TikTok/Instagram - best for niche targeting
const searchTypeOptions: Record<Platform, { value: SearchType; label: string }[]> = {
  meta: [
    { value: 'keyword', label: 'Keyword Search' },
    { value: 'advertiser', label: 'Advertiser / Page ID' },
  ],
  tiktok: [
    { value: 'keyword', label: 'Search Query (Recommended)' },
    { value: 'hashtag', label: 'Hashtag (e.g. #fitness)' },
    { value: 'profile', label: 'Profile/Creator (e.g. @username)' },
  ],
  instagram: [
    { value: 'keyword', label: 'Search (Recommended)' },
    { value: 'hashtag', label: 'Hashtag (e.g. #fitness)' },
    { value: 'profile', label: 'Profile (e.g. @username)' },
  ],
};

export function ScrapeForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [platform, setPlatform] = useState<Platform>('meta');
  const [searchType, setSearchType] = useState<SearchType>('keyword');
  const [query, setQuery] = useState('');
  const [country, setCountry] = useState('US');
  const [mediaType, setMediaType] = useState('ALL');
  const [maxItems, setMaxItems] = useState('50');
  const [sortBy, setSortBy] = useState('popular');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('all');

  // TikTok creator filters
  const [minFollowers, setMinFollowers] = useState('');
  const [maxFollowers, setMaxFollowers] = useState('');

  // Instagram engagement filters
  const [minEngagementRate, setMinEngagementRate] = useState('');
  const [minLikes, setMinLikes] = useState('');
  const [minViews, setMinViews] = useState('');

  // Meta impressions filters
  const [minImpressions, setMinImpressions] = useState('');
  const [maxImpressions, setMaxImpressions] = useState('');

  // Reset search type when platform changes
  const handlePlatformChange = (newPlatform: Platform) => {
    setPlatform(newPlatform);
    // Set default search type for the new platform
    const defaultType = searchTypeOptions[newPlatform][0].value;
    setSearchType(defaultType);
  };

  // Get placeholder text based on platform and search type
  const getPlaceholder = () => {
    if (platform === 'meta') {
      return searchType === 'keyword'
        ? 'e.g., dropshipping, AI automation, weight loss'
        : 'e.g., 123456789 or page URL';
    }
    if (platform === 'tiktok' || platform === 'instagram') {
      if (searchType === 'hashtag') return 'e.g., fitness, makeupgtutorial, viral';
      if (searchType === 'profile') return 'e.g., garyvee, hubspot, nike';
      return 'e.g., workout tips, cooking hacks';
    }
    return 'Enter search query...';
  };

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
          query: query.replace(/^[@#]/, ''), // Remove @ or # prefix if user added it
          filters: {
            country,
            mediaType,
            maxItems: parseInt(maxItems),
            activeOnly: true,
            sortBy, // For TikTok/Instagram
            timePeriod: timePeriod !== 'all' ? timePeriod : undefined,
            // TikTok creator filters
            minFollowers: minFollowers || undefined,
            maxFollowers: maxFollowers || undefined,
            // Instagram engagement filters
            minEngagementRate: minEngagementRate || undefined,
            minLikes: minLikes || undefined,
            minViews: minViews || undefined,
            // Meta impressions filters
            minImpressions: minImpressions || undefined,
            maxImpressions: maxImpressions || undefined,
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
              onValueChange={(v) => handlePlatformChange(v as Platform)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="meta">Meta Ads Library</SelectItem>
                <SelectItem value="tiktok">TikTok (Viral Content)</SelectItem>
                <SelectItem value="instagram">Instagram (Viral Content)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {platform === 'meta' && 'Search Facebook Ads Library for competitor ads'}
              {platform === 'tiktok' && 'Find viral TikTok videos - search by niche keywords like "AI automation" or "ecommerce"'}
              {platform === 'instagram' && 'Find viral Instagram posts - search by niche keywords, hashtags, or profiles'}
            </p>
          </div>

          {/* Search Type */}
          <div className="space-y-2">
            <Label>Search Type</Label>
            <Select
              value={searchType}
              onValueChange={(v) => setSearchType(v as SearchType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {searchTypeOptions[platform].map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Query */}
          <div className="space-y-2">
            <Label>
              {searchType === 'hashtag' && 'Hashtag'}
              {searchType === 'profile' && 'Username'}
              {searchType === 'keyword' && 'Search Query'}
              {searchType === 'advertiser' && 'Page ID'}
            </Label>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={getPlaceholder()}
              required
            />
            {searchType === 'keyword' && (platform === 'tiktok' || platform === 'instagram') && (
              <p className="text-xs text-muted-foreground">
                Search for niche content like &quot;AI automation&quot;, &quot;ecommerce tips&quot;, &quot;fitness motivation&quot;
              </p>
            )}
          </div>

          {/* Time Period - Prominent placement for TikTok/Instagram */}
          {(platform === 'tiktok' || platform === 'instagram') && (
            <div className="space-y-2 p-4 bg-muted/50 rounded-lg border">
              <Label className="text-sm font-medium">Time Period (Find Recent Viral Content)</Label>
              <Select value={timePeriod} onValueChange={(v) => setTimePeriod(v as TimePeriod)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timePeriodOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Filter to only include content posted within this time period
              </p>
            </div>
          )}

          {/* Filters Row */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {/* Country - Only for Meta */}
            {platform === 'meta' && (
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
            )}

            {/* Time Period - For Meta only (in grid) */}
            {platform === 'meta' && (
              <div className="space-y-2">
                <Label>Time Period</Label>
                <Select value={timePeriod} onValueChange={(v) => setTimePeriod(v as TimePeriod)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timePeriodOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Sort By - For TikTok/Instagram */}
            {(platform === 'tiktok' || platform === 'instagram') && (
              <div className="space-y-2">
                <Label>Sort By</Label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="popular">Most Popular</SelectItem>
                    <SelectItem value="latest">Most Recent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Media Type - Only for Meta */}
            {platform === 'meta' && (
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
            )}

            {/* Max Items */}
            <div className="space-y-2">
              <Label>Max Results</Label>
              <Select value={maxItems} onValueChange={setMaxItems}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="200">200</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Advanced Filters Toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <span>{showAdvanced ? '▼' : '▶'}</span>
            <span>Advanced Filters (Creator Stats)</span>
          </button>

          {/* Advanced Filters - Platform specific */}
          {showAdvanced && (
            <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
              {/* TikTok: Follower Range */}
              {platform === 'tiktok' && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Creator Follower Range</Label>
                  <p className="text-xs text-muted-foreground">
                    Filter by creator follower count (e.g., 10K-100K for micro-influencers)
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs">Min Followers</Label>
                      <Input
                        type="number"
                        value={minFollowers}
                        onChange={(e) => setMinFollowers(e.target.value)}
                        placeholder="e.g., 10000"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Max Followers</Label>
                      <Input
                        type="number"
                        value={maxFollowers}
                        onChange={(e) => setMaxFollowers(e.target.value)}
                        placeholder="e.g., 100000"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Instagram: Engagement Filters */}
              {platform === 'instagram' && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Engagement Filters</Label>
                  <p className="text-xs text-muted-foreground">
                    Filter by post engagement (e.g., &gt;2.8% engagement rate for micro-influencers)
                  </p>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs">Min Engagement %</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={minEngagementRate}
                        onChange={(e) => setMinEngagementRate(e.target.value)}
                        placeholder="e.g., 2.8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Min Likes</Label>
                      <Input
                        type="number"
                        value={minLikes}
                        onChange={(e) => setMinLikes(e.target.value)}
                        placeholder="e.g., 1000"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Min Views</Label>
                      <Input
                        type="number"
                        value={minViews}
                        onChange={(e) => setMinViews(e.target.value)}
                        placeholder="e.g., 10000"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Meta: Impressions Range */}
              {platform === 'meta' && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Impressions/Reach Range</Label>
                  <p className="text-xs text-muted-foreground">
                    Filter by estimated reach (ad impressions)
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs">Min Impressions</Label>
                      <Input
                        type="number"
                        value={minImpressions}
                        onChange={(e) => setMinImpressions(e.target.value)}
                        placeholder="e.g., 10000"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Max Impressions</Label>
                      <Input
                        type="number"
                        value={maxImpressions}
                        onChange={(e) => setMaxImpressions(e.target.value)}
                        placeholder="e.g., 1000000"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

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
