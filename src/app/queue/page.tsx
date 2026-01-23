'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGenerationJobs, useGenerationJobsCount } from '@/hooks/useGenerationJobs';
import { JobList } from '@/components/generation/job-card';

function QueueContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Filter state
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [platform, setPlatform] = useState(searchParams.get('platform') || '');

  // Get jobs with auto-refresh for pending/generating
  const { jobs, total, loading, error, refresh, approveJob, rejectJob, deleteJob } = useGenerationJobs({
    status: status || undefined,
    platform: platform || undefined,
    limit: 50,
    autoRefresh: true,
    refreshInterval: 5000,
  });

  // Get counts for badges
  const reviewCount = useGenerationJobsCount('review');
  const pendingCount = useGenerationJobsCount('pending');
  const generatingCount = useGenerationJobsCount('generating');

  // Update URL params when filters change
  const updateFilters = (newStatus: string, newPlatform: string) => {
    const params = new URLSearchParams();
    if (newStatus) params.set('status', newStatus);
    if (newPlatform) params.set('platform', newPlatform);

    const url = params.toString() ? `/queue?${params}` : '/queue';
    router.push(url);
  };

  const handleStatusChange = (value: string) => {
    const newStatus = value === 'all' ? '' : value;
    setStatus(newStatus);
    updateFilters(newStatus, platform);
  };

  const handlePlatformChange = (value: string) => {
    const newPlatform = value === 'all' ? '' : value;
    setPlatform(newPlatform);
    updateFilters(status, newPlatform);
  };

  // Status tabs
  const statusTabs = [
    { value: '', label: 'All', count: total },
    { value: 'review', label: 'Review', count: reviewCount, highlight: true },
    { value: 'pending', label: 'Pending', count: pendingCount },
    { value: 'generating', label: 'Generating', count: generatingCount },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'failed', label: 'Failed' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Generation Queue</h1>
          <p className="text-muted-foreground mt-1">
            {total} total jobs • {reviewCount > 0 && (
              <span className="text-primary font-medium">{reviewCount} ready for review</span>
            )}
          </p>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={refresh}>
            <RefreshIcon className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Link href="/generate">
            <Button>
              <PlusIcon className="w-4 h-4 mr-2" />
              Generate New
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        {/* Status Tabs */}
        <Tabs value={status} onValueChange={handleStatusChange} className="flex-1">
          <TabsList>
            {statusTabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="relative"
              >
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <Badge
                    variant={tab.highlight ? 'default' : 'secondary'}
                    className="ml-2 text-xs px-1.5 py-0"
                  >
                    {tab.count}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Platform Filter */}
        <Select value={platform || 'all'} onValueChange={handlePlatformChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Platform" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            <SelectItem value="topview">TopView</SelectItem>
            <SelectItem value="higgsfield">Higgsfield</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Job List */}
      {loading && jobs.length === 0 ? (
        <QueueSkeleton />
      ) : (
        <JobList
          jobs={jobs}
          onApprove={approveJob}
          onReject={rejectJob}
          onDelete={deleteJob}
          emptyMessage={
            status
              ? `No ${status} jobs found`
              : 'No generation jobs yet. Create one to get started!'
          }
        />
      )}

      {/* Quick Stats */}
      {!loading && jobs.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
          <StatCard
            label="Total Jobs"
            value={total}
            color="text-foreground"
          />
          <StatCard
            label="Awaiting Review"
            value={reviewCount}
            color="text-purple-600"
            highlight={reviewCount > 0}
          />
          <StatCard
            label="In Progress"
            value={pendingCount + generatingCount}
            color="text-blue-600"
          />
          <StatCard
            label="Credits Used"
            value={jobs.reduce((sum, j) => sum + (j.creditsUsed || 0), 0)}
            color="text-green-600"
          />
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
  highlight,
}: {
  label: string;
  value: number;
  color: string;
  highlight?: boolean;
}) {
  return (
    <div className={`p-4 rounded-lg border ${highlight ? 'bg-primary/5 border-primary/20' : 'bg-muted/30'}`}>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function QueueSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="border rounded-lg p-4 space-y-4">
          <div className="flex justify-between">
            <div className="h-6 w-20 bg-muted rounded animate-pulse" />
            <div className="h-6 w-16 bg-muted rounded animate-pulse" />
          </div>
          <div className="aspect-video bg-muted rounded animate-pulse" />
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded animate-pulse" />
            <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Icons
function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

export default function QueuePage() {
  return (
    <Suspense fallback={<QueueSkeleton />}>
      <QueueContent />
    </Suspense>
  );
}
