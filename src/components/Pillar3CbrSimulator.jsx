import React, { useMemo, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  HeartPulse,
  RotateCcw,
  Sparkles,
  Stethoscope,
  UserCheck,
} from 'lucide-react';
import { DOSHA_COLOR_MAP } from '../data/benchmarkData';
import { PARIKSHA_OPTIONS, PRESET_QUERY_PATIENTS } from '../data/clinicalCohort';
import { retrieveTopKPatients } from '../utils/distanceEngine';

const EDITABLE_PARIKSHA_KEYS = [
  { key: 'Nadi_Type', label: 'Nadi Type (Pulse Waveform)' },
  { key: 'Agni_Grade', label: 'Agni Grade (Digestive Fire)' },
  { key: 'Koshtha', label: 'Koshtha (Bowel Motility)' },
  { key: 'Skin_Texture', label: 'Skin Texture (Twak)' },
  { key: 'Bala_Strength', label: 'Bala (Strength / Endurance)' },
  { key: 'Body_Frame', label: 'Body Frame (Samhanana)' },
  { key: 'Sleep_Quality', label: 'Sleep Quality (Nidra)' },
  { key: 'Satva_Disposition', label: 'Satva Disposition' },
];

const METRIC_COLUMNS = [
  {
    key: 'hybrid',
    title: 'Proposed Hybrid',
    subtitle: 'α·D_Gower + (1-α)·D_Cos(Cat)',
    accent: '#8B5CF6',
    border: 'border-violet-500/40',
    badge: 'RECOMMENDED CBR KERNEL',
  },
  {
    key: 'gower',
    title: 'Weighted Gower',
    subtitle: 'Vaidya MI² Native Mixed',
    accent: '#10B981',
    border: 'border-emerald-500/40',
    badge: 'BEST GEOMETRIC COHESION',
  },
  {
    key: 'euclidean',
    title: 'Euclidean (OHE + Z)',
    subtitle: 'Z-Score Vitals + OHE Traits',
    accent: '#06B6D4',
    border: 'border-cyan-500/40',
    badge: 'SENSITIVE TO AGE / SCALE',
  },
  {
    key: 'cosine',
    title: 'Cosine (OHE Angular)',
    subtitle: '1 − cos(θ) on OHE Vector',
    accent: '#F59E0B',
    border: 'border-amber-500/40',
    badge: 'SCALE-INVARIANT ANGULAR',
  },
];

