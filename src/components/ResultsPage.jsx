import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
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

// Neutral + single accent palette for distance lines (Okabe-Ito reserved strictly for 6 Dosha classes)
const LINE_STYLE = {
  gower: { stroke: '#0F766E', dash: undefined, label: 'Gower' },
  euclidean: { stroke: '#262626', dash: undefined, label: 'Euclidean' },
  cosine: { stroke: '#737373', dash: '4 3', label: 'Cosine' },
};

const SWEEP_TITLES = {
  numeric_cohens_d: "Numeric separation (Cohen's d)",
  categorical_eps: 'Categorical noise (ε)',
  outlier_fraction: 'Numeric outlier fraction',
  missing_fraction: 'Missing-at-random fraction',
  label_noise_rate: 'Evaluation label noise',
  m_traits: 'Categorical traits (m)',
};

function fmt(v, d = 4) {
  return typeof v === 'number' ? v.toFixed(d) : '—';
}

function fmtMS(mean, std, d = 4) {
  return `${mean.toFixed(d)} ± ${std.toFixed(d)}`;
}

function SignificanceDot(props) {
  const { cx, cy, payload, metricKey, stroke } = props;
  if (cx == null || cy == null) return null;
  const isWinner = payload && payload.winner === metricKey;
  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={isWinner ? 4.5 : 2.5}
        fill={isWinner ? stroke : '#FFFFFF'}
        stroke={stroke}
        strokeWidth={1.5}
      />
      {isWinner && (
        <text
          x={cx}
          y={cy - 7}
          textAnchor="middle"
          fill={stroke}
          fontSize={11}
          fontWeight={700}
          fontFamily="JetBrains Mono, monospace"
        >
          *
        </text>
      )}
    </g>
  );
}

