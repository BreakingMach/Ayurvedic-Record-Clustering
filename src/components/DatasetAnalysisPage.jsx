import React from 'react';
import { DOSHA_PALETTE } from '../data/literatureData';

// SVG-based responsive mini histogram for distance distributions
function DistanceHistogram({ data, title }) {
  const W = 300;
  const H = 120;
  const PAD = { top: 8, right: 8, bottom: 4, left: 8 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const { bin_centers, intra_class_counts, inter_class_counts } = data;
  const n = bin_centers.length;
  const barW = plotW / n;

  const maxCount = Math.max(
    1,
    ...intra_class_counts,
    ...inter_class_counts,
  );

  return (
    <div className="flex flex-col items-start flex-1 min-w-[240px]">
      <div className="mb-1 text-xs font-bold text-[#40382F]">{title}</div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[300px] h-auto block">
        <g transform={`translate(${PAD.left},${PAD.top})`}>
          {/* inter-class bars (background, champagne) */}
          {inter_class_counts.map((v, i) => {
            const bh = (v / maxCount) * plotH;
            return (
              <rect
                key={`inter-${i}`}
                x={i * barW}
                y={plotH - bh}
                width={Math.max(0.5, barW - 0.5)}
                height={bh}
                fill="#C3A989"
                opacity={0.7}
              />
            );
          })}
          {/* intra-class bars (warm brown, foreground) */}
          {intra_class_counts.map((v, i) => {
            const bh = (v / maxCount) * plotH;
            return (
              <rect
                key={`intra-${i}`}
                x={i * barW}
                y={plotH - bh}
                width={Math.max(0.5, barW - 0.5)}
                height={bh}
                fill="#40382F"
                opacity={0.75}
              />
            );
          })}
          {/* baseline */}
          <line x1={0} y1={plotH} x2={plotW} y2={plotH} stroke="#C3A989" strokeWidth={1} />
        </g>
      </svg>
      <div className="mt-1 text-[11px] text-[#827568] space-y-0.5">
        <div>
          <span className="inline-block w-2.5 h-2.5 rounded-sm mr-1" style={{ background: '#40382F', opacity: 0.85, verticalAlign: 'middle' }} />
          Intra: <span className="num font-mono text-[#40382F]">{data.intra_mean.toFixed(4)}</span> ±{' '}
          <span className="num font-mono text-[#40382F]">{data.intra_std.toFixed(4)}</span>
        </div>
        <div>
          <span className="inline-block w-2.5 h-2.5 rounded-sm mr-1" style={{ background: '#C3A989', opacity: 0.85, verticalAlign: 'middle' }} />
          Inter: <span className="num font-mono text-[#40382F]">{data.inter_mean.toFixed(4)}</span> ±{' '}
          <span className="num font-mono text-[#40382F]">{data.inter_std.toFixed(4)}</span>
        </div>
      </div>
    </div>
  );
}

export default function DatasetAnalysisPage({ descriptive, realData }) {
  if (!descriptive || !realData) {
    return (
      <div className="glass-panel rounded-2xl p-8 text-sm text-[#827568]">Loading dataset analysis…</div>
    );
  }

  const meta = realData.provenance.dataset_metadata;
  const classCounts = meta.class_counts;
  const totalRecords = meta.n_rows;

  const classEntries = Object.entries(classCounts);
  const maxCount = Math.max(...classEntries.map(([, v]) => v));

  const cramersRaw = Array.isArray(descriptive.cramers_v)
    ? descriptive.cramers_v
    : Object.values(descriptive.cramers_v || {});
  const cramersSorted = [...cramersRaw].sort(
    (a, b) => b.cramers_v - a.cramers_v,
  );

  const histograms = descriptive.distance_histograms || {};
  const invariance = descriptive.invariance_note;

  const overviewCards = [
    { label: 'Total Records', value: meta.n_rows },
    { label: 'Categorical Traits', value: meta.n_categorical },
    { label: 'Numeric Traits', value: meta.n_numeric },
    { label: 'Duplicate Rows', value: meta.duplicate_row_count },
    { label: 'Dosha Classes', value: Object.keys(classCounts).length },
  ];

  return (
    <div className="space-y-8">
      {/* 1. Page Header */}
      <div>
        <h1 className="text-xl font-bold text-[#40382F]">Dataset Analysis</h1>
        <p className="mt-2 text-sm text-[#827568]">
          {descriptive.notice ||
            'Structural and statistical properties of the Prakriti dataset used in this benchmark.'}
        </p>
        <p className="mt-2 text-xs text-[#40382F] bg-[#E8DED1]/80 border border-[#C3A989]/50 rounded-full px-3.5 py-1 inline-block font-medium">
          Dataset-provided Dosha labels — origin, license, and annotator unstated.
        </p>
      </div>

      {/* R11 Disclaimer */}
      <div className="paper-card px-4 py-3 text-xs text-[#827568]">
        Research prototype on a dataset of unverified origin. Not a diagnostic tool.
      </div>

      {/* 2. Dataset Overview Cards */}
      <div>
        <h2 className="mb-3 text-sm font-bold text-[#40382F]">Dataset Overview</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {overviewCards.map(({ label, value }) => (
            <div key={label} className="paper-card px-4 py-4 text-center">
              <div className="num text-2xl font-bold text-[#40382F]">{value}</div>
              <div className="mt-1 text-xs text-[#827568]">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Class Distribution */}
      <div className="paper-card overflow-hidden">
        <div className="border-b border-[#E8DED1] px-6 py-4">
          <h2 className="text-sm font-bold text-[#40382F]">Dosha Class Distribution</h2>
          <p className="mt-1 text-xs text-[#827568]">
            Counts and proportions of each class label as provided in the dataset.
          </p>
        </div>
        <div className="px-6 py-5 space-y-3">
          {classEntries.map(([cls, count]) => {
            const pct = (count / totalRecords) * 100;
            const barPct = (count / maxCount) * 100;
            return (
              <div key={cls} className="flex items-center gap-3">
                <div className="w-24 sm:w-28 shrink-0 text-xs font-semibold text-[#40382F] text-right">
                  {cls}
                </div>
                <div className="flex-1 bg-[#E8DED1]/65 rounded-full h-5 overflow-hidden">
                  <div
                    className="h-5 rounded-full"
                    style={{
                      width: `${barPct}%`,
                      backgroundColor: DOSHA_PALETTE[cls] || '#967D63',
                      opacity: 0.88,
                    }}
                  />
                </div>
                <div className="shrink-0 text-xs text-[#827568] w-24 sm:w-28">
                  <span className="num font-mono text-[#40382F] font-semibold">{count}</span>
                  {' '}
                  <span>(</span>
                  <span className="num font-mono">{pct.toFixed(1)}</span>
                  <span>%)</span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="border-t border-[#E8DED1] px-6 py-2.5 text-xs text-[#827568]">
          Total: <span className="num font-mono text-[#40382F]">{totalRecords}</span> records.
          Proportions computed from class counts in dataset metadata.
        </div>
      </div>

      {/* 4. Cramér's V Table */}
      <div className="paper-card overflow-hidden">
        <div className="border-b border-[#E8DED1] px-6 py-4">
          <h2 className="text-sm font-bold text-[#40382F]">Cramér&apos;s V by Trait</h2>
          <p className="mt-1 text-xs text-[#827568]">
            Association between each trait and the Dosha class label (χ² test).
            Sorted by Cramér&apos;s V descending.
          </p>
          <p className="mt-1 text-xs text-[#967D63] font-medium">
            Descriptive only — Cramér&apos;s V was not used for weighting or feature selection (R2).
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-[#E8DED1] bg-[#F3EADF]/70 text-[#827568]">
                <th className="py-2.5 pl-6 pr-3 font-semibold">Trait</th>
                <th className="px-3 py-2.5 text-right font-semibold">Cramér&apos;s V</th>
                <th className="px-3 py-2.5 text-right font-semibold">χ²</th>
                <th className="px-3 py-2.5 text-right font-semibold">p-value</th>
                <th className="py-2.5 pl-3 pr-6 font-semibold">Flag</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8DED1]/70">
              {cramersSorted.map((row) => (
                <tr key={row.trait} className="hover:bg-[#F3EADF]/50 transition">
                  <td className="py-2.5 pl-6 pr-3 font-semibold text-[#40382F]">
                    {row.trait}
                  </td>
                  <td className="num font-mono whitespace-nowrap px-3 py-2.5 text-right text-[#40382F] font-semibold">
                    {row.cramers_v.toFixed(4)}
                  </td>
                  <td className="num font-mono whitespace-nowrap px-3 py-2.5 text-right text-[#827568]">
                    {row.chi2.toFixed(2)}
                  </td>
                  <td className="num font-mono whitespace-nowrap px-3 py-2.5 text-right text-[#827568]">
                    {row.p_value < 0.0001
                      ? row.p_value.toExponential(2)
                      : row.p_value.toFixed(4)}
                  </td>
                  <td className="py-2.5 pl-3 pr-6 text-[#827568]">
                    {row.flag}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Distance Histograms */}
      <div className="paper-card overflow-hidden">
        <div className="border-b border-[#E8DED1] px-6 py-4">
          <h2 className="text-sm font-bold text-[#40382F]">
            Distance Distributions — Intra- vs. Inter-class
          </h2>
          <p className="mt-1 text-xs text-[#827568]">
            Histogram of pairwise distances split by intra-class (
            <span className="inline-block w-2 h-2 rounded-sm" style={{ background: '#40382F', opacity: 0.85, verticalAlign: 'middle' }} />{' '}
            dark brown) and inter-class (
            <span className="inline-block w-2 h-2 rounded-sm" style={{ background: '#C3A989', opacity: 0.85, verticalAlign: 'middle' }} />{' '}
            champagne) pairs. All statistics from props.
          </p>
        </div>
        <div className="px-6 py-5 flex flex-wrap gap-8">
          {['gower', 'euclidean', 'cosine'].map((metric) =>
            histograms[metric] ? (
              <DistanceHistogram
                key={metric}
                data={histograms[metric]}
                title={metric.charAt(0).toUpperCase() + metric.slice(1)}
              />
            ) : null,
          )}
        </div>
      </div>

      {/* 6. Invariance Note */}
      {invariance && (
        <div className="paper-card px-6 py-5">
          <h2 className="mb-3 text-sm font-bold text-[#40382F]">
            Metric Invariance Note
          </h2>
          <blockquote className="border-l-4 border-[#967D63] pl-4 space-y-3">
            <div className="text-xs text-[#40382F] leading-relaxed">
              {invariance.mathematical_basis}
            </div>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
              <div>
                <div className="mb-1 font-semibold text-[#967D63]">Invariant families</div>
                <ul className="list-disc list-inside space-y-0.5 text-[#827568]">
                  {invariance.invariant_families.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="mb-1 font-semibold text-[#40382F]">Non-invariant families</div>
                <ul className="list-disc list-inside space-y-0.5 text-[#827568]">
                  {invariance.non_invariant_families.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </div>
            </div>
          </blockquote>
        </div>
      )}
    </div>
  );
}
