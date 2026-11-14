import React, { useCallback, useEffect, useState } from 'react';
import { AboutView } from './components/AboutView';
import { ArchitectureView } from './components/ArchitectureView';
import { ConnectionModal } from './components/ConnectionModal';
import { FaultDetectionView } from './components/FaultDetectionView';
import { LiveCanView } from './components/LiveCanView';
import { ModelAnalyticsView } from './components/ModelAnalyticsView';
import { OverviewView } from './components/OverviewView';
import { Sidebar } from './components/Sidebar';
import { SimulationControlView } from './components/SimulationControlView';
import { TopBar } from './components/TopBar';
import { useDiagnosticsSystem } from './hooks/useDiagnosticsSystem';
import { NavSectionId } from './types/telemetry';

export default function App() {
  const [activeSection, setActiveSection] = useState<NavSectionId>('overview');
  const [mobileNavOpen, setMobileNavOpen] = useState<boolean>(false);
  const [connectionModalOpen, setConnectionModalOpen] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const diagnostics = useDiagnosticsSystem();

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const handleToggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Ignore fullscreen denial in restricted iframe contexts
    }
  }, []);

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-[#0A0E17] text-slate-100">
      <Sidebar
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <TopBar
          connectionState={diagnostics.connectionState}
          simulationState={diagnostics.status?.simulationState ?? 'IDLE'}
          isFullscreen={isFullscreen}
          onToggleFullscreen={() => void handleToggleFullscreen()}
          onOpenConnectionModal={() => setConnectionModalOpen(true)}
          onOpenMobileNav={() => setMobileNavOpen(true)}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-7">
          {activeSection === 'overview' && (
            <OverviewView
              connectionState={diagnostics.connectionState}
              lastApiError={diagnostics.lastApiError}
              apiBaseUrl={diagnostics.apiBaseUrl}
              previewStreamEnabled={diagnostics.previewStreamEnabled}
              status={diagnostics.status}
              channelSummaries={diagnostics.channelSummaries}
              chartHistory={diagnostics.chartHistory}
              prediction={diagnostics.prediction}
              alerts={diagnostics.alerts}
              onOpenConnectionModal={() => setConnectionModalOpen(true)}
              onNavigateToSimulation={() => setActiveSection('simulation')}
            />
          )}

          {activeSection === 'live-can' && (
            <LiveCanView
              messages={diagnostics.messages}
              connectionState={diagnostics.connectionState}
              previewStreamEnabled={diagnostics.previewStreamEnabled}
              streamPaused={diagnostics.streamPaused}
              onToggleStreamPaused={diagnostics.setStreamPaused}
            />
          )}

          {activeSection === 'fault-detection' && (
            <FaultDetectionView
              connectionState={diagnostics.connectionState}
              prediction={diagnostics.prediction}
              apiBaseUrl={diagnostics.apiBaseUrl}
              onRetryConnection={diagnostics.testAndSyncNow}
              onOpenConnectionModal={() => setConnectionModalOpen(true)}
            />
          )}

          {activeSection === 'simulation' && (
            <SimulationControlView
              connectionState={diagnostics.connectionState}
              apiBaseUrl={diagnostics.apiBaseUrl}
              status={diagnostics.status}
              simulationSpeed={diagnostics.simulationSpeed}
              onChangeSpeed={diagnostics.setSimulationSpeed}
              pendingCommand={diagnostics.pendingCommand}
              commandFeedback={diagnostics.commandFeedback}
              commandLogs={diagnostics.commandLogs}
              onStart={diagnostics.sendStartSimulation}
              onPause={diagnostics.sendPauseSimulation}
              onReset={diagnostics.sendResetSimulation}
              onSelectMode={diagnostics.sendSimulationMode}
            />
          )}

          {activeSection === 'analytics' && (
            <ModelAnalyticsView
              connectionState={diagnostics.connectionState}
              metricsArtifacts={diagnostics.metricsArtifacts}
              metricsError={diagnostics.metricsError}
              onRefreshMetrics={diagnostics.refreshMetrics}
            />
          )}

          {activeSection === 'architecture' && <ArchitectureView />}

          {activeSection === 'about' && <AboutView />}
        </main>
      </div>

      <ConnectionModal
        open={connectionModalOpen}
        onClose={() => setConnectionModalOpen(false)}
        apiBaseUrl={diagnostics.apiBaseUrl}
        onSaveApiBaseUrl={diagnostics.setApiBaseUrl}
        connectionState={diagnostics.connectionState}
        lastApiError={diagnostics.lastApiError}
        lastSuccessfulSync={diagnostics.lastSuccessfulSync}
        previewStreamEnabled={diagnostics.previewStreamEnabled}
        onTogglePreviewStream={diagnostics.setPreviewStreamEnabled}
        onRetryConnection={diagnostics.testAndSyncNow}
        commandLogs={diagnostics.commandLogs}
      />
    </div>
  );
}
