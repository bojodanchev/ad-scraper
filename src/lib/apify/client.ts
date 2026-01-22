const APIFY_BASE_URL = 'https://api.apify.com/v2';

interface ApifyRunInput {
  [key: string]: unknown;
}

interface ApifyRunResponse {
  data: {
    id: string;
    status: string;
    defaultDatasetId: string;
  };
}

interface ApifyRunStatus {
  data: {
    id: string;
    status: 'READY' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'ABORTING' | 'ABORTED' | 'TIMING-OUT' | 'TIMED-OUT';
    defaultDatasetId: string;
    startedAt: string;
    finishedAt: string | null;
  };
}

export class ApifyClient {
  private token: string;

  constructor(token?: string) {
    this.token = token || process.env.APIFY_TOKEN || '';
    if (!this.token) {
      console.warn('APIFY_TOKEN not set - scraping will not work');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${APIFY_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Apify API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Start an actor run
   */
  async runActor(actorId: string, input: ApifyRunInput): Promise<ApifyRunResponse> {
    return this.request<ApifyRunResponse>(`/acts/${actorId}/runs`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  /**
   * Get run status
   */
  async getRunStatus(runId: string): Promise<ApifyRunStatus> {
    return this.request<ApifyRunStatus>(`/actor-runs/${runId}`);
  }

  /**
   * Get dataset items (results)
   */
  async getDatasetItems<T>(datasetId: string, limit = 1000): Promise<T[]> {
    const response = await this.request<T[]>(
      `/datasets/${datasetId}/items?limit=${limit}`
    );
    return response;
  }

  /**
   * Wait for run to complete and return results
   */
  async waitForRunAndGetResults<T>(
    runId: string,
    pollInterval = 5000,
    maxWait = 300000 // 5 minutes
  ): Promise<{ status: string; results: T[] }> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWait) {
      const { data: run } = await this.getRunStatus(runId);

      if (run.status === 'SUCCEEDED') {
        const results = await this.getDatasetItems<T>(run.defaultDatasetId);
        return { status: 'completed', results };
      }

      if (run.status === 'FAILED' || run.status === 'ABORTED' || run.status === 'TIMED-OUT') {
        return { status: 'failed', results: [] };
      }

      // Still running, wait and poll again
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    return { status: 'timeout', results: [] };
  }
}

export const apifyClient = new ApifyClient();
