'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

interface Competitor {
  id: string;
  platform: string;
  pageName: string;
  pageUrl: string | null;
  avatarUrl: string | null;
  trackingSince: string;
  lastChecked: string | null;
  isActive: boolean;
  tags: string[];
  stats: {
    totalAds: number;
    activeAds: number;
    avgDaysRunning: number;
    topPerformingAd: unknown;
  } | null;
  recentActivity: {
    newAdsLast7Days: number;
    removedAdsLast7Days: number;
  } | null;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString();
}

export default function CompetitorsPage() {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  // New competitor form
  const [newPlatform, setNewPlatform] = useState('meta');
  const [newPageName, setNewPageName] = useState('');
  const [newPageUrl, setNewPageUrl] = useState('');
  const [adding, setAdding] = useState(false);

  // Confirm dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [competitorToDelete, setCompetitorToDelete] = useState<string | null>(null);

  const loadCompetitors = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/competitors');
      const data = await res.json();
      setCompetitors(data.competitors || []);
    } catch (error) {
      console.error('Failed to load competitors:', error);
    } finally {
      setLoading(false);
    }
  };

  const addCompetitor = async () => {
    if (!newPageName.trim()) return;

    setAdding(true);
    try {
      const res = await fetch('/api/competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: newPlatform,
          pageName: newPageName.trim(),
          pageUrl: newPageUrl.trim() || undefined,
        }),
      });

      if (res.ok) {
        setNewPageName('');
        setNewPageUrl('');
        setDialogOpen(false);
        toast.success('Competitor added', {
          description: `Now tracking ${newPageName}`,
        });
        loadCompetitors();
      } else {
        const data = await res.json();
        toast.error('Failed to add competitor', {
          description: data.error || 'Please try again',
        });
      }
    } catch (error) {
      console.error('Failed to add competitor:', error);
      toast.error('Failed to add competitor', {
        description: 'Please try again',
      });
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveClick = (id: string) => {
    setCompetitorToDelete(id);
    setConfirmOpen(true);
  };

  const removeCompetitor = async () => {
    if (!competitorToDelete) return;

    try {
      await fetch(`/api/competitors/${competitorToDelete}`, { method: 'DELETE' });
      toast.success('Competitor removed');
      loadCompetitors();
    } catch (error) {
      console.error('Failed to remove competitor:', error);
      toast.error('Failed to remove competitor');
    } finally {
      setCompetitorToDelete(null);
    }
  };

  useEffect(() => {
    loadCompetitors();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">👁️ Competitor Tracking</h1>
          <p className="text-muted-foreground mt-1">
            Monitor {competitors.length} competitors across platforms
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/intelligence">
            <Button variant="outline">← Back</Button>
          </Link>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>+ Add Competitor</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Competitor to Track</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label>Platform</Label>
                  <Select value={newPlatform} onValueChange={setNewPlatform}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="meta">Meta Ads</SelectItem>
                      <SelectItem value="tiktok">TikTok</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Page/Account Name</Label>
                  <Input
                    placeholder="e.g., DropshipKing"
                    value={newPageName}
                    onChange={(e) => setNewPageName(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Page URL (optional)</Label>
                  <Input
                    placeholder="https://facebook.com/..."
                    value={newPageUrl}
                    onChange={(e) => setNewPageUrl(e.target.value)}
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={addCompetitor}
                  disabled={adding || !newPageName.trim()}
                >
                  {adding ? 'Adding...' : 'Add Competitor'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Competitors List */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse h-48 bg-muted rounded-lg" />
          ))}
        </div>
      ) : competitors.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground mb-4">
            No competitors being tracked yet.
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            Add competitors to monitor their ad activity, detect new campaigns, and track scaling.
          </p>
          <Button onClick={() => setDialogOpen(true)}>Add Your First Competitor</Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {competitors.map((competitor) => (
            <Card key={competitor.id} className="hover:border-primary/50 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {competitor.avatarUrl ? (
                      <img
                        src={competitor.avatarUrl}
                        alt={competitor.pageName}
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg">
                        {competitor.pageName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-base">{competitor.pageName}</CardTitle>
                      <Badge variant="outline" className="text-xs mt-1">
                        {competitor.platform}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemoveClick(competitor.id)}
                  >
                    ×
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 bg-muted rounded">
                    <div className="text-lg font-bold">
                      {competitor.stats?.totalAds || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">Total Ads</div>
                  </div>
                  <div className="p-2 bg-muted rounded">
                    <div className="text-lg font-bold text-green-600">
                      {competitor.stats?.activeAds || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">Active</div>
                  </div>
                  <div className="p-2 bg-muted rounded">
                    <div className="text-lg font-bold">
                      {competitor.stats?.avgDaysRunning || 0}d
                    </div>
                    <div className="text-xs text-muted-foreground">Avg Run</div>
                  </div>
                </div>

                {/* Recent Activity */}
                {competitor.recentActivity && competitor.recentActivity.newAdsLast7Days > 0 && (
                  <div className="text-sm">
                    <Badge variant="secondary" className="mr-2">
                      +{competitor.recentActivity.newAdsLast7Days} new ads
                    </Badge>
                    <span className="text-muted-foreground">in last 7 days</span>
                  </div>
                )}

                {/* Tags */}
                {competitor.tags && competitor.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {competitor.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
                  <span>Tracking since {formatDate(competitor.trackingSince)}</span>
                  <Link href={`/intelligence/competitors/${competitor.id}`}>
                    <Button variant="ghost" size="sm">
                      View Ads →
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Remove Competitor"
        description="Are you sure you want to stop tracking this competitor? This action cannot be undone."
        confirmText="Remove"
        variant="destructive"
        onConfirm={removeCompetitor}
      />
    </div>
  );
}
