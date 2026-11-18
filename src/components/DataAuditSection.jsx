import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { DOSHA_PALETTE } from '../data/literatureData';

export default function DataAuditSection({ realData, realCases }) {
  const [search, setSearch] = useState('');
  const meta = realData.provenance.dataset_metadata;
  const classEntries = Object.entries(meta.class_counts);

  const filteredTraits = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return realCases.trait_summaries;
    return realCases.trait_summaries.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.levels.some((l) => l.level.toLowerCase().includes(q))
    );
  }, [realCases.trait_summaries, search]);

  return (
    <section id="data" className="scroll-mt-20 space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">
          2. Real Dataset Audit (Updated_Prakriti_With_Features.csv)
        </h2>
        <p className="mt-1 text-sm text-neutral-600">
          Verified schema and integrity report for <code className="num text-xs">Dataset/tridosha.zip</code>{' '}
          (Kaggle <code className="num text-xs">{meta.kaggle_slug}</code>):{' '}
          <span className="num font-medium">{meta.n_rows}</span> rows,{' '}
          <span className="num font-medium">{meta.n_categorical}</span> categorical traits,{' '}
          <span className="num font-medium">{meta.n_numeric}</span> numeric columns, and{' '}
          <span className="num font-medium">{meta.duplicate_row_count}</span> exact full-row
          duplicate (row index <span className="num">{meta.duplicate_row_indices.join(', ')}</span>,
          retained per <code className="num text-xs">docs/DECISIONS.md</code>).
        </p>
      </div>

      {/* 6-Class Distribution */}
      <div className="paper-card p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold text-neutral-900">
            Dataset-Provided Dosha Label Distribution (Normalised Casing)
          </h3>
          <span className="num text-xs text-neutral-500">N = {meta.n_rows} rows · 6 classes</span>
        </div>

        <div className="mt-3 flex h-3 w-full overflow-hidden rounded-full bg-neutral-100">
          {classEntries.map(([cls, cnt]) => {
            const pct = (cnt / meta.n_rows) * 100;
            return (
              <div
                key={cls}
                title={`${cls}: ${cnt} (${pct.toFixed(1)}%)`}
                style={{
                  width: `${pct}%`,
                  backgroundColor: DOSHA_PALETTE[cls],
                }}
              />
            );
          })}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {classEntries.map(([cls, cnt]) => {
            const pct = (cnt / meta.n_rows) * 100;
            return (
              <div
                key={cls}
                className="rounded-md border border-neutral-200 bg-neutral-50/70 px-3 py-2"
              >
                <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-800">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: DOSHA_PALETTE[cls] }}
                  />
                  {cls}
                </div>
                <div className="num mt-1 text-sm font-semibold text-neutral-900">
                  {cnt}{' '}
                  <span className="text-xs font-normal text-neutral-500">({pct.toFixed(1)}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 29 Real Categorical Traits Table */}
      <div className="paper-card p-5">
        <div className="flex flex-col justify-between gap-3 border-b border-neutral-200 pb-4 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900">
              All {meta.n_categorical} Real Categorical Attributes (Zero Numeric Columns in CSV)
            </h3>
            <p className="mt-0.5 text-xs text-neutral-500">
              Exact column names, observed levels, and level counts read directly from{' '}
              <code className="num text-[11px]">{meta.csv_member}</code>.
            </p>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search trait or level..."
              className="w-56 rounded-md border border-neutral-200 bg-white py-1.5 pl-8 pr-2.5 text-xs text-neutral-800 placeholder-neutral-400 focus:border-teal-600 focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-3 max-h-[420px] overflow-auto">
          <table className="w-full min-w-[720px] border-collapse text-left text-xs">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b border-neutral-200 text-[11px] font-medium text-neutral-500">
                <th className="py-2 pr-2">#</th>
                <th className="px-2 py-2">Trait Name</th>
                <th className="px-2 py-2 text-right">Levels</th>
                <th className="px-2 py-2 text-right">Missing</th>
                <th className="py-2 pl-3">Observed Levels &amp; Counts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredTraits.map((t, idx) => (
                <tr key={t.name} className="hover:bg-neutral-50">
                  <td className="num py-2 pr-2 text-neutral-400">{idx + 1}</td>
                  <td className="whitespace-nowrap px-2 py-2 font-medium text-neutral-900">
                    {t.name}
                  </td>
                  <td className="num px-2 py-2 text-right text-neutral-700">{t.n_levels}</td>
                  <td className="num px-2 py-2 text-right text-neutral-500">{t.missing_count}</td>
                  <td className="py-2 pl-3 text-[11px] text-neutral-600">
                    {t.levels.map((l, i) => (
                      <span key={l.level}>
                        {i > 0 && ' · '}
                        <span>{l.level}</span>{' '}
                        <span className="num text-neutral-400">({l.count})</span>
                      </span>
                    ))}
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
