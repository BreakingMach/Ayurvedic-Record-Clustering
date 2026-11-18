import React from 'react';

function fmt(v, d = 4) {
  return typeof v === 'number' ? v.toFixed(d) : '—';
}

export default function MethodPage({ realData, syntheticData }) {
  const cfg = realData.provenance.config;
  const knnCfg = cfg.evaluation.knn;
  const retCfg = cfg.evaluation.retrieval;
  const cluCfg = cfg.evaluation.clustering;
  const realShuf = realData.shuffled_control;
  const synthShuf = syntheticData.shuffled_control;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Method</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Unsupervised distance definitions, config-locked evaluation protocol, statistical testing,
          and shuffled-label controls. No distance function has access to labels.
        </p>
      </div>

      {/* Distance Definitions */}
      <div className="paper-card p-6 space-y-4">
        <h2 className="text-base font-semibold text-neutral-900">Distance Definitions</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded border border-neutral-200 p-4 space-y-2">
            <h3 className="text-sm font-semibold text-neutral-900">Gower (Uniform)</h3>
            <p className="text-xs leading-relaxed text-neutral-600">
              Numeric features are range-normalised using full-column observed range (unsupervised,
              no labels). Categorical features use simple matching. Pairwise dissimilarity averages
              uniformly only over features present in both rows.
            </p>
          </div>
          <div className="rounded border border-neutral-200 p-4 space-y-2">
            <h3 className="text-sm font-semibold text-neutral-900">Euclidean (Z + One-Hot)</h3>
            <p className="text-xs leading-relaxed text-neutral-600">
              Missing numerics are imputed with the column median and z-scored; missing categoricals
              are imputed with the column mode and full one-hot encoded (retaining all sorted
              levels). Computes L2 distance on the concatenated vector.
            </p>
          </div>
          <div className="rounded border border-neutral-200 p-4 space-y-2">
            <h3 className="text-sm font-semibold text-neutral-900">Cosine (Z + One-Hot)</h3>
            <p className="text-xs leading-relaxed text-neutral-600">
              Computed on the exact same imputed, z-scored, and one-hot encoded feature matrix as
              Euclidean distance, measuring angular dissimilarity between row vectors. Hamming
              distance serves as the categorical-only reference.
            </p>
          </div>
        </div>
      </div>

      {/* Evaluation Protocol */}
      <div className="paper-card p-6 space-y-4">
        <h2 className="text-base font-semibold text-neutral-900">Evaluation Protocol</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-neutral-600">
          <li>
            <strong>Out-of-fold kNN classification:</strong> Repeated stratified{' '}
            <span className="num">{knnCfg.n_splits}</span>-fold CV with{' '}
            <span className="num">{knnCfg.n_repeats}</span> repeats (
            <code className="num text-xs">k = {knnCfg.n_neighbors}</code>,{' '}
            <code className="num text-xs">metric=&quot;precomputed&quot;</code>), reporting
            macro-F1 and accuracy.
          </li>
          <li>
            <strong>Leave-one-out retrieval:</strong> Reports macro-averaged{' '}
            <code className="num text-xs">Precision@{retCfg.ks.join('/@')}</code> across all
            classes plus the <span className="num">{retCfg.smallest_n_classes}</span> smallest
            classes separately. Ties are broken deterministically with stable{' '}
            <code className="num text-xs">{retCfg.tie_breaking}</code> (ascending row index).
          </li>
          <li>
            <strong>Agglomerative clustering:</strong> Evaluated with both{' '}
            <code className="num text-xs">{cluCfg.linkages.join(' and ')}</code> linkage at{' '}
            <code className="num text-xs">k = n_classes</code> (fixed in config, never chosen using
            labels), reporting ARI, NMI, and within-space silhouette (flagged{' '}
            <em>not comparable across metrics</em>).
          </li>
          <li>
            <strong>Statistical testing:</strong> Two-sided paired Wilcoxon signed-rank tests
            across seeds with step-down Holm–Bonferroni correction (
            <span className="num">α = {cfg.stats.alpha}</span>), Cohen&apos;s{' '}
            <span className="num">dz</span>, and matched-pairs rank-biserial correlation.
          </li>
        </ul>
      </div>

      {/* Shuffled-Label Sanity Controls (Displayed ONCE Here) */}
      <div className="paper-card p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 pb-4">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">Shuffled-Label Controls</h2>
            <p className="mt-1 text-xs text-neutral-500">
              Randomly permuting labels must collapse kNN macro-F1 and LOO macro P@5 near chance (
              <span className="num">{fmt(realShuf.chance_macro_p5)}</span>). Any leak fails the
              pipeline.
            </p>
          </div>
          <span className="rounded border border-teal-700/30 bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-800">
            {realShuf.all_passed && synthShuf.all_passed ? 'All controls passed' : 'Control failed'}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-neutral-800">
              Real Data Control (seed <span className="num">{realShuf.seed}</span>)
            </h3>
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-neutral-200 text-neutral-500">
                  <th className="py-2 pr-2 font-medium">Metric</th>
                  <th className="px-2 py-2 text-right font-medium">kNN Macro-F1</th>
                  <th className="px-2 py-2 text-right font-medium">LOO Macro P@5</th>
                  <th className="py-2 pl-2 text-right font-medium">ARI (Avg)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {Object.entries(realShuf.metrics).map(([m, v]) => (
                  <tr key={m}>
                    <td className="py-2 pr-2 font-medium capitalize text-neutral-900">{m}</td>
                    <td className="num whitespace-nowrap px-2 py-2 text-right text-neutral-700">
                      {fmt(v.knn_macro_f1_mean)}
                    </td>
                    <td className="num whitespace-nowrap px-2 py-2 text-right text-neutral-700">
                      {fmt(v.loo_macro_p_at_5)}
                    </td>
                    <td className="num whitespace-nowrap py-2 pl-2 text-right text-neutral-700">
                      {fmt(v.ari_average)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-semibold text-neutral-800">
                Synthetic Baseline Control (seed <span className="num">{synthShuf.seed}</span>)
              </h3>
              <span className="rounded border border-teal-700/30 bg-teal-50 px-1.5 py-0.5 text-[10px] font-medium text-teal-800">
                SIMULATED
              </span>
            </div>
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-neutral-200 text-neutral-500">
                  <th className="py-2 pr-2 font-medium">Metric</th>
                  <th className="px-2 py-2 text-right font-medium">kNN Macro-F1</th>
                  <th className="px-2 py-2 text-right font-medium">LOO Macro P@5</th>
                  <th className="py-2 pl-2 text-right font-medium">ARI (Avg)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {Object.entries(synthShuf.metrics).map(([m, v]) => (
                  <tr key={m}>
                    <td className="py-2 pr-2 font-medium capitalize text-neutral-900">{m}</td>
                    <td className="num whitespace-nowrap px-2 py-2 text-right text-neutral-700">
                      {fmt(v.knn_macro_f1_mean)}
                    </td>
                    <td className="num whitespace-nowrap px-2 py-2 text-right text-neutral-700">
                      {fmt(v.loo_macro_p_at_5)}
                    </td>
                    <td className="num whitespace-nowrap py-2 pl-2 text-right text-neutral-700">
                      {fmt(v.ari_average)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
