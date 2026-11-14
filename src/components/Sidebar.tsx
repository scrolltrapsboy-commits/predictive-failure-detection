import React from 'react';
import {
  Activity,
  BarChart3,
  Cpu,
  GitBranch,
  Info,
  LayoutDashboard,
  Radio,
  ShieldAlert,
  Sliders,
  X,
} from 'lucide-react';
import { NavSectionId } from '../types/telemetry';

export interface NavItem {
  id: NavSectionId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'live-can', label: 'Live CAN Monitoring', icon: Radio },
  { id: 'fault-detection', label: 'Fault Detection', icon: ShieldAlert },
  { id: 'simulation', label: 'Simulation Control', icon: Sliders },
  { id: 'analytics', label: 'Model Analytics', icon: BarChart3 },
  { id: 'architecture', label: 'System Architecture', icon: GitBranch },
  { id: 'about', label: 'About Project', icon: Info },
];

interface SidebarProps {
  activeSection: NavSectionId;
  onSelectSection: (id: NavSectionId) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSelectSection,
  mobileOpen,
  onCloseMobile,
}) => {
  const navContent = (
    <div className="flex h-full flex-col justify-between bg-[#0D131F] border-r border-[#1F2B3E] w-64 select-none">
      <div>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1F2B3E]">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight text-slate-100 whitespace-nowrap">
                PROJECT 18
              </div>
              <div className="text-xs text-slate-400 whitespace-nowrap">
                Mark 24 Diagnostics
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close navigation drawer"
            className="lg:hidden rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav aria-label="Primary sections" className="px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectSection(item.id);
                  onCloseMobile();
                }}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${
                  isActive
                    ? 'bg-cyan-500/12 text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-[#151E2E] border border-transparent'
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 ${
                    isActive ? 'text-cyan-400' : 'text-slate-500'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-[#1F2B3E] space-y-2.5">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
          <Activity className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
          <span>Synthetic Telemetry Lab</span>
        </div>
        <p className="text-xs leading-relaxed text-slate-400">
          Detect early. Prevent failure. Improve reliability.
        </p>
        <p className="text-[11px] leading-snug text-slate-500">
          Software prototype only. Not connected to live military vehicle hardware.
        </p>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block shrink-0">{navContent}</aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <button
            type="button"
            aria-label="Dismiss navigation overlay"
            onClick={onCloseMobile}
            className="fixed inset-0 bg-black/70"
          />
          <div className="relative z-10 h-full">{navContent}</div>
        </div>
      )}
    </>
  );
};
