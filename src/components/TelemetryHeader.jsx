import React from 'react';
import {
  Activity,
  Cpu,
  Database,
  ExternalLink,
  GitBranch,
  Layers,
  Radar,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { PROJECT_METADATA } from '../data/benchmarkData';

const KPI_CARDS = [
  {
    id: 'ari',
    label: 'BEST ARI (CLUSTER MATCH)',
    value: '0.8162',
    metric: 'Euclidean (OHE + Z-Score)',
    delta: '+71.4% vs Avg-Linkage (0.4762)',
    subtext: 'Spectral RBF Partitioning · k = 6',
    accentText: 'text-cyan-400',
    accentBorder: 'border-cyan-500/30 hover:border-cyan-400/60',
    glowClass: 'shadow-glow-cyan',
    badgeBg: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
  },
  {
    id: 'nmi',
    label: 'BEST NMI (INFO MATCH)',
    value: '0.8037',
    metric: 'Weighted Gower (Vaidya MI²)',
    delta: '+89.8% vs Avg-Linkage (0.4235)',
    subtext: 'Zero OHE Sparsity · Native Mixed',
    accentText: 'text-amber-400',
    accentBorder: 'border-amber-500/30 hover:border-amber-400/60',
    glowClass: 'shadow-glow-amber',
    badgeBg: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  },
  {
    id: 'sil',
    label: 'BEST SILHOUETTE (COHESION)',
    value: '0.2274',
    metric: 'Weighted Gower (Vaidya MI²)',
    delta: '3.02× higher than Euclidean (0.0753)',
    subtext: 'Compact Geometric Tridosha Manifolds',
    accentText: 'text-emerald-400',
    accentBorder: 'border-emerald-500/30 hover:border-emerald-400/60',
    glowClass: 'shadow-glow-emerald',
    badgeBg: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  },
  {
    id: 'p5',
    label: 'BEST PRECISION@5 (CBR)',
    value: '100.00%',
    metric: 'Proposed Hybrid (0.75G + 0.25C)',
    delta: '2.23× Euclidean Sil (0.1679)',
    subtext: 'Flawless Top-5 Clinical Concordance',
    accentText: 'text-violet-400',
    accentBorder: 'border-violet-500/30 hover:border-violet-400/60',
    glowClass: 'shadow-glow-violet',
    badgeBg: 'bg-violet-500/10 text-violet-300 border-violet-500/30',
  },
];

const NAV_TABS = [
  {
    id: 'pillar1',
    code: '01',
    label: 'Pillar 1: Schema & Vaidya MI Weights',
    shortLabel: 'P1 · Schema & MI',
    icon: Database,
  },
  {
    id: 'pillar2',
    code: '02',
    label: 'Pillar 2: Cluster Topology & α-Sandbox',
    shortLabel: 'P2 · Topology & α',
    icon: Radar,
  },
  {
    id: 'pillar3',
    code: '03',
    label: 'Pillar 3: Live CBR Retrieval Simulator',
    shortLabel: 'P3 · Live CBR',
    icon: UserCheck,
  },
  {
    id: 'module4',
    code: '04',
    label: 'SOTA: N×N Heatmap, Architecture & Literature',
    shortLabel: '04 · Heatmap & SOTA',
    icon: Layers,
  },
];

export default function TelemetryHeader({ activeTab, onTabChange }) {
  return (
    <header className="border-b border-[#1F2937] bg-[#090D16]/95 backdrop-blur-md">
      {/* Top Telemetry Strip */}
      <div className="border-b border-[#1F2937]/80 bg-[#0B111E]">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4 py-2 text-xs sm:px-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded border border-cyan-500/40 bg-cyan-500/10 px-2 py-0.5 font-mono font-semibold text-cyan-300">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />
              {PROJECT_METADATA.code}
            </span>
            <span className="hidden text-slate-400 sm:inline">|</span>
            <span className="inline-flex items-center gap-1.5 font-mono text-slate-300">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              Ministry of AYUSH · NAMASTE Portal:{' '}
              <strong className="text-slate-100">
                {PROJECT_METADATA.namaste.totalOutpatientFormatted}
              </strong>{' '}
              cases ·{' '}
              <strong className="text-slate-100">
                {PROJECT_METADATA.namaste.diagnosticCodes.toLocaleString()}
              </strong>{' '}
              codes
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] text-slate-400">
            <span>
              DEV:{' '}
              <strong className="text-slate-200">{PROJECT_METADATA.author}</strong> (
              {PROJECT_METADATA.regNo})
            </span>
            <span className="hidden md:inline text-slate-600">•</span>
            <span className="hidden md:inline">
              SUPERVISOR:{' '}
              <strong className="text-slate-200">{PROJECT_METADATA.supervisor}</strong>
            </span>
            <a
              href={PROJECT_METADATA.repoUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded border border-[#1F2937] bg-[#111827] px-2 py-0.5 text-cyan-300 transition hover:border-cyan-500/50 hover:text-cyan-200"
            >
              <GitBranch className="h-3 w-3" />
              GitHub
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
          </div>
        </div>
      </div>

      {/* Main Title & Institutional Context */}
      <div className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-500/40 bg-gradient-to-br from-cyan-500/20 via-violet-500/15 to-emerald-500/20">
                <Cpu className="h-5 w-5 text-cyan-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                    AyurFoundry
                  </h1>
                  <span className="rounded-full border border-violet-500/40 bg-violet-500/10 px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-violet-300">
                    3-Pillar Clinical CDSS &amp; CBR Telemetry
                  </span>
                </div>
                <p className="text-xs text-slate-400 sm:text-sm">
                  {PROJECT_METADATA.title}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
            <div className="rounded-md border border-[#1F2937] bg-[#111827] px-3 py-1.5 text-slate-300">
              <span className="text-slate-500">COHORT:</span>{' '}
              <span className="font-semibold text-white">N = 1,200</span> ·{' '}
              <span className="font-semibold text-cyan-300">p = 33</span> (4 Num + 29 Cat)
            </div>
            <div className="rounded-md border border-[#1F2937] bg-[#111827] px-3 py-1.5 text-slate-300">
              <span className="text-slate-500">CLASSES:</span>{' '}
              <span className="font-semibold text-emerald-300">6 Tridosha</span>
            </div>
            <div className="hidden xl:block rounded-md border border-[#1F2937] bg-[#111827] px-3 py-1.5 text-slate-400">
              {PROJECT_METADATA.program} · {PROJECT_METADATA.institution}
            </div>
          </div>
        </div>

        {/* 4 Glowing KPI Cards Ribbon */}
        <div className="mt-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
          {KPI_CARDS.map((card) => (
            <div
              key={card.id}
              className={`foundry-card relative overflow-hidden p-4 transition duration-200 ${card.accentBorder} ${card.glowClass}`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-mono text-[10px] font-semibold tracking-wider text-slate-400">
                  {card.label}
                </span>
                <Sparkles className={`h-3.5 w-3.5 ${card.accentText} opacity-80`} />
              </div>

              <div className="mt-2 flex items-baseline gap-2.5">
                <span className={`font-mono text-3xl font-bold tracking-tight ${card.accentText}`}>
                  {card.value}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span
                  className={`inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[10px] font-medium ${card.badgeBg}`}
                >
                  {card.metric}
                </span>
              </div>

              <div className="mt-2.5 flex items-center justify-between border-t border-[#1F2937] pt-2 text-[11px]">
                <span className="font-mono text-slate-300">{card.delta}</span>
              </div>
              <p className="mt-0.5 text-[11px] text-slate-500">{card.subtext}</p>
            </div>
          ))}
        </div>

        {/* Module Navigation Tabs */}
        <nav className="mt-5 flex flex-wrap items-center gap-2 border-t border-[#1F2937] pt-4">
          {NAV_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={`group inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-medium transition-all ${
                  isActive
                    ? 'border-cyan-500/60 bg-cyan-500/15 text-cyan-200 shadow-glow-cyan'
                    : 'border-[#1F2937] bg-[#111827] text-slate-400 hover:border-slate-600 hover:bg-[#162033] hover:text-slate-200'
                }`}
              >
                <span
                  className={`font-mono text-[10px] font-bold ${
                    isActive ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-300'
                  }`}
                >
                  {tab.code}
                </span>
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden md:inline">{tab.label}</span>
                <span className="md:hidden">{tab.shortLabel}</span>
              </button>
            );
          })}

          <div className="ml-auto hidden items-center gap-2 font-mono text-[11px] text-slate-500 2xl:flex">
            <Activity className="h-3.5 w-3.5 text-emerald-400" />
            <span>TELEMETRY ENGINE: ONLINE · SPECTRAL RBF KERNEL READY</span>
          </div>
        </nav>
      </div>
    </header>
  );
}
