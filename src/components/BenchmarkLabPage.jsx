import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from 'recharts';
import {
  FlaskConical,
  BarChart3,
  Scale,
  Network,
  Database,
  CheckCircle2,
  Sliders,
  AlertTriangle,
  Grid,
} from 'lucide-react';
import { DOSHA_PALETTE } from '../data/literatureData';
import ResultsPage from './ResultsPage';
import MetricComparisonPage from './MetricComparisonPage';
import PatientClusteringPage from './PatientClusteringPage';
import DatasetAnalysisPage from './DatasetAnalysisPage';
import PatientAttributesPage from './PatientAttributesPage';
import DiagnosticValidationPage from './DiagnosticValidationPage';
import MethodPage from './MethodPage';
import ReportsExportPage from './ReportsExportPage';

const METRIC_COLORS = {
  gower: '#8E6F50',
  euclidean: '#5B7C99',
  cosine: '#4A8268',
  euclidean_observed_only: '#849BB0',
  cosine_observed_only: '#79A791',
};

const SWEEP_META = {
  categorical_eps: { label: 'Categorical Noise (ε)', unit: '' },
  numeric_cohens_d: { label: 'Numeric Effect Size (d)', unit: '' },
  outlier_fraction: { label: 'Outlier Fraction', unit: '' },
  missing_fraction: { label: 'Missingness Fraction', unit: '' },
  label_noise_rate: { label: 'Label Noise Rate', unit: '' },
  m_traits: { label: 'Categorical Trait Count (m)', unit: '' },
};

const CHART_TOOLTIP_STYLE = {
  backgroundColor: 'rgba(243, 234, 223, 0.96)',
  border: '1px solid #D8CBBC',
  borderRadius: '12px',
  color: '#40382F',
  fontSize: '12px',
  boxShadow: '0 8px 24px -6px rgba(64, 56, 47, 0.16)',
};

const LAB_SUBTABS = [
  { id: 'grid', label: 'Visual Analytics Grid', icon: Grid },
  { id: 'results', label: 'Benchmark Results', icon: BarChart3 },
  { id: 'comparison', label: 'OFAT & Scaling', icon: Scale },
  { id: 'clustering', label: 'Cluster Explorer', icon: Network },
  { id: 'attributes', label: 'Trait & Corpus Audit', icon: Database },
  { id: 'validation', label: 'Label Validation', icon: CheckCircle2 },
  { id: 'protocol', label: 'Protocol & Export', icon: Sliders },
];

function fmtPct(v) {
  if (typeof v !== 'number' || Number.isNaN(v)) return '—';
  return `${(v * 100).toFixed(1)}%`;
}

function fmtNum(v, digits = 3) {
  if (typeof v !== 'number' || Number.isNaN(v)) return '—';
  return v.toFixed(digits);
}

