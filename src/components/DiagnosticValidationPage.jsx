import React, { useState } from 'react';
import { DOSHA_PALETTE } from '../data/literatureData';

function fmt(v, d = 4) {
  return typeof v === 'number' ? v.toFixed(d) : '—';
}

function fmtMS(mean, std, d = 4) {
  if (typeof mean !== 'number' || typeof std !== 'number') return '—';
  return `${mean.toFixed(d)} ± ${std.toFixed(d)}`;
}

export default function DiagnosticValidationPage({ realData, descriptive }) {
  const [selectedMetric, setSelectedMetric] = useState('gower');

  if (!realData) {
    return <div className="glass-panel rounded-2xl p-8 text-sm text-[#827568]">Loading validation data…</div>;
  }

  const fullMetrics = realData.full_29_traits?.metrics || {};
  const shuffled = realData.shuffled_control;
  const confMatrices = descriptive?.confusion_matrices || {};
  const currentCm = confMatrices[selectedMetric];
  const classes = currentCm?.classes || Object.keys(realData.provenance.dataset_metadata.class_counts);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold text-[#40382F]">
          Validation Against Dataset-Provided Labels
        </h1>
        <p className="mt-2 text-sm text-[#827568]">
          Evaluation of nearest-neighbor label retrieval and unsupervised cluster agreement against
          dataset-provided Dosha labels.
        </p>
      </div>

      {/* Mandatory Disclaimer (R10, R11) */}
      <div className="paper-card p-4 text-xs text-[#827568] space-y-1 border-l-4 border-l-[#C3A989]">
        <p className="font-bold text-[#40382F]">
          Research Prototype &amp; Provenance Disclaimer (R10, R11):
        </p>
        <p>
          Researched on the Tridosha dataset.
          The dataset labels originate from an unverified public repository and appear to be a
          deterministic function of the 29 traits (100% cross-validation accuracy with random forest).
          Neighbor-based outputs represent <em>labels of nearest dataset records</em>, not a clinical
          diagnosis or medical finding.
        </p>
      </div>

      {/* kNN Label Retrieval Performance Table */}
      <div className="paper-card p-6 space-y-4">
        <h2 className="text-sm font-bold text-[#40382F]">
          k-Nearest Neighbor Label Retrieval Benchmark (5-Fold CV &amp; LOO)
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-[#E8DED1] bg-[#F3EADF]/70 text-[#827568]">
                <th className="py-2.5 px-3 font-semibold">Distance Metric</th>
                <th className="py-2.5 px-3 text-right font-semibold">kNN Macro-F1</th>
                <th className="py-2.5 px-3 text-right font-semibold">kNN Accuracy</th>
                <th className="py-2.5 px-3 text-right font-semibold">LOO P@1</th>
                <th className="py-2.5 px-3 text-right font-semibold">LOO P@5</th>
                <th className="py-2.5 px-3 text-right font-semibold">LOO P@10</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8DED1]/70">
              {Object.entries(fullMetrics).map(([mName, mObj]) => (
                <tr key={mName} className="hover:bg-[#F3EADF]/50 transition">
                  <td className="py-2.5 px-3 font-semibold capitalize text-[#40382F]">{mName}</td>
                  <td className="num py-2.5 px-3 text-right font-mono text-[#40382F]">
                    {fmtMS(mObj.knn_cv.macro_f1_mean, mObj.knn_cv.macro_f1_std)}
                  </td>
                  <td className="num py-2.5 px-3 text-right font-mono text-[#40382F]">
                    {fmtMS(mObj.knn_cv.accuracy_mean, mObj.knn_cv.accuracy_std)}
                  </td>
                  <td className="num py-2.5 px-3 text-right font-mono text-[#40382F]">
                    {fmt(mObj.loo_retrieval.macro.p_at_1, 4)}
                  </td>
                  <td className="num py-2.5 px-3 text-right font-mono text-[#40382F]">
                    {fmt(mObj.loo_retrieval.macro.p_at_5, 4)}
                  </td>
                  <td className="num py-2.5 px-3 text-right font-mono text-[#40382F]">
                    {fmt(mObj.loo_retrieval.macro.p_at_10, 4)}
                  </td>
                </tr>
              ))}
              {shuffled && (
                <tr className="bg-[#E8DED1]/45 text-[#827568]">
                  <td className="py-2.5 px-3 italic font-medium">Shuffled Label Control</td>
                  <td className="num py-2.5 px-3 text-right font-mono">
                    {fmtMS(
                      shuffled.metrics.gower.knn_macro_f1_mean,
                      shuffled.metrics.gower.knn_macro_f1_std
                    )}
                  </td>
                  <td className="num py-2.5 px-3 text-right font-mono">
                    {fmt(shuffled.metrics.gower.knn_accuracy_mean, 4)}
                  </td>
                  <td className="num py-2.5 px-3 text-right font-mono">
                    {fmt(shuffled.metrics.gower.loo_macro_p_at_1, 4)}
                  </td>
                  <td className="num py-2.5 px-3 text-right font-mono">
                    {fmt(shuffled.metrics.gower.loo_macro_p_at_5, 4)}
                  </td>
                  <td className="num py-2.5 px-3 text-right font-mono">
                    {fmt(shuffled.metrics.gower.loo_macro_p_at_10, 4)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* LOO Confusion Matrix */}
      <div className="paper-card p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E8DED1] pb-3">
          <div>
            <h2 className="text-sm font-bold text-[#40382F]">
              Leave-One-Out Retrieval Confusion Matrix
            </h2>
            <p className="text-xs text-[#827568]">
              Rows: True Dosha Label · Columns: Label of 1-Nearest Dataset Record
            </p>
          </div>

          <div className="flex gap-1.5">
            {['gower', 'euclidean', 'cosine'].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setSelectedMetric(m)}
                className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition ${
                  selectedMetric === m
                    ? 'bg-[#40382F] text-[#F3EADF] shadow-sm font-semibold'
                    : 'border border-white/80 bg-white/75 text-[#827568] hover:bg-white hover:text-[#40382F]'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {currentCm?.matrix && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-[#E8DED1] bg-[#F3EADF]/70 text-[#827568]">
                  <th className="py-2.5 px-3 font-semibold">True Label \ Retrieved</th>
                  {classes.map((cls) => (
                    <th key={cls} className="py-2.5 px-3 text-right font-semibold">
                      {cls}
                    </th>
                  ))}
                  <th className="py-2.5 px-3 text-right font-semibold">Class Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8DED1]/70">
                {currentCm.matrix.map((row, rIdx) => {
                  const trueClass = classes[rIdx];
                  const rowSum = row.reduce((a, b) => a + b, 0);
                  return (
                    <tr key={rIdx} className="hover:bg-[#F3EADF]/40">
                      <td className="py-2.5 px-3 font-semibold text-[#40382F] flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: DOSHA_PALETTE[trueClass] || '#827568' }}
                        />
                        {trueClass}
                      </td>
                      {row.map((val, cIdx) => {
                        const isDiag = rIdx === cIdx;
                        return (
                          <td
                            key={cIdx}
                            className={`num py-2.5 px-3 text-right font-mono ${
                              isDiag
                                ? 'bg-[#E8DED1]/80 font-bold text-[#40382F]'
                                : val > 0
                                ? 'text-[#40382F]'
                                : 'text-[#C3A989]/60'
                            }`}
                          >
                            {val}
                          </td>
                        );
                      })}
                      <td className="num py-2.5 px-3 text-right font-mono font-bold text-[#967D63]">
                        {rowSum}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Per-Class LOO Precision Table */}
      {fullMetrics[selectedMetric]?.loo_retrieval?.per_class && (
        <div className="paper-card p-6 space-y-4">
          <h2 className="text-sm font-bold text-[#40382F]">
            Per-Class Retrieval Precision ({selectedMetric.toUpperCase()})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-[#E8DED1] bg-[#F3EADF]/70 text-[#827568]">
                  <th className="py-2.5 px-3 font-semibold">Dosha Category</th>
                  <th className="py-2.5 px-3 text-right font-semibold">Count</th>
                  <th className="py-2.5 px-3 text-right font-semibold">P@1</th>
                  <th className="py-2.5 px-3 text-right font-semibold">P@5</th>
                  <th className="py-2.5 px-3 text-right font-semibold">P@10</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8DED1]/70">
                {Object.entries(fullMetrics[selectedMetric].loo_retrieval.per_class).map(
                  ([clsName, clsObj]) => (
                    <tr key={clsName} className="hover:bg-[#F3EADF]/50 transition">
                      <td className="py-2 px-3 font-semibold text-[#40382F] flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: DOSHA_PALETTE[clsName] || '#827568' }}
                        />
                        {clsName}
                      </td>
                      <td className="num py-2 px-3 text-right font-mono text-[#827568]">
                        {clsObj.count}
                      </td>
                      <td className="num py-2 px-3 text-right font-mono text-[#40382F]">
                        {fmt(clsObj.p_at_1, 4)}
                      </td>
                      <td className="num py-2 px-3 text-right font-mono text-[#40382F]">
                        {fmt(clsObj.p_at_5, 4)}
                      </td>
                      <td className="num py-2 px-3 text-right font-mono text-[#40382F]">
                        {fmt(clsObj.p_at_10, 4)}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cluster Concordance Table */}
      <div className="paper-card p-6 space-y-4">
        <h2 className="text-sm font-bold text-[#40382F]">
          Unsupervised Cluster Concordance (k = 6 Clusters vs. 6 Dosha Classes)
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-[#E8DED1] bg-[#F3EADF]/70 text-[#827568]">
                <th className="py-2.5 px-3 font-semibold">Distance Metric</th>
                <th className="py-2.5 px-3 text-right font-semibold">Average Linkage ARI</th>
                <th className="py-2.5 px-3 text-right font-semibold">Average Linkage NMI</th>
                <th className="py-2.5 px-3 text-right font-semibold">Complete Linkage ARI</th>
                <th className="py-2.5 px-3 text-right font-semibold">Complete Linkage NMI</th>
                <th className="py-2.5 px-3 font-semibold">Silhouette Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8DED1]/70">
              {Object.entries(fullMetrics).map(([mName, mObj]) => {
                const links = mObj.clustering?.linkages || {};
                return (
                  <tr key={mName} className="hover:bg-[#F3EADF]/50 transition">
                    <td className="py-2.5 px-3 font-semibold capitalize text-[#40382F]">{mName}</td>
                    <td className="num py-2.5 px-3 text-right font-mono text-[#40382F]">
                      {fmt(links.average?.ari, 4)}
                    </td>
                    <td className="num py-2.5 px-3 text-right font-mono text-[#40382F]">
                      {fmt(links.average?.nmi, 4)}
                    </td>
                    <td className="num py-2.5 px-3 text-right font-mono text-[#40382F]">
                      {fmt(links.complete?.ari, 4)}
                    </td>
                    <td className="num py-2.5 px-3 text-right font-mono text-[#40382F]">
                      {fmt(links.complete?.nmi, 4)}
                    </td>
                    <td className="py-2.5 px-3 text-[#827568] text-[11px] italic">
                      {mObj.clustering?.silhouette_note || 'not comparable across metrics'}
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
