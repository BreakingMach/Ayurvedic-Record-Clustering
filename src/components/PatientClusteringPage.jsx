import React, { useMemo, useState } from 'react';
import { DOSHA_PALETTE } from '../data/literatureData';

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

function fmt(v, d = 4) {
  return typeof v === 'number' ? v.toFixed(d) : '—';
}

export default function PatientClusteringPage({ clusteringsData, embeddingsData, realCases }) {
  const [metric, setMetric] = useState('gower');
  const [linkage, setLinkage] = useState('average');
  const [k, setK] = useState(6);
  const [colorMode, setColorMode] = useState('cluster'); // 'cluster' | 'dosha'

  if (!clusteringsData || !embeddingsData) {
    return <div className="p-8 text-sm text-neutral-500">Loading patient clustering data…</div>;
  }

  const realClusterings = clusteringsData.clusterings?.real;
  const currentClustering = realClusterings?.[metric]?.[linkage]?.[String(k)];
  const classes = clusteringsData.classes || [];
  const coords = embeddingsData.datasets?.real?.[metric] || [];
  const realLabels = realCases?.labels || [];

  // MDS Scatter points (subsample 300 for crisp interactive rendering)
  const plotPoints = useMemo(() => {
    if (!coords || coords.length === 0) return [];
    const pts = [];
    // sample every 2nd or 3rd to keep around 400-600 points, or all 1200 points
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
            : DOSHA_PALETTE[doshaName] || '#737373',
      });
    }
    return pts;
  }, [coords, currentClustering, realLabels, classes, colorMode]);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Patient Clustering Analysis</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Unsupervised hierarchical agglomerative clustering of real Ayurvedic case records (N = 1,200).
        </p>
      </div>

      {/* R2 / R12 Notice */}
      <div className="paper-card p-4 text-xs text-neutral-600 space-y-1">
        <p className="font-medium text-neutral-800">
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
          <label className="block text-xs font-semibold text-neutral-700 mb-2">Distance Metric</label>
          <div className="flex gap-2">
            {['gower', 'euclidean', 'cosine'].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMetric(m)}
                className={`flex-1 rounded py-1.5 text-xs font-medium capitalize transition ${
                  metric === m
                    ? 'bg-teal-700 text-white shadow-sm'
                    : 'border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Linkage Selector */}
        <div>
          <label className="block text-xs font-semibold text-neutral-700 mb-2">Linkage Criterion</label>
          <div className="flex gap-2">
            {['average', 'complete'].map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLinkage(l)}
                className={`flex-1 rounded py-1.5 text-xs font-medium capitalize transition ${
                  linkage === l
                    ? 'bg-teal-700 text-white shadow-sm'
                    : 'border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                {l} Linkage
              </button>
            ))}
          </div>
        </div>

        {/* k Selector */}
        <div>
          <label className="block text-xs font-semibold text-neutral-700 mb-2">
            Number of Clusters (k = {k})
          </label>
          <div className="flex gap-1.5">
            {[3, 4, 5, 6, 7, 8].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setK(val)}
                className={`flex-1 rounded py-1.5 text-xs font-mono font-medium transition ${
                  k === val
                    ? 'bg-teal-700 text-white shadow-sm'
                    : 'border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'
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
            <div className="text-xs text-neutral-500 font-medium">Selected Clusters (k)</div>
            <div className="num mt-1 text-xl font-semibold text-neutral-900">{currentClustering.k}</div>
          </div>
          <div className="paper-card p-4">
            <div className="text-xs text-neutral-500 font-medium">Adjusted Rand Index (ARI)</div>
            <div className="num mt-1 text-xl font-semibold text-teal-800">
              {fmt(currentClustering.ari, 4)}
            </div>
          </div>
          <div className="paper-card p-4">
            <div className="text-xs text-neutral-500 font-medium">Normalized Mutual Info (NMI)</div>
            <div className="num mt-1 text-xl font-semibold text-teal-800">
              {fmt(currentClustering.nmi, 4)}
            </div>
          </div>
          <div className="paper-card p-4">
            <div className="text-xs text-neutral-500 font-medium">Cluster Sizes Range</div>
            <div className="num mt-1 text-sm font-mono text-neutral-800">
              {Math.min(...currentClustering.cluster_sizes)} – {Math.max(...currentClustering.cluster_sizes)}
            </div>
          </div>
        </div>
      )}

      {/* 2D MDS Visualization */}
      <div className="paper-card p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200 pb-3">
          <div>
            <h2 className="text-sm font-semibold text-neutral-900">
              2D MDS Projection ({metric.toUpperCase()} Distance)
            </h2>
            <p className="text-xs text-neutral-500">
              Multidimensional scaling embedding (visualisation only; not evidence). Subsampled cohort view.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-neutral-500 font-medium">Color by:</span>
            <button
              type="button"
              onClick={() => setColorMode('cluster')}
              className={`rounded px-2.5 py-1 transition ${
                colorMode === 'cluster'
                  ? 'bg-teal-50 text-teal-800 font-semibold ring-1 ring-teal-700/30'
                  : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              Cluster Assignment
            </button>
            <button
              type="button"
              onClick={() => setColorMode('dosha')}
              className={`rounded px-2.5 py-1 transition ${
                colorMode === 'dosha'
                  ? 'bg-teal-50 text-teal-800 font-semibold ring-1 ring-teal-700/30'
                  : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              Dataset Dosha Label
            </button>
          </div>
        </div>

        {/* SVG Scatter Plot */}
        <div className="flex justify-center bg-neutral-50 rounded border border-neutral-100 p-4">
          <svg width={560} height={360} viewBox="0 0 560 360" className="overflow-visible">
            {/* Grid border */}
            <rect x={20} y={20} width={520} height={320} fill="#FFFFFF" stroke="#E5E5E5" />
            {plotPoints.map((pt) => {
              // x and y are scaled [0, 1]
              const cx = 30 + pt.x * 500;
              const cy = 30 + pt.y * 300;
              return (
                <circle
                  key={pt.idx}
                  cx={cx}
                  cy={cy}
                  r={3}
                  fill={pt.color}
                  opacity={0.8}
                  stroke="#FFFFFF"
                  strokeWidth={0.5}
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
                <span className="text-neutral-700 font-medium">Cluster {cIdx + 1}</span>
                <span className="num font-mono text-neutral-400">({sz})</span>
              </div>
            ))}
          {colorMode === 'dosha' &&
            classes.map((cls) => (
              <div key={cls} className="flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: DOSHA_PALETTE[cls] || '#737373' }}
                />
                <span className="text-neutral-700 font-medium">{cls}</span>
              </div>
            ))}
        </div>
      </div>

      {/* Contingency Table */}
      {currentClustering?.contingency_table && (
        <div className="paper-card p-6 space-y-4">
          <h2 className="text-sm font-semibold text-neutral-900">
            Cluster vs. Dosha Contingency Matrix (k = {k})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-500">
                  <th className="py-2 px-3 font-medium">Cluster</th>
                  {classes.map((cls) => (
                    <th key={cls} className="py-2 px-3 text-right font-medium">
                      {cls}
                    </th>
                  ))}
                  <th className="py-2 px-3 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {currentClustering.contingency_table.map((row, rIdx) => {
                  const rowSum = row.reduce((a, b) => a + b, 0);
                  return (
                    <tr key={rIdx} className="hover:bg-neutral-50">
                      <td className="py-2 px-3 font-medium text-neutral-900 flex items-center gap-2">
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
                            cnt > 0 ? 'text-neutral-900 font-medium' : 'text-neutral-300'
                          }`}
                        >
                          {cnt}
                        </td>
                      ))}
                      <td className="num py-2 px-3 text-right font-mono font-semibold text-teal-800">
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
        <h2 className="text-sm font-semibold text-neutral-900">
          Clustering Quality Across Values of k ({metric.toUpperCase()}, {linkage.toUpperCase()} Linkage)
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-500">
                <th className="py-2.5 px-3 font-medium">k</th>
                <th className="py-2.5 px-3 text-right font-medium">Adjusted Rand Index (ARI)</th>
                <th className="py-2.5 px-3 text-right font-medium">Normalized Mutual Info (NMI)</th>
                <th className="py-2.5 px-3 text-right font-medium">Cluster Sizes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {[3, 4, 5, 6, 7, 8].map((val) => {
                const item = realClusterings?.[metric]?.[linkage]?.[String(val)];
                if (!item) return null;
                const isSelected = val === k;
                return (
                  <tr
                    key={val}
                    className={`hover:bg-neutral-50 cursor-pointer ${
                      isSelected ? 'bg-teal-50/70 font-semibold' : ''
                    }`}
                    onClick={() => setK(val)}
                  >
                    <td className="num py-2 px-3 font-mono text-neutral-900">k = {item.k}</td>
                    <td className="num py-2 px-3 text-right font-mono text-neutral-800">
                      {fmt(item.ari, 4)}
                    </td>
                    <td className="num py-2 px-3 text-right font-mono text-neutral-800">
                      {fmt(item.nmi, 4)}
                    </td>
                    <td className="num py-2 px-3 text-right font-mono text-neutral-500 text-[11px]">
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
