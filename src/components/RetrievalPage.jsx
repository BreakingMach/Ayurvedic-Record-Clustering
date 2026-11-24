import React, { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { DOSHA_PALETTE } from '../data/literatureData';
import { retrieveTopKReal } from '../utils/distanceEngine';

export default function RetrievalPage({ realCases }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRowIdx, setSelectedRowIdx] = useState(0);
  const [inspectedCell, setInspectedCell] = useState(null);

  const records = realCases?.records || [];

  const filteredRecords = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return records;
    return records.filter(
      (r) =>
        r.case_id?.toLowerCase().includes(q) ||
        r.dataset_label?.toLowerCase().includes(q) ||
        r.traits?.some((t) => String(t).toLowerCase().includes(q))
    );
  }, [records, searchTerm]);

  // Keep selectedRowIdx synced with active search filter so select dropdown & preview stay aligned
  useEffect(() => {
    if (
      filteredRecords.length > 0 &&
      !filteredRecords.some((r) => r.row_idx === selectedRowIdx)
    ) {
      setSelectedRowIdx(filteredRecords[0].row_idx);
      setInspectedCell(null);
    }
  }, [filteredRecords, selectedRowIdx]);

  const queryRecord = records[selectedRowIdx] || records[0];

  const retrieval = useMemo(() => {
    if (!queryRecord || !realCases?.categorical_cols) return null;
    return retrieveTopKReal(queryRecord, realCases, 5);
  }, [queryRecord, realCases]);

  if (!realCases || records.length === 0 || !retrieval) {
    return <div className="glass-panel rounded-2xl p-8 text-sm text-[#827568]">Loading real retrieval records…</div>;
  }

  const ranks = [1, 2, 3, 4, 5];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#40382F]">Real-Record Retrieval</h1>
        <p className="mt-2 text-sm text-[#827568]">
          Select any real record from the <span className="num text-[#40382F] font-medium">{realCases.records.length}</span>{' '}
          rows of <code className="num text-xs text-[#40382F]">{realCases.csv_member}</code> to inspect its top-5
          nearest neighbours under Gower, Euclidean, and Cosine distances. No synthetic or invented
          patients are used on this page.
        </p>
      </div>

      {/* Searchable Selector over all 1,200 Real Records */}
      <div className="paper-card p-6 space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
          <div className="md:col-span-5">
            <label htmlFor="real-search" className="block text-xs font-semibold text-[#40382F]">
              Search real records (ID, Dosha label, or trait text)
            </label>
            <div className="relative mt-2">
              <Search className="pointer-events-none absolute left-3 top-2 h-3.5 w-3.5 text-[#967D63]" />
              <input
                id="real-search"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="e.g. R-0042, Kapha, Oily..."
                className="w-full rounded-xl border border-[#C3A989]/50 bg-white/80 py-1.5 pl-8 pr-3 text-xs text-[#40382F] placeholder-[#827568]/70 focus:border-[#967D63] focus:outline-none"
              />
            </div>
          </div>

          <div className="md:col-span-7">
            <label htmlFor="real-select" className="block text-xs font-semibold text-[#40382F]">
              Select query record (
              <span className="num">{filteredRecords.length}</span> matching)
            </label>
            <select
              id="real-select"
              value={selectedRowIdx}
              disabled={filteredRecords.length === 0}
              onChange={(e) => {
                setSelectedRowIdx(Number(e.target.value));
                setInspectedCell(null);
              }}
              className="mt-2 w-full rounded-xl border border-[#C3A989]/50 bg-white/80 px-3 py-1.5 text-xs font-medium text-[#40382F] focus:border-[#967D63] focus:outline-none disabled:opacity-60"
            >
              {filteredRecords.length === 0 ? (
                <option value={selectedRowIdx}>No records match &quot;{searchTerm}&quot;</option>
              ) : (
                filteredRecords.slice(0, 200).map((r) => (
                  <option key={r.row_idx} value={r.row_idx}>
                    {r.case_id} · {r.dataset_label} · {r.traits[0]} / {r.traits[2]} / {r.traits[18]}
                  </option>
                ))
              )}
              {filteredRecords.length > 200 && (
                <option disabled>
                  ... narrow search to browse remaining {filteredRecords.length - 200} rows
                </option>
              )}
            </select>
          </div>
        </div>

        {/* Selected Query Record Summary (Real Trait Names) */}
        <div className="border-t border-[#E8DED1] pt-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="num font-bold text-[#40382F]">{queryRecord.case_id}</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/80 bg-[#F3EADF] px-3 py-0.5 font-medium text-[#40382F]">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: DOSHA_PALETTE[queryRecord.dataset_label] }}
              />
              Dataset-provided label: {queryRecord.dataset_label}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-[#827568] sm:grid-cols-2 lg:grid-cols-3">
            {realCases.categorical_cols.slice(0, 6).map((colName, idx) => (
              <div key={colName} className="truncate">
                <span className="font-semibold text-[#40382F]">{colName}:</span>{' '}
                {queryRecord.traits[idx]}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Explanatory Note when All Three Metrics Agree */}
      {retrieval.allAgree && (
        <div className="paper-card px-4 py-3 text-xs leading-relaxed text-[#40382F]">
          All three metrics return identical top-5 neighbours on this record because the real CSV
          is categorical-only — uniform Gower, one-hot Euclidean, and one-hot Cosine are exact
          monotone transforms of Hamming distance.
        </div>
      )}

      {/* Top-5 Neighbours per Metric with Ranks as Columns */}
      <div className="paper-card overflow-hidden">
        <div className="border-b border-[#E8DED1] px-6 py-4 text-xs">
          <div className="font-bold text-[#40382F]">
            Top-5 Nearest Neighbours by Metric (Ranks #1–#5 as Columns)
          </div>
          <div className="mt-1 text-[#827568]">
            Cells are highlighted only where metrics disagree on the retrieved neighbour at that
            rank. Click any neighbour cell to inspect differing real traits.
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-[#E8DED1] bg-[#F3EADF]/70 text-[#827568]">
                <th className="w-28 py-3 pl-6 pr-3 font-semibold">Metric</th>
                {ranks.map((r) => (
                  <th key={r} className="num px-3 py-3 font-semibold">
                    Rank #{r}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8DED1]">
              {retrieval.metrics.map((m) => (
                <tr key={m}>
                  <td className="py-3 pl-6 pr-3 font-bold capitalize text-[#40382F]">{m}</td>
                  {retrieval.byMetric[m].map((item, rankIdx) => {
                    const disagrees = retrieval.rankDisagreements[rankIdx];
                    const isSelected =
                      inspectedCell &&
                      inspectedCell.metric === m &&
                      inspectedCell.rank === rankIdx + 1;
                    return (
                      <td
                        key={`${m}-${rankIdx}`}
                        onClick={() =>
                          setInspectedCell({ metric: m, rank: rankIdx + 1, item })
                        }
                        className={`cursor-pointer px-3 py-3 align-top transition hover:bg-[#F3EADF]/60 ${
                          disagrees ? 'bg-[#E8DED1]/60' : ''
                        } ${isSelected ? 'ring-2 ring-inset ring-[#967D63] bg-white/80' : ''}`}
                      >
                        <div className="num font-semibold text-[#40382F]">
                          {item.record.case_id}
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-[#40382F]">
                          <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{
                              backgroundColor: DOSHA_PALETTE[item.record.dataset_label],
                            }}
                          />
                          {item.record.dataset_label}
                        </div>
                        <div className="num mt-1 text-[11px] text-[#827568]">
                          D = {item.distances[m].toFixed(4)}
                        </div>
                        <div className="num text-[11px] text-[#827568]">
                          {item.matchedCount}/{item.totalTraits} traits
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expandable Trait-Level Inspection Panel (Real Trait Names Only) */}
      {inspectedCell && (
        <div className="paper-card p-6 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E8DED1] pb-3">
            <h2 className="text-sm font-bold text-[#40382F]">
              Trait Comparison — <span className="num">{queryRecord.case_id}</span> vs{' '}
              <span className="num">{inspectedCell.item.record.case_id}</span> (
              <span className="capitalize">{inspectedCell.metric}</span> Rank #
              <span className="num">{inspectedCell.rank}</span>)
            </h2>
            <span className="num text-xs text-[#827568]">
              {inspectedCell.item.differed.length} differing traits out of{' '}
              {inspectedCell.item.totalTraits}
            </span>
          </div>

          {inspectedCell.item.differed.length === 0 ? (
            <p className="text-xs text-[#827568]">
              Identical across all {inspectedCell.item.totalTraits} recorded real traits.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[540px] border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E8DED1] text-[#827568]">
                    <th className="py-2 pr-3 font-semibold">Real Trait</th>
                    <th className="px-3 py-2 font-semibold">Query ({queryRecord.case_id})</th>
                    <th className="py-2 pl-3 font-semibold">
                      Neighbour ({inspectedCell.item.record.case_id})
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8DED1]/70">
                  {inspectedCell.item.differed.map((d) => (
                    <tr key={d.trait} className="hover:bg-[#F3EADF]/40">
                      <td className="whitespace-nowrap py-2 pr-3 font-semibold text-[#40382F]">
                        {d.trait}
                      </td>
                      <td className="px-3 py-2 text-[#827568]">{d.queryVal}</td>
                      <td className="py-2 pl-3 text-[#827568]">{d.candVal}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
