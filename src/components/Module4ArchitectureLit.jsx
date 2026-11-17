import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  BookOpen,
  Grid,
  Layers,
  Search,
  Sparkles,
} from 'lucide-react';
import { DOSHA_COLOR_MAP, TRIDOSHA_CLASSES } from '../data/benchmarkData';
import { ARCHITECTURE_LAYERS, SOTA_LITERATURE } from '../data/literatureData';
import { buildClassSortedHeatmapMatrix } from '../utils/distanceEngine';

const HEATMAP_METRICS = [
  { id: 'gower', label: 'Weighted Gower', accent: '#10B981' },
  { id: 'hybrid', label: 'Proposed Hybrid', accent: '#8B5CF6' },
  { id: 'euclidean', label: 'Euclidean (OHE)', accent: '#06B6D4' },
  { id: 'cosine', label: 'Cosine (OHE)', accent: '#F59E0B' },
];

// Viridis/Foundry cyber colormap for [0, 1] values
function valueToRgb(v, mode) {
  // In distance mode: 0 (identical) = bright glowing cyan/emerald; 1 (far) = deep obsidian/indigo
  // In affinity mode: 1 (high similarity) = bright glowing cyan/emerald; 0 = deep obsidian
  const sim = mode === 'affinity' ? v : 1 - v;
  const t = Math.max(0, Math.min(1, sim));
  // Piecewise dark-obsidian -> indigo -> cyan -> emerald-glow
  if (t < 0.35) {
    const k = t / 0.35;
    return [
      Math.round(9 + k * 24),
      Math.round(13 + k * 28),
      Math.round(24 + k * 66),
    ];
  }
  if (t < 0.7) {
    const k = (t - 0.35) / 0.35;
    return [
      Math.round(33 - k * 27),
      Math.round(41 + k * 141),
      Math.round(90 + k * 122),
    ];
  }
  const k = (t - 0.7) / 0.3;
  return [
    Math.round(6 + k * 16),
    Math.round(182 + k * 50),
    Math.round(212 - k * 52),
  ];
}

