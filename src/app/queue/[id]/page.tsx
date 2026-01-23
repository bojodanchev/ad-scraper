'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useGenerationJob } from '@/hooks/useGenerationJobs';
import { VideoPlayer } from '@/components/generation/video-player';

const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    description: 'Waiting in queue to be processed',
  },
  generating: {
    label: 'Generating',
    color: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    description: 'Video is being generated',
  },
  review: {
    label: 'Ready for Review',
    color: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
    description: 'Video is ready for your review',
  },
  approved: {
    label: 'Approved',
    color: 'bg-green-500/10 text-green-600 border-green-500/20',
    description: 'Video has been approved',
  },
  rejected: {
    label: 'Rejected',
    color: 'bg-red-500/10 text-red-600 border-red-500/20',
    description: 'Video was rejected',
  },
  failed: {
    label: 'Failed',
    color: 'bg-red-500/10 text-red-600 border-red-500/20',
    description: 'Generation failed',
  },
};

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;

  const { job, loading, error, refresh } = useGenerationJob(jobId);

  // Review state
  const [reviewNotes, setReviewNotes] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [regenerate, setRegenerate] = useState(false);

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      const res = await fetch(`/api/generate/${jobId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: reviewNotes || undefined }),
      });

      if (res.ok) {
        refresh();
        setReviewNotes('');
      }
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    setIsRejecting(true);
    try {
      const res = await fetch(`/api/generate/${jobId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: reviewNotes || undefined,
          regenerate,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (regenerate && data.newJobId) {
          router.push(`/queue/${data.newJobId}`);
        } else {
          refresh();
        }
        setReviewNotes('');
      }
    } finally {
      setIsRejecting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this job?')) return;

    const res = await fetch(`/api/generate/${jobId}`, { method: 'DELETE' });
    if (res.ok) {
      router.push('/queue');
    }
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return <JobDetailSkeleton />;
  }

  if (error || !job) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">Job Not Found</h2>
        <p className="text-muted-foreground mb-4">{error || 'The requested job could not be found.'}</p>
        <Link href="/queue">
          <Button variant="outline">Back to Queue</Button>
        </Link>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[job.status] || STATUS_CONFIG.pending;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link href="/queue" className="text-muted-foreground hover:text-foreground">
              <ChevronLeftIcon className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl font-bold">Job Details</h1>
            <Badge className={cn('border', statusConfig.color)}>
              {statusConfig.label}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">{statusConfig.description}</p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={refresh}>
            <RefreshIcon className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={handleDelete}
          >
            <TrashIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - Video */}
        <div className="lg:col-span-2 space-y-6">
          {/* Video Player */}
          <Card>
            <CardContent className="p-4">
              <VideoPlayer
                src={job.outputVideoUrl}
                poster={job.previewUrl}
                className="rounded-lg"
              />
            </CardContent>
          </Card>

          {/* Review Actions */}
          {job.status === 'review' && (
            <Card>
              <CardHeader>
                <CardTitle>Review Video</CardTitle>
                <CardDescription>
                  Approve this video or reject and optionally regenerate
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="notes">Review Notes (optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Add feedback or notes..."
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="regenerate"
                    checked={regenerate}
                    onChange={(e) => setRegenerate(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="regenerate" className="text-sm text-muted-foreground cursor-pointer">
                    Create new job with same settings if rejected
                  </Label>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="destructive"
                    onClick={handleReject}
                    disabled={isApproving || isRejecting}
                    className="flex-1"
                  >
                    {isRejecting ? 'Rejecting...' : 'Reject'}
                  </Button>
                  <Button
                    onClick={handleApprove}
                    disabled={isApproving || isRejecting}
                    className="flex-1"
                  >
                    {isApproving ? 'Approving...' : 'Approve'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Input Data */}
          <Card>
            <CardHeader>
              <CardTitle>Input Data</CardTitle>
            </CardHeader>
            <CardContent>
              {job.inputData ? (
                <div className="space-y-3">
                  {job.inputData.productUrl && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Product URL</Label>
                      <a
                        href={job.inputData.productUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-sm text-primary hover:underline truncate"
                      >
                        {job.inputData.productUrl}
                      </a>
                    </div>
                  )}
                  {job.inputData.imageUrl && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Image</Label>
                      <img
                        src={job.inputData.imageUrl}
                        alt="Input"
                        className="mt-1 max-h-32 rounded border"
                      />
                    </div>
                  )}
                  {job.inputData.prompt && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Prompt</Label>
                      <p className="text-sm">{job.inputData.prompt}</p>
                    </div>
                  )}
                  {job.inputData.script && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Script</Label>
                      <p className="text-sm whitespace-pre-wrap">{job.inputData.script}</p>
                    </div>
                  )}
                  {job.inputData.offer && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Offer/CTA</Label>
                      <p className="text-sm">{job.inputData.offer}</p>
                    </div>
                  )}
                  <div className="flex gap-4">
                    {job.inputData.aspectRatio && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Aspect Ratio</Label>
                        <p className="text-sm font-mono">{job.inputData.aspectRatio}</p>
                      </div>
                    )}
                    {job.inputData.duration && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Duration</Label>
                        <p className="text-sm">{job.inputData.duration}s</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No input data available</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Meta Info */}
        <div className="space-y-6">
          {/* Job Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Job Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <InfoRow label="Job ID" value={job.id} mono />
              <InfoRow label="Input Type" value={job.inputType} />
              <InfoRow
                label="Platform"
                value={
                  <Badge variant="outline">
                    <span className={cn(
                      'w-2 h-2 rounded-full mr-1',
                      job.platform === 'topview' ? 'bg-blue-500' : 'bg-purple-500'
                    )} />
                    {job.platform === 'topview' ? 'TopView' : 'Higgsfield'}
                  </Badge>
                }
              />
              {job.model && <InfoRow label="Model" value={job.model} />}
              {job.creditsUsed && <InfoRow label="Credits Used" value={job.creditsUsed} />}
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <TimelineItem
                label="Created"
                time={formatDate(job.createdAt)}
                active
              />
              {job.generatedAt && (
                <TimelineItem
                  label="Generated"
                  time={formatDate(job.generatedAt)}
                  active
                />
              )}
              {job.reviewedAt && (
                <TimelineItem
                  label="Reviewed"
                  time={formatDate(job.reviewedAt)}
                  active
                />
              )}
            </CardContent>
          </Card>

          {/* Error Details */}
          {job.status === 'failed' && job.errorMessage && (
            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="text-lg text-destructive">Error Details</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-destructive">{job.errorMessage}</p>
              </CardContent>
            </Card>
          )}

          {/* Review Notes */}
          {job.reviewNotes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Review Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{job.reviewNotes}</p>
              </CardContent>
            </Card>
          )}

          {/* Source Ad Link */}
          {job.sourceAdId && (
            <Link href={`/ads/${job.sourceAdId}`}>
              <Button variant="outline" className="w-full">
                <LinkIcon className="w-4 h-4 mr-2" />
                View Source Ad
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={cn('text-sm', mono && 'font-mono text-xs')}>{value}</span>
    </div>
  );
}

function TimelineItem({
  label,
  time,
  active,
}: {
  label: string;
  time: string;
  active?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className={cn(
        'w-2 h-2 rounded-full',
        active ? 'bg-primary' : 'bg-muted'
      )} />
      <div className="flex-1">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-muted-foreground ml-2">{time}</span>
      </div>
    </div>
  );
}

function JobDetailSkeleton() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-8 w-32 bg-muted rounded animate-pulse" />
        <div className="h-6 w-20 bg-muted rounded animate-pulse" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="aspect-video bg-muted rounded-lg animate-pulse" />
          <div className="h-48 bg-muted rounded-lg animate-pulse" />
        </div>
        <div className="space-y-6">
          <div className="h-40 bg-muted rounded-lg animate-pulse" />
          <div className="h-32 bg-muted rounded-lg animate-pulse" />
        </div>
      </div>
    </div>
  );
}

// Icons
function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function LinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  );
}
