import React, { useState } from 'react';

const DOSHA_PALETTE = {
  'Vata+Pitta': '#0072B2',
  'Vata': '#D55E00',
  'Pitta': '#009E73',
  'Kapha': '#CC79A7',
  'Pitta+Kapha': '#E69F00',
  'Vata+Kapha': '#56B4E9',
};

function fmt(v, d = 4) {
  if (typeof v !== 'number') return '—';
  // For very small p-values use exponential notation
  if (Math.abs(v) < 0.0001 && v !== 0) return v.toExponential(2);
  return v.toFixed(d);
}

// SVG-based mini histogram for distance distributions
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
    ...intra_class_counts,
    ...inter_class_counts,
  );

  const scaleY = (v) => plotH - (v / maxCount) * plotH;

  return (
    <div className="flex flex-col items-start">
      <div className="mb-1 text-xs font-semibold text-neutral-800">{title}</div>
      <svg width={W} height={H} style={{ display: 'block' }}>
        <g transform={`translate(${PAD.left},${PAD.top})`}>
          {/* inter-class bars (background, neutral) */}
          {inter_class_counts.map((v, i) => {
            const bh = (v / maxCount) * plotH;
            return (
              <rect
                key={`inter-${i}`}
                x={i * barW}
                y={plotH - bh}
                width={barW - 0.5}
                height={bh}
                fill="#A3A3A3"
                opacity={0.7}
              />
            );
          })}
          {/* intra-class bars (teal, foreground) */}
          {intra_class_counts.map((v, i) => {
            const bh = (v / maxCount) * plotH;
            return (
              <rect
                key={`intra-${i}`}
                x={i * barW}
                y={plotH - bh}
                width={barW - 0.5}
                height={bh}
                fill="#0F766E"
                opacity={0.7}
              />
            );
          })}
          {/* baseline */}
          <line x1={0} y1={plotH} x2={plotW} y2={plotH} stroke="#D4D4D4" strokeWidth={1} />
        </g>
      </svg>
      <div className="mt-1 text-[11px] text-neutral-600 space-y-0.5">
        <div>
          <span className="inline-block w-2.5 h-2.5 rounded-sm mr-1" style={{ background: '#0F766E', opacity: 0.85, verticalAlign: 'middle' }} />
          Intra: <span className="num font-mono">{data.intra_mean.toFixed(4)}</span> ±{' '}
          <span className="num font-mono">{data.intra_std.toFixed(4)}</span>
        </div>
        <div>
          <span className="inline-block w-2.5 h-2.5 rounded-sm mr-1" style={{ background: '#A3A3A3', opacity: 0.85, verticalAlign: 'middle' }} />
          Inter: <span className="num font-mono">{data.inter_mean.toFixed(4)}</span> ±{' '}
          <span className="num font-mono">{data.inter_std.toFixed(4)}</span>
        </div>
      </div>
    </div>
  );
}

