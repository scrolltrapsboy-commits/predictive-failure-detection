import React, { useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, Layers } from 'lucide-react';
import { ARCHITECTURE_STAGES } from '../data/mark24Metrics';

export const ArchitectureView: React.FC = () => {
  const [selectedStageId, setSelectedStageId] = useState<string>(ARCHITECTURE_STAGES[0].id);

  const selectedIndex = ARCHITECTURE_STAGES.findIndex((s) => s.id === selectedStageId);
  const selectedStage = ARCHITECTURE_STAGES[selectedIndex] ?? ARCHITECTURE_STAGES[0];

  const handlePrev = () => {
    const prevIdx = (selectedIndex - 1 + ARCHITECTURE_STAGES.length) % ARCHITECTURE_STAGES.length;
    setSelectedStageId(ARCHITECTURE_STAGES[prevIdx].id);
  };

  const handleNext = () => {
    const nextIdx = (selectedIndex + 1) % ARCHITECTURE_STAGES.length;
    setSelectedStageId(ARCHITECTURE_STAGES[nextIdx].id);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-100">
          System Architecture Pipeline
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          End-to-end data flow from simulated CAN bus frames through Mark 24 machine learning inference to operator alerts. Select any stage to inspect its role.
        </p>
      </div>

      {/* Interactive 7-Stage Pipeline Flow */}
      <div className="rounded-lg bg-[#111824] border border-[#1F2B3E] p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2">
          {ARCHITECTURE_STAGES.map((stage, idx) => {
            const isSelected = stage.id === selectedStage.id;
            return (
              <div key={stage.id} className="relative flex items-stretch">
                <button
                  type="button"
                  onClick={() => setSelectedStageId(stage.id)}
                  aria-pressed={isSelected}
                  className={`w-full rounded-md border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 flex flex-col justify-between ${
                    isSelected
                      ? 'bg-cyan-500/12 border-cyan-500/50 text-slate-100'
                      : 'bg-[#0A0E17] border-[#1F2B3E] text-slate-300 hover:border-cyan-500/30 hover:bg-[#151E2E]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 font-mono text-[11px] text-cyan-400 tabular-nums">
                      <span>Stage 0{stage.order}</span>
                      {idx < ARCHITECTURE_STAGES.length - 1 && (
                        <ArrowRight className="hidden lg:inline h-3 w-3 text-slate-600 shrink-0" />
                      )}
                    </div>
                    <div className="text-xs font-semibold mt-1.5 leading-snug">{stage.title}</div>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1.5 leading-snug">{stage.subtitle}</div>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Stage Inspector */}
      <div className="rounded-lg bg-[#111824] border border-[#1F2B3E] p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1F2B3E]">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono text-sm font-bold shrink-0">
              0{selectedStage.order}
            </div>
            <div>
              <h2 className="text-lg font-display font-bold text-slate-100">
                {selectedStage.title}
              </h2>
              <p className="text-xs text-cyan-300 mt-0.5">{selectedStage.subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handlePrev}
              className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-[#151E2E] border border-[#243248] hover:border-cyan-500/40 text-xs text-slate-200 transition-colors whitespace-nowrap"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Previous
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-[#151E2E] border border-[#243248] hover:border-cyan-500/40 text-xs text-slate-200 transition-colors whitespace-nowrap"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <p className="text-sm text-slate-300 leading-relaxed">{selectedStage.summary}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-[#1F2B3E] border-t border-[#1F2B3E] pt-4 text-xs">
          <div className="py-2 md:py-0 md:pr-4 space-y-1.5">
            <div className="font-mono text-slate-400">INPUTS</div>
            <div className="text-slate-200 leading-relaxed">{selectedStage.inputs}</div>
          </div>
          <div className="py-2 md:py-0 md:px-4 space-y-1.5">
            <div className="font-mono text-slate-400">PROCESSING</div>
            <div className="text-slate-200 leading-relaxed">{selectedStage.processing}</div>
          </div>
          <div className="py-2 md:py-0 md:px-4 space-y-1.5">
            <div className="font-mono text-slate-400">OUTPUTS</div>
            <div className="text-slate-200 leading-relaxed">{selectedStage.outputs}</div>
          </div>
          <div className="py-2 md:py-0 md:pl-4 space-y-1.5">
            <div className="font-mono text-slate-400 flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-cyan-400" />
              <span>IMPLEMENTATION</span>
            </div>
            <div className="text-cyan-300 font-medium leading-relaxed">
              {selectedStage.implementation}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