export default function Module4ArchitectureLit({ alpha }) {
  const [heatmapMetric, setHeatmapMetric] = useState('gower');
  const [matrixMode, setMatrixMode] = useState('distance'); // 'distance' | 'affinity'
  const [hoverCell, setHoverCell] = useState(null);
  const [activeLayerIdx, setActiveLayerIdx] = useState(1);
  const [litSearch, setLitSearch] = useState('');
  const [litDomain, setLitDomain] = useState('ALL');
  const canvasRef = useRef(null);

  const heatmapData = useMemo(
    () => buildClassSortedHeatmapMatrix(heatmapMetric, alpha),
    [heatmapMetric, alpha]
  );

  const domains = useMemo(() => {
    const set = new Set(SOTA_LITERATURE.map((p) => p.domain));
    return ['ALL', ...Array.from(set)];
  }, []);

  const filteredLit = useMemo(() => {
    const q = litSearch.trim().toLowerCase();
    return SOTA_LITERATURE.filter((paper) => {
      const domainMatch = litDomain === 'ALL' || paper.domain === litDomain;
      const textMatch =
        !q ||
        paper.title.toLowerCase().includes(q) ||
        paper.authors.toLowerCase().includes(q) ||
        paper.method.toLowerCase().includes(q) ||
        paper.gapAddressed.toLowerCase().includes(q);
      return domainMatch && textMatch;
    });
  }, [litSearch, litDomain]);

  // Render 60x60 Class-Sorted Matrix on High-DPI Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const size = 420;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const headerBar = 14;
    const gridSize = size - headerBar;
    const n = heatmapData.n;
    const cell = gridSize / n;

    ctx.fillStyle = '#090D16';
    ctx.fillRect(0, 0, size, size);

    // Draw top & left Tridosha class color strips (6 classes × 10 patients each)
    TRIDOSHA_CLASSES.forEach((cls, idx) => {
      const start = headerBar + idx * 10 * cell;
      const span = 10 * cell;
      ctx.fillStyle = cls.color;
      ctx.fillRect(start, 2, span - 1, headerBar - 4);
      ctx.fillRect(2, start, headerBar - 4, span - 1);
    });

    // Draw cells
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const d = heatmapData.matrix[i][j];
        const val =
          matrixMode === 'affinity'
            ? Math.exp(-heatmapData.gamma * d * d)
            : d;
        const [r, g, b] = valueToRgb(val, matrixMode);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(
          headerBar + j * cell,
          headerBar + i * cell,
          Math.ceil(cell),
          Math.ceil(cell)
        );
      }
    }

    // Subtle 10x10 class block dividers
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 0.8;
    for (let b = 1; b < 6; b++) {
      const pos = headerBar + b * 10 * cell;
      ctx.beginPath();
      ctx.moveTo(pos, headerBar);
      ctx.lineTo(pos, size);
      ctx.moveTo(headerBar, pos);
      ctx.lineTo(size, pos);
      ctx.stroke();
    }

    // Highlight hovered cell crosshair
    if (hoverCell) {
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.4;
      ctx.strokeRect(
        headerBar + hoverCell.j * cell,
        headerBar + hoverCell.i * cell,
        cell,
        cell
      );
    }
  }, [heatmapData, matrixMode, hoverCell]);

  const handleHeatmapMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scale = 420 / rect.width;
    const x = (e.clientX - rect.left) * scale;
    const y = (e.clientY - rect.top) * scale;
    const headerBar = 14;
    if (x < headerBar || y < headerBar) {
      setHoverCell(null);
      return;
    }
    const cell = (420 - headerBar) / heatmapData.n;
    const j = Math.min(heatmapData.n - 1, Math.floor((x - headerBar) / cell));
    const i = Math.min(heatmapData.n - 1, Math.floor((y - headerBar) / cell));
    const d = heatmapData.matrix[i][j];
    const s = Math.exp(-heatmapData.gamma * d * d);
    setHoverCell({
      i,
      j,
      p1: heatmapData.sample[i],
      p2: heatmapData.sample[j],
      d,
      s,
    });
  };

  return (
    <div className="space-y-6">
      {/* Row 1: Interactive N x N Pairwise Distance Heatmap + 4-Layer Architecture */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        {/* Interactive N x N Distance Matrix Heatmap */}
        <div className="foundry-card p-5 xl:col-span-6">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1F2937] pb-3">
            <div className="flex items-center gap-2">
              <Grid className="h-4 w-4 text-cyan-400" />
              <div>
                <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-cyan-400">
                  CLASS-SORTED BLOCK TELEMETRY (60 × 60)
                </span>
                <h2 className="text-sm font-semibold text-white">
                  Interactive N × N Pairwise Distance &amp; RBF Affinity Heatmap
                </h2>
              </div>
            </div>

            <div className="inline-flex rounded-lg border border-[#1F2937] bg-[#090D16] p-0.5 font-mono text-[10px]">
              <button
                type="button"
                onClick={() => setMatrixMode('distance')}
                className={`rounded px-2 py-1 transition ${
                  matrixMode === 'distance'
                    ? 'bg-cyan-500/20 text-cyan-300'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Distance D_ij
              </button>
              <button
                type="button"
                onClick={() => setMatrixMode('affinity')}
                className={`rounded px-2 py-1 transition ${
                  matrixMode === 'affinity'
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                RBF S_ij
              </button>
            </div>
          </div>

          {/* Metric Selector Pills */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {HEATMAP_METRICS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setHeatmapMetric(m.id)}
                className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-mono text-[11px] transition ${
                  heatmapMetric === m.id
                    ? 'border-cyan-400/60 bg-cyan-500/15 text-white'
                    : 'border-[#1F2937] bg-[#090D16] text-slate-400 hover:text-slate-200'
                }`}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: m.accent }}
                />
                {m.label}
                {m.id === 'hybrid' ? ` (α=${alpha.toFixed(2)})` : ''}
              </button>
            ))}
          </div>

          {/* Heatmap Canvas + Side Telemetry */}
          <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <div className="w-full max-w-[360px] shrink-0 overflow-hidden rounded-lg border border-[#1F2937] bg-[#090D16] p-2">
              <canvas
                ref={canvasRef}
                onMouseMove={handleHeatmapMove}
                onMouseLeave={() => setHoverCell(null)}
                className="aspect-square w-full cursor-crosshair rounded"
              />
              {/* Color Scale Legend */}
              <div className="mt-2 flex items-center justify-between font-mono text-[10px] text-slate-400">
                <span>{matrixMode === 'distance' ? 'D = 1.0 (Far)' : 'S = 0.0 (Weak)'}</span>
                <div
                  className="mx-2 h-2 flex-1 rounded-full"
                  style={{
                    background:
                      'linear-gradient(90deg, #090D18 0%, #21295A 35%, #06B6D4 72%, #16E8A0 100%)',
                  }}
                />
                <span className="text-emerald-300">
                  {matrixMode === 'distance' ? 'D = 0.0 (Match)' : 'S = 1.0 (Exact)'}
                </span>
              </div>
            </div>

            {/* Matrix Quantitative Diagnostics + Hover Inspector */}
            <div className="flex-1 space-y-3 font-mono text-xs">
              <div className="rounded-lg border border-[#1F2937] bg-[#090D16] p-3">
                <div className="text-[10px] text-slate-500">BLOCK CONTRAST TELEMETRY</div>
                <div className="mt-2 space-y-1.5 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Intra-Class Mean D:</span>
                    <span className="font-semibold text-emerald-300">
                      {heatmapData.intraMean}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Inter-Class Mean D:</span>
                    <span className="font-semibold text-cyan-300">
                      {heatmapData.interMean}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-[#1F2937] pt-1.5">
                    <span className="text-slate-400">Inter / Intra Ratio:</span>
                    <span className="font-bold text-amber-300">
                      {heatmapData.contrastRatio}×
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">RBF Bandwidth γ:</span>
                    <span className="text-violet-300">{heatmapData.gamma}</span>
                  </div>
                </div>
              </div>

              {/* Hover Cell Telemetry */}
              <div className="rounded-lg border border-cyan-500/30 bg-[#090D16] p-3">
                <div className="text-[10px] text-cyan-400">PAIRWISE CELL INSPECTOR</div>
                {hoverCell ? (
                  <div className="mt-2 space-y-1.5 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Row i:</span>
                      <span style={{ color: DOSHA_COLOR_MAP[hoverCell.p1.dosha] }}>
                        {hoverCell.p1.id} ({hoverCell.p1.dosha})
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Col j:</span>
                      <span style={{ color: DOSHA_COLOR_MAP[hoverCell.p2.dosha] }}>
                        {hoverCell.p2.id} ({hoverCell.p2.dosha})
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-t border-[#1F2937] pt-1.5">
                      <span className="text-slate-400">Distance D_ij:</span>
                      <span className="font-bold text-white">
                        {hoverCell.d.toFixed(4)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Affinity S_ij:</span>
                      <span className="font-bold text-emerald-300">
                        {hoverCell.s.toFixed(4)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 font-sans text-[11px] text-slate-500">
                    Hover over any cell in the 60×60 block matrix to inspect exact
                    pairwise dissimilarity D_ij and RBF affinity S_ij. Bright diagonal
                    blocks indicate clean intra-Tridosha cohesion.
                  </p>
                )}
              </div>

              {/* Class Axis Legend */}
              <div className="flex flex-wrap gap-1.5">
                {TRIDOSHA_CLASSES.map((c) => (
                  <span
                    key={c.id}
                    className="inline-flex items-center gap-1 rounded border border-[#1F2937] bg-[#0B111E] px-1.5 py-0.5 text-[9px] text-slate-300"
                  >
                    <span
                      className="h-2 w-2 rounded-sm"
                      style={{ backgroundColor: c.color }}
                    />
                    {c.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 4-Layer System Architecture Diagram */}
        <div className="foundry-card flex flex-col justify-between p-5 xl:col-span-6">
          <div>
            <div className="flex items-center justify-between border-b border-[#1F2937] pb-3">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-violet-400" />
                <div>
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-violet-400">
                    END-TO-END SIH26008 PIPELINE
                  </span>
                  <h2 className="text-sm font-semibold text-white">
                    4-Layer AyurFoundry System Architecture
                  </h2>
                </div>
              </div>
              <span className="font-mono text-[10px] text-slate-500">
                Click any layer to inspect
              </span>
            </div>

            {/* Interactive Layer Stack */}
            <div className="mt-4 space-y-2">
              {ARCHITECTURE_LAYERS.map((layer, idx) => {
                const isActive = activeLayerIdx === idx;
                return (
                  <React.Fragment key={layer.layer}>
                    <button
                      type="button"
                      onClick={() => setActiveLayerIdx(idx)}
                      className={`w-full rounded-lg border p-3 text-left transition ${
                        isActive
                          ? 'border-cyan-400/60 bg-[#162033]'
                          : 'border-[#1F2937] bg-[#090D16] hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="flex h-6 w-8 items-center justify-center rounded font-mono text-[11px] font-bold"
                            style={{
                              backgroundColor: `${layer.color}22`,
                              color: layer.color,
                              border: `1px solid ${layer.color}55`,
                            }}
                          >
                            {layer.layer}
                          </span>
                          <span className="text-xs font-semibold text-white">
                            {layer.name}
                          </span>
                        </div>
                        <Sparkles
                          className="h-3.5 w-3.5 shrink-0"
                          style={{ color: isActive ? layer.color : '#475569' }}
                        />
                      </div>

                      {isActive && (
                        <div className="mt-2.5 space-y-2 border-t border-[#1F2937] pt-2.5">
                          <p className="text-xs leading-relaxed text-slate-300">
                            {layer.summary}
                          </p>
                          <div className="grid grid-cols-1 gap-2 font-mono text-[10px] sm:grid-cols-2">
                            <div className="rounded border border-[#1F2937] bg-[#090D16] p-2">
                              <span className="text-slate-500">INPUT: </span>
                              <span className="text-slate-200">{layer.inputs}</span>
                            </div>
                            <div className="rounded border border-[#1F2937] bg-[#090D16] p-2">
                              <span className="text-slate-500">OUTPUT: </span>
                              <span className="text-cyan-300">{layer.outputs}</span>
                            </div>
                          </div>
                          <ul className="space-y-1 font-mono text-[11px] text-slate-400">
                            {layer.specs.map((s) => (
                              <li key={s} className="flex items-start gap-1.5">
                                <span style={{ color: layer.color }}>▸</span>
                                <span>{s}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </button>

                    {idx < ARCHITECTURE_LAYERS.length - 1 && (
                      <div className="flex justify-center">
                        <ArrowDown className="h-3.5 w-3.5 text-slate-600" />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: 15-Paper SOTA Literature Review Table */}
      <div className="foundry-card p-5">
        <div className="flex flex-col justify-between gap-3 border-b border-[#1F2937] pb-4 md:flex-row md:items-center">
          <div className="flex items-center gap-2.5">
            <BookOpen className="h-5 w-5 text-amber-400" />
            <div>
              <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-amber-400">
                STATE-OF-THE-ART RESEARCH CORPUS (15 PEER-REVIEWED STUDIES)
              </span>
              <h2 className="text-base font-semibold text-white">
                SIH26008 SOTA Literature Review &amp; Research Gap Matrix
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                value={litSearch}
                onChange={(e) => setLitSearch(e.target.value)}
                placeholder="Search author, method, gap..."
                className="w-56 rounded-lg border border-[#1F2937] bg-[#090D16] py-1.5 pl-8 pr-3 text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <select
              value={litDomain}
              onChange={(e) => setLitDomain(e.target.value)}
              className="rounded-lg border border-[#1F2937] bg-[#090D16] px-2.5 py-1.5 font-mono text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
            >
              {domains.map((d) => (
                <option key={d} value={d}>
                  {d === 'ALL' ? 'All Domains (15)' : d}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-[#1F2937] font-mono text-[10px] uppercase tracking-wider text-slate-400">
                <th className="py-2.5 pr-2">#</th>
                <th className="px-2.5 py-2.5">Year</th>
                <th className="px-2.5 py-2.5">Authors &amp; Study</th>
                <th className="px-2.5 py-2.5">Domain</th>
                <th className="px-2.5 py-2.5">Core Methodology</th>
                <th className="py-2.5 pl-2.5">SIH26008 Gap Addressed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F2937]/70">
              {filteredLit.map((paper) => (
                <tr key={paper.id} className="transition hover:bg-[#162033]/60">
                  <td className="py-3 pr-2 font-mono text-slate-500">
                    {String(paper.id).padStart(2, '0')}
                  </td>
                  <td className="px-2.5 py-3 font-mono font-semibold text-cyan-300">
                    {paper.year}
                  </td>
                  <td className="px-2.5 py-3">
                    <div className="font-semibold text-slate-100">{paper.title}</div>
                    <div className="mt-0.5 font-mono text-[10px] text-slate-400">
                      {paper.authors} · <span className="text-slate-500">{paper.venue}</span>
                    </div>
                  </td>
                  <td className="px-2.5 py-3">
                    <span className="inline-flex whitespace-nowrap rounded border border-violet-500/35 bg-violet-500/10 px-2 py-0.5 font-mono text-[10px] text-violet-300">
                      {paper.domain}
                    </span>
                  </td>
                  <td className="px-2.5 py-3 text-[11px] text-slate-300">
                    {paper.method}
                  </td>
                  <td className="py-3 pl-2.5 text-[11px] text-emerald-300/90">
                    {paper.gapAddressed}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
