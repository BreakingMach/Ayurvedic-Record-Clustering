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

const SWEEP_LABELS = {
  numeric_cohens_d: "Numeric Separation (Cohen's d)",
  categorical_eps: 'Categorical Noise (ε)',
  outlier_fraction: 'Numeric Outlier Fraction (±6σ)',
  missing_fraction: 'Missing-At-Random Fraction',
  label_noise_rate: 'Evaluation Label Noise Rate',
  m_traits: 'Number of Categorical Traits (m)',
};

const ENDPOINT_OPTIONS = [
  { key: 'knn_macro_f1', label: 'kNN Macro-F1 (3×5 CV)' },
  { key: 'loo_macro_p_at_5', label: 'LOO Macro P@5' },
  { key: 'ari_average', label: 'ARI (Average Linkage)' },
  { key: 'nmi_average', label: 'NMI (Average Linkage)' },
  { key: 'ari_complete', label: 'ARI (Complete Linkage)' },
  { key: 'nmi_complete', label: 'NMI (Complete Linkage)' },
];

function fmt(v, d = 4) {
  return typeof v === 'number' ? v.toFixed(d) : '—';
}

function fmtMS(obj, d = 4) {
  return obj ? `${obj.mean.toFixed(d)} ± ${obj.std.toFixed(d)}` : '—';
}