export default function DatasetAnalysisPage({ descriptive, realData }) {
  const [cvSort, setCvSort] = useState('cramers_v'); // always desc

  if (!descriptive || !realData) {
    return (
      <div className="p-8 text-sm text-neutral-500">Loading dataset analysis…</div>
    );
  }

  const meta = realData.provenance.dataset_metadata;
  const classCounts = meta.class_counts;
  const totalRecords = meta.n_rows;

  // Class distribution: compute percentages from props
  const classEntries = Object.entries(classCounts);
  const maxCount = Math.max(...classEntries.map(([, v]) => v));

  // Cramér's V sorted descending
  const cramersSorted = [...(descriptive.cramers_v || [])].sort(
    (a, b) => b.cramers_v - a.cramers_v,
  );

  const histograms = descriptive.distance_histograms || {};
  const invariance = descriptive.invariance_note;

  // Overview card data — all from props
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
        <h1 className="text-xl font-semibold text-neutral-900">Dataset Analysis</h1>
        <p className="mt-2 text-sm text-neutral-600">
          {descriptive.notice ||
            'Structural and statistical properties of the Prakriti dataset used in this benchmark.'}
        </p>
        <p className="mt-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2 inline-block">
          Dataset-provided Dosha labels — origin, license, and annotator unstated.
        </p>
      </div>

      {/* R11 Disclaimer */}
      <div className="rounded border border-neutral-200 bg-neutral-50 px-4 py-3 text-xs text-neutral-600">
        Research prototype on a dataset of unverified origin. Not a diagnostic tool.
      </div>

      {/* 2. Dataset Overview Cards */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-neutral-900">Dataset Overview</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {overviewCards.map(({ label, value }) => (
            <div key={label} className="paper-card px-4 py-4 text-center">
              <div className="num text-2xl font-bold text-teal-800">{value}</div>
              <div className="mt-1 text-xs text-neutral-500">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Class Distribution */}
      <div className="paper-card overflow-hidden">
        <div className="border-b border-neutral-200 px-6 py-4">
          <h2 className="text-sm font-semibold text-neutral-900">Dosha Class Distribution</h2>
          <p className="mt-1 text-xs text-neutral-500">
            Counts and proportions of each class label as provided in the dataset.
          </p>
        </div>
        <div className="px-6 py-5 space-y-3">
          {classEntries.map(([cls, count]) => {
            const pct = (count / totalRecords) * 100;
            const barPct = (count / maxCount) * 100;
            return (
              <div key={cls} className="flex items-center gap-3">
                <div className="w-28 shrink-0 text-xs font-medium text-neutral-700 text-right">
                  {cls}
                </div>
                <div className="flex-1 bg-neutral-100 rounded-sm h-5 overflow-hidden">
                  <div
                    className="h-5 rounded-sm"
                    style={{
                      width: `${barPct}%`,
                      backgroundColor: DOSHA_PALETTE[cls] || '#6B7280',
                      opacity: 0.85,
                    }}
                  />
                </div>
                <div className="shrink-0 text-xs text-neutral-600 w-28">
                  <span className="num font-mono">{count}</span>
                  {' '}
                  <span className="text-neutral-400">(</span>
                  <span className="num font-mono">{pct.toFixed(1)}</span>
                  <span className="text-neutral-400">%)</span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="border-t border-neutral-100 px-6 py-2 text-xs text-neutral-500">
          Total: <span className="num font-mono">{totalRecords}</span> records.
          Proportions computed from class counts in dataset metadata.
        </div>
      </div>

      {/* 4. Cramér's V Table */}
      <div className="paper-card overflow-hidden">
        <div className="border-b border-neutral-200 px-6 py-4">
          <h2 className="text-sm font-semibold text-neutral-900">Cramér's V by Trait</h2>
          <p className="mt-1 text-xs text-neutral-500">
            Association between each trait and the Dosha class label (χ² test).
            Sorted by Cramér's V descending.
          </p>
          <p className="mt-1 text-xs text-amber-700">
            Descriptive only — Cramér's V was not used for weighting or feature selection (R2).
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-500">
                <th className="py-2.5 pl-6 pr-3 font-medium">Trait</th>
                <th className="px-3 py-2.5 text-right font-medium">Cramér's V</th>
                <th className="px-3 py-2.5 text-right font-medium">χ²</th>
                <th className="px-3 py-2.5 text-right font-medium">p-value</th>
                <th className="py-2.5 pl-3 pr-6 font-medium">Flag</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {cramersSorted.map((row) => (
                <tr key={row.trait} className="hover:bg-neutral-50">
                  <td className="py-2.5 pl-6 pr-3 font-medium text-neutral-800">
                    {row.trait}
                  </td>
                  <td className="num font-mono whitespace-nowrap px-3 py-2.5 text-right text-neutral-800">
                    {row.cramers_v.toFixed(4)}
                  </td>
                  <td className="num font-mono whitespace-nowrap px-3 py-2.5 text-right text-neutral-700">
                    {row.chi2.toFixed(2)}
                  </td>
                  <td className="num font-mono whitespace-nowrap px-3 py-2.5 text-right text-neutral-600">
                    {row.p_value < 0.0001
                      ? row.p_value.toExponential(2)
                      : row.p_value.toFixed(4)}
                  </td>
                  <td className="py-2.5 pl-3 pr-6 text-neutral-500">
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
        <div className="border-b border-neutral-200 px-6 py-4">
          <h2 className="text-sm font-semibold text-neutral-900">
            Distance Distributions — Intra- vs. Inter-class
          </h2>
          <p className="mt-1 text-xs text-neutral-500">
            Histogram of pairwise distances split by intra-class (
            <span className="inline-block w-2 h-2 rounded-sm" style={{ background: '#0F766E', opacity: 0.85, verticalAlign: 'middle' }} />{' '}
            teal) and inter-class (
            <span className="inline-block w-2 h-2 rounded-sm" style={{ background: '#A3A3A3', opacity: 0.85, verticalAlign: 'middle' }} />{' '}
            grey) pairs. All statistics from props.
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
          <h2 className="mb-3 text-sm font-semibold text-neutral-900">
            Metric Invariance Note
          </h2>
          <blockquote className="border-l-4 border-teal-700 pl-4 space-y-3">
            <div className="text-xs text-neutral-700 leading-relaxed">
              {invariance.mathematical_basis}
            </div>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
              <div>
                <div className="mb-1 font-semibold text-teal-800">Invariant families</div>
                <ul className="list-disc list-inside space-y-0.5 text-neutral-600">
                  {invariance.invariant_families.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="mb-1 font-semibold text-neutral-700">Non-invariant families</div>
                <ul className="list-disc list-inside space-y-0.5 text-neutral-600">
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
