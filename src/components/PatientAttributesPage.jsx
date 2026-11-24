import React, { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';

export default function PatientAttributesPage({ realData, realCases, descriptive: descriptiveProp }) {
  const [fetchedDescriptive, setFetchedDescriptive] = useState(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('position'); // 'position' | 'cramers_v' | 'alpha'

  useEffect(() => {
    if (descriptiveProp) return;
    let mounted = true;
    fetch('/data/descriptive.json')
      .then((res) => res.json())
      .then((data) => {
        if (mounted) setFetchedDescriptive(data);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [descriptiveProp]);

  const descriptive = descriptiveProp || fetchedDescriptive;
  const meta = realData?.provenance?.dataset_metadata;
  const traits = realCases?.traits || [];

  // Build cramers_v map
  const cvMap = useMemo(() => {
    if (!descriptive?.cramers_v) return {};
    const list = Array.isArray(descriptive.cramers_v)
      ? descriptive.cramers_v
      : Object.values(descriptive.cramers_v);
    const map = {};
    for (const item of list) {
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
        <h1 className="text-xl font-bold text-[#40382F]">Patient Attributes</h1>
        <p className="mt-2 text-sm text-[#827568]">
          Comprehensive analysis of all{' '}
          <span className="num font-semibold text-[#40382F]">{meta?.n_categorical}</span> categorical patient
          traits recorded in <code className="num text-xs text-[#40382F]">{meta?.csv_member}</code> (
          <span className="num">{meta?.n_rows}</span> records,{' '}
          <span className="num">{meta?.n_numeric}</span> numerical vitals).
        </p>
      </div>

      {/* Notice Card */}
      <div className="paper-card p-4 text-xs text-[#827568] space-y-1">
        <p className="font-semibold text-[#40382F]">
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
          <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-[#967D63]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter trait or level..."
            className="w-full rounded-xl border border-[#C3A989]/50 bg-white/80 py-1.5 pl-8 pr-3 text-xs text-[#40382F] placeholder-[#827568]/70 focus:border-[#967D63] focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-[#827568] font-medium mr-1">Sort by:</span>
          {[
            { id: 'position', label: 'Column Order' },
            { id: 'cramers_v', label: 'Cramér’s V (Desc)' },
            { id: 'alpha', label: 'Alphabetical' },
          ].map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setSortBy(opt.id)}
              className={`rounded-full px-3 py-1 transition ${
                sortBy === opt.id
                  ? 'bg-[#40382F] text-[#F3EADF] font-semibold shadow-2xs'
                  : 'bg-white/70 text-[#827568] hover:bg-white hover:text-[#40382F]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Trait Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sortedTraits.map((t) => (
          <div key={t.name} className="paper-card p-5 space-y-3">
            <div className="flex items-baseline justify-between gap-2 border-b border-[#E8DED1] pb-2">
              <div>
                <span className="num text-[11px] text-[#827568] font-mono mr-2">
                  #{t.originalIndex + 1}
                </span>
                <span className="text-sm font-bold text-[#40382F]">{t.name}</span>
              </div>
              {t.cv > 0 && (
                <span className="rounded-full bg-[#E8DED1]/80 border border-[#C3A989]/40 px-2.5 py-0.5 text-[11px] font-mono font-semibold text-[#40382F]">
                  V = <span className="num">{t.cv.toFixed(4)}</span>
                </span>
              )}
            </div>

            {/* Level breakdown */}
            <div className="space-y-2">
              <div className="text-xs text-[#827568] font-medium">Observed Levels &amp; Frequencies:</div>
              <div className="space-y-1.5">
                {t.frequencies && t.frequencies.length > 0 ? (
                  t.frequencies.map((lvl) => {
                    const pct = meta?.n_rows ? (lvl.total / meta.n_rows) * 100 : 0;
                    return (
                      <div key={lvl.level} className="text-xs">
                        <div className="flex justify-between text-[#40382F] mb-0.5">
                          <span className="font-medium">{lvl.level}</span>
                          <span className="num font-mono text-[#827568]">
                            {lvl.total} ({pct.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-[#E8DED1] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#C3A989] to-[#967D63] rounded-full"
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
                        className="rounded-full border border-[#C3A989]/40 bg-[#F3EADF]/80 px-2.5 py-0.5 text-xs text-[#40382F]"
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
              <div className="text-[11px] text-[#827568] font-mono pt-1">
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
