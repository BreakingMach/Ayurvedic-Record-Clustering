import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  UserPlus,
  ArrowRight,
  Database,
  Eye,
  X,
  CheckCircle2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
} from 'lucide-react';
import { DOSHA_PALETTE } from '../data/literatureData';
import RetrievalPage from './RetrievalPage';
import DataPage from './DataPage';

const VITAL_BOUNDS = {
  age: { min: 18, max: 80, label: 'Age (yrs)' },
  bmi: { min: 14, max: 45, label: 'BMI (kg/m²)' },
  systolic_bp: { min: 80, max: 220, label: 'Systolic BP (mmHg)' },
  pulse: { min: 45, max: 130, label: 'Pulse (bpm)' },
};

const QUICK_DOSHA_PRESETS = {
  Vata: {
    'Body Size': 'Slim',
    'Appetite': 'Irregular',
    'Metabolism Type': 'fast',
    'Sleep Patterns': 'light',
    'Digestion Quality': 'weak',
    'General feel of skin': 'Dry and thin, cool to touch, rough',
  },
  Pitta: {
    'Body Size': 'Medium',
    'Appetite': 'Strong, unbearable',
    'Metabolism Type': 'fast',
    'Sleep Patterns': 'moderate',
    'Digestion Quality': 'strong',
    'General feel of skin': 'Smooth and warm, oily T-zone',
  },
  Kapha: {
    'Body Size': 'Large',
    'Appetite': 'Slow but steady',
    'Metabolism Type': 'slow',
    'Sleep Patterns': 'deep',
    'Digestion Quality': 'moderate',
    'General feel of skin': 'Thick and cool, moist and smooth',
  },
};

