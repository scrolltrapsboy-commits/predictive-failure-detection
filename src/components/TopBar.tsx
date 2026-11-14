import React, { useEffect, useState } from 'react';
import {
  Maximize2,
  Minimize2,
  Menu,
  Settings2,
  Shield,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { ConnectionState, SimulationRunState } from '../types/telemetry';

interface TopBarProps {
  connectionState: ConnectionState;
  simulationState: SimulationRunState;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onOpenConnectionModal: () => void;
  onOpenMobileNav: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  connectionState,
  simulationState,
  isFullscreen,
  onToggleFullscreen,
  onOpenConnectionModal,
  onOpenMobileNav,
}) => {
  const [clock, setClock] = useState<string>(() => new Date().toLocaleTimeString('en-GB', { hour12: false }));

  useEffect(() => {
    const timer = setInterval(() => {
      setClock(new Date().toLocaleTimeString('en-GB', { hour12: false }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const isConnected = connectionState === 'connected';
  const isConnecting = connectionState === 'connecting';

  const connectionLabel = isConnected
    ? 'Backend Connected'
    : isConnecting
      ? 'Connecting...'
      : 'Backend Disconnected';

  const simColor =
    simulationState === 'RUNNING'
      ? 'text-emerald-400'
      : simulationState === 'PAUSED'
        ? 'text-amber-400'
        : 'text-slate-400';

  return (
    <header className="h-14 shrink-0 bg-[#0D131F] border-b border-[#1F2B3E] px-4 lg:px-6 flex items-center justify-between gap-4">
      {/* Left: Identity */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileNav}
          aria-label="Open navigation menu"
          className="lg:hidden rounded-md p-2 text-slate-300 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2.5 min-w-0">
          <Shield className="h-4 w-4 text-cyan-400 shrink-0 hidden sm:block" />
          <span className="font-display text-sm sm:text-base font-semibold tracking-tight text-slate-100 truncate">
            Project 18 — Predictive Failure Detection
          </span>
        </div>
      </div>

      {/* Right: Connection, Simulation State, Timestamp, Fullscreen */}
      <div className="flex items-center gap-3 sm:gap-5 shrink-0">
        <button
          type="button"
          onClick={onOpenConnectionModal}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${
            isConnected
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/15'
              : isConnecting
                ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300 hover:bg-rose-500/15'
          }`}
          aria-label="Configure backend API connection"
        >
          {isConnected ? (
            <Wifi className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <WifiOff className="h-3.5 w-3.5 shrink-0" />
          )}
          <span>{connectionLabel}</span>
          <Settings2 className="h-3 w-3 opacity-75 shrink-0" />
        </button>

        <div className="hidden md:flex items-center gap-2 text-xs text-slate-400 whitespace-nowrap">
          <span>Simulation:</span>
          <span className={`font-mono font-semibold ${simColor}`}>
            {simulationState}
          </span>
        </div>

        <div
          className="hidden sm:block font-mono text-xs text-slate-300 tabular-nums whitespace-nowrap"
          aria-label="Current system time"
        >
          {clock}
        </div>

        <button
          type="button"
          onClick={onToggleFullscreen}
          aria-label={isFullscreen ? 'Exit fullscreen mode' : 'Enter fullscreen mode'}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#243248] bg-[#151E2E] text-xs font-medium text-slate-200 hover:border-cyan-500/40 hover:text-cyan-300 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
        >
          {isFullscreen ? (
            <>
              <Minimize2 className="h-3.5 w-3.5" />
              <span className="hidden xl:inline">Exit Fullscreen</span>
            </>
          ) : (
            <>
              <Maximize2 className="h-3.5 w-3.5" />
              <span className="hidden xl:inline">Fullscreen</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
