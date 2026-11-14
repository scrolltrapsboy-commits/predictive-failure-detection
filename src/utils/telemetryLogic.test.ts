import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildApiUrl,
  computeChannelSummaries,
  filterTelemetryMessages,
  formatDurationSeconds,
  formatPayloadHex,
  normalizeApiBaseUrl,
  normalizeCanId,
  parsePredictionResponse,
  parseStatusResponse,
  parseTelemetryResponse,
} from './telemetryLogic';

test('normalizeApiBaseUrl and buildApiUrl handle trailing slashes and defaults', () => {
  assert.equal(normalizeApiBaseUrl(undefined), 'http://localhost:8000');
  assert.equal(normalizeApiBaseUrl('  https://api.example.com/// '), 'https://api.example.com');
  assert.equal(buildApiUrl('https://api.example.com/', '/api/status'), 'https://api.example.com/api/status');
  assert.equal(buildApiUrl('http://localhost:8000', 'api/prediction'), 'http://localhost:8000/api/prediction');
});

test('normalizeCanId handles numeric and hex string inputs', () => {
  assert.equal(normalizeCanId('0x101'), '0x101');
  assert.equal(normalizeCanId('102'), '0x102');
  assert.equal(normalizeCanId(0x103), '0x103');
  assert.equal(normalizeCanId('unknown'), '0x100');
});

test('formatPayloadHex formats byte arrays and hex strings cleanly', () => {
  const fromBytes = formatPayloadHex([15, 160, 255, 0]);
  assert.equal(fromBytes.hex, '0F A0 FF 00');
  assert.equal(fromBytes.mean, 107.5);

  const fromStr = formatPayloadHex('0a 1b 2c');
  assert.equal(fromStr.hex, '0A 1B 2C');
  assert.deepEqual(fromStr.values, [10, 27, 44]);
});

test('parseStatusResponse normalizes FastAPI status fields', () => {
  const status = parseStatusResponse({
    simulation_state: 'RUNNING',
    simulation_mode: 'EARLY_DEGRADATION',
    speed: 2,
    duration_sec: 125,
    vehicle_health: 84.5,
    active_can_channels: 4,
    messages_received: 1200,
    active_alerts: 2,
    selected_model: 'Random Forest (Mark 24)',
  });

  assert.equal(status.systemConnected, true);
  assert.equal(status.simulationState, 'RUNNING');
  assert.equal(status.simulationMode, 'EARLY_DEGRADATION');
  assert.equal(status.simulationSpeed, 2);
  assert.equal(status.simulationDurationSec, 125);
  assert.equal(status.vehicleHealthPct, 84.5);
  assert.equal(status.messagesReceived, 1200);
});

test('parsePredictionResponse keeps Isolation Forest anomaly score separate from Random Forest probabilities', () => {
  const prediction = parsePredictionResponse({
    selected_model: 'Mark 24 Ensemble',
    predicted_condition: 'WARNING',
    isolation_forest: {
      anomaly_score: -0.142,
      warning_threshold: -0.05,
      critical_threshold: -0.25,
      condition: 'WARNING',
    },
    random_forest: {
      condition: 'WARNING',
      probabilities: {
        NORMAL: 0.12,
        WARNING: 0.81,
        CRITICAL: 0.07,
      },
    },
    affected_channel: '0x102',
    detection_timestamp: '2026-11-13T18:30:00Z',
  });

  assert.equal(prediction.predictedCondition, 'WARNING');
  assert.equal(prediction.isolationForestAnomalyScore, -0.142);
  assert.equal(prediction.warningThreshold, -0.05);
  assert.equal(prediction.criticalThreshold, -0.25);
  assert.deepEqual(prediction.randomForestProbabilities, {
    NORMAL: 0.12,
    WARNING: 0.81,
    CRITICAL: 0.07,
  });
  assert.equal(prediction.affectedChannel, '0x102');
});

test('filterTelemetryMessages and computeChannelSummaries aggregate properly', () => {
  const parsed = parseTelemetryResponse([
    { can_id: '0x100', payload: [100, 100, 100, 100], interval_ms: 50, status: 'NORMAL' },
    { can_id: '0x101', payload: [200, 210, 220, 230], interval_ms: 80, status: 'WARNING' },
    { can_id: '0x102', payload: [250, 255, 255, 250], interval_ms: 100, status: 'CRITICAL' },
  ]);

  assert.equal(filterTelemetryMessages(parsed, '0x101', 'ALL').length, 1);
  assert.equal(filterTelemetryMessages(parsed, 'ALL', 'CRITICAL').length, 1);

  const summaries = computeChannelSummaries(parsed, true);
  assert.equal(summaries.length, 4);
  assert.equal(summaries[1].status, 'WARNING');
  assert.equal(summaries[1].frequencyHz, 12.5);
  assert.equal(summaries[2].status, 'CRITICAL');
});

test('formatDurationSeconds renders HH:MM:SS', () => {
  assert.equal(formatDurationSeconds(0), '00:00:00');
  assert.equal(formatDurationSeconds(3665), '01:01:05');
});
