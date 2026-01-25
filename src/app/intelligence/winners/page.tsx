'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';

interface Winner {
  ad: {
    id: string;
    platform: string;
    headline: string | null;
    bodyText: string | null;
    thumbnailUrl: string | null;
    daysRunning: number | null;
    firstSeenAt: string | null;
    mediaType: string | null;
    analysis: unknown;
  };
  advertiser: {
    name: string;
    username: string | null;
  } | null;
  winnerStatus: {
    winnerScore: number;
    isWinner: boolean;
    criteriaMet: Record<string, boolean>;
    becameWinnerAt: string | null;
  };
}

function formatDaysAgo(dateStr: string | null): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

function getWinnerTier(score: number): { label: string; color: string } {
  if (score >= 0.8) return { label: 'Proven Winner', color: 'bg-green-600' };
  if (score >= 0.6) return { label: 'Likely Winner', color: 'bg-emerald-500' };
  if (score >= 0.4) return { label: 'Potential', color: 'bg-yellow-500' };
  return { label: 'Testing', color: 'bg-gray-500' };
}

export default function WinnersPage() {
  const [winners, setWinners] = useState<Winner[]>([]);
  const [loading, setLoading] = useState(true);
  const [platform, setPlatform] = useState('all');
  const [minScore, setMinScore] = useState(0.6);

  const loadWinners = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (platform !== 'all') params.set('platform', platform);
      params.set('minScore', minScore.toString());
      params.set('limit', '100');

      const res = await fetch(`/api/intelligence/winners?${params.toString()}`);
      const data = await res.json();
      setWinners(data.winners || []);
    } catch (error) {
      console.error('Failed to load winners:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWinners();
  }, [platform, minScore]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">🏆 Winner Ads</h1>
          <p className="text-muted-foreground mt-1">
            {winners.length} ads with strong performance signals
          </p>
        </div>
        <Link href="/intelligence">
          <Button variant="outline">← Back to Intelligence</Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-6 items-end border-b pb-4">
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Platform</Label>
          <Select value={platform} onValueChange={setPlatform}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              <SelectItem value="meta">Meta Ads</SelectItem>
              <SelectItem value="tiktok">TikTok</SelectItem>
              <SelectItem value="instagram">Instagram</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 min-w-[250px] max-w-[350px]">
          <Label className="text-xs text-muted-foreground mb-1 block">
            Minimum Winner Score: {Math.round(minScore * 100)}%
          </Label>
          <Slider
            value={[minScore]}
            onValueChange={(v) => setMinScore(v[0])}
            min={0.3}
            max={0.9}
            step={0.05}
          />
        </div>
      </div>

      {/* Winners Grid */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="animate-pulse h-64 bg-muted rounded-lg" />
          ))}
        </div>
      ) : winners.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">
            No winners found. Run bulk analysis to detect winners.
          </p>
          <Link href="/intelligence">
            <Button className="mt-4">Go to Intelligence Dashboard</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {winners.map((winner) => {
            const tier = getWinnerTier(winner.winnerStatus.winnerScore);
            const criteriaMet = Object.entries(winner.winnerStatus.criteriaMet || {})
              .filter(([_, met]) => met)
              .map(([name]) => name);

            return (
              <Link key={winner.ad.id} href={`/ads/${winner.ad.id}`}>
                <Card className="cursor-pointer hover:border-primary/50 transition-all hover:shadow-lg group">
                  <CardContent className="p-0">
                    {/* Thumbnail */}
                    <div className="relative aspect-video bg-muted overflow-hidden rounded-t-lg">
                      {winner.ad.thumbnailUrl ? (
                        <img
                          src={winner.ad.thumbnailUrl}
                          alt={winner.ad.headline || 'Ad'}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          No preview
                        </div>
                      )}
                      {/* Winner Badge */}
                      <Badge className={`absolute top-2 right-2 ${tier.color}`}>
                        {Math.round(winner.winnerStatus.winnerScore * 100)}% {tier.label}
                      </Badge>
                      {/* Platform Badge */}
                      <Badge variant="secondary" className="absolute top-2 left-2">
                        {winner.ad.platform}
                      </Badge>
                    </div>

                    {/* Content */}
                    <div className="p-4 space-y-3">
                      <p className="font-medium line-clamp-2 text-sm">
                        {winner.ad.headline || winner.ad.bodyText?.slice(0, 80) || 'No headline'}
                      </p>

                      {winner.advertiser && (
                        <p className="text-xs text-muted-foreground">
                          @{winner.advertiser.username || winner.advertiser.name}
                        </p>
                      )}

                      {/* Winner Criteria */}
                      <div className="flex flex-wrap gap-1">
                        {criteriaMet.map((criterion) => (
                          <Badge key={criterion} variant="outline" className="text-xs">
                            ✓ {criterion}
                          </Badge>
                        ))}
                      </div>

                      {/* Stats */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                        <span>
                          {winner.ad.daysRunning ? `${winner.ad.daysRunning}d running` : '-'}
                        </span>
                        <span>First seen {formatDaysAgo(winner.ad.firstSeenAt)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
