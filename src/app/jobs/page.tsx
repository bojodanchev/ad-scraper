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

function JobsContent() {
  const searchParams = useSearchParams();
  const highlightId = searchParams.get('highlight');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    loadJobs();

    // Poll for updates every 5 seconds if there's a running job
    const interval = setInterval(() => {
      loadJobs();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500">Completed</Badge>;
      case 'running':
        return <Badge className="bg-blue-500">Running</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500">Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
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
        <Link href="/scrape">
          <Button>New Scrape</Button>
        </Link>
      </div>

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
              className={
                highlightId === job.id ? 'ring-2 ring-primary' : ''
              }
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Badge variant={job.platform === 'meta' ? 'default' : 'secondary'}>
                      {job.platform === 'meta' ? 'Meta' : 'TikTok'}
                    </Badge>
                    <span className="font-normal text-muted-foreground">
                      {job.searchType === 'keyword' ? 'Keyword:' : 'Advertiser:'}
                    </span>
                    {job.query}
                  </CardTitle>
                  {getStatusBadge(job.status)}
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
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary animate-pulse w-1/2" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Scraping in progress... This may take a few minutes.
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
