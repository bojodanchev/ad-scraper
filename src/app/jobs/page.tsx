'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface Job {
  id: string;
  platform: string;
  searchType: string;
  query: string;
  status: string;
  adsFound: number;
  startedAt: string;
  completedAt?: string;
  error?: string;
}

// Jobs running for more than 10 minutes are considered stuck
const STUCK_THRESHOLD_MS = 10 * 60 * 1000;

function isJobStuck(job: Job): boolean {
  if (job.status !== 'running' && job.status !== 'pending') return false;
  const startTime = new Date(job.startedAt).getTime();
  return Date.now() - startTime > STUCK_THRESHOLD_MS;
}

function getRunningTime(job: Job): string {
  const startTime = new Date(job.startedAt).getTime();
  const elapsed = Date.now() - startTime;
  const minutes = Math.floor(elapsed / 60000);
  if (minutes < 1) return 'just started';
  if (minutes === 1) return '1 minute';
  return `${minutes} minutes`;
}

function JobsContent() {
  const searchParams = useSearchParams();
  const highlightId = searchParams.get('highlight');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [recovering, setRecovering] = useState(false);

  const loadJobs = async () => {
    try {
      // Load all jobs from the database
      const res = await fetch('/api/jobs');
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs || []);
      }
    } catch (error) {
      console.error('Failed to load jobs:', error);
    }
    setLoading(false);
  };

  const recoverStuckJobs = async () => {
    setRecovering(true);
    try {
      const res = await fetch('/api/jobs/recover', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        console.log('Recovery result:', data);
        // Reload jobs to show updated statuses
        await loadJobs();
      }
    } catch (error) {
      console.error('Failed to recover jobs:', error);
    }
    setRecovering(false);
  };

  useEffect(() => {
    loadJobs();

    // Poll for updates every 5 seconds if there's a running job
    const interval = setInterval(() => {
      loadJobs();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const hasStuckJobs = jobs.some(isJobStuck);

  const getStatusBadge = (job: Job) => {
    const status = job.status;
    const stuck = isJobStuck(job);

    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500">Completed</Badge>;
      case 'running':
        return stuck
          ? <Badge className="bg-orange-500">Stuck ({getRunningTime(job)})</Badge>
          : <Badge className="bg-blue-500">Running</Badge>;
      case 'pending':
        return stuck
          ? <Badge className="bg-orange-500">Stuck ({getRunningTime(job)})</Badge>
          : <Badge className="bg-yellow-500">Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPlatformBadge = (platform: string) => {
    switch (platform) {
      case 'meta':
        return <Badge variant="default">Meta</Badge>;
      case 'tiktok':
        return <Badge variant="secondary" className="bg-pink-500 text-white">TikTok</Badge>;
      case 'instagram':
        return <Badge variant="secondary" className="bg-purple-500 text-white">Instagram</Badge>;
      default:
        return <Badge variant="outline">{platform}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Scrape Jobs</h1>
          <p className="text-muted-foreground mt-1">
            Monitor your scraping jobs
          </p>
        </div>
        <div className="flex gap-2">
          {hasStuckJobs && (
            <Button
              variant="outline"
              onClick={recoverStuckJobs}
              disabled={recovering}
            >
              {recovering ? 'Recovering...' : 'Recover Stuck Jobs'}
            </Button>
          )}
          <Link href="/scrape">
            <Button>New Scrape</Button>
          </Link>
        </div>
      </div>

      {hasStuckJobs && (
        <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-md text-sm">
          <strong>Some jobs appear stuck.</strong> They&apos;ve been running for more than 10 minutes.
          Click &quot;Recover Stuck Jobs&quot; to check their status and recover if possible.
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No jobs yet</p>
            <Link href="/scrape">
              <Button variant="link">Start your first scrape →</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <Card
              key={job.id}
              className={`${highlightId === job.id ? 'ring-2 ring-primary' : ''} ${isJobStuck(job) ? 'border-orange-500/50' : ''}`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {getPlatformBadge(job.platform)}
                    <span className="font-normal text-muted-foreground">
                      {job.searchType === 'keyword' ? 'Search:' :
                       job.searchType === 'hashtag' ? 'Hashtag:' :
                       job.searchType === 'profile' ? 'Profile:' :
                       'Advertiser:'}
                    </span>
                    {job.query}
                  </CardTitle>
                  {getStatusBadge(job)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex gap-6 text-muted-foreground">
                    <span>
                      Started: {new Date(job.startedAt).toLocaleString()}
                    </span>
                    {job.completedAt && (
                      <span>
                        Completed: {new Date(job.completedAt).toLocaleString()}
                      </span>
                    )}
                    {job.status === 'completed' && (
                      <span className="text-foreground font-medium">
                        {job.adsFound} ads found
                      </span>
                    )}
                  </div>
                  {job.status === 'completed' && job.adsFound > 0 && (
                    <Link href="/ads">
                      <Button variant="outline" size="sm">
                        View Ads
                      </Button>
                    </Link>
                  )}
                </div>
                {job.error && (
                  <p className="mt-2 text-sm text-destructive">{job.error}</p>
                )}
                {(job.status === 'running' || job.status === 'pending') && (
                  <div className="mt-3">
                    <div className={`h-2 rounded-full overflow-hidden ${isJobStuck(job) ? 'bg-orange-200' : 'bg-muted'}`}>
                      <div className={`h-full animate-pulse w-1/2 ${isJobStuck(job) ? 'bg-orange-500' : 'bg-primary'}`} />
                    </div>
                    <p className={`text-xs mt-1 ${isJobStuck(job) ? 'text-orange-600' : 'text-muted-foreground'}`}>
                      {isJobStuck(job)
                        ? `Running for ${getRunningTime(job)} - this job may be stuck. Click "Recover Stuck Jobs" to check.`
                        : 'Scraping in progress... This may take a few minutes.'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function JobsPage() {
  return (
    <Suspense fallback={<div className="animate-pulse h-96 bg-muted rounded-lg" />}>
      <JobsContent />
    </Suspense>
  );
}
