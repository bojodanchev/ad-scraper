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
  private _token: string | null = null;

  private get token(): string {
    if (this._token === null) {
      this._token = process.env.APIFY_TOKEN || '';
      if (!this._token) {
        console.warn('APIFY_TOKEN not set - scraping will not work');
      } else {
        console.log('Apify client initialized with token:', this._token.substring(0, 15) + '...');
      }
    }
    return this._token;
  }

  constructor(token?: string) {
    if (token) {
      this._token = token;
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
      console.error('Apify API error:', response.status, error);
      console.error('Request URL:', url);
      console.error('Token used:', this.token.substring(0, 15) + '...');
      throw new Error(`Apify API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Start an actor run
   */
  async runActor(actorId: string, input: ApifyRunInput): Promise<ApifyRunResponse> {
    // Apify API uses ~ instead of / for actor IDs in URL paths
    const encodedActorId = actorId.replace('/', '~');
    console.log('Starting actor:', encodedActorId);
    console.log('Input:', JSON.stringify(input, null, 2));
    return this.request<ApifyRunResponse>(`/acts/${encodedActorId}/runs`, {
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
    maxWait = 900000 // 15 minutes - increased from 5 min for large scrapes
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
