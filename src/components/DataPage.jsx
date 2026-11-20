import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { DOSHA_PALETTE } from '../data/literatureData';

function fmt(v, d = 2) {
  return typeof v === 'number' ? v.toFixed(d) : '—';
}

export default function DataPage({ realData, realCases, synthCsvSummary }) {
  const [search, setSearch] = useState('');

  const meta = realData?.provenance?.dataset_metadata;
  const classEntries = Object.entries(meta?.class_counts || {});

  const filteredTraits = useMemo(() => {
    const raw = realCases?.trait_summaries || [];
    const q = search.trim().toLowerCase();
    if (!q) return raw;
    return raw.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.levels?.some((l) => l.level.toLowerCase().includes(q))
    );
  }, [realCases?.trait_summaries, search]);

  if (!realData || !realCases || !synthCsvSummary) {
    return <div className="p-8 text-sm text-neutral-500">Loading data summary…</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Data</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Class distribution and real trait schema for{' '}
          <code className="num text-xs">{meta?.csv_member || 'real_records.csv'}</code> (
          <span className="num">{meta?.n_rows || '—'}</span> rows,{' '}
          <span className="num">{meta?.duplicate_row_count || 0}</span> exact duplicate at row index{' '}
          <span className="num">{meta?.duplicate_row_indices?.join(', ') || '—'}</span> retained), followed
          by the default simulated mixed-type cohort.
        </p>
      </div>

      {/* Real Dataset Class Distribution */}
      <div className="paper-card p-6 space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-neutral-900">
            Dataset-Provided Dosha Class Distribution
          </h2>
          <span className="num text-xs text-neutral-500">N = {meta.n_rows}</span>
        </div>

        <div className="flex h-3 w-full overflow-hidden rounded-full bg-neutral-100">
          {classEntries.map(([cls, cnt]) => {
            const pct = (cnt / meta.n_rows) * 100;
            return (
              <div
                key={cls}
                title={`${cls}: ${cnt} (${pct.toFixed(1)}%)`}
                style={{ width: `${pct}%`, backgroundColor: DOSHA_PALETTE[cls] }}
              />
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {classEntries.map(([cls, cnt]) => {
            const pct = (cnt / meta.n_rows) * 100;
            return (
              <div key={cls} className="rounded border border-neutral-200 bg-neutral-50 p-3">
                <div className="flex items-center gap-2 text-xs font-medium text-neutral-800">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: DOSHA_PALETTE[cls] }}
                  />
                  {cls}
                </div>
                <div className="num mt-2 text-sm font-semibold text-neutral-900">
                  {cnt}{' '}
                  <span className="text-xs font-normal text-neutral-500">({pct.toFixed(1)}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Real 29 Categorical Traits Table */}
      <div className="paper-card p-6 space-y-4">
        <div className="flex flex-col justify-between gap-4 border-b border-neutral-200 pb-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-sm font-semibold text-neutral-900">
              Real Categorical Traits ({meta.n_categorical} columns, {meta.n_numeric} numeric)
            </h2>
            <p className="mt-1 text-xs text-neutral-500">
              Exact trait names and observed level counts from{' '}
              <code className="num text-xs">{meta.csv_member}</code>.
            </p>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter trait or level..."
              className="w-56 rounded border border-neutral-200 bg-white py-1.5 pl-8 pr-3 text-xs text-neutral-800 placeholder-neutral-400 focus:border-teal-700 focus:outline-none"
            />
          </div>
        </div>

        <div className="max-h-96 overflow-auto">
          <table className="w-full min-w-[680px] border-collapse text-left text-xs">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b border-neutral-200 text-neutral-500">
                <th className="py-2 pr-3 font-medium">#</th>
                <th className="px-3 py-2 font-medium">Trait Name</th>
                <th className="px-3 py-2 text-right font-medium">Levels</th>
                <th className="px-3 py-2 text-right font-medium">Missing</th>
                <th className="py-2 pl-3 font-medium">Observed Levels (Count)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredTraits.map((t, idx) => (
                <tr key={t.name} className="hover:bg-neutral-50">
                  <td className="num py-2 pr-3 text-neutral-400">{idx + 1}</td>
                  <td className="whitespace-nowrap px-3 py-2 font-medium text-neutral-900">
                    {t.name}
                  </td>
                  <td className="num px-3 py-2 text-right text-neutral-700">{t.n_levels}</td>
                  <td className="num px-3 py-2 text-right text-neutral-500">{t.missing_count}</td>
                  <td className="py-2 pl-3 text-neutral-600">
                    {t.levels.map((l, i) => (
                      <span key={l.level}>
                        {i > 0 && ' · '}
                        {l.level} <span className="num text-neutral-400">({l.count})</span>
                      </span>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Synthetic Mixed-Type Cohort Description (SIMULATED Badge) */}
      <div className="paper-card p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-neutral-900">
                Default Mixed-Type Synthetic Cohort
              </h2>
              <span className="rounded border border-teal-700/30 bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-800">
                SIMULATED
              </span>
            </div>
            <p className="mt-1 text-xs text-neutral-500">
              Read directly from{' '}
              <code className="num text-xs">Dataset/synthetic/synthetic_cases_default.csv</code> (
              <span className="num">{synthCsvSummary.nRows}</span> rows,{' '}
              <span className="num">{synthCsvSummary.nNumeric}</span> numeric vitals +{' '}
              <span className="num">{synthCsvSummary.nCategorical}</span> categorical traits).
            </p>
          </div>
        </div>

        <p className="text-xs leading-relaxed text-neutral-600">
          Categorical traits are sampled from smoothed empirical class conditionals estimated from
          the real CSV. Numeric vitals consist of an uninformative <code className="num">age</code>{' '}
          covariate, lognormal-skewed <code className="num">bmi</code> coupled with Gaussian{' '}
          <code className="num">systolic_bp</code> via a Gaussian copula, and Gaussian{' '}
          <code className="num">pulse</code>, with class shifts applied in independent randomised
          non-alphabetical class orders. The <code className="num">latent_class</code> column is
          simulation ground truth by construction, not a clinical label.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[540px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-200 text-neutral-500">
                <th className="py-2 pr-3 font-medium">Simulated Vital</th>
                <th className="px-3 py-2 text-right font-medium">Mean</th>
                <th className="px-3 py-2 text-right font-medium">Std</th>
                <th className="px-3 py-2 text-right font-medium">Min</th>
                <th className="px-3 py-2 text-right font-medium">Median</th>
                <th className="py-2 pl-3 text-right font-medium">Max</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {synthCsvSummary.numericSummaries.map((s) => (
                <tr key={s.name}>
                  <td className="num py-2 pr-3 font-medium text-neutral-900">{s.name}</td>
                  <td className="num whitespace-nowrap px-3 py-2 text-right text-neutral-700">
                    {fmt(s.mean)}
                  </td>
                  <td className="num whitespace-nowrap px-3 py-2 text-right text-neutral-700">
                    {fmt(s.std)}
                  </td>
                  <td className="num whitespace-nowrap px-3 py-2 text-right text-neutral-600">
                    {fmt(s.min)}
                  </td>
                  <td className="num whitespace-nowrap px-3 py-2 text-right text-neutral-700">
                    {fmt(s.median)}
                  </td>
                  <td className="num whitespace-nowrap py-2 pl-3 text-right text-neutral-600">
                    {fmt(s.max)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
