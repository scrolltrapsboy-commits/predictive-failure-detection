import { CAN_CHANNELS, CAN_CHANNEL_LIST } from '../data/mark24Metrics';
import {
  BackendMetricsArtifacts,
  CanChannelId,
  CanMessage,
  ChannelTelemetrySummary,
  ClassProbabilities,
  ModelPrediction,
  OperatingCondition,
  SimulationMode,
  SimulationRunState,
  SystemStatusResponse,
} from '../types/telemetry';

/**
 * Normalizes a configured API base URL by trimming whitespace and trailing slashes.
 */
export function normalizeApiBaseUrl(rawUrl: string | undefined | null): string {
  const trimmed = (rawUrl ?? '').trim();
  if (!trimmed) {
    return '';
  }
  return trimmed.replace(/\/+$/, '');
}

/**
 * Builds a complete endpoint URL from base URL and path.
 */
export function buildApiUrl(baseUrl: string, path: string): string {
  const cleanBase = normalizeApiBaseUrl(baseUrl);
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${cleanBase}${cleanPath}`;
}

/**
 * Normalizes a CAN ID value into canonical hex format ('0x100'..'0x103') when recognized.
 */
export function normalizeCanId(rawId: unknown): CanChannelId {
  if (typeof rawId === 'number' && Number.isFinite(rawId)) {
    const hex = `0x${rawId.toString(16).toLowerCase()}`;
    if (hex in CAN_CHANNELS) return hex as CanChannelId;
  }
  if (typeof rawId === 'string') {
    const cleaned = rawId.trim().toLowerCase();
    const withPrefix = cleaned.startsWith('0x') ? cleaned : `0x${cleaned}`;
    if (withPrefix in CAN_CHANNELS) return withPrefix as CanChannelId;
  }
  return '0x100';
}

export function normalizeCondition(raw: unknown): OperatingCondition {
  const value = String(raw ?? '').trim().toUpperCase();
  if (value === 'CRITICAL' || value === 'SEVERE' || value === 'SEVERE_ABNORMALITY' || value === '2') {
    return 'CRITICAL';
  }
  if (value === 'WARNING' || value === 'EARLY_DEGRADATION' || value === 'DEGRADED' || value === '1') {
    return 'WARNING';
  }
  return 'NORMAL';
}

export function normalizeSimulationMode(raw: unknown): SimulationMode {
  const value = String(raw ?? '').trim().toUpperCase();
  if (value === 'SEVERE_ABNORMALITY' || value === 'CRITICAL') return 'SEVERE_ABNORMALITY';
  if (value === 'EARLY_DEGRADATION' || value === 'WARNING') return 'EARLY_DEGRADATION';
  return 'NORMAL';
}

export function normalizeSimulationState(raw: unknown): SimulationRunState {
  const value = String(raw ?? '').trim().toUpperCase();
  if (value === 'RUNNING' || value === 'ACTIVE' || value === 'TRUE') return 'RUNNING';
  if (value === 'PAUSED') return 'PAUSED';
  if (value === 'STOPPED') return 'STOPPED';
  return 'IDLE';
}

function toFiniteNumber(val: unknown, fallback: number | null = null): number | null {
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  if (typeof val === 'string' && val.trim() !== '') {
    const parsed = Number(val);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

/**
 * Formats numeric payload array or hex string into space-separated uppercase hex bytes.
 */
export function formatPayloadHex(payload: unknown): { hex: string; values: number[]; mean: number } {
  if (Array.isArray(payload)) {
    const nums = payload.map((item) => {
      const n = Number(item);
      return Number.isFinite(n) ? Math.max(0, Math.min(255, Math.round(n))) : 0;
    });
    const hex = nums.map((n) => n.toString(16).toUpperCase().padStart(2, '0')).join(' ');
    const mean = nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
    return { hex: hex || '00 00 00 00', values: nums, mean: Number(mean.toFixed(2)) };
  }

  if (typeof payload === 'string') {
    const tokens = payload
      .trim()
      .replace(/0x/gi, '')
      .split(/[\s,:-]+/)
      .filter(Boolean);
    const nums = tokens
      .map((t) => parseInt(t, 16))
      .filter((n) => Number.isFinite(n) && n >= 0 && n <= 255);
    if (nums.length > 0) {
      const hex = nums.map((n) => n.toString(16).toUpperCase().padStart(2, '0')).join(' ');
      const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
      return { hex, values: nums, mean: Number(mean.toFixed(2)) };
    }
    return { hex: payload.trim().toUpperCase() || '00', values: [], mean: 0 };
  }

  return { hex: '00 00 00 00', values: [0, 0, 0, 0], mean: 0 };
}

/**
 * Parses GET /api/status payloads from FastAPI.
 */
export function parseStatusResponse(raw: unknown): SystemStatusResponse {
  const data = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const simObj =
    data.simulation && typeof data.simulation === 'object'
      ? (data.simulation as Record<string, unknown>)
      : data;

  const isRunningFlag = simObj.running ?? simObj.is_running;
  const rawState =
    simObj.state ??
    simObj.status ??
    simObj.simulation_state ??
    (typeof isRunningFlag === 'boolean' ? (isRunningFlag ? 'RUNNING' : 'PAUSED') : 'IDLE');

  return {
    systemConnected: true,
    simulationState: normalizeSimulationState(rawState),
    simulationMode: normalizeSimulationMode(simObj.mode ?? simObj.simulation_mode ?? data.mode),
    simulationSpeed: toFiniteNumber(simObj.speed ?? simObj.simulation_speed ?? data.speed, 1) ?? 1,
    simulationDurationSec:
      toFiniteNumber(
        simObj.duration_sec ?? simObj.duration ?? simObj.elapsed_seconds ?? data.duration_sec,
        0
      ) ?? 0,
    vehicleHealthPct: toFiniteNumber(
      data.vehicle_health ?? data.vehicleHealth ?? data.health_pct ?? data.health,
      null
    ),
    activeCanChannels:
      toFiniteNumber(data.active_can_channels ?? data.activeChannels ?? data.channels_active, 4) ??
      4,
    messagesReceived:
      toFiniteNumber(data.messages_received ?? data.messagesReceived ?? data.total_messages, 0) ?? 0,
    activeAlerts:
      toFiniteNumber(data.active_alerts ?? data.activeAlerts ?? data.alerts_count, 0) ?? 0,
    selectedModel: String(data.selected_model ?? data.model ?? 'Mark 24 Random Forest'),
    timestamp: String(data.timestamp ?? new Date().toISOString()),
  };
}

/**
 * Parses GET /api/telemetry payloads from FastAPI.
 */
export function parseTelemetryResponse(raw: unknown): CanMessage[] {
  const list = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object'
      ? ((raw as Record<string, unknown>).messages ??
          (raw as Record<string, unknown>).telemetry ??
          (raw as Record<string, unknown>).data ??
          [])
      : [];

  if (!Array.isArray(list)) return [];

  return list.map((item, idx) => {
    const row = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
    const canId = normalizeCanId(row.can_id ?? row.canId ?? row.id_hex);
    const channelConfig = CAN_CHANNELS[canId];
    const parsedPayload = formatPayloadHex(row.payload ?? row.data ?? row.bytes);
    const explicitMean = toFiniteNumber(row.payload_mean ?? row.payloadMean, null);
    const timestamp = String(row.timestamp ?? row.ts ?? new Date().toISOString());

    return {
      id: String(row.id ?? `${timestamp}-${canId}-${idx}`),
      timestamp,
      canId,
      channelName: String(row.channel_name ?? row.channelName ?? channelConfig.name),
      payloadHex: parsedPayload.hex,
      payloadValues: parsedPayload.values,
      payloadMean: explicitMean !== null ? explicitMean : parsedPayload.mean,
      intervalMs:
        toFiniteNumber(row.interval_ms ?? row.message_interval ?? row.intervalMs, null) ??
        channelConfig.nominalIntervalMs,
      status: normalizeCondition(row.status ?? row.severity ?? row.condition),
      source: 'backend',
    };
  });
}

function parseProbabilities(raw: unknown): ClassProbabilities | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const normal = toFiniteNumber(obj.NORMAL ?? obj.normal ?? obj.Normal, null);
  const warning = toFiniteNumber(obj.WARNING ?? obj.warning ?? obj.Warning, null);
  const critical = toFiniteNumber(obj.CRITICAL ?? obj.critical ?? obj.Critical, null);

  if (normal === null && warning === null && critical === null) return null;
  return {
    NORMAL: normal ?? 0,
    WARNING: warning ?? 0,
    CRITICAL: critical ?? 0,
  };
}

/**
 * Parses GET /api/prediction payloads from FastAPI, preserving separation between
 * Isolation Forest anomaly score and Random Forest classification probabilities.
 */
export function parsePredictionResponse(raw: unknown): ModelPrediction {
  const data = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

  const ifObj =
    data.isolation_forest && typeof data.isolation_forest === 'object'
      ? (data.isolation_forest as Record<string, unknown>)
      : {};
  const rfObj =
    data.random_forest && typeof data.random_forest === 'object'
      ? (data.random_forest as Record<string, unknown>)
      : {};

  const anomalyScore = toFiniteNumber(
    ifObj.anomaly_score ??
      ifObj.score ??
      data.isolation_forest_score ??
      data.anomaly_score ??
      data.anomalyScore,
    null
  );

  const warningThreshold = toFiniteNumber(
    ifObj.warning_threshold ?? data.warning_threshold ?? data.warningThreshold,
    null
  );
  const criticalThreshold = toFiniteNumber(
    ifObj.critical_threshold ?? data.critical_threshold ?? data.criticalThreshold,
    null
  );

  const rfProbabilities = parseProbabilities(
    rfObj.probabilities ??
      rfObj.class_probabilities ??
      data.random_forest_probabilities ??
      data.class_probabilities ??
      data.probabilities
  );

  const predictedCondition = normalizeCondition(
    data.predicted_condition ??
      data.predictedCondition ??
      data.condition ??
      data.prediction ??
      rfObj.prediction
  );

  return {
    selectedModel: String(
      data.selected_model ?? data.selectedModel ?? data.model ?? 'Mark 24 Random Forest'
    ),
    predictedCondition,
    isolationForestAnomalyScore: anomalyScore,
    isolationForestCondition:
      ifObj.condition !== undefined ? normalizeCondition(ifObj.condition) : null,
    warningThreshold,
    criticalThreshold,
    randomForestProbabilities: rfProbabilities,
    randomForestCondition:
      rfObj.condition !== undefined || rfObj.prediction !== undefined
        ? normalizeCondition(rfObj.condition ?? rfObj.prediction)
        : null,
    affectedChannel:
      data.affected_channel ?? data.affectedChannel ?? data.can_id
        ? normalizeCanId(data.affected_channel ?? data.affectedChannel ?? data.can_id)
        : null,
    detectionTimestamp: String(
      data.detection_timestamp ?? data.detectionTimestamp ?? data.timestamp ?? new Date().toISOString()
    ),
  };
}

/**
 * Parses GET /api/metrics payloads for Mark 24 held-out evaluation artifacts.
 */
export function parseMetricsResponse(raw: unknown): BackendMetricsArtifacts {
  if (!raw || typeof raw !== 'object') return {};
  const data = raw as Record<string, unknown>;
  return data as unknown as BackendMetricsArtifacts;
}

/**
 * Filters CAN messages by optional CAN ID and severity condition.
 */
export function filterTelemetryMessages(
  messages: CanMessage[],
  canIdFilter: CanChannelId | 'ALL',
  severityFilter: OperatingCondition | 'ALL'
): CanMessage[] {
  return messages.filter((msg) => {
    const matchesChannel = canIdFilter === 'ALL' || msg.canId === canIdFilter;
    const matchesSeverity = severityFilter === 'ALL' || msg.status === severityFilter;
    return matchesChannel && matchesSeverity;
  });
}

/**
 * Aggregates per-channel connection status, message frequency, payload mean, and anomaly status.
 */
export function computeChannelSummaries(
  messages: CanMessage[],
  isConnected: boolean
): ChannelTelemetrySummary[] {
  return CAN_CHANNEL_LIST.map((channel) => {
    const channelMsgs = messages.filter((m) => m.canId === channel.id);
    if (channelMsgs.length === 0) {
      return {
        canId: channel.id,
        channelName: channel.name,
        subsystem: channel.subsystem,
        connected: isConnected,
        frequencyHz: null,
        payloadMean: null,
        status: isConnected ? 'NORMAL' : 'OFFLINE',
        lastTimestamp: null,
      };
    }

    const recent = channelMsgs.slice(0, 12);
    const avgInterval =
      recent.reduce((acc, m) => acc + (m.intervalMs > 0 ? m.intervalMs : channel.nominalIntervalMs), 0) /
      recent.length;
    const frequencyHz = avgInterval > 0 ? Number((1000 / avgInterval).toFixed(1)) : channel.nominalFrequencyHz;
    const payloadMean = Number(
      (recent.reduce((acc, m) => acc + m.payloadMean, 0) / recent.length).toFixed(2)
    );

    const latest = recent[0];
    let worstStatus: OperatingCondition = latest.status;
    if (recent.slice(0, 3).some((m) => m.status === 'CRITICAL')) {
      worstStatus = 'CRITICAL';
    } else if (recent.slice(0, 3).some((m) => m.status === 'WARNING')) {
      worstStatus = 'WARNING';
    }

    return {
      canId: channel.id,
      channelName: channel.name,
      subsystem: channel.subsystem,
      connected: true,
      frequencyHz,
      payloadMean,
      status: worstStatus,
      lastTimestamp: latest.timestamp,
    };
  });
}

/**
 * Formats seconds into HH:MM:SS tabular duration string.
 */
export function formatDurationSeconds(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  return [hrs, mins, secs].map((n) => String(n).padStart(2, '0')).join(':');
}

/**
 * Formats ISO timestamps concisely for telemetry tables (HH:MM:SS.mmm).
 */
export function formatTelemetryTime(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) return isoTimestamp;
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  const ms = String(date.getMilliseconds()).padStart(3, '0');
  return `${hh}:${mm}:${ss}.${ms}`;
}

/**
 * Generates deterministic synthetic CAN frames strictly for offline preview stream visualization
 * when the FastAPI backend is not connected. Does NOT run ML inference or compute fake anomaly scores.
 */
export function generatePreviewCanBatch(tickIndex: number): CanMessage[] {
  const now = Date.now();
  return CAN_CHANNEL_LIST.map((channel, idx) => {
    const phase = (tickIndex + idx * 3) * 0.45;
    const baseVal = 95 + idx * 18 + Math.round(Math.sin(phase) * 12);
    const bytes = [
      Math.max(10, Math.min(245, baseVal)),
      Math.max(10, Math.min(245, baseVal + Math.round(Math.cos(phase * 0.7) * 8))),
      Math.max(10, Math.min(245, 64 + idx * 12 + ((tickIndex * 7 + idx) % 19))),
      Math.max(10, Math.min(245, 128 + Math.round(Math.sin(phase * 1.3) * 6))),
    ];
    const parsed = formatPayloadHex(bytes);
    const jitter = Math.round(Math.sin(phase * 0.9) * 2);
    return {
      id: `preview-${tickIndex}-${channel.id}`,
      timestamp: new Date(now + idx * 4).toISOString(),
      canId: channel.id,
      channelName: channel.name,
      payloadHex: parsed.hex,
      payloadValues: parsed.values,
      payloadMean: parsed.mean,
      intervalMs: Math.max(10, channel.nominalIntervalMs + jitter),
      status: 'NORMAL',
      source: 'preview',
    };
  });
}
