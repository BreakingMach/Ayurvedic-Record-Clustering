import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import benchmarkData from '../data/realBenchmarkResults.json';
import { DOSHA_PALETTE } from '../data/literatureData';

export default function DataSection() {
  const [filterGroup, setFilterGroup] = useState('ALL');
  const [query, setQuery] = useState('');

  const { meta, featureSchemaStats } = benchmarkData;

  const filteredFeatures = useMemo(() => {
    const q = query.trim().toLowerCase();
    return featureSchemaStats.filter((f) => {
      const groupOk =
        filterGroup === 'ALL' ||
        (filterGroup === 'CORE' && f.sourceGroup.startsWith('Core')) ||
        (filterGroup === 'NOISE' && f.sourceGroup.startsWith('Extended')) ||
        (filterGroup === 'NUM' && f.modality.startsWith('Continuous'));
      const textOk =
        !q ||
        f.name.toLowerCase().includes(q) ||
        f.sourceGroup.toLowerCase().includes(q) ||
        f.modality.toLowerCase().includes(q);
      return groupOk && textOk;
    });
  }, [featureSchemaStats, filterGroup, query]);

  return (
    <section id="data" className="scroll-mt-20 space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">2. Data &amp; Feature Schema</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Class distribution across the 6 constitutional <em>Dosha</em> labels (13:1 imbalance)
          and all {meta.pTotal} attributes with out-of-fold train-only Mutual Information
          weights (<span className="num">mean ± std</span> across {meta.totalFolds} folds).
        </p>
      </div>

      {/* Compact Class Distribution Bar */}
      <div className="paper-card p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-medium text-neutral-900">
            Target Class Distribution (Prakriti Dosha)
          </h3>
          <span className="num text-xs text-neutral-500">
            N = {meta.nTotal} total ({meta.nUniqueProfiles} unique profiles × {meta.replicatesPerProfile})
          </span>
        </div>

        {/* Stacked Proportional Strip */}
        <div className="mt-3 flex h-3 w-full overflow-hidden rounded-full bg-neutral-100">
          {meta.classes.map((cls) => (
            <div
              key={cls.id}
              title={`${cls.id}: ${cls.countTotal} total (${cls.countUnique} unique, ${cls.sharePct}%)`}
              style={{
                width: `${cls.sharePct}%`,
                backgroundColor: DOSHA_PALETTE[cls.id],
              }}
            />
          ))}
        </div>

        {/* Compact Class Grid */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {meta.classes.map((cls) => (
            <div
              key={cls.id}
              className="rounded-md border border-neutral-200 bg-neutral-50/70 px-3 py-2"
            >
              <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-800">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: DOSHA_PALETTE[cls.id] }}
                />
                {cls.id}
              </div>
              <div className="num mt-1 text-sm font-semibold text-neutral-900">
                {cls.countUnique}{' '}
                <span className="text-xs font-normal text-neutral-500">
                  unique ({cls.sharePct}%)
                </span>
              </div>
              <div className="num text-[11px] text-neutral-500">{cls.countTotal} raw rows</div>
            </div>
          ))}
        </div>
      </div>

      {/* Single Unified Feature Schema + Train-Fold MI Weight Table (No Redundant Chart) */}
      <div className="paper-card p-5">
        <div className="flex flex-col justify-between gap-3 border-b border-neutral-200 pb-4 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-sm font-medium text-neutral-900">
              Feature Schema &amp; Train-Fold Mutual Information Weights ({meta.pTotal} Attributes)
            </h3>
            <p className="mt-0.5 text-xs text-neutral-500">
              Weights <span className="num">w_k = I(X_k; y) / Σ I(X_m; y)</span> are estimated
              strictly on each training fold with no manual overrides. Notice that columns 21–29
              and simulated <span className="num">Age_Vaya</span> naturally receive near-zero
              weight.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-neutral-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter attribute..."
                className="w-44 rounded-md border border-neutral-200 bg-white py-1.5 pl-8 pr-2.5 text-xs text-neutral-800 placeholder-neutral-400 focus:border-teal-600 focus:outline-none"
              />
            </div>

            <div className="inline-flex rounded-md border border-neutral-200 bg-neutral-50 p-0.5 text-xs">
              {[
                { key: 'ALL', label: 'All (33)' },
                { key: 'CORE', label: 'Core (20)' },
                { key: 'NOISE', label: 'Extended (9)' },
                { key: 'NUM', label: 'Simulated Vitals (4)' },
              ].map((b) => (
                <button
                  key={b.key}
                  type="button"
                  onClick={() => setFilterGroup(b.key)}
                  className={`rounded px-2 py-1 text-[11px] font-medium transition ${
                    filterGroup === b.key
                      ? 'bg-white text-teal-800 shadow-sm ring-1 ring-neutral-200'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-3 max-h-[440px] overflow-auto">
          <table className="w-full min-w-[700px] border-collapse text-left text-xs">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b border-neutral-200 text-[11px] font-medium text-neutral-500">
                <th className="py-2 pr-3">Feature</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Source Group</th>
                <th className="px-3 py-2">Domain</th>
                <th className="px-3 py-2 text-right">Train MI (nats)</th>
                <th className="py-2 pl-3 text-right">Normalized Weight w_k</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredFeatures.map((f) => {
                const barPct = Math.min(100, (f.cvWeight.mean / 0.1) * 100);
                return (
                  <tr key={f.name} className="hover:bg-neutral-50">
                    <td className="py-2 pr-3 font-medium text-neutral-900">{f.name}</td>
                    <td className="px-3 py-2 text-neutral-600">{f.modality}</td>
                    <td className="px-3 py-2 text-neutral-500">{f.sourceGroup}</td>
                    <td className="num px-3 py-2 text-[11px] text-neutral-500">{f.domain}</td>
                    <td className="num whitespace-nowrap px-3 py-2 text-right text-neutral-700">
                      {f.rawMI.mean.toFixed(4)} ± {f.rawMI.std.toFixed(4)}
                    </td>
                    <td className="whitespace-nowrap py-2 pl-3 text-right">
                      <div className="inline-flex items-center gap-2.5">
                        <div className="hidden h-1.5 w-20 overflow-hidden rounded-full bg-neutral-100 sm:block">
                          <div
                            className="h-full rounded-full bg-teal-700"
                            style={{ width: `${barPct}%` }}
                          />
                        </div>
                        <span className="num whitespace-nowrap text-right text-neutral-900">
                          {(f.cvWeight.mean * 100).toFixed(2)}% ± {(f.cvWeight.std * 100).toFixed(2)}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
