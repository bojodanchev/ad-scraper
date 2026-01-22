'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AdGrid } from '@/components/ads/ad-grid';

interface Stats {
  totalAds: number;
  metaAds: number;
  tiktokAds: number;
  analyzedAds: number;
  recentJobs: number;
}

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

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentAds, setRecentAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        // Load recent ads
        const adsRes = await fetch('/api/ads?limit=8');
        const adsData = await adsRes.json();
        setRecentAds(adsData.ads || []);

        // Calculate stats from the response
        setStats({
          totalAds: adsData.total || 0,
          metaAds: adsData.ads?.filter((a: Ad) => a.platform === 'meta').length || 0,
          tiktokAds: adsData.ads?.filter((a: Ad) => a.platform === 'tiktok').length || 0,
          analyzedAds: adsData.ads?.filter((a: Ad) => a.hasAnalysis).length || 0,
          recentJobs: 0,
        });
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Ad Scraper</h1>
          <p className="text-muted-foreground mt-1">
            Scrape and analyze high-performing ads from Meta and TikTok
          </p>
        </div>
        <Link href="/scrape">
          <Button size="lg">New Scrape</Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Ads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {loading ? '-' : stats?.totalAds || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Meta Ads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {loading ? '-' : stats?.metaAds || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              TikTok Ads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {loading ? '-' : stats?.tiktokAds || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Analyzed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {loading ? '-' : stats?.analyzedAds || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Ads */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Recent Ads</h2>
          <Link href="/ads">
            <Button variant="ghost">View All →</Button>
          </Link>
        </div>
        <AdGrid ads={recentAds} loading={loading} />
      </div>
    </div>
  );
}
