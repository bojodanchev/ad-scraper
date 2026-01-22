'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  totalViews: number | null;
  totalComments: number | null;
  totalShares: number | null;
  postsCount: number | null;
  adCount: number;
  avgLikesPerPost: number | null;
  avgViewsPerPost: number | null;
  avgCommentsPerPost: number | null;
  avgSharesPerPost: number | null;
  avgDaysRunning: number | null;
  engagementRate: string | null;
  viewToFollowerRatio: number | null;
  firstSeenAt: string | null;
  lastScrapedAt: string | null;
  isTracked: boolean;
}

interface Post {
  id: string;
  externalId: string | null;
  headline: string | null;
  bodyText: string | null;
  mediaType: string | null;
  thumbnailUrl: string | null;
  landingUrl: string | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  impressionsMin: number | null;
  daysRunning: number | null;
  firstSeenAt: string | null;
  scrapedAt: string | null;
}

function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return '-';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toLocaleString();
}

function getPlatformBadge(platform: string) {
  switch (platform) {
    case 'meta':
      return <Badge variant="default" className="text-base px-3 py-1">Meta</Badge>;
    case 'tiktok':
      return <Badge className="bg-pink-500 text-white text-base px-3 py-1">TikTok</Badge>;
    case 'instagram':
      return <Badge className="bg-purple-500 text-white text-base px-3 py-1">Instagram</Badge>;
    default:
      return <Badge variant="outline" className="text-base px-3 py-1">{platform}</Badge>;
  }
}

export default function CreatorDetailPage() {
  const params = useParams();
  const creatorId = params.id as string;

  const [creator, setCreator] = useState<Creator | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCreator = async () => {
      try {
        const res = await fetch(`/api/creators/${creatorId}`);
        if (res.ok) {
          const data = await res.json();
          setCreator(data.creator);
          setPosts(data.posts || []);
        }
      } catch (error) {
        console.error('Failed to load creator:', error);
      }
      setLoading(false);
    };

    loadCreator();
  }, [creatorId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-48 bg-muted rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!creator) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Creator not found</p>
          <Link href="/creators">
            <Button variant="link">← Back to Creators</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link href="/creators">
        <Button variant="ghost" size="sm">← Back to Creators</Button>
      </Link>

      {/* Creator Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Avatar */}
            <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0 mx-auto md:mx-0">
              {creator.avatarUrl ? (
                <img
                  src={creator.avatarUrl}
                  alt={creator.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-4xl text-muted-foreground">
                  {creator.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center gap-3 justify-center md:justify-start">
                <h1 className="text-3xl font-bold">{creator.name}</h1>
                {creator.verified && (
                  <Badge variant="secondary" className="text-lg">✓ Verified</Badge>
                )}
              </div>

              {creator.username && (
                <p className="text-xl text-muted-foreground mt-1">
                  @{creator.username}
                </p>
              )}

              <div className="mt-2">
                {getPlatformBadge(creator.platform)}
              </div>

              {creator.bio && (
                <p className="mt-4 text-muted-foreground max-w-2xl">
                  {creator.bio}
                </p>
              )}

              {creator.pageUrl && (
                <div className="mt-4">
                  <a
                    href={creator.pageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline">
                      View on {creator.platform === 'meta' ? 'Facebook' : creator.platform === 'tiktok' ? 'TikTok' : 'Instagram'} →
                    </Button>
                  </a>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Followers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatNumber(creator.followerCount)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Engagement Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {creator.engagementRate ? `${creator.engagementRate}%` : '-'}
            </p>
            <p className="text-xs text-muted-foreground">(likes + comments) / views</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">View/Follower Ratio</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {creator.viewToFollowerRatio !== null ? `${creator.viewToFollowerRatio}x` : '-'}
            </p>
            <p className="text-xs text-muted-foreground">avg views / followers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Likes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatNumber(creator.totalLikes)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Posts Scraped</p>
              <p className="text-2xl font-bold">{creator.adCount}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg Likes/Post</p>
              <p className="text-2xl font-bold">{formatNumber(creator.avgLikesPerPost)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg Views/Post</p>
              <p className="text-2xl font-bold">{formatNumber(creator.avgViewsPerPost)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg Comments/Post</p>
              <p className="text-2xl font-bold">{formatNumber(creator.avgCommentsPerPost)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg Shares/Post</p>
              <p className="text-2xl font-bold">{formatNumber(creator.avgSharesPerPost)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg Days Active</p>
              <p className="text-2xl font-bold">{creator.avgDaysRunning ?? '-'}</p>
            </div>
          </div>

          {/* Totals */}
          <div className="mt-6 pt-6 border-t">
            <h4 className="font-medium mb-4">Total Engagement</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-sm text-muted-foreground">Total Views</p>
                <p className="text-xl font-bold">{formatNumber(creator.totalViews)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Likes</p>
                <p className="text-xl font-bold">{formatNumber(creator.totalLikes)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Comments</p>
                <p className="text-xl font-bold">{formatNumber(creator.totalComments)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Shares</p>
                <p className="text-xl font-bold">{formatNumber(creator.totalShares)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Posts */}
      <Card>
        <CardHeader>
          <CardTitle>Top Posts by Likes</CardTitle>
        </CardHeader>
        <CardContent>
          {posts.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No posts found</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {posts.map((post) => (
                <Link key={post.id} href={`/ads/${post.id}`}>
                  <Card className="h-full hover:border-primary/50 transition-colors cursor-pointer">
                    <CardContent className="p-4">
                      {/* Thumbnail */}
                      {post.thumbnailUrl && (
                        <div className="aspect-video bg-muted rounded-lg overflow-hidden mb-3">
                          <img
                            src={post.thumbnailUrl}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      {/* Content Preview */}
                      {(post.headline || post.bodyText) && (
                        <p className="text-sm line-clamp-2 mb-3">
                          {post.headline || post.bodyText}
                        </p>
                      )}

                      {/* Stats */}
                      <div className="grid grid-cols-4 gap-2 text-center text-xs">
                        <div>
                          <p className="font-bold">{formatNumber(post.impressionsMin)}</p>
                          <p className="text-muted-foreground">Views</p>
                        </div>
                        <div>
                          <p className="font-bold">{formatNumber(post.likes)}</p>
                          <p className="text-muted-foreground">Likes</p>
                        </div>
                        <div>
                          <p className="font-bold">{formatNumber(post.comments)}</p>
                          <p className="text-muted-foreground">Comments</p>
                        </div>
                        <div>
                          <p className="font-bold">{formatNumber(post.shares)}</p>
                          <p className="text-muted-foreground">Shares</p>
                        </div>
                      </div>

                      {/* Posted date */}
                      {post.firstSeenAt && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Posted: {new Date(post.firstSeenAt).toLocaleDateString()}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Metadata */}
      <Card>
        <CardHeader>
          <CardTitle>Tracking Info</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">First Seen</p>
              <p>{creator.firstSeenAt ? new Date(creator.firstSeenAt).toLocaleDateString() : '-'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Last Scraped</p>
              <p>{creator.lastScrapedAt ? new Date(creator.lastScrapedAt).toLocaleDateString() : '-'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Creator ID</p>
              <p className="font-mono text-xs">{creator.id}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
