'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { GenerationJob } from '@/hooks/useGenerationJobs';
import { VideoPlayer } from './video-player';
import { ApprovalDialog, QuickApprovalButtons } from './approval-dialog';

interface JobCardProps {
  job: GenerationJob;
  onApprove?: (id: string, notes?: string) => Promise<boolean>;
  onReject?: (id: string, notes?: string, regenerate?: boolean) => Promise<boolean>;
  onDelete?: (id: string) => Promise<boolean>;
  showVideo?: boolean;
  compact?: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.FC<{ className?: string }>; animate?: boolean }> = {
  pending: {
    label: 'Pending',
    color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    icon: ClockIcon,
  },
  generating: {
    label: 'Generating',
    color: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    icon: SpinnerIcon,
    animate: true,
  },
  review: {
    label: 'Ready for Review',
    color: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
    icon: EyeIcon,
  },
  approved: {
    label: 'Approved',
    color: 'bg-green-500/10 text-green-600 border-green-500/20',
    icon: CheckIcon,
  },
  rejected: {
    label: 'Rejected',
    color: 'bg-red-500/10 text-red-600 border-red-500/20',
    icon: XIcon,
  },
  failed: {
    label: 'Failed',
    color: 'bg-red-500/10 text-red-600 border-red-500/20',
    icon: AlertIcon,
  },
};

const PLATFORM_CONFIG = {
  topview: {
    label: 'TopView',
    color: 'bg-blue-500',
  },
  higgsfield: {
    label: 'Higgsfield',
    color: 'bg-purple-500',
  },
};

const INPUT_TYPE_LABELS: Record<string, string> = {
  'url-to-video': 'URL to Video',
  'image-to-video': 'Image to Video',
  'text-to-video': 'Text to Video',
  'avatar': 'Avatar Video',
  'product-avatar': 'Product Avatar',
  'remix': 'Remix Ad',
};

