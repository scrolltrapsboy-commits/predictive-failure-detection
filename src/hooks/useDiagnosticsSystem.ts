import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ApiClientError,
  fetchLatestPrediction,
  fetchModelMetrics,
  fetchSystemStatus,
  fetchTelemetryMessages,
  postSimulationMode,
  postSimulationPause,
  postSimulationReset,
  postSimulationStart,
} from '../services/apiClient';
import {
  AlertRecord,
  ApiCommandLogEntry,
  BackendMetricsArtifacts,
  CanMessage,
  ChannelTelemetrySummary,
  ConnectionState,
  ModelPrediction,
  SimulationMode,
  SimulationRunState,
  SystemStatusResponse,
  TelemetryChartPoint,
} from '../types/telemetry';
import {
  computeChannelSummaries,
  formatTelemetryTime,
  generatePreviewCanBatch,
  normalizeApiBaseUrl,
} from '../utils/telemetryLogic';

const STORAGE_KEY_API_URL = 'p18_api_base_url';
const MAX_MESSAGES = 120;
const MAX_CHART_POINTS = 36;
const MAX_ALERTS = 30;
const MAX_LOGS = 20;

export interface DiagnosticsState {
  apiBaseUrl: string;
  setApiBaseUrl: (url: string) => void;
  connectionState: ConnectionState;
  lastApiError: string | null;
  lastSuccessfulSync: string | null;
  previewStreamEnabled: boolean;
  setPreviewStreamEnabled: (enabled: boolean) => void;
  streamPaused: boolean;
  setStreamPaused: (paused: boolean) => void;
  status: SystemStatusResponse | null;
  messages: CanMessage[];
  chartHistory: TelemetryChartPoint[];
  channelSummaries: ChannelTelemetrySummary[];
  prediction: ModelPrediction | null;
  metricsArtifacts: BackendMetricsArtifacts | null;
  metricsError: string | null;
  alerts: AlertRecord[];
  commandLogs: ApiCommandLogEntry[];
  pendingCommand: string | null;
  commandFeedback: { ok: boolean; message: string; timestamp: string } | null;
  simulationSpeed: number;
  setSimulationSpeed: (speed: number) => void;
  testAndSyncNow: () => Promise<void>;
  refreshMetrics: () => Promise<void>;
  sendStartSimulation: () => Promise<void>;
  sendPauseSimulation: () => Promise<void>;
  sendResetSimulation: () => Promise<void>;
  sendSimulationMode: (mode: SimulationMode) => Promise<void>;
}

function getInitialApiBaseUrl(): string {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY_API_URL);
    if (saved && saved.trim()) {
      return normalizeApiBaseUrl(saved);
    }
  } catch {
    // Ignore storage unavailability
  }
  return normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL as string | undefined);
}

