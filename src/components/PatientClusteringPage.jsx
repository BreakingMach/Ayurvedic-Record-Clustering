import React, { useMemo, useState } from 'react';
import { DOSHA_PALETTE } from '../data/literatureData';

const CLUSTER_PALETTE = [
  '#967D63', // warm brown
  '#D97706', // amber
  '#0072B2', // okabe blue
  '#CC79A7', // okabe mauve
  '#0F766E', // deep teal
  '#40382F', // espresso
  '#56B4E9', // sky
  '#E11D48', // rose
];

function fmt(v, d = 4) {
  return typeof v === 'number' ? v.toFixed(d) : '—';
}

export default function PatientClusteringPage({ clusteringsData, embeddingsData, realCases }) {
  const [metric, setMetric] = useState('gower');
  const [linkage, setLinkage] = useState('average');
  const [k, setK] = useState(6);
  const [colorMode, setColorMode] = useState('cluster'); // 'cluster' | 'dosha'

  const realClusterings = clusteringsData?.clusterings?.real;
  const currentClustering = realClusterings?.[metric]?.[linkage]?.[String(k)];
  const classes = clusteringsData?.classes || [];
  const coords = embeddingsData?.datasets?.real?.[metric] || [];
  const realLabels = realCases?.labels || [];

  // MDS Scatter points (Hooks strictly before early return)
  const plotPoints = useMemo(() => {
    if (!coords || coords.length === 0) return [];
    const pts = [];
    for (let i = 0; i < coords.length; i += 2) {
      if (!coords[i]) continue;
      const [x, y] = coords[i];
      const clusterIdx = currentClustering?.labels?.[i] ?? 0;
      const doshaIdx = realLabels[i] ?? 0;
      const doshaName = classes[doshaIdx] || 'Unknown';
      pts.push({
        idx: i,
        x,
        y,
        cluster: clusterIdx,
        doshaName,
        color:
          colorMode === 'cluster'
            ? CLUSTER_PALETTE[clusterIdx % CLUSTER_PALETTE.length]
            : DOSHA_PALETTE[doshaName] || '#827568',
      });
    }
    return pts;
  }, [coords, currentClustering, realLabels, classes, colorMode]);

  if (!clusteringsData || !embeddingsData) {
    return <div className="glass-panel rounded-2xl p-8 text-sm text-[#827568]">Loading patient clustering data…</div>;
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold text-[#40382F]">Patient Clustering Analysis</h1>
        <p className="mt-2 text-sm text-[#827568]">
          Unsupervised hierarchical agglomerative clustering of real Ayurvedic case records (N = 1,200).
        </p>
      </div>

      {/* R2 / R12 Notice */}
      <div className="paper-card p-4 text-xs text-[#827568] space-y-1">
        <p className="font-semibold text-[#40382F]">
          Unsupervised Integrity Notice (R2, R12):
        </p>
        <p>
          Dataset-provided Dosha labels are displayed for reference only. In strict adherence to
          unsupervised methodology, hyperparameters (linkage and k) are not optimized using label-based
          scores. The system defaults to neutral parameters (k = 6, linkage = average).
        </p>
      </div>

      {/* Controls */}
      <div className="paper-card p-5 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Metric Selector */}
        <div>
          <label className="block text-xs font-semibold text-[#40382F] mb-2">Distance Metric</label>
          <div className="flex gap-2">
            {['gower', 'euclidean', 'cosine'].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMetric(m)}
                className={`flex-1 rounded-full py-1.5 text-xs font-medium capitalize transition ${
                  metric === m
                    ? 'bg-[#40382F] text-[#F3EADF] shadow-sm font-semibold'
                    : 'border border-white/80 bg-white/70 text-[#827568] hover:bg-white hover:text-[#40382F]'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Linkage Selector */}
        <div>
          <label className="block text-xs font-semibold text-[#40382F] mb-2">Linkage Criterion</label>
          <div className="flex gap-2">
            {['average', 'complete'].map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLinkage(l)}
                className={`flex-1 rounded-full py-1.5 text-xs font-medium capitalize transition ${
                  linkage === l
                    ? 'bg-[#40382F] text-[#F3EADF] shadow-sm font-semibold'
                    : 'border border-white/80 bg-white/70 text-[#827568] hover:bg-white hover:text-[#40382F]'
                }`}
              >
                {l} Linkage
              </button>
            ))}
          </div>
        </div>

        {/* k Selector */}
        <div>
          <label className="block text-xs font-semibold text-[#40382F] mb-2">
            Number of Clusters (k = {k})
          </label>
          <div className="flex gap-1.5">
            {[3, 4, 5, 6, 7, 8].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setK(val)}
                className={`flex-1 rounded-full py-1.5 text-xs font-mono font-medium transition ${
                  k === val
                    ? 'bg-[#40382F] text-[#F3EADF] shadow-sm font-semibold'
                    : 'border border-white/80 bg-white/70 text-[#827568] hover:bg-white hover:text-[#40382F]'
                }`}
              >
                {val}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cluster Evaluation Summary */}
      {currentClustering && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="paper-card p-4">
            <div className="text-xs text-[#827568] font-medium">Selected Clusters (k)</div>
            <div className="num mt-1 text-xl font-bold text-[#40382F]">{currentClustering.k}</div>
          </div>
          <div className="paper-card p-4">
            <div className="text-xs text-[#827568] font-medium">Adjusted Rand Index (ARI)</div>
            <div className="num mt-1 text-xl font-bold text-[#967D63]">
              {fmt(currentClustering.ari, 4)}
            </div>
          </div>
          <div className="paper-card p-4">
            <div className="text-xs text-[#827568] font-medium">Normalized Mutual Info (NMI)</div>
            <div className="num mt-1 text-xl font-bold text-[#967D63]">
              {fmt(currentClustering.nmi, 4)}
            </div>
          </div>
          <div className="paper-card p-4">
            <div className="text-xs text-[#827568] font-medium">Cluster Sizes Range</div>
            <div className="num mt-1 text-sm font-mono font-semibold text-[#40382F]">
              {Math.min(...currentClustering.cluster_sizes)} – {Math.max(...currentClustering.cluster_sizes)}
            </div>
          </div>
        </div>
      )}

      {/* 2D MDS Visualization */}
      <div className="paper-card p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E8DED1] pb-3">
          <div>
            <h2 className="text-sm font-bold text-[#40382F]">
              2D MDS Projection ({metric.toUpperCase()} Distance)
            </h2>
            <p className="text-xs text-[#827568]">
              Multidimensional scaling embedding (visualisation only; not evidence). Subsampled cohort view.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#827568] font-medium">Color by:</span>
            <button
              type="button"
              onClick={() => setColorMode('cluster')}
              className={`rounded-full px-3 py-1 transition ${
                colorMode === 'cluster'
                  ? 'bg-[#40382F] text-[#F3EADF] font-semibold shadow-2xs'
                  : 'bg-white/70 text-[#827568] hover:bg-white hover:text-[#40382F]'
              }`}
            >
              Cluster Assignment
            </button>
            <button
              type="button"
              onClick={() => setColorMode('dosha')}
              className={`rounded-full px-3 py-1 transition ${
                colorMode === 'dosha'
                  ? 'bg-[#40382F] text-[#F3EADF] font-semibold shadow-2xs'
                  : 'bg-white/70 text-[#827568] hover:bg-white hover:text-[#40382F]'
              }`}
            >
              Dataset Dosha Label
            </button>
          </div>
        </div>

        {/* Responsive SVG Scatter Plot */}
        <div className="flex justify-center bg-[#F3EADF]/65 rounded-2xl border border-white/80 p-4">
          <svg viewBox="0 0 560 360" className="w-full max-w-[560px] h-auto overflow-visible">
            {/* Grid border */}
            <rect x={20} y={20} width={520} height={320} fill="#FFFCF8" rx={10} stroke="#E8DED1" />
            {plotPoints.map((pt) => {
              const cx = 30 + pt.x * 500;
              const cy = 30 + pt.y * 300;
              return (
                <circle
                  key={pt.idx}
                  cx={cx}
                  cy={cy}
                  r={3.2}
                  fill={pt.color}
                  opacity={0.82}
                  stroke="#FFFFFF"
                  strokeWidth={0.6}
                />
              );
            })}
          </svg>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-xs pt-2">
          {colorMode === 'cluster' &&
            currentClustering?.cluster_sizes.map((sz, cIdx) => (
              <div key={cIdx} className="flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: CLUSTER_PALETTE[cIdx % CLUSTER_PALETTE.length] }}
                />
                <span className="text-[#40382F] font-medium">Cluster {cIdx + 1}</span>
                <span className="num font-mono text-[#827568]">({sz})</span>
              </div>
            ))}
          {colorMode === 'dosha' &&
            classes.map((cls) => (
              <div key={cls} className="flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: DOSHA_PALETTE[cls] || '#827568' }}
                />
                <span className="text-[#40382F] font-medium">{cls}</span>
              </div>
            ))}
        </div>
      </div>

      {/* Contingency Table */}
      {currentClustering?.contingency_table && (
        <div className="paper-card p-6 space-y-4">
          <h2 className="text-sm font-bold text-[#40382F]">
            Cluster vs. Dosha Contingency Matrix (k = {k})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-[#E8DED1] bg-[#F3EADF]/70 text-[#827568]">
                  <th className="py-2 px-3 font-semibold">Cluster</th>
                  {classes.map((cls) => (
                    <th key={cls} className="py-2 px-3 text-right font-semibold">
                      {cls}
                    </th>
                  ))}
                  <th className="py-2 px-3 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8DED1]/70">
                {currentClustering.contingency_table.map((row, rIdx) => {
                  const rowSum = row.reduce((a, b) => a + b, 0);
                  return (
                    <tr key={rIdx} className="hover:bg-[#F3EADF]/50 transition">
                      <td className="py-2 px-3 font-semibold text-[#40382F] flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{
                            backgroundColor: CLUSTER_PALETTE[rIdx % CLUSTER_PALETTE.length],
                          }}
                        />
                        Cluster {rIdx + 1}
                      </td>
                      {row.map((cnt, cIdx) => (
                        <td
                          key={cIdx}
                          className={`num py-2 px-3 text-right font-mono ${
                            cnt > 0 ? 'text-[#40382F] font-semibold' : 'text-[#C3A989]/70'
                          }`}
                        >
                          {cnt}
                        </td>
                      ))}
                      <td className="num py-2 px-3 text-right font-mono font-bold text-[#967D63]">
                        {rowSum}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ARI & NMI across k table */}
      <div className="paper-card p-6 space-y-4">
        <h2 className="text-sm font-bold text-[#40382F]">
          Clustering Quality Across Values of k ({metric.toUpperCase()}, {linkage.toUpperCase()} Linkage)
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-[#E8DED1] bg-[#F3EADF]/70 text-[#827568]">
                <th className="py-2.5 px-3 font-semibold">k</th>
                <th className="py-2.5 px-3 text-right font-semibold">Adjusted Rand Index (ARI)</th>
                <th className="py-2.5 px-3 text-right font-semibold">Normalized Mutual Info (NMI)</th>
                <th className="py-2.5 px-3 text-right font-semibold">Cluster Sizes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8DED1]/70">
              {[3, 4, 5, 6, 7, 8].map((val) => {
                const item = realClusterings?.[metric]?.[linkage]?.[String(val)];
                if (!item) return null;
                const isSelected = val === k;
                return (
                  <tr
                    key={val}
                    className={`hover:bg-[#F3EADF]/60 cursor-pointer transition ${
                      isSelected ? 'bg-[#E8DED1]/80 font-semibold' : ''
                    }`}
                    onClick={() => setK(val)}
                  >
                    <td className="num py-2 px-3 font-mono text-[#40382F]">k = {item.k}</td>
                    <td className="num py-2 px-3 text-right font-mono text-[#40382F]">
                      {fmt(item.ari, 4)}
                    </td>
                    <td className="num py-2 px-3 text-right font-mono text-[#40382F]">
                      {fmt(item.nmi, 4)}
                    </td>
                    <td className="num py-2 px-3 text-right font-mono text-[#827568] text-[11px]">
                      [{item.cluster_sizes.join(', ')}]
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
