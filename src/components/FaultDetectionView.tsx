import React, { useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, RefreshCw, ShieldAlert, XOctagon } from 'lucide-react';
import { ConnectionState, ModelPrediction } from '../types/telemetry';
import { formatTelemetryTime } from '../utils/telemetryLogic';

interface FaultDetectionViewProps {
  connectionState: ConnectionState;
  prediction: ModelPrediction | null;
  apiBaseUrl: string;
  onRetryConnection: () => Promise<void>;
  onOpenConnectionModal: () => void;
}

type ModelSelectionTab = 'Ensemble (Mark 24)' | 'Isolation Forest' | 'Random Forest';

export const FaultDetectionView: React.FC<FaultDetectionViewProps> = ({
  connectionState,
  prediction,
  apiBaseUrl,
  onRetryConnection,
  onOpenConnectionModal,
}) => {
  const [selectedModelTab, setSelectedModelTab] = useState<ModelSelectionTab>('Ensemble (Mark 24)');
  const isConnected = connectionState === 'connected' && prediction !== null;

  const condition = prediction?.predictedCondition ?? null;
  const conditionBadge =
    condition === 'CRITICAL'
      ? { color: 'text-rose-400', border: 'border-rose-500/40', bg: 'bg-rose-500/10', label: 'CRITICAL — Severe Abnormality Detected', icon: XOctagon }
      : condition === 'WARNING'
        ? { color: 'text-amber-400', border: 'border-amber-500/40', bg: 'bg-amber-500/10', label: 'WARNING — Early Degradation Detected', icon: AlertTriangle }
        : { color: 'text-emerald-400', border: 'border-emerald-500/40', bg: 'bg-emerald-500/10', label: 'NORMAL — Healthy Operation', icon: CheckCircle2 };

  const ConditionIcon = conditionBadge.icon;

  const anomalyScore = prediction?.isolationForestAnomalyScore ?? null;
  const warningThreshold = prediction?.warningThreshold ?? null;
  const criticalThreshold = prediction?.criticalThreshold ?? null;
  const rfProbs = prediction?.randomForestProbabilities ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-100">
            Mark 24 Fault Detection
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Live machine learning diagnostic output from the Python FastAPI backend. Isolation Forest anomaly scores and Random Forest class probabilities are tracked independently.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-md bg-[#111824] border border-[#1F2B3E] shrink-0">
          {(['Ensemble (Mark 24)', 'Isolation Forest', 'Random Forest'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setSelectedModelTab(tab)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                selectedModelTab === tab
                  ? 'bg-cyan-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {!isConnected ? (
        <div className="rounded-lg bg-[#111824] border border-[#243248] p-8 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div className="max-w-xl mx-auto space-y-2">
            <h2 className="text-lg font-semibold text-slate-100">
              FastAPI Mark 24 Inference Disconnected
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              This dashboard does not emulate machine learning models in JavaScript. Connect the Python FastAPI backend at <code className="text-cyan-300">{apiBaseUrl}</code> to inspect real Isolation Forest anomaly scores and Random Forest predictions from <code className="text-cyan-300">GET /api/prediction</code>.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => void onRetryConnection()}
              className="flex items-center gap-2 px-4 py-2 rounded-md bg-cyan-600 hover:bg-cyan-500 text-xs font-semibold text-white transition-colors whitespace-nowrap"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry Connection
            </button>
            <button
              type="button"
              onClick={onOpenConnectionModal}
              className="px-4 py-2 rounded-md bg-[#151E2E] border border-[#243248] hover:border-cyan-500/40 text-xs font-medium text-slate-200 transition-colors whitespace-nowrap"
            >
              Configure Endpoint URL
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Primary Operating Condition Summary */}
          <div className={`rounded-lg border p-6 ${conditionBadge.bg} ${conditionBadge.border}`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <ConditionIcon className={`h-8 w-8 shrink-0 mt-0.5 ${conditionBadge.color}`} />
                <div>
                  <div className="text-xs font-medium text-slate-400">
                    Predicted Operating Condition
                  </div>
                  <div className={`text-2xl font-display font-bold mt-1 ${conditionBadge.color}`}>
                    {conditionBadge.label}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <div className="text-slate-400">Active Backend Model</div>
                  <div className="font-mono font-semibold text-slate-100 mt-0.5">
                    {prediction.selectedModel}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">Affected CAN Channel</div>
                  <div className="font-mono font-semibold text-cyan-300 mt-0.5">
                    {prediction.affectedChannel ?? 'None / Bus-Wide'}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">Detection Timestamp</div>
                  <div className="font-mono tabular-nums text-slate-200 mt-0.5">
                    {formatTelemetryTime(prediction.detectionTimestamp)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Separate Panels: Isolation Forest vs Random Forest */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Isolation Forest Anomaly Score Panel */}
            <div
              className={`rounded-lg bg-[#111824] border p-6 space-y-5 ${
                selectedModelTab === 'Isolation Forest'
                  ? 'border-cyan-500/50'
                  : 'border-[#1F2B3E]'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-mono text-cyan-400">UNSUPERVISED ANOMALY SCORING</div>
                  <h2 className="text-lg font-semibold text-slate-100 mt-1">
                    Isolation Forest Anomaly Score
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Continuous outlier score comparing live feature vectors against nominal decision boundaries.
                  </p>
                </div>
                <Activity className="h-5 w-5 text-cyan-400 shrink-0" />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-md bg-[#0A0E17] border border-[#1F2B3E] p-3.5">
                  <div className="text-xs text-slate-400">Anomaly Score</div>
                  <div className="text-2xl font-mono font-bold tabular-nums text-slate-100 mt-1">
                    {anomalyScore !== null ? anomalyScore.toFixed(4) : '—'}
                  </div>
                </div>
                <div className="rounded-md bg-[#0A0E17] border border-[#1F2B3E] p-3.5">
                  <div className="text-xs text-slate-400">Warning Threshold</div>
                  <div className="text-2xl font-mono font-bold tabular-nums text-amber-400 mt-1">
                    {warningThreshold !== null ? warningThreshold.toFixed(4) : '—'}
                  </div>
                </div>
                <div className="rounded-md bg-[#0A0E17] border border-[#1F2B3E] p-3.5">
                  <div className="text-xs text-slate-400">Critical Threshold</div>
                  <div className="text-2xl font-mono font-bold tabular-nums text-rose-400 mt-1">
                    {criticalThreshold !== null ? criticalThreshold.toFixed(4) : '—'}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-[#1F2B3E] flex items-center justify-between text-xs">
                <span className="text-slate-400">Isolation Forest State</span>
                <span className="font-mono font-semibold text-slate-200">
                  {prediction.isolationForestCondition ?? prediction.predictedCondition}
                </span>
              </div>
            </div>

            {/* Random Forest Classification Probability Panel */}
            <div
              className={`rounded-lg bg-[#111824] border p-6 space-y-5 ${
                selectedModelTab === 'Random Forest'
                  ? 'border-cyan-500/50'
                  : 'border-[#1F2B3E]'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-mono text-sky-400">SUPERVISED MULTI-CLASS CLASSIFICATION</div>
                  <h2 className="text-lg font-semibold text-slate-100 mt-1">
                    Random Forest Class Probabilities
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Calibrated posterior class probability distribution across Normal, Warning, and Critical states.
                  </p>
                </div>
                <ShieldAlert className="h-5 w-5 text-sky-400 shrink-0" />
              </div>

              {rfProbs ? (
                <div className="space-y-3.5">
                  {(
                    [
                      { key: 'NORMAL', label: 'NORMAL (Healthy Operation)', barColor: 'bg-emerald-500', textColor: 'text-emerald-400' },
                      { key: 'WARNING', label: 'WARNING (Early Degradation)', barColor: 'bg-amber-500', textColor: 'text-amber-400' },
                      { key: 'CRITICAL', label: 'CRITICAL (Severe Abnormality)', barColor: 'bg-rose-500', textColor: 'text-rose-400' },
                    ] as const
                  ).map((item) => {
                    const raw = rfProbs[item.key];
                    const pct = raw <= 1 ? raw * 100 : raw;
                    return (
                      <div key={item.key} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-300 font-medium">{item.label}</span>
                          <span className={`font-mono font-semibold tabular-nums ${item.textColor}`}>
                            {pct.toFixed(1)}%
                          </span>
                        </div>
                        <div className="h-2.5 w-full rounded bg-[#0A0E17] border border-[#1F2B3E] overflow-hidden">
                          <div
                            className={`h-full ${item.barColor} transition-all duration-200`}
                            style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-md bg-[#0A0E17] border border-[#1F2B3E] p-4 text-xs text-slate-400">
                  Backend response did not include per-class Random Forest probabilities.
                </div>
              )}

              <div className="pt-2 border-t border-[#1F2B3E] flex items-center justify-between text-xs">
                <span className="text-slate-400">Random Forest Classification</span>
                <span className="font-mono font-semibold text-slate-200">
                  {prediction.randomForestCondition ?? prediction.predictedCondition}
                </span>
              </div>
            </div>
          </div>

          {/* Operating Condition Reference Matrix */}
          <div className="rounded-lg bg-[#111824] border border-[#1F2B3E] p-5 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="space-y-1">
              <div className="font-mono font-semibold text-emerald-400">● NORMAL</div>
              <p className="text-slate-400">
                Healthy operation. Payload variance and bus timing remain within nominal vehicle electronic tolerances.
              </p>
            </div>
            <div className="space-y-1">
              <div className="font-mono font-semibold text-amber-400">▲ WARNING</div>
              <p className="text-slate-400">
                Early degradation detected. Gradual sensor drift, elevated payload variance, or timing jitter detected before failure.
              </p>
            </div>
            <div className="space-y-1">
              <div className="font-mono font-semibold text-rose-400">✖ CRITICAL</div>
              <p className="text-slate-400">
                Severe abnormality detected. Extreme sensor values or bus timing disruption requiring immediate inspection.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
