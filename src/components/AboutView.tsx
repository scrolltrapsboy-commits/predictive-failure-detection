import React from 'react';
import { Cpu, Layers, ShieldCheck, Wrench } from 'lucide-react';
import { SYNTHETIC_VALIDATION_NOTE, TECHNOLOGY_STACK } from '../data/mark24Metrics';

export const AboutView: React.FC = () => {
  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-100">
          Project 18 — Predictive Failure Detection for Military Vehicle Electronics
        </h1>
        <p className="text-sm text-cyan-300 mt-1">
          Detect early. Prevent failure. Improve reliability.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-lg bg-[#111824] border border-[#1F2B3E] p-6 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
            <Wrench className="h-4 w-4 text-amber-400" />
            <h2>Problem Statement</h2>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">
            Vehicle electronic systems can experience sensor degradation, communication abnormalities and unexpected failures. Such issues can affect vehicle reliability and maintenance readiness.
          </p>
        </div>

        <div className="rounded-lg bg-[#111824] border border-[#1F2B3E] p-6 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
            <Cpu className="h-4 w-4 text-cyan-400" />
            <h2>Proposed Solution</h2>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">
            A simulated CAN telemetry monitoring system that uses machine learning to identify abnormal patterns and classify operating conditions into Normal, Warning and Critical.
          </p>
        </div>
      </div>

      {/* Technology Stack */}
      <div className="rounded-lg bg-[#111824] border border-[#1F2B3E] p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
          <Layers className="h-4 w-4 text-cyan-400" />
          <h2>Technology Stack</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {TECHNOLOGY_STACK.map((tech) => (
            <div
              key={tech.name}
              className="rounded-md bg-[#0A0E17] border border-[#1F2B3E] p-3.5"
            >
              <div className="text-sm font-semibold text-slate-100">{tech.name}</div>
              <div className="text-xs text-slate-400 mt-1">{tech.role}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Project Scope */}
      <div className="rounded-lg bg-[#111824] border border-amber-500/30 p-6 space-y-2.5">
        <div className="flex items-center gap-2 text-sm font-semibold text-amber-300">
          <ShieldCheck className="h-4 w-4 shrink-0" />
          <h2>Project Scope & Hardware Disclaimer</h2>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">
          This is a software-based prototype using simulated telemetry. It is not connected to actual military vehicle hardware.
        </p>
        <p className="text-xs text-slate-400">{SYNTHETIC_VALIDATION_NOTE}</p>
      </div>
    </div>
  );
};
