import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, RotateCcw } from 'lucide-react';
import { DOSHA_PALETTE } from '../data/literatureData';
import { retrieveTopKAcrossMetrics } from '../utils/distanceEngine';

const KERNEL_COLS = [
  { key: 'gower', label: 'Gower' },
  { key: 'euclidean', label: 'Euclidean' },
  { key: 'cosine', label: 'Cosine' },
];

export default function RetrievalSimulatorSection({ realCases, syntheticCases }) {
  const [mode, setMode] = useState('synthetic'); // 'real' | 'synthetic'
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [numOverrides, setNumOverrides] = useState(null);
  const [expandedRank, setExpandedRank] = useState(1);

  const activeCohort = mode === 'real' ? realCases : syntheticCases;
  const isSynthetic = mode === 'synthetic';

  // Build quick stratified sample picker (first 2 records from each of the 6 classes)
  const sampleOptions = useMemo(() => {
    const labelKey = isSynthetic ? 'latent_class' : 'dataset_label';
    const seen = {};
    const picks = [];
    for (const r of activeCohort.records) {
      const cls = r[labelKey];
      seen[cls] = (seen[cls] || 0) + 1;
      if (seen[cls] <= 2) {
        picks.push({ row_idx: r.row_idx, case_id: r.case_id, label: cls });
      }
      if (picks.length >= 12) break;
    }
    return picks;
  }, [activeCohort, isSynthetic]);

  const queryRecord =
    activeCohort.records[selectedIdx] || activeCohort.records[0];

  const handleModeSwitch = (nextMode) => {
    setMode(nextMode);
    setSelectedIdx(0);
    setNumOverrides(null);
  };

  const handleSelectRecord = (idx) => {
    setSelectedIdx(idx);
    setNumOverrides(null);
  };

  const retrieval = useMemo(
    () =>
      retrieveTopKAcrossMetrics({
        queryRecord,
        numericOverrides: isSynthetic ? numOverrides : null,
        cohort: activeCohort,
        k: 5,
      }),
    [queryRecord, numOverrides, isSynthetic, activeCohort]
  );

  const activeNumerics = isSynthetic ? (numOverrides ?? queryRecord.numerics) : [];

  return (
    <section id="retrieval" className="scroll-mt-20 space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">
            5. Live Top-5 Retrieval Simulator
          </h2>
          <p className="mt-1 text-sm text-neutral-600">
            Exact client-side implementation of <code className="num text-xs">ayur_bench/distances.py</code>{' '}
            (zero label access, deterministic <code className="num text-xs">mergesort</code>{' '}
            tie-breaking). Switch between the real categorical CSV and the default{' '}
            <strong>SYNTHETIC/SIMULATED</strong> mixed-type cohort.
          </p>
        </div>

        <div className="inline-flex rounded-md border border-neutral-200 bg-neutral-100 p-0.5 text-xs">
          <button
            type="button"
            onClick={() => handleModeSwitch('real')}
            className={`rounded px-3 py-1.5 font-medium transition ${
              !isSynthetic
                ? 'bg-white text-teal-800 shadow-sm ring-1 ring-neutral-200'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Real CSV (29 cat)
          </button>
          <button
            type="button"
            onClick={() => handleModeSwitch('synthetic')}
            className={`rounded px-3 py-1.5 font-medium transition ${
              isSynthetic
                ? 'bg-white text-amber-900 shadow-sm ring-1 ring-amber-200'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            SYNTHETIC Mixed (4 num + 29 cat)
          </button>
        </div>
      </div>

      {isSynthetic ? (
        <div className="rounded-md border border-amber-200 bg-amber-50/70 px-4 py-2 text-xs text-amber-950">
          <strong>SYNTHETIC/SIMULATED COHORT:</strong> Loaded from{' '}
          <code className="num text-[11px]">Dataset/synthetic/synthetic_cases_default.csv</code>.{' '}
          <code className="num text-[11px]">latent_class</code> is simulation ground truth by
          construction, not a practitioner label. Perturb the 4 numeric vitals below to observe
          how Gower, Euclidean, and Cosine diverge.
        </div>
      ) : (
        <div className="rounded-md border border-neutral-200 bg-white px-4 py-2 text-xs text-neutral-600">
          <strong>REAL CATEGORICAL DATA:</strong> Loaded from{' '}
          <code className="num text-[11px]">Dataset/tridosha.zip</code> (1,200 rows, 29 traits, 0
          numeric columns). Because all three metrics are monotone transforms of Hamming distance
          on categorical-only data, their top-5 neighbours are identical.
        </div>
      )}

      {/* Query Control Panel */}
      <div className="paper-card p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="sim-query" className="text-xs font-medium text-neutral-700">
              Query record:
            </label>
            <select
              id="sim-query"
              value={selectedIdx}
              onChange={(e) => handleSelectRecord(Number(e.target.value))}
              className="rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-900 focus:border-teal-600 focus:outline-none"
            >
              {sampleOptions.map((opt) => (
                <option key={opt.row_idx} value={opt.row_idx}>
                  {opt.case_id} · {opt.label}
                </option>
              ))}
            </select>

            <span className="inline-flex items-center gap-1.5 rounded border border-neutral-200 bg-neutral-50 px-2 py-1 text-xs font-medium text-neutral-800">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: DOSHA_PALETTE[retrieval.queryLabel] }}
              />
              {isSynthetic ? 'Latent class' : 'Dataset label'}: {retrieval.queryLabel}
            </span>
          </div>

          {isSynthetic && numOverrides && (
            <button
              type="button"
              onClick={() => setNumOverrides(null)}
              className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-600 hover:text-neutral-900"
            >
              <RotateCcw className="h-3 w-3" />
              Reset vitals
            </button>
          )}
        </div>

        {isSynthetic && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {activeCohort.numeric_cols.map((col, idx) => {
              const st = activeCohort.numeric_stats[col];
              return (
                <label key={col} className="block space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-600">{col}</span>
                    <span className="num font-medium text-neutral-900">
                      {activeNumerics[idx].toFixed(1)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={Math.floor(st.min)}
                    max={Math.ceil(st.max)}
                    step={0.5}
                    value={activeNumerics[idx]}
                    onChange={(e) => {
                      const next = [...activeNumerics];
                      next[idx] = Number(e.target.value);
                      setNumOverrides(next);
                    }}
                    className="h-1.5 w-full cursor-pointer accent-teal-700"
                  />
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* Unified Top-5 Comparison Table (Kernels as Columns, Ranks as Rows) */}
      <div className="paper-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 px-5 py-3 text-xs">
          <span className="font-semibold text-neutral-900">
            Top-5 Nearest Neighbours (amber highlights cells that disagree on neighbour ID)
          </span>
          <span className="text-neutral-500">Click any rank row to inspect differing traits</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50/70 text-[11px] font-medium text-neutral-500">
                <th className="w-16 py-2.5 pl-4 pr-2">Rank</th>
                {KERNEL_COLS.map((col) => (
                  <th key={col.key} className="px-3 py-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-900">{col.label}</span>
                      <span className="num text-[11px] font-normal text-neutral-500">
                        Same label: {retrieval.hitsByKernel[col.key]}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {retrieval.rows.map((row) => {
                const isExpanded = expandedRank === row.rank;
                return (
                  <React.Fragment key={row.rank}>
                    <tr
                      onClick={() => setExpandedRank(isExpanded ? null : row.rank)}
                      className="cursor-pointer hover:bg-neutral-50"
                    >
                      <td className="num py-3 pl-4 pr-2 font-medium text-neutral-700">
                        <span className="inline-flex items-center gap-1">
                          {isExpanded ? (
                            <ChevronDown className="h-3.5 w-3.5 text-neutral-400" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5 text-neutral-400" />
                          )}
                          #{row.rank}
                        </span>
                      </td>

                      {KERNEL_COLS.map((col) => {
                        const cell = row.cells[col.key];
                        const disagrees =
                          row.anyDisagreement &&
                          (row.majorityId === null || cell.record.case_id !== row.majorityId);
                        return (
                          <td
                            key={col.key}
                            className={`px-3 py-3 align-top ${disagrees ? 'bg-amber-50/80' : ''}`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="num font-medium text-neutral-900">
                                {cell.record.case_id}
                              </span>
                              <span className="num text-[11px] text-neutral-500">
                                D={cell.distance.toFixed(4)}
                              </span>
                            </div>
                            <div className="mt-1 flex items-center justify-between text-[11px]">
                              <span className="inline-flex items-center gap-1.5 font-medium text-neutral-700">
                                <span
                                  className="h-2 w-2 rounded-full"
                                  style={{ backgroundColor: DOSHA_PALETTE[cell.label] }}
                                />
                                {cell.label}
                              </span>
                              <span className="num text-neutral-500">
                                {cell.matchedCount}/{cell.totalCat} traits
                              </span>
                            </div>
                          </td>
                        );
                      })}
                    </tr>

                    {isExpanded && (
                      <tr className="bg-neutral-50/80">
                        <td colSpan={4} className="px-5 py-3.5">
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                            {KERNEL_COLS.map((col) => {
                              const cell = row.cells[col.key];
                              return (
                                <div
                                  key={col.key}
                                  className="rounded border border-neutral-200 bg-white p-3 text-[11px]"
                                >
                                  <div className="flex items-center justify-between font-medium text-neutral-900">
                                    <span>
                                      {col.label}:{' '}
                                      <span className="num">{cell.record.case_id}</span>
                                    </span>
                                    <span className="num text-teal-800">
                                      {cell.matchedCount}/{cell.totalCat} match
                                    </span>
                                  </div>
                                  {isSynthetic && (
                                    <div className="num mt-1 text-[10px] text-neutral-500">
                                      age {cell.record.numerics[0]} · bmi {cell.record.numerics[1]}{' '}
                                      · sbp {cell.record.numerics[2]} · pulse{' '}
                                      {cell.record.numerics[3]}
                                    </div>
                                  )}
                                  <div className="mt-2 text-[10px] text-neutral-600">
                                    <span className="font-medium text-neutral-800">
                                      Differing traits ({cell.differedCols.length}):{' '}
                                    </span>
                                    {cell.differedCols.length === 0
                                      ? 'None (identical across all 29 categorical traits)'
                                      : cell.differedCols
                                          .slice(0, 5)
                                          .map((d) => d.col)
                                          .join(', ') +
                                        (cell.differedCols.length > 5
                                          ? ` (+${cell.differedCols.length - 5} more)`
                                          : '')}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
