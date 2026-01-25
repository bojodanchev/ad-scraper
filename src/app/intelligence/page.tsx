'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Stats {
  totalAds: number;
  totalWinners: number;
  totalCompetitors: number;
  adsWithAudienceInference: number;
  adsWithSpendEstimate: number;
}

interface Winner {
  ad: {
    id: string;
    platform: string;
    headline: string | null;
    thumbnailUrl: string | null;
  };
  winnerStatus: {
    winnerScore: number;
    isWinner: boolean;
  };
}

export default function IntelligencePage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentWinners, setRecentWinners] = useState<Winner[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load winners
      const winnersRes = await fetch('/api/intelligence/winners?limit=6');
      const winnersData = await winnersRes.json();
      setRecentWinners(winnersData.winners || []);

      // Load competitors count
      const competitorsRes = await fetch('/api/competitors');
      const competitorsData = await competitorsRes.json();

      // Load ads count
      const adsRes = await fetch('/api/ads?limit=1');
      const adsData = await adsRes.json();

      setStats({
        totalAds: adsData.total || 0,
        totalWinners: winnersData.total || 0,
        totalCompetitors: competitorsData.total || 0,
        adsWithAudienceInference: 0, // Would need additional API
        adsWithSpendEstimate: 0, // Would need additional API
      });
    } catch (error) {
      console.error('Failed to load intelligence data:', error);
    } finally {
      setLoading(false);
    }
  };

  const runBulkAnalysis = async () => {
    setAnalyzing(true);
    try {
      const res = await fetch('/api/intelligence/bulk-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estimateSpend: true,
          evaluateWinners: true,
          inferAudience: false, // Expensive, skip by default
          limit: 100,
        }),
      });
      const data = await res.json();
      alert(`Analysis complete!\n\nSpend estimates: ${data.results.spendEstimates.processed}\nWinners found: ${data.results.winnerEvaluations.winnersFound}`);
      loadData();
    } catch (error) {
      console.error('Bulk analysis failed:', error);
      alert('Analysis failed. Check console for details.');
    } finally {
      setAnalyzing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse h-8 w-48 bg-muted rounded" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse h-32 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ad Intelligence</h1>
          <p className="text-muted-foreground mt-1">
            AI-powered competitor analysis and winner detection
          </p>
        </div>
        <Button onClick={runBulkAnalysis} disabled={analyzing}>
          {analyzing ? 'Analyzing...' : 'Run Bulk Analysis'}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Ads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.totalAds || 0}</div>
          </CardContent>
        </Card>

        <Card className="border-green-500/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Winners Detected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {stats?.totalWinners || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Competitors Tracked
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.totalCompetitors || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Win Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {stats?.totalAds
                ? `${Math.round((stats.totalWinners / stats.totalAds) * 100)}%`
                : '-'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/intelligence/winners">
          <Card className="cursor-pointer hover:border-primary/50 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                🏆 Winner Ads
                <Badge variant="secondary">{stats?.totalWinners || 0}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                View ads running 14+ days with strong scaling signals. Proven performers worth studying.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/intelligence/competitors">
          <Card className="cursor-pointer hover:border-primary/50 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                👁️ Competitor Tracking
                <Badge variant="secondary">{stats?.totalCompetitors || 0}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Monitor specific advertisers. Get alerts when they launch new campaigns or scale.
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent Winners */}
      {recentWinners.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Recent Winners</h2>
            <Link href="/intelligence/winners">
              <Button variant="ghost" size="sm">
                View All →
              </Button>
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {recentWinners.map((winner) => (
              <Link key={winner.ad.id} href={`/ads/${winner.ad.id}`}>
                <Card className="cursor-pointer hover:border-primary/50 transition-colors">
                  <CardContent className="p-0">
                    <div className="relative aspect-video bg-muted overflow-hidden rounded-t-lg">
                      {winner.ad.thumbnailUrl ? (
                        <img
                          src={winner.ad.thumbnailUrl}
                          alt={winner.ad.headline || 'Ad'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          No preview
                        </div>
                      )}
                      <Badge className="absolute top-2 right-2 bg-green-600">
                        {Math.round(winner.winnerStatus.winnerScore * 100)}% Winner
                      </Badge>
                    </div>
                    <div className="p-4">
                      <p className="font-medium line-clamp-2 text-sm">
                        {winner.ad.headline || 'No headline'}
                      </p>
                      <Badge variant="outline" className="mt-2">
                        {winner.ad.platform}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle>How Ad Intelligence Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <h3 className="font-medium">🎯 Audience Inference</h3>
              <p className="text-sm text-muted-foreground">
                Gemini Vision analyzes ad creatives to infer target demographics, interests, and pain points.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium">💰 Spend Estimation</h3>
              <p className="text-sm text-muted-foreground">
                Algorithms estimate daily/total spend based on run duration, scaling signals, and niche CPM benchmarks.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium">🏆 Winner Detection</h3>
              <p className="text-sm text-muted-foreground">
                Ads running 14+ days with strong engagement and scaling signals are flagged as winners.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
