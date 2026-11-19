import React, { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { DOSHA_PALETTE } from '../data/literatureData';

export default function PatientAttributesPage({ realData, realCases }) {
  const [descriptive, setDescriptive] = useState(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('position'); // 'position' | 'cramers_v' | 'alpha'

  useEffect(() => {
    let mounted = true;
    fetch('/data/descriptive.json')
      .then((res) => res.json())
      .then((data) => {
        if (mounted) setDescriptive(data);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const meta = realData?.provenance?.dataset_metadata;
  const traits = realCases?.traits || [];

  // Build cramers_v map
  const cvMap = useMemo(() => {
    if (!descriptive?.cramers_v) return {};
    const map = {};
    for (const item of descriptive.cramers_v) {
      map[item.trait] = item;
    }
    return map;
  }, [descriptive]);

  const sortedTraits = useMemo(() => {
    const list = traits.map((t, idx) => ({
      ...t,
      originalIndex: idx,
      cv: cvMap[t.name]?.cramers_v ?? 0,
      chi2: cvMap[t.name]?.chi2 ?? 0,
      p_value: cvMap[t.name]?.p_value ?? 1,
      frequencies: descriptive?.trait_frequencies?.[t.name] || [],
    }));

    if (sortBy === 'cramers_v') {
      list.sort((a, b) => b.cv - a.cv);
    } else if (sortBy === 'alpha') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      list.sort((a, b) => a.originalIndex - b.originalIndex);
    }

    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.levels.some((l) => l.toLowerCase().includes(q))
    );
  }, [traits, cvMap, descriptive, sortBy, search]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Patient Attributes</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Comprehensive analysis of all{' '}
          <span className="num font-semibold">{meta?.n_categorical}</span> categorical patient
          traits recorded in <code className="num text-xs">{meta?.csv_member}</code> (
          <span className="num">{meta?.n_rows}</span> records,{' '}
          <span className="num">{meta?.n_numeric}</span> numerical vitals).
        </p>
      </div>

      {/* Notice Card */}
      <div className="paper-card p-4 text-xs text-neutral-600 space-y-1">
        <p className="font-medium text-neutral-800">
          Dataset Provenance &amp; Independence Notice (R2, R10):
        </p>
        <p>
          The dataset labels are dataset-provided and appear to be a deterministic function of
          these 29 traits. Cramér’s V association values are reported for descriptive analysis
          only and were not used for feature selection, metric weighting, or diagnostic prediction.
        </p>
      </div>

      {/* Controls Bar */}
      <div className="paper-card p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter trait or level..."
            className="w-full rounded border border-neutral-200 bg-white py-1.5 pl-8 pr-3 text-xs text-neutral-800 placeholder-neutral-400 focus:border-teal-700 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-neutral-500 font-medium">Sort by:</span>
          <button
            type="button"
            onClick={() => setSortBy('position')}
            className={`rounded px-2.5 py-1 transition ${
              sortBy === 'position'
                ? 'bg-teal-50 text-teal-800 font-semibold ring-1 ring-teal-700/30'
                : 'text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            Column Order
          </button>
          <button
            type="button"
            onClick={() => setSortBy('cramers_v')}
            className={`rounded px-2.5 py-1 transition ${
              sortBy === 'cramers_v'
                ? 'bg-teal-50 text-teal-800 font-semibold ring-1 ring-teal-700/30'
                : 'text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            Cramér’s V (Desc)
          </button>
          <button
            type="button"
            onClick={() => setSortBy('alpha')}
            className={`rounded px-2.5 py-1 transition ${
              sortBy === 'alpha'
                ? 'bg-teal-50 text-teal-800 font-semibold ring-1 ring-teal-700/30'
                : 'text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            Alphabetical
          </button>
        </div>
      </div>

      {/* Trait Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sortedTraits.map((t) => (
          <div key={t.name} className="paper-card p-5 space-y-3">
            <div className="flex items-baseline justify-between gap-2 border-b border-neutral-100 pb-2">
              <div>
                <span className="num text-[11px] text-neutral-400 font-mono mr-2">
                  #{t.originalIndex + 1}
                </span>
                <span className="text-sm font-semibold text-neutral-900">{t.name}</span>
              </div>
              {t.cv > 0 && (
                <span className="rounded bg-teal-50 border border-teal-700/20 px-2 py-0.5 text-[11px] font-mono text-teal-800">
                  V = <span className="num">{t.cv.toFixed(4)}</span>
                </span>
              )}
            </div>

            {/* Level breakdown */}
            <div className="space-y-2">
              <div className="text-xs text-neutral-500 font-medium">Observed Levels &amp; Frequencies:</div>
              <div className="space-y-1.5">
                {t.frequencies && t.frequencies.length > 0 ? (
                  t.frequencies.map((lvl) => {
                    const pct = meta?.n_rows ? (lvl.total / meta.n_rows) * 100 : 0;
                    return (
                      <div key={lvl.level} className="text-xs">
                        <div className="flex justify-between text-neutral-700 mb-0.5">
                          <span className="font-medium">{lvl.level}</span>
                          <span className="num font-mono text-neutral-500">
                            {lvl.total} ({pct.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-neutral-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-teal-700 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {t.levels.map((lvl) => (
                      <span
                        key={lvl}
                        className="rounded border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-xs text-neutral-700"
                      >
                        {lvl}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Stats footnote */}
            {t.chi2 > 0 && (
              <div className="text-[11px] text-neutral-400 font-mono pt-1">
                χ² = <span className="num">{t.chi2.toFixed(2)}</span> · p ={' '}
                <span className="num">
                  {t.p_value < 0.0001 ? t.p_value.toExponential(2) : t.p_value.toFixed(4)}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
