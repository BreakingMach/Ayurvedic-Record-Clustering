import React, { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertTriangle,
  Database,
  Filter,
  Search,
  Sigma,
  SlidersHorizontal,
} from 'lucide-react';
import { CLINICAL_SCHEMA, TRIDOSHA_CLASSES } from '../data/benchmarkData';

export default function Pillar1SchemaExplorer() {
  const [modalityFilter, setModalityFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [chartMode, setChartMode] = useState('weighted'); // 'weighted' | 'rawMI'
  const [showAllInChart, setShowAllInChart] = useState(false);

  const chartData = useMemo(() => {
    const sorted = [...CLINICAL_SCHEMA].sort((a, b) =>
      chartMode === 'weighted' ? b.weight - a.weight : b.rawMI - a.rawMI
    );
    if (showAllInChart) return sorted;
    const top13 = sorted.filter((f) => !f.suppressed).slice(0, 13);
    const ageFeature = sorted.find((f) => f.name === 'Age_Vaya');
    return ageFeature ? [...top13, ageFeature] : top13;
  }, [chartMode, showAllInChart]);

  const filteredSchema = useMemo(() => {
    return CLINICAL_SCHEMA.filter((item) => {
      const matchesModality =
        modalityFilter === 'ALL' ||
        (modalityFilter === 'NUM' && item.modality === 'Numerical') ||
        (modalityFilter === 'CAT' && item.modality !== 'Numerical');
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.parikshaGroup.toLowerCase().includes(q) ||
        item.domain.toLowerCase().includes(q) ||
        item.clinicalRole.toLowerCase().includes(q);
      return matchesModality && matchesSearch;
    });
  }, [modalityFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Row 1: Tridosha Cohort Distribution + Vaidya MI^2 Weighting Equation */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* 6-Class Tridosha Distribution */}
        <div className="foundry-card p-5 lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1F2937] pb-3">
            <div>
              <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-cyan-400">
                PILLAR 1 // PRACTITIONER GROUND-TRUTH DISTRIBUTION
              </span>
              <h2 className="mt-0.5 text-base font-semibold text-white">
                6-Class Tridosha Imbalance Across N = 1,200 Consolidated Records
              </h2>
            </div>
            <span className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-[11px] text-amber-300">
              Imbalance Ratio 13:1
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {TRIDOSHA_CLASSES.map((cls) => (
              <div key={cls.id} className="space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: cls.color }}
                    />
                    <span className="font-semibold text-slate-100">{cls.label}</span>
                    <span className="font-mono text-[11px] text-slate-500">
                      ({cls.sanskrit})
                    </span>
                    <span className="hidden rounded border border-[#1F2937] bg-[#0B111E] px-1.5 py-0.5 font-mono text-[10px] text-slate-400 sm:inline">
                      {cls.type}
                    </span>
                  </div>
                  <div className="font-mono text-xs text-slate-200">
                    <strong>{cls.count}</strong>{' '}
                    <span className="text-slate-500">({cls.sharePct.toFixed(1)}%)</span>
                  </div>
                </div>

                <div className="h-2 w-full overflow-hidden rounded-full bg-[#090D16] ring-1 ring-[#1F2937]">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${cls.sharePct}%`,
                      backgroundColor: cls.color,
                      boxShadow: `0 0 10px ${cls.color}80`,
                    }}
                  />
                </div>
                <p className="font-mono text-[10px] text-slate-500">{cls.dominantTraits}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Vaidya-Aligned MI^2 Feature Weighting Formula & Schema Summary */}
        <div className="foundry-card flex flex-col justify-between p-5 lg:col-span-5">
          <div>
            <div className="flex items-center justify-between border-b border-[#1F2937] pb-3">
              <div>
                <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-emerald-400">
                  VAIDYA-ALIGNED FEATURE WEIGHTING
                </span>
                <h2 className="mt-0.5 text-base font-semibold text-white">
                  Squared Mutual Information Amplification
                </h2>
              </div>
              <Sigma className="h-5 w-5 text-emerald-400" />
            </div>

            {/* Monospace Mathematical Formulation */}
            <div className="mt-4 rounded-lg border border-emerald-500/25 bg-[#090D16] p-4 font-mono">
              <div className="text-[10px] uppercase tracking-wider text-slate-500">
                OPTIMAL CLINICAL WEIGHT VECTOR w* ∈ Δ³³
              </div>
              <div className="mt-2 text-sm font-semibold text-emerald-300">
                w_k* = I(X_k ; y_Vaidya)² / Σ_m I(X_m ; y_Vaidya)²
              </div>
              <div className="mt-2 border-t border-[#1F2937] pt-2 text-[11px] text-slate-400">
                Demographic Noise Floor:{' '}
                <span className="font-semibold text-rose-400">w_Age_Vaya = 0.01</span>{' '}
                (pre-normalization)
              </div>
            </div>

            {/* Why this works */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-[#1F2937] bg-[#0B111E] p-3">
                <div className="font-mono text-[10px] text-cyan-400">
                  X_num · 4 CONTINUOUS
                </div>
                <div className="mt-1 font-mono text-lg font-bold text-white">12.1%</div>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  Age_Vaya, BMI, Systolic_BP, Pulse_Nadi_Rate
                </p>
              </div>
              <div className="rounded-lg border border-[#1F2937] bg-[#0B111E] p-3">
                <div className="font-mono text-[10px] text-violet-400">
                  X_cat · 29 PARIKSHA
                </div>
                <div className="mt-1 font-mono text-lg font-bold text-white">87.9%</div>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  Dashavidha &amp; Ashtavidha categorical/ordinal traits
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
            <div>
              <strong className="font-semibold text-rose-300">
                Age_Vaya Variance Suppression:
              </strong>{' '}
              In unweighted Gower/Euclidean spaces, uniform age spread (18–65 yrs) acts as
              orthogonal noise that fractures *Tridosha* groups. Flooring{' '}
              <code className="font-mono text-rose-300">w_Age = 0.01</code> and squaring MI
              concentrates similarity mass on <code className="font-mono">Nadi_Type</code>,{' '}
              <code className="font-mono">Agni_Grade</code>,{' '}
              <code className="font-mono">BMI</code>, and{' '}
              <code className="font-mono">Koshtha</code>.
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Horizontal Bar Chart of Mutual Information Weights */}
      <div className="foundry-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1F2937] pb-4">
          <div>
            <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-cyan-400">
              FEATURE IMPORTANCE TELEMETRY
            </span>
            <h2 className="mt-0.5 text-base font-semibold text-white">
              Vaidya-Aligned Mutual Information Weights (w_k*) vs Demographic Suppression
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-[#1F2937] bg-[#090D16] p-0.5 font-mono text-[11px]">
              <button
                type="button"
                onClick={() => setChartMode('weighted')}
                className={`rounded-md px-2.5 py-1 transition ${
                  chartMode === 'weighted'
                    ? 'bg-cyan-500/20 text-cyan-300'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Normalized w_k* (%)
              </button>
              <button
                type="button"
                onClick={() => setChartMode('rawMI')}
                className={`rounded-md px-2.5 py-1 transition ${
                  chartMode === 'rawMI'
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Raw MI I(X_k; y)
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowAllInChart((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#1F2937] bg-[#0B111E] px-3 py-1.5 font-mono text-[11px] text-slate-300 transition hover:border-cyan-500/50 hover:text-cyan-200"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              {showAllInChart ? 'Showing All 33 Attributes' : 'Top 13 + Age_Vaya Floor'}
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4 font-mono text-[11px] text-slate-400">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-cyan-400" />
            Categorical / Ordinal Pariksha (X_cat)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-emerald-400" />
            Continuous Clinical Vital (X_num)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-rose-500" />
            Suppressed Covariate (Age_Vaya floor w = 0.01)
          </span>
        </div>

        <div
          className="mt-4 w-full"
          style={{ height: showAllInChart ? 820 : 410 }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 6, right: 32, left: 24, bottom: 6 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" horizontal={false} />
              <XAxis
                type="number"
                stroke="#64748B"
                tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                tickFormatter={(v) =>
                  chartMode === 'weighted' ? `${v.toFixed(1)}%` : v.toFixed(2)
                }
              />
              <YAxis
                type="category"
                dataKey="name"
                width={150}
                stroke="#64748B"
                tick={{ fill: '#E2E8F0', fontSize: 11, fontFamily: 'JetBrains Mono' }}
              />
              <Tooltip
                cursor={{ fill: 'rgba(31, 41, 55, 0.45)' }}
                contentStyle={{
                  backgroundColor: '#090D16',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  fontFamily: 'JetBrains Mono',
                  fontSize: '11px',
                }}
                formatter={(value, _name, props) => {
                  const p = props.payload;
                  if (chartMode === 'weighted') {
                    return [
                      `${value}% (w_k* = ${p.weight.toFixed(4)} | Raw MI = ${p.rawMI.toFixed(3)})`,
                      p.suppressed ? 'Suppressed Floor' : p.modality,
                    ];
                  }
                  return [
                    `${Number(value).toFixed(3)} nats (w_k* = ${p.weightPct}%)`,
                    p.modality,
                  ];
                }}
              />
              <Bar
                dataKey={chartMode === 'weighted' ? 'weightPct' : 'rawMI'}
                radius={[0, 4, 4, 0]}
                barSize={showAllInChart ? 15 : 19}
              >
                {chartData.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={
                      entry.suppressed
                        ? '#F43F5E'
                        : entry.modality === 'Numerical'
                          ? '#10B981'
                          : '#06B6D4'
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 3: Interactive 33-Attribute Consolidated Mixed Schema Registry */}
      <div className="foundry-card p-5">
        <div className="flex flex-col justify-between gap-3 border-b border-[#1F2937] pb-4 md:flex-row md:items-center">
          <div className="flex items-center gap-2.5">
            <Database className="h-5 w-5 text-cyan-400" />
            <div>
              <h2 className="text-base font-semibold text-white">
                Consolidated Mixed Clinical Schema Registry (p = 33 Attributes)
              </h2>
              <p className="text-xs text-slate-400">
                4 Continuous Numerical Vitals + 29 Dashavidha &amp; Ashtavidha Pariksha Attributes
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter trait, Pariksha, domain..."
                className="w-56 rounded-lg border border-[#1F2937] bg-[#090D16] py-1.5 pl-8 pr-3 text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div className="inline-flex items-center rounded-lg border border-[#1F2937] bg-[#090D16] p-0.5 font-mono text-[11px]">
              <Filter className="mx-1.5 h-3 w-3 text-slate-500" />
              {[
                { key: 'ALL', label: 'All (33)' },
                { key: 'NUM', label: 'Vitals (4)' },
                { key: 'CAT', label: 'Pariksha (29)' },
              ].map((btn) => (
                <button
                  key={btn.key}
                  type="button"
                  onClick={() => setModalityFilter(btn.key)}
                  className={`rounded-md px-2.5 py-1 transition ${
                    modalityFilter === btn.key
                      ? 'bg-cyan-500/20 text-cyan-300'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-[#1F2937] font-mono text-[10px] uppercase tracking-wider text-slate-400">
                <th className="py-2.5 pr-3">Attribute</th>
                <th className="px-3 py-2.5">Modality</th>
                <th className="px-3 py-2.5">Pariksha Group</th>
                <th className="px-3 py-2.5">Clinical Domain / Levels</th>
                <th className="px-3 py-2.5 text-right">Raw MI</th>
                <th className="px-3 py-2.5 text-right">Weight w_k*</th>
                <th className="py-2.5 pl-3">Diagnostic Signal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F2937]/70">
              {filteredSchema.map((attr) => (
                <tr
                  key={attr.name}
                  className={`transition hover:bg-[#162033]/60 ${
                    attr.suppressed ? 'bg-rose-500/[0.04]' : ''
                  }`}
                >
                  <td className="py-2.5 pr-3 font-mono font-semibold text-slate-100">
                    {attr.name}
                    {attr.suppressed && (
                      <span className="ml-1.5 rounded border border-rose-500/40 bg-rose-500/15 px-1.5 py-0.5 text-[9px] text-rose-300">
                        FLOOR 0.01
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`inline-flex rounded border px-1.5 py-0.5 font-mono text-[10px] ${
                        attr.modality === 'Numerical'
                          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                          : attr.modality === 'Ordinal'
                            ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                            : 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300'
                      }`}
                    >
                      {attr.modality}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-slate-300">{attr.parikshaGroup}</td>
                  <td className="px-3 py-2.5 font-mono text-[11px] text-slate-400">
                    {attr.domain}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-slate-300">
                    {attr.rawMI.toFixed(3)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono font-semibold">
                    <span className={attr.suppressed ? 'text-rose-400' : 'text-cyan-300'}>
                      {attr.weight.toFixed(4)}
                    </span>
                    <span className="ml-1 text-[10px] text-slate-500">
                      ({attr.weightPct.toFixed(1)}%)
                    </span>
                  </td>
                  <td className="py-2.5 pl-3 text-[11px] text-slate-400">
                    {attr.clinicalRole}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