export default function BenchmarkLabPage({
  realData,
  syntheticData,
  expertReview,
  realCases,
  descriptive,
  missingnessData,
  scalingAblation,
  clusteringsData,
  embeddingsData,
}) {
  const [labTab, setLabTab] = useState('grid');
  const [mdsDataset, setMdsDataset] = useState('real');
  const [mdsMetric, setMdsMetric] = useState('gower');
  const [heatMetric, setHeatMetric] = useState('gower');
  const [hoveredCell, setHoveredCell] = useState(null);
  const [sweepKey, setSweepKey] = useState('categorical_eps');
  const [sweepTarget, setSweepTarget] = useState('knn_macro_f1');
  const [panel4Mode, setPanel4Mode] = useState('missingness'); // 'missingness' | 'histogram'
  const [histMetric, setHistMetric] = useState('gower');
  const [panel6Mode, setPanel6Mode] = useState('cramers'); // 'cramers' | 'cohort'

  // Extract KPI cards data safely from realData
  const kpiCards = useMemo(() => {
    const metrics = realData?.full_29_traits?.metrics;
    const shuffled = realData?.shuffled_control;
    const buildMetricCard = (key, title, subtitle) => {
      const m = metrics?.[key];
      return {
        key,
        title,
        subtitle,
        f1: m?.knn_cv?.macro_f1_mean,
        p5: m?.loo_retrieval?.macro?.p_at_5,
        ari: m?.clustering?.linkages?.average?.ari,
        nmi: m?.clustering?.linkages?.average?.nmi,
      };
    };
    return [
      buildMetricCard('gower', 'Gower Distance', 'Range-normalized mixed metric'),
      buildMetricCard('euclidean', 'Euclidean Distance', 'Mode-imputed Z-scored L2'),
      buildMetricCard('cosine', 'Cosine Distance', 'Mode-imputed directional metric'),
      {
        key: 'shuffled',
        title: 'Shuffled Control (R5)',
        subtitle: shuffled?.passed ? 'Leakage test passed' : 'Permutation baseline',
        f1: shuffled?.knn_macro_f1_mean,
        p5: shuffled?.loo_macro_p_at_5,
        ari: shuffled?.ari_average,
        nmi: shuffled?.nmi_average,
        passed: Boolean(shuffled?.passed),
      },
    ];
  }, [realData]);

  // Panel 1: 2D MDS Cluster Projections (evenly sampled so ScatterChart renders briskly)
  const mdsByClass = useMemo(() => {
    const coords = embeddingsData?.datasets?.[mdsDataset]?.[mdsMetric] || [];
    const labelsArr =
      mdsDataset === 'real' ? realCases?.labels || [] : [];
    const classNames = realCases?.classes || Object.keys(DOSHA_PALETTE);
    const total = coords.length;
    const stride = total > 400 ? Math.max(1, Math.floor(total / 300)) : 1;
    const grouped = {};
    classNames.forEach((cls) => {
      grouped[cls] = [];
    });

    for (let i = 0; i < total; i += stride) {
      const pt = coords[i];
      if (!Array.isArray(pt) || pt.length < 2) continue;
      let clsName = 'Cohort';
      if (mdsDataset === 'real' && typeof labelsArr[i] === 'number') {
        clsName = classNames[labelsArr[i]] || 'Cohort';
      } else if (mdsDataset === 'synthetic') {
        // Group evenly into class buckets when class array is omitted
        const bucketIdx = Math.floor((i / Math.max(1, total)) * classNames.length);
        clsName = classNames[Math.min(classNames.length - 1, bucketIdx)] || 'Cohort';
      }
      if (!grouped[clsName]) grouped[clsName] = [];
      grouped[clsName].push({
        x: Number(pt[0].toFixed(4)),
        y: Number(pt[1].toFixed(4)),
        idx: i,
        cls: clsName,
      });
    }
    return Object.entries(grouped).filter(([, pts]) => pts.length > 0);
  }, [embeddingsData, mdsDataset, mdsMetric, realCases]);

  // Panel 2: Stratified 16x16 Heatmap from descriptive.sample_240
  const heatmapData = useMemo(() => {
    const s240 = descriptive?.sample_240;
    const matrix = s240?.distance_matrices?.[heatMetric];
    const indices = s240?.indices || [];
    const classLabels = s240?.class_labels || [];
    if (!Array.isArray(matrix) || matrix.length === 0) {
      return { picked: [], matrix: [] };
    }
    // Select up to 16 evenly spaced rows across sorted/strided classes
    const targetCount = 16;
    const step = Math.max(1, Math.floor(matrix.length / targetCount));
    const picked = [];
    for (let i = 0; i < matrix.length && picked.length < targetCount; i += step) {
      picked.push({
        localIdx: i,
        recordIdx: indices[i] ?? i,
        label: classLabels[i] || 'Unknown',
      });
    }
    const maxScale = heatMetric === 'euclidean' ? 7.62 : 0.85;
    const rows = picked.map((rowMeta) =>
      picked.map((colMeta) => {
        const raw = matrix[rowMeta.localIdx]?.[colMeta.localIdx] ?? 0;
        const norm = Math.max(0, Math.min(1, raw / maxScale));
        return { raw, norm, row: rowMeta, col: colMeta };
      })
    );
    return { picked, rows };
  }, [descriptive, heatMetric]);

  // Panel 3: Simulated OFAT Sweeps from syntheticData
  const sweepChartRows = useMemo(() => {
    const sweep = syntheticData?.sweeps?.[sweepKey];
    if (!sweep || !Array.isArray(sweep.values) || !Array.isArray(sweep.cell_ids)) {
      return [];
    }
    return sweep.values.map((val, i) => {
      const cid = sweep.cell_ids[i];
      const cell = syntheticData?.cells?.[cid];
      const metrics = cell?.metrics;
      return {
        param: String(val),
        gower: metrics?.gower?.[sweepTarget]?.mean ?? null,
        euclidean: metrics?.euclidean?.[sweepTarget]?.mean ?? null,
        cosine: metrics?.cosine?.[sweepTarget]?.mean ?? null,
      };
    });
  }, [syntheticData, sweepKey, sweepTarget]);

  // Panel 4A: MCAR Missingness chart rows
  const missingnessRows = useMemo(() => {
    const fracs = missingnessData?.fractions || {};
    return Object.keys(fracs)
      .sort((a, b) => parseFloat(a) - parseFloat(b))
      .map((fk) => {
        const m = fracs[fk]?.metrics || {};
        return {
          fraction: `${Math.round(parseFloat(fk) * 100)}%`,
          gower: m.gower?.loo_macro_p_at_5?.mean ?? null,
          euclidean_mode: m.euclidean_modeimpute?.loo_macro_p_at_5?.mean ?? null,
          cosine_mode: m.cosine_modeimpute?.loo_macro_p_at_5?.mean ?? null,
          euclidean_obs: m.euclidean_observed_only?.loo_macro_p_at_5?.mean ?? null,
          cosine_obs: m.cosine_observed_only?.loo_macro_p_at_5?.mean ?? null,
        };
      });
  }, [missingnessData]);

  // Panel 4B: Distance histogram rows
  const histogramData = useMemo(() => {
    const h = descriptive?.distance_histograms?.[histMetric];
    if (!h || !Array.isArray(h.bin_centers)) return { rows: [], meta: null };
    const rows = h.bin_centers.map((c, idx) => ({
      bin: Number(c.toFixed(2)),
      intra: h.intra_class_counts?.[idx] ?? 0,
      inter: h.inter_class_counts?.[idx] ?? 0,
    }));
    return {
      rows,
      meta: {
        intraMean: h.intra_mean,
        intraStd: h.intra_std,
        interMean: h.inter_mean,
        interStd: h.inter_std,
      },
    };
  }, [descriptive, histMetric]);

  // Panel 5: Real-Data Metric Performance Grouped Bar rows & equivalence
  const comparisonRows = useMemo(() => {
    const metrics = realData?.full_29_traits?.metrics || {};
    const extract = (key) => {
      const m = metrics[key];
      return {
        f1: m?.knn_cv?.macro_f1_mean ?? 0,
        p5: m?.loo_retrieval?.macro?.p_at_5 ?? 0,
        p10: m?.loo_retrieval?.macro?.p_at_10 ?? 0,
        ari: m?.clustering?.linkages?.average?.ari ?? 0,
        nmi: m?.clustering?.linkages?.average?.nmi ?? 0,
      };
    };
    const g = extract('gower');
    const e = extract('euclidean');
    const c = extract('cosine');
    return [
      { metric: 'kNN Macro-F1', gower: g.f1, euclidean: e.f1, cosine: c.f1 },
      { metric: 'LOO P@5', gower: g.p5, euclidean: e.p5, cosine: c.p5 },
      { metric: 'LOO P@10', gower: g.p10, euclidean: e.p10, cosine: c.p10 },
      { metric: 'ARI (Avg)', gower: g.ari, euclidean: e.ari, cosine: c.ari },
      { metric: 'NMI (Avg)', gower: g.nmi, euclidean: e.nmi, cosine: c.nmi },
    ];
  }, [realData]);

  // Panel 6: Cramers V top 10 & Prakriti Cohort counts
  const cramersRows = useMemo(() => {
    const arr = Array.isArray(descriptive?.cramers_v) ? descriptive.cramers_v : [];
    return arr.slice(0, 10).map((item) => ({
      trait: item.trait.length > 22 ? `${item.trait.slice(0, 20)}..` : item.trait,
      fullTrait: item.trait,
      v: Number((item.cramers_v || 0).toFixed(4)),
    }));
  }, [descriptive]);

  const cohortCounts = useMemo(() => {
    const records = realCases?.records || [];
    const counts = {};
    records.forEach((r) => {
      const lbl = r.dataset_label || 'Unknown';
      counts[lbl] = (counts[lbl] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([dosha, count]) => ({ dosha, count }))
      .sort((a, b) => b.count - a.count);
  }, [realCases]);

  const totalRealRecords = realCases?.records?.length ?? 0;
  const totalTraitsCount = realCases?.categorical_cols?.length ?? 0;

  return (
    <div className="space-y-6">
      {/* Compact ML Lab Header */}
      <section className="glass-panel rounded-2xl p-5 sm:p-6 hero-champagne-gradient border border-white/75 relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/75 border border-[#C3A989]/40 text-[11px] font-semibold tracking-wider uppercase text-[#827568]">
              <FlaskConical className="w-3.5 h-3.5 text-[#967D63]" />
              <span>ML Benchmark &amp; Validation Lab</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#40382F]">
              Distance Metric Benchmarking &amp; Clustering Evaluation
            </h1>
            <p className="text-sm text-[#827568]">
              Evaluating Gower, Euclidean, and Cosine distances across {totalRealRecords} cohort records ({totalTraitsCount} clinical attributes), MCAR query masking, and synthetic mixed-type stress sweeps.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <span className="px-3 py-1.5 rounded-xl bg-white/80 border border-white/80 text-xs font-medium text-[#40382F]">
              Real Cohort: <strong>{totalRealRecords}</strong> records
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-white/80 border border-white/80 text-xs font-medium text-[#40382F]">
              Attributes: <strong>{totalTraitsCount}</strong> traits
            </span>
          </div>
        </div>
      </section>

      {/* Lab Sub-Tab Bar */}
      <div className="glass-panel rounded-2xl p-2 flex flex-wrap items-center gap-1.5 border border-white/75">
        {LAB_SUBTABS.map((tab) => {
          const Icon = tab.icon;
          const active = labTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setLabTab(tab.id)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                active
                  ? 'bg-[#40382F] text-[#F3EADF] shadow-sm'
                  : 'text-[#6A5E52] hover:bg-white/60 hover:text-[#40382F]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Sub-Tab 1: Default Clean KPI Summary + 2-Column Visualization Grid */}
      {labTab === 'grid' && (
        <div className="space-y-6">
          {/* KPI Summary Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {kpiCards.map((card) => (
              <div
                key={card.key}
                className="paper-card rounded-2xl p-4 sm:p-5 border border-white/80 flex flex-col justify-between gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-semibold text-[#40382F]">{card.title}</h2>
                    <p className="text-[11px] text-[#827568] mt-0.5">{card.subtitle}</p>
                  </div>
                  {card.key === 'shuffled' ? (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        card.passed
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {card.passed ? 'Passed' : 'Control'}
                    </span>
                  ) : (
                    <span
                      className="w-2.5 h-2.5 rounded-full mt-1 shrink-0"
                      style={{ backgroundColor: METRIC_COLORS[card.key] || '#8E6F50' }}
                    />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-[#E8DED1]">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-[#827568]">
                      kNN Macro-F1
                    </div>
                    <div className="text-base font-bold text-[#40382F] tabular-nums">
                      {fmtPct(card.f1)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-[#827568]">
                      LOO P@5
                    </div>
                    <div className="text-base font-bold text-[#40382F] tabular-nums">
                      {fmtPct(card.p5)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-[#827568]">
                      ARI (Avg Link)
                    </div>
                    <div className="text-sm font-semibold text-[#40382F] tabular-nums">
                      {fmtNum(card.ari, 3)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-[#827568]">
                      NMI (Avg Link)
                    </div>
                    <div className="text-sm font-semibold text-[#40382F] tabular-nums">
                      {fmtNum(card.nmi, 3)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 2-Column Responsive Visualization Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Visualization 1: 2D MDS Cluster Projections */}
            <div className="glass-panel rounded-2xl p-5 border border-white/80 flex flex-col gap-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-base font-serif font-bold text-[#40382F]">
                    2D MDS Cluster Projection
                  </h3>
                  <p className="text-xs text-[#827568]">
                    Classical multidimensional scaling projection across Dosha cohorts (visual aid only).
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <select
                    aria-label="MDS Dataset"
                    value={mdsDataset}
                    onChange={(e) => setMdsDataset(e.target.value)}
                    className="rounded-lg bg-white/80 border border-[#D8CBBC] px-2.5 py-1 text-xs text-[#40382F]"
                  >
                    <option value="real">Real Data</option>
                    <option value="synthetic">Simulated Mixed</option>
                  </select>
                  <select
                    aria-label="MDS Metric"
                    value={mdsMetric}
                    onChange={(e) => setMdsMetric(e.target.value)}
                    className="rounded-lg bg-white/80 border border-[#D8CBBC] px-2.5 py-1 text-xs text-[#40382F]"
                  >
                    <option value="gower">Gower</option>
                    <option value="euclidean">Euclidean</option>
                    <option value="cosine">Cosine</option>
                  </select>
                </div>
              </div>

              {mdsDataset === 'synthetic' && (
                <div className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 w-fit">
                  SIMULATED MIXED-TYPE EMBEDDING
                </div>
              )}

              <div className="h-[290px] w-full">
                <ResponsiveContainer width="100%" height={290}>
                  <ScatterChart margin={{ top: 10, right: 16, bottom: 10, left: -12 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2D6C7" />
                    <XAxis
                      type="number"
                      dataKey="x"
                      name="MDS 1"
                      tick={{ fontSize: 11, fill: '#827568' }}
                    />
                    <YAxis
                      type="number"
                      dataKey="y"
                      name="MDS 2"
                      tick={{ fontSize: 11, fill: '#827568' }}
                    />
                    <ZAxis range={[28, 28]} />
                    <Tooltip
                      contentStyle={CHART_TOOLTIP_STYLE}
                      cursor={{ strokeDasharray: '3 3' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    {mdsByClass.map(([cls, pts]) => (
                      <Scatter
                        key={cls}
                        name={cls}
                        data={pts}
                        fill={DOSHA_PALETTE[cls] || '#8E6F50'}
                        fillOpacity={0.75}
                      />
                    ))}
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Visualization 2: Sample Pairwise Distance Heatmap */}
            <div className="glass-panel rounded-2xl p-5 border border-white/80 flex flex-col gap-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-base font-serif font-bold text-[#40382F]">
                    {heatmapData.picked.length}×{heatmapData.picked.length} Pairwise Distance Heatmap
                  </h3>
                  <p className="text-xs text-[#827568]">
                    Stratified patient pairs normalized to show intra-class tight blocks vs cross-class distance.
                  </p>
                </div>
                <select
                  aria-label="Heatmap Metric"
                  value={heatMetric}
                  onChange={(e) => setHeatMetric(e.target.value)}
                  className="rounded-lg bg-white/80 border border-[#D8CBBC] px-2.5 py-1 text-xs text-[#40382F]"
                >
                  <option value="gower">Gower</option>
                  <option value="euclidean">Euclidean</option>
                  <option value="cosine">Cosine</option>
                </select>
              </div>

              <div className="flex items-center justify-between text-[11px] text-[#827568] bg-white/60 rounded-lg px-3 py-1.5 border border-[#E8DED1]">
                {hoveredCell ? (
                  <span>
                    Record <strong>#{hoveredCell.row.recordIdx}</strong> ({hoveredCell.row.label}) vs{' '}
                    <strong>#{hoveredCell.col.recordIdx}</strong> ({hoveredCell.col.label}) — Distance:{' '}
                    <strong className="text-[#40382F]">{fmtNum(hoveredCell.raw, 3)}</strong>
                  </span>
                ) : (
                  <span>Hover over any matrix cell to inspect exact pairwise distance and Dosha classes.</span>
                )}
              </div>

              <div className="flex flex-col items-center justify-center flex-1">
                {heatmapData.rows.length > 0 ? (
                  <div
                    className="grid gap-0.5 p-2 rounded-xl bg-white/65 border border-[#D8CBBC]"
                    style={{
                      gridTemplateColumns: `repeat(${heatmapData.picked.length}, minmax(12px, 16px))`,
                    }}
                  >
                    {heatmapData.rows.flatMap((rowCells, rIdx) =>
                      rowCells.map((cell, cIdx) => {
                        const alpha = 0.08 + cell.norm * 0.85;
                        return (
                          <div
                            key={`${rIdx}-${cIdx}`}
                            onMouseEnter={() => setHoveredCell(cell)}
                            onMouseLeave={() => setHoveredCell(null)}
                            className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-[2px] cursor-crosshair transition-transform hover:scale-125 hover:z-10"
                            style={{
                              backgroundColor: `rgba(142, 111, 80, ${alpha.toFixed(2)})`,
                            }}
                            title={`#${cell.row.recordIdx} vs #${cell.col.recordIdx}: ${fmtNum(cell.raw, 3)}`}
                          />
                        );
                      })
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-[#827568] py-16">Heatmap matrix unavailable.</div>
                )}

                <div className="flex items-center gap-3 mt-3 text-[11px] text-[#827568]">
                  <span>0.0 (Identical)</span>
                  <div className="h-2.5 w-32 rounded-full bg-gradient-to-r from-[#F5EFE8] via-[#C3A989] to-[#7A5C40] border border-[#D8CBBC]" />
                  <span>{heatMetric === 'euclidean' ? 'High (Z-L2)' : 'Max Dissimilarity'}</span>
                </div>
              </div>
            </div>

            {/* Visualization 3: Synthetic OFAT Sweeps */}
            <div className="glass-panel rounded-2xl p-5 border border-white/80 flex flex-col gap-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-serif font-bold text-[#40382F]">
                      Mixed-Type Stress Sweeps
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                      SIMULATED
                    </span>
                  </div>
                  <p className="text-xs text-[#827568]">
                    One-factor-at-a-time metric comparison over generated mixed categorical and numeric cohorts.
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <select
                    aria-label="Sweep Axis"
                    value={sweepKey}
                    onChange={(e) => setSweepKey(e.target.value)}
                    className="rounded-lg bg-white/80 border border-[#D8CBBC] px-2 py-1 text-xs text-[#40382F]"
                  >
                    {Object.entries(SWEEP_META).map(([k, meta]) => (
                      <option key={k} value={k}>
                        {meta.label}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label="Sweep Target Metric"
                    value={sweepTarget}
                    onChange={(e) => setSweepTarget(e.target.value)}
                    className="rounded-lg bg-white/80 border border-[#D8CBBC] px-2 py-1 text-xs text-[#40382F]"
                  >
                    <option value="knn_macro_f1">kNN Macro-F1</option>
                    <option value="loo_macro_p_at_5">LOO P@5</option>
                  </select>
                </div>
              </div>

              <div className="h-[290px] w-full">
                <ResponsiveContainer width="100%" height={290}>
                  <LineChart data={sweepChartRows} margin={{ top: 10, right: 16, bottom: 10, left: -12 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2D6C7" />
                    <XAxis dataKey="param" tick={{ fontSize: 11, fill: '#827568' }} />
                    <YAxis domain={[0, 1]} tick={{ fontSize: 11, fill: '#827568' }} />
                    <Tooltip
                      contentStyle={CHART_TOOLTIP_STYLE}
                      formatter={(val) => fmtPct(val)}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Line
                      type="monotone"
                      dataKey="gower"
                      name="Gower"
                      stroke={METRIC_COLORS.gower}
                      strokeWidth={2.5}
                      dot={{ r: 3.5 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="euclidean"
                      name="Euclidean"
                      stroke={METRIC_COLORS.euclidean}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="cosine"
                      name="Cosine"
                      stroke={METRIC_COLORS.cosine}
                      strokeWidth={2}
                      strokeDasharray="4 3"
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Visualization 4: MCAR Missingness & Intra/Inter Distance Histograms */}
            <div className="glass-panel rounded-2xl p-5 border border-white/80 flex flex-col gap-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-base font-serif font-bold text-[#40382F]">
                    {panel4Mode === 'missingness'
                      ? 'MCAR Missingness Robustness (LOO P@5)'
                      : 'Intra-Class vs Inter-Class Distance Spread'}
                  </h3>
                  <p className="text-xs text-[#827568]">
                    {panel4Mode === 'missingness'
                      ? 'Retrieval precision under random query trait masking across Gower and imputation baselines.'
                      : 'Distribution separation between same-class pairs and different-class pairs on real records.'}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPanel4Mode('missingness')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                      panel4Mode === 'missingness'
                        ? 'bg-[#40382F] text-[#F3EADF]'
                        : 'bg-white/75 text-[#6A5E52] border border-[#D8CBBC]'
                    }`}
                  >
                    MCAR Masking
                  </button>
                  <button
                    type="button"
                    onClick={() => setPanel4Mode('histogram')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                      panel4Mode === 'histogram'
                        ? 'bg-[#40382F] text-[#F3EADF]'
                        : 'bg-white/75 text-[#6A5E52] border border-[#D8CBBC]'
                    }`}
                  >
                    Histograms
                  </button>
                  {panel4Mode === 'histogram' && (
                    <select
                      aria-label="Histogram Metric"
                      value={histMetric}
                      onChange={(e) => setHistMetric(e.target.value)}
                      className="rounded-lg bg-white/80 border border-[#D8CBBC] px-2 py-1 text-xs text-[#40382F]"
                    >
                      <option value="gower">Gower</option>
                      <option value="euclidean">Euclidean</option>
                      <option value="cosine">Cosine</option>
                    </select>
                  )}
                </div>
              </div>

              <div className="h-[290px] w-full">
                {panel4Mode === 'missingness' ? (
                  <ResponsiveContainer width="100%" height={290}>
                    <LineChart data={missingnessRows} margin={{ top: 10, right: 16, bottom: 10, left: -12 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2D6C7" />
                      <XAxis dataKey="fraction" tick={{ fontSize: 11, fill: '#827568' }} />
                      <YAxis domain={[0.4, 1]} tick={{ fontSize: 11, fill: '#827568' }} />
                      <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v) => fmtPct(v)} />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      <Line
                        type="monotone"
                        dataKey="gower"
                        name="Gower (Native)"
                        stroke={METRIC_COLORS.gower}
                        strokeWidth={2.5}
                      />
                      <Line
                        type="monotone"
                        dataKey="euclidean_mode"
                        name="Euclidean (Mode)"
                        stroke={METRIC_COLORS.euclidean}
                        strokeWidth={2}
                      />
                      <Line
                        type="monotone"
                        dataKey="cosine_mode"
                        name="Cosine (Mode)"
                        stroke={METRIC_COLORS.cosine}
                        strokeWidth={2}
                      />
                      <Line
                        type="monotone"
                        dataKey="euclidean_obs"
                        name="Euclidean (Obs)"
                        stroke={METRIC_COLORS.euclidean_observed_only}
                        strokeDasharray="4 3"
                        strokeWidth={1.8}
                      />
                      <Line
                        type="monotone"
                        dataKey="cosine_obs"
                        name="Cosine (Obs)"
                        stroke={METRIC_COLORS.cosine_observed_only}
                        strokeDasharray="4 3"
                        strokeWidth={1.8}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <ResponsiveContainer width="100%" height={290}>
                    <BarChart data={histogramData.rows} margin={{ top: 10, right: 16, bottom: 10, left: -12 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2D6C7" />
                      <XAxis dataKey="bin" tick={{ fontSize: 11, fill: '#827568' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#827568' }} />
                      <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      <Bar dataKey="intra" name="Intra-Class Pairs" fill="#4A8268" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="inter" name="Inter-Class Pairs" fill="#C3A989" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Visualization 5: Metric Comparison & Rank Equivalence */}
            <div className="glass-panel rounded-2xl p-5 border border-white/80 flex flex-col gap-3">
              <div>
                <h3 className="text-base font-serif font-bold text-[#40382F]">
                  Three-Metric Performance &amp; Rank Equivalence
                </h3>
                <p className="text-xs text-[#827568]">
                  Full-cohort retrieval, classification, and clustering alignment on real discrete records.
                </p>
              </div>

              <div className="h-[245px] w-full">
                <ResponsiveContainer width="100%" height={245}>
                  <BarChart data={comparisonRows} margin={{ top: 10, right: 16, bottom: 6, left: -14 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2D6C7" />
                    <XAxis dataKey="metric" tick={{ fontSize: 11, fill: '#40382F' }} />
                    <YAxis domain={[0, 1]} tick={{ fontSize: 11, fill: '#827568' }} />
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v) => fmtNum(v, 3)} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="gower" name="Gower" fill={METRIC_COLORS.gower} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="euclidean" name="Euclidean" fill={METRIC_COLORS.euclidean} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="cosine" name="Cosine" fill={METRIC_COLORS.cosine} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {Array.isArray(realData?.equivalence) && realData.equivalence.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-[#E8DED1]">
                  {realData.equivalence.slice(0, 3).map((eq, i) => (
                    <div
                      key={i}
                      className="rounded-xl bg-white/65 px-3 py-2 border border-white/80 text-[11px]"
                    >
                      <div className="font-semibold text-[#40382F] capitalize">
                        {eq.metric_a} vs {eq.metric_b}
                      </div>
                      <div className="text-[#827568] mt-0.5">
                        Spearman ρ: <strong className="text-[#40382F]">{fmtNum(eq.spearman_rho, 3)}</strong> | Top-5 Overlap:{' '}
                        <strong className="text-[#40382F]">{fmtPct(eq.mean_top5_overlap)}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Visualization 6: Feature Importance (Cramers V) & Cohort Distribution */}
            <div className="glass-panel rounded-2xl p-5 border border-white/80 flex flex-col gap-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-base font-serif font-bold text-[#40382F]">
                    {panel6Mode === 'cramers'
                      ? 'Top Trait Associations (Cramér’s V)'
                      : 'Prakriti Dataset Class Distribution'}
                  </h3>
                  <p className="text-xs text-[#827568]">
                    {panel6Mode === 'cramers'
                      ? 'Descriptive bivariate association per trait (not used to weight distance calculations).'
                      : 'Record counts grouped by dataset-provided Dosha label across full cohort.'}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPanel6Mode('cramers')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                      panel6Mode === 'cramers'
                        ? 'bg-[#40382F] text-[#F3EADF]'
                        : 'bg-white/75 text-[#6A5E52] border border-[#D8CBBC]'
                    }`}
                  >
                    Cramér’s V
                  </button>
                  <button
                    type="button"
                    onClick={() => setPanel6Mode('cohort')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                      panel6Mode === 'cohort'
                        ? 'bg-[#40382F] text-[#F3EADF]'
                        : 'bg-white/75 text-[#6A5E52] border border-[#D8CBBC]'
                    }`}
                  >
                    Class Balance
                  </button>
                </div>
              </div>

              <div className="h-[290px] w-full">
                {panel6Mode === 'cramers' ? (
                  <ResponsiveContainer width="100%" height={290}>
                    <BarChart
                      data={cramersRows}
                      layout="vertical"
                      margin={{ top: 6, right: 18, bottom: 6, left: 32 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2D6C7" />
                      <XAxis type="number" domain={[0, 1]} tick={{ fontSize: 11, fill: '#827568' }} />
                      <YAxis
                        type="category"
                        dataKey="trait"
                        width={118}
                        tick={{ fontSize: 10, fill: '#40382F' }}
                      />
                      <Tooltip
                        contentStyle={CHART_TOOLTIP_STYLE}
                        formatter={(val) => [`${val}`, 'Cramér’s V']}
                      />
                      <Bar dataKey="v" name="Cramér's V" fill="#967D63" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <ResponsiveContainer width="100%" height={290}>
                    <BarChart data={cohortCounts} margin={{ top: 10, right: 16, bottom: 10, left: -12 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2D6C7" />
                      <XAxis dataKey="dosha" tick={{ fontSize: 11, fill: '#40382F' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#827568' }} />
                      <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                      <Bar dataKey="count" name="Patient Records" radius={[4, 4, 0, 0]}>
                        {cohortCounts.map((entry) => (
                          <Cell
                            key={entry.dosha}
                            fill={DOSHA_PALETTE[entry.dosha] || '#8E6F50'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* Inline Research Notice */}
          <div className="rounded-xl bg-[#F3EADF]/80 border border-[#D8CBBC] px-4 py-3 flex items-center gap-2.5 text-xs text-[#6A5E52]">
            <AlertTriangle className="w-4 h-4 text-[#967D63] shrink-0" />
            <span>
              Researched on the Tridosha dataset.
            </span>
          </div>
        </div>
      )}

      {/* Embedded Existing Deep-Dive Sub-Views */}
      {labTab === 'results' && <ResultsPage realData={realData} syntheticData={syntheticData} />}
      {labTab === 'comparison' && (
        <MetricComparisonPage
          realData={realData}
          syntheticData={syntheticData}
          missingnessData={missingnessData}
          scalingAblation={scalingAblation}
        />
      )}
      {labTab === 'clustering' && (
        <PatientClusteringPage
          clusteringsData={clusteringsData}
          embeddingsData={embeddingsData}
          realCases={realCases}
        />
      )}
      {labTab === 'attributes' && (
        <div className="space-y-8">
          <DatasetAnalysisPage descriptive={descriptive} realData={realData} />
          <PatientAttributesPage
            realData={realData}
            realCases={realCases}
            descriptive={descriptive}
          />
        </div>
      )}
      {labTab === 'validation' && (
        <DiagnosticValidationPage realData={realData} descriptive={descriptive} />
      )}
      {labTab === 'protocol' && (
        <div className="space-y-8">
          <MethodPage realData={realData} syntheticData={syntheticData} />
          <ReportsExportPage
            realData={realData}
            syntheticData={syntheticData}
            missingnessData={missingnessData}
          />
        </div>
      )}
    </div>
  );
}