export function useDiagnosticsSystem(): DiagnosticsState {
  const [apiBaseUrl, setApiBaseUrlState] = useState<string>(getInitialApiBaseUrl);
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
  const [lastApiError, setLastApiError] = useState<string | null>(null);
  const [lastSuccessfulSync, setLastSuccessfulSync] = useState<string | null>(null);

  const [previewStreamEnabled, setPreviewStreamEnabled] = useState<boolean>(true);
  const [streamPaused, setStreamPaused] = useState<boolean>(false);

  const [status, setStatus] = useState<SystemStatusResponse | null>(null);
  const [messages, setMessages] = useState<CanMessage[]>(() => {
    const initial: CanMessage[] = [];
    for (let i = 0; i < 6; i++) {
      initial.unshift(...generatePreviewCanBatch(i));
    }
    return initial.slice(0, MAX_MESSAGES);
  });
  const [chartHistory, setChartHistory] = useState<TelemetryChartPoint[]>(() => {
    const points: TelemetryChartPoint[] = [];
    for (let i = 0; i < 12; i++) {
      const batch = generatePreviewCanBatch(i);
      points.push({
        timeLabel: formatTelemetryTime(batch[0].timestamp).slice(0, 8),
        timestamp: batch[0].timestamp,
        ch100: batch[0]?.payloadMean ?? null,
        ch101: batch[1]?.payloadMean ?? null,
        ch102: batch[2]?.payloadMean ?? null,
        ch103: batch[3]?.payloadMean ?? null,
        anomalyScore: null,
        healthPct: 100,
      });
    }
    return points;
  });

  const [prediction, setPrediction] = useState<ModelPrediction | null>(null);
  const [metricsArtifacts, setMetricsArtifacts] = useState<BackendMetricsArtifacts | null>(null);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [commandLogs, setCommandLogs] = useState<ApiCommandLogEntry[]>([]);
  const [pendingCommand, setPendingCommand] = useState<string | null>(null);
  const [commandFeedback, setCommandFeedback] = useState<{
    ok: boolean;
    message: string;
    timestamp: string;
  } | null>(null);
  const [simulationSpeed, setSimulationSpeed] = useState<number>(1);
  const [previewMessageCount, setPreviewMessageCount] = useState<number>(24);

  const previewTickRef = useRef<number>(12);
  const lastAlertKeyRef = useRef<string>('');

  const appendLog = useCallback(
    (
      method: 'GET' | 'POST',
      endpoint: string,
      ok: boolean,
      statusCode: number | null,
      summary: string
    ) => {
      setCommandLogs((prev) =>
        [
          {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            timestamp: new Date().toISOString(),
            method,
            endpoint,
            ok,
            statusCode,
            summary,
          },
          ...prev,
        ].slice(0, MAX_LOGS)
      );
    },
    []
  );

  const setApiBaseUrl = useCallback((url: string) => {
    const normalized = normalizeApiBaseUrl(url);
    setApiBaseUrlState(normalized);
    try {
      window.localStorage.setItem(STORAGE_KEY_API_URL, normalized);
    } catch {
      // Ignore storage errors
    }
  }, []);

  const refreshMetrics = useCallback(async () => {
    try {
      const artifacts = await fetchModelMetrics(apiBaseUrl);
      setMetricsArtifacts(artifacts);
      setMetricsError(null);
      appendLog('GET', '/api/metrics', true, 200, 'Loaded Mark 24 evaluation metrics');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch /api/metrics';
      const statusCode = err instanceof ApiClientError ? err.statusCode : null;
      setMetricsError(message);
      appendLog('GET', '/api/metrics', false, statusCode, message);
    }
  }, [apiBaseUrl, appendLog]);

  const pollBackend = useCallback(async () => {
    try {
      const [statusRes, telemetryRes, predictionRes] = await Promise.all([
        fetchSystemStatus(apiBaseUrl),
        fetchTelemetryMessages(apiBaseUrl),
        fetchLatestPrediction(apiBaseUrl),
      ]);

      setConnectionState('connected');
      setLastApiError(null);
      setLastSuccessfulSync(new Date().toISOString());
      setStatus(statusRes);
      setPrediction(predictionRes);

      if (telemetryRes.length > 0 && !streamPaused) {
        setMessages((prev) => {
          const onlyBackendPrev = prev.filter((m) => m.source === 'backend');
          const seen = new Set(onlyBackendPrev.map((m) => m.id));
          const fresh = telemetryRes.filter((m) => !seen.has(m.id));
          const merged = [...fresh, ...onlyBackendPrev];
          return (merged.length > 0 ? merged : telemetryRes).slice(0, MAX_MESSAGES);
        });
      }

      const latestByChannel = new Map<string, number>();
      for (const msg of telemetryRes) {
        if (!latestByChannel.has(msg.canId)) {
          latestByChannel.set(msg.canId, msg.payloadMean);
        }
      }

      const pointTime = telemetryRes[0]?.timestamp ?? predictionRes.detectionTimestamp ?? new Date().toISOString();
      setChartHistory((prev) => {
        const last = prev[prev.length - 1];
        return [
          ...prev,
          {
            timeLabel: formatTelemetryTime(pointTime).slice(0, 8),
            timestamp: pointTime,
            ch100: latestByChannel.get('0x100') ?? last?.ch100 ?? null,
            ch101: latestByChannel.get('0x101') ?? last?.ch101 ?? null,
            ch102: latestByChannel.get('0x102') ?? last?.ch102 ?? null,
            ch103: latestByChannel.get('0x103') ?? last?.ch103 ?? null,
            anomalyScore: predictionRes.isolationForestAnomalyScore,
            healthPct: statusRes.vehicleHealthPct,
          },
        ].slice(-MAX_CHART_POINTS);
      });

      if (
        predictionRes.predictedCondition === 'WARNING' ||
        predictionRes.predictedCondition === 'CRITICAL'
      ) {
        const episodeKey = `${predictionRes.predictedCondition}-${predictionRes.affectedChannel ?? 'bus'}`;
        if (episodeKey !== lastAlertKeyRef.current) {
          lastAlertKeyRef.current = episodeKey;
          setAlerts((prev) =>
            [
              {
                id: `${episodeKey}-${Date.now()}`,
                timestamp: predictionRes.detectionTimestamp,
                severity: predictionRes.predictedCondition as 'WARNING' | 'CRITICAL',
                channel: String(predictionRes.affectedChannel ?? 'Bus-Wide'),
                title:
                  predictionRes.predictedCondition === 'CRITICAL'
                    ? 'Severe Abnormality Detected'
                    : 'Early Degradation Detected',
                detail: `${predictionRes.selectedModel} classified ${predictionRes.predictedCondition} on ${predictionRes.affectedChannel ?? 'CAN Bus'}.`,
                anomalyScore: predictionRes.isolationForestAnomalyScore,
              },
              ...prev,
            ].slice(0, MAX_ALERTS)
          );
        }
      } else {
        lastAlertKeyRef.current = '';
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Backend connection failed';
      setConnectionState((prev) => (prev === 'connected' ? 'error' : 'disconnected'));
      setLastApiError(message);
      setStatus(null);
      setPrediction(null);
    }
  }, [apiBaseUrl, streamPaused]);

  const connectionStateRef = useRef<ConnectionState>(connectionState);
  useEffect(() => {
    connectionStateRef.current = connectionState;
  }, [connectionState]);

  const testAndSyncNow = useCallback(async () => {
    setConnectionState('connecting');
    await Promise.all([pollBackend(), refreshMetrics()]);
  }, [pollBackend, refreshMetrics]);

  // Initial sync & stable polling loop (1.5s when connected, 15s backoff when disconnected)
  useEffect(() => {
    void testAndSyncNow();
    let tickCounter = 0;
    const timer = setInterval(() => {
      tickCounter += 1;
      if (connectionStateRef.current === 'connected' || tickCounter % 10 === 0) {
        void pollBackend();
      }
    }, 1500);
    return () => clearInterval(timer);
  }, [apiBaseUrl, pollBackend, testAndSyncNow]);

  // Clearly identified offline preview CAN frame stream (no fake ML inference)
  useEffect(() => {
    if (connectionState === 'connected' || !previewStreamEnabled || streamPaused) {
      return;
    }
    const interval = setInterval(() => {
      previewTickRef.current += 1;
      const batch = generatePreviewCanBatch(previewTickRef.current);
      setPreviewMessageCount((c) => c + batch.length);
      setMessages((prev) => [...batch, ...prev.filter((m) => m.source === 'preview')].slice(0, MAX_MESSAGES));
      setChartHistory((prev) =>
        [
          ...prev,
          {
            timeLabel: formatTelemetryTime(batch[0].timestamp).slice(0, 8),
            timestamp: batch[0].timestamp,
            ch100: batch[0]?.payloadMean ?? null,
            ch101: batch[1]?.payloadMean ?? null,
            ch102: batch[2]?.payloadMean ?? null,
            ch103: batch[3]?.payloadMean ?? null,
            anomalyScore: null,
            healthPct: 100,
          },
        ].slice(-MAX_CHART_POINTS)
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [connectionState, previewStreamEnabled, streamPaused]);

  const executeSimulationCommand = useCallback(
    async (label: string, endpoint: string, action: () => Promise<unknown>) => {
      setPendingCommand(label);
      try {
        await action();
        const now = new Date().toISOString();
        setCommandFeedback({
          ok: true,
          message: `${label} dispatched successfully to ${endpoint}`,
          timestamp: now,
        });
        appendLog('POST', endpoint, true, 200, `${label} acknowledged`);
        await pollBackend();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Simulation command failed';
        const statusCode = err instanceof ApiClientError ? err.statusCode : null;
        setCommandFeedback({
          ok: false,
          message,
          timestamp: new Date().toISOString(),
        });
        appendLog('POST', endpoint, false, statusCode, message);
      } finally {
        setPendingCommand(null);
      }
    },
    [appendLog, pollBackend]
  );

  const sendStartSimulation = useCallback(async () => {
    await executeSimulationCommand('Start Simulation', '/api/simulation/start', () =>
      postSimulationStart(apiBaseUrl, { speed: simulationSpeed })
    );
  }, [apiBaseUrl, executeSimulationCommand, simulationSpeed]);

  const sendPauseSimulation = useCallback(async () => {
    await executeSimulationCommand('Pause Simulation', '/api/simulation/pause', () =>
      postSimulationPause(apiBaseUrl)
    );
  }, [apiBaseUrl, executeSimulationCommand]);

  const sendResetSimulation = useCallback(async () => {
    await executeSimulationCommand('Reset Simulation', '/api/simulation/reset', () =>
      postSimulationReset(apiBaseUrl)
    );
  }, [apiBaseUrl, executeSimulationCommand]);

  const sendSimulationMode = useCallback(
    async (mode: SimulationMode) => {
      await executeSimulationCommand(`Set Mode: ${mode}`, '/api/simulation/mode', () =>
        postSimulationMode(apiBaseUrl, mode, simulationSpeed)
      );
    },
    [apiBaseUrl, executeSimulationCommand, simulationSpeed]
  );

  const effectiveStatus: SystemStatusResponse | null = useMemo(() => {
    if (status) return status;
    if (!previewStreamEnabled) return null;
    const simState: SimulationRunState = streamPaused ? 'PAUSED' : 'IDLE';
    return {
      systemConnected: false,
      simulationState: simState,
      simulationMode: 'NORMAL',
      simulationSpeed,
      simulationDurationSec: 0,
      vehicleHealthPct: 100,
      activeCanChannels: 4,
      messagesReceived: previewMessageCount,
      activeAlerts: 0,
      selectedModel: 'Awaiting Backend',
      timestamp: new Date().toISOString(),
    };
  }, [previewMessageCount, previewStreamEnabled, simulationSpeed, status, streamPaused]);

  const channelSummaries = useMemo(
    () =>
      computeChannelSummaries(
        messages,
        connectionState === 'connected' || previewStreamEnabled
      ),
    [connectionState, messages, previewStreamEnabled]
  );

  return {
    apiBaseUrl,
    setApiBaseUrl,
    connectionState,
    lastApiError,
    lastSuccessfulSync,
    previewStreamEnabled,
    setPreviewStreamEnabled,
    streamPaused,
    setStreamPaused,
    status: effectiveStatus,
    messages,
    chartHistory,
    channelSummaries,
    prediction,
    metricsArtifacts,
    metricsError,
    alerts,
    commandLogs,
    pendingCommand,
    commandFeedback,
    simulationSpeed,
    setSimulationSpeed,
    testAndSyncNow,
    refreshMetrics,
    sendStartSimulation,
    sendPauseSimulation,
    sendResetSimulation,
    sendSimulationMode,
  };
}
