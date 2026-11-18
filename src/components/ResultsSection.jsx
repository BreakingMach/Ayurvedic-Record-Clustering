import React, { useEffect, useMemo, useRef, useState } from 'react';
import benchmarkData from '../data/realBenchmarkResults.json';
import { DOSHA_PALETTE } from '../data/literatureData';

const METRIC_LABELS = {
  gower: 'Gower (Mixed)',
  euclidean: 'Euclidean (OHE + Z)',
  cosine: 'Cosine (OHE + Z)',
  hamming: 'Hamming (Categorical)',
  hybrid: 'Hybrid (0.50G + 0.50C)',
};

const CLUSTER_VIEW_OPTIONS = [
  { key: 'gower_uniform', label: 'Gower · Uniform' },
  { key: 'gower_mi', label: 'Gower · Train-MI' },
  { key: 'euclidean_uniform', label: 'Euclidean · Uniform' },
  { key: 'euclidean_mi', label: 'Euclidean · Train-MI' },
  { key: 'cosine_uniform', label: 'Cosine · Uniform' },
  { key: 'cosine_mi', label: 'Cosine · Train-MI' },
  { key: 'hybrid_mi', label: 'Hybrid · Train-MI' },
];

const CLASS_ORDER = ['Vata+Pitta', 'Vata', 'Pitta', 'Kapha', 'Pitta+Kapha', 'Vata+Kapha'];

function fmtMeanStd(obj, pct = false) {
  if (!obj) return '—';
  if (pct) {
    return `${(obj.mean * 100).toFixed(1)} ± ${(obj.std * 100).toFixed(1)}%`;
  }
  return `${obj.mean.toFixed(3)} ± ${obj.std.toFixed(3)}`;
}

// Neutral light-mode grayscale-teal ramp for dissimilarity [0 = identical (dark teal), 1 = far (light gray)]
function distToRgbLight(d) {
  const t = Math.max(0, Math.min(1, d));
  // 0 -> #0F766E (15, 118, 110); 1 -> #F5F5F4 (245, 245, 244)
  const r = Math.round(15 + t * (245 - 15));
  const g = Math.round(118 + t * (245 - 118));
  const b = Math.round(110 + t * (244 - 110));
  return [r, g, b];
}

