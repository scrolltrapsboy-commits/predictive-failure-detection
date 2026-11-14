import React, { useMemo, useState } from 'react';
import { Download, Pause, Play, Radio } from 'lucide-react';
import { CAN_CHANNEL_LIST } from '../data/mark24Metrics';
import { CanChannelId, CanMessage, ConnectionState, OperatingCondition } from '../types/telemetry';
import { filterTelemetryMessages, formatTelemetryTime } from '../utils/telemetryLogic';

interface LiveCanViewProps {
  messages: CanMessage[];
  connectionState: ConnectionState;
  previewStreamEnabled: boolean;
  streamPaused: boolean;
  onToggleStreamPaused: (paused: boolean) => void;
}

export const LiveCanView: React.FC<LiveCanViewProps> = ({
  messages,
  connectionState,
  previewStreamEnabled,
  streamPaused,
  onToggleStreamPaused,
}) => {
  const [canIdFilter, setCanIdFilter] = useState<CanChannelId | 'ALL'>('ALL');
  const [severityFilter, setSeverityFilter] = useState<OperatingCondition | 'ALL'>('ALL');

  const filteredMessages = useMemo(
    () => filterTelemetryMessages(messages, canIdFilter, severityFilter),
    [canIdFilter, messages, severityFilter]
  );

  const handleExportCsv = () => {
    const header = 'Timestamp,CAN ID,Channel Name,Payload,Message Interval (ms),Status,Source';
    const rows = filteredMessages.map((m) =>
      [
        m.timestamp,
        m.canId,
        `"${m.channelName}"`,
        `"${m.payloadHex}"`,
        m.intervalMs,
        m.status,
        m.source,
      ].join(',')
    );
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `project18-can-telemetry-${Date.now()}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-100">
            Live CAN Bus Monitoring
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Continuous stream of CAN frames across electronic channels 0x100–0x103.
            {connectionState !== 'connected' && previewStreamEnabled && (
              <span className="text-amber-300 ml-2">
                (Displaying offline preview frames — FastAPI backend disconnected)
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => onToggleStreamPaused(!streamPaused)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 ${
              streamPaused
                ? 'bg-emerald-600 hover:bg-emerald-500 border-emerald-500 text-white'
                : 'bg-[#151E2E] hover:border-cyan-500/40 border-[#243248] text-slate-200'
            }`}
          >
            {streamPaused ? (
              <>
                <Play className="h-3.5 w-3.5" />
                Resume Stream
              </>
            ) : (
              <>
                <Pause className="h-3.5 w-3.5" />
                Pause Stream
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={filteredMessages.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-[#151E2E] border border-[#243248] hover:border-cyan-500/40 disabled:opacity-40 text-xs font-medium text-slate-200 transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="rounded-lg bg-[#111824] border border-[#1F2B3E] p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-medium text-slate-400">CAN ID:</span>
          <div className="flex flex-wrap items-center gap-1 p-1 rounded-md bg-[#0A0E17] border border-[#1F2B3E]">
            <button
              type="button"
              onClick={() => setCanIdFilter('ALL')}
              className={`px-3 py-1.5 rounded text-xs font-mono transition-colors whitespace-nowrap ${
                canIdFilter === 'ALL'
                  ? 'bg-cyan-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              All Channels
            </button>
            {CAN_CHANNEL_LIST.map((ch) => (
              <button
                key={ch.id}
                type="button"
                onClick={() => setCanIdFilter(ch.id)}
                className={`px-3 py-1.5 rounded text-xs font-mono transition-colors whitespace-nowrap ${
                  canIdFilter === ch.id
                    ? 'bg-cyan-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                {ch.id}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-medium text-slate-400">Severity:</span>
          <div className="flex flex-wrap items-center gap-1 p-1 rounded-md bg-[#0A0E17] border border-[#1F2B3E]">
            {(['ALL', 'NORMAL', 'WARNING', 'CRITICAL'] as const).map((sev) => (
              <button
                key={sev}
                type="button"
                onClick={() => setSeverityFilter(sev)}
                className={`px-3 py-1.5 rounded text-xs font-mono transition-colors whitespace-nowrap ${
                  severityFilter === sev
                    ? 'bg-[#1D283A] text-cyan-300 border border-cyan-500/30 font-semibold'
                    : 'text-slate-400 hover:text-slate-100 border border-transparent'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>

          <span className="text-xs font-mono text-slate-400 tabular-nums ml-1">
            {filteredMessages.length} frames
          </span>
        </div>
      </div>

      {/* Live Telemetry Table */}
      <div className="rounded-lg bg-[#111824] border border-[#1F2B3E] overflow-hidden">
        <div className="overflow-x-auto max-h-[600px]">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-[#0D131F] border-b border-[#1F2B3E] text-xs font-medium text-slate-400">
              <tr>
                <th className="py-3 px-4 whitespace-nowrap">Timestamp</th>
                <th className="py-3 px-4 whitespace-nowrap">CAN ID</th>
                <th className="py-3 px-4 whitespace-nowrap">Channel Name</th>
                <th className="py-3 px-4 whitespace-nowrap">Payload</th>
                <th className="py-3 px-4 whitespace-nowrap text-right">Message Interval</th>
                <th className="py-3 px-4 whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A2435] text-xs">
              {filteredMessages.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 px-4 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <Radio className="h-5 w-5 text-slate-500" />
                      <span>
                        No CAN frames match the current filter or stream is inactive.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredMessages.map((msg) => {
                  const statusStyle =
                    msg.status === 'CRITICAL'
                      ? 'text-rose-400'
                      : msg.status === 'WARNING'
                        ? 'text-amber-400'
                        : 'text-emerald-400';
                  const statusSymbol =
                    msg.status === 'CRITICAL' ? '✖' : msg.status === 'WARNING' ? '▲' : '●';

                  return (
                    <tr
                      key={msg.id}
                      className="hover:bg-[#151E2E]/70 transition-colors"
                    >
                      <td className="py-2.5 px-4 font-mono tabular-nums text-slate-300 whitespace-nowrap">
                        {formatTelemetryTime(msg.timestamp)}
                      </td>
                      <td className="py-2.5 px-4 font-mono font-semibold text-cyan-300 whitespace-nowrap">
                        {msg.canId}
                      </td>
                      <td className="py-2.5 px-4 text-slate-200 whitespace-nowrap">
                        {msg.channelName}
                      </td>
                      <td className="py-2.5 px-4 font-mono tabular-nums text-slate-300 whitespace-nowrap">
                        {msg.payloadHex}
                      </td>
                      <td className="py-2.5 px-4 font-mono tabular-nums text-slate-300 text-right whitespace-nowrap">
                        {msg.intervalMs.toFixed(1)} ms
                      </td>
                      <td className={`py-2.5 px-4 font-mono font-semibold whitespace-nowrap ${statusStyle}`}>
                        {statusSymbol} {msg.status}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
