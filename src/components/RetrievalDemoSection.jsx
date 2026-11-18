import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, RotateCcw } from 'lucide-react';
import benchmarkData from '../data/realBenchmarkResults.json';
import { DOSHA_PALETTE } from '../data/literatureData';
import { retrieveComparisonTable } from '../utils/distanceEngine';

const KERNEL_HEADERS = [
  { key: 'gower', label: 'Gower' },
  { key: 'euclidean', label: 'Euclidean (OHE+Z)' },
  { key: 'cosine', label: 'Cosine (OHE+Z)' },
  { key: 'hybrid', label: 'Hybrid (0.50G+0.50C)' },
];

export default function RetrievalDemoSection() {
  const { uniqueProfiles, informativeQueries } = benchmarkData;
  const [selectedCaseId, setSelectedCaseId] = useState(informativeQueries[0].caseId);
  const [weighting, setWeighting] = useState('uniform');
  const [expandedRank, setExpandedRank] = useState(1);

  const baseProfile = useMemo(
    () => uniqueProfiles.find((p) => p.id === selectedCaseId) || uniqueProfiles[0],
    [uniqueProfiles, selectedCaseId]
  );

  const [overrides, setOverrides] = useState({});

  const activeQuery = useMemo(
    () => ({ ...baseProfile, ...overrides }),
    [baseProfile, overrides]
  );

  const handleSelectCase = (caseId) => {
    setSelectedCaseId(caseId);
    setOverrides({});
  };

  const retrieval = useMemo(
    () => retrieveComparisonTable(activeQuery, weighting, 5),
    [activeQuery, weighting]
  );

  return (
    <section id="retrieval" className="scroll-mt-20 space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">4. Interactive Retrieval Demo</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Real leave-one-profile-out retrieval over the 100 unique dataset profiles (excluding
          exact clones of the query). Four <strong>borderline</strong> cases where kernels
          disagree on neighbor rankings are listed alongside two typical cases. Click any rank
          row to inspect matching and differing core traits.
        </p>
      </div>

      {/* Compact Query Panel */}
      <div className="paper-card p-5 space-y-4">
        <div className="flex flex-col justify-between gap-3 border-b border-neutral-200 pb-4 sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="query-select" className="text-xs font-medium text-neutral-700">
              Query case:
            </label>
            <select
              id="query-select"
              value={selectedCaseId}
              onChange={(e) => handleSelectCase(e.target.value)}
              className="rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-900 focus:border-teal-600 focus:outline-none"
            >
              {informativeQueries.map((q) => (
                <option key={q.caseId} value={q.caseId}>
                  {q.caseId} · {q.dosha} ({q.kind}
                  {q.classDisagree > 0 ? `, ${q.classDisagree}/5 ranks disagree` : ''})
                </option>
              ))}
            </select>

            <span className="inline-flex items-center gap-1.5 rounded border border-neutral-200 bg-neutral-50 px-2 py-1 text-xs font-medium text-neutral-800">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: DOSHA_PALETTE[activeQuery.dosha] }}
              />
              True label: {activeQuery.dosha}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-md border border-neutral-200 bg-neutral-50 p-0.5 text-xs">
              {[
                { k: 'uniform', l: 'Uniform weights' },
                { k: 'mi', l: 'Train-MI weights' },
              ].map((opt) => (
                <button
                  key={opt.k}
                  type="button"
                  onClick={() => setWeighting(opt.k)}
                  className={`rounded px-2.5 py-1 text-[11px] font-medium ${
                    weighting === opt.k
                      ? 'bg-white text-teal-800 shadow-sm ring-1 ring-neutral-200'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  {opt.l}
                </button>
              ))}
            </div>

            {Object.keys(overrides).length > 0 && (
              <button
                type="button"
                onClick={() => setOverrides({})}
                className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-2 py-1 text-[11px] font-medium text-neutral-600 hover:text-neutral-900"
              >
                <RotateCcw className="h-3 w-3" />
                Reset vitals
              </button>
            )}
          </div>
        </div>

        {/* Selected Patient Summary & Continuous Vital Perturbation Sliders */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="space-y-1.5 text-xs text-neutral-600 lg:col-span-5">
            <div className="font-medium text-neutral-900">Core categorical profile</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
              <div>
                <span className="text-neutral-400">Body Size:</span> {activeQuery['Body Size']}
              </div>
              <div>
                <span className="text-neutral-400">Height:</span> {activeQuery['Height']}
              </div>
              <div>
                <span className="text-neutral-400">Appetite:</span> {activeQuery['Appetite']}
              </div>
              <div>
                <span className="text-neutral-400">Skin Texture:</span>{' '}
                {activeQuery['Texture of Skin']}
              </div>
              <div className="col-span-2 truncate">
                <span className="text-neutral-400">Bone Structure:</span>{' '}
                {activeQuery['Bone Structure']}
              </div>
              <div className="col-span-2 truncate">
                <span className="text-neutral-400">Complexion:</span> {activeQuery['Complexion']}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:col-span-7">
            {[
              { key: 'Age_Vaya', label: 'Age (yrs)', min: 18, max: 65, step: 1 },
              { key: 'BMI', label: 'BMI', min: 16, max: 35, step: 0.5 },
              { key: 'Systolic_BP', label: 'Systolic BP', min: 95, max: 160, step: 1 },
              { key: 'Pulse_Rate', label: 'Pulse (bpm)', min: 55, max: 96, step: 1 },
            ].map((v) => (
              <label key={v.key} className="block space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-neutral-500">{v.label}</span>
                  <span className="num font-medium text-neutral-900">{activeQuery[v.key]}</span>
                </div>
                <input
                  type="range"
                  min={v.min}
                  max={v.max}
                  step={v.step}
                  value={activeQuery[v.key]}
                  onChange={(e) =>
                    setOverrides((prev) => ({ ...prev, [v.key]: Number(e.target.value) }))
                  }
                  className="h-1.5 w-full cursor-pointer accent-teal-700"
                />
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Single Unified Comparison Table: Kernels as Columns, Ranks as Rows */}
      <div className="paper-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 px-5 py-3.5 text-xs">
          <span className="font-semibold text-neutral-900">
            Top-5 Retrieved Neighbors by Kernel (amber tint marks cells that disagree with consensus)
          </span>
          <span className="text-neutral-500">Click any rank row to inspect trait overlap</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50/70 text-[11px] font-medium text-neutral-500">
                <th className="w-16 py-2.5 pl-4 pr-2">Rank</th>
                {KERNEL_HEADERS.map((col) => (
                  <th key={col.key} className="px-3 py-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-800">{col.label}</span>
                      <span className="num text-[11px] font-normal text-neutral-500">
                        Hits: {retrieval.queryP5[col.key]}
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

                      {KERNEL_HEADERS.map((col) => {
                        const cell = row.cells[col.key];
                        const disagrees =
                          row.anyIdDisagreement &&
                          (row.majorityId === null || cell.profile.id !== row.majorityId);
                        const matchesLabel = cell.profile.dosha === activeQuery.dosha;
                        return (
                          <td
                            key={col.key}
                            className={`px-3 py-3 align-top ${
                              disagrees ? 'bg-amber-50/75' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="num font-medium text-neutral-900">
                                {cell.profile.id}
                              </span>
                              <span className="num text-[11px] text-neutral-500">
                                D={cell.distance.toFixed(3)}
                              </span>
                            </div>
                            <div className="mt-1 flex items-center justify-between gap-1.5 text-[11px]">
                              <span className="inline-flex items-center gap-1.5 font-medium text-neutral-700">
                                <span
                                  className="h-2 w-2 rounded-full"
                                  style={{
                                    backgroundColor: DOSHA_PALETTE[cell.profile.dosha],
                                  }}
                                />
                                {cell.profile.dosha}
                              </span>
                              <span className="num text-neutral-500">
                                {cell.matchedCount}/{cell.totalCore} core
                                {!matchesLabel && ' · diff'}
                              </span>
                            </div>
                          </td>
                        );
                      })}
                    </tr>

                    {isExpanded && (
                      <tr className="bg-neutral-50/80">
                        <td colSpan={5} className="px-5 py-3.5">
                          <div className="text-[11px] font-medium text-neutral-700">
                            Rank #{row.rank} Trait-Level Breakdown (20 core Prakriti traits + simulated vitals)
                          </div>
                          <div className="mt-2.5 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                            {KERNEL_HEADERS.map((col) => {
                              const cell = row.cells[col.key];
                              const p = cell.profile;
                              return (
                                <div
                                  key={col.key}
                                  className="rounded border border-neutral-200 bg-white p-3 text-[11px]"
                                >
                                  <div className="flex items-center justify-between font-medium text-neutral-900">
                                    <span>
                                      {col.label}: <span className="num">{p.id}</span>
                                    </span>
                                    <span className="num text-teal-800">
                                      {cell.matchedCount}/{cell.totalCore}
                                    </span>
                                  </div>
                                  <div className="num mt-1 text-[10px] text-neutral-500">
                                    Age {p.Age_Vaya} · BMI {p.BMI} · BP {p.Systolic_BP} · HR{' '}
                                    {p.Pulse_Rate}
                                  </div>
                                  <div className="mt-2 text-[10px] text-neutral-600">
                                    <span className="font-medium text-neutral-800">Matched: </span>
                                    {cell.matchedCore.slice(0, 6).join(', ')}
                                    {cell.matchedCore.length > 6
                                      ? ` (+${cell.matchedCore.length - 6})`
                                      : ''}
                                  </div>
                                  {cell.mismatchedCore.length > 0 && (
                                    <div className="mt-1 text-[10px] text-neutral-500">
                                      <span className="font-medium text-neutral-700">
                                        Differed:{' '}
                                      </span>
                                      {cell.mismatchedCore.slice(0, 4).join(', ')}
                                      {cell.mismatchedCore.length > 4
                                        ? ` (+${cell.mismatchedCore.length - 4})`
                                        : ''}
                                    </div>
                                  )}
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
