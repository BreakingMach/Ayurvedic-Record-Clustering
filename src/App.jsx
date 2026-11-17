import React, { useState } from 'react';
import TelemetryHeader from './components/TelemetryHeader';
import Pillar1SchemaExplorer from './components/Pillar1SchemaExplorer';
import Pillar2ClusterSandbox from './components/Pillar2ClusterSandbox';
import Pillar3CbrSimulator from './components/Pillar3CbrSimulator';
import Module4ArchitectureLit from './components/Module4ArchitectureLit';
import { PROJECT_METADATA } from './data/benchmarkData';

export default function App() {
  const [activeTab, setActiveTab] = useState('pillar2');
  const [alpha, setAlpha] = useState(0.75);

  return (
    <div className="foundry-grid-bg flex min-h-screen flex-col bg-[#090D16] text-slate-100">
      <TelemetryHeader activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6">
        {activeTab === 'pillar1' && <Pillar1SchemaExplorer />}
        {activeTab === 'pillar2' && (
          <Pillar2ClusterSandbox alpha={alpha} setAlpha={setAlpha} />
        )}
        {activeTab === 'pillar3' && (
          <Pillar3CbrSimulator alpha={alpha} setAlpha={setAlpha} />
        )}
        {activeTab === 'module4' && <Module4ArchitectureLit alpha={alpha} />}
      </main>

      <footer className="border-t border-[#1F2937] bg-[#0B111E]/90">
        <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-2 px-4 py-4 font-mono text-[11px] text-slate-500 sm:flex-row sm:px-6">
          <div>
            <span className="font-semibold text-cyan-400">{PROJECT_METADATA.code}</span> ·{' '}
            AyurFoundry Clinical Telemetry Workbench · Aligned with Ministry of AYUSH NAMASTE Portal
          </div>
          <div>
            Built by <span className="text-slate-300">{PROJECT_METADATA.author}</span> (
            {PROJECT_METADATA.regNo}) · Supervised by{' '}
            <span className="text-slate-300">{PROJECT_METADATA.supervisor}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
