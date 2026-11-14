export type NavSectionId =
  | 'overview'
  | 'live-can'
  | 'fault-detection'
  | 'simulation'
  | 'analytics'
  | 'architecture'
  | 'about';

export type OperatingCondition = 'NORMAL' | 'WARNING' | 'CRITICAL';

export type SimulationMode = 'NORMAL' | 'EARLY_DEGRADATION' | 'SEVERE_ABNORMALITY';

export type SimulationRunState = 'RUNNING' | 'PAUSED' | 'IDLE' | 'STOPPED';

export type ConnectionState = 'connected' | 'connecting' | 'disconnected' | 'error';

export type CanChannelId = '0x100' | '0x101' | '0x102' | '0x103';

export interface CanChannelConfig {
  id: CanChannelId;
  name: string;
  subsystem: string;
  nominalFrequencyHz: number;
  nominalIntervalMs: number;
  unit: string;
}

export interface CanMessage {
  id: string;
  timestamp: string;
  canId: CanChannelId;
  channelName: string;
  payloadHex: string;
  payloadValues: number[];
  payloadMean: number;
  intervalMs: number;
  status: OperatingCondition;
  source: 'backend' | 'preview';
}

export interface ChannelTelemetrySummary {
  canId: CanChannelId;
  channelName: string;
  subsystem: string;
  connected: boolean;
  frequencyHz: number | null;
  payloadMean: number | null;
  status: OperatingCondition | 'OFFLINE';
  lastTimestamp: string | null;
}

export interface SystemStatusResponse {
  systemConnected: boolean;
  simulationState: SimulationRunState;
  simulationMode: SimulationMode;
  simulationSpeed: number;
  simulationDurationSec: number;
  vehicleHealthPct: number | null;
  activeCanChannels: number;
  messagesReceived: number;
  activeAlerts: number;
  selectedModel: string;
  timestamp: string;
}

export interface ClassProbabilities {
  NORMAL: number;
  WARNING: number;
  CRITICAL: number;
}

export interface ModelPrediction {
  selectedModel: string;
  predictedCondition: OperatingCondition;
  isolationForestAnomalyScore: number | null;
  isolationForestCondition: OperatingCondition | null;
  warningThreshold: number | null;
  criticalThreshold: number | null;
  randomForestProbabilities: ClassProbabilities | null;
  randomForestCondition: OperatingCondition | null;
  affectedChannel: CanChannelId | string | null;
  detectionTimestamp: string;
}

export interface AlertRecord {
  id: string;
  timestamp: string;
  severity: 'WARNING' | 'CRITICAL';
  channel: string;
  title: string;
  detail: string;
  anomalyScore: number | null;
}

export interface TelemetryChartPoint {
  timeLabel: string;
  timestamp: string;
  ch100: number | null;
  ch101: number | null;
  ch102: number | null;
  ch103: number | null;
  anomalyScore: number | null;
  healthPct: number | null;
}

export interface ConfusionMatrixData {
  labels: ['NORMAL', 'WARNING', 'CRITICAL'];
  matrix: number[][];
}

export interface PerClassMetric {
  className: 'NORMAL' | 'WARNING' | 'CRITICAL';
  precision: number;
  recall: number;
  f1: number;
  support?: number;
}

export interface FeatureImportanceItem {
  feature: string;
  importance: number;
}

export interface PredictionDistributionItem {
  label: OperatingCondition;
  isolationForestCount: number;
  randomForestCount: number;
}

export interface BackendMetricsArtifacts {
  isolationForest?: {
    accuracy?: number;
    macroF1?: number;
    warningRecall?: number;
    criticalRecall?: number;
    confusionMatrix?: ConfusionMatrixData;
    perClass?: PerClassMetric[];
  };
  randomForest?: {
    accuracy?: number;
    macroF1?: number;
    warningRecall?: number;
    criticalRecall?: number;
    confusionMatrix?: ConfusionMatrixData;
    perClass?: PerClassMetric[];
  };
  featureImportance?: FeatureImportanceItem[];
  predictionDistribution?: PredictionDistributionItem[];
  datasetNote?: string;
}

export interface ApiCommandLogEntry {
  id: string;
  timestamp: string;
  method: 'GET' | 'POST';
  endpoint: string;
  ok: boolean;
  statusCode: number | null;
  summary: string;
}