export default function ResultsSection() {
  const [perClassWeighting, setPerClassWeighting] = useState('uniform');
  const [perClassMetric, setPerClassMetric] = useState('gower');
  const [clusterViewKey, setClusterViewKey] = useState('gower_uniform');
  const [hoverCell, setHoverCell] = useState(null);
  const canvasRef = useRef(null);

  const { summaryTable, extraBaselines, spearmanMatrix, pValues, clusterViews, meta } =
    benchmarkData;

  const uniformRows = useMemo(
    () => summaryTable.filter((r) => r.weighting === 'uniform'),
    [summaryTable]
  );
  const miRows = useMemo(
    () => summaryTable.filter((r) => r.weighting === 'mi'),
    [summaryTable]
  );

  // Best value helper per column within each weighting block
  const bestIn = (rows, key) => Math.max(...rows.map((r) => r[key].mean));

  const activePerClassRow = useMemo(
    () =>
      summaryTable.find(
        (r) => r.metric === perClassMetric && r.weighting === perClassWeighting
      ),
    [summaryTable, perClassMetric, perClassWeighting]
  );

  const activeClusterView = clusterViews[clusterViewKey];

  // Draw 100x100 Predicted-Cluster-Sorted Dissimilarity Matrix (NOT sorted by true labels!)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !activeClusterView) return;
    const ctx = canvas.getContext('2d');
    const size = 340;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const strip = 12;
    const grid = size - strip;
    const n = activeClusterView.sortedMatrix.length;
    const cell = grid / n;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, size, size);

    // Left strip: True Dosha color (Okabe-Ito) so mixed clusters are honestly visible
    // Top strip: Predicted Cluster index alternating light/dark slate bands
    const clusterBandColors = ['#115E59', '#0F766E', '#14B8A6', '#5EEAD4', '#99F6E4', '#CCFBF1'];
    for (let i = 0; i < n; i++) {
      const m = activeClusterView.sortedMeta[i];
      ctx.fillStyle = DOSHA_PALETTE[m.dosha] || '#999';
      ctx.fillRect(1, strip + i * cell, strip - 3, Math.ceil(cell));
      ctx.fillStyle = clusterBandColors[m.predCluster % clusterBandColors.length];
      ctx.fillRect(strip + i * cell, 1, Math.ceil(cell), strip - 3);
    }

    // Dissimilarity cells
    for (let i = 0; i < n; i++) {
      const row = activeClusterView.sortedMatrix[i];
      for (let j = 0; j < n; j++) {
        const [r, g, b] = distToRgbLight(row[j]);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(strip + j * cell, strip + i * cell, Math.ceil(cell), Math.ceil(cell));
      }
    }

    // Draw predicted-cluster boundary dividers
    ctx.strokeStyle = 'rgba(23, 23, 23, 0.45)';
    ctx.lineWidth = 1;
    for (let i = 1; i < n; i++) {
      if (
        activeClusterView.sortedMeta[i].predCluster !==
        activeClusterView.sortedMeta[i - 1].predCluster
      ) {
        const pos = strip + i * cell;
        ctx.beginPath();
        ctx.moveTo(pos, strip);
        ctx.lineTo(pos, size);
        ctx.moveTo(strip, pos);
        ctx.lineTo(size, pos);
        ctx.stroke();
      }
    }
  }, [activeClusterView]);

  const handleMatrixMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas || !activeClusterView) return;
    const rect = canvas.getBoundingClientRect();
    const scale = 340 / rect.width;
    const x = (e.clientX - rect.left) * scale;
    const y = (e.clientY - rect.top) * scale;
    const strip = 12;
    if (x < strip || y < strip) {
      setHoverCell(null);
      return;
    }
    const n = activeClusterView.sortedMatrix.length;
    const cell = (340 - strip) / n;
    const j = Math.min(n - 1, Math.floor((x - strip) / cell));
    const i = Math.min(n - 1, Math.floor((y - strip) / cell));
    setHoverCell({
      p1: activeClusterView.sortedMeta[i],
      p2: activeClusterView.sortedMeta[j],
      d: activeClusterView.sortedMatrix[i][j],
    });
  };

  const renderGridBlock = (rows, heading) => {
    const bAri = bestIn(rows, 'ari');
    const bNmi = bestIn(rows, 'nmi');
    const bMP5 = bestIn(rows, 'macroP5');
    const bMMAP = bestIn(rows, 'macroMAP');
    const bMicP5 = bestIn(rows, 'microP5');

    return (
      <>
        <tr className="bg-neutral-50/90">
          <td
            colSpan={7}
            className="px-3 py-2 text-[11px] font-semibold tracking-wide text-neutral-600"
          >
            {heading}
          </td>
        </tr>
        {rows.map((r) => (
          <tr key={`${r.metric}-${r.weighting}`} className="hover:bg-neutral-50/70">
            <td className="whitespace-nowrap py-2.5 pl-3 pr-3 font-medium text-neutral-900">
              {METRIC_LABELS[r.metric]}
            </td>
            <td
              className={`num whitespace-nowrap px-3 py-2.5 text-right ${
                r.ari.mean === bAri ? 'font-semibold text-teal-800' : 'text-neutral-700'
              }`}
            >
              {fmtMeanStd(r.ari)}
            </td>
            <td
              className={`num whitespace-nowrap px-3 py-2.5 text-right ${
                r.nmi.mean === bNmi ? 'font-semibold text-teal-800' : 'text-neutral-700'
              }`}
            >
              {fmtMeanStd(r.nmi)}
            </td>
            <td
              className={`num whitespace-nowrap px-3 py-2.5 text-right ${
                r.macroP5.mean === bMP5 ? 'font-semibold text-teal-800' : 'text-neutral-700'
              }`}
            >
              {fmtMeanStd(r.macroP5, true)}
            </td>
            <td
              className={`num whitespace-nowrap px-3 py-2.5 text-right ${
                r.macroMAP.mean === bMMAP ? 'font-semibold text-teal-800' : 'text-neutral-700'
              }`}
            >
              {fmtMeanStd(r.macroMAP, true)}
            </td>
            <td
              className={`num whitespace-nowrap px-3 py-2.5 text-right ${
                r.microP5.mean === bMicP5 ? 'font-semibold text-teal-800' : 'text-neutral-700'
              }`}
            >
              {fmtMeanStd(r.microP5, true)}
            </td>
            <td className="num whitespace-nowrap py-2.5 pl-3 pr-3 text-right text-neutral-500">
              {fmtMeanStd(r.sil)}
            </td>
          </tr>
        ))}
      </>
    );
  };

  return (
    <section id="results" className="scroll-mt-20 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">3. Benchmark Results</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Factorial evaluation across distance metrics and weighting regimes under{' '}
          <span className="num">{meta.nRepeats}×{meta.nFolds}</span> repeated stratified group
          cross-validation (<span className="num">{meta.totalFolds}</span> folds). Scalers,
          encoders, and Mutual Information weights are fit strictly inside each training fold;
          hybrid mixing is fixed a priori at an untuned neutral{' '}
          <span className="num">α = {meta.alpha.toFixed(2)}</span>.
        </p>
      </div>

      {/* HERO: Main Factorial Results Table (Replaces KPI Cards) */}
      <div className="paper-card overflow-hidden">
        <div className="border-b border-neutral-200 px-5 py-4">
          <h3 className="text-sm font-semibold text-neutral-900">
            Table 1 — Metric × Weighting Benchmark (PAM Clustering &amp; Held-Out Retrieval, mean ± std)
          </h3>
          <p className="mt-0.5 text-xs text-neutral-500">
            Best score within each weighting regime is shown in <strong>bold teal</strong>.
            Retrieval queries each held-out profile against the training gallery with zero
            duplicate profiles shared across folds.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-200 bg-white text-[11px] font-medium text-neutral-500">
                <th className="py-2.5 pl-3 pr-3">Distance Metric / Baseline</th>
                <th className="px-3 py-2.5 text-right">ARI (PAM)</th>
                <th className="px-3 py-2.5 text-right">NMI (PAM)</th>
                <th className="px-3 py-2.5 text-right">Macro P@5</th>
                <th className="px-3 py-2.5 text-right">Macro mAP</th>
                <th className="px-3 py-2.5 text-right">Micro P@5</th>
                <th className="py-2.5 pl-3 pr-3 text-right">Silhouette*</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {renderGridBlock(
                uniformRows,
                'A. Unsupervised — Uniform Feature Weights (zero label access)'
              )}
              {renderGridBlock(
                miRows,
                'B. Train-Only MI-Weighted — Weights fit inside training folds only'
              )}

              {/* Additional Clustering & Supervised Upper-Bound Baselines */}
              <tr className="bg-neutral-50/90">
                <td
                  colSpan={7}
                  className="px-3 py-2 text-[11px] font-semibold tracking-wide text-neutral-600"
                >
                  C. Additional Baselines &amp; Supervised Retrieval Upper Bound
                </td>
              </tr>
              <tr className="hover:bg-neutral-50/70">
                <td className="whitespace-nowrap py-2.5 pl-3 pr-3 font-medium text-neutral-800">
                  Average-Linkage Hierarchical (Gower Uniform)
                </td>
                <td className="num whitespace-nowrap px-3 py-2.5 text-right text-neutral-700">
                  {fmtMeanStd(extraBaselines.avg_linkage_gower_uniform.ari)}
                </td>
                <td className="num whitespace-nowrap px-3 py-2.5 text-right text-neutral-700">
                  {fmtMeanStd(extraBaselines.avg_linkage_gower_uniform.nmi)}
                </td>
                <td className="num px-3 py-2.5 text-right text-neutral-400">—</td>
                <td className="num px-3 py-2.5 text-right text-neutral-400">—</td>
                <td className="num px-3 py-2.5 text-right text-neutral-400">—</td>
                <td className="num whitespace-nowrap py-2.5 pl-3 pr-3 text-right text-neutral-500">
                  {fmtMeanStd(extraBaselines.avg_linkage_gower_uniform.sil)}
                </td>
              </tr>
              <tr className="hover:bg-neutral-50/70">
                <td className="whitespace-nowrap py-2.5 pl-3 pr-3 font-medium text-neutral-800">
                  k-Prototypes (Huang 1998, γ = 0.5)
                </td>
                <td className="num whitespace-nowrap px-3 py-2.5 text-right text-neutral-700">
                  {fmtMeanStd(extraBaselines.k_prototypes.ari)}
                </td>
                <td className="num whitespace-nowrap px-3 py-2.5 text-right text-neutral-700">
                  {fmtMeanStd(extraBaselines.k_prototypes.nmi)}
                </td>
                <td className="num px-3 py-2.5 text-right text-neutral-400">—</td>
                <td className="num px-3 py-2.5 text-right text-neutral-400">—</td>
                <td className="num px-3 py-2.5 text-right text-neutral-400">—</td>
                <td className="num whitespace-nowrap py-2.5 pl-3 pr-3 text-right text-neutral-500">
                  {fmtMeanStd(extraBaselines.k_prototypes.sil)}
                </td>
              </tr>
              <tr className="bg-teal-50/40">
                <td className="whitespace-nowrap py-2.5 pl-3 pr-3 font-medium text-teal-900">
                  Supervised Naive Bayes Posterior Proximity (Upper Bound)
                </td>
                <td className="num px-3 py-2.5 text-right text-neutral-400">—</td>
                <td className="num px-3 py-2.5 text-right text-neutral-400">—</td>
                <td className="num whitespace-nowrap px-3 py-2.5 text-right font-semibold text-teal-900">
                  {fmtMeanStd(extraBaselines.supervised_upper.macroP5, true)}
                </td>
                <td className="num whitespace-nowrap px-3 py-2.5 text-right font-semibold text-teal-900">
                  {fmtMeanStd(extraBaselines.supervised_upper.macroMAP, true)}
                </td>
                <td className="num whitespace-nowrap px-3 py-2.5 text-right font-semibold text-teal-900">
                  {fmtMeanStd(extraBaselines.supervised_upper.microP5, true)}
                </td>
                <td className="num py-2.5 pl-3 pr-3 text-right text-neutral-400">—</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Paired Permutation Tests & Silhouette Caveat */}
        <div className="space-y-2 border-t border-neutral-200 bg-neutral-50/60 px-5 py-3.5 text-xs text-neutral-600">
          <div className="flex flex-wrap gap-x-5 gap-y-1">
            <span className="font-medium text-neutral-800">
              Paired permutation tests (20 folds, two-sided):
            </span>
            <span>
              Gower vs. Euclidean (Uniform mAP):{' '}
              <strong className="num text-teal-800">
                p = {pValues.gower_vs_euclidean_uniform_macroMAP}
              </strong>
            </span>
            <span>
              Gower vs. Cosine (Uniform mAP):{' '}
              <strong className="num text-teal-800">
                p = {pValues.gower_vs_cosine_uniform_macroMAP}
              </strong>
            </span>
            <span>
              MI vs. Uniform Gower (mAP):{' '}
              <strong className="num text-teal-800">
                p = {pValues.gower_mi_vs_uniform_macroMAP}
              </strong>
            </span>
            <span>
              Hybrid vs. Gower (MI mAP):{' '}
              <strong className="num text-neutral-700">
                p = {pValues.hybrid_vs_gower_mi_macroMAP} (n.s.)
              </strong>
            </span>
          </div>
          <p className="text-[11px] text-neutral-500">
            *Silhouette caveat: Each silhouette score is computed inside its own metric
            geometry and is <strong>not directly comparable across different distance spaces</strong>.
            Moreover, all values sit below <span className="num">0.25</span>, indicating weak
            geometric separation under the Kaufman–Rousseeuw (1990) guideline.
          </p>
        </div>
      </div>

      {/* Row 2: Per-Class Retrieval Breakdown + Spearman Rank Correlation */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Per-Class Retrieval Table */}
        <div className="paper-card p-5 lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 pb-3">
            <div>
              <h3 className="text-sm font-semibold text-neutral-900">
                Table 2 — Per-Class Held-Out Retrieval (P@1, P@5, P@10, P@20, mAP)
              </h3>
              <p className="mt-0.5 text-xs text-neutral-500">
                Minority classes (<span className="num">4</span> unique profiles each) expose
                retrieval difficulty hidden by micro-averages.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <select
                value={perClassMetric}
                onChange={(e) => setPerClassMetric(e.target.value)}
                className="rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-800 focus:border-teal-600 focus:outline-none"
              >
                {Object.entries(METRIC_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>

              <div className="inline-flex rounded-md border border-neutral-200 bg-neutral-50 p-0.5 text-[11px]">
                {[
                  { k: 'uniform', l: 'Uniform' },
                  { k: 'mi', l: 'Train-MI' },
                ].map((opt) => (
                  <button
                    key={opt.k}
                    type="button"
                    onClick={() => setPerClassWeighting(opt.k)}
                    className={`rounded px-2 py-0.5 font-medium ${
                      perClassWeighting === opt.k
                        ? 'bg-white text-teal-800 shadow-sm ring-1 ring-neutral-200'
                        : 'text-neutral-600'
                    }`}
                  >
                    {opt.l}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-neutral-200 text-[11px] font-medium text-neutral-500">
                  <th className="py-2 pr-2">Dosha Class</th>
                  <th className="px-2 py-2 text-right">P@1</th>
                  <th className="px-2 py-2 text-right">P@5</th>
                  <th className="px-2 py-2 text-right">P@10</th>
                  <th className="px-2 py-2 text-right">P@20</th>
                  <th className="py-2 pl-2 text-right">mAP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {CLASS_ORDER.map((cls) => {
                  const row = activePerClassRow?.perClass?.[cls];
                  const clsMeta = meta.classes.find((c) => c.id === cls);
                  return (
                    <tr key={cls} className="hover:bg-neutral-50">
                      <td className="py-2 pr-2 font-medium text-neutral-900">
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: DOSHA_PALETTE[cls] }}
                          />
                          {cls}
                          <span className="num text-[11px] font-normal text-neutral-400">
                            (n={clsMeta?.countUnique})
                          </span>
                        </span>
                      </td>
                      <td className="num px-2 py-2 text-right text-neutral-700">
                        {row ? `${(row.p1.mean * 100).toFixed(1)}%` : '—'}
                      </td>
                      <td className="num px-2 py-2 text-right text-neutral-700">
                        {row ? `${(row.p5.mean * 100).toFixed(1)}%` : '—'}
                      </td>
                      <td className="num px-2 py-2 text-right text-neutral-700">
                        {row ? `${(row.p10.mean * 100).toFixed(1)}%` : '—'}
                      </td>
                      <td className="num px-2 py-2 text-right text-neutral-700">
                        {row ? `${(row.p20.mean * 100).toFixed(1)}%` : '—'}
                      </td>
                      <td className="num py-2 pl-2 text-right font-medium text-neutral-900">
                        {row ? `${(row.map.mean * 100).toFixed(1)}%` : '—'}
                      </td>
                    </tr>
                  );
                })}
                {activePerClassRow && (
                  <tr className="border-t border-neutral-200 bg-neutral-50 font-medium">
                    <td className="py-2 pr-2 text-neutral-900">Macro Average (6 classes)</td>
                    <td className="num px-2 py-2 text-right text-teal-800">
                      {(activePerClassRow.macroP1.mean * 100).toFixed(1)}%
                    </td>
                    <td className="num px-2 py-2 text-right text-teal-800">
                      {(activePerClassRow.macroP5.mean * 100).toFixed(1)}%
                    </td>
                    <td className="num px-2 py-2 text-right text-teal-800">
                      {(activePerClassRow.macroP10.mean * 100).toFixed(1)}%
                    </td>
                    <td className="num px-2 py-2 text-right text-teal-800">
                      {(activePerClassRow.macroP20.mean * 100).toFixed(1)}%
                    </td>
                    <td className="num py-2 pl-2 text-right text-teal-800">
                      {(activePerClassRow.macroMAP.mean * 100).toFixed(1)}%
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Spearman Rank Correlation Matrix (Kernel Redundancy Audit) */}
        <div className="paper-card p-5 lg:col-span-5">
          <div className="border-b border-neutral-200 pb-3">
            <h3 className="text-sm font-semibold text-neutral-900">
              Table 3 — Pairwise Distance Rank Correlation (Spearman ρ)
            </h3>
            <p className="mt-0.5 text-xs text-neutral-500">
              Computed over all <span className="num">4,950</span> unique pairs (uniform
              weights). High <span className="num">ρ</span> reveals near-redundant kernels.
            </p>
          </div>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-neutral-200 text-[11px] font-medium text-neutral-500">
                  <th className="py-2 pr-2 text-left">Kernel</th>
                  {['gower', 'euclidean', 'cosine', 'hamming', 'hybrid'].map((m) => (
                    <th key={m} className="px-1.5 py-2 text-right capitalize">
                      {m.slice(0, 4)}.
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {['gower', 'euclidean', 'cosine', 'hamming', 'hybrid'].map((m1) => (
                  <tr key={m1}>
                    <td className="py-2 pr-2 font-medium capitalize text-neutral-800">{m1}</td>
                    {['gower', 'euclidean', 'cosine', 'hamming', 'hybrid'].map((m2) => {
                      const val = spearmanMatrix[m1][m2];
                      const highNonDiag = m1 !== m2 && val >= 0.95;
                      return (
                        <td
                          key={m2}
                          className={`num px-1.5 py-2 text-right ${
                            m1 === m2
                              ? 'text-neutral-300'
                              : highNonDiag
                                ? 'bg-amber-50 font-semibold text-amber-900'
                                : 'text-neutral-700'
                          }`}
                        >
                          {val.toFixed(3)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-xs leading-relaxed text-neutral-600">
            Euclidean and Cosine share <span className="num font-medium">ρ = 0.955</span>{' '}
            because one-hot categorical blocks have constant L2 norm; Gower, Hamming, and
            Hybrid share <span className="num font-medium">ρ &gt; 0.99</span> because 29 of 33
            attributes are categorical. These should not be treated as independent kernels.
          </p>
        </div>
      </div>

      {/* Row 3: Confusion Matrix + Predicted-Cluster-Sorted Dissimilarity Matrix */}
      <div className="paper-card p-5">
        <div className="flex flex-col justify-between gap-3 border-b border-neutral-200 pb-4 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900">
              Clustering Recovery Diagnostics — Confusion Matrix &amp; Predicted-Cluster Matrix
            </h3>
            <p className="mt-0.5 text-xs text-neutral-500">
              Ordered strictly by <strong>predicted PAM cluster</strong> (C0–C5), not true
              labels, across all <span className="num">100</span> unique profiles preserving
              the true 13:1 class distribution.
            </p>
          </div>

          <select
            value={clusterViewKey}
            onChange={(e) => setClusterViewKey(e.target.value)}
            className="rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-800 focus:border-teal-600 focus:outline-none"
          >
            {CLUSTER_VIEW_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* 6x6 Confusion Matrix */}
          <div className="lg:col-span-7">
            <div className="mb-2 flex items-center justify-between text-xs text-neutral-500">
              <span className="font-medium text-neutral-800">
                True Dosha (rows) × Predicted Cluster (columns) — unique profile counts
              </span>
              <span className="num">
                ARI {activeClusterView.ariUnique.toFixed(3)} · NMI{' '}
                {activeClusterView.nmiUnique.toFixed(3)}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="border-b border-neutral-200 text-[11px] font-medium text-neutral-500">
                    <th className="py-2 pr-2 text-left">True Dosha</th>
                    {[0, 1, 2, 3, 4, 5].map((c) => (
                      <th key={c} className="num px-2 py-2 text-right">
                        C{c}
                      </th>
                    ))}
                    <th className="num py-2 pl-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {CLASS_ORDER.map((cls, rIdx) => {
                    const row = activeClusterView.confusionUnique[rIdx];
                    const rowSum = row.reduce((a, b) => a + b, 0);
                    return (
                      <tr key={cls}>
                        <td className="py-2 pr-2 font-medium text-neutral-800">
                          <span className="inline-flex items-center gap-1.5">
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: DOSHA_PALETTE[cls] }}
                            />
                            {cls}
                          </span>
                        </td>
                        {row.map((cnt, cIdx) => {
                          const intensity = rowSum > 0 ? cnt / rowSum : 0;
                          return (
                            <td
                              key={cIdx}
                              className="num px-2 py-2 text-right"
                              style={{
                                backgroundColor:
                                  cnt > 0
                                    ? `rgba(15, 118, 110, ${(0.08 + intensity * 0.45).toFixed(2)})`
                                    : 'transparent',
                                fontWeight: intensity >= 0.45 ? 600 : 400,
                                color: cnt === 0 ? '#A3A3A3' : '#171717',
                              }}
                            >
                              {cnt}
                            </td>
                          );
                        })}
                        <td className="num py-2 pl-2 text-right font-medium text-neutral-700">
                          {rowSum}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-2.5 text-[11px] text-neutral-500">
              Multiply each cell by <span className="num">12</span> for the replicated{' '}
              <span className="num">N = 1,200</span> table. Notice how majority{' '}
              <em>Vata+Pitta</em> splits across multiple clusters while minority dual-dosha
              classes (<span className="num">n = 4</span>) get absorbed into larger clusters.
            </p>
          </div>

          {/* Predicted-Cluster-Sorted Dissimilarity Matrix Canvas */}
          <div className="flex flex-col items-start gap-3 lg:col-span-5">
            <div className="w-full max-w-[340px]">
              <canvas
                ref={canvasRef}
                onMouseMove={handleMatrixMove}
                onMouseLeave={() => setHoverCell(null)}
                className="aspect-square w-full cursor-crosshair rounded border border-neutral-200"
              />
              <div className="mt-2 flex items-center justify-between text-[11px] text-neutral-500">
                <span>Top bar: Predicted cluster (C0–C5)</span>
                <span>Left bar: True Dosha</span>
              </div>
              <div className="mt-1.5 flex items-center gap-2 text-[10px] text-neutral-500">
                <span className="num">D = 0</span>
                <div
                  className="h-2 flex-1 rounded-full border border-neutral-200"
                  style={{
                    background: 'linear-gradient(90deg, #0F766E 0%, #F5F5F4 100%)',
                  }}
                />
                <span className="num">D = 1</span>
              </div>
            </div>

            <div className="w-full max-w-[340px] rounded border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
              {hoverCell ? (
                <div className="num space-y-0.5 text-[11px]">
                  <div>
                    {hoverCell.p1.id} ({hoverCell.p1.dosha}, C{hoverCell.p1.predCluster}) vs{' '}
                    {hoverCell.p2.id} ({hoverCell.p2.dosha}, C{hoverCell.p2.predCluster})
                  </div>
                  <div className="font-semibold text-teal-800">
                    Normalized distance D = {hoverCell.d.toFixed(3)}
                  </div>
                </div>
              ) : (
                <span className="text-[11px] text-neutral-500">
                  Hover the matrix to inspect pairwise distances ordered by predicted cluster.
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
