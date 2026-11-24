import React from 'react';

function fmt(v, d = 4) {
  return typeof v === 'number' ? v.toFixed(d) : '—';
}

export default function MethodPage({ realData, syntheticData }) {
  if (!realData || !syntheticData) {
    return <div className="glass-panel rounded-2xl p-8 text-sm text-[#827568]">Loading methodology…</div>;
  }

  const cfg = realData.provenance.config;
  const knnCfg = cfg.evaluation.knn;
  const retCfg = cfg.evaluation.retrieval;
  const cluCfg = cfg.evaluation.clustering;
  const realShuf = realData.shuffled_control;
  const synthShuf = syntheticData.shuffled_control;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#40382F]">Method</h1>
        <p className="mt-2 text-sm text-[#827568]">
          Unsupervised distance definitions, config-locked evaluation protocol, statistical testing,
          and shuffled-label controls. No distance function has access to labels.
        </p>
      </div>

      {/* Distance Definitions */}
      <div className="paper-card p-6 space-y-4">
        <h2 className="text-base font-bold text-[#40382F]">Distance Definitions</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/80 bg-[#F3EADF]/60 p-4 space-y-2">
            <h3 className="text-sm font-bold text-[#40382F]">Gower (Uniform)</h3>
            <p className="text-xs leading-relaxed text-[#827568]">
              Numeric features are range-normalised using full-column observed range (unsupervised,
              no labels). Categorical features use simple matching. Pairwise dissimilarity averages
              uniformly only over features present in both rows.
            </p>
          </div>
          <div className="rounded-2xl border border-white/80 bg-[#F3EADF]/60 p-4 space-y-2">
            <h3 className="text-sm font-bold text-[#40382F]">Euclidean (Z + One-Hot)</h3>
            <p className="text-xs leading-relaxed text-[#827568]">
              Missing numerics are imputed with the column median and z-scored; missing categoricals
              are imputed with the column mode and full one-hot encoded (retaining all sorted
              levels). Computes L2 distance on the concatenated vector.
            </p>
          </div>
          <div className="rounded-2xl border border-white/80 bg-[#F3EADF]/60 p-4 space-y-2">
            <h3 className="text-sm font-bold text-[#40382F]">Cosine (Z + One-Hot)</h3>
            <p className="text-xs leading-relaxed text-[#827568]">
              Computed on the exact same imputed, z-scored, and one-hot encoded feature matrix as
              Euclidean distance, measuring angular dissimilarity between row vectors. Hamming
              distance serves as the categorical-only reference.
            </p>
          </div>
        </div>
      </div>

      {/* Evaluation Protocol */}
      <div className="paper-card p-6 space-y-4">
        <h2 className="text-base font-bold text-[#40382F]">Evaluation Protocol</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-[#827568]">
          <li>
            <strong className="text-[#40382F]">Out-of-fold kNN classification:</strong> Repeated stratified{' '}
            <span className="num text-[#40382F]">{knnCfg.n_splits}</span>-fold CV with{' '}
            <span className="num text-[#40382F]">{knnCfg.n_repeats}</span> repeats (
            <code className="num text-xs text-[#40382F]">k = {knnCfg.n_neighbors}</code>,{' '}
            <code className="num text-xs text-[#40382F]">metric=&quot;precomputed&quot;</code>), reporting
            macro-F1 and accuracy.
          </li>
          <li>
            <strong className="text-[#40382F]">Leave-one-out retrieval:</strong> Reports macro-averaged{' '}
            <code className="num text-xs text-[#40382F]">Precision@{retCfg.ks.join('/@')}</code> across all
            classes plus the <span className="num text-[#40382F]">{retCfg.smallest_n_classes}</span> smallest
            classes separately. Ties are broken deterministically with stable{' '}
            <code className="num text-xs text-[#40382F]">{retCfg.tie_breaking}</code> (ascending row index).
          </li>
          <li>
            <strong className="text-[#40382F]">Agglomerative clustering:</strong> Evaluated with both{' '}
            <code className="num text-xs text-[#40382F]">{cluCfg.linkages.join(' and ')}</code> linkage at{' '}
            <code className="num text-xs text-[#40382F]">k = n_classes</code> (fixed in config, never chosen using
            labels), reporting ARI, NMI, and within-space silhouette (flagged{' '}
            <em>not comparable across metrics</em>).
          </li>
          <li>
            <strong className="text-[#40382F]">Statistical testing:</strong> Two-sided paired Wilcoxon signed-rank tests
            across seeds with step-down Holm–Bonferroni correction (
            <span className="num text-[#40382F]">α = {cfg.stats.alpha}</span>), Cohen&apos;s{' '}
            <span className="num text-[#40382F]">dz</span>, and matched-pairs rank-biserial correlation.
          </li>
        </ul>
      </div>

      {/* Shuffled-Label Sanity Controls */}
      <div className="paper-card p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E8DED1] pb-4">
          <div>
            <h2 className="text-base font-bold text-[#40382F]">Shuffled-Label Controls</h2>
            <p className="mt-1 text-xs text-[#827568]">
              Randomly permuting labels must collapse kNN macro-F1 and LOO macro P@5 near chance (
              <span className="num text-[#40382F]">{fmt(realShuf.chance_macro_p5)}</span>). Any leak fails the
              pipeline.
            </p>
          </div>
          <span className="rounded-full border border-[#C3A989]/60 bg-[#E8DED1]/80 px-3 py-1 text-xs font-semibold text-[#40382F]">
            {realShuf.all_passed && synthShuf.all_passed ? 'All controls passed' : 'Control failed'}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-2 overflow-x-auto">
            <h3 className="text-xs font-bold text-[#40382F]">
              Real Data Control (seed <span className="num">{realShuf.seed}</span>)
            </h3>
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-[#E8DED1] text-[#827568]">
                  <th className="py-2 pr-2 font-semibold">Metric</th>
                  <th className="px-2 py-2 text-right font-semibold">kNN Macro-F1</th>
                  <th className="px-2 py-2 text-right font-semibold">LOO Macro P@5</th>
                  <th className="py-2 pl-2 text-right font-semibold">ARI (Avg)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8DED1]/70">
                {Object.entries(realShuf.metrics).map(([m, v]) => (
                  <tr key={m}>
                    <td className="py-2 pr-2 font-semibold capitalize text-[#40382F]">{m}</td>
                    <td className="num whitespace-nowrap px-2 py-2 text-right text-[#827568]">
                      {fmt(v.knn_macro_f1_mean)}
                    </td>
                    <td className="num whitespace-nowrap px-2 py-2 text-right text-[#827568]">
                      {fmt(v.loo_macro_p_at_5)}
                    </td>
                    <td className="num whitespace-nowrap py-2 pl-2 text-right text-[#827568]">
                      {fmt(v.ari_average)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-2 overflow-x-auto">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-[#40382F]">
                Synthetic Baseline Control (seed <span className="num">{synthShuf.seed}</span>)
              </h3>
              <span className="rounded-full border border-[#C3A989]/60 bg-[#E8DED1]/80 px-2 py-0.5 text-[10px] font-semibold text-[#40382F]">
                SIMULATED
              </span>
            </div>
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-[#E8DED1] text-[#827568]">
                  <th className="py-2 pr-2 font-semibold">Metric</th>
                  <th className="px-2 py-2 text-right font-semibold">kNN Macro-F1</th>
                  <th className="px-2 py-2 text-right font-semibold">LOO Macro P@5</th>
                  <th className="py-2 pl-2 text-right font-semibold">ARI (Avg)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8DED1]/70">
                {Object.entries(synthShuf.metrics).map(([m, v]) => (
                  <tr key={m}>
                    <td className="py-2 pr-2 font-semibold capitalize text-[#40382F]">{m}</td>
                    <td className="num whitespace-nowrap px-2 py-2 text-right text-[#827568]">
                      {fmt(v.knn_macro_f1_mean)}
                    </td>
                    <td className="num whitespace-nowrap px-2 py-2 text-right text-[#827568]">
                      {fmt(v.loo_macro_p_at_5)}
                    </td>
                    <td className="num whitespace-nowrap py-2 pl-2 text-right text-[#827568]">
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