export default function ResultsPage({ realData, syntheticData }) {
  const [showSubsets, setShowSubsets] = useState(false);
  const [showSweepStats, setShowSweepStats] = useState(false);

  const fullMetrics = realData.full_29_traits.metrics;
  const metricNames = Object.keys(fullMetrics);
  const synthProv = syntheticData.provenance;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Results</h1>
        <p className="mt-2 text-sm text-neutral-600">
          All tables and charts below render directly from{' '}
          <code className="num text-xs">results/real_data.json</code> and{' '}
          <code className="num text-xs">results/synthetic.json</code>.
        </p>
      </div>

      {/* (a) Real-Data Table */}
      <div className="paper-card overflow-hidden">
        <div className="border-b border-neutral-200 px-6 py-4">
          <h2 className="text-sm font-semibold text-neutral-900">
            (a) Real Categorical Data — Full Trait Evaluation
          </h2>
          <p className="mt-1 text-xs text-neutral-500">
            kNN macro-F1 reported as mean ± std across repeated stratified CV folds; clustering at
            fixed average and complete linkage.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-500">
                <th className="py-3 pl-6 pr-3 font-medium">Metric</th>
                <th className="px-3 py-3 text-right font-medium">kNN Macro-F1</th>
                <th className="px-3 py-3 text-right font-medium">LOO Macro P@5</th>
                <th className="px-3 py-3 text-right font-medium">ARI (Avg)</th>
                <th className="px-3 py-3 text-right font-medium">NMI (Avg)</th>
                <th className="px-3 py-3 text-right font-medium">ARI (Comp)</th>
                <th className="px-3 py-3 text-right font-medium">NMI (Comp)</th>
                <th className="py-3 pl-3 pr-6 text-right font-medium">Silhouette* (Avg / Comp)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {metricNames.map((m) => {
                const ev = fullMetrics[m];
                const avg = ev.clustering.linkages.average;
                const comp = ev.clustering.linkages.complete;
                return (
                  <tr key={m} className="hover:bg-neutral-50">
                    <td className="whitespace-nowrap py-3 pl-6 pr-3 font-medium capitalize text-neutral-900">
                      {m}
                    </td>
                    <td className="num whitespace-nowrap px-3 py-3 text-right text-neutral-800">
                      {fmtMS(ev.knn_cv.macro_f1_mean, ev.knn_cv.macro_f1_std)}
                    </td>
                    <td className="num whitespace-nowrap px-3 py-3 text-right text-neutral-800">
                      {fmt(ev.loo_retrieval.macro.p_at_5)}
                    </td>
                    <td className="num whitespace-nowrap px-3 py-3 text-right text-neutral-800">
                      {fmt(avg.ari)}
                    </td>
                    <td className="num whitespace-nowrap px-3 py-3 text-right text-neutral-800">
                      {fmt(avg.nmi)}
                    </td>
                    <td className="num whitespace-nowrap px-3 py-3 text-right text-neutral-800">
                      {fmt(comp.ari)}
                    </td>
                    <td className="num whitespace-nowrap px-3 py-3 text-right text-neutral-800">
                      {fmt(comp.nmi)}
                    </td>
                    <td className="num whitespace-nowrap py-3 pl-3 pr-6 text-right text-neutral-500">
                      {fmt(avg.silhouette)} / {fmt(comp.silhouette)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="border-t border-neutral-200 bg-neutral-50 px-6 py-3 text-xs text-neutral-600 space-y-1">
          <div>
            *Silhouette: <strong>{fullMetrics.gower.clustering.silhouette_note}</strong>.
          </div>
          <div>
            Three smallest classes (LOO P@1 / P@5 / P@10, identical across all three metrics):{' '}
            {Object.entries(fullMetrics.gower.loo_retrieval.smallest_classes).map(
              ([cls, st], i) => (
                <span key={cls}>
                  {i > 0 && ' · '}
                  {cls}: <span className="num">{fmt(st.p_at_1)}</span> /{' '}
                  <span className="num">{fmt(st.p_at_5)}</span> /{' '}
                  <span className="num">{fmt(st.p_at_10)}</span>
                </span>
              )
            )}
            .
          </div>
        </div>
      </div>

      {/* (b) Equivalence Result + Collapsible Trait-Subset Table */}
      <div className="paper-card overflow-hidden">
        <div className="border-b border-neutral-200 px-6 py-4">
          <h2 className="text-sm font-semibold text-neutral-900">
            (b) Pairwise Metric Equivalence on Real Categorical Data
          </h2>
          <p className="mt-1 text-xs text-neutral-500">
            Pairwise comparison across all four categorical-capable distances on the full real CSV.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-500">
                <th className="py-2.5 pl-6 pr-3 font-medium">Metric A</th>
                <th className="px-3 py-2.5 font-medium">Metric B</th>
                <th className="px-3 py-2.5 text-right font-medium">Spearman ρ</th>
                <th className="px-3 py-2.5 text-right font-medium">Max Abs Diff (Min-Max)</th>
                <th className="py-2.5 pl-3 pr-6 text-right font-medium">Mean Top-5 Overlap</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {realData.equivalence.map((r) => (
                <tr key={`${r.metric_a}-${r.metric_b}`} className="hover:bg-neutral-50">
                  <td className="py-2.5 pl-6 pr-3 font-medium capitalize text-neutral-900">
                    {r.metric_a}
                  </td>
                  <td className="px-3 py-2.5 font-medium capitalize text-neutral-900">
                    {r.metric_b}
                  </td>
                  <td className="num whitespace-nowrap px-3 py-2.5 text-right font-semibold text-teal-800">
                    {fmt(r.spearman_rho, 6)}
                  </td>
                  <td className="num whitespace-nowrap px-3 py-2.5 text-right text-neutral-700">
                    {fmt(r.max_abs_diff_minmax, 6)}
                  </td>
                  <td className="num whitespace-nowrap py-2.5 pl-3 pr-6 text-right text-neutral-800">
                    {fmt(r.mean_top5_overlap, 4)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Collapsible Trait-Subset Sweep Table */}
        <div className="border-t border-neutral-200">
          <button
            type="button"
            onClick={() => setShowSubsets((v) => !v)}
            className="flex w-full items-center justify-between px-6 py-3 text-left text-xs font-medium text-neutral-700 hover:bg-neutral-50"
          >
            <span className="inline-flex items-center gap-2">
              {showSubsets ? (
                <ChevronDown className="h-3.5 w-3.5 text-neutral-500" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-neutral-500" />
              )}
              Trait-subset sweep with tied-distance counts (
              <span className="num">{realData.trait_subsets.subset_sizes.join(', ')}</span> traits)
            </span>
            <span className="text-teal-700">{showSubsets ? 'Hide' : 'Show'}</span>
          </button>

          {showSubsets && (
            <div className="overflow-x-auto border-t border-neutral-200">
              <table className="w-full min-w-[820px] border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-500">
                    <th className="py-2 pl-6 pr-2 font-medium">m</th>
                    <th className="px-2 py-2 font-medium">Metric</th>
                    <th className="px-2 py-2 text-right font-medium">kNN Macro-F1</th>
                    <th className="px-2 py-2 text-right font-medium">LOO P@5</th>
                    <th className="px-2 py-2 text-right font-medium">ARI (Avg)</th>
                    <th className="px-2 py-2 text-right font-medium">NMI (Avg)</th>
                    <th className="px-2 py-2 text-right font-medium">Tied Pairs</th>
                    <th className="py-2 pl-2 pr-6 text-right font-medium">Top-5 Tie Rows</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {realData.trait_subsets.summary.map((r) => (
                    <tr key={`${r.m_traits}-${r.metric}`}>
                      <td className="num py-2 pl-6 pr-2 text-neutral-700">{r.m_traits}</td>
                      <td className="px-2 py-2 font-medium capitalize text-neutral-900">
                        {r.metric}
                      </td>
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
                      <td className="num whitespace-nowrap px-2 py-2 text-right text-neutral-500">
                        {Math.round(r.tied_distance_pairs_mean).toLocaleString()}
                      </td>
                      <td className="num whitespace-nowrap py-2 pl-2 pr-6 text-right text-neutral-500">
                        {r.top5_boundary_tie_rows_mean.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* (c) Synthetic Sweeps Small-Multiples Grid (kNN macro-F1 vs each factor, SIMULATED badge on every chart) */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">
              (c) Synthetic Mixed-Data Sweeps — kNN Macro-F1 Across Each Factor
            </h2>
            <p className="mt-1 text-xs text-neutral-500">
              Mean across <span className="num">{synthProv.n_seeds_used}</span> seeds per cell.
              Asterisk (<span className="num font-semibold">*</span>) marks a unique Holm-adjusted
              paired Wilcoxon winner (<span className="num">p &lt; 0.05</span> against both other
              metrics).
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Object.entries(syntheticData.sweeps).map(([sweepKey, sweepInfo]) => {
            const series = sweepInfo.values.map((val, idx) => {
              const cid = sweepInfo.cell_ids[idx];
              const cell = syntheticData.cells[cid];
              return {
                x: String(val),
                gower: Number(cell.metrics.gower.knn_macro_f1.mean.toFixed(4)),
                euclidean: Number(cell.metrics.euclidean.knn_macro_f1.mean.toFixed(4)),
                cosine: Number(cell.metrics.cosine.knn_macro_f1.mean.toFixed(4)),
                winner: cell.winners.knn_macro_f1,
              };
            });

            return (
              <div key={sweepKey} className="paper-card p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-xs font-semibold text-neutral-900">
                    {SWEEP_TITLES[sweepKey] || sweepKey}
                  </h3>
                  <span className="shrink-0 rounded border border-teal-700/30 bg-teal-50 px-1.5 py-0.5 text-[10px] font-medium text-teal-800">
                    SIMULATED
                  </span>
                </div>

                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={series} margin={{ top: 14, right: 12, left: -18, bottom: 2 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis
                        dataKey="x"
                        tick={{ fill: '#525252', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                      />
                      <YAxis
                        domain={[0.3, 1]}
                        tick={{ fill: '#525252', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #E5E7EB',
                          borderRadius: '4px',
                          fontFamily: 'JetBrains Mono',
                          fontSize: '11px',
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '10px' }} />
                      {['gower', 'euclidean', 'cosine'].map((m) => (
                        <Line
                          key={m}
                          type="monotone"
                          dataKey={m}
                          name={LINE_STYLE[m].label}
                          stroke={LINE_STYLE[m].stroke}
                          strokeDasharray={LINE_STYLE[m].dash}
                          strokeWidth={2}
                          dot={<SignificanceDot metricKey={m} stroke={LINE_STYLE[m].stroke} />}
                          activeDot={{ r: 4 }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="border-t border-neutral-100 pt-2 text-[11px] text-neutral-500">
                  Sig. winners:{' '}
                  {series.map((pt, i) => (
                    <span key={pt.x}>
                      {i > 0 && ' · '}
                      <span className="num">{pt.x}</span>:{' '}
                      <span
                        className={
                          pt.winner.startsWith('none')
                            ? 'text-neutral-400'
                            : 'font-medium capitalize text-neutral-800'
                        }
                      >
                        {pt.winner.startsWith('none') ? 'n.s.' : `${pt.winner}*`}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Collapsible Pooled Wilcoxon + Holm Summary Table for Synthetic Sweeps */}
        <div className="paper-card overflow-hidden">
          <button
            type="button"
            onClick={() => setShowSweepStats((v) => !v)}
            className="flex w-full items-center justify-between px-6 py-3 text-left text-xs font-medium text-neutral-700 hover:bg-neutral-50"
          >
            <span className="inline-flex items-center gap-2">
              {showSweepStats ? (
                <ChevronDown className="h-3.5 w-3.5 text-neutral-500" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-neutral-500" />
              )}
              Pooled paired Wilcoxon + Holm statistics across synthetic sweeps (SIMULATED)
            </span>
            <span className="text-teal-700">{showSweepStats ? 'Hide' : 'Show'}</span>
          </button>

          {showSweepStats && (
            <div className="overflow-x-auto border-t border-neutral-200">
              <table className="w-full min-w-[780px] border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-500">
                    <th className="py-2 pl-6 pr-2 font-medium">Sweep</th>
                    <th className="px-2 py-2 font-medium">Pair</th>
                    <th className="px-2 py-2 text-right font-medium">kNN F1 Diff</th>
                    <th className="px-2 py-2 text-right font-medium">Cohen dz</th>
                    <th className="px-2 py-2 text-right font-medium">p (Holm)</th>
                    <th className="py-2 pl-2 pr-6 text-right font-medium">ARI Avg Diff (p Holm)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {Object.entries(syntheticData.sweeps).flatMap(([sKey, sInfo]) =>
                    sInfo.pooled_paired_stats.knn_macro_f1.pairwise.map((pr, idx) => {
                      const ariPr = sInfo.pooled_paired_stats.ari_average.pairwise[idx];
                      return (
                        <tr key={`${sKey}-${pr.metric_a}-${pr.metric_b}`}>
                          <td className="num py-2 pl-6 pr-2 text-neutral-700">{sKey}</td>
                          <td className="whitespace-nowrap px-2 py-2 font-medium capitalize text-neutral-900">
                            {pr.metric_a} vs {pr.metric_b}
                          </td>
                          <td className="num whitespace-nowrap px-2 py-2 text-right text-neutral-800">
                            {fmt(pr.mean_diff, 4)}
                          </td>
                          <td className="num whitespace-nowrap px-2 py-2 text-right text-neutral-700">
                            {fmt(pr.cohen_dz, 3)}
                          </td>
                          <td className="num whitespace-nowrap px-2 py-2 text-right font-medium text-neutral-900">
                            {fmt(pr.p_holm, 4)}
                          </td>
                          <td className="num whitespace-nowrap py-2 pl-2 pr-6 text-right text-neutral-700">
                            {fmt(ariPr.mean_diff, 4)} ({fmt(ariPr.p_holm, 4)})
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
