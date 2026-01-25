'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Competitor {
  id: string;
  platform: string;
  pageName: string;
  pageUrl: string | null;
  avatarUrl: string | null;
  trackingSince: string;
  notes: string | null;
  tags: string[];
}

interface CompetitorSummary {
  stats: {
    totalAds: number;
    activeAds: number;
    avgDaysRunning: number;
  };
  recentActivity: {
    newAdsLast7Days: number;
    removedAdsLast7Days: number;
  };
}

interface CompetitorAd {
  id: string;
  platform: string;
  headline: string | null;
  bodyText: string | null;
  thumbnailUrl: string | null;
  mediaType: string | null;
  daysRunning: number | null;
  firstSeenAt: string | null;
  intelligence: {
    winner: {
      isWinner: boolean;
      score: number;
      tier: string;
    };
    spend: {
      dailyMin: number;
      dailyMax: number;
      totalMin: number;
      totalMax: number;
      isScaling: boolean;
      confidence: string;
    };
    daysRunning: number;
  };
}

function formatCurrency(num: number): string {
  if (num >= 1000) return `$${(num / 1000).toFixed(1)}K`;
  return `$${num}`;
}

function getWinnerBadgeColor(tier: string): string {
  switch (tier) {
    case 'proven_winner':
      return 'bg-green-600';
    case 'likely_winner':
      return 'bg-emerald-500';
    case 'potential':
      return 'bg-yellow-500';
    default:
      return 'bg-gray-500';
  }
}

export default function CompetitorDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [competitor, setCompetitor] = useState<Competitor | null>(null);
  const [summary, setSummary] = useState<CompetitorSummary | null>(null);
  const [competitorAds, setCompetitorAds] = useState<CompetitorAd[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load competitor details
      const detailsRes = await fetch(`/api/competitors/${id}`);
      const detailsData = await detailsRes.json();
      setCompetitor(detailsData.competitor);
      setSummary(detailsData.summary);

      // Load competitor ads with intelligence
      const adsRes = await fetch(`/api/competitors/${id}/ads?limit=50`);
      const adsData = await adsRes.json();
      setCompetitorAds(adsData.ads || []);
    } catch (error) {
      console.error('Failed to load competitor data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse h-8 w-64 bg-muted rounded" />
        <div className="animate-pulse h-32 bg-muted rounded-lg" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="animate-pulse h-64 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!competitor) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Competitor not found</p>
        <Link href="/intelligence/competitors">
          <Button className="mt-4">← Back to Competitors</Button>
        </Link>
      </div>
    );
  }

  const totalEstimatedSpend = competitorAds.reduce(
    (sum, ad) =>
      sum + (ad.intelligence.spend.totalMin + ad.intelligence.spend.totalMax) / 2,
    0
  );
  const winnersCount = competitorAds.filter((ad) => ad.intelligence.winner.isWinner).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          {competitor.avatarUrl ? (
            <img
              src={competitor.avatarUrl}
              alt={competitor.pageName}
              className="w-16 h-16 rounded-full"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-2xl">
              {competitor.pageName.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold">{competitor.pageName}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline">{competitor.platform}</Badge>
              {competitor.pageUrl && (
                <a
                  href={competitor.pageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  View Page →
                </a>
              )}
            </div>
          </div>
        </div>
        <Link href="/intelligence/competitors">
          <Button variant="outline">← Back</Button>
        </Link>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Ads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.stats.totalAds || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Active Ads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {summary?.stats.activeAds || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Winners</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{winnersCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Est. Total Spend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalEstimatedSpend)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Avg Days Running</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.stats.avgDaysRunning || 0}d</div>
          </CardContent>
        </Card>
      </div>

      {/* Ads Grid */}
      <div>
        <h2 className="text-lg font-semibold mb-4">
          Ads ({competitorAds.length}) - Sorted by Winner Score
        </h2>

        {competitorAds.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">
              No ads found for this competitor. Try running a scrape with their name.
            </p>
            <Link href="/scrape">
              <Button className="mt-4">Go to Scrape</Button>
            </Link>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {competitorAds.map((ad) => (
              <Link key={ad.id} href={`/ads/${ad.id}`}>
                <Card className="cursor-pointer hover:border-primary/50 transition-all hover:shadow-lg group">
                  <CardContent className="p-0">
                    {/* Thumbnail */}
                    <div className="relative aspect-video bg-muted overflow-hidden rounded-t-lg">
                      {ad.thumbnailUrl ? (
                        <img
                          src={ad.thumbnailUrl}
                          alt={ad.headline || 'Ad'}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          No preview
                        </div>
                      )}

                      {/* Winner Badge */}
                      {ad.intelligence.winner.score >= 0.3 && (
                        <Badge
                          className={`absolute top-2 right-2 ${getWinnerBadgeColor(ad.intelligence.winner.tier)}`}
                        >
                          {Math.round(ad.intelligence.winner.score * 100)}%
                        </Badge>
                      )}

                      {/* Scaling indicator */}
                      {ad.intelligence.spend.isScaling && (
                        <Badge className="absolute top-2 left-2 bg-blue-600">📈 Scaling</Badge>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-4 space-y-2">
                      <p className="font-medium line-clamp-2 text-sm">
                        {ad.headline || ad.bodyText?.slice(0, 80) || 'No headline'}
                      </p>

                      {/* Intelligence Stats */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2 bg-muted rounded">
                          <div className="font-medium">
                            {formatCurrency(ad.intelligence.spend.dailyMin)}-
                            {formatCurrency(ad.intelligence.spend.dailyMax)}
                          </div>
                          <div className="text-muted-foreground">Est. Daily</div>
                        </div>
                        <div className="p-2 bg-muted rounded">
                          <div className="font-medium">
                            {formatCurrency(ad.intelligence.spend.totalMin)}-
                            {formatCurrency(ad.intelligence.spend.totalMax)}
                          </div>
                          <div className="text-muted-foreground">Est. Total</div>
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                        <span>{ad.intelligence.daysRunning}d running</span>
                        <Badge variant="outline" className="text-xs">
                          {ad.intelligence.spend.confidence} conf
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
