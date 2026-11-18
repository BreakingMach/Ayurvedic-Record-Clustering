import React, { useMemo, useState } from 'react';
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

const METRIC_COLORS = {
  gower: '#009E73',
  euclidean: '#0072B2',
  cosine: '#D55E00',
};

const SUBSET_ENDPOINTS = [
  { key: 'knn_macro_f1', label: 'kNN Macro-F1 (3×5 CV)' },
  { key: 'loo_macro_p5', label: 'LOO Macro P@5' },
  { key: 'ari_average', label: 'ARI (Average Linkage)' },
  { key: 'ari_complete', label: 'ARI (Complete Linkage)' },
];

function fmt(v, d = 4) {
  return typeof v === 'number' ? v.toFixed(d) : '—';
}

function fmtMS(mean, std, d = 4) {
  return `${mean.toFixed(d)} ± ${std.toFixed(d)}`;
}

export default function RealBenchmarkSection({ realData }) {
  const [subsetEndpoint, setSubsetEndpoint] = useState('knn_macro_f1');

  const fullMetrics = realData.full_29_traits.metrics;
  const metricNames = Object.keys(fullMetrics);

  const subsetChartData = useMemo(() => {
    const byM = {};
    for (const row of realData.trait_subsets.summary) {
      if (!byM[row.m_traits]) byM[row.m_traits] = { m_traits: row.m_traits };
      byM[row.m_traits][row.metric] = Number(row[`${subsetEndpoint}_mean`].toFixed(4));
    }
    return Object.values(byM).sort((a, b) => a.m_traits - b.m_traits);
  }, [realData.trait_subsets.summary, subsetEndpoint]);

  const shuf = realData.shuffled_control;

  return (
    <section id="real-benchmark" className="scroll-mt-20 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">
          3. Experiment A — Real Categorical Data Benchmark
        </h2>
        <p className="mt-1 text-sm text-neutral-600">
          Evaluates Gower, Euclidean (one-hot), and Cosine (one-hot) directly on the{' '}
          <span className="num">{realData.provenance.dataset_metadata.n_categorical}</span> real
          categorical traits with zero simulated columns. All values loaded from{' '}
          <code className="num text-xs">results/real_data.json</code>.
        </p>
      </div>

      {/* 1. Equivalence Analysis */}
      <div className="paper-card overflow-hidden">
        <div className="border-b border-neutral-200 px-5 py-3.5">
          <h3 className="text-sm font-semibold text-neutral-900">
            Table A1 — Pairwise Metric Equivalence (All 29 Real Categorical Traits)
          </h3>
          <p className="mt-0.5 text-xs text-neutral-500">
            Upper-triangular pairwise distance comparison across all{' '}
            <span className="num">719,400</span> pairs.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50/70 text-[11px] font-medium text-neutral-500">
                <th className="py-2.5 pl-5 pr-3">Metric A</th>
                <th className="px-3 py-2.5">Metric B</th>
                <th className="px-3 py-2.5 text-right">Spearman ρ</th>
                <th className="px-3 py-2.5 text-right">Max Abs Diff (Min-Max)</th>
                <th className="py-2.5 pl-3 pr-5 text-right">Mean Top-5 Overlap</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {realData.equivalence.map((r) => (
                <tr key={`${r.metric_a}-${r.metric_b}`} className="hover:bg-neutral-50">
                  <td className="py-2 pl-5 pr-3 font-medium capitalize text-neutral-900">
                    {r.metric_a}
                  </td>
                  <td className="px-3 py-2 font-medium capitalize text-neutral-900">
                    {r.metric_b}
                  </td>
                  <td className="num whitespace-nowrap px-3 py-2 text-right font-semibold text-teal-800">
                    {fmt(r.spearman_rho, 6)}
                  </td>
                  <td className="num whitespace-nowrap px-3 py-2 text-right text-neutral-700">
                    {fmt(r.max_abs_diff_minmax, 6)}
                  </td>
                  <td className="num whitespace-nowrap py-2 pl-3 pr-5 text-right text-neutral-900">
                    {fmt(r.mean_top5_overlap, 4)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Full 29-Trait Evaluation */}
      <div className="paper-card overflow-hidden">
        <div className="border-b border-neutral-200 px-5 py-3.5">
          <h3 className="text-sm font-semibold text-neutral-900">
            Table A2 — Full 29-Trait Evaluation (3×5 Stratified kNN, LOO Retrieval, Agglomerative Clustering)
          </h3>
          <p className="mt-0.5 text-xs text-neutral-500">
            Deterministic tie-breaking via <code className="num text-[11px]">mergesort</code>.
            Hyperparameters fixed in <code className="num text-[11px]">config.yaml</code>.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50/70 text-[11px] font-medium text-neutral-500">
                <th className="py-2.5 pl-4 pr-2">Metric</th>
                <th className="px-2 py-2.5 text-right">kNN Macro-F1</th>
                <th className="px-2 py-2.5 text-right">kNN Accuracy</th>
                <th className="px-2 py-2.5 text-right">LOO P@1</th>
                <th className="px-2 py-2.5 text-right">LOO P@5</th>
                <th className="px-2 py-2.5 text-right">LOO P@10</th>
                <th className="px-2 py-2.5 text-right">ARI (Avg)</th>
                <th className="px-2 py-2.5 text-right">NMI (Avg)</th>
                <th className="px-2 py-2.5 text-right">ARI (Comp)</th>
                <th className="px-2 py-2.5 text-right">NMI (Comp)</th>
                <th className="py-2.5 pl-2 pr-4 text-right">Sil* (Avg / Comp)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {metricNames.map((m) => {
                const ev = fullMetrics[m];
                const avg = ev.clustering.linkages.average;
                const comp = ev.clustering.linkages.complete;
                return (
                  <tr key={m} className="hover:bg-neutral-50">
                    <td className="whitespace-nowrap py-2.5 pl-4 pr-2 font-medium capitalize text-neutral-900">
                      {m}
                    </td>
                    <td className="num whitespace-nowrap px-2 py-2.5 text-right text-neutral-800">
                      {fmtMS(ev.knn_cv.macro_f1_mean, ev.knn_cv.macro_f1_std)}
                    </td>
                    <td className="num whitespace-nowrap px-2 py-2.5 text-right text-neutral-800">
                      {fmtMS(ev.knn_cv.accuracy_mean, ev.knn_cv.accuracy_std)}
                    </td>
                    <td className="num whitespace-nowrap px-2 py-2.5 text-right text-neutral-800">
                      {fmt(ev.loo_retrieval.macro.p_at_1)}
                    </td>
                    <td className="num whitespace-nowrap px-2 py-2.5 text-right text-neutral-800">
                      {fmt(ev.loo_retrieval.macro.p_at_5)}
                    </td>
                    <td className="num whitespace-nowrap px-2 py-2.5 text-right text-neutral-800">
                      {fmt(ev.loo_retrieval.macro.p_at_10)}
                    </td>
                    <td className="num whitespace-nowrap px-2 py-2.5 text-right text-neutral-800">
                      {fmt(avg.ari)}
                    </td>
                    <td className="num whitespace-nowrap px-2 py-2.5 text-right text-neutral-800">
                      {fmt(avg.nmi)}
                    </td>
                    <td className="num whitespace-nowrap px-2 py-2.5 text-right text-neutral-800">
                      {fmt(comp.ari)}
                    </td>
                    <td className="num whitespace-nowrap px-2 py-2.5 text-right text-neutral-800">
                      {fmt(comp.nmi)}
                    </td>
                    <td className="num whitespace-nowrap py-2.5 pl-2 pr-4 text-right text-neutral-500">
                      {fmt(avg.silhouette)} / {fmt(comp.silhouette)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="border-t border-neutral-200 bg-neutral-50/70 px-5 py-2.5 text-[11px] text-neutral-500">
          *Silhouette note:{' '}
          <strong className="text-neutral-700">
            {fullMetrics.gower.clustering.silhouette_note}
          </strong>{' '}
          (computed inside each metric&apos;s own geometry). Smallest 3 classes LOO P@5 (all three
          metrics identical):{' '}
          {Object.entries(fullMetrics.gower.loo_retrieval.smallest_classes)
            .map(([cls, st]) => `${cls} (n=${st.count}): ${fmt(st.p_at_5)}`)
            .join(' · ')}
          .
        </div>
      </div>

      {/* 3. Trait-Subset Sweep Chart & Table */}
      <div className="paper-card p-5 space-y-4">
        <div className="flex flex-col justify-between gap-3 border-b border-neutral-200 pb-3 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900">
              Trait-Subset Sweep (m ∈ {'{'}3, 5, 8, 12, 20, 29{'}'}, 20 Fixed-Seed Subsets for m &lt; 29)
            </h3>
            <p className="mt-0.5 text-xs text-neutral-500">
              Tied pair counts show that any slight divergence in average-linkage ARI stems from
              discrete distance ties and Euclidean&apos;s square-root scale.
            </p>
          </div>
          <select
            value={subsetEndpoint}
            onChange={(e) => setSubsetEndpoint(e.target.value)}
            className="rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-800 focus:border-teal-600 focus:outline-none"
          >
            {SUBSET_ENDPOINTS.map((ep) => (
              <option key={ep.key} value={ep.key}>
                {ep.label}
              </option>
            ))}
          </select>
        </div>

        <div className="h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={subsetChartData} margin={{ top: 8, right: 16, left: -12, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="m_traits"
                tick={{ fill: '#525252', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                label={{
                  value: 'Number of traits (m)',
                  position: 'insideBottom',
                  offset: -2,
                  fontSize: 11,
                  fill: '#737373',
                }}
              />
              <YAxis
                domain={[0, 1]}
                tick={{ fill: '#525252', fontSize: 11, fontFamily: 'JetBrains Mono' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E5E7EB',
                  borderRadius: '6px',
                  fontFamily: 'JetBrains Mono',
                  fontSize: '11px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              {metricNames.map((m) => (
                <Line
                  key={m}
                  type="monotone"
                  dataKey={m}
                  name={m.charAt(0).toUpperCase() + m.slice(1)}
                  stroke={METRIC_COLORS[m]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-200 text-[11px] font-medium text-neutral-500">
                <th className="py-2 pr-2">m</th>
                <th className="px-2 py-2">Metric</th>
                <th className="px-2 py-2 text-right">kNN Macro-F1</th>
                <th className="px-2 py-2 text-right">LOO Macro P@5</th>
                <th className="px-2 py-2 text-right">ARI (Avg)</th>
                <th className="px-2 py-2 text-right">NMI (Avg)</th>
                <th className="px-2 py-2 text-right">ARI (Comp)</th>
                <th className="px-2 py-2 text-right">Tied Pairs</th>
                <th className="py-2 pl-2 text-right">Top-5 Boundary Ties</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {realData.trait_subsets.summary.map((r) => (
                <tr key={`${r.m_traits}-${r.metric}`} className="hover:bg-neutral-50">
                  <td className="num py-2 pr-2 font-medium text-neutral-700">{r.m_traits}</td>
                  <td className="px-2 py-2 font-medium capitalize text-neutral-900">{r.metric}</td>
                  <td className="num whitespace-nowrap px-2 py-2 text-right text-neutral-700">
                    {fmtMS(r.knn_macro_f1_mean, r.knn_macro_f1_std)}
                  </td>
                  <td className="num whitespace-nowrap px-2 py-2 text-right text-neutral-700">
                    {fmtMS(r.loo_macro_p5_mean, r.loo_macro_p5_std)}
                  </td>
                  <td className="num whitespace-nowrap px-2 py-2 text-right text-neutral-700">
                    {fmtMS(r.ari_average_mean, r.ari_average_std)}
                  </td>
                  <td className="num whitespace-nowrap px-2 py-2 text-right text-neutral-700">
                    {fmtMS(r.nmi_average_mean, r.nmi_average_std)}
                  </td>
                  <td className="num whitespace-nowrap px-2 py-2 text-right text-neutral-700">
                    {fmtMS(r.ari_complete_mean, r.ari_complete_std)}
                  </td>
                  <td className="num whitespace-nowrap px-2 py-2 text-right text-neutral-500">
                    {Math.round(r.tied_distance_pairs_mean).toLocaleString()}
                  </td>
                  <td className="num whitespace-nowrap py-2 pl-2 text-right text-neutral-500">
                    {r.top5_boundary_tie_rows_mean.toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Shuffled-Label Control */}
      <div className="paper-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 pb-3">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900">
              Shuffled-Label Control (Experiment A)
            </h3>
            <p className="mt-0.5 text-xs text-neutral-500">
              Seed <span className="num">{shuf.seed}</span> · Expected Macro P@5 chance (1/6):{' '}
              <span className="num">{fmt(shuf.chance_macro_p5)}</span>
            </p>
          </div>
          <span
            className={`rounded px-2 py-0.5 text-xs font-semibold ${
              shuf.all_passed
                ? 'bg-teal-50 text-teal-800 ring-1 ring-teal-200'
                : 'bg-red-50 text-red-800 ring-1 ring-red-200'
            }`}
          >
            {shuf.all_passed ? 'CONTROL PASSED' : 'CONTROL FAILED'}
          </span>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[600px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-200 text-[11px] font-medium text-neutral-500">
                <th className="py-2 pr-2">Metric</th>
                <th className="px-2 py-2 text-right">kNN Macro-F1</th>
                <th className="px-2 py-2 text-right">LOO Macro P@1</th>
                <th className="px-2 py-2 text-right">LOO Macro P@5</th>
                <th className="px-2 py-2 text-right">ARI (Avg)</th>
                <th className="py-2 pl-2 text-right">NMI (Avg)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {Object.entries(shuf.metrics).map(([m, vals]) => (
                <tr key={m}>
                  <td className="py-2 pr-2 font-medium capitalize text-neutral-900">{m}</td>
                  <td className="num whitespace-nowrap px-2 py-2 text-right text-neutral-700">
                    {fmtMS(vals.knn_macro_f1_mean, vals.knn_macro_f1_std)}
                  </td>
                  <td className="num whitespace-nowrap px-2 py-2 text-right text-neutral-700">
                    {fmt(vals.loo_macro_p_at_1)}
                  </td>
                  <td className="num whitespace-nowrap px-2 py-2 text-right text-neutral-700">
                    {fmt(vals.loo_macro_p_at_5)}
                  </td>
                  <td className="num whitespace-nowrap px-2 py-2 text-right text-neutral-700">
                    {fmt(vals.ari_average)}
                  </td>
                  <td className="num whitespace-nowrap py-2 pl-2 text-right text-neutral-700">
                    {fmt(vals.nmi_average)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