export default function PatientRegistryPage({
  realData,
  realCases,
  synthRecords,
  synthCsvSummary,
}) {
  const navigate = useNavigate();

  // Sub-views inside Tab 2: consolidated directory vs exact neighbor inspector vs cohort schema
  const [subView, setSubView] = useState('directory'); // 'directory' | 'inspector' | 'schema'
  const [sourceFilter, setSourceFilter] = useState('real'); // 'real' | 'synthetic' | 'custom'
  const [searchTerm, setSearchTerm] = useState('');
  const [doshaFilter, setDoshaFilter] = useState('ALL');
  const [agniFilter, setAgniFilter] = useState('ALL');
  const [digestionFilter, setDigestionFilter] = useState('ALL');
  const [pageIdx, setPageIdx] = useState(0);
  const [inspectedRow, setInspectedRow] = useState(null);

  // Add New Case Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [savedCases, setSavedCases] = useState([]);
  const [newCaseForm, setNewCaseForm] = useState({
    patientId: `PT-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    name: '',
    age: '36',
    gender: 'Female',
    chiefComplaint: '',
    bmi: '22.4',
    systolic_bp: '118',
    pulse: '72',
    traits: {},
  });

  // Load saved custom cases from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('ayur_workbench_cases');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setSavedCases(parsed);
      }
    } catch {
      // ignore storage access issues
    }
  }, [modalOpen]);

  const traitMeta = realCases?.traits || [];
  const catCols = realCases?.categorical_cols || [];

  // Normalized list of consolidated records across selected source
  const consolidatedRecords = useMemo(() => {
    if (sourceFilter === 'custom') {
      return savedCases.map((sc, i) => ({
        uid: sc.id || `custom-${i}`,
        caseId: sc.patientProfile?.patientId || sc.id,
        name: sc.name || sc.patientProfile?.name || 'Custom Patient',
        sourceLabel: sc.datasetMode === 'synthetic' ? 'Custom Mixed' : 'Custom Profile',
        datasetMode: sc.datasetMode || 'real',
        doshaLabel: sc.predictedClass || 'Unassigned',
        traitsMap: sc.traits || {},
        vitals: sc.vitals || null,
        patientProfile: sc.patientProfile || {
          patientId: sc.id,
          name: sc.name,
          age: sc.vitals?.age || '',
          gender: 'Unspecified',
          chiefComplaint: '',
        },
        isCustom: true,
        rawSaved: sc,
      }));
    }

    if (sourceFilter === 'synthetic' && synthRecords?.rows) {
      const sTraits = synthRecords.traits || [];
      const sClasses = synthRecords.classes || [];
      return synthRecords.rows.map((row, idx) => {
        const tMap = {};
        sTraits.forEach((t, tIdx) => {
          const valIdx = row.traits?.[tIdx];
          if (valIdx !== null && valIdx !== undefined) {
            tMap[t.name] = t.levels[valIdx];
          }
        });
        return {
          uid: `synth-${idx}`,
          caseId: `S-${String(idx + 1).padStart(4, '0')}`,
          name: `Simulated Case #${idx + 1}`,
          sourceLabel: 'SIMULATED',
          datasetMode: 'synthetic',
          doshaLabel: sClasses[row.latent_class] || 'Unknown',
          traitsMap: tMap,
          vitals: row.vitals
            ? {
                age: row.vitals[0],
                bmi: row.vitals[1],
                systolic_bp: row.vitals[2],
                pulse: row.vitals[3],
              }
            : null,
          recordIndex: idx,
          isCustom: false,
        };
      });
    }

    // Real verified cohort (1,200 rows)
    const records = realCases?.records || [];
    return records.map((rec) => {
      const tMap = {};
      catCols.forEach((col, cIdx) => {
        tMap[col] = rec.traits?.[cIdx] || '—';
      });
      return {
        uid: `real-${rec.row_idx}`,
        caseId: rec.case_id,
        name: `Cohort Record #${rec.row_idx + 1}`,
        sourceLabel: 'Real Cohort',
        datasetMode: 'real',
        doshaLabel: rec.dataset_label,
        traitsMap: tMap,
        vitals: null,
        recordIndex: rec.row_idx,
        isCustom: false,
      };
    });
  }, [sourceFilter, savedCases, synthRecords, realCases, catCols]);

  // Available Dosha, Agni & Digestion filter choices
  const doshaOptions = useMemo(
    () => Object.keys(realData?.provenance?.dataset_metadata?.class_counts || DOSHA_PALETTE),
    [realData]
  );

  // Filtered records
  const filteredRecords = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return consolidatedRecords.filter((rec) => {
      if (doshaFilter !== 'ALL' && rec.doshaLabel !== doshaFilter) return false;
      if (agniFilter !== 'ALL' && rec.traitsMap['Metabolism Type'] !== agniFilter) return false;
      if (digestionFilter !== 'ALL' && rec.traitsMap['Digestion Quality'] !== digestionFilter) {
        return false;
      }
      if (!q) return true;
      return (
        rec.caseId?.toLowerCase().includes(q) ||
        rec.name?.toLowerCase().includes(q) ||
        rec.doshaLabel?.toLowerCase().includes(q) ||
        Object.values(rec.traitsMap).some((v) => String(v).toLowerCase().includes(q))
      );
    });
  }, [consolidatedRecords, searchTerm, doshaFilter, agniFilter, digestionFilter]);

  // Reset pagination when filters change
  useEffect(() => {
    setPageIdx(0);
  }, [sourceFilter, searchTerm, doshaFilter, agniFilter, digestionFilter]);

  const pageSize = 25;
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const pagedRecords = filteredRecords.slice(pageIdx * pageSize, (pageIdx + 1) * pageSize);

  const handleOpenInWorkbench = (rec) => {
    navigate('/workbench', {
      state: {
        preloadCase: {
          datasetMode: rec.datasetMode,
          patientProfile: rec.patientProfile || {
            patientId: rec.caseId,
            name: rec.name,
            age: rec.vitals?.age ? String(rec.vitals.age) : '',
            gender: 'Unspecified',
            chiefComplaint: `Loaded from Patient Case Registry (${rec.caseId} · Label: ${rec.doshaLabel}).`,
          },
          traits: rec.traitsMap,
          vitals: rec.vitals
            ? {
                age: String(rec.vitals.age ?? ''),
                bmi: String(rec.vitals.bmi ?? ''),
                systolic_bp: String(rec.vitals.systolic_bp ?? ''),
                pulse: String(rec.vitals.pulse ?? ''),
              }
            : { age: '', bmi: '', systolic_bp: '', pulse: '' },
        },
      },
    });
  };

  const handleDeleteCustomCase = (caseId) => {
    const next = savedCases.filter((c) => c.id !== caseId);
    setSavedCases(next);
    try {
      localStorage.setItem('ayur_workbench_cases', JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const handleApplyQuickPreset = (doshaKey) => {
    const presetTraits = QUICK_DOSHA_PRESETS[doshaKey] || {};
    // Match exact allowed levels if present in traitMeta
    const clean = {};
    for (const [k, v] of Object.entries(presetTraits)) {
      const tDef = traitMeta.find((t) => t.name === k);
      if (tDef) {
        const exact = tDef.levels.find((l) => l.toLowerCase() === v.toLowerCase()) || tDef.levels[0];
        clean[k] = exact;
      } else {
        clean[k] = v;
      }
    }
    setNewCaseForm((prev) => ({
      ...prev,
      traits: { ...prev.traits, ...clean },
    }));
  };

  const handleSaveNewCase = (openImmediately = false) => {
    const enteredCount = traitMeta.filter((t) => Boolean(newCaseForm.traits[t.name])).length;
    const hasVitals =
      newCaseForm.age !== '' ||
      newCaseForm.bmi !== '' ||
      newCaseForm.systolic_bp !== '' ||
      newCaseForm.pulse !== '';
    const mode = hasVitals ? 'synthetic' : 'real';
    const caseObj = {
      id: `case_${Date.now()}`,
      name: newCaseForm.name.trim() || `Patient ${newCaseForm.patientId}`,
      patientProfile: {
        patientId: newCaseForm.patientId,
        name: newCaseForm.name.trim() || `Patient ${newCaseForm.patientId}`,
        age: newCaseForm.age,
        gender: newCaseForm.gender,
        chiefComplaint:
          newCaseForm.chiefComplaint || 'Registered via Patient Case Registry modal.',
      },
      timestamp: new Date().toISOString(),
      datasetMode: mode,
      traits: { ...newCaseForm.traits },
      vitals: {
        age: newCaseForm.age,
        bmi: newCaseForm.bmi,
        systolic_bp: newCaseForm.systolic_bp,
        pulse: newCaseForm.pulse,
      },
      enteredCount,
      predictedClass: null,
      confidence: null,
    };

    const next = [caseObj, ...savedCases];
    setSavedCases(next);
    try {
      localStorage.setItem('ayur_workbench_cases', JSON.stringify(next));
    } catch {
      // ignore
    }
    setModalOpen(false);
    setSourceFilter('custom');

    if (openImmediately) {
      navigate('/workbench', {
        state: {
          preloadCase: {
            datasetMode: mode,
            patientProfile: caseObj.patientProfile,
            traits: caseObj.traits,
            vitals: caseObj.vitals,
          },
        },
      });
    } else {
      setNewCaseForm({
        patientId: `PT-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        name: '',
        age: '36',
        gender: 'Female',
        chiefComplaint: '',
        bmi: '22.4',
        systolic_bp: '118',
        pulse: '72',
        traits: {},
      });
    }
  };

  if (!realCases || !realData) {
    return (
      <div className="glass-panel rounded-2xl p-8 text-sm text-[#827568]">
        Loading patient case registry…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#C3A989]/30 pb-4">
        <div>
          <h1 className="text-xl font-bold text-[#40382F]">Patient Case Registry</h1>
          <p className="mt-1 text-xs sm:text-sm text-[#827568]">
            Consolidated directory of Ayurvedic patient case records across categorical Prakriti/Agni traits and simulated numerical vitals.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Sub-view pills */}
          <div className="inline-flex flex-wrap items-center gap-1 rounded-full bg-white/65 p-1 border border-white/80 shadow-2xs">
            {[
              { id: 'directory', label: 'Case Directory', icon: Database },
              { id: 'inspector', label: 'Exact Neighbor Inspector', icon: Search },
              { id: 'schema', label: 'Trait Schema & Stats', icon: FileSpreadsheet },
            ].map((v) => {
              const Icon = v.icon;
              const active = subView === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setSubView(v.id)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition ${
                    active
                      ? 'bg-[#40382F] text-[#F3EADF] font-semibold shadow-2xs'
                      : 'text-[#827568] hover:text-[#40382F] hover:bg-white/80'
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${active ? 'text-[#C3A989]' : 'text-[#967D63]'}`} />
                  <span>{v.label}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#40382F] hover:bg-[#967D63] px-4 py-2 text-xs font-semibold text-[#F3EADF] transition shadow-sm"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>Add New Case</span>
          </button>
        </div>
      </div>

      {/* Sub-view 1: Consolidated Patient Case Directory */}
      {subView === 'directory' && (
        <div className="space-y-4">
          {/* Dataset Source & Filter Controls */}
          <div className="paper-card p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Source Tabs */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSourceFilter('real')}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                    sourceFilter === 'real'
                      ? 'bg-[#40382F] text-[#F3EADF] shadow-xs'
                      : 'bg-white/75 border border-white/80 text-[#827568] hover:text-[#40382F]'
                  }`}
                >
                  Verified Cohort ({realCases.records.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSourceFilter('synthetic')}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                    sourceFilter === 'synthetic'
                      ? 'bg-[#40382F] text-[#F3EADF] shadow-xs'
                      : 'bg-white/75 border border-white/80 text-[#827568] hover:text-[#40382F]'
                  }`}
                >
                  <span>Mixed Cohort + Vitals ({synthRecords?.rows?.length || 0})</span>
                  <span className="rounded-full bg-[#E8DED1] px-1.5 py-0.2 text-[10px] font-bold text-[#40382F]">
                    SIMULATED
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setSourceFilter('custom')}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                    sourceFilter === 'custom'
                      ? 'bg-[#40382F] text-[#F3EADF] shadow-xs'
                      : 'bg-white/75 border border-white/80 text-[#827568] hover:text-[#40382F]'
                  }`}
                >
                  Added / Saved Cases ({savedCases.length})
                </button>
              </div>

              <span className="text-xs text-[#827568] num">
                Showing {filteredRecords.length} matching records
              </span>
            </div>

            {/* Search & Trait Dropdown Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-[#E8DED1]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-[#967D63]" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search ID, Dosha, Agni, or trait..."
                  className="w-full rounded-xl border border-[#C3A989]/50 bg-white/80 py-1.5 pl-8 pr-3 text-xs text-[#40382F] placeholder-[#827568]/70 focus:border-[#967D63] focus:outline-none"
                />
              </div>

              <select
                value={doshaFilter}
                onChange={(e) => setDoshaFilter(e.target.value)}
                aria-label="Filter by Dosha Category"
                className="rounded-xl border border-[#C3A989]/50 bg-white/80 px-3 py-1.5 text-xs font-medium text-[#40382F] focus:border-[#967D63] focus:outline-none"
              >
                <option value="ALL">Dosha Category: All</option>
                {doshaOptions.map((cls) => (
                  <option key={cls} value={cls}>
                    {cls}
                  </option>
                ))}
              </select>

              <select
                value={agniFilter}
                onChange={(e) => setAgniFilter(e.target.value)}
                aria-label="Filter by Agni / Metabolism"
                className="rounded-xl border border-[#C3A989]/50 bg-white/80 px-3 py-1.5 text-xs font-medium text-[#40382F] focus:border-[#967D63] focus:outline-none"
              >
                <option value="ALL">Agni (Metabolism): All</option>
                <option value="fast">Fast (Tikshna)</option>
                <option value="moderate">Moderate (Sama)</option>
                <option value="slow">Slow (Manda)</option>
              </select>

              <select
                value={digestionFilter}
                onChange={(e) => setDigestionFilter(e.target.value)}
                aria-label="Filter by Digestion Quality"
                className="rounded-xl border border-[#C3A989]/50 bg-white/80 px-3 py-1.5 text-xs font-medium text-[#40382F] focus:border-[#967D63] focus:outline-none"
              >
                <option value="ALL">Digestion Quality: All</option>
                <option value="strong">Strong</option>
                <option value="moderate">Moderate</option>
                <option value="weak">Weak</option>
              </select>
            </div>
          </div>

          {/* Searchable Consolidated Patient Table */}
          <div className="paper-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E8DED1] bg-[#F3EADF]/80 text-[#827568]">
                    <th className="py-3 pl-5 pr-3 font-semibold">Case ID</th>
                    <th className="px-3 py-3 font-semibold">Patient / Source</th>
                    <th className="px-3 py-3 font-semibold">Dataset Dosha Category</th>
                    <th className="px-3 py-3 font-semibold">Body Size</th>
                    <th className="px-3 py-3 font-semibold">Appetite</th>
                    <th className="px-3 py-3 font-semibold">Agni (Metabolism)</th>
                    <th className="px-3 py-3 font-semibold">Digestion</th>
                    {(sourceFilter === 'synthetic' || sourceFilter === 'custom') && (
                      <th className="px-3 py-3 font-semibold">Vitals (Age · BMI · BP · Pulse)</th>
                    )}
                    <th className="py-3 pl-3 pr-5 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8DED1]/70">
                  {pagedRecords.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-10 text-center text-xs text-[#827568]">
                        {sourceFilter === 'custom' && savedCases.length === 0
                          ? 'No custom cases added yet. Click "Add New Case" above to create one.'
                          : 'No patient records match your active search and filter criteria.'}
                      </td>
                    </tr>
                  ) : (
                    pagedRecords.map((rec) => (
                      <tr key={rec.uid} className="hover:bg-[#F3EADF]/50 transition">
                        <td className="num py-3 pl-5 pr-3 font-bold text-[#40382F] whitespace-nowrap">
                          {rec.caseId}
                        </td>
                        <td className="px-3 py-3">
                          <div className="font-semibold text-[#40382F]">{rec.name}</div>
                          <div className="text-[10px] text-[#827568]">{rec.sourceLabel}</div>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <span
                            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-white shadow-2xs"
                            style={{
                              backgroundColor: DOSHA_PALETTE[rec.doshaLabel] || '#967D63',
                            }}
                          >
                            {rec.doshaLabel}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-[#40382F]">
                          {rec.traitsMap['Body Size'] || '—'}
                        </td>
                        <td className="px-3 py-3 text-[#827568] max-w-[140px] truncate">
                          {rec.traitsMap['Appetite'] || '—'}
                        </td>
                        <td className="px-3 py-3 capitalize text-[#40382F]">
                          {rec.traitsMap['Metabolism Type'] || '—'}
                        </td>
                        <td className="px-3 py-3 capitalize text-[#827568]">
                          {rec.traitsMap['Digestion Quality'] || '—'}
                        </td>
                        {(sourceFilter === 'synthetic' || sourceFilter === 'custom') && (
                          <td className="num px-3 py-3 text-[11px] text-[#40382F] whitespace-nowrap">
                            {rec.vitals
                              ? `${rec.vitals.age || '—'}y · ${rec.vitals.bmi || '—'} · ${rec.vitals.systolic_bp || '—'} · ${rec.vitals.pulse || '—'}`
                              : '—'}
                          </td>
                        )}
                        <td className="py-3 pl-3 pr-5 text-right whitespace-nowrap space-x-1.5">
                          <button
                            type="button"
                            onClick={() => setInspectedRow(rec)}
                            className="inline-flex items-center gap-1 rounded-full border border-[#C3A989]/50 bg-white/80 px-2.5 py-1 text-[11px] font-medium text-[#40382F] hover:bg-white transition"
                          >
                            <Eye className="h-3 w-3 text-[#967D63]" />
                            Inspect
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenInWorkbench(rec)}
                            className="inline-flex items-center gap-1 rounded-full bg-[#40382F] px-2.5 py-1 text-[11px] font-semibold text-[#F3EADF] hover:bg-[#967D63] transition"
                          >
                            Match
                            <ArrowRight className="h-3 w-3" />
                          </button>
                          {rec.isCustom && (
                            <button
                              type="button"
                              onClick={() => handleDeleteCustomCase(rec.rawSaved.id)}
                              aria-label="Delete saved case"
                              className="inline-flex items-center rounded-full border border-red-200 bg-red-50/80 p-1 text-red-700 hover:bg-red-100"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer Bar */}
            {filteredRecords.length > pageSize && (
              <div className="border-t border-[#E8DED1] bg-[#F3EADF]/60 px-5 py-3 flex items-center justify-between text-xs text-[#827568]">
                <span className="num">
                  Page {pageIdx + 1} of {totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={pageIdx === 0}
                    onClick={() => setPageIdx((p) => Math.max(0, p - 1))}
                    className="inline-flex items-center gap-1 rounded-full border border-white/80 bg-white/80 px-3 py-1 text-xs font-medium text-[#40382F] disabled:opacity-40 hover:bg-white"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    Prev
                  </button>
                  <button
                    type="button"
                    disabled={pageIdx + 1 >= totalPages}
                    onClick={() => setPageIdx((p) => Math.min(totalPages - 1, p + 1))}
                    className="inline-flex items-center gap-1 rounded-full border border-white/80 bg-white/80 px-3 py-1 text-xs font-medium text-[#40382F] disabled:opacity-40 hover:bg-white"
                  >
                    Next
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sub-view 2: Exact Neighbor Inspector (Existing RetrievalPage preserved) */}
      {subView === 'inspector' && <RetrievalPage realCases={realCases} />}

      {/* Sub-view 3: Trait Schema & Summary (Existing DataPage preserved) */}
      {subView === 'schema' && (
        <DataPage realData={realData} realCases={realCases} synthCsvSummary={synthCsvSummary} />
      )}

      {/* Record Inspection Drawer / Modal */}
      {inspectedRow && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#40382F]/40 backdrop-blur-xs p-4"
          onClick={() => setInspectedRow(null)}
        >
          <div
            className="w-full max-w-3xl max-h-[85vh] overflow-hidden rounded-3xl border border-white/80 bg-[#F3EADF] shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="hero-champagne-gradient px-6 py-4 text-white flex items-center justify-between">
              <div>
                <div className="text-[11px] font-mono uppercase tracking-wider text-white/85">
                  {inspectedRow.caseId} · {inspectedRow.sourceLabel}
                </div>
                <h2 className="text-base font-bold">
                  {inspectedRow.name} ({inspectedRow.doshaLabel})
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setInspectedRow(null)}
                aria-label="Close inspector"
                className="rounded-full bg-white/20 p-1.5 text-white hover:bg-white/30"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              {inspectedRow.vitals && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {Object.entries(VITAL_BOUNDS).map(([k, b]) => (
                    <div key={k} className="paper-card p-3">
                      <div className="text-[10px] text-[#827568] uppercase font-semibold">{b.label}</div>
                      <div className="num text-base font-bold text-[#40382F] mt-0.5">
                        {inspectedRow.vitals[k] ?? '—'}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="paper-card p-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#40382F] mb-3">
                  Recorded Clinical &amp; Constitutional Attributes (29 Traits)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  {catCols.map((col) => (
                    <div
                      key={col}
                      className="flex justify-between gap-2 border-b border-[#E8DED1] pb-1.5"
                    >
                      <span className="font-semibold text-[#40382F]">{col}:</span>
                      <span className="text-[#827568] text-right">
                        {inspectedRow.traitsMap[col] || 'Unknown'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t border-[#C3A989]/30 bg-white/60 px-6 py-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setInspectedRow(null)}
                className="rounded-full border border-[#C3A989]/60 bg-white px-4 py-1.5 text-xs font-medium text-[#40382F] hover:bg-[#F3EADF]"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = inspectedRow;
                  setInspectedRow(null);
                  handleOpenInWorkbench(target);
                }}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#40382F] px-4 py-1.5 text-xs font-semibold text-[#F3EADF] hover:bg-[#967D63]"
              >
                Open in Similarity Workbench
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Case Modal */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#40382F]/40 backdrop-blur-xs p-4"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-full max-w-3xl max-h-[88vh] overflow-hidden rounded-3xl border border-white/80 bg-[#F3EADF] shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="hero-champagne-gradient px-6 py-4 text-white flex items-center justify-between">
              <div>
                <div className="text-[11px] font-mono uppercase tracking-wider text-white/85">
                  Patient Case Registry · New Record
                </div>
                <h2 className="text-base font-bold">Add New Mixed Clinical Patient Case</h2>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Close modal"
                className="rounded-full bg-white/20 p-1.5 text-white hover:bg-white/30"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              {/* Quick archetype helpers */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#C3A989]/30">
                <span className="text-xs font-semibold text-[#40382F]">
                  Quick Fill Sample Trait Archetype:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {Object.keys(QUICK_DOSHA_PRESETS).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => handleApplyQuickPreset(k)}
                      className="rounded-full border border-[#C3A989]/60 bg-white/80 px-3 py-1 text-xs font-semibold text-[#40382F] hover:bg-white transition"
                    >
                      {k} Archetype
                    </button>
                  ))}
                </div>
              </div>

              {/* Demographics & Vitals */}
              <div className="paper-card p-4 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#40382F]">
                  1. Demographics &amp; Clinical Vitals
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-medium text-[#40382F] mb-1">
                      Patient Name / Label
                    </label>
                    <input
                      type="text"
                      value={newCaseForm.name}
                      onChange={(e) => setNewCaseForm({ ...newCaseForm, name: e.target.value })}
                      placeholder="e.g. A. Deshmukh"
                      className="w-full rounded-lg border border-[#C3A989]/50 bg-white px-2.5 py-1.5 text-xs text-[#40382F]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#40382F] mb-1">
                      Record ID
                    </label>
                    <input
                      type="text"
                      value={newCaseForm.patientId}
                      onChange={(e) =>
                        setNewCaseForm({ ...newCaseForm, patientId: e.target.value })
                      }
                      className="w-full rounded-lg border border-[#C3A989]/50 bg-white px-2.5 py-1.5 text-xs num text-[#40382F]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#40382F] mb-1">
                      Biological Sex
                    </label>
                    <select
                      value={newCaseForm.gender}
                      onChange={(e) => setNewCaseForm({ ...newCaseForm, gender: e.target.value })}
                      className="w-full rounded-lg border border-[#C3A989]/50 bg-white px-2.5 py-1.5 text-xs text-[#40382F]"
                    >
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                      <option value="Other">Other</option>
                      <option value="Unspecified">Unspecified</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                  {Object.entries(VITAL_BOUNDS).map(([vKey, bounds]) => (
                    <div key={vKey}>
                      <label className="block text-[11px] font-medium text-[#40382F] mb-1">
                        {bounds.label}
                      </label>
                      <input
                        type="number"
                        value={newCaseForm[vKey]}
                        onChange={(e) =>
                          setNewCaseForm({ ...newCaseForm, [vKey]: e.target.value })
                        }
                        placeholder="Optional"
                        className="w-full rounded-lg border border-[#C3A989]/50 bg-white px-2.5 py-1.5 text-xs num text-[#40382F]"
                      />
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#40382F] mb-1">
                    Clinical Symptoms / Notes
                  </label>
                  <textarea
                    rows={2}
                    value={newCaseForm.chiefComplaint}
                    onChange={(e) =>
                      setNewCaseForm({ ...newCaseForm, chiefComplaint: e.target.value })
                    }
                    placeholder="Presenting Ayurvedic signs, sleep, appetite, or digestive observations..."
                    className="w-full rounded-lg border border-[#C3A989]/50 bg-white px-2.5 py-1.5 text-xs text-[#40382F]"
                  />
                </div>
              </div>

              {/* Categorical Phenotypic Traits */}
              <div className="paper-card p-4 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#40382F]">
                  2. Ayurvedic Constitution, Agni &amp; Lifestyle Traits
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-60 overflow-y-auto pr-1">
                  {traitMeta.map((t) => (
                    <div key={t.name} className="space-y-1">
                      <label className="block text-[11px] font-medium text-[#40382F] truncate">
                        {t.name}
                      </label>
                      <select
                        value={newCaseForm.traits[t.name] || ''}
                        onChange={(e) =>
                          setNewCaseForm((prev) => ({
                            ...prev,
                            traits: { ...prev.traits, [t.name]: e.target.value || '' },
                          }))
                        }
                        className="w-full rounded-lg border border-[#C3A989]/50 bg-white px-2 py-1 text-xs text-[#40382F]"
                      >
                        <option value="">— Unknown —</option>
                        {t.levels.map((lvl) => (
                          <option key={lvl} value={lvl}>
                            {lvl}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t border-[#C3A989]/30 bg-white/70 px-6 py-3 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] text-[#827568]">
                Saved locally in browser session (Rule R13: zero external transmission).
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSaveNewCase(false)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#C3A989]/60 bg-white px-4 py-1.5 text-xs font-semibold text-[#40382F] hover:bg-[#F3EADF]"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#967D63]" />
                  Save to Registry
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveNewCase(true)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#40382F] px-4 py-1.5 text-xs font-semibold text-[#F3EADF] hover:bg-[#967D63]"
                >
                  Save &amp; Match in Workbench
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
