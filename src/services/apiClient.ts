import {
  BackendMetricsArtifacts,
  CanMessage,
  ModelPrediction,
  SimulationMode,
  SystemStatusResponse,
} from '../types/telemetry';
import {
  buildApiUrl,
  parseMetricsResponse,
  parsePredictionResponse,
  parseStatusResponse,
  parseTelemetryResponse,
} from '../utils/telemetryLogic';

export class ApiClientError extends Error {
  public readonly statusCode: number | null;
  public readonly endpoint: string;

  constructor(message: string, endpoint: string, statusCode: number | null = null) {
    super(message);
    this.name = 'ApiClientError';
    this.statusCode = statusCode;
    this.endpoint = endpoint;
  }
}

async function requestJson<T>(
  baseUrl: string,
  path: string,
  init?: RequestInit,
  timeoutMs = 10000
): Promise<{ data: T; statusCode: number; url: string }> {
  const url = buildApiUrl(baseUrl, path);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const hasBody = init?.body !== undefined;
    const response = await fetch(url, {
      ...init,
      headers: {
        ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
        ...(init?.headers ?? {}),
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      let detail = response.statusText;
      try {
        const errBody = await response.json();
        if (errBody && typeof errBody.detail === 'string') {
          detail = errBody.detail;
        }
      } catch {
        // Ignore JSON parse errors on non-JSON error payloads
      }
      throw new ApiClientError(`HTTP ${response.status}: ${detail || 'Request failed'}`, path, response.status);
    }

    const data = (await response.json()) as T;
    return { data, statusCode: response.status, url };
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error;
    }
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiClientError(`Request timed out after ${timeoutMs}ms (${url})`, path, null);
    }
    const msg = error instanceof Error ? error.message : 'Network error';
    throw new ApiClientError(`Unable to reach FastAPI backend at ${url}: ${msg}`, path, null);
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchSystemStatus(baseUrl: string): Promise<SystemStatusResponse> {
  const { data } = await requestJson<unknown>(baseUrl, '/api/status');
  return parseStatusResponse(data);
}

export async function fetchTelemetryMessages(baseUrl: string): Promise<CanMessage[]> {
  const { data } = await requestJson<unknown>(baseUrl, '/api/telemetry');
  return parseTelemetryResponse(data);
}

export async function fetchLatestPrediction(baseUrl: string): Promise<ModelPrediction> {
  const { data } = await requestJson<unknown>(baseUrl, '/api/prediction');
  return parsePredictionResponse(data);
}

export async function fetchModelMetrics(baseUrl: string): Promise<BackendMetricsArtifacts> {
  const { data } = await requestJson<unknown>(baseUrl, '/api/metrics');
  return parseMetricsResponse(data);
}

export async function postSimulationStart(
  baseUrl: string,
  payload?: { speed?: number }
): Promise<unknown> {
  const { data } = await requestJson<unknown>(baseUrl, '/api/simulation/start', {
    method: 'POST',
    body: JSON.stringify(payload ?? {}),
  });
  return data;
}

export async function postSimulationMode(
  baseUrl: string,
  mode: SimulationMode,
  speed?: number
): Promise<unknown> {
  const { data } = await requestJson<unknown>(baseUrl, '/api/simulation/mode', {
    method: 'POST',
    body: JSON.stringify({ mode, ...(speed !== undefined ? { speed } : {}) }),
  });
  return data;
}

export async function postSimulationPause(baseUrl: string): Promise<unknown> {
  const { data } = await requestJson<unknown>(baseUrl, '/api/simulation/pause', {
    method: 'POST',
    body: JSON.stringify({}),
  });
  return data;
}

export async function postSimulationReset(baseUrl: string): Promise<unknown> {
  const { data } = await requestJson<unknown>(baseUrl, '/api/simulation/reset', {
    method: 'POST',
    body: JSON.stringify({}),
  });
  return data;
}