export default function SyntheticBenchmarkSection({ syntheticData }) {
  const sweepKeys = Object.keys(syntheticData.sweeps);
  const [activeSweep, setActiveSweep] = useState('numeric_cohens_d');
  const [activeEndpoint, setActiveEndpoint] = useState('knn_macro_f1');

  const prov = syntheticData.provenance;
  const metrics = prov.config.experiment_synthetic.metrics;
  const sweepInfo = syntheticData.sweeps[activeSweep];

  const chartData = useMemo(() => {
    return sweepInfo.values.map((val, idx) => {
      const cid = sweepInfo.cell_ids[idx];
      const cell = syntheticData.cells[cid];
      const pt = { sweep_value: String(val) };
      for (const m of metrics) {
        pt[m] = Number(cell.metrics[m][activeEndpoint].mean.toFixed(4));
      }
      return pt;
    });
  }, [sweepInfo, syntheticData.cells, metrics, activeEndpoint]);

  const shuf = syntheticData.shuffled_control;

  return (
    <section id="synthetic-benchmark" className="scroll-mt-20 space-y-6">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold text-neutral-900">
            4. Experiment B — SYNTHETIC / SIMULATED Mixed-Data Benchmark
          </h2>
          <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
            SYNTHETIC / SIMULATED
          </span>
        </div>
        <div className="rounded-md border border-amber-200 bg-amber-50/70 px-4 py-2.5 text-xs leading-relaxed text-amber-950">
          <strong>SYNTHETIC / SIMULATED DATA ONLY:</strong> {syntheticData.warning} All metrics
          below are loaded directly from{' '}
          <code className="num text-[11px]">results/synthetic.json</code> ({prov.n_seeds_used}{' '}
          seeds per cell, {Object.keys(syntheticData.cells).length} unique OFAT cells, runtime{' '}
          <span className="num">{(prov.runtime_seconds / 60).toFixed(2)} min</span>).
        </div>
      </div>

      {/* Interactive OFAT Sweep Plot + Controls */}
      <div className="paper-card p-5 space-y-4">
        <div className="flex flex-col justify-between gap-3 border-b border-neutral-200 pb-4 lg:flex-row lg:items-center">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900">
              OFAT Sweep Explorer (SYNTHETIC) — {SWEEP_LABELS[activeSweep] || activeSweep}
            </h3>
            <p className="mt-0.5 text-xs text-neutral-500">
              Mean across <span className="num">{prov.n_seeds_used}</span> seeds per cell. Baseline:{' '}
              <code className="num text-[11px]">{prov.baseline_cell_id}</code>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={activeSweep}
              onChange={(e) => setActiveSweep(e.target.value)}
              className="rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-800 focus:border-teal-600 focus:outline-none"
            >
              {sweepKeys.map((k) => (
                <option key={k} value={k}>
                  Sweep: {SWEEP_LABELS[k] || k}
                </option>
              ))}
            </select>

            <select
              value={activeEndpoint}
              onChange={(e) => setActiveEndpoint(e.target.value)}
              className="rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-800 focus:border-teal-600 focus:outline-none"
            >
              {ENDPOINT_OPTIONS.map((ep) => (
                <option key={ep.key} value={ep.key}>
                  Metric: {ep.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 16, left: -10, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="sweep_value"
                tick={{ fill: '#525252', fontSize: 11, fontFamily: 'JetBrains Mono' }}
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
              {metrics.map((m) => (
                <Line
                  key={m}
                  type="monotone"
                  dataKey={m}
                  name={m.charAt(0).toUpperCase() + m.slice(1)}
                  stroke={METRIC_COLORS[m]}
                  strokeWidth={2}
                  dot={{ r: 3.5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Detailed Cell Table for Active Sweep */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-200 text-[11px] font-medium text-neutral-500">
                <th className="py-2 pr-2">Value</th>
                <th className="px-2 py-2">Metric</th>
                <th className="px-2 py-2 text-right">kNN Macro-F1</th>
                <th className="px-2 py-2 text-right">LOO Macro P@5</th>
                <th className="px-2 py-2 text-right">ARI (Avg)</th>
                <th className="px-2 py-2 text-right">NMI (Avg)</th>
                <th className="px-2 py-2 text-right">ARI (Comp)</th>
                <th className="px-2 py-2 text-right">NMI (Comp)</th>
                <th className="py-2 pl-2 text-right">Sil* (Avg)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {sweepInfo.values.map((val, idx) => {
                const cid = sweepInfo.cell_ids[idx];
                const cell = syntheticData.cells[cid];
                return metrics.map((m) => {
                  const ms = cell.metrics[m];
                  return (
                    <tr key={`${cid}-${m}`} className="hover:bg-neutral-50">
                      <td className="num py-2 pr-2 font-medium text-neutral-700">{val}</td>
                      <td className="px-2 py-2 font-medium capitalize text-neutral-900">{m}</td>
                      <td className="num whitespace-nowrap px-2 py-2 text-right text-neutral-800">
                        {fmtMS(ms.knn_macro_f1)}
                      </td>
                      <td className="num whitespace-nowrap px-2 py-2 text-right text-neutral-800">
                        {fmtMS(ms.loo_macro_p_at_5)}
                      </td>
                      <td className="num whitespace-nowrap px-2 py-2 text-right text-neutral-800">
                        {fmtMS(ms.ari_average)}
                      </td>
                      <td className="num whitespace-nowrap px-2 py-2 text-right text-neutral-800">
                        {fmtMS(ms.nmi_average)}
                      </td>
                      <td className="num whitespace-nowrap px-2 py-2 text-right text-neutral-800">
                        {fmtMS(ms.ari_complete)}
                      </td>
                      <td className="num whitespace-nowrap px-2 py-2 text-right text-neutral-800">
                        {fmtMS(ms.nmi_complete)}
                      </td>
                      <td className="num whitespace-nowrap py-2 pl-2 text-right text-neutral-500">
                        {fmtMS(ms.silhouette_average_not_comparable)}
                      </td>
                    </tr>
                  );
                });
              })}
            </tbody>
          </table>
        </div>

        {/* Pooled Paired Wilcoxon + Holm Table for Active Sweep */}
        <div className="border-t border-neutral-200 pt-4">
          <h4 className="text-xs font-semibold text-neutral-900">
            Pooled Paired Wilcoxon Signed-Rank Tests with Holm Correction ({sweepInfo.n_paired_observations} paired observations, endpoint: {activeEndpoint})
          </h4>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[660px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-neutral-200 text-[11px] font-medium text-neutral-500">
                  <th className="py-2 pr-2">Metric A</th>
                  <th className="px-2 py-2">Metric B</th>
                  <th className="px-2 py-2 text-right">Mean Diff (A−B)</th>
                  <th className="px-2 py-2 text-right">Cohen dz</th>
                  <th className="px-2 py-2 text-right">Rank-Biserial r</th>
                  <th className="px-2 py-2 text-right">p (raw)</th>
                  <th className="px-2 py-2 text-right">p (Holm)</th>
                  <th className="py-2 pl-2 text-right">Sig (α=0.05)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {sweepInfo.pooled_paired_stats[activeEndpoint].pairwise.map((pr) => (
                  <tr key={`${pr.metric_a}-${pr.metric_b}`}>
                    <td className="py-2 pr-2 font-medium capitalize text-neutral-900">
                      {pr.metric_a}
                    </td>
                    <td className="px-2 py-2 font-medium capitalize text-neutral-900">
                      {pr.metric_b}
                    </td>
                    <td className="num whitespace-nowrap px-2 py-2 text-right text-neutral-800">
                      {fmt(pr.mean_diff, 4)}
                    </td>
                    <td className="num whitespace-nowrap px-2 py-2 text-right text-neutral-700">
                      {fmt(pr.cohen_dz, 3)}
                    </td>
                    <td className="num whitespace-nowrap px-2 py-2 text-right text-neutral-700">
                      {fmt(pr.rank_biserial_r, 3)}
                    </td>
                    <td className="num whitespace-nowrap px-2 py-2 text-right text-neutral-600">
                      {fmt(pr.p_raw, 4)}
                    </td>
                    <td className="num whitespace-nowrap px-2 py-2 text-right font-medium text-neutral-900">
                      {fmt(pr.p_holm, 4)}
                    </td>
                    <td className="whitespace-nowrap py-2 pl-2 text-right">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                          pr.significant_holm
                            ? 'bg-teal-50 text-teal-800 ring-1 ring-teal-200'
                            : 'bg-neutral-100 text-neutral-600'
                        }`}
                      >
                        {pr.significant_holm ? 'YES' : 'no'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] text-neutral-500">
            *Silhouette is computed inside each metric&apos;s own distance space and is{' '}
            <strong>not comparable across metrics</strong>.
          </p>
        </div>
      </div>

      {/* Full Winner Map Across All 6 Sweeps */}
      <div className="paper-card overflow-hidden">
        <div className="border-b border-neutral-200 px-5 py-3.5">
          <h3 className="text-sm font-semibold text-neutral-900">
            Table B1 — Unique Significant Winner Map Across All Sweeps (SYNTHETIC)
          </h3>
          <p className="mt-0.5 text-xs text-neutral-500">
            A metric is named ONLY if it has the highest mean AND beats BOTH other metrics at
            Holm-adjusted paired Wilcoxon <span className="num">p &lt; 0.05</span>.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50/70 text-[11px] font-medium text-neutral-500">
                <th className="py-2 pl-5 pr-2">Sweep</th>
                <th className="px-2 py-2 text-right">Value</th>
                <th className="px-3 py-2">kNN Macro-F1</th>
                <th className="px-3 py-2">LOO Macro P@5</th>
                <th className="px-3 py-2">ARI (Avg)</th>
                <th className="py-2 pl-3 pr-5">ARI (Comp)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {Object.entries(syntheticData.sweeps).flatMap(([sName, sInfo]) =>
                sInfo.values.map((val, idx) => {
                  const cid = sInfo.cell_ids[idx];
                  const w = syntheticData.cells[cid].winners;
                  const cellClass = (txt) =>
                    txt.startsWith('none')
                      ? 'text-neutral-400'
                      : txt === 'gower'
                        ? 'font-semibold text-teal-800 capitalize'
                        : 'font-semibold text-neutral-900 capitalize';
                  return (
                    <tr key={`${sName}-${val}`} className="hover:bg-neutral-50">
                      <td className="num py-2 pl-5 pr-2 text-neutral-700">{sName}</td>
                      <td className="num px-2 py-2 text-right text-neutral-800">{val}</td>
                      <td className={`px-3 py-2 ${cellClass(w.knn_macro_f1)}`}>{w.knn_macro_f1}</td>
                      <td className={`px-3 py-2 ${cellClass(w.loo_macro_p_at_5)}`}>
                        {w.loo_macro_p_at_5}
                      </td>
                      <td className={`px-3 py-2 ${cellClass(w.ari_average)}`}>{w.ari_average}</td>
                      <td className={`py-2 pl-3 pr-5 ${cellClass(w.ari_complete)}`}>
                        {w.ari_complete}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Baseline Shuffled-Label Control */}
      <div className="paper-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900">
              Baseline Shuffled-Label Control (SYNTHETIC)
            </h3>
            <p className="mt-0.5 text-xs text-neutral-500">
              Cell <code className="num text-[11px]">{shuf.cell_id}</code> · Seed{' '}
              <span className="num">{shuf.seed}</span> · Chance Macro P@5:{' '}
              <span className="num">{fmt(shuf.chance_macro_p5)}</span>
            </p>
          </div>
          <span className="rounded bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-800 ring-1 ring-teal-200">
            {shuf.all_passed ? 'CONTROL PASSED' : 'CONTROL FAILED'}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {Object.entries(shuf.metrics).map(([m, v]) => (
            <div key={m} className="rounded border border-neutral-200 bg-neutral-50/70 p-3 text-xs">
              <div className="font-semibold capitalize text-neutral-900">{m}</div>
              <div className="num mt-1 text-[11px] text-neutral-600">
                kNN F1: {fmt(v.knn_macro_f1_mean)} · LOO P@5: {fmt(v.loo_macro_p_at_5)} · ARI Avg:{' '}
                {fmt(v.ari_average)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
