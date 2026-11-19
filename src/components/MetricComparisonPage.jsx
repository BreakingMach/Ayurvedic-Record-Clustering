import React, { useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const METRIC_STYLES = {
  gower: { stroke: '#0F766E', label: 'Gower' },
  euclidean: { stroke: '#262626', label: 'Euclidean' },
  cosine: { stroke: '#737373', strokeDasharray: '4 3', label: 'Cosine' },
};

const MISSING_STYLES = {
  gower: { stroke: '#0F766E', label: 'Gower (Pairwise)' },
  euclidean_modeimpute: { stroke: '#262626', label: 'Euclidean (Mode-imputed)' },
  cosine_modeimpute: { stroke: '#737373', strokeDasharray: '4 3', label: 'Cosine (Mode-imputed)' },
  euclidean_observed_only: { stroke: '#0284C7', strokeDasharray: '2 2', label: 'Euclidean (Observed-only)' },
  cosine_observed_only: { stroke: '#D97706', strokeDasharray: '2 2', label: 'Cosine (Observed-only)' },
};

function fmt(v, d = 4) {
  return typeof v === 'number' ? v.toFixed(d) : '—';
}

function fmtMS(mean, std, d = 4) {
  if (typeof mean !== 'number' || typeof std !== 'number') return '—';
  return `${mean.toFixed(d)} ± ${std.toFixed(d)}`;
}

export default function MetricComparisonPage({
  realData,
  syntheticData,
  missingnessData,
  scalingAblation,
}) {
  const [activeTab, setActiveTab] = useState('real'); // 'real' | 'synthetic' | 'missingness' | 'scaling'
  const [selectedSweep, setSelectedSweep] = useState('numeric_cohens_d');

  if (!realData) {
    return <div className="p-8 text-sm text-neutral-500">Loading metric comparison…</div>;
  }

  const equivalence = realData.equivalence || [];
  const fullMetrics = realData.full_29_traits?.metrics || {};
  const shuffled = realData.shuffled_control;

  // Build chart data for the selected synthetic sweep
  const sweepMeta = syntheticData?.sweeps?.[selectedSweep];
  const sweepChartData = React.useMemo(() => {
    if (!sweepMeta || !syntheticData?.cells) return [];
    return sweepMeta.cell_ids.map((cellId) => {
      const cell = syntheticData.cells[cellId];
      const paramVal = cell.parameters[sweepMeta.parameter];
      return {
        param: paramVal,
        gower: cell.metrics.gower.knn_macro_f1.mean,
        euclidean: cell.metrics.euclidean.knn_macro_f1.mean,
        cosine: cell.metrics.cosine.knn_macro_f1.mean,
        gowerStd: cell.metrics.gower.knn_macro_f1.std,
        euclideanStd: cell.metrics.euclidean.knn_macro_f1.std,
        cosineStd: cell.metrics.cosine.knn_macro_f1.std,
      };
    });
  }, [syntheticData, sweepMeta]);

  // Missingness data
  const missingnessChartData = React.useMemo(() => {
    if (!missingnessData?.fractions) return [];
    return Object.entries(missingnessData.fractions).map(([fracKey, fracObj]) => {
      const row = { frac: fracObj.p };
      for (const [mKey, mVal] of Object.entries(fracObj.metrics || {})) {
        row[mKey] = mVal.knn_macro_f1?.mean ?? 0;
      }
      return row;
    });
  }, [missingnessData]);

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Distance Metric Comparison</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Rigorous benchmarking of <strong>Gower</strong>, <strong>Euclidean</strong>, and{' '}
          <strong>Cosine</strong> distances across real and simulated mixed-type Ayurvedic records.
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-neutral-200">
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => setActiveTab('real')}
            className={`pb-3 text-xs font-medium border-b-2 transition ${
              activeTab === 'real'
                ? 'border-teal-700 text-teal-800'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            Real Data Benchmarks
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('synthetic')}
            className={`pb-3 text-xs font-medium border-b-2 transition ${
              activeTab === 'synthetic'
                ? 'border-teal-700 text-teal-800'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            Synthetic OFAT Sweeps
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('missingness')}
            className={`pb-3 text-xs font-medium border-b-2 transition ${
              activeTab === 'missingness'
                ? 'border-teal-700 text-teal-800'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            Missingness Robustness
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('scaling')}
            className={`pb-3 text-xs font-medium border-b-2 transition ${
              activeTab === 'scaling'
                ? 'border-teal-700 text-teal-800'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            Scaling Ablation (Post-hoc)
          </button>
        </div>
      </div>

      {/* TAB 1: Real Data Benchmarks */}
      {activeTab === 'real' && (
        <div className="space-y-6">
          {/* Equivalence Notice */}
          <div className="paper-card p-6 space-y-4">
            <h2 className="text-sm font-semibold text-neutral-900">
              Metric Equivalence on Purely Categorical Data
            </h2>
            <p className="text-xs text-neutral-600 leading-relaxed">
              When case records consist exclusively of categorical traits without numerical vitals,
              Gower, Euclidean (one-hot), and Cosine (one-hot) distances are exact monotonic
              transformations of Hamming distance. Consequently, neighbor rank order, kNN
              classification, and complete-linkage clustering are mathematically identical across all
              three metrics (Spearman ρ = 1.0).
            </p>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-500">
                    <th className="py-2.5 px-3 font-medium">Metric A</th>
                    <th className="py-2.5 px-3 font-medium">Metric B</th>
                    <th className="py-2.5 px-3 text-right font-medium">Spearman ρ</th>
                    <th className="py-2.5 px-3 text-right font-medium">Max |Δ| (Min-Max)</th>
                    <th className="py-2.5 px-3 text-right font-medium">Mean Top-5 Overlap</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {equivalence.map((eq, idx) => (
                    <tr key={idx} className="hover:bg-neutral-50">
                      <td className="py-2 px-3 font-medium capitalize text-neutral-900">{eq.metric_a}</td>
                      <td className="py-2 px-3 font-medium capitalize text-neutral-900">{eq.metric_b}</td>
                      <td className="num py-2 px-3 text-right font-semibold text-teal-800">
                        {fmt(eq.spearman_rho, 4)}
                      </td>
                      <td className="num py-2 px-3 text-right text-neutral-600">
                        {fmt(eq.max_abs_diff_minmax, 4)}
                      </td>
                      <td className="num py-2 px-3 text-right text-neutral-600">
                        {fmt(eq.mean_top5_overlap, 4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Full 29 Traits Performance */}
          <div className="paper-card p-6 space-y-4">
            <h2 className="text-sm font-semibold text-neutral-900">
              Real Data Benchmark (29 Traits, N = 1,200)
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-500">
                    <th className="py-2.5 px-3 font-medium">Metric</th>
                    <th className="py-2.5 px-3 text-right font-medium">kNN Macro-F1</th>
                    <th className="py-2.5 px-3 text-right font-medium">LOO P@1</th>
                    <th className="py-2.5 px-3 text-right font-medium">LOO P@5</th>
                    <th className="py-2.5 px-3 text-right font-medium">LOO P@10</th>
                    <th className="py-2.5 px-3 text-right font-medium">ARI (Avg)</th>
                    <th className="py-2.5 px-3 text-right font-medium">NMI (Avg)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {Object.entries(fullMetrics).map(([mName, mObj]) => (
                    <tr key={mName} className="hover:bg-neutral-50">
                      <td className="py-2.5 px-3 font-medium capitalize text-neutral-900">{mName}</td>
                      <td className="num py-2.5 px-3 text-right font-mono text-neutral-800">
                        {fmtMS(mObj.knn_cv.macro_f1_mean, mObj.knn_cv.macro_f1_std)}
                      </td>
                      <td className="num py-2.5 px-3 text-right font-mono text-neutral-700">
                        {fmt(mObj.loo_retrieval.macro.p_at_1, 4)}
                      </td>
                      <td className="num py-2.5 px-3 text-right font-mono text-neutral-700">
                        {fmt(mObj.loo_retrieval.macro.p_at_5, 4)}
                      </td>
                      <td className="num py-2.5 px-3 text-right font-mono text-neutral-700">
                        {fmt(mObj.loo_retrieval.macro.p_at_10, 4)}
                      </td>
                      <td className="num py-2.5 px-3 text-right font-mono text-neutral-700">
                        {fmt(mObj.clustering.linkages.average.ari, 4)}
                      </td>
                      <td className="num py-2.5 px-3 text-right font-mono text-neutral-700">
                        {fmt(mObj.clustering.linkages.average.nmi, 4)}
                      </td>
                    </tr>
                  ))}
                  {shuffled && (
                    <tr className="bg-neutral-50/70 text-neutral-500">
                      <td className="py-2.5 px-3 italic font-medium">Shuffled Control</td>
                      <td className="num py-2.5 px-3 text-right font-mono">
                        {fmtMS(
                          shuffled.metrics.gower.knn_macro_f1_mean,
                          shuffled.metrics.gower.knn_macro_f1_std
                        )}
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
                      <td className="num py-2.5 px-3 text-right font-mono">
                        {fmt(shuffled.metrics.gower.ari_average, 4)}
                      </td>
                      <td className="num py-2.5 px-3 text-right font-mono">
                        {fmt(shuffled.metrics.gower.nmi_average, 4)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Synthetic OFAT Sweeps */}
      {activeTab === 'synthetic' && syntheticData && (
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <span className="rounded border border-teal-700/30 bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-800">
              SIMULATED COHORT
            </span>
            <span className="text-xs text-neutral-500">
              One-Factor-at-a-Time (OFAT) sweeps across mixed categorical + continuous traits
            </span>
          </div>

          {/* Sweep Selector */}
          <div className="flex flex-wrap gap-2 text-xs">
            {Object.keys(syntheticData.sweeps || {}).map((sKey) => (
              <button
                key={sKey}
                type="button"
                onClick={() => setSelectedSweep(sKey)}
                className={`rounded px-3 py-1.5 transition ${
                  selectedSweep === sKey
                    ? 'bg-teal-700 text-white font-medium shadow-sm'
                    : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                {sKey}
              </button>
            ))}
          </div>

          {/* Chart */}
          <div className="paper-card p-6 space-y-4">
            <h3 className="text-sm font-semibold text-neutral-900 capitalize">
              kNN Macro-F1 vs. {selectedSweep.replace(/_/g, ' ')}
            </h3>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sweepChartData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                  <XAxis dataKey="param" tick={{ fontSize: 11 }} />
                  <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="gower"
                    name={METRIC_STYLES.gower.label}
                    stroke={METRIC_STYLES.gower.stroke}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="euclidean"
                    name={METRIC_STYLES.euclidean.label}
                    stroke={METRIC_STYLES.euclidean.stroke}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="cosine"
                    name={METRIC_STYLES.cosine.label}
                    stroke={METRIC_STYLES.cosine.stroke}
                    strokeDasharray={METRIC_STYLES.cosine.strokeDasharray}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Missingness Robustness */}
      {activeTab === 'missingness' && missingnessData && (
        <div className="space-y-6">
          <div className="paper-card p-6 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-neutral-900">
                Leave-One-Out MCAR Query Missingness Robustness
              </h2>
              <p className="mt-1 text-xs text-neutral-500">
                Random masking of fraction p in [0, 0.7] of query traits while database records remain complete.
              </p>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={missingnessChartData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                  <XAxis dataKey="frac" tick={{ fontSize: 11 }} />
                  <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  {Object.entries(MISSING_STYLES).map(([k, s]) => (
                    <Line
                      key={k}
                      type="monotone"
                      dataKey={k}
                      name={s.label}
                      stroke={s.stroke}
                      strokeDasharray={s.strokeDasharray}
                      strokeWidth={1.75}
                      dot={{ r: 2.5 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Scaling Ablation */}
      {activeTab === 'scaling' && scalingAblation && (
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <span className="rounded border border-amber-500/40 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-900">
              EXPLORATORY — POST-HOC
            </span>
            <span className="text-xs text-neutral-500">
              Post-hoc ablation of feature scaling on synthetic cohorts (frozen grid unedited)
            </span>
          </div>

          <div className="paper-card p-6 space-y-4">
            <h2 className="text-sm font-semibold text-neutral-900">
              Scaling Variants under Cohen’s d &amp; Categorical Noise
            </h2>
            <p className="text-xs text-neutral-600">
              Evaluation of Gower with z-scored numerics (<code className="font-mono">gower_zscore</code>),
              Euclidean with range normalization (<code className="font-mono">euclidean_range</code>), and
              Cosine with range normalization (<code className="font-mono">cosine_range</code>).
            </p>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-500">
                    <th className="py-2.5 px-3 font-medium">Cell ID</th>
                    <th className="py-2.5 px-3 text-right font-medium">Gower</th>
                    <th className="py-2.5 px-3 text-right font-medium">Gower (Z-Score)</th>
                    <th className="py-2.5 px-3 text-right font-medium">Euclidean</th>
                    <th className="py-2.5 px-3 text-right font-medium">Euclidean (Range)</th>
                    <th className="py-2.5 px-3 text-right font-medium">Cosine</th>
                    <th className="py-2.5 px-3 text-right font-medium">Cosine (Range)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {Object.entries(scalingAblation.cells || {}).slice(0, 8).map(([cellId, cellObj]) => (
                    <tr key={cellId} className="hover:bg-neutral-50">
                      <td className="py-2 px-3 font-mono text-[11px] text-neutral-700">{cellId}</td>
                      <td className="num py-2 px-3 text-right font-mono">
                        {fmtMS(cellObj.metrics.gower.knn_macro_f1.mean, cellObj.metrics.gower.knn_macro_f1.std)}
                      </td>
                      <td className="num py-2 px-3 text-right font-mono text-neutral-600">
                        {fmtMS(cellObj.metrics.gower_zscore.knn_macro_f1.mean, cellObj.metrics.gower_zscore.knn_macro_f1.std)}
                      </td>
                      <td className="num py-2 px-3 text-right font-mono">
                        {fmtMS(cellObj.metrics.euclidean.knn_macro_f1.mean, cellObj.metrics.euclidean.knn_macro_f1.std)}
                      </td>
                      <td className="num py-2 px-3 text-right font-mono text-neutral-600">
                        {fmtMS(cellObj.metrics.euclidean_range.knn_macro_f1.mean, cellObj.metrics.euclidean_range.knn_macro_f1.std)}
                      </td>
                      <td className="num py-2 px-3 text-right font-mono">
                        {fmtMS(cellObj.metrics.cosine.knn_macro_f1.mean, cellObj.metrics.cosine.knn_macro_f1.std)}
                      </td>
                      <td className="num py-2 px-3 text-right font-mono text-neutral-600">
                        {fmtMS(cellObj.metrics.cosine_range.knn_macro_f1.mean, cellObj.metrics.cosine_range.knn_macro_f1.std)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
