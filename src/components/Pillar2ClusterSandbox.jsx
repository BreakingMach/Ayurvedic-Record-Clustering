import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertOctagon,
  CheckCircle2,
  GitCompare,
  Network,
  Radar,
  Sliders,
  Sparkles,
} from 'lucide-react';
import {
  ALPHA_SWEEP_DATA,
  BENCHMARK_RESULTS,
  DOSHA_COLOR_MAP,
  TRIDOSHA_CLASSES,
  getHybridMetricsAtAlpha,
} from '../data/benchmarkData';
import { CLINICAL_COHORT } from '../data/clinicalCohort';

const METRIC_TABS = [
  { id: 'gower', label: 'Weighted Gower', short: 'Gower', accent: '#10B981' },
  { id: 'euclidean', label: 'Euclidean (OHE)', short: 'Euclidean', accent: '#06B6D4' },
  { id: 'cosine', label: 'Cosine (OHE)', short: 'Cosine', accent: '#F59E0B' },
  { id: 'hybrid', label: 'Proposed Hybrid', short: 'Hybrid', accent: '#8B5CF6' },
];

export default function Pillar2ClusterSandbox({ alpha, setAlpha }) {
  const [selectedMetric, setSelectedMetric] = useState('gower');
  const [regime, setRegime] = useState('optimized'); // 'optimized' (Spectral RBF) | 'baseline' (Avg-Linkage)
  const [hoveredPatient, setHoveredPatient] = useState(null);
  const [showRbfEdges, setShowRbfEdges] = useState(true);
  const canvasRef = useRef(null);

  const hybridLive = useMemo(
    () => getHybridMetricsAtAlpha(alpha, regime),
    [alpha, regime]
  );

  // Active metric stats for readout cards
  const activeBenchmark = useMemo(() => {
    const entry = BENCHMARK_RESULTS.find((m) => m.id === selectedMetric);
    if (selectedMetric === 'hybrid') {
      return {
        ...entry,
        current: hybridLive,
        baselineRef: getHybridMetricsAtAlpha(alpha, 'baseline'),
        optimizedRef: getHybridMetricsAtAlpha(alpha, 'optimized'),
      };
    }
    return {
      ...entry,
      current: entry[regime],
      baselineRef: entry.baseline,
      optimizedRef: entry.optimized,
    };
  }, [selectedMetric, regime, hybridLive, alpha]);

  // Bar chart data dynamically reflecting regime + live alpha for Hybrid
  const comparisonBarData = useMemo(() => {
    return BENCHMARK_RESULTS.map((m) => {
      const stats = m.id === 'hybrid' ? hybridLive : m[regime];
      return {
        metric:
          m.id === 'hybrid'
            ? `Hybrid (α=${alpha.toFixed(2)})`
            : m.shortName,
        ARI: stats.ari,
        NMI: stats.nmi,
        Silhouette: stats.silhouette,
        PrecisionAt5: stats.precisionAt5,
      };
    });
  }, [regime, hybridLive, alpha]);

  // Compute live 2D point positions for current metric & alpha
  const projectedPoints = useMemo(() => {
    return CLINICAL_COHORT.map((p) => {
      let x;
      let y;
      if (selectedMetric === 'hybrid') {
        x = alpha * p.coords.gower[0] + (1 - alpha) * p.coords.cosine[0];
        y = alpha * p.coords.gower[1] + (1 - alpha) * p.coords.cosine[1];
      } else {
        [x, y] = p.coords[selectedMetric];
      }

      // Under baseline Average-Linkage, chaining visually pulls dual/overlapping records inward into a chained bridge
      if (regime === 'baseline' && p.clusters.baseline === 0) {
        x = x * 0.62;
        y = y * 0.56 + 0.08;
      }

      const assignedCluster =
        regime === 'baseline'
          ? p.clusters.baseline
          : selectedMetric === 'hybrid'
            ? alpha >= 0.45
              ? p.clusters.gower
              : p.clusters.cosine
            : p.clusters[selectedMetric];

      return {
        patient: p,
        x,
        y,
        assignedCluster,
        color: DOSHA_COLOR_MAP[p.dosha],
      };
    });
  }, [selectedMetric, regime, alpha]);

  // Draw High-DPI Canvas 2D Topology
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Clear obsidian background
    ctx.fillStyle = '#090D16';
    ctx.fillRect(0, 0, width, height);

    const pad = 42;
    const toPx = (nx, ny) => [
      pad + ((nx + 1.15) / 2.3) * (width - 2 * pad),
      height - pad - ((ny + 1.15) / 2.3) * (height - 2 * pad),
    ];

    // Subtle technical grid
    ctx.strokeStyle = 'rgba(31, 41, 55, 0.55)';
    ctx.lineWidth = 1;
    for (let g = -1; g <= 1; g += 0.5) {
      const [gx] = toPx(g, 0);
      const [, gy] = toPx(0, g);
      ctx.beginPath();
      ctx.moveTo(gx, pad * 0.5);
      ctx.lineTo(gx, height - pad * 0.5);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(pad * 0.5, gy);
      ctx.lineTo(width - pad * 0.5, gy);
      ctx.stroke();
    }

    // Axes crosshair
    const [cx0, cy0] = toPx(0, 0);
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.45)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(cx0, pad * 0.5);
    ctx.lineTo(cx0, height - pad * 0.5);
    ctx.moveTo(pad * 0.5, cy0);
    ctx.lineTo(width - pad * 0.5, cy0);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw RBF Affinity Graph edges or Chaining Collapse Contour
    if (regime === 'baseline') {
      // Highlight Giant Chained Mega-Cluster 0
      const chained = projectedPoints.filter((pt) => pt.assignedCluster === 0);
      if (chained.length > 0) {
        let sumX = 0;
        let sumY = 0;
        chained.forEach((pt) => {
          const [px, py] = toPx(pt.x, pt.y);
          sumX += px;
          sumY += py;
        });
        const mx = sumX / chained.length;
        const my = sumY / chained.length;

        ctx.save();
        ctx.fillStyle = 'rgba(244, 63, 94, 0.08)';
        ctx.strokeStyle = 'rgba(244, 63, 94, 0.65)';
        ctx.lineWidth = 1.6;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.ellipse(mx, my, width * 0.28, height * 0.25, -0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.setLineDash([]);

        // Chaining warning label inside canvas
        ctx.font = '600 10px "JetBrains Mono", monospace';
        ctx.fillStyle = '#FDA4AF';
        ctx.fillText('CHAINING MEGA-CLUSTER (C0 COLLAPSE)', mx - 115, my - height * 0.25 - 8);
        ctx.restore();
      }
    } else {
      // Spectral RBF manifold envelopes per Tridosha class
      const byClass = {};
      projectedPoints.forEach((pt) => {
        if (!byClass[pt.patient.dosha]) byClass[pt.patient.dosha] = [];
        byClass[pt.patient.dosha].push(pt);
      });

      Object.entries(byClass).forEach(([dosha, pts]) => {
        const color = DOSHA_COLOR_MAP[dosha];
        const coords = pts.map((pt) => toPx(pt.x, pt.y));
        const mx = coords.reduce((a, c) => a + c[0], 0) / coords.length;
        const my = coords.reduce((a, c) => a + c[1], 0) / coords.length;
        const rx =
          Math.sqrt(
            coords.reduce((a, c) => a + (c[0] - mx) ** 2, 0) / coords.length
          ) * 1.95;
        const ry =
          Math.sqrt(
            coords.reduce((a, c) => a + (c[1] - my) ** 2, 0) / coords.length
          ) * 1.95;

        // Soft manifold glow
        ctx.save();
        ctx.fillStyle = `${color}14`;
        ctx.strokeStyle = `${color}66`;
        ctx.lineWidth = 1.25;
        ctx.beginPath();
        ctx.ellipse(mx, my, Math.max(24, rx), Math.max(24, ry), 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Optional RBF similarity edges inside cluster
        if (showRbfEdges) {
          ctx.strokeStyle = `${color}28`;
          ctx.lineWidth = 0.8;
          for (let i = 0; i < coords.length; i++) {
            for (let j = i + 1; j < coords.length; j++) {
              const dist = Math.hypot(
                coords[i][0] - coords[j][0],
                coords[i][1] - coords[j][1]
              );
              if (dist < 42) {
                ctx.beginPath();
                ctx.moveTo(coords[i][0], coords[i][1]);
                ctx.lineTo(coords[j][0], coords[j][1]);
                ctx.stroke();
              }
            }
          }
        }

        // Centroid class tag
        ctx.font = '600 10px "JetBrains Mono", monospace';
        ctx.fillStyle = color;
        ctx.fillText(dosha.toUpperCase(), mx - 24, my - Math.max(26, ry) - 5);
        ctx.restore();
      });
    }

    // Plot individual patient nodes
    projectedPoints.forEach((pt) => {
      const [px, py] = toPx(pt.x, pt.y);
      const isHovered = hoveredPatient?.patient.id === pt.patient.id;

      ctx.beginPath();
      ctx.arc(px, py, isHovered ? 7 : 4.2, 0, Math.PI * 2);
      ctx.fillStyle = pt.color;
      ctx.fill();

      // Ring indicator for mis-clustered points in baseline or hover
      if (isHovered) {
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (regime === 'baseline' && pt.assignedCluster === 0) {
        ctx.strokeStyle = 'rgba(244, 63, 94, 0.75)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      } else {
        ctx.strokeStyle = '#090D16';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    });

    // Axis corner labels
    ctx.font = '500 10px "JetBrains Mono", monospace';
    ctx.fillStyle = '#64748B';
    ctx.fillText('SPECTRAL EMBEDDING DIM-1 (φ₁)', width - 195, height - 10);
    ctx.fillText('DIM-2 (φ₂)', 12, 20);
  }, [projectedPoints, regime, hoveredPatient, showRbfEdges]);

  // Hit-test mouse hover on canvas
  const handleCanvasMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const width = rect.width;
    const height = rect.height;
    const pad = 42;

    let closest = null;
    let minD = 16;

    for (const pt of projectedPoints) {
      const px = pad + ((pt.x + 1.15) / 2.3) * (width - 2 * pad);
      const py = height - pad - ((pt.y + 1.15) / 2.3) * (height - 2 * pad);
      const d = Math.hypot(mx - px, my - py);
      if (d < minD) {
        minD = d;
        closest = { ...pt, px, py };
      }
    }
    setHoveredPatient(closest);
  };

  return (
    <div className="space-y-6">
      {/* Top Control Bar: Metric Switcher + Linkage Toggle + Live Alpha Slider */}
      <div className="foundry-card p-5">
        <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
          {/* Metric Switcher */}
          <div>
            <div className="font-mono text-[10px] font-semibold uppercase tracking-widest text-cyan-400">
              PILLAR 2 // DISTANCE KERNEL SELECTOR
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {METRIC_TABS.map((m) => {
                const active = selectedMetric === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedMetric(m.id)}
                    className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 font-mono text-xs font-medium transition ${
                      active
                        ? 'border-cyan-400/70 bg-cyan-500/15 text-white shadow-glow-cyan'
                        : 'border-[#1F2937] bg-[#090D16] text-slate-400 hover:border-slate-600 hover:text-slate-200'
                    }`}
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: m.accent }}
                    />
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Linkage Regime Toggle */}
          <div>
            <div className="font-mono text-[10px] font-semibold uppercase tracking-widest text-violet-400">
              CLUSTERING REGIME COMPARISON
            </div>
            <div className="mt-2 inline-flex rounded-lg border border-[#1F2937] bg-[#090D16] p-1 font-mono text-xs">
              <button
                type="button"
                onClick={() => setRegime('baseline')}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 transition ${
                  regime === 'baseline'
                    ? 'bg-rose-500/20 text-rose-300 ring-1 ring-rose-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <AlertOctagon className="h-3.5 w-3.5" />
                Baseline Avg-Linkage (Chaining)
              </button>
              <button
                type="button"
                onClick={() => setRegime('optimized')}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 transition ${
                  regime === 'optimized'
                    ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Optimized Spectral RBF
              </button>
            </div>
          </div>
        </div>

        {/* Live Alpha Mixing Slider for D_AyurHybrid */}
        <div className="mt-5 rounded-lg border border-violet-500/30 bg-[#090D16] p-4">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div className="flex items-center gap-2.5">
              <Sliders className="h-4 w-4 text-violet-400" />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-white">
                    Live α-Mixing Sandbox (D_AyurHybrid)
                  </span>
                  <span className="rounded border border-violet-500/40 bg-violet-500/15 px-2 py-0.5 font-mono text-[11px] font-bold text-violet-300">
                    α = {alpha.toFixed(2)} · (1 − α) = {(1 - alpha).toFixed(2)}
                  </span>
                  {alpha === 0.75 && (
                    <span className="rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] text-emerald-300">
                      SIH26008 VALIDATED DEFAULT
                    </span>
                  )}
                </div>
                <p className="mt-0.5 font-mono text-[11px] text-slate-400">
                  D_AyurHybrid(x_i, x_j) ={' '}
                  <span className="text-emerald-300">{alpha.toFixed(2)}</span> · D_Gower +{' '}
                  <span className="text-amber-300">{(1 - alpha).toFixed(2)}</span> ·
                  D_Cos(X_cat^OHE)
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setAlpha(0.75);
                  setSelectedMetric('hybrid');
                }}
                className="rounded border border-violet-500/40 bg-violet-500/10 px-2.5 py-1 font-mono text-[11px] text-violet-300 transition hover:bg-violet-500/20"
              >
                Reset α = 0.75
              </button>
              <div className="flex items-center gap-2 font-mono text-[11px]">
                <span className="text-amber-400">Cos 0.00</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={alpha}
                  onChange={(e) => {
                    setAlpha(Number(e.target.value));
                    setSelectedMetric('hybrid');
                  }}
                  className="foundry-slider w-44 sm:w-56"
                  aria-label="Alpha mixing weight slider"
                />
                <span className="text-emerald-400">1.00 Gower</span>
              </div>
            </div>
          </div>

          {/* Live interpolated Hybrid readouts */}
          <div className="mt-3 grid grid-cols-2 gap-2.5 border-t border-[#1F2937] pt-3 font-mono text-xs sm:grid-cols-4">
            <div className="rounded border border-[#1F2937] bg-[#111827] px-3 py-2">
              <span className="text-[10px] text-slate-500">HYBRID ARI ({regime.toUpperCase()})</span>
              <div className="mt-0.5 text-base font-bold text-cyan-300">
                {hybridLive.ari.toFixed(4)}
              </div>
            </div>
            <div className="rounded border border-[#1F2937] bg-[#111827] px-3 py-2">
              <span className="text-[10px] text-slate-500">HYBRID NMI</span>
              <div className="mt-0.5 text-base font-bold text-amber-300">
                {hybridLive.nmi.toFixed(4)}
              </div>
            </div>
            <div className="rounded border border-[#1F2937] bg-[#111827] px-3 py-2">
              <span className="text-[10px] text-slate-500">HYBRID SILHOUETTE</span>
              <div className="mt-0.5 text-base font-bold text-emerald-300">
                {hybridLive.silhouette.toFixed(4)}
              </div>
            </div>
            <div className="rounded border border-[#1F2937] bg-[#111827] px-3 py-2">
              <span className="text-[10px] text-slate-500">HYBRID PRECISION@5</span>
              <div className="mt-0.5 text-base font-bold text-violet-300">
                {hybridLive.precisionAt5.toFixed(2)}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Split: 2D Cluster Topology Canvas + Dynamic Metric Bar Chart & Equations */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        {/* Interactive 2D Cluster Topology */}
        <div className="foundry-card flex flex-col p-5 xl:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1F2937] pb-3">
            <div className="flex items-center gap-2">
              <Radar className="h-4 w-4 text-cyan-400" />
              <div>
                <h2 className="text-sm font-semibold text-white">
                  2D Cluster Topology — {activeBenchmark.name}
                </h2>
                <p className="font-mono text-[11px] text-slate-400">
                  {regime === 'optimized'
                    ? 'Spectral Graph Partitioning on RBF Affinity S_ij = exp(-γ D_ij²)'
                    : 'Baseline Average-Linkage Agglomerative — Imbalanced Chaining Collapse'}
                </p>
              </div>
            </div>

            {regime === 'optimized' && (
              <button
                type="button"
                onClick={() => setShowRbfEdges((v) => !v)}
                className={`inline-flex items-center gap-1.5 rounded border px-2.5 py-1 font-mono text-[11px] transition ${
                  showRbfEdges
                    ? 'border-cyan-500/40 bg-cyan-500/15 text-cyan-300'
                    : 'border-[#1F2937] bg-[#090D16] text-slate-400'
                }`}
              >
                <Network className="h-3.5 w-3.5" />
                RBF Graph Edges: {showRbfEdges ? 'ON' : 'OFF'}
              </button>
            )}
          </div>

          {/* Canvas Container */}
          <div className="relative mt-4 h-[390px] w-full overflow-hidden rounded-lg border border-[#1F2937] bg-[#090D16]">
            <canvas
              ref={canvasRef}
              onMouseMove={handleCanvasMove}
              onMouseLeave={() => setHoveredPatient(null)}
              className="h-full w-full cursor-crosshair"
            />

            {/* Floating Hover Patient Inspector */}
            {hoveredPatient && (
              <div
                className="pointer-events-none absolute z-20 w-64 rounded-lg border border-cyan-500/50 bg-[#0B111E]/95 p-3 font-mono text-[11px] shadow-2xl backdrop-blur"
                style={{
                  left: Math.min(hoveredPatient.px + 14, 340),
                  top: Math.max(10, hoveredPatient.py - 85),
                }}
              >
                <div className="flex items-center justify-between border-b border-[#1F2937] pb-1.5">
                  <span className="font-bold text-white">{hoveredPatient.patient.id}</span>
                  <span
                    className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
                    style={{
                      backgroundColor: `${hoveredPatient.color}25`,
                      color: hoveredPatient.color,
                    }}
                  >
                    {hoveredPatient.patient.dosha}
                  </span>
                </div>
                <div className="mt-1.5 space-y-1 text-slate-300">
                  <div>
                    <span className="text-slate-500">NAMASTE:</span>{' '}
                    {hoveredPatient.patient.namasteCode}
                  </div>
                  <div>
                    <span className="text-slate-500">VITALS:</span> Age{' '}
                    {hoveredPatient.patient.Age_Vaya} · BMI {hoveredPatient.patient.BMI} · BP{' '}
                    {hoveredPatient.patient.Systolic_BP} · HR{' '}
                    {hoveredPatient.patient.Pulse_Nadi_Rate}
                  </div>
                  <div>
                    <span className="text-slate-500">PARIKSHA:</span>{' '}
                    {hoveredPatient.patient.Nadi_Type} · {hoveredPatient.patient.Agni_Grade} ·{' '}
                    {hoveredPatient.patient.Koshtha}
                  </div>
                  <div className="border-t border-[#1F2937] pt-1 text-[10px]">
                    <span className="text-slate-500">ASSIGNED CLUSTER:</span>{' '}
                    <span
                      className={
                        regime === 'baseline' && hoveredPatient.assignedCluster === 0
                          ? 'font-bold text-rose-400'
                          : 'font-bold text-emerald-400'
                      }
                    >
                      C{hoveredPatient.assignedCluster}{' '}
                      {regime === 'baseline' && hoveredPatient.assignedCluster === 0
                        ? '(Chained)'
                        : '(Spectral Partition)'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Semantic Tridosha Legend */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-3 font-mono text-[11px]">
              {TRIDOSHA_CLASSES.map((cls) => (
                <span key={cls.id} className="inline-flex items-center gap-1.5 text-slate-300">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: cls.color }}
                  />
                  {cls.label}
                </span>
              ))}
            </div>
            <span className="font-mono text-[10px] text-slate-500">
              Hover any patient node for clinical telemetry
            </span>
          </div>
        </div>

        {/* Right Panel: Live Telemetry Bar Chart + Alpha Sensitivity Curve */}
        <div className="space-y-5 xl:col-span-5">
          {/* Selected Metric Score Summary */}
          <div className="foundry-card p-5">
            <div className="flex items-center justify-between border-b border-[#1F2937] pb-3">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-emerald-400">
                  ACTIVE KERNEL TELEMETRY
                </span>
                <h3 className="text-sm font-semibold text-white">
                  {activeBenchmark.name}
                </h3>
              </div>
              <span className="rounded border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 font-mono text-[10px] text-cyan-300">
                {regime === 'optimized' ? 'SPECTRAL RBF' : 'AVG-LINKAGE'}
              </span>
            </div>

            <div className="mt-3 rounded-md border border-[#1F2937] bg-[#090D16] px-3 py-2 font-mono text-[11px] text-cyan-300">
              {activeBenchmark.formula}
            </div>

            <div className="mt-3 grid grid-cols-4 gap-2 text-center font-mono">
              <div className="rounded-lg border border-[#1F2937] bg-[#0B111E] p-2.5">
                <div className="text-[10px] text-slate-500">ARI</div>
                <div className="mt-0.5 text-base font-bold text-cyan-300">
                  {activeBenchmark.current.ari.toFixed(4)}
                </div>
              </div>
              <div className="rounded-lg border border-[#1F2937] bg-[#0B111E] p-2.5">
                <div className="text-[10px] text-slate-500">NMI</div>
                <div className="mt-0.5 text-base font-bold text-amber-300">
                  {activeBenchmark.current.nmi.toFixed(4)}
                </div>
              </div>
              <div className="rounded-lg border border-[#1F2937] bg-[#0B111E] p-2.5">
                <div className="text-[10px] text-slate-500">SIL</div>
                <div className="mt-0.5 text-base font-bold text-emerald-300">
                  {activeBenchmark.current.silhouette.toFixed(4)}
                </div>
              </div>
              <div className="rounded-lg border border-[#1F2937] bg-[#0B111E] p-2.5">
                <div className="text-[10px] text-slate-500">P@5</div>
                <div className="mt-0.5 text-base font-bold text-violet-300">
                  {activeBenchmark.current.precisionAt5.toFixed(2)}%
                </div>
              </div>
            </div>
            <p className="mt-2.5 text-xs text-slate-400">{activeBenchmark.note}</p>
          </div>

          {/* Dynamic 4-Metric Bar Comparison Chart */}
          <div className="foundry-card p-5">
            <div className="flex items-center justify-between border-b border-[#1F2937] pb-3">
              <div className="flex items-center gap-2">
                <GitCompare className="h-4 w-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-white">
                  ARI / NMI / Silhouette Comparison ({regime === 'optimized' ? 'Spectral RBF' : 'Baseline Avg-Linkage'})
                </h3>
              </div>
            </div>

            <div className="mt-3 h-[230px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonBarData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
                  <XAxis
                    dataKey="metric"
                    tick={{ fill: '#CBD5E1', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                    stroke="#475569"
                  />
                  <YAxis
                    domain={[0, 1]}
                    tick={{ fill: '#94A3B8', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                    stroke="#475569"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#090D16',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      fontFamily: 'JetBrains Mono',
                      fontSize: '11px',
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontFamily: 'JetBrains Mono', fontSize: '11px' }}
                  />
                  <Bar dataKey="ARI" fill="#06B6D4" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="NMI" fill="#F59E0B" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Silhouette" fill="#10B981" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Alpha Sensitivity Curve + Exact Validated SIH26008 Benchmark Table */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        {/* Alpha Sensitivity Curve */}
        <div className="foundry-card p-5 xl:col-span-5">
          <div className="flex items-center justify-between border-b border-[#1F2937] pb-3">
            <div>
              <span className="font-mono text-[10px] uppercase tracking-widest text-violet-400">
                SENSITIVITY SWEEP · α ∈ [0.00, 1.00]
              </span>
              <h3 className="text-sm font-semibold text-white">
                Modality-Decoupled Hybrid Response Curve
              </h3>
            </div>
            <Sparkles className="h-4 w-4 text-violet-400" />
          </div>

          <div className="mt-3 h-[235px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={ALPHA_SWEEP_DATA} margin={{ top: 10, right: 16, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                <XAxis
                  dataKey="alpha"
                  type="number"
                  domain={[0, 1]}
                  tickCount={6}
                  tick={{ fill: '#94A3B8', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                  stroke="#475569"
                />
                <YAxis
                  domain={[0, 1]}
                  tick={{ fill: '#94A3B8', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                  stroke="#475569"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#090D16',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    fontFamily: 'JetBrains Mono',
                    fontSize: '11px',
                  }}
                />
                <Legend wrapperStyle={{ fontFamily: 'JetBrains Mono', fontSize: '10px' }} />
                <ReferenceLine
                  x={alpha}
                  stroke="#8B5CF6"
                  strokeDasharray="4 4"
                  label={{
                    value: `α=${alpha.toFixed(2)}`,
                    position: 'top',
                    fill: '#C4B5FD',
                    fontSize: 10,
                    fontFamily: 'JetBrains Mono',
                  }}
                />
                <Line type="monotone" dataKey="ari" name="ARI" stroke="#06B6D4" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="nmi" name="NMI" stroke="#F59E0B" strokeWidth={2} dot={false} />
                <Line
                  type="monotone"
                  dataKey="silhouette"
                  name="Silhouette"
                  stroke="#10B981"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Exact Validated SIH26008 Experimental Results Table */}
        <div className="foundry-card p-5 xl:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1F2937] pb-3">
            <div>
              <span className="font-mono text-[10px] uppercase tracking-widest text-cyan-400">
                PILLAR 3 // EXACT VALIDATED EXPERIMENTAL BENCHMARK TABLE
              </span>
              <h3 className="text-sm font-semibold text-white">
                Baseline Average-Linkage vs Optimized Spectral RBF Graph Partitioning
              </h3>
            </div>
            <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] text-emerald-300">
              N = 1,200 · p = 33 · k = 6
            </span>
          </div>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-[#1F2937] font-mono text-[10px] uppercase tracking-wider text-slate-400">
                  <th className="py-2.5 pr-3">Distance Metric</th>
                  <th className="px-2.5 py-2.5 text-right">Baseline ARI (Avg)</th>
                  <th className="px-2.5 py-2.5 text-right">Optimized ARI (RBF)</th>
                  <th className="px-2.5 py-2.5 text-right">Optimized NMI</th>
                  <th className="px-2.5 py-2.5 text-right">Silhouette</th>
                  <th className="py-2.5 pl-2.5 text-right">Precision@5</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F2937]/70 font-mono">
                {BENCHMARK_RESULTS.map((row) => {
                  const isSelected = selectedMetric === row.id;
                  return (
                    <tr
                      key={row.id}
                      onClick={() => setSelectedMetric(row.id)}
                      className={`cursor-pointer transition ${
                        isSelected
                          ? 'bg-cyan-500/10'
                          : 'hover:bg-[#162033]/60'
                      }`}
                    >
                      <td className="py-3 pr-3 font-sans">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: row.accent }}
                          />
                          <div>
                            <div className="font-semibold text-slate-100">{row.name}</div>
                            <div className="font-mono text-[10px] text-slate-500">{row.badge}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-2.5 py-3 text-right text-slate-400">
                        {row.baseline.ari.toFixed(4)}
                      </td>
                      <td className="px-2.5 py-3 text-right">
                        <span
                          className={
                            row.id === 'euclidean'
                              ? 'rounded bg-cyan-500/20 px-1.5 py-0.5 font-bold text-cyan-300'
                              : 'text-slate-100'
                          }
                        >
                          {row.optimized.ari.toFixed(4)}
                        </span>
                      </td>
                      <td className="px-2.5 py-3 text-right">
                        <span
                          className={
                            row.id === 'gower'
                              ? 'rounded bg-amber-500/20 px-1.5 py-0.5 font-bold text-amber-300'
                              : 'text-slate-100'
                          }
                        >
                          {row.optimized.nmi.toFixed(4)}
                        </span>
                      </td>
                      <td className="px-2.5 py-3 text-right">
                        <span
                          className={
                            row.id === 'gower'
                              ? 'rounded bg-emerald-500/20 px-1.5 py-0.5 font-bold text-emerald-300'
                              : row.id === 'euclidean'
                                ? 'text-rose-400'
                                : 'text-slate-200'
                          }
                        >
                          {row.optimized.silhouette.toFixed(4)}
                        </span>
                      </td>
                      <td className="py-3 pl-2.5 text-right">
                        <span
                          className={
                            row.id === 'hybrid'
                              ? 'rounded bg-violet-500/20 px-1.5 py-0.5 font-bold text-violet-300'
                              : 'text-slate-100'
                          }
                        >
                          {row.optimized.precisionAt5.toFixed(2)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
