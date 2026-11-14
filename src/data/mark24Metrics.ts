import { CanChannelConfig, CanChannelId } from '../types/telemetry';

export const CAN_CHANNELS: Record<CanChannelId, CanChannelConfig> = {
  '0x100': {
    id: '0x100',
    name: 'Electronic Channel A',
    subsystem: 'Powertrain & Voltage Bus',
    nominalFrequencyHz: 20,
    nominalIntervalMs: 50,
    unit: 'V',
  },
  '0x101': {
    id: '0x101',
    name: 'Electronic Channel B',
    subsystem: 'Thermal & Coolant Sensors',
    nominalFrequencyHz: 20,
    nominalIntervalMs: 50,
    unit: '°C',
  },
  '0x102': {
    id: '0x102',
    name: 'Electronic Channel C',
    subsystem: 'Actuator & Turret Bus',
    nominalFrequencyHz: 25,
    nominalIntervalMs: 40,
    unit: 'mA',
  },
  '0x103': {
    id: '0x103',
    name: 'Electronic Channel D',
    subsystem: 'Chassis IMU & Diagnostics',
    nominalFrequencyHz: 25,
    nominalIntervalMs: 40,
    unit: 'Hz',
  },
};

export const CAN_CHANNEL_LIST: CanChannelConfig[] = [
  CAN_CHANNELS['0x100'],
  CAN_CHANNELS['0x101'],
  CAN_CHANNELS['0x102'],
  CAN_CHANNELS['0x103'],
];

/**
 * Authoritative Mark 24 held-out test results supplied in the Project 18 specification.
 * Do not modify or fabricate additional evaluation scores.
 */
export interface Mark24BenchmarkRow {
  metric: string;
  isolationForest: number;
  randomForest: number;
  unit: '%';
  description: string;
}

export const MARK_24_HELD_OUT_METRICS: Mark24BenchmarkRow[] = [
  {
    metric: 'Accuracy',
    isolationForest: 76.11,
    randomForest: 99.44,
    unit: '%',
    description: 'Overall classification accuracy across held-out synthetic CAN frames.',
  },
  {
    metric: 'Macro F1',
    isolationForest: 75.97,
    randomForest: 99.44,
    unit: '%',
    description: 'Unweighted mean F1 score across Normal, Warning, and Critical classes.',
  },
  {
    metric: 'Warning Recall',
    isolationForest: 53.33,
    randomForest: 100.0,
    unit: '%',
    description: 'Sensitivity to early degradation states before critical failure occurs.',
  },
  {
    metric: 'Critical Recall',
    isolationForest: 86.67,
    randomForest: 100.0,
    unit: '%',
    description: 'Sensitivity to severe signal anomalies and bus timing disruptions.',
  },
];

export const SYNTHETIC_VALIDATION_NOTE =
  'Note: These results were obtained using synthetic CAN telemetry and do not represent validation on real military vehicle hardware.';

export interface ArchitectureStage {
  id: string;
  order: number;
  title: string;
  subtitle: string;
  summary: string;
  inputs: string;
  processing: string;
  outputs: string;
  implementation: string;
}