export default function Pillar3CbrSimulator({ alpha, setAlpha }) {
  const [selectedPresetId, setSelectedPresetId] = useState(PRESET_QUERY_PATIENTS[0].id);
  const [queryPatient, setQueryPatient] = useState({ ...PRESET_QUERY_PATIENTS[0] });

  const handleSelectPreset = (preset) => {
    setSelectedPresetId(preset.id);
    setQueryPatient({ ...preset });
  };

  const updateField = (key, val) => {
    setQueryPatient((prev) => ({
      ...prev,
      [key]: val,
    }));
  };

  const cbrOutput = useMemo(
    () => retrieveTopKPatients(queryPatient, alpha, 5),
    [queryPatient, alpha]
  );

  const expectedColor = DOSHA_COLOR_MAP[cbrOutput.expectedDosha] || '#06B6D4';

  return (
    <div className="space-y-6">
      {/* Top Preset Strip & Live Query Patient Telemetry */}
      <div className="foundry-card p-5">
        <div className="flex flex-col justify-between gap-3 border-b border-[#1F2937] pb-4 lg:flex-row lg:items-center">
          <div>
            <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-violet-400">
              PILLAR 3 // LIVE CASE-BASED REASONING (CBR) PATIENT RETRIEVAL SIMULATOR
            </span>
            <h2 className="mt-0.5 text-base font-semibold text-white">
              Real-Time Top-5 Historical Case Retrieval Across All 4 Distance Kernels
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg border border-violet-500/30 bg-[#090D16] px-3 py-1.5 font-mono text-[11px]">
              <span className="text-slate-400">Hybrid α:</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={alpha}
                onChange={(e) => setAlpha(Number(e.target.value))}
                className="foundry-slider w-24"
              />
              <span className="font-bold text-violet-300">{alpha.toFixed(2)}</span>
            </div>

            <button
              type="button"
              onClick={() => {
                const preset = PRESET_QUERY_PATIENTS.find((p) => p.id === selectedPresetId);
                if (preset) handleSelectPreset(preset);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#1F2937] bg-[#0B111E] px-3 py-1.5 font-mono text-[11px] text-slate-300 transition hover:border-cyan-500/50 hover:text-cyan-200"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset Case
            </button>
          </div>
        </div>

        {/* 6 Preset Query Buttons */}
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {PRESET_QUERY_PATIENTS.map((preset) => {
            const active = selectedPresetId === preset.id;
            const c = DOSHA_COLOR_MAP[preset.expectedDosha];
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                className={`rounded-lg border p-3 text-left transition ${
                  active
                    ? 'border-cyan-400/60 bg-cyan-500/10'
                    : 'border-[#1F2937] bg-[#090D16] hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px] font-semibold text-slate-100">
                    {preset.id}
                  </span>
                  <span
                    className="rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold"
                    style={{ backgroundColor: `${c}20`, color: c }}
                  >
                    {preset.expectedDosha}
                  </span>
                </div>
                <div className="mt-1 text-xs font-medium text-slate-200">
                  {preset.label.split('— ')[1]}
                </div>
                <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-500">
                  {preset.summary}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Layout: Query Editor + 4-Metric Side-by-Side Top-5 Retrieval */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        {/* Left: Query Patient Vitals & Pariksha Customizer */}
        <div className="foundry-card p-5 xl:col-span-4">
          <div className="flex items-center justify-between border-b border-[#1F2937] pb-3">
            <div className="flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-cyan-400" />
              <h3 className="text-sm font-semibold text-white">Query Patient Profile</h3>
            </div>
            <span
              className="rounded border px-2 py-0.5 font-mono text-[10px] font-semibold"
              style={{
                borderColor: `${expectedColor}60`,
                backgroundColor: `${expectedColor}18`,
                color: expectedColor,
              }}
            >
              Target: {cbrOutput.expectedDosha}
            </span>
          </div>

          {/* 4 Continuous Numerical Vitals */}
          <div className="mt-4 space-y-3.5">
            <div className="flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
              <HeartPulse className="h-3.5 w-3.5" />
              Continuous Clinical Vitals (X_num)
            </div>

            {[
              {
                key: 'Age_Vaya',
                label: 'Age_Vaya (yrs)',
                min: 18,
                max: 65,
                step: 1,
                unit: 'yrs',
                note: 'w = 0.01 floor',
              },
              {
                key: 'BMI',
                label: 'BMI',
                min: 16.5,
                max: 34.5,
                step: 0.1,
                unit: 'kg/m²',
                note: 'High MI',
              },
              {
                key: 'Systolic_BP',
                label: 'Systolic_BP',
                min: 98,
                max: 155,
                step: 1,
                unit: 'mmHg',
                note: 'Hemodynamic',
              },
              {
                key: 'Pulse_Nadi_Rate',
                label: 'Pulse_Nadi_Rate',
                min: 56,
                max: 94,
                step: 1,
                unit: 'bpm',
                note: 'Nadi Rate',
              },
            ].map((vital) => (
              <div key={vital.key} className="space-y-1">
                <div className="flex items-center justify-between font-mono text-xs">
                  <span className="text-slate-300">
                    {vital.label}{' '}
                    <span
                      className={`text-[10px] ${
                        vital.key === 'Age_Vaya' ? 'text-rose-400' : 'text-slate-500'
                      }`}
                    >
                      ({vital.note})
                    </span>
                  </span>
                  <span className="font-bold text-cyan-300">
                    {queryPatient[vital.key]} {vital.unit}
                  </span>
                </div>
                <input
                  type="range"
                  min={vital.min}
                  max={vital.max}
                  step={vital.step}
                  value={queryPatient[vital.key]}
                  onChange={(e) => updateField(vital.key, Number(e.target.value))}
                  className="foundry-slider w-full"
                />
              </div>
            ))}
          </div>

          {/* 8 Primary Categorical/Ordinal Pariksha Attributes */}
          <div className="mt-5 space-y-3 border-t border-[#1F2937] pt-4">
            <div className="flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-cyan-400">
              <Activity className="h-3.5 w-3.5" />
              Primary Pariksha Traits (X_cat)
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              {EDITABLE_PARIKSHA_KEYS.map((field) => (
                <label key={field.key} className="block space-y-1">
                  <span className="block font-mono text-[10px] text-slate-400">
                    {field.label}
                  </span>
                  <select
                    value={queryPatient[field.key]}
                    onChange={(e) => updateField(field.key, e.target.value)}
                    className="w-full rounded-md border border-[#1F2937] bg-[#090D16] px-2.5 py-1.5 font-mono text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
                  >
                    {PARIKSHA_OPTIONS[field.key].map((opt) => (
                      <option key={opt} value={opt}>
                        {opt.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-cyan-500/25 bg-cyan-500/[0.06] p-3 text-[11px] text-slate-300">
            <strong className="font-mono text-cyan-300">Try the Age_Vaya Stress Test:</strong>{' '}
            Slide <code className="font-mono text-rose-300">Age_Vaya</code> from 18 → 65 yrs.
            Notice how <strong>Euclidean (OHE+Z)</strong> shifts its neighbor distances sharply
            while <strong>Weighted Gower</strong> and <strong>Proposed Hybrid</strong> stay
            rock-steady due to <code className="font-mono">w_Age = 0.01</code>.
          </div>
        </div>

        {/* Right: 4-Metric Side-by-Side Top-5 Nearest Historical Patients */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:col-span-8">
          {METRIC_COLUMNS.map((col) => {
            const matches = cbrOutput.topK[col.key];
            const p5 = cbrOutput.precisionAt5[col.key];
            const meanDist = (
              matches.reduce((acc, r) => acc + r.distance, 0) / matches.length
            ).toFixed(4);

            return (
              <div
                key={col.key}
                className={`foundry-card flex flex-col border ${col.border} p-4`}
              >
                {/* Metric Card Header */}
                <div className="flex items-start justify-between gap-2 border-b border-[#1F2937] pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: col.accent }}
                      />
                      <h3 className="text-sm font-bold text-white">{col.title}</h3>
                    </div>
                    <p className="mt-0.5 font-mono text-[10px] text-slate-400">
                      {col.subtitle}
                    </p>
                  </div>

                  <div className="text-right font-mono">
                    <div
                      className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] font-bold ${
                        p5 === 100
                          ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                          : 'border-amber-500/40 bg-amber-500/15 text-amber-300'
                      }`}
                    >
                      {p5 === 100 ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <Sparkles className="h-3 w-3" />
                      )}
                      P@5: {p5.toFixed(0)}%
                    </div>
                    <div className="mt-1 text-[10px] text-slate-500">
                      Mean D_ij: {meanDist}
                    </div>
                  </div>
                </div>

                {/* Top-5 Ranked Patients */}
                <div className="mt-3 space-y-2.5">
                  {matches.map((item) => {
                    const p = item.patient;
                    const pColor = DOSHA_COLOR_MAP[p.dosha];
                    const concordant = p.dosha === cbrOutput.expectedDosha;

                    return (
                      <div
                        key={p.id}
                        className="rounded-lg border border-[#1F2937] bg-[#090D16] p-2.5 transition hover:border-slate-600"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="flex h-5 w-5 items-center justify-center rounded bg-[#111827] font-mono text-[10px] font-bold text-slate-300 ring-1 ring-[#1F2937]">
                              #{item.rank}
                            </span>
                            <span className="font-mono text-xs font-semibold text-white">
                              {p.id}
                            </span>
                            <span
                              className="rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold"
                              style={{
                                backgroundColor: `${pColor}22`,
                                color: pColor,
                              }}
                            >
                              {p.dosha}
                            </span>
                          </div>

                          <div className="text-right font-mono">
                            <span className="text-xs font-bold text-cyan-300">
                              D = {item.distance.toFixed(4)}
                            </span>
                            <span className="ml-1.5 text-[10px] text-slate-500">
                              ({item.similarityPct}%)
                            </span>
                          </div>
                        </div>

                        {/* Dissimilarity progress bar (shorter = closer) */}
                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#111827]">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.max(6, Math.min(100, item.similarityPct))}%`,
                              backgroundColor: col.accent,
                            }}
                          />
                        </div>

                        {/* Clinical Metadata & Matching Traits */}
                        <div className="mt-2 flex flex-wrap items-center justify-between gap-1 font-mono text-[10px] text-slate-400">
                          <span>{p.namasteCode}</span>
                          <span>
                            Age {p.Age_Vaya} · BMI {p.BMI} ({item.bmiDelta >= 0 ? '+' : ''}
                            {item.bmiDelta}) · HR {p.Pulse_Nadi_Rate}
                          </span>
                        </div>

                        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-1 border-t border-[#1F2937]/70 pt-1.5">
                          <div className="flex flex-wrap gap-1">
                            {item.matchedTraits.slice(0, 4).map((t) => (
                              <span
                                key={t}
                                className="rounded bg-[#111827] px-1.5 py-0.5 font-mono text-[9px] text-slate-300 ring-1 ring-[#1F2937]"
                              >
                                {t.replace(/_/g, ' ')}
                              </span>
                            ))}
                            {item.matchedCount > 4 && (
                              <span className="font-mono text-[9px] text-cyan-400">
                                +{item.matchedCount - 4} more ({item.matchedCount}/{item.totalTraits})
                              </span>
                            )}
                          </div>

                          <span
                            className={`inline-flex items-center gap-0.5 font-mono text-[9px] font-semibold ${
                              concordant ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            <UserCheck className="h-3 w-3" />
                            {concordant ? 'MATCH' : 'DIFF'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
