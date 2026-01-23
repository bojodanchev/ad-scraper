'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { VideoPlayer } from './video-player';

interface ApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videoUrl: string | null;
  previewUrl?: string | null;
  jobId: string;
  platform?: string;
  model?: string;
  onApprove: (id: string, notes?: string) => Promise<boolean>;
  onReject: (id: string, notes?: string, regenerate?: boolean) => Promise<boolean>;
}

export function ApprovalDialog({
  open,
  onOpenChange,
  videoUrl,
  previewUrl,
  jobId,
  platform,
  model,
  onApprove,
  onReject,
}: ApprovalDialogProps) {
  const [notes, setNotes] = useState('');
  const [regenerate, setRegenerate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);

  const handleApprove = async () => {
    setIsSubmitting(true);
    setAction('approve');
    try {
      const success = await onApprove(jobId, notes || undefined);
      if (success) {
        onOpenChange(false);
        setNotes('');
      }
    } finally {
      setIsSubmitting(false);
      setAction(null);
    }
  };

  const handleReject = async () => {
    setIsSubmitting(true);
    setAction('reject');
    try {
      const success = await onReject(jobId, notes || undefined, regenerate);
      if (success) {
        onOpenChange(false);
        setNotes('');
        setRegenerate(false);
      }
    } finally {
      setIsSubmitting(false);
      setAction(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Review Generated Video</DialogTitle>
          <DialogDescription>
            Review the generated video and approve or reject it.
            {platform && (
              <span className="block mt-1 text-xs">
                Platform: <span className="font-medium">{platform}</span>
                {model && (
                  <>
                    {' '} | Model: <span className="font-medium">{model}</span>
                  </>
                )}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Video Preview */}
        <div className="my-4">
          <VideoPlayer
            src={videoUrl}
            poster={previewUrl}
            className="rounded-lg"
          />
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Review Notes (optional)</Label>
          <Textarea
            id="notes"
            placeholder="Add any notes about this video..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>

        {/* Regenerate Option (only shown when rejecting) */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="regenerate"
            checked={regenerate}
            onCheckedChange={(checked) => setRegenerate(checked === true)}
          />
          <Label htmlFor="regenerate" className="text-sm text-muted-foreground cursor-pointer">
            Create new job with same settings (regenerate)
          </Label>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleReject}
            disabled={isSubmitting}
          >
            {isSubmitting && action === 'reject' ? (
              <>
                <SpinnerIcon className="w-4 h-4 mr-2 animate-spin" />
                {regenerate ? 'Regenerating...' : 'Rejecting...'}
              </>
            ) : (
              'Reject'
            )}
          </Button>
          <Button
            onClick={handleApprove}
            disabled={isSubmitting}
          >
            {isSubmitting && action === 'approve' ? (
              <>
                <SpinnerIcon className="w-4 h-4 mr-2 animate-spin" />
                Approving...
              </>
            ) : (
              'Approve'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Quick Approve/Reject Buttons for inline use
interface QuickApprovalButtonsProps {
  jobId: string;
  onApprove: (id: string) => Promise<boolean>;
  onReject: (id: string) => Promise<boolean>;
  size?: 'sm' | 'default';
}

export function QuickApprovalButtons({
  jobId,
  onApprove,
  onReject,
  size = 'sm',
}: QuickApprovalButtonsProps) {
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      await onApprove(jobId);
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    setIsRejecting(true);
    try {
      await onReject(jobId);
    } finally {
      setIsRejecting(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size={size}
        onClick={handleReject}
        disabled={isApproving || isRejecting}
        className="text-destructive hover:text-destructive"
      >
        {isRejecting ? (
          <SpinnerIcon className="w-4 h-4 animate-spin" />
        ) : (
          <XIcon className="w-4 h-4" />
        )}
        {size !== 'sm' && <span className="ml-1">Reject</span>}
      </Button>
      <Button
        variant="outline"
        size={size}
        onClick={handleApprove}
        disabled={isApproving || isRejecting}
        className="text-green-600 hover:text-green-600"
      >
        {isApproving ? (
          <SpinnerIcon className="w-4 h-4 animate-spin" />
        ) : (
          <CheckIcon className="w-4 h-4" />
        )}
        {size !== 'sm' && <span className="ml-1">Approve</span>}
      </Button>
    </div>
  );
}

// Icons
function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
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
