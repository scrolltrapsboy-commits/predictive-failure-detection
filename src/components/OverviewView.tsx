import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Radio,
  ServerCrash,
  ShieldAlert,
  TrendingUp,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertRecord,
  ChannelTelemetrySummary,
  ConnectionState,
  ModelPrediction,
  SystemStatusResponse,
  TelemetryChartPoint,
} from '../types/telemetry';
import { formatTelemetryTime } from '../utils/telemetryLogic';

interface OverviewViewProps {
  connectionState: ConnectionState;
  lastApiError: string | null;
  apiBaseUrl: string;
  previewStreamEnabled: boolean;
  status: SystemStatusResponse | null;
  channelSummaries: ChannelTelemetrySummary[];
  chartHistory: TelemetryChartPoint[];
  prediction: ModelPrediction | null;
  alerts: AlertRecord[];
  onOpenConnectionModal: () => void;
  onNavigateToSimulation: () => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  connectionState,
  lastApiError,
  apiBaseUrl,
  previewStreamEnabled,
  status,
  channelSummaries,
  chartHistory,
  prediction,
  alerts,
  onOpenConnectionModal,
  onNavigateToSimulation,
}) => {
  const isBackendConnected = connectionState === 'connected';
  const healthValue = status?.vehicleHealthPct ?? (isBackendConnected ? 100 : null);
  const activeChannels = status?.activeCanChannels ?? 4;
  const messagesReceived = status?.messagesReceived ?? 0;
  const activeAlertsCount = status?.activeAlerts ?? alerts.length;

  const hasAnomalySeries = chartHistory.some((p) => p.anomalyScore !== null);

  return (
    <div className="space-y-6">
      {/* Page Title & Data Source Notice */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-100">
            Vehicle Electronics Overview
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time CAN bus diagnostics and Mark 24 anomaly monitoring across four electronic channels.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onNavigateToSimulation}
            className="px-4 py-2 rounded-md bg-cyan-600 hover:bg-cyan-500 text-xs font-semibold text-white transition-colors whitespace-nowrap shrink-0"
          >
            Open Simulation Control
          </button>
        </div>
      </div>

      {/* Explicit Connection State Banner when Backend is Disconnected */}
      {!isBackendConnected && (
        <div className="rounded-lg bg-[#111824] border border-amber-500/35 px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <ServerCrash className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
            <div className="text-xs leading-relaxed text-slate-300">
              <span className="font-semibold text-amber-300">FastAPI Backend Disconnected</span>
              <span className="text-slate-500 mx-2">·</span>
              <span>Target: </span>
              <code className="text-cyan-300">{apiBaseUrl}</code>
              {previewStreamEnabled && (
                <>
                  <span className="text-slate-500 mx-2">·</span>
                  <span className="text-slate-300">
                    Telemetry waveforms show clearly labeled offline preview CAN frames (ML predictions disabled until backend connects).
                  </span>
                </>
              )}
              {lastApiError && (
                <div className="text-slate-400 mt-1 font-mono truncate max-w-2xl">
                  {lastApiError}
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenConnectionModal}
            className="px-3 py-1.5 rounded-md border border-[#2A3950] bg-[#151E2E] hover:border-cyan-500/40 text-xs font-medium text-slate-200 transition-colors whitespace-nowrap shrink-0 self-start md:self-center"
          >
            Configure Backend
          </button>
        </div>
      )}

      {/* Top 4 Metric Cards */}
      <section aria-label="Primary telemetry metrics" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-lg bg-[#111824] border border-[#1F2B3E] p-5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Vehicle Health</span>
            <span className="font-mono text-[11px] text-slate-500">
              {isBackendConnected ? 'Live' : previewStreamEnabled ? 'Preview' : 'Offline'}
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`text-3xl font-mono font-bold tabular-nums ${
                healthValue === null
                  ? 'text-slate-500'
                  : healthValue >= 85
                    ? 'text-emerald-400'
                    : healthValue >= 60
                      ? 'text-amber-400'
                      : 'text-rose-400'
              }`}
            >
              {healthValue !== null ? `${healthValue.toFixed(0)}%` : '—'}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Condition:{' '}
            <span className="font-mono font-semibold text-slate-200">
              {prediction ? prediction.predictedCondition : isBackendConnected ? 'NORMAL' : 'Awaiting ML'}
            </span>
          </div>
        </div>

        <div className="rounded-lg bg-[#111824] border border-[#1F2B3E] p-5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Active CAN Channels</span>
            <Radio className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="mt-2 text-3xl font-mono font-bold tabular-nums text-slate-100">
            {activeChannels}
          </div>
          <div className="mt-2 text-xs text-slate-400 font-mono">
            0x100 · 0x101 · 0x102 · 0x103
          </div>
        </div>

        <div className="rounded-lg bg-[#111824] border border-[#1F2B3E] p-5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Messages Received</span>
            <TrendingUp className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="mt-2 text-3xl font-mono font-bold tabular-nums text-slate-100">
            {messagesReceived.toLocaleString()}
          </div>
          <div className="mt-2 text-xs text-slate-400">
            {isBackendConnected
              ? 'Frames ingested by FastAPI buffer'
              : previewStreamEnabled
                ? 'Simulated preview frames'
                : 'Stream inactive'}
          </div>
        </div>

        <div className="rounded-lg bg-[#111824] border border-[#1F2B3E] p-5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Active Alerts</span>
            <ShieldAlert
              className={`h-4 w-4 ${activeAlertsCount > 0 ? 'text-amber-400' : 'text-slate-500'}`}
            />
          </div>
          <div
            className={`mt-2 text-3xl font-mono font-bold tabular-nums ${
              activeAlertsCount > 0 ? 'text-amber-400' : 'text-slate-100'
            }`}
          >
            {activeAlertsCount}
          </div>
          <div className="mt-2 text-xs text-slate-400">
            {activeAlertsCount > 0
              ? 'Warning / critical events logged'
              : 'No active fault alerts'}
          </div>
        </div>
      </section>

      {/* Vehicle System Status: Four Electronic Channels */}
      <section aria-label="Vehicle system status" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Cpu className="h-4 w-4 text-cyan-400" />
            <span>Vehicle System Status — CAN Electronic Channels</span>
          </h2>
          <span className="text-xs text-slate-400">
            {isBackendConnected ? 'Backend Telemetry' : previewStreamEnabled ? 'Simulated Preview' : 'Offline'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {channelSummaries.map((ch) => {
            const statusColor =
              ch.status === 'CRITICAL'
                ? 'text-rose-400'
                : ch.status === 'WARNING'
                  ? 'text-amber-400'
                  : ch.status === 'NORMAL'
                    ? 'text-emerald-400'
                    : 'text-slate-500';
            const statusGlyph =
              ch.status === 'CRITICAL'
                ? '✖'
                : ch.status === 'WARNING'
                  ? '▲'
                  : ch.status === 'NORMAL'
                    ? '●'
                    : '○';

            return (
              <div
                key={ch.canId}
                className="rounded-lg bg-[#111824] border border-[#1F2B3E] p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-mono text-xs font-semibold text-cyan-400">
                      CAN ID {ch.canId}
                    </div>
                    <div className="text-sm font-semibold text-slate-100 mt-0.5">
                      {ch.channelName}
                    </div>
                    <div className="text-xs text-slate-400">{ch.subsystem}</div>
                  </div>
                  <span className={`font-mono text-xs font-semibold whitespace-nowrap ${statusColor}`}>
                    {statusGlyph} {ch.status}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#1F2B3E] text-xs">
                  <div>
                    <div className="text-slate-500">Link</div>
                    <div className="font-mono text-slate-200 mt-0.5">
                      {ch.connected ? 'Online' : 'Offline'}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">Freq</div>
                    <div className="font-mono tabular-nums text-slate-200 mt-0.5">
                      {ch.frequencyHz !== null ? `${ch.frequencyHz} Hz` : '—'}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">Mean</div>
                    <div className="font-mono tabular-nums text-slate-200 mt-0.5">
                      {ch.payloadMean !== null ? ch.payloadMean.toFixed(1) : '—'}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Main 2x2 Visualizations */}
      <section aria-label="Telemetry and anomaly charts" className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Chart 1: Real-time Telemetry Line Chart */}
        <div className="rounded-lg bg-[#111824] border border-[#1F2B3E] p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-100">
                Real-Time Channel Payload Mean
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Multi-channel CAN payload baseline across 0x100–0x103
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
              <span className="text-cyan-400">0x100</span>
              <span className="text-sky-400">0x101</span>
              <span className="text-amber-400">0x102</span>
              <span className="text-emerald-400">0x103</span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartHistory} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                <CartesianGrid stroke="#1F2B3E" strokeDasharray="3 3" />
                <XAxis dataKey="timeLabel" stroke="#64748B" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748B" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0D131F',
                    borderColor: '#243248',
                    borderRadius: '6px',
                    fontSize: '12px',
                  }}
                />
                <Line type="monotone" dataKey="ch100" name="0x100 Ch A" stroke="#06B6D4" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="ch101" name="0x101 Ch B" stroke="#38BDF8" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="ch102" name="0x102 Ch C" stroke="#F59E0B" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="ch103" name="0x103 Ch D" stroke="#10B981" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Isolation Forest Anomaly Score Chart */}
        <div className="rounded-lg bg-[#111824] border border-[#1F2B3E] p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-100">
                Isolation Forest Anomaly Score
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Live score returned by FastAPI Mark 24 backend (never simulated in JS)
              </p>
            </div>
            <span className="font-mono text-xs text-slate-300 tabular-nums">
              {prediction?.isolationForestAnomalyScore !== null &&
              prediction?.isolationForestAnomalyScore !== undefined
                ? `Score: ${prediction.isolationForestAnomalyScore.toFixed(4)}`
                : 'Backend Required'}
            </span>
          </div>

          {hasAnomalySeries ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartHistory} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                  <CartesianGrid stroke="#1F2B3E" strokeDasharray="3 3" />
                  <XAxis dataKey="timeLabel" stroke="#64748B" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#64748B" tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0D131F',
                      borderColor: '#243248',
                      borderRadius: '6px',
                      fontSize: '12px',
                    }}
                  />
                  {prediction?.warningThreshold !== null &&
                    prediction?.warningThreshold !== undefined && (
                      <ReferenceLine
                        y={prediction.warningThreshold}
                        stroke="#F59E0B"
                        strokeDasharray="4 4"
                      />
                    )}
                  {prediction?.criticalThreshold !== null &&
                    prediction?.criticalThreshold !== undefined && (
                      <ReferenceLine
                        y={prediction.criticalThreshold}
                        stroke="#EF4444"
                        strokeDasharray="4 4"
                      />
                    )}
                  <Line
                    type="monotone"
                    dataKey="anomalyScore"
                    name="Anomaly Score"
                    stroke="#38BDF8"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 rounded-md bg-[#0A0E17] border border-[#1F2B3E] flex flex-col items-center justify-center p-6 text-center">
              <AlertTriangle className="h-6 w-6 text-amber-400 mb-2" />
              <div className="text-sm font-medium text-slate-200">
                Awaiting FastAPI Mark 24 Anomaly Scores
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-md">
                Anomaly scores are computed exclusively by the trained Mark 24 Isolation Forest model on the Python backend via <code className="text-cyan-300">GET /api/prediction</code>.
              </p>
            </div>
          )}
        </div>

        {/* Chart 3: Vehicle Health Trend */}
        <div className="rounded-lg bg-[#111824] border border-[#1F2B3E] p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-100">
                Vehicle Health Trend
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Composite electronic bus readiness index (0–100%)
              </p>
            </div>
            <span className="font-mono text-xs text-emerald-400 tabular-nums">
              {healthValue !== null ? `${healthValue.toFixed(1)}%` : '—'}
            </span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartHistory} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                <CartesianGrid stroke="#1F2B3E" strokeDasharray="3 3" />
                <XAxis dataKey="timeLabel" stroke="#64748B" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} stroke="#64748B" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0D131F',
                    borderColor: '#243248',
                    borderRadius: '6px',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="healthPct"
                  name="Health %"
                  stroke="#10B981"
                  fill="#10B981"
                  fillOpacity={0.14}
                  strokeWidth={2}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Panel 4: Alert History */}
        <div className="rounded-lg bg-[#111824] border border-[#1F2B3E] p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-100">Alert History</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Warning and critical fault events detected by Mark 24 models
              </p>
            </div>
            <span className="font-mono text-xs text-slate-400 tabular-nums">
              {alerts.length} logged
            </span>
          </div>

          {alerts.length === 0 ? (
            <div className="flex-1 min-h-56 rounded-md bg-[#0A0E17] border border-[#1F2B3E] flex flex-col items-center justify-center p-6 text-center">
              <CheckCircle2 className="h-6 w-6 text-emerald-400 mb-2" />
              <div className="text-sm font-medium text-slate-200">
                {isBackendConnected ? 'All Systems Nominal' : 'No Backend Alerts Received'}
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                {isBackendConnected
                  ? 'Trigger Early Degradation or Severe Abnormality in Simulation Control to inspect fault alerts.'
                  : 'Connect the Python FastAPI backend to receive live Warning and Critical fault alerts.'}
              </p>
            </div>
          ) : (
            <div className="flex-1 max-h-56 overflow-y-auto divide-y divide-[#1F2B3E] rounded-md bg-[#0A0E17] border border-[#1F2B3E]">
              {alerts.map((alert) => (
                <div key={alert.id} className="px-4 py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs">
                      <span
                        className={`font-mono font-semibold ${
                          alert.severity === 'CRITICAL' ? 'text-rose-400' : 'text-amber-400'
                        }`}
                      >
                        {alert.severity === 'CRITICAL' ? '✖ CRITICAL' : '▲ WARNING'}
                      </span>
                      <span className="text-slate-500">·</span>
                      <span className="font-mono text-cyan-300">{alert.channel}</span>
                    </div>
                    <div className="text-sm font-medium text-slate-100 mt-1">{alert.title}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{alert.detail}</div>
                  </div>
                  <div className="text-xs font-mono text-slate-500 tabular-nums shrink-0">
                    {formatTelemetryTime(alert.timestamp).slice(0, 8)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