export const ARCHITECTURE_STAGES: ArchitectureStage[] = [
  {
    id: 'can-simulation',
    order: 1,
    title: 'CAN Bus Simulation',
    subtitle: 'Synthetic Frame Generation',
    summary:
      'Emulates four vehicle electronic channels (0x100–0x103) under Normal, Early Degradation, and Severe Abnormality operating profiles.',
    inputs: 'Simulation mode command, speed multiplier, channel baseline parameters',
    processing:
      'Injects controlled sensor drift, payload variance, and inter-frame timing jitter across channels.',
    outputs: 'Raw timestamped CAN frames (ID, 8-byte hex payload, interval ms)',
    implementation: 'Python CAN Bus Simulator',
  },
  {
    id: 'data-ingestion',
    order: 2,
    title: 'Data Ingestion',
    subtitle: 'Stream Buffering & Validation',
    summary:
      'Collects incoming simulated CAN frames into sliding time windows while validating arbitration IDs and frame timing continuity.',
    inputs: 'Continuous stream of raw CAN frames from channels 0x100–0x103',
    processing:
      'Validates frame schema, normalizes timestamps, and buffers rolling diagnostic windows.',
    outputs: 'Structured frame batches queued for preprocessing',
    implementation: 'FastAPI / NumPy Stream Buffer',
  },
  {
    id: 'preprocessing',
    order: 3,
    title: 'Preprocessing',
    subtitle: 'Decoding & Normalization',
    summary:
      'Decodes raw hexadecimal payloads into physical channel signals, handles missing intervals, and aligns multi-channel windows.',
    inputs: 'Validated CAN frame batches',
    processing:
      'Parses payload bytes, computes inter-arrival delta times, and scales signal vectors.',
    outputs: 'Clean numeric telemetry matrices indexed by CAN ID and timestamp',
    implementation: 'Pandas & NumPy',
  },
  {
    id: 'feature-engineering',
    order: 4,
    title: 'Feature Engineering',
    subtitle: 'Statistical & Temporal Extraction',
    summary:
      'Computes rolling statistical and bus-timing descriptors that capture subtle sensor drift and communication irregularities.',
    inputs: 'Normalized multi-channel signal windows',
    processing:
      'Extracts rolling mean, variance, rate-of-change, payload entropy, and inter-frame interval jitter.',
    outputs: 'Feature vectors formatted for Mark 24 ML inference',
    implementation: 'Pandas / Scikit-learn Pipelines',
  },
  {
    id: 'machine-learning',
    order: 5,
    title: 'Machine Learning',
    subtitle: 'Mark 24 Dual-Model Inference',
    summary:
      'Runs unsupervised anomaly scoring via Isolation Forest alongside supervised multi-class classification via Random Forest.',
    inputs: 'Engineered telemetry feature vectors',
    processing:
      'Isolation Forest computes continuous anomaly score; Random Forest outputs class probabilities for Normal, Warning, and Critical.',
    outputs: 'Anomaly score + calibrated class probability distribution',
    implementation: 'Scikit-learn Mark 24 Models',
  },
  {
    id: 'severity-classification',
    order: 6,
    title: 'Severity Classification',
    subtitle: 'Operating Condition Mapping',
    summary:
      'Evaluates model outputs against calibrated warning and critical thresholds to assign the vehicle operating condition.',
    inputs: 'Isolation Forest score, threshold bounds, Random Forest class probabilities',
    processing:
      'Maps telemetry state into NORMAL, WARNING, or CRITICAL and identifies the primary affected CAN channel.',
    outputs: 'Unified diagnostic prediction payload via GET /api/prediction',
    implementation: 'FastAPI Diagnostic Engine',
  },
  {
    id: 'alert-generation',
    order: 7,
    title: 'Alert Generation',
    subtitle: 'Operator Notification & Logging',
    summary:
      'Dispatches actionable warning and critical alerts to the monitoring dashboard with timestamps and channel attribution.',
    inputs: 'Classified operating condition and affected CAN ID',
    processing:
      'Emits deduplicated alert events, updates vehicle health indicators, and persists recent alert history.',
    outputs: 'Live operator alerts, health telemetry, and audit trail',
    implementation: 'FastAPI REST API & React Console',
  },
];

export const TECHNOLOGY_STACK = [
  { name: 'Python', role: 'Core backend runtime and telemetry simulation' },
  { name: 'CAN Bus Simulation', role: 'Synthetic multi-channel frame generator (0x100–0x103)' },
  { name: 'NumPy', role: 'Vectorized signal processing and numerical payload math' },
  { name: 'Pandas', role: 'Rolling time-window aggregation and feature preparation' },
  { name: 'Scikit-learn', role: 'Mark 24 model training, pipelines, and evaluation' },
  { name: 'Isolation Forest', role: 'Unsupervised anomaly detection scoring' },
  { name: 'Random Forest', role: 'Supervised Normal / Warning / Critical classification' },
  { name: 'FastAPI', role: 'Low-latency REST API serving predictions and simulation control' },
  { name: 'React', role: 'Desktop-first diagnostics dashboard and interactive visualizations' },
];
