import React, { useState, useMemo } from 'react';
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
  gower: { stroke: '#967D63', label: 'Gower' },
  euclidean: { stroke: '#40382F', label: 'Euclidean' },
  cosine: { stroke: '#C3A989', strokeDasharray: '4 3', label: 'Cosine' },
};

const MISSING_STYLES = {
  gower: { stroke: '#967D63', label: 'Gower (Pairwise)' },
  euclidean_modeimpute: { stroke: '#40382F', label: 'Euclidean (Mode-imputed)' },
  cosine_modeimpute: { stroke: '#827568', strokeDasharray: '4 3', label: 'Cosine (Mode-imputed)' },
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

  // Build chart data for the selected synthetic sweep (Hooks strictly before early return)
  const sweepMeta = syntheticData?.sweeps?.[selectedSweep];
  const sweepChartData = useMemo(() => {
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
  const missingnessChartData = useMemo(() => {
    if (!missingnessData?.fractions) return [];
    return Object.entries(missingnessData.fractions).map(([, fracObj]) => {
      const row = { frac: fracObj.p };
      for (const [mKey, mVal] of Object.entries(fracObj.metrics || {})) {
        row[mKey] = mVal.knn_macro_f1?.mean ?? 0;
      }
      return row;
    });
  }, [missingnessData]);

  if (!realData) {
    return <div className="glass-panel rounded-2xl p-8 text-sm text-[#827568]">Loading metric comparison…</div>;
  }

  const equivalence = realData.equivalence || [];
  const fullMetrics = realData.full_29_traits?.metrics || {};
  const shuffled = realData.shuffled_control;

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-xl font-bold text-[#40382F]">Distance Metric Comparison</h1>
        <p className="mt-2 text-sm text-[#827568]">
          Rigorous benchmarking of <strong className="text-[#40382F]">Gower</strong>,{' '}
          <strong className="text-[#40382F]">Euclidean</strong>, and{' '}
          <strong className="text-[#40382F]">Cosine</strong> distances across real and simulated mixed-type Ayurvedic records.
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-[#C3A989]/35">
        <div className="flex gap-2 sm:gap-4 overflow-x-auto no-scrollbar whitespace-nowrap">
          {[
            { id: 'real', label: 'Real Data Benchmarks' },
            { id: 'synthetic', label: 'Synthetic OFAT Sweeps' },
            { id: 'missingness', label: 'Missingness Robustness' },
            { id: 'scaling', label: 'Scaling Ablation (Post-hoc)' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 px-1 text-xs font-semibold border-b-2 transition ${
                activeTab === tab.id
                  ? 'border-[#967D63] text-[#40382F]'
                  : 'border-transparent text-[#827568] hover:text-[#40382F]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: Real Data Benchmarks */}
      {activeTab === 'real' && (
        <div className="space-y-6">
          {/* Equivalence Notice */}
          <div className="paper-card p-6 space-y-4">
            <h2 className="text-sm font-bold text-[#40382F]">
              Metric Equivalence on Purely Categorical Data
            </h2>
            <p className="text-xs text-[#827568] leading-relaxed">
              When case records consist exclusively of categorical traits without numerical vitals,
              Gower, Euclidean (one-hot), and Cosine (one-hot) distances are exact monotonic
              transformations of Hamming distance. Consequently, neighbor rank order, kNN
              classification, and complete-linkage clustering are mathematically identical across all
              three metrics (Spearman ρ = 1.0).
            </p>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E8DED1] bg-[#F3EADF]/70 text-[#827568]">
                    <th className="py-2.5 px-3 font-semibold">Metric A</th>
                    <th className="py-2.5 px-3 font-semibold">Metric B</th>
                    <th className="py-2.5 px-3 text-right font-semibold">Spearman ρ</th>
                    <th className="py-2.5 px-3 text-right font-semibold">Max |Δ| (Min-Max)</th>
                    <th className="py-2.5 px-3 text-right font-semibold">Mean Top-5 Overlap</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8DED1]/70">
                  {equivalence.map((eq, idx) => (
                    <tr key={idx} className="hover:bg-[#F3EADF]/50 transition">
                      <td className="py-2.5 px-3 font-semibold capitalize text-[#40382F]">{eq.metric_a}</td>
                      <td className="py-2.5 px-3 font-semibold capitalize text-[#40382F]">{eq.metric_b}</td>
                      <td className="num py-2.5 px-3 text-right font-bold text-[#967D63]">
                        {fmt(eq.spearman_rho, 4)}
                      </td>
                      <td className="num py-2.5 px-3 text-right text-[#827568]">
                        {fmt(eq.max_abs_diff_minmax, 4)}
                      </td>
                      <td className="num py-2.5 px-3 text-right text-[#40382F]">
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
            <h2 className="text-sm font-bold text-[#40382F]">
              Real Data Benchmark (29 Traits, N = 1,200)
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E8DED1] bg-[#F3EADF]/70 text-[#827568]">
                    <th className="py-2.5 px-3 font-semibold">Metric</th>
                    <th className="py-2.5 px-3 text-right font-semibold">kNN Macro-F1</th>
                    <th className="py-2.5 px-3 text-right font-semibold">LOO P@1</th>
                    <th className="py-2.5 px-3 text-right font-semibold">LOO P@5</th>
                    <th className="py-2.5 px-3 text-right font-semibold">LOO P@10</th>
                    <th className="py-2.5 px-3 text-right font-semibold">ARI (Avg)</th>
                    <th className="py-2.5 px-3 text-right font-semibold">NMI (Avg)</th>
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
                        {fmt(mObj.loo_retrieval.macro.p_at_1, 4)}
                      </td>
                      <td className="num py-2.5 px-3 text-right font-mono text-[#40382F]">
                        {fmt(mObj.loo_retrieval.macro.p_at_5, 4)}
                      </td>
                      <td className="num py-2.5 px-3 text-right font-mono text-[#40382F]">
                        {fmt(mObj.loo_retrieval.macro.p_at_10, 4)}
                      </td>
                      <td className="num py-2.5 px-3 text-right font-mono text-[#827568]">
                        {fmt(mObj.clustering.linkages.average.ari, 4)}
                      </td>
                      <td className="num py-2.5 px-3 text-right font-mono text-[#827568]">
                        {fmt(mObj.clustering.linkages.average.nmi, 4)}
                      </td>
                    </tr>
                  ))}
                  {shuffled && (
                    <tr className="bg-[#E8DED1]/45 text-[#827568]">
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
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[#C3A989]/50 bg-[#E8DED1]/80 px-2.5 py-0.5 text-xs font-semibold text-[#40382F]">
              SIMULATED COHORT
            </span>
            <span className="text-xs text-[#827568]">
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
                className={`rounded-full px-3.5 py-1.5 transition ${
                  selectedSweep === sKey
                    ? 'bg-[#40382F] text-[#F3EADF] font-semibold shadow-sm'
                    : 'bg-white/75 border border-white/80 text-[#827568] hover:bg-white hover:text-[#40382F]'
                }`}
              >
                {sKey}
              </button>
            ))}
          </div>

          {/* Chart */}
          <div className="paper-card p-6 space-y-4">
            <h3 className="text-sm font-bold text-[#40382F] capitalize">
              kNN Macro-F1 vs. {selectedSweep.replace(/_/g, ' ')}
            </h3>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sweepChartData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8DED1" />
                  <XAxis dataKey="param" tick={{ fontSize: 11, fill: '#827568' }} />
                  <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11, fill: '#827568' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 252, 248, 0.95)',
                      border: '1px solid #C3A989',
                      borderRadius: '12px',
                      color: '#40382F',
                      fontSize: '11px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', color: '#40382F' }} />
                  <Line
                    type="monotone"
                    dataKey="gower"
                    name={METRIC_STYLES.gower.label}
                    stroke={METRIC_STYLES.gower.stroke}
                    strokeWidth={2.5}
                    dot={{ r: 3.5 }}
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
              <h2 className="text-sm font-bold text-[#40382F]">
                Leave-One-Out MCAR Query Missingness Robustness
              </h2>
              <p className="mt-1 text-xs text-[#827568]">
                Random masking of fraction p in [0, 0.7] of query traits while database records remain complete.
              </p>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={missingnessChartData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8DED1" />
                  <XAxis dataKey="frac" tick={{ fontSize: 11, fill: '#827568' }} />
                  <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11, fill: '#827568' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 252, 248, 0.95)',
                      border: '1px solid #C3A989',
                      borderRadius: '12px',
                      color: '#40382F',
                      fontSize: '11px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', color: '#40382F' }} />
                  {Object.entries(MISSING_STYLES).map(([k, s]) => (
                    <Line
                      key={k}
                      type="monotone"
                      dataKey={k}
                      name={s.label}
                      stroke={s.stroke}
                      strokeDasharray={s.strokeDasharray}
                      strokeWidth={2}
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
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[#C3A989]/60 bg-[#E8DED1]/80 px-2.5 py-0.5 text-xs font-semibold text-[#40382F]">
              EXPLORATORY — POST-HOC
            </span>
            <span className="text-xs text-[#827568]">
              Post-hoc ablation of feature scaling on synthetic cohorts (frozen grid unedited)
            </span>
          </div>

          <div className="paper-card p-6 space-y-4">
            <h2 className="text-sm font-bold text-[#40382F]">
              Scaling Variants under Cohen’s d &amp; Categorical Noise
            </h2>
            <p className="text-xs text-[#827568]">
              Evaluation of Gower with z-scored numerics (<code className="font-mono text-[#40382F]">gower_zscore</code>),
              Euclidean with range normalization (<code className="font-mono text-[#40382F]">euclidean_range</code>), and
              Cosine with range normalization (<code className="font-mono text-[#40382F]">cosine_range</code>).
            </p>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E8DED1] bg-[#F3EADF]/70 text-[#827568]">
                    <th className="py-2.5 px-3 font-semibold">Cell ID</th>
                    <th className="py-2.5 px-3 text-right font-semibold">Gower</th>
                    <th className="py-2.5 px-3 text-right font-semibold">Gower (Z-Score)</th>
                    <th className="py-2.5 px-3 text-right font-semibold">Euclidean</th>
                    <th className="py-2.5 px-3 text-right font-semibold">Euclidean (Range)</th>
                    <th className="py-2.5 px-3 text-right font-semibold">Cosine</th>
                    <th className="py-2.5 px-3 text-right font-semibold">Cosine (Range)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8DED1]/70">
                  {Object.entries(scalingAblation.cells || {}).slice(0, 8).map(([cellId, cellObj]) => (
                    <tr key={cellId} className="hover:bg-[#F3EADF]/50 transition">
                      <td className="py-2 px-3 font-mono text-[11px] text-[#40382F]">{cellId}</td>
                      <td className="num py-2 px-3 text-right font-mono text-[#40382F]">
                        {fmtMS(cellObj.metrics.gower.knn_macro_f1.mean, cellObj.metrics.gower.knn_macro_f1.std)}
                      </td>
                      <td className="num py-2 px-3 text-right font-mono text-[#827568]">
                        {fmtMS(cellObj.metrics.gower_zscore.knn_macro_f1.mean, cellObj.metrics.gower_zscore.knn_macro_f1.std)}
                      </td>
                      <td className="num py-2 px-3 text-right font-mono text-[#40382F]">
                        {fmtMS(cellObj.metrics.euclidean.knn_macro_f1.mean, cellObj.metrics.euclidean.knn_macro_f1.std)}
                      </td>
                      <td className="num py-2 px-3 text-right font-mono text-[#827568]">
                        {fmtMS(cellObj.metrics.euclidean_range.knn_macro_f1.mean, cellObj.metrics.euclidean_range.knn_macro_f1.std)}
                      </td>
                      <td className="num py-2 px-3 text-right font-mono text-[#40382F]">
                        {fmtMS(cellObj.metrics.cosine.knn_macro_f1.mean, cellObj.metrics.cosine.knn_macro_f1.std)}
                      </td>
                      <td className="num py-2 px-3 text-right font-mono text-[#827568]">
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
