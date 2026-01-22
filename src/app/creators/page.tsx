'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Link from 'next/link';

interface Creator {
  id: string;
  platform: string;
  name: string;
  username: string | null;
  pageUrl: string | null;
  avatarUrl: string | null;
  bio: string | null;
  verified: boolean;
  followerCount: number | null;
  followingCount: number | null;
  totalLikes: number | null;
  postsCount: number | null;
  avgLikesPerPost: number | null;
  avgViewsPerPost: number | null;
  avgCommentsPerPost: number | null;
  engagementRate: string | null;
  viewToFollowerRatio: number | null;
  adCount: number;
  firstSeenAt: string | null;
  lastScrapedAt: string | null;
  isTracked: boolean;
}

function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return '-';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

function getPlatformBadge(platform: string) {
  switch (platform) {
    case 'meta':
      return <Badge variant="default">Meta</Badge>;
    case 'tiktok':
      return <Badge className="bg-pink-500 text-white">TikTok</Badge>;
    case 'instagram':
      return <Badge className="bg-purple-500 text-white">Instagram</Badge>;
    default:
      return <Badge variant="outline">{platform}</Badge>;
  }
}

export default function CreatorsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  // Filters
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [platform, setPlatform] = useState(searchParams.get('platform') || 'all');
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'followerCount');
  const [sortOrder, setSortOrder] = useState(searchParams.get('sortOrder') || 'desc');
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1'));

  const limit = 24;
  const offset = (page - 1) * limit;

  const loadCreators = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (platform && platform !== 'all') params.set('platform', platform);
      params.set('sortBy', sortBy);
      params.set('sortOrder', sortOrder);
      params.set('limit', limit.toString());
      params.set('offset', offset.toString());

      const res = await fetch(`/api/creators?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setCreators(data.creators || []);
        setTotal(data.total || 0);
      }
    } catch (error) {
      console.error('Failed to load creators:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadCreators();
  }, [platform, sortBy, sortOrder, page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadCreators();
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Creators</h1>
        <p className="text-muted-foreground mt-1">
          View creator stats: engagement rate, followers, view-to-follower ratio
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Search creators..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Platforms</SelectItem>
                <SelectItem value="tiktok">TikTok</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="meta">Meta</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="followerCount">Followers</SelectItem>
                <SelectItem value="totalLikes">Total Likes</SelectItem>
                <SelectItem value="engagementRate">Engagement Rate</SelectItem>
                <SelectItem value="name">Name</SelectItem>
              </SelectContent>
            </Select>

            <Button
              type="button"
              variant="outline"
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            >
              {sortOrder === 'desc' ? '↓ High to Low' : '↑ Low to High'}
            </Button>

            <Button type="submit">Search</Button>
          </form>
        </CardContent>
      </Card>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Creators</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatNumber(total)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">TikTok</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatNumber(creators.filter(c => c.platform === 'tiktok').length)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Instagram</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatNumber(creators.filter(c => c.platform === 'instagram').length)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Meta</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatNumber(creators.filter(c => c.platform === 'meta').length)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Creators Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-48 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : creators.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No creators found</p>
            <Link href="/scrape">
              <Button variant="link">Start scraping to discover creators →</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {creators.map((creator) => (
            <Link key={creator.id} href={`/creators/${creator.id}`}>
              <Card className="h-full hover:border-primary/50 transition-colors cursor-pointer">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
                      {creator.avatarUrl ? (
                        <img
                          src={creator.avatarUrl}
                          alt={creator.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-2xl text-muted-foreground">
                          {creator.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate">{creator.name}</h3>
                        {creator.verified && (
                          <Badge variant="secondary" className="shrink-0">✓</Badge>
                        )}
                      </div>
                      {creator.username && (
                        <p className="text-sm text-muted-foreground truncate">
                          @{creator.username}
                        </p>
                      )}
                      <div className="mt-1">
                        {getPlatformBadge(creator.platform)}
                      </div>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                    <div className="p-2 bg-muted/50 rounded">
                      <p className="text-lg font-bold">{formatNumber(creator.followerCount)}</p>
                      <p className="text-xs text-muted-foreground">Followers</p>
                    </div>
                    <div className="p-2 bg-muted/50 rounded">
                      <p className="text-lg font-bold">
                        {creator.engagementRate ? `${creator.engagementRate}%` : '-'}
                      </p>
                      <p className="text-xs text-muted-foreground">Eng. Rate</p>
                    </div>
                    <div className="p-2 bg-muted/50 rounded">
                      <p className="text-lg font-bold">
                        {creator.viewToFollowerRatio !== null
                          ? `${creator.viewToFollowerRatio}x`
                          : '-'}
                      </p>
                      <p className="text-xs text-muted-foreground">View/Follow</p>
                    </div>
                  </div>

                  {/* Additional Stats */}
                  <div className="flex justify-between mt-4 text-sm text-muted-foreground">
                    <span>{creator.adCount} posts scraped</span>
                    <span>{formatNumber(creator.avgLikesPerPost)} avg likes</span>
                  </div>

                  {/* Bio Preview */}
                  {creator.bio && (
                    <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
                      {creator.bio}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
          >
            Previous
          </Button>
          <span className="flex items-center px-4">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            disabled={page === totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
