import React, { useState, useMemo } from 'react';
import {
  ExternalLink,
  Database,
  Scale,
  Activity,
  CheckCircle2,
  FlaskConical,
  ArrowRight,
  Sparkles,
  Layers,
  ShieldAlert,
  BarChart2,
  Network,
  Grid3X3,
  Search,
  Sliders,
  TrendingUp,
  UserCheck,
  Zap,
} from 'lucide-react';
import { STUDY_METADATA, DOSHA_PALETTE } from '../data/literatureData';
import { retrieveTopKReal } from '../utils/distanceEngine';

const CLUSTER_PALETTE = [
  '#0F766E', // teal
  '#D97706', // amber
  '#2563EB', // blue
  '#9333EA', // purple
  '#DC2626', // red
  '#059669', // emerald
  '#475569', // slate
  '#E11D48', // rose
];

function fmt(v, digits = 4) {
  return typeof v === 'number' ? v.toFixed(digits) : '—';
}

export default function OverviewPage({
  realData,
  syntheticData,
  expertReview,
  realCases,
  descriptive,
  clusteringsData,
  embeddingsData,
  onNavigate,
}) {
  const [sampleIdx, setSampleIdx] = useState(0);
  const [activeMatrixMetric, setActiveMatrixMetric] = useState('gower');
  const [matrixHoveredCell, setMatrixHoveredCell] = useState(null);
  const [scatterColorMode, setScatterColorMode] = useState('dosha'); // 'dosha' | 'cluster'
  const [scatterHoveredPoint, setScatterHoveredPoint] = useState(null);

  const realMeta = realData?.provenance?.dataset_metadata || {};
  const fullMetrics = realData?.full_29_traits?.metrics || {};
  const shuffled = realData?.shuffled_control;
  const geEquiv = realData?.equivalence?.find(
    (e) => e.metric_a === 'gower' && e.metric_b === 'euclidean'
  );

  const sweepD = syntheticData?.sweeps?.numeric_cohens_d?.cell_ids;
  const d0Cell = sweepD ? syntheticData?.cells?.[sweepD[0]] : null;
  const d2Cell = sweepD ? syntheticData?.cells?.[sweepD[sweepD.length - 1]] : null;

  const classEntries = Object.entries(realMeta.class_counts || {});

  // Live mini similarity preview on the dashboard
  const records = realCases?.records || [];
  const currentRecord = records[sampleIdx] || records[0];
  const quickRetrieval = useMemo(() => {
    if (!currentRecord || !realCases?.categorical_cols) return null;
    return retrieveTopKReal(currentRecord, realCases, 5);
  }, [currentRecord, realCases]);

  // Cramers V feature importance list from descriptive data
  const featureRanking = useMemo(() => {
    if (!descriptive?.cramers_v) return [];
    const items = Array.isArray(descriptive.cramers_v)
      ? descriptive.cramers_v
      : Object.values(descriptive.cramers_v);
    return [...items].sort((a, b) => (b.cramers_v ?? 0) - (a.cramers_v ?? 0)).slice(0, 8);
  }, [descriptive]);

  // Submatrix for the interactive N x N distance matrix (e.g. 16 x 16 patients)
  const matrixSize = 16;
  const distanceMatrix = useMemo(() => {
    const rawMatrix = descriptive?.sample_240?.distance_matrices?.[activeMatrixMetric];
    if (!rawMatrix || !Array.isArray(rawMatrix)) return null;
    return rawMatrix.slice(0, matrixSize).map((row) => row.slice(0, matrixSize));
  }, [descriptive, activeMatrixMetric, matrixSize]);

  const matrixPatients = useMemo(() => {
    const indices = descriptive?.sample_240?.indices || [];
    const labels = descriptive?.sample_240?.class_labels || [];
    const pts = [];
    for (let i = 0; i < matrixSize; i++) {
      const globalIdx = indices[i] ?? i;
      pts.push({
        idx: i,
        caseId: `P-${String(globalIdx + 1).padStart(4, '0')}`,
        dosha: labels[i] || 'Unknown',
      });
    }
    return pts;
  }, [descriptive, matrixSize]);

  // 2D MDS plot points from embeddingsData
  const mdsPoints = useMemo(() => {
    const coords = embeddingsData?.datasets?.real?.[activeMatrixMetric] || [];
    const realLabels = realCases?.labels || [];
    const classes = clusteringsData?.classes || [];
    const clustering = clusteringsData?.clusterings?.real?.[activeMatrixMetric]?.average?.['6'];

    if (!coords || coords.length === 0) return [];
    const pts = [];
    // Subsample every 3rd point for smooth interactive canvas (~400 points)
    for (let i = 0; i < coords.length; i += 3) {
      if (!coords[i]) continue;
      const [x, y] = coords[i];
      const clusterIdx = clustering?.labels?.[i] ?? 0;
      const doshaIdx = realLabels[i] ?? 0;
      const doshaName = classes[doshaIdx] || 'Unknown';
      pts.push({
        idx: i,
        caseId: `P-${String(i + 1).padStart(4, '0')}`,
        x,
        y,
        cluster: clusterIdx,
        doshaName,
        color:
          scatterColorMode === 'cluster'
            ? CLUSTER_PALETTE[clusterIdx % CLUSTER_PALETTE.length]
            : DOSHA_PALETTE[doshaName] || '#8C7866',
      });
    }
    return pts;
  }, [embeddingsData, activeMatrixMetric, realCases, clusteringsData, scatterColorMode]);

  // Distance histogram details
  const hist = descriptive?.distance_histograms?.[activeMatrixMetric] || descriptive?.distance_histograms?.gower;

  return (
    <div className="space-y-6">
      {/* 1. COMPACT HERO SECTION (<= 20% Desktop Viewport, Warm Beige & Glowing Wave Mockup Style) */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#cbbbae] via-[#bfad9a] to-[#9e8974] p-5 sm:p-6 text-white shadow-[0_12px_40px_-10px_rgba(145,120,95,0.22)] border border-[#e8ded2]/60">
        {/* Luminous Glowing Wave accent from reference mockup */}
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full opacity-80"
          preserveAspectRatio="none"
          viewBox="0 0 1200 240"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <filter id="hero-glow-wave" x="-20%" y="-40%" width="140%" height="200%" filterUnits="userSpaceOnUse">
              <feGaussianBlur stdDeviation="10" result="blur1" />
              <feGaussianBlur stdDeviation="22" result="blur2" />
              <feMerge>
                <feMergeNode in="blur2" />
                <feMergeNode in="blur1" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id="wave-grad-line" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.15" />
              <stop offset="30%" stopColor="#fffaf0" stopOpacity="0.85" />
              <stop offset="60%" stopColor="#ffffff" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.2" />
            </linearGradient>
          </defs>
          <path
            d="M-50 180 Q 280 230 520 135 T 1080 85 Q 1160 80 1260 130"
            stroke="url(#wave-grad-line)"
            strokeWidth="3.5"
            fill="none"
            filter="url(#hero-glow-wave)"
          />
          <path
            d="M-50 180 Q 280 230 520 135 T 1080 85 Q 1160 80 1260 130"
            stroke="#ffffff"
            strokeWidth="1.5"
            fill="none"
            opacity="0.9"
          />
        </svg>

        {/* Ambient Top Glow Orbs */}
        <div className="pointer-events-none absolute -top-16 -right-16 h-64 w-64 rounded-full bg-white/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-amber-100/15 blur-3xl" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2 max-w-3xl">
            {/* Pill Capsule Platform Identifier */}
            <div className="inline-flex items-center gap-2 rounded-full border border-white/45 bg-white/20 backdrop-blur-md px-3.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-white shadow-2xs">
              <Sparkles className="h-3 w-3 text-amber-200" />
              <span>AYURVEDIC CLINICAL INTELLIGENCE</span>
              <span className="text-white/40">|</span>
              <span className="text-amber-100 font-normal">N = {realMeta.n_rows} Cohort</span>
            </div>

            {/* Main Clinical Heading */}
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-white leading-tight">
              Clinical Insights Through Intelligent Patient Similarity
            </h1>

            {/* Short Platform Description */}
            <p className="text-xs sm:text-sm text-[#fbf6ef] font-normal leading-relaxed max-w-2xl">
              High-precision distance metric benchmarking and phenotypic archetype analysis across mixed-type
              clinical records, validating <strong>Gower</strong>, <strong>Euclidean</strong>, and <strong>Cosine</strong> engines.
            </p>
          </div>

          {/* Quick Actions & Status Pill */}
          <div className="flex flex-wrap md:flex-col items-start md:items-end gap-2.5 shrink-0">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/15 backdrop-blur-sm px-3 py-1 text-[11px] text-white/95 font-medium shadow-2xs">
              <span className="h-2 w-2 rounded-full bg-emerald-300 animate-pulse" />
              <span>Verified Cohort N = {realMeta.n_rows} · {realMeta.n_categorical} Traits</span>
            </div>

            <div className="flex items-center gap-2">
              {onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate('/workbench')}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white text-[#382b20] hover:bg-[#faf4ec] px-4 py-1.5 text-xs font-bold transition shadow-md hover:shadow-lg transform active:scale-95"
                >
                  <FlaskConical className="h-3.5 w-3.5 text-amber-800" />
                  Launch Workbench
                  <ArrowRight className="h-3 w-3 text-[#382b20]" />
                </button>
              )}

              {onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate('/comparison')}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/15 hover:bg-white/25 backdrop-blur-md px-3.5 py-1.5 text-xs font-semibold text-white transition shadow-2xs"
                >
                  <Scale className="h-3.5 w-3.5 text-amber-200" />
                  Benchmark Matrix
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 2. TOP-LEVEL KPI SECTION (4 Frosted-Glass Cards) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Patient Records */}
        <div className="glass-panel glass-panel-interactive rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#7c6957] mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#63503f]">Total Records</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#ede3d5] text-[#523f30] border border-[#dccfbf]">
              <Database className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="num text-2xl sm:text-3xl font-extrabold text-[#2c221a] tracking-tight">
              {realMeta.n_rows}
            </div>
            <div className="text-xs text-[#736151] mt-1">
              Case records in <code className="num font-mono text-[11px] text-[#4f3d2f]">{realMeta.csv_member}</code>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#e8dfd3] flex items-center justify-between text-[11px] text-[#5e4d3d]">
            <span>Completeness:</span>
            <span className="num font-semibold text-[#3b2e22] bg-[#f0e8dc] px-2 py-0.5 rounded-full border border-[#d8cab9]">
              100% Validated
            </span>
          </div>
        </div>

        {/* KPI 2: Clinical Attributes Analyzed */}
        <div className="glass-panel glass-panel-interactive rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#7c6957] mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#63503f]">Attributes Analyzed</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#ede3d5] text-[#523f30] border border-[#dccfbf]">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="num text-2xl sm:text-3xl font-extrabold text-[#2c221a] tracking-tight">
              {realMeta.n_categorical}
            </div>
            <div className="text-xs text-[#736151] mt-1">
              Categorical traits across physical &amp; metabolic markers
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#e8dfd3] flex items-center justify-between text-[11px] text-[#5e4d3d]">
            <span>Encoding:</span>
            <span className="num font-semibold text-[#3b2e22] bg-[#f0e8dc] px-2 py-0.5 rounded-full border border-[#d8cab9]">
              One-Hot &amp; Gower Range
            </span>
          </div>
        </div>

        {/* KPI 3: Number of Patient Clusters */}
        <div className="glass-panel glass-panel-interactive rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#7c6957] mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#63503f]">Patient Clusters</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#ede3d5] text-[#523f30] border border-[#dccfbf]">
              <Network className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="num text-2xl sm:text-3xl font-extrabold text-[#2c221a] tracking-tight">
              6
            </div>
            <div className="text-xs text-[#736151] mt-1">
              Unsupervised archetypes (Prakriti constitutional classes)
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#e8dfd3] flex items-center justify-between text-[11px] text-[#5e4d3d]">
            <span>Agglomeration:</span>
            <span className="num font-semibold text-[#3b2e22] bg-[#f0e8dc] px-2 py-0.5 rounded-full border border-[#d8cab9]">
              Average &amp; Complete
            </span>
          </div>
        </div>

        {/* KPI 4: Active Similarity Metric & Parity */}
        <div className="glass-panel glass-panel-interactive rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#7c6957] mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#63503f]">Active Metric Parity</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#ede3d5] text-[#523f30] border border-[#dccfbf]">
              <Scale className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="num text-2xl sm:text-3xl font-extrabold text-[#2c221a] tracking-tight">
              ρ = {fmt(geEquiv?.spearman_rho, 4)}
            </div>
            <div className="text-xs text-[#736151] mt-1">
              Spearman rank correlation (Gower vs Euclidean vs Cosine)
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#e8dfd3] flex items-center justify-between text-[11px] text-[#5e4d3d]">
            <span>Top-5 overlap:</span>
            <span className="num font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              {fmt(geEquiv?.mean_top5_overlap, 4)} Monotonic
            </span>
          </div>
        </div>
      </section>

      {/* 3. MAIN ANALYTICS WORKSPACE: Large Interactive Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Large Patient Distribution & 4-Metric Performance (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* VISUALIZATION 1: Large Interactive Prakriti & Tridosha Distribution */}
          <div className="glass-panel rounded-3xl p-6 shadow-xs space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e5dcce] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-[#ede3d5] text-[#4f3d2f] border border-[#d8cab9] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                    Phenotypic Distribution
                  </span>
                  <h2 className="text-base font-bold text-[#2b221a]">
                    Prakriti Cohort Distribution (N = {realMeta.n_rows})
                  </h2>
                </div>
                <p className="text-xs text-[#705e4e] mt-1">
                  Balanced clinical representation across 6 Ayurvedic constitutional types (200 patients per class).
                </p>
              </div>
              <span className="num text-xs font-semibold text-[#5c4a3b] bg-white/70 px-3 py-1 rounded-full border border-[#dccfbf]">
                Total: {realMeta.n_rows}
              </span>
            </div>

            {/* Large Horizontal Segmented Cohort Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-[#6e5c4c] font-medium px-0.5">
                <span>Multi-Dosha Cohort Segmentation:</span>
                <span className="num font-semibold">100.0% Partitioned</span>
              </div>
              <div className="h-5 w-full rounded-full overflow-hidden flex shadow-inner border border-[#d5c7b5]/80 p-0.5 bg-white/60">
                {classEntries.map(([cls, cnt]) => {
                  const pct = realMeta.n_rows ? (cnt / realMeta.n_rows) * 100 : 0;
                  return (
                    <div
                      key={cls}
                      title={`${cls}: ${cnt} patients (${pct.toFixed(1)}%)`}
                      style={{
                        width: `${pct}%`,
                        backgroundColor: DOSHA_PALETTE[cls] || '#8C7866',
                      }}
                      className="h-full first:rounded-l-full last:rounded-r-full transition-all duration-300 hover:opacity-90 relative group"
                    />
                  );
                })}
              </div>
            </div>

            {/* 6 Prakriti Class Breakdown Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
              {classEntries.map(([cls, cnt]) => {
                const pct = realMeta.n_rows ? (cnt / realMeta.n_rows) * 100 : 0;
                return (
                  <div
                    key={cls}
                    className="glass-panel rounded-2xl p-3.5 border border-[#dfd3c3] hover:border-[#bda995] transition-all bg-white/65 hover:bg-white/90 space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs font-semibold text-[#3a2d22]">
                      <div className="flex items-center gap-1.5 truncate">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white"
                          style={{ backgroundColor: DOSHA_PALETTE[cls] }}
                        />
                        <span className="truncate">{cls}</span>
                      </div>
                      <span className="num font-mono text-[11px] text-[#786655] font-semibold">{pct.toFixed(1)}%</span>
                    </div>

                    <div className="flex items-baseline justify-between">
                      <div className="num text-lg font-bold text-[#2c221a]">
                        {cnt}
                      </div>
                      <span className="text-[10px] text-[#806e5e]">cases</span>
                    </div>

                    <div className="h-1.5 w-full rounded-full bg-[#ebe2d5] overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: DOSHA_PALETTE[cls] }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* VISUALIZATION 2: Symmetrical 4-Metric Algorithmic Comparison */}
          <div className="glass-panel rounded-3xl p-6 shadow-xs space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e5dcce] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-[#ede3d5] text-[#4f3d2f] border border-[#d8cab9] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                    Benchmarking Matrix
                  </span>
                  <h2 className="text-base font-bold text-[#2b221a]">
                    Four-Metric Algorithmic Comparison
                  </h2>
                </div>
                <p className="text-xs text-[#705e4e] mt-1">
                  Leave-One-Out nearest neighbor precision and unsupervised clustering concordance against chance control.
                </p>
              </div>
              {onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate('/comparison')}
                  className="text-xs font-semibold text-[#5a4635] hover:text-[#2b221a] flex items-center gap-1 transition"
                >
                  Full Evaluation Table &rarr;
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-[#e5dcce] bg-[#f5ede3]/70 text-[#695646]">
                    <th className="py-2.5 px-3 font-bold">Metric Algorithm</th>
                    <th className="py-2.5 px-3 text-right font-bold">kNN Macro-F1</th>
                    <th className="py-2.5 px-3 text-right font-bold">LOO P@1</th>
                    <th className="py-2.5 px-3 text-right font-bold">LOO P@5</th>
                    <th className="py-2.5 px-3 text-right font-bold">ARI (Avg)</th>
                    <th className="py-2.5 px-3 text-right font-bold">NMI (Avg)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ede4d8]">
                  {['gower', 'euclidean', 'cosine'].map((mKey) => {
                    const m = fullMetrics[mKey];
                    if (!m) return null;
                    return (
                      <tr key={mKey} className="hover:bg-white/80 transition">
                        <td className="py-2.5 px-3 font-semibold text-[#2c221a] capitalize flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-amber-700" />
                          {mKey} Distance
                        </td>
                        <td className="num py-2.5 px-3 text-right font-bold text-[#2b221a]">
                          {fmt(m.knn_cv?.macro_f1_mean, 4)}
                        </td>
                        <td className="num py-2.5 px-3 text-right font-semibold text-[#48372a]">
                          {fmt(m.loo_retrieval?.macro?.p_at_1, 4)}
                        </td>
                        <td className="num py-2.5 px-3 text-right font-semibold text-[#48372a]">
                          {fmt(m.loo_retrieval?.macro?.p_at_5, 4)}
                        </td>
                        <td className="num py-2.5 px-3 text-right text-[#574435]">
                          {fmt(m.clustering?.linkages?.average?.ari, 4)}
                        </td>
                        <td className="num py-2.5 px-3 text-right text-[#574435]">
                          {fmt(m.clustering?.linkages?.average?.nmi, 4)}
                        </td>
                      </tr>
                    );
                  })}
                  {shuffled && (
                    <tr className="bg-[#f0e8dc]/60 text-[#7c6957] italic">
                      <td className="py-2.5 px-3 font-medium flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-[#9e8c7c]" />
                        Permutation Shuffled Control
                      </td>
                      <td className="num py-2.5 px-3 text-right">
                        {fmt(shuffled.metrics?.gower?.knn_macro_f1_mean, 4)}
                      </td>
                      <td className="num py-2.5 px-3 text-right">
                        {fmt(shuffled.metrics?.gower?.loo_macro_p_at_1, 4)}
                      </td>
                      <td className="num py-2.5 px-3 text-right">
                        {fmt(shuffled.metrics?.gower?.loo_macro_p_at_5, 4)}
                      </td>
                      <td className="num py-2.5 px-3 text-right">
                        {fmt(shuffled.metrics?.gower?.ari_average, 4)}
                      </td>
                      <td className="num py-2.5 px-3 text-right">
                        {fmt(shuffled.metrics?.gower?.nmi_average, 4)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Proof of Exact Equivalence Callout */}
            <div className="rounded-2xl border border-[#dfd3c3] bg-white/70 p-4 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-[#3d2f23]">
                <Scale className="h-3.5 w-3.5 text-amber-700" />
                <span>Exact Monotonic Mathematical Equivalence</span>
              </div>
              <p className="text-[11px] leading-relaxed text-[#615041]">
                On categorical records, Gower and Cosine distance identically equal Hamming / {realMeta.n_categorical},
                while Euclidean distance equals the square root of 58 times Gower distance. All 3 metrics yield an
                exact Spearman correlation of 1.0000, ensuring strictly identical patient nearest-neighbor orderings.
              </p>
            </div>
          </div>

          {/* VISUALIZATION 3: Clinical Feature Importance (Cramer's V) */}
          <div className="glass-panel rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e5dcce] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-[#ede3d5] text-[#4f3d2f] border border-[#d8cab9] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                    Feature Discriminance
                  </span>
                  <h2 className="text-base font-bold text-[#2b221a]">
                    Clinical Feature Importance &amp; Association (Top-8 Traits)
                  </h2>
                </div>
                <p className="text-xs text-[#705e4e] mt-1">
                  Phenotypic association strength across Dosha categories ranked by Cramer&apos;s V.
                </p>
              </div>
              <span className="text-[11px] text-[#7d6b5b] font-mono">
                {realMeta.n_categorical} Total Traits
              </span>
            </div>

            <div className="space-y-3 pt-1">
              {featureRanking.map((feat, fIdx) => {
                const cvVal = feat.cramers_v ?? 0;
                const barWidth = Math.min(100, Math.max(8, cvVal * 150));
                return (
                  <div key={feat.trait || fIdx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#3b2d21] truncate max-w-[240px]">
                        {feat.trait}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="num font-mono text-[11px] text-[#7d6b5b]">
                          χ² = {fmt(feat.chi2, 1)}
                        </span>
                        <span className="num font-bold text-[#2c221a] bg-[#f0e8dc] px-2 py-0.5 rounded-md border border-[#d8cab9]">
                          V = {fmt(cvVal, 4)}
                        </span>
                      </div>
                    </div>
                    <div className="h-2 w-full rounded-full bg-[#ede4d8] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#bfae9c] to-[#7a6451] transition-all duration-500"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Distance Matrix Heatmap, 2D MDS, and Live Retrieval (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* VISUALIZATION 4: Interactive N x N Distance Matrix Heatmap */}
          <div className="glass-panel rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e5dcce] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-[#ede3d5] text-[#4f3d2f] border border-[#d8cab9] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                    Heatmap
                  </span>
                  <h2 className="text-sm font-bold text-[#2b221a]">
                    Interactive {matrixSize} × {matrixSize} Distance Matrix
                  </h2>
                </div>
                <p className="text-xs text-[#705e4e] mt-1">
                  Pairwise distance inspection across patient records.
                </p>
              </div>

              {/* Metric Switcher */}
              <div className="flex items-center gap-1 rounded-full border border-[#dccfbf] bg-white/70 p-0.5 text-[11px]">
                {['gower', 'euclidean', 'cosine'].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setActiveMatrixMetric(m)}
                    className={`rounded-full px-2.5 py-0.5 capitalize transition ${
                      activeMatrixMetric === m
                        ? 'bg-[#3d3126] text-white font-bold shadow-2xs'
                        : 'text-[#6e5c4c] hover:text-[#2b221a]'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Matrix Grid Canvas */}
            {distanceMatrix && (
              <div className="space-y-3">
                <div className="flex justify-center bg-white/60 p-3 rounded-2xl border border-[#e3d7c7]">
                  <div
                    className="grid gap-[2px]"
                    style={{
                      gridTemplateColumns: `repeat(${matrixSize}, minmax(0, 1fr))`,
                    }}
                  >
                    {distanceMatrix.map((row, rIdx) =>
                      row.map((val, cIdx) => {
                        // Normalize color between 0 and max (usually ~0.8)
                        const norm = Math.min(1, Math.max(0, val / 0.85));
                        // Light ivory (#fcf9f4) to deep espresso (#3a2c20)
                        const bgLight = 248 - norm * 180;
                        const bgMid = 240 - norm * 190;
                        const bgDark = 230 - norm * 195;
                        const isHovered =
                          matrixHoveredCell &&
                          matrixHoveredCell.r === rIdx &&
                          matrixHoveredCell.c === cIdx;

                        return (
                          <div
                            key={`${rIdx}-${cIdx}`}
                            onMouseEnter={() =>
                              setMatrixHoveredCell({
                                r: rIdx,
                                c: cIdx,
                                val,
                                p1: matrixPatients[rIdx],
                                p2: matrixPatients[cIdx],
                              })
                            }
                            onMouseLeave={() => setMatrixHoveredCell(null)}
                            className={`h-4 w-4 sm:h-5 sm:w-5 rounded-[2px] transition-transform cursor-pointer ${
                              isHovered ? 'scale-125 z-10 ring-2 ring-amber-600' : 'hover:opacity-90'
                            }`}
                            style={{
                              backgroundColor: `rgb(${bgLight}, ${bgMid}, ${bgDark})`,
                            }}
                          />
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Matrix Cell Inspection Details */}
                <div className="rounded-xl border border-[#dfd3c3] bg-white/70 p-3 text-xs min-h-[56px] flex items-center justify-between">
                  {matrixHoveredCell ? (
                    <div className="w-full flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-[#2c221a]">
                          {matrixHoveredCell.p1.caseId} ({matrixHoveredCell.p1.dosha}) ↔{' '}
                          {matrixHoveredCell.p2.caseId} ({matrixHoveredCell.p2.dosha})
                        </div>
                        <div className="text-[11px] text-[#786655]">
                          {matrixHoveredCell.p1.dosha === matrixHoveredCell.p2.dosha
                            ? 'Intra-Dosha Cohort Pair'
                            : 'Inter-Dosha Cohort Pair'}
                        </div>
                      </div>
                      <div className="num text-right font-mono font-bold text-amber-900 bg-[#f3ece0] px-2.5 py-1 rounded-lg border border-[#dccfbf]">
                        d = {fmt(matrixHoveredCell.val, 4)}
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-[#806e5e] italic w-full text-center">
                      Hover over any cell in the {matrixSize}×{matrixSize} grid to inspect pairwise distance.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* VISUALIZATION 5: Patient Clustering 2D MDS Scatter Plot */}
          <div className="glass-panel rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e5dcce] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-[#ede3d5] text-[#4f3d2f] border border-[#d8cab9] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                    Projection
                  </span>
                  <h2 className="text-sm font-bold text-[#2b221a]">
                    2D MDS Patient Embedding
                  </h2>
                </div>
                <p className="text-xs text-[#705e4e] mt-1">
                  Multidimensional scaling scatter view ({activeMatrixMetric.toUpperCase()} distance).
                </p>
              </div>

              {/* Color Mode Switcher */}
              <div className="flex items-center gap-1 rounded-full border border-[#dccfbf] bg-white/70 p-0.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setScatterColorMode('dosha')}
                  className={`rounded-full px-2.5 py-0.5 transition ${
                    scatterColorMode === 'dosha'
                      ? 'bg-[#3d3126] text-white font-bold shadow-2xs'
                      : 'text-[#6e5c4c] hover:text-[#2b221a]'
                  }`}
                >
                  Dosha Label
                </button>
                <button
                  type="button"
                  onClick={() => setScatterColorMode('cluster')}
                  className={`rounded-full px-2.5 py-0.5 transition ${
                    scatterColorMode === 'cluster'
                      ? 'bg-[#3d3126] text-white font-bold shadow-2xs'
                      : 'text-[#6e5c4c] hover:text-[#2b221a]'
                  }`}
                >
                  Cluster (k=6)
                </button>
              </div>
            </div>

            {/* SVG MDS Scatter Viewport */}
            <div className="relative flex justify-center bg-white/70 rounded-2xl border border-[#e3d7c7] p-3 overflow-hidden">
              <svg width={360} height={240} viewBox="0 0 360 240" className="overflow-visible">
                {/* Background Grid */}
                <rect x={10} y={10} width={340} height={220} fill="#fcfaf7" rx={8} stroke="#eae0d4" />
                <line x1={10} y1={120} x2={350} y2={120} stroke="#f0e7db" strokeDasharray="3 3" />
                <line x1={180} y1={10} x2={180} y2={230} stroke="#f0e7db" strokeDasharray="3 3" />

                {mdsPoints.map((pt) => {
                  const cx = 20 + pt.x * 320;
                  const cy = 20 + pt.y * 200;
                  const isHovered = scatterHoveredPoint && scatterHoveredPoint.idx === pt.idx;
                  return (
                    <circle
                      key={pt.idx}
                      cx={cx}
                      cy={cy}
                      r={isHovered ? 5.5 : 3}
                      fill={pt.color}
                      opacity={isHovered ? 1 : 0.75}
                      stroke="#ffffff"
                      strokeWidth={0.75}
                      onMouseEnter={() => setScatterHoveredPoint(pt)}
                      onMouseLeave={() => setScatterHoveredPoint(null)}
                      className="cursor-pointer transition-all"
                    />
                  );
                })}
              </svg>
            </div>

            {/* Scatter Point Hover Tooltip Bar */}
            <div className="rounded-xl border border-[#dfd3c3] bg-white/70 px-3 py-2 text-xs flex items-center justify-between min-h-[42px]">
              {scatterHoveredPoint ? (
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: scatterHoveredPoint.color }}
                    />
                    <span className="font-semibold text-[#2c221a]">{scatterHoveredPoint.caseId}</span>
                    <span className="text-[#786655]">({scatterHoveredPoint.doshaName})</span>
                  </div>
                  <span className="num text-[11px] text-[#5e4d3e] font-mono">
                    Cluster #{scatterHoveredPoint.cluster + 1}
                  </span>
                </div>
              ) : (
                <span className="text-xs text-[#806e5e] italic mx-auto">
                  Hover over any patient dot to view archetype &amp; cluster assignment.
                </span>
              )}
            </div>
          </div>

          {/* VISUALIZATION 6: Live Top-5 Nearest Neighbor Retrieval Preview */}
          {currentRecord && quickRetrieval && (
            <div className="glass-panel rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e5dcce] pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-[#ede3d5] text-[#4f3d2f] border border-[#d8cab9] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                      Live Retrieval
                    </span>
                    <h2 className="text-sm font-bold text-[#2b221a]">
                      Top-5 Similar Patient Case Retrieval
                    </h2>
                  </div>
                  <p className="text-xs text-[#705e4e] mt-1">
                    Real-time nearest neighbour ranking for selected query record.
                  </p>
                </div>

                {/* Quick Case Switcher */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-[#705e4e] font-medium">Case:</span>
                  {[0, 1, 2, 3].map((idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSampleIdx(idx)}
                      className={`rounded-full px-2.5 py-0.5 text-xs font-mono transition ${
                        sampleIdx === idx
                          ? 'bg-[#3d3126] text-white font-bold shadow-2xs'
                          : 'border border-[#dccfbf] bg-white/70 text-[#6e5c4c] hover:bg-white'
                      }`}
                    >
                      #{idx + 1}
                    </button>
                  ))}
                </div>
              </div>

              {/* Selected Query Case Strip */}
              <div className="rounded-2xl border border-[#dfd3c3] bg-white/75 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="num font-bold text-[#2c221a] text-xs">
                    Query Case: {currentRecord.case_id}
                  </span>
                  <span
                    className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-white shadow-2xs"
                    style={{ backgroundColor: DOSHA_PALETTE[currentRecord.dataset_label] || '#8C7866' }}
                  >
                    {currentRecord.dataset_label}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-[#615041] pt-1 border-t border-[#ede4d8]">
                  <div><span className="text-[#8a7767]">Body Size:</span> {currentRecord.traits[0]}</div>
                  <div><span className="text-[#8a7767]">Weight:</span> {currentRecord.traits[1]}</div>
                  <div><span className="text-[#8a7767]">Appetite:</span> {currentRecord.traits[9]}</div>
                  <div><span className="text-[#8a7767]">Sleep:</span> {currentRecord.traits[12]}</div>
                </div>
              </div>

              {/* Top-5 Nearest Neighbors Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#e5dcce] text-[#736151]">
                      <th className="py-2 px-2.5 font-bold">Rank</th>
                      <th className="py-2 px-2.5 font-bold">Case ID</th>
                      <th className="py-2 px-2.5 font-bold">Archetype</th>
                      <th className="py-2 px-2.5 text-right font-bold">Gower Dist</th>
                      <th className="py-2 px-2.5 text-right font-bold">Matches</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ede4d8]">
                    {quickRetrieval.byMetric.gower?.map((item, rIdx) => (
                      <tr key={item.record.case_id} className="hover:bg-white/70 transition">
                        <td className="num py-2 px-2.5 font-bold text-[#8a7767]">#{rIdx + 1}</td>
                        <td className="num py-2 px-2.5 font-bold text-[#2c221a]">{item.record.case_id}</td>
                        <td className="py-2 px-2.5">
                          <span
                            className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white shadow-2xs"
                            style={{ backgroundColor: DOSHA_PALETTE[item.record.dataset_label] || '#8C7866' }}
                          >
                            {item.record.dataset_label}
                          </span>
                        </td>
                        <td className="num py-2 px-2.5 text-right font-mono font-semibold text-amber-900">
                          {fmt(item.distances.gower, 4)}
                        </td>
                        <td className="num py-2 px-2.5 text-right font-medium text-[#5c4a3b]">
                          {item.matchedCount} / {item.totalTraits}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate('/workbench')}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-full bg-[#3d3126] hover:bg-[#282019] text-white py-2 text-xs font-semibold transition shadow-sm"
                >
                  <FlaskConical className="h-3.5 w-3.5 text-amber-300" />
                  Test New Patient Intake in Workbench &rarr;
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 4. CLINICAL METHODOLOGY & AUDIT INTEGRITY CARDS */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="glass-panel rounded-2xl p-5 space-y-2">
          <div className="flex items-center gap-2 text-[#2c221a] font-bold text-xs">
            <Scale className="h-4 w-4 text-amber-800" />
            <span>Monotonic Distance Equivalence</span>
          </div>
          <p className="text-xs text-[#635243] leading-relaxed">
            On the verified dataset of {realMeta.n_categorical} categorical traits without numeric columns,
            Gower, Euclidean, and Cosine distances generate identical nearest-neighbor rankings with Spearman ρ = 1.0000.
          </p>
        </div>

        {/* Card 2 */}
        <div className="glass-panel rounded-2xl p-5 space-y-2">
          <div className="flex items-center gap-2 text-[#2c221a] font-bold text-xs">
            <Activity className="h-4 w-4 text-amber-800" />
            <span>Regime Shift Divergence</span>
          </div>
          <p className="text-xs text-[#635243] leading-relaxed">
            When continuous vitals are introduced, algorithmic advantages diverge: Gower dominates under noise
            and outliers, while Cosine excels when numeric class separation is strong.
          </p>
        </div>

        {/* Card 3 */}
        <div className="glass-panel rounded-2xl p-5 space-y-2">
          <div className="flex items-center gap-2 text-[#2c221a] font-bold text-xs">
            <CheckCircle2 className="h-4 w-4 text-amber-800" />
            <span>Deterministic Label Notice</span>
          </div>
          <p className="text-xs text-[#635243] leading-relaxed">
            No conflicting labels exist for identical feature sets. Retrieval outputs represent nearest dataset
            records and must not be interpreted as independent diagnostic predictions.
          </p>
        </div>

        {/* Card 4 */}
        <div className="glass-panel rounded-2xl p-5 space-y-2">
          <div className="flex items-center gap-2 text-[#2c221a] font-bold text-xs">
            <ShieldAlert className="h-4 w-4 text-amber-800" />
            <span>Unsupervised Audit Scope</span>
          </div>
          <p className="text-xs text-[#635243] leading-relaxed">
            Hyperparameters are never optimized using ground truth labels. Feature weighting and spectral linkage
            are classified strictly as exploratory extensions (R2).
          </p>
        </div>
      </section>
    </div>
  );
}
