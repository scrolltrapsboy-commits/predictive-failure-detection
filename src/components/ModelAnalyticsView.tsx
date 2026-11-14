import React from 'react';
import { AlertCircle, BarChart3, RefreshCw } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  MARK_24_HELD_OUT_METRICS,
  SYNTHETIC_VALIDATION_NOTE,
} from '../data/mark24Metrics';
import {
  BackendMetricsArtifacts,
  ConfusionMatrixData,
  ConnectionState,
} from '../types/telemetry';

interface ModelAnalyticsViewProps {
  connectionState: ConnectionState;
  metricsArtifacts: BackendMetricsArtifacts | null;
  metricsError: string | null;
  onRefreshMetrics: () => Promise<void>;
}

const ConfusionMatrixGrid: React.FC<{
  title: string;
  data: ConfusionMatrixData | undefined;
}> = ({ title, data }) => {
  if (!data || !Array.isArray(data.matrix) || data.matrix.length === 0) {
    return (
      <div className="rounded-lg bg-[#111824] border border-[#1F2B3E] p-5 flex flex-col justify-between min-h-56">
        <div>
          <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
          <p className="text-xs text-slate-400 mt-1">
            Held-out test confusion matrix (Actual vs. Predicted)
          </p>
        </div>
        <div className="rounded-md bg-[#0A0E17] border border-[#1F2B3E] p-4 text-xs text-slate-400">
          Awaiting confusion matrix array from <code className="text-cyan-300">GET /api/metrics</code> on the FastAPI backend. No synthetic confusion counts are fabricated in frontend code.
        </div>
      </div>
    );
  }

  const labels = data.labels ?? ['NORMAL', 'WARNING', 'CRITICAL'];
  return (
    <div className="rounded-lg bg-[#111824] border border-[#1F2B3E] p-5 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
        <p className="text-xs text-slate-400 mt-0.5">Rows = Actual Class · Columns = Predicted Class</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-center border-collapse text-xs font-mono tabular-nums">
          <thead>
            <tr className="text-slate-400">
              <th className="p-2 text-left">Actual \ Pred</th>
              {labels.map((lbl) => (
                <th key={lbl} className="p-2">
                  {lbl}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.matrix.map((row, rIdx) => (
              <tr key={labels[rIdx] ?? rIdx} className="border-t border-[#1F2B3E]">
                <td className="p-2 text-left text-slate-300 font-semibold">
                  {labels[rIdx] ?? `Class ${rIdx}`}
                </td>
                {row.map((cell, cIdx) => {
                  const isDiag = rIdx === cIdx;
                  return (
                    <td
                      key={cIdx}
                      className={`p-2.5 border border-[#1F2B3E] ${
                        isDiag
                          ? 'bg-cyan-500/15 text-cyan-200 font-bold'
                          : cell > 0
                            ? 'bg-amber-500/10 text-amber-300'
                            : 'bg-[#0A0E17] text-slate-500'
                      }`}
                    >
                      {cell}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const ModelAnalyticsView: React.FC<ModelAnalyticsViewProps> = ({
  connectionState,
  metricsArtifacts,
  metricsError,
  onRefreshMetrics,
}) => {
  const comparisonChartData = MARK_24_HELD_OUT_METRICS.map((row) => ({
    metric: row.metric,
    'Isolation Forest': row.isolationForest,
    'Random Forest': row.randomForest,
  }));

  const featureImportance = metricsArtifacts?.featureImportance ?? null;
  const predictionDistribution = metricsArtifacts?.predictionDistribution ?? null;
  const rfPerClass = metricsArtifacts?.randomForest?.perClass ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-100">
            Mark 24 Model Analytics
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Held-out benchmark comparison between Isolation Forest (unsupervised) and Random Forest (supervised).
          </p>
        </div>

        <button
          type="button"
          onClick={() => void onRefreshMetrics()}
          className="flex items-center gap-2 px-4 py-2 rounded-md bg-[#151E2E] border border-[#243248] hover:border-cyan-500/40 text-xs font-medium text-slate-200 transition-colors whitespace-nowrap shrink-0 self-start lg:self-auto"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Sync /api/metrics
        </button>
      </div>

      {/* Mandatory Synthetic Telemetry Note */}
      <div className="rounded-lg bg-[#111824] border border-cyan-500/30 px-4 py-3 flex items-start gap-3 text-xs text-slate-300">
        <AlertCircle className="h-4 w-4 text-cyan-400 mt-0.5 shrink-0" />
        <span>{SYNTHETIC_VALIDATION_NOTE}</span>
      </div>

      {/* Model Comparison Cards */}
      <section aria-label="Mark 24 held-out model comparison" className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Isolation Forest Card */}
        <div className="rounded-lg bg-[#111824] border border-[#1F2B3E] p-6 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-mono text-amber-400">UNSUPERVISED ANOMALY DETECTOR</div>
              <h2 className="text-lg font-display font-bold text-slate-100 mt-1">
                Isolation Forest (Mark 24)
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Detects structural deviations without class labels; lower sensitivity on subtle early degradation.
              </p>
            </div>
            <BarChart3 className="h-5 w-5 text-amber-400 shrink-0" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#1F2B3E] border-t border-[#1F2B3E] pt-4">
            {MARK_24_HELD_OUT_METRICS.map((item, idx) => (
              <div
                key={item.metric}
                className={`py-2 sm:py-0 ${idx === 0 ? 'sm:pr-3' : idx === 3 ? 'sm:pl-3' : 'sm:px-3'}`}
              >
                <div className="text-[11px] text-slate-400">{item.metric}</div>
                <div className="text-xl font-mono font-bold tabular-nums text-amber-300 mt-1">
                  {item.isolationForest.toFixed(2)}%
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Random Forest Card */}
        <div className="rounded-lg bg-[#111824] border border-cyan-500/35 p-6 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-mono text-cyan-400">SUPERVISED MULTI-CLASS CLASSIFIER</div>
              <h2 className="text-lg font-display font-bold text-slate-100 mt-1">
                Random Forest (Mark 24)
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Trained on labeled Normal, Warning, and Critical CAN feature windows with 100% Warning & Critical recall.
              </p>
            </div>
            <BarChart3 className="h-5 w-5 text-cyan-400 shrink-0" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#1F2B3E] border-t border-[#1F2B3E] pt-4">
            {MARK_24_HELD_OUT_METRICS.map((item, idx) => (
              <div
                key={item.metric}
                className={`py-2 sm:py-0 ${idx === 0 ? 'sm:pr-3' : idx === 3 ? 'sm:pl-3' : 'sm:px-3'}`}
              >
                <div className="text-[11px] text-slate-400">{item.metric}</div>
                <div className="text-xl font-mono font-bold tabular-nums text-cyan-300 mt-1">
                  {item.metric.includes('Recall') && item.randomForest === 100
                    ? '100%'
                    : `${item.randomForest.toFixed(2)}%`}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Authoritative Held-Out Comparison Table & Bar Chart */}
      <section className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div className="rounded-lg bg-[#111824] border border-[#1F2B3E] p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-100">
              Precision, Recall & F1 Held-Out Comparison
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Mark 24 held-out synthetic CAN test results (%)
            </p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonChartData} margin={{ top: 10, right: 16, left: -12, bottom: 0 }}>
                <CartesianGrid stroke="#1F2B3E" strokeDasharray="3 3" />
                <XAxis dataKey="metric" stroke="#94A3B8" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} stroke="#94A3B8" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0D131F',
                    borderColor: '#243248',
                    borderRadius: '6px',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="Isolation Forest" fill="#F59E0B" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="Random Forest" fill="#06B6D4" radius={[3, 3, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Summary Table + Optional Backend Per-Class Breakdown */}
        <div className="rounded-lg bg-[#111824] border border-[#1F2B3E] p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-100">
              Mark 24 Held-Out Benchmark Table
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Verified held-out evaluation summary across both architectures
            </p>
          </div>

          <div className="overflow-x-auto rounded-md border border-[#1F2B3E]">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-[#0D131F] text-slate-400 border-b border-[#1F2B3E]">
                <tr>
                  <th className="py-2.5 px-4">Metric</th>
                  <th className="py-2.5 px-4 text-right">Isolation Forest</th>
                  <th className="py-2.5 px-4 text-right">Random Forest</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F2B3E] font-mono tabular-nums">
                {MARK_24_HELD_OUT_METRICS.map((row) => (
                  <tr key={row.metric} className="hover:bg-[#151E2E]/60">
                    <td className="py-2.5 px-4 font-sans font-medium text-slate-200">
                      {row.metric}
                    </td>
                    <td className="py-2.5 px-4 text-right text-amber-300">
                      {row.isolationForest.toFixed(2)}%
                    </td>
                    <td className="py-2.5 px-4 text-right text-cyan-300 font-semibold">
                      {row.metric.includes('Recall') && row.randomForest === 100
                        ? '100%'
                        : `${row.randomForest.toFixed(2)}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {rfPerClass && rfPerClass.length > 0 && (
            <div className="h-36 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rfPerClass} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                  <CartesianGrid stroke="#1F2B3E" strokeDasharray="3 3" />
                  <XAxis dataKey="className" stroke="#94A3B8" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} stroke="#94A3B8" tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0D131F',
                      borderColor: '#243248',
                      borderRadius: '6px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="precision" name="Precision %" fill="#38BDF8" />
                  <Bar dataKey="recall" name="Recall %" fill="#10B981" />
                  <Bar dataKey="f1" name="F1 %" fill="#06B6D4" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </section>

      {/* Confusion Matrices from /api/metrics */}
      <section aria-label="Model confusion matrices" className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <ConfusionMatrixGrid
          title="Isolation Forest — Confusion Matrix"
          data={metricsArtifacts?.isolationForest?.confusionMatrix}
        />
        <ConfusionMatrixGrid
          title="Random Forest — Confusion Matrix"
          data={metricsArtifacts?.randomForest?.confusionMatrix}
        />
      </section>

      {/* Feature Importance & Prediction Distribution from /api/metrics */}
      <section className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div className="rounded-lg bg-[#111824] border border-[#1F2B3E] p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-100">
              Random Forest Feature Importance
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Saved feature weights served by FastAPI <code className="text-cyan-300">GET /api/metrics</code>
            </p>
          </div>
          {featureImportance && featureImportance.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={featureImportance}
                  layout="vertical"
                  margin={{ top: 4, right: 16, left: 40, bottom: 0 }}
                >
                  <CartesianGrid stroke="#1F2B3E" strokeDasharray="3 3" />
                  <XAxis type="number" stroke="#94A3B8" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="feature" type="category" stroke="#94A3B8" tick={{ fontSize: 11 }} width={110} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0D131F',
                      borderColor: '#243248',
                      borderRadius: '6px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="importance" name="Importance" fill="#06B6D4" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="rounded-md bg-[#0A0E17] border border-[#1F2B3E] p-6 text-xs text-slate-400">
              {connectionState === 'connected'
                ? 'Backend /api/metrics response did not include featureImportance array.'
                : `Connect FastAPI backend to load saved Mark 24 feature importances.${metricsError ? ` (${metricsError})` : ''}`}
            </div>
          )}
        </div>

        <div className="rounded-lg bg-[#111824] border border-[#1F2B3E] p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-100">
              Prediction Distribution
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Held-out predicted class counts served by FastAPI <code className="text-cyan-300">GET /api/metrics</code>
            </p>
          </div>
          {predictionDistribution && predictionDistribution.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={predictionDistribution} margin={{ top: 8, right: 16, left: -12, bottom: 0 }}>
                  <CartesianGrid stroke="#1F2B3E" strokeDasharray="3 3" />
                  <XAxis dataKey="label" stroke="#94A3B8" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#94A3B8" tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0D131F',
                      borderColor: '#243248',
                      borderRadius: '6px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="isolationForestCount" name="Isolation Forest" fill="#F59E0B" />
                  <Bar dataKey="randomForestCount" name="Random Forest" fill="#06B6D4" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="rounded-md bg-[#0A0E17] border border-[#1F2B3E] p-6 text-xs text-slate-400">
              {connectionState === 'connected'
                ? 'Backend /api/metrics response did not include predictionDistribution array.'
                : 'Connect FastAPI backend to display saved Mark 24 prediction class distributions.'}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