export function JobCard({
  job,
  onApprove,
  onReject,
  onDelete,
  showVideo = true,
  compact = false,
}: JobCardProps) {
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const statusConfig = STATUS_CONFIG[job.status] || STATUS_CONFIG.pending;
  const StatusIcon = statusConfig.icon;
  const platformConfig = PLATFORM_CONFIG[job.platform as keyof typeof PLATFORM_CONFIG];

  const handleDelete = async () => {
    if (!onDelete) return;
    if (!confirm('Are you sure you want to delete this job?')) return;

    setIsDeleting(true);
    try {
      await onDelete(job.id);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleString();
  };

  const getInputSummary = () => {
    const data = job.inputData;
    if (!data) return 'No input data';

    if (data.productUrl) return data.productUrl;
    if (data.imageUrl) return 'Image provided';
    if (data.prompt) return data.prompt.slice(0, 100) + (data.prompt.length > 100 ? '...' : '');
    if (data.script) return data.script.slice(0, 100) + (data.script.length > 100 ? '...' : '');
    return 'Custom input';
  };

  if (compact) {
    return (
      <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-3">
          {/* Status */}
          <div
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border',
              statusConfig.color
            )}
          >
            <StatusIcon className={cn('w-3 h-3', statusConfig.animate && 'animate-spin')} />
            {statusConfig.label}
          </div>

          {/* Platform */}
          {platformConfig && (
            <div className="flex items-center gap-1">
              <div className={cn('w-2 h-2 rounded-full', platformConfig.color)} />
              <span className="text-xs text-muted-foreground">{platformConfig.label}</span>
            </div>
          )}

          {/* Input type */}
          <span className="text-sm">
            {INPUT_TYPE_LABELS[job.inputType] || job.inputType}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Review actions */}
          {job.status === 'review' && onApprove && onReject && (
            <QuickApprovalButtons
              jobId={job.id}
              onApprove={onApprove}
              onReject={onReject}
            />
          )}

          {/* View link */}
          <Link href={`/queue/${job.id}`}>
            <Button variant="ghost" size="sm">
              View
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="p-4 pb-2">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              {/* Status Badge */}
              <div
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border',
                  statusConfig.color
                )}
              >
                <StatusIcon className={cn('w-3 h-3', statusConfig.animate && 'animate-spin')} />
                {statusConfig.label}
              </div>

              {/* Input Type */}
              <h3 className="font-medium">
                {INPUT_TYPE_LABELS[job.inputType] || job.inputType}
              </h3>
            </div>

            {/* Platform Badge */}
            {platformConfig && (
              <Badge variant="outline" className="text-xs">
                <div className={cn('w-2 h-2 rounded-full mr-1', platformConfig.color)} />
                {platformConfig.label}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-4 pt-2">
          {/* Video Preview */}
          {showVideo && (job.outputVideoUrl || job.previewUrl) && (
            <div className="mb-4">
              <VideoPlayer
                src={job.outputVideoUrl}
                poster={job.previewUrl}
                className="rounded-md"
              />
            </div>
          )}

          {/* Input Summary */}
          <div className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {getInputSummary()}
          </div>

          {/* Meta Info */}
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            {job.model && (
              <div>
                <span className="font-medium">Model:</span> {job.model}
              </div>
            )}
            {job.creditsUsed && (
              <div>
                <span className="font-medium">Credits:</span> {job.creditsUsed}
              </div>
            )}
            <div>
              <span className="font-medium">Created:</span> {formatDate(job.createdAt)}
            </div>
            {job.generatedAt && (
              <div>
                <span className="font-medium">Generated:</span> {formatDate(job.generatedAt)}
              </div>
            )}
          </div>

          {/* Error Message */}
          {job.status === 'failed' && job.errorMessage && (
            <div className="mt-3 p-2 bg-destructive/10 rounded text-xs text-destructive">
              {job.errorMessage}
            </div>
          )}

          {/* Review Notes */}
          {job.reviewNotes && (
            <div className="mt-3 p-2 bg-muted rounded text-xs">
              <span className="font-medium">Review Notes:</span> {job.reviewNotes}
            </div>
          )}
        </CardContent>

        <CardFooter className="p-4 pt-0 flex justify-between">
          <div className="flex gap-2">
            {/* Review action */}
            {job.status === 'review' && onApprove && onReject && (
              <Button
                size="sm"
                onClick={() => setShowApprovalDialog(true)}
              >
                Review
              </Button>
            )}

            {/* View detail */}
            <Link href={`/queue/${job.id}`}>
              <Button variant="outline" size="sm">
                Details
              </Button>
            </Link>
          </div>

          {/* Delete */}
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-muted-foreground hover:text-destructive"
            >
              {isDeleting ? (
                <SpinnerIcon className="w-4 h-4 animate-spin" />
              ) : (
                <TrashIcon className="w-4 h-4" />
              )}
            </Button>
          )}
        </CardFooter>
      </Card>

      {/* Approval Dialog */}
      {onApprove && onReject && (
        <ApprovalDialog
          open={showApprovalDialog}
          onOpenChange={setShowApprovalDialog}
          videoUrl={job.outputVideoUrl || null}
          previewUrl={job.previewUrl}
          jobId={job.id}
          platform={job.platform}
          model={job.model || undefined}
          onApprove={onApprove}
          onReject={onReject}
        />
      )}
    </>
  );
}

// Job List component
interface JobListProps {
  jobs: GenerationJob[];
  onApprove?: (id: string, notes?: string) => Promise<boolean>;
  onReject?: (id: string, notes?: string, regenerate?: boolean) => Promise<boolean>;
  onDelete?: (id: string) => Promise<boolean>;
  compact?: boolean;
  emptyMessage?: string;
}

export function JobList({
  jobs,
  onApprove,
  onReject,
  onDelete,
  compact = false,
  emptyMessage = 'No jobs found',
}: JobListProps) {
  if (jobs.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <VideoIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>{emptyMessage}</p>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="space-y-2">
        {jobs.map((job) => (
          <JobCard
            key={job.id}
            job={job}
            onApprove={onApprove}
            onReject={onReject}
            onDelete={onDelete}
            compact
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {jobs.map((job) => (
        <JobCard
          key={job.id}
          job={job}
          onApprove={onApprove}
          onReject={onReject}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

// Icons
function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
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

function VideoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}
