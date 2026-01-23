'use client';

import { useState, useEffect, useCallback } from 'react';

export interface GenerationJob {
  id: string;
  sourceAdId?: string | null;
  platform: string;
  model?: string | null;
  status: 'pending' | 'generating' | 'review' | 'approved' | 'rejected' | 'failed';
  inputType: string;
  inputData: {
    productUrl?: string;
    imageUrl?: string;
    avatarId?: string;
    script?: string;
    prompt?: string;
    offer?: string;
    aspectRatio?: string;
    duration?: number;
  } | null;
  outputVideoUrl?: string | null;
  previewUrl?: string | null;
  generatedAt?: string | null;
  reviewedAt?: string | null;
  reviewNotes?: string | null;
  errorMessage?: string | null;
  creditsUsed?: number | null;
  createdAt?: string | null;
}

interface UseGenerationJobsOptions {
  status?: string;
  platform?: string;
  limit?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseGenerationJobsReturn {
  jobs: GenerationJob[];
  total: number;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createJob: (data: CreateJobData) => Promise<{ id: string } | null>;
  approveJob: (id: string, notes?: string) => Promise<boolean>;
  rejectJob: (id: string, notes?: string, regenerate?: boolean) => Promise<boolean>;
  deleteJob: (id: string) => Promise<boolean>;
}

interface CreateJobData {
  sourceAdId?: string;
  platform?: string;
  model?: string;
  inputType: string;
  productUrl?: string;
  imageUrl?: string;
  avatarId?: string;
  script?: string;
  prompt?: string;
  offer?: string;
  aspectRatio?: string;
  duration?: number;
  priority?: number;
}

export function useGenerationJobs(options: UseGenerationJobsOptions = {}): UseGenerationJobsReturn {
  const {
    status,
    platform,
    limit = 50,
    autoRefresh = false,
    refreshInterval = 5000,
  } = options;

  const [jobs, setJobs] = useState<GenerationJob[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (platform) params.set('platform', platform);
      params.set('limit', limit.toString());

      const res = await fetch(`/api/generate?${params}`);
      if (!res.ok) throw new Error('Failed to fetch jobs');

      const data = await res.json();
      setJobs(data.jobs || []);
      setTotal(data.total || 0);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch jobs');
    } finally {
      setLoading(false);
    }
  }, [status, platform, limit]);

  // Initial fetch
  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Auto-refresh for pending/generating jobs
  useEffect(() => {
    if (!autoRefresh) return;

    const hasPendingJobs = jobs.some(j => j.status === 'pending' || j.status === 'generating');
    if (!hasPendingJobs) return;

    const interval = setInterval(fetchJobs, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, jobs, fetchJobs]);

  const createJob = async (data: CreateJobData): Promise<{ id: string } | null> => {
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create job');
      }

      const result = await res.json();

      // Optimistically add to list
      await fetchJobs();

      return { id: result.id };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create job');
      return null;
    }
  };

  const approveJob = async (id: string, notes?: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/generate/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to approve job');
      }

      // Update local state
      setJobs(prev => prev.map(j =>
        j.id === id ? { ...j, status: 'approved' as const, reviewNotes: notes || j.reviewNotes } : j
      ));

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve job');
      return false;
    }
  };

  const rejectJob = async (id: string, notes?: string, regenerate = false): Promise<boolean> => {
    try {
      const res = await fetch(`/api/generate/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes, regenerate }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to reject job');
      }

      // Update local state
      setJobs(prev => prev.map(j =>
        j.id === id ? { ...j, status: 'rejected' as const, reviewNotes: notes || j.reviewNotes } : j
      ));

      // If regenerated, refresh to get new job
      if (regenerate) {
        await fetchJobs();
      }

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject job');
      return false;
    }
  };

  const deleteJob = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/generate/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete job');
      }

      // Remove from local state
      setJobs(prev => prev.filter(j => j.id !== id));
      setTotal(prev => prev - 1);

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete job');
      return false;
    }
  };

  return {
    jobs,
    total,
    loading,
    error,
    refresh: fetchJobs,
    createJob,
    approveJob,
    rejectJob,
    deleteJob,
  };
}

// Hook for single job
export function useGenerationJob(id: string | null) {
  const [job, setJob] = useState<GenerationJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJob = useCallback(async () => {
    if (!id) {
      setJob(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`/api/generate/${id}`);
      if (!res.ok) throw new Error('Job not found');

      const data = await res.json();
      setJob(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch job');
      setJob(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchJob();
  }, [fetchJob]);

  // Auto-refresh if generating
  useEffect(() => {
    if (!job || (job.status !== 'pending' && job.status !== 'generating')) return;

    const interval = setInterval(fetchJob, 5000);
    return () => clearInterval(interval);
  }, [job, fetchJob]);

  return { job, loading, error, refresh: fetchJob };
}

// Count hook for nav badge
export function useGenerationJobsCount(status?: string) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const params = new URLSearchParams();
        if (status) params.set('status', status);
        params.set('limit', '1');

        const res = await fetch(`/api/generate?${params}`);
        if (res.ok) {
          const data = await res.json();
          setCount(data.total || 0);
        }
      } catch {
        // Ignore errors for count
      }
    };

    fetchCount();
    const interval = setInterval(fetchCount, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [status]);

  return count;
}
