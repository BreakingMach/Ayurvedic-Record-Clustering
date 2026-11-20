import React, { useState, useMemo } from 'react';
import {
  ExternalLink,
  Database,
  Scale,
  Activity,
  CheckCircle2,
  FlaskConical,
  ArrowRight,
  Sparkles,
  Layers,
  ShieldAlert,
  BarChart2,
} from 'lucide-react';
import { STUDY_METADATA, DOSHA_PALETTE } from '../data/literatureData';
import { retrieveTopKReal } from '../utils/distanceEngine';

function fmt(v, digits = 4) {
  return typeof v === 'number' ? v.toFixed(digits) : '—';
}

export default function OverviewPage({
  realData,
  syntheticData,
  expertReview,
  realCases,
  onNavigate,
}) {
  const [sampleIdx, setSampleIdx] = useState(0);

  const realMeta = realData?.provenance?.dataset_metadata || {};
  const fullMetrics = realData?.full_29_traits?.metrics || {};
  const shuffled = realData?.shuffled_control;
  const geEquiv = realData?.equivalence?.find(
    (e) => e.metric_a === 'gower' && e.metric_b === 'euclidean'
  );

  const sweepD = syntheticData?.sweeps?.numeric_cohens_d?.cell_ids;
  const d0Cell = sweepD ? syntheticData?.cells?.[sweepD[0]] : null;
  const d2Cell = sweepD ? syntheticData?.cells?.[sweepD[sweepD.length - 1]] : null;
  const outCellIds = syntheticData?.sweeps?.outlier_fraction?.cell_ids;
  const out05Cell = outCellIds ? syntheticData?.cells?.[outCellIds[1]] : null;

  const classEntries = Object.entries(realMeta.class_counts || {});

  // Live mini similarity preview on the dashboard
  const records = realCases?.records || [];
  const currentRecord = records[sampleIdx] || records[0];
  const quickRetrieval = useMemo(() => {
    if (!currentRecord || !realCases?.categorical_cols) return null;
    return retrieveTopKReal(currentRecord, realCases, 3);
  }, [currentRecord, realCases]);

  return (
    <div className="space-y-8">
      {/* Executive Hero Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 p-8 text-white shadow-sm border border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-700/80 pb-6 mb-6">
          <div className="flex items-center gap-2 text-xs font-medium text-emerald-400">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400" />
            <span>{STUDY_METADATA.institution} · {STUDY_METADATA.program}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-slate-800/80 border border-slate-700 px-3 py-1 text-xs text-slate-300">
              {expertReview.display_label}
            </span>
            <a
              href={STUDY_METADATA.repoUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-emerald-300 hover:text-white transition font-medium"
            >
              GitHub Repository
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        <div className="max-w-4xl space-y-3">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white leading-tight">
            Ayurvedic Patient Similarity Analytics Dashboard
          </h1>
          <p className="text-sm leading-relaxed text-slate-300">
            Benchmarking <strong>Gower</strong>, <strong>Euclidean</strong>, and <strong>Cosine</strong> distance
            engines across <span className="num font-semibold text-white">{realMeta.n_rows}</span> patient profiles.
            Validating mixed categorical–continuous distance metrics for patient retrieval, cluster coherence,
            and phenotypic concordance.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3 pt-2">
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('/workbench')}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-semibold text-white transition shadow-sm"
            >
              <FlaskConical className="h-4 w-4" />
              Launch Similarity Workbench
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('/comparison')}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-200 transition"
            >
              <Scale className="h-4 w-4 text-emerald-400" />
              Explore Distance Benchmarks
            </button>
          )}
        </div>
      </div>

      {/* Row of 4 Core Key Performance Indicators (KPI Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="health-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">Cohort Population</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60">
              <Database className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="num text-2xl font-bold text-slate-900 tracking-tight">
              {realMeta.n_rows}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Case records in <code className="num font-mono text-[11px] text-slate-700">{realMeta.csv_member}</code>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
            <span>Phenotypic traits:</span>
            <span className="num font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60">
              {realMeta.n_categorical} Categorical
            </span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="health-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">Equivalence Index</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-700 ring-1 ring-teal-200/60">
              <Scale className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="num text-2xl font-bold text-slate-900 tracking-tight">
              ρ = {fmt(geEquiv?.spearman_rho, 4)}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Spearman rank correlation across engines
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
            <span>Top-5 overlap:</span>
            <span className="num font-semibold text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200/60">
              {fmt(geEquiv?.mean_top5_overlap, 4)} Monotonic
            </span>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="health-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">Retrieval P@5</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-700 ring-1 ring-sky-200/60">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="num text-2xl font-bold text-slate-900 tracking-tight">
              {fmt(fullMetrics.gower?.loo_retrieval?.macro?.p_at_5, 4)}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Leave-One-Out nearest neighbor precision
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
            <span>Shuffled control:</span>
            <span className="num font-semibold text-slate-500">
              {fmt(shuffled?.metrics?.gower?.loo_macro_p_at_5, 4)} (Chance)
            </span>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="health-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">Reviewer Audit</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-700 ring-1 ring-amber-200/60">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900 tracking-tight">
              Pending
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Blinded practitioner similarity rating sheet
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
            <span>Protocol state:</span>
            <span className="rounded bg-amber-50 text-amber-800 px-2 py-0.5 text-[10px] font-semibold border border-amber-200/60">
              Unblinded verification
            </span>
          </div>
        </div>
      </div>

      {/* Benchmark Summary Comparative Grid */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Algorithmic Distance Benchmark Matrix
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Comparative evaluation of Gower, Euclidean, Cosine, and Permutation Control on {realMeta.n_rows} records.
            </p>
          </div>
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('/comparison')}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition flex items-center gap-1"
            >
              View Full Benchmark Tables &rarr;
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600">
                <th className="py-3 px-4 font-semibold">Distance Algorithm</th>
                <th className="py-3 px-4 text-right font-semibold">kNN Macro-F1</th>
                <th className="py-3 px-4 text-right font-semibold">LOO P@1</th>
                <th className="py-3 px-4 text-right font-semibold">LOO P@5</th>
                <th className="py-3 px-4 text-right font-semibold">LOO P@10</th>
                <th className="py-3 px-4 text-right font-semibold">ARI (Average Linkage)</th>
                <th className="py-3 px-4 text-right font-semibold">NMI (Average Linkage)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {['gower', 'euclidean', 'cosine'].map((mKey) => {
                const m = fullMetrics[mKey];
                if (!m) return null;
                return (
                  <tr key={mKey} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4 font-semibold text-slate-900 capitalize flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-600" />
                      {mKey} Distance
                    </td>
                    <td className="num py-3 px-4 text-right font-semibold text-slate-800">
                      {fmt(m.knn_cv?.macro_f1_mean, 4)}
                    </td>
                    <td className="num py-3 px-4 text-right text-slate-700">
                      {fmt(m.loo_retrieval?.macro?.p_at_1, 4)}
                    </td>
                    <td className="num py-3 px-4 text-right text-slate-700">
                      {fmt(m.loo_retrieval?.macro?.p_at_5, 4)}
                    </td>
                    <td className="num py-3 px-4 text-right text-slate-700">
                      {fmt(m.loo_retrieval?.macro?.p_at_10, 4)}
                    </td>
                    <td className="num py-3 px-4 text-right text-slate-700">
                      {fmt(m.clustering?.linkages?.average?.ari, 4)}
                    </td>
                    <td className="num py-3 px-4 text-right text-slate-700">
                      {fmt(m.clustering?.linkages?.average?.nmi, 4)}
                    </td>
                  </tr>
                );
              })}
              {shuffled && (
                <tr className="bg-slate-50/80 text-slate-500 italic">
                  <td className="py-3 px-4 font-medium flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-slate-400" />
                    Shuffled Label Control
                  </td>
                  <td className="num py-3 px-4 text-right">
                    {fmt(shuffled.metrics?.gower?.knn_macro_f1_mean, 4)}
                  </td>
                  <td className="num py-3 px-4 text-right">
                    {fmt(shuffled.metrics?.gower?.loo_macro_p_at_1, 4)}
                  </td>
                  <td className="num py-3 px-4 text-right">
                    {fmt(shuffled.metrics?.gower?.loo_macro_p_at_5, 4)}
                  </td>
                  <td className="num py-3 px-4 text-right">
                    {fmt(shuffled.metrics?.gower?.loo_macro_p_at_10, 4)}
                  </td>
                  <td className="num py-3 px-4 text-right">
                    {fmt(shuffled.metrics?.gower?.ari_average, 4)}
                  </td>
                  <td className="num py-3 px-4 text-right">
                    {fmt(shuffled.metrics?.gower?.nmi_average, 4)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Interactive Live Similarity Previewer Widget */}
      {currentRecord && quickRetrieval && (
        <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 text-xs font-semibold">
                  LIVE ENGINE INTERFACE
                </span>
                <h2 className="text-base font-bold text-slate-900">
                  Instant Patient Similarity Query Preview
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Select any patient record to test real-time nearest neighbor similarity matching.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Quick Cases:</span>
              {[0, 1, 2, 3].map((idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSampleIdx(idx)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-mono transition ${
                    sampleIdx === idx
                      ? 'bg-slate-900 text-white font-semibold'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  #{idx + 1}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* Query Case Card */}
            <div className="md:col-span-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="num font-bold text-slate-900 text-sm">
                  Query: {currentRecord.case_id}
                </span>
                <span
                  className="rounded-full px-2.5 py-0.5 text-xs font-semibold text-white shadow-xs"
                  style={{ backgroundColor: DOSHA_PALETTE[currentRecord.dataset_label] || '#0F766E' }}
                >
                  {currentRecord.dataset_label}
                </span>
              </div>

              <div className="text-xs text-slate-600 space-y-1.5 pt-1">
                <div className="flex justify-between border-b border-slate-200/60 pb-1">
                  <span className="text-slate-500">Body Size:</span>
                  <span className="font-medium text-slate-800">{currentRecord.traits[0]}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 pb-1">
                  <span className="text-slate-500">Body Weight:</span>
                  <span className="font-medium text-slate-800 truncate max-w-[160px]">{currentRecord.traits[1]}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 pb-1">
                  <span className="text-slate-500">Height:</span>
                  <span className="font-medium text-slate-800">{currentRecord.traits[2]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Skin Texture:</span>
                  <span className="font-medium text-slate-800">{currentRecord.traits[6]}</span>
                </div>
              </div>

              {onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate('/workbench')}
                  className="w-full mt-2 inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white py-2 text-xs font-semibold transition"
                >
                  Open in Similarity Workbench &rarr;
                </button>
              )}
            </div>

            {/* Retrieved Neighbours Table */}
            <div className="md:col-span-8 overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2 px-3 font-semibold">Rank</th>
                    <th className="py-2 px-3 font-semibold">Nearest Record</th>
                    <th className="py-2 px-3 font-semibold">Dosha Label</th>
                    <th className="py-2 px-3 text-right font-semibold">Gower Distance</th>
                    <th className="py-2 px-3 text-right font-semibold">Matched Traits</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {quickRetrieval.byMetric.gower?.map((item, rIdx) => (
                    <tr key={item.record.case_id} className="hover:bg-slate-50">
                      <td className="num py-2 px-3 font-bold text-slate-400">#{rIdx + 1}</td>
                      <td className="num py-2 px-3 font-bold text-slate-900">{item.record.case_id}</td>
                      <td className="py-2 px-3">
                        <span
                          className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-white shadow-2xs"
                          style={{ backgroundColor: DOSHA_PALETTE[item.record.dataset_label] || '#0F766E' }}
                        >
                          {item.record.dataset_label}
                        </span>
                      </td>
                      <td className="num py-2 px-3 text-right font-mono font-semibold text-emerald-800">
                        {fmt(item.distances.gower, 4)}
                      </td>
                      <td className="num py-2 px-3 text-right font-medium text-slate-700">
                        {item.matchedCount} of {item.totalTraits}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Cohort Class Distribution */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Phenotypic Class Distribution
            </h2>
            <p className="text-xs text-slate-500">
              Total cohort representation across the six dataset-provided Dosha categories (N = {realMeta.n_rows}).
            </p>
          </div>
          <span className="num text-xs font-semibold text-slate-500">
            Total Cases: {realMeta.n_rows}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {classEntries.map(([cls, cnt]) => {
            const pct = realMeta.n_rows ? (cnt / realMeta.n_rows) * 100 : 0;
            return (
              <div key={cls} className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3.5 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: DOSHA_PALETTE[cls] }}
                  />
                  <span className="truncate">{cls}</span>
                </div>
                <div className="num text-xl font-bold text-slate-900">
                  {cnt}
                </div>
                <div className="text-[11px] text-slate-500">
                  <span className="num">{pct.toFixed(1)}%</span> of cohort
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, backgroundColor: DOSHA_PALETTE[cls] }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Core Research Findings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Finding 1 */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <Scale className="h-4 w-4 text-emerald-600" />
            Exact Monotonic Equivalence on Categorical Data
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            On the verified dataset of {realMeta.n_categorical} categorical traits without numeric columns, Gower,
            Euclidean (one-hot), and Cosine (one-hot) are mathematically exact monotonic transformations of Hamming
            distance (Spearman ρ = {fmt(geEquiv?.spearman_rho, 4)}). Nearest-neighbor rankings and kNN classifications
            are identical across all three metrics.
          </p>
        </div>

        {/* Finding 2 */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <Activity className="h-4 w-4 text-emerald-600" />
            Regime Shifts in Mixed Synthetic Cohorts
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            When continuous vitals are introduced, algorithmic advantages diverge by signal regime: Gower uniquely
            dominates when numeric vitals carry zero signal or contain outliers (winner at d = 0:{' '}
            <strong className="capitalize">{d0Cell?.winners?.knn_macro_f1}</strong>), whereas Cosine leads kNN
            accuracy when continuous class separation is strong (winner at d = 2:{' '}
            <strong className="capitalize">{d2Cell?.winners?.knn_macro_f1}</strong>).
          </p>
        </div>

        {/* Finding 3 */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Deterministic Label Structure Notice
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            No duplicate feature rows carry conflicting labels in the dataset, and labels behave as a deterministic
            function of the phenotypic traits (100% cross-validation accuracy with random forest). Retrieval outputs
            represent nearest dataset records and must not be interpreted as independent diagnostic predictions.
          </p>
        </div>

        {/* Finding 4 */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <ShieldAlert className="h-4 w-4 text-emerald-600" />
            Unsupervised Methodology &amp; Audit Scope
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            In strict compliance with unsupervised benchmarking integrity, hyperparameters are never optimized
            using ground truth labels outside training folds. Mutual Information weighting, hybrid distances, and
            spectral linkage are classified strictly as exploratory extensions.
          </p>
        </div>
      </div>
    </div>
  );
}
