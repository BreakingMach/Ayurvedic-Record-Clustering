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
    return <div className="glass-panel rounded-2xl p-8 text-sm text-[#827568]">Loading data summary…</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#40382F]">Data</h1>
        <p className="mt-2 text-sm text-[#827568]">
          Class distribution and real trait schema for{' '}
          <code className="num text-xs text-[#40382F]">{meta?.csv_member || 'real_records.csv'}</code> (
          <span className="num">{meta?.n_rows || '—'}</span> rows,{' '}
          <span className="num">{meta?.duplicate_row_count || 0}</span> exact duplicate at row index{' '}
          <span className="num">{meta?.duplicate_row_indices?.join(', ') || '—'}</span> retained), followed
          by the default simulated mixed-type cohort.
        </p>
      </div>

      {/* Real Dataset Class Distribution */}
      <div className="paper-card p-6 space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-bold text-[#40382F]">
            Dataset-Provided Dosha Class Distribution
          </h2>
          <span className="num text-xs text-[#827568]">N = {meta.n_rows}</span>
        </div>

        <div className="flex h-3 w-full overflow-hidden rounded-full bg-[#E8DED1]">
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
              <div key={cls} className="rounded-xl border border-white/80 bg-[#F3EADF]/70 p-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#40382F]">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: DOSHA_PALETTE[cls] }}
                  />
                  {cls}
                </div>
                <div className="num mt-2 text-sm font-bold text-[#40382F]">
                  {cnt}{' '}
                  <span className="text-xs font-normal text-[#827568]">({pct.toFixed(1)}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Real 29 Categorical Traits Table */}
      <div className="paper-card p-6 space-y-4">
        <div className="flex flex-col justify-between gap-4 border-b border-[#E8DED1] pb-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-sm font-bold text-[#40382F]">
              Real Categorical Traits ({meta.n_categorical} columns, {meta.n_numeric} numeric)
            </h2>
            <p className="mt-1 text-xs text-[#827568]">
              Exact trait names and observed level counts from{' '}
              <code className="num text-xs text-[#40382F]">{meta.csv_member}</code>.
            </p>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2 h-3.5 w-3.5 text-[#967D63]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter trait or level..."
              className="w-full sm:w-56 rounded-xl border border-[#C3A989]/50 bg-white/80 py-1.5 pl-8 pr-3 text-xs text-[#40382F] placeholder-[#827568]/70 focus:border-[#967D63] focus:outline-none"
            />
          </div>
        </div>

        <div className="max-h-96 overflow-auto">
          <table className="w-full min-w-[680px] border-collapse text-left text-xs">
            <thead className="sticky top-0 bg-[#F3EADF] z-10">
              <tr className="border-b border-[#E8DED1] text-[#827568]">
                <th className="py-2 pr-3 font-semibold">#</th>
                <th className="px-3 py-2 font-semibold">Trait Name</th>
                <th className="px-3 py-2 text-right font-semibold">Levels</th>
                <th className="px-3 py-2 text-right font-semibold">Missing</th>
                <th className="py-2 pl-3 font-semibold">Observed Levels (Count)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8DED1]/70">
              {filteredTraits.map((t, idx) => (
                <tr key={t.name} className="hover:bg-[#F3EADF]/50 transition">
                  <td className="num py-2 pr-3 text-[#827568]">{idx + 1}</td>
                  <td className="whitespace-nowrap px-3 py-2 font-semibold text-[#40382F]">
                    {t.name}
                  </td>
                  <td className="num px-3 py-2 text-right text-[#40382F]">{t.n_levels}</td>
                  <td className="num px-3 py-2 text-right text-[#827568]">{t.missing_count}</td>
                  <td className="py-2 pl-3 text-[#827568]">
                    {t.levels.map((l, i) => (
                      <span key={l.level}>
                        {i > 0 && ' · '}
                        <span className="text-[#40382F]">{l.level}</span>{' '}
                        <span className="num text-[#827568]">({l.count})</span>
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
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E8DED1] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-[#40382F]">
                Default Mixed-Type Synthetic Cohort
              </h2>
              <span className="rounded-full border border-[#C3A989]/60 bg-[#E8DED1]/80 px-2.5 py-0.5 text-xs font-semibold text-[#40382F]">
                SIMULATED
              </span>
            </div>
            <p className="mt-1 text-xs text-[#827568]">
              Read directly from{' '}
              <code className="num text-xs text-[#40382F]">Dataset/synthetic/synthetic_cases_default.csv</code> (
              <span className="num">{synthCsvSummary.nRows}</span> rows,{' '}
              <span className="num">{synthCsvSummary.nNumeric}</span> numeric vitals +{' '}
              <span className="num">{synthCsvSummary.nCategorical}</span> categorical traits).
            </p>
          </div>
        </div>

        <p className="text-xs leading-relaxed text-[#827568]">
          Categorical traits are sampled from smoothed empirical class conditionals estimated from
          the real CSV. Numeric vitals consist of an uninformative <code className="num text-[#40382F]">age</code>{' '}
          covariate, lognormal-skewed <code className="num text-[#40382F]">bmi</code> coupled with Gaussian{' '}
          <code className="num text-[#40382F]">systolic_bp</code> via a Gaussian copula, and Gaussian{' '}
          <code className="num text-[#40382F]">pulse</code>, with class shifts applied in independent randomised
          non-alphabetical class orders. The <code className="num text-[#40382F]">latent_class</code> column is
          simulation ground truth by construction, not a clinical label.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[540px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-[#E8DED1] text-[#827568]">
                <th className="py-2 pr-3 font-semibold">Simulated Vital</th>
                <th className="px-3 py-2 text-right font-semibold">Mean</th>
                <th className="px-3 py-2 text-right font-semibold">Std</th>
                <th className="px-3 py-2 text-right font-semibold">Min</th>
                <th className="px-3 py-2 text-right font-semibold">Median</th>
                <th className="py-2 pl-3 text-right font-semibold">Max</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8DED1]/70">
              {synthCsvSummary.numericSummaries.map((s) => (
                <tr key={s.name} className="hover:bg-[#F3EADF]/40">
                  <td className="num py-2 pr-3 font-semibold text-[#40382F]">{s.name}</td>
                  <td className="num whitespace-nowrap px-3 py-2 text-right text-[#40382F]">
                    {fmt(s.mean)}
                  </td>
                  <td className="num whitespace-nowrap px-3 py-2 text-right text-[#40382F]">
                    {fmt(s.std)}
                  </td>
                  <td className="num whitespace-nowrap px-3 py-2 text-right text-[#827568]">
                    {fmt(s.min)}
                  </td>
                  <td className="num whitespace-nowrap px-3 py-2 text-right text-[#40382F]">
                    {fmt(s.median)}
                  </td>
                  <td className="num whitespace-nowrap py-2 pl-3 text-right text-[#827568]">
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
