import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Upload,
  Play,
  RotateCcw,
  Shuffle,
  Save,
  Trash2,
  FolderOpen,
  Info,
  User,
  UserPlus,
  Heart,
  Sparkles,
  BookOpen,
  Stethoscope,
  ChevronDown,
  ChevronRight,
  Printer,
  ClipboardList,
  Check,
  X,
  ShieldCheck,
  Scale,
  Activity,
  Layers,
  Search,
  Dna,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ScatterChart,
  Scatter,
  ZAxis,
  Cell,
} from 'recharts';
import {
  gowerDistance,
  euclideanModeImpute,
  cosineModeImpute,
  euclideanObservedOnly,
  cosineObservedOnly,
  topK,
  knnClassVote,
  clusterAssignment,
  precomputeStats,
  precomputeZStats,
  precomputeGowerRanges,
  toCsv,
} from '../engine/distances.js';
import { DOSHA_PALETTE } from '../data/literatureData.js';
import {
  AYURVEDIC_RECOMMENDATIONS,
  getTraitSpecificGuidance,
} from '../data/ayurvedicRecommendations.js';

// R11 Mandatory Disclaimer Text
const R11_DISCLAIMER =
  'Research prototype on a dataset of unverified origin. Not a diagnostic tool.';

// Trait form split (D11): Physical traits (0..14) and Physiological/Lifestyle traits (15..28)
const PHYSICAL_TRAIT_INDICES = Array.from({ length: 15 }, (_, i) => i);
const PHYSIOLOGICAL_TRAIT_INDICES = Array.from({ length: 14 }, (_, i) => i + 15);

// Vitals physiological bounds from generator spec
const VITAL_BOUNDS = {
  age: { min: 18, max: 80, label: 'Age (years)' },
  bmi: { min: 14, max: 55, label: 'BMI (kg/m²)' },
  systolic_bp: { min: 80, max: 220, label: 'Systolic BP (mmHg)' },
  pulse: { min: 45, max: 130, label: 'Pulse Rate (bpm)' },
};

// Validated Clinical Intake Presets
const VATA_PRESET = {
  'Body Size': 'Slim',
  'Body Weight': 'Low - difficulties in gaining weight',
  'Height': 'Short',
  'Bone Structure': 'Light, Small bones, prominent joints',
  'Complexion': 'Dark-Complexion, tans easily',
  'General feel of skin': 'Dry and thin, cool to touch, rough',
  'Texture of Skin': 'Dry, pigments and aging',
  'Hair Color': 'Black/Brown,dull',
  'Appearance of Hair': 'Dry, black, knotted, brittle',
  'Shape of face': 'Long, angular, thin',
  'Eyes': 'Small, active, darting, dark eyes',
  'Eyelashes': 'Scanty eyelashes',
  'Blinking of Eyes': 'Excessive Blinking',
  'Cheeks': 'Wrinkled, Sunken',
  'Nose': 'Crooked, Narrow',
  'Teeth and gums': 'Irregular, Protruding teeth, Receding gums',
  'Lips': 'Tight, thin, dry lips which chaps easily',
  'Nails': 'Dry, Rough, Brittle, Break',
  'Appetite': 'Irregular, Scanty',
  'Liking tastes': 'Sweet / Sour / Salty',
  'Metabolism Type': 'fast',
  'Climate Preference': 'warm',
  'Stress Levels': 'high',
  'Sleep Patterns': 'short',
  'Dietary Habits': 'vegetarian',
  'Physical Activity Level': 'moderate',
  'Water Intake': 'low',
  'Digestion Quality': 'weak',
  'Skin Sensitivity': 'sensitive',
};

const PITTA_PRESET = {
  'Body Size': 'Medium',
  'Body Weight': 'Moderate - no difficulties in gaining or losing weight',
  'Height': 'Average',
  'Bone Structure': 'Medium bone structure',
  'Complexion': 'Fair-skin sunburns easily',
  'General feel of skin': 'Smooth and warm, oily T-zone',
  'Texture of Skin': 'Freckles, many moles, redness and rashes',
  'Hair Color': 'Red, light brown, yellow',
  'Appearance of Hair': 'Straight, oily',
  'Shape of face': 'Heart-shaped, pointed chin',
  'Eyes': 'Medium-sized, penetrating, light-sensitive eyes',
  'Eyelashes': 'Moderate eyelashes',
  'Blinking of Eyes': 'Moderate Blinking',
  'Cheeks': 'Smooth, Flat',
  'Nose': 'Pointed, Average',
  'Teeth and gums': 'Medium-sized teeth, Reddish gums',
  'Lips': 'Lips are soft, medium-sized',
  'Nails': 'Sharp, Flexible, Pink, Lustrous',
  'Appetite': 'Strong, Unbearable',
  'Liking tastes': 'Sweet / Bitter / Astringent',
  'Metabolism Type': 'moderate',
  'Climate Preference': 'cool',
  'Stress Levels': 'moderate',
  'Sleep Patterns': 'moderate',
  'Dietary Habits': 'vegetarian',
  'Physical Activity Level': 'high',
  'Water Intake': 'high',
  'Digestion Quality': 'strong',
  'Skin Sensitivity': 'sensitive',
};

const KAPHA_PRESET = {
  'Body Size': 'Large',
  'Body Weight': 'Heavy - difficulties in losing weight',
  'Height': 'Tall',
  'Bone Structure': 'Large, broad shoulders , heavy bone structure',
  'Complexion': 'White, pale, tans easily',
  'General feel of skin': 'Thick and moist/greasy, cold',
  'Texture of Skin': 'Oily',
  'Hair Color': 'Brown',
  'Appearance of Hair': 'Thick, curly',
  'Shape of face': 'Large, round, full',
  'Eyes': 'Big, round, beautiful, glowing eyes',
  'Eyelashes': 'Thick/Fused eyelashes',
  'Blinking of Eyes': 'More or less stable',
  'Cheeks': 'Rounded, Plump',
  'Nose': 'Rounded, Large open nostrils',
  'Teeth and gums': 'Big, White, Strong teeth, Healthy gums',
  'Lips': 'Lips are large, soft, pink, and full',
  'Nails': 'Thick, Oily, Smooth, Polished',
  'Appetite': 'Slow but steady',
  'Liking tastes': 'Pungent / Bitter / Astringent',
  'Metabolism Type': 'slow',
  'Climate Preference': 'warm',
  'Stress Levels': 'low',
  'Sleep Patterns': 'long',
  'Dietary Habits': 'vegetarian',
  'Physical Activity Level': 'sedentary',
  'Water Intake': 'moderate',
  'Digestion Quality': 'moderate',
  'Skin Sensitivity': 'insensitive',
};

const DUAL_DOSHA_PRESET = {
  'Body Size': 'Medium',
  'Body Weight': 'Moderate - no difficulties in gaining or losing weight',
  'Height': 'Average',
  'Bone Structure': 'Medium bone structure',
  'Complexion': 'Fair-skin sunburns easily',
  'General feel of skin': 'Smooth and warm, oily T-zone',
  'Texture of Skin': 'Oily',
  'Hair Color': 'Black/Brown,dull',
  'Appearance of Hair': 'Dry, black, knotted, brittle',
  'Shape of face': 'Long, angular, thin',
  'Eyes': 'Medium-sized, penetrating, light-sensitive eyes',
  'Eyelashes': 'Moderate eyelashes',
  'Blinking of Eyes': 'Moderate Blinking',
  'Cheeks': 'Smooth, Flat',
  'Nose': 'Crooked, Narrow',
  'Teeth and gums': 'Medium-sized teeth, Reddish gums',
  'Lips': 'Lips are soft, medium-sized',
  'Nails': 'Dry, Rough, Brittle, Break',
  'Appetite': 'Strong, Unbearable',
  'Liking tastes': 'Sweet / Sour / Salty',
  'Metabolism Type': 'moderate',
  'Climate Preference': 'warm',
  'Stress Levels': 'moderate',
  'Sleep Patterns': 'moderate',
  'Dietary Habits': 'vegetarian',
  'Physical Activity Level': 'moderate',
  'Water Intake': 'moderate',
  'Digestion Quality': 'moderate',
  'Skin Sensitivity': 'normal',
};

export default function WorkbenchPage() {
  // 1. Data assets state
  const [dataAssets, setDataAssets] = useState({
    loading: true,
    error: null,
    realRecords: null,
    synthRecords: null,
    clusterings: null,
    embeddings: null,
  });

  // 2. Navigation & View tabs: 'single' (Intake & Recommendations), 'diagnostics' (Metrics & MDS), 'batch' (CSV)
  const [activeTab, setActiveTab] = useState('single');
  const [datasetMode, setDatasetMode] = useState('real'); // 'real' | 'synthetic'

  // 3. Patient Demographic & Clinical Record State
  const [patientProfile, setPatientProfile] = useState({
    patientId: 'PT-2026-0842',
    name: 'S. Sharma',
    age: '38',
    gender: 'Female',
    chiefComplaint: 'Variable digestion, mild abdominal bloating after dry food, disturbed sleep',
    notes: 'Intake for constitutional similarity evaluation against historical cohort.',
  });

  // 4. Clinical Trait Selections & Numeric Vitals
  const [traitSelections, setTraitSelections] = useState({}); // { [traitName]: levelString or '' }
  const [vitalInputs, setVitalInputs] = useState({
    age: '',
    bmi: '',
    systolic_bp: '',
    pulse: '',
  });
  const [kParam, setKParam] = useState(5); // Default k=5 (R12 neutral default)
  const [clusteringConfig, setClusteringConfig] = useState({
    metric: 'gower',
    linkage: 'average',
    k: 3,
  });
  const [results, setResults] = useState(null);
  const [matrixSortBy, setMatrixSortBy] = useState('order'); // 'order' | 'mismatches'
  const [expandedHistoricalIdx, setExpandedHistoricalIdx] = useState(null);
  const [traitFilterQuery, setTraitFilterQuery] = useState('');
  const [isRetrieving, setIsRetrieving] = useState(false);
  const resultsRef = useRef(null);

  // 5. Batch mode state
  const [batchFile, setBatchFile] = useState(null);
  const [batchErrors, setBatchErrors] = useState([]);
  const [batchParsedRows, setBatchParsedRows] = useState([]);
  const [batchResults, setBatchResults] = useState(null);
  const [batchRunning, setBatchRunning] = useState(false);
  const fileInputRef = useRef(null);

  // 6. Saved cases registry (localStorage)
  const [savedCases, setSavedCases] = useState([]);
  const [caseNameInput, setCaseNameInput] = useState('');

  // Load static benchmark records once
  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        const [realRes, synthRes, clustRes, embRes] = await Promise.all([
          fetch('/data/real_records.json'),
          fetch('/data/synthetic_records.json'),
          fetch('/data/clusterings.json'),
          fetch('/data/embeddings.json'),
        ]);

        for (const res of [realRes, synthRes, clustRes, embRes]) {
          if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${res.url}`);
        }

        const [realRecords, synthRecords, clusterings, embeddings] = await Promise.all([
          realRes.json(),
          synthRes.json(),
          clustRes.json(),
          embRes.json(),
        ]);

        if (mounted) {
          setDataAssets({
            loading: false,
            error: null,
            realRecords,
            synthRecords,
            clusterings,
            embeddings,
          });
        }
      } catch (err) {
        if (mounted) {
          setDataAssets((prev) => ({ ...prev, loading: false, error: err.message }));
        }
      }
    }
    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  // Load saved cases from localStorage with try/catch
  useEffect(() => {
    try {
      const stored = localStorage.getItem('ayur_workbench_cases');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setSavedCases(parsed);
      }
    } catch {
      // Graceful degradation if localStorage is blocked
    }
  }, []);

  const saveCaseToStorage = (newCases) => {
    setSavedCases(newCases);
    try {
      localStorage.setItem('ayur_workbench_cases', JSON.stringify(newCases));
    } catch {
      // Ignore quota/access errors
    }
  };

  // Active records metadata based on mode
  const currentMeta =
    datasetMode === 'real' ? dataAssets.realRecords : dataAssets.synthRecords;

  // Precomputed stats for active database
  const precomputed = useMemo(() => {
    if (!currentMeta) return null;
    const { traits, rows } = currentMeta;
    const nTraits = traits.length;
    const nRows = rows.length;

    if (datasetMode === 'real') {
      const { modes } = precomputeStats(currentMeta);
      return {
        modes,
        nTraits,
        nRows,
        dbRows: rows,
        zStats: null,
        gRanges: null,
        medians: null,
      };
    } else {
      const dbRows = rows.map((r) => r.traits);
      const dbVitals = rows.map((r) => r.vitals);
      const { modes } = precomputeStats({ traits, rows: dbRows });
      const zStats = precomputeZStats(dbVitals);
      const gRanges = precomputeGowerRanges(currentMeta, currentMeta.vitals, dbVitals);
      const numericRanges = gRanges.slice(nTraits);

      const medians = new Float64Array(dbVitals[0].length);
      for (let c = 0; c < dbVitals[0].length; c++) {
        const vals = dbVitals
          .map((r) => r[c])
          .filter((v) => v !== null && !isNaN(v))
          .sort((a, b) => a - b);
        medians[c] = vals[Math.floor(vals.length / 2)];
      }

      return {
        modes,
        nTraits,
        nRows,
        dbRows,
        dbVitals,
        zStats,
        numericRanges,
        medians,
      };
    }
  }, [currentMeta, datasetMode]);

  // Precompute class archetype modes from historical records
  const classArchetypes = useMemo(() => {
    if (!currentMeta) return null;
    const { traits, rows, labels, classes } = currentMeta;
    const archMap = {};
    classes.forEach((cName, cIdx) => {
      const cRows = rows.filter((_, idx) => labels[idx] === cIdx);
      if (cRows.length === 0) return;
      const traitModes = {};
      traits.forEach((t, tIdx) => {
        const counts = {};
        cRows.forEach((r) => {
          const val = datasetMode === 'real' ? r[tIdx] : r.traits[tIdx];
          if (val !== null && val !== undefined) {
            counts[val] = (counts[val] || 0) + 1;
          }
        });
        let maxV = 0;
        let maxC = -1;
        for (const [v, c] of Object.entries(counts)) {
          if (c > maxC) {
            maxC = c;
            maxV = Number(v);
          }
        }
        traitModes[t.name] = {
          levelIdx: maxV,
          levelName: t.levels[maxV],
          frequency: maxC,
          percent: ((maxC / cRows.length) * 100).toFixed(1),
        };
      });
      archMap[cName] = { count: cRows.length, traitModes };
    });
    return archMap;
  }, [currentMeta, datasetMode]);

  // Count entered traits and vitals
  const enteredTraitsCount = useMemo(() => {
    if (!currentMeta) return 0;
    return currentMeta.traits.filter((t) => Boolean(traitSelections[t.name])).length;
  }, [currentMeta, traitSelections]);

  const enteredVitalsCount = useMemo(() => {
    if (datasetMode !== 'synthetic') return 0;
    return Object.values(vitalInputs).filter((v) => v !== '' && !isNaN(Number(v))).length;
  }, [datasetMode, vitalInputs]);

  // Filtered traits for search lookup
  const filteredPhysicalIndices = useMemo(() => {
    if (!traitFilterQuery.trim() || !currentMeta) return PHYSICAL_TRAIT_INDICES;
    const q = traitFilterQuery.toLowerCase();
    return PHYSICAL_TRAIT_INDICES.filter((tIdx) =>
      currentMeta.traits[tIdx].name.toLowerCase().includes(q)
    );
  }, [traitFilterQuery, currentMeta]);

  const filteredPhysiologicalIndices = useMemo(() => {
    if (!traitFilterQuery.trim() || !currentMeta) return PHYSIOLOGICAL_TRAIT_INDICES;
    const q = traitFilterQuery.toLowerCase();
    return PHYSIOLOGICAL_TRAIT_INDICES.filter((tIdx) =>
      currentMeta.traits[tIdx].name.toLowerCase().includes(q)
    );
  }, [traitFilterQuery, currentMeta]);

  // Warning condition: fewer than 5 traits entered
  const isSparseWarning = enteredTraitsCount > 0 && enteredTraitsCount < 5;

  // Handle trait change
  const handleTraitChange = (traitName, value) => {
    setTraitSelections((prev) => ({
      ...prev,
      [traitName]: value === '' ? null : value,
    }));
  };

  // Handle vital input change
  const handleVitalChange = (field, val) => {
    setVitalInputs((prev) => ({ ...prev, [field]: val }));
  };

  // Handle patient profile change
  const handleProfileChange = (field, val) => {
    setPatientProfile((prev) => ({ ...prev, [field]: val }));
  };

  const handleGenerateNewPatientId = () => {
    const randomId = `PT-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    setPatientProfile((prev) => ({ ...prev, patientId: randomId }));
  };

  // Fill random query
  const handleFillRandom = () => {
    if (!currentMeta) return;
    const randomTraits = {};
    for (const t of currentMeta.traits) {
      const idx = Math.floor(Math.random() * t.levels.length);
      randomTraits[t.name] = t.levels[idx];
    }
    setTraitSelections(randomTraits);

    if (datasetMode === 'synthetic') {
      setVitalInputs({
        age: String(Math.floor(25 + Math.random() * 45)),
        bmi: (19 + Math.random() * 12).toFixed(1),
        systolic_bp: String(Math.floor(105 + Math.random() * 35)),
        pulse: String(Math.floor(62 + Math.random() * 26)),
      });
    }
  };

  // Load preset archetypes
  const handleLoadPreset = (presetType) => {
    if (presetType === 'vata') {
      setTraitSelections(VATA_PRESET);
      setPatientProfile((prev) => ({
        ...prev,
        name: prev.name && prev.name !== 'S. Sharma' ? prev.name : 'Vata Archetype Profile',
        chiefComplaint: prev.chiefComplaint || 'Light sleep, variable appetite, dry skin, sensitive to cold',
      }));
    } else if (presetType === 'pitta') {
      setTraitSelections(PITTA_PRESET);
      setPatientProfile((prev) => ({
        ...prev,
        name: prev.name && prev.name !== 'S. Sharma' ? prev.name : 'Pitta Archetype Profile',
        chiefComplaint: prev.chiefComplaint || 'Sharp digestion, heat intolerance, skin redness/freckles',
      }));
    } else if (presetType === 'kapha') {
      setTraitSelections(KAPHA_PRESET);
      setPatientProfile((prev) => ({
        ...prev,
        name: prev.name && prev.name !== 'S. Sharma' ? prev.name : 'Kapha Archetype Profile',
        chiefComplaint: prev.chiefComplaint || 'Heaviness after meals, deep sleep, cold damp sensitivity',
      }));
    } else if (presetType === 'dual') {
      setTraitSelections(DUAL_DOSHA_PRESET);
      setPatientProfile((prev) => ({
        ...prev,
        name: prev.name && prev.name !== 'S. Sharma' ? prev.name : 'Dual Dosha (Vata+Pitta) Profile',
        chiefComplaint: prev.chiefComplaint || 'Combined fluctuating appetite and sharp digestive sensitivity',
      }));
    }
  };

  // Load example record from dataset
  const handleLoadExample = (recordIdx = 0) => {
    if (!currentMeta) return;
    const targetIdx = Math.min(recordIdx, currentMeta.rows.length - 1);
    const exTraits = {};

    if (datasetMode === 'real') {
      const row = currentMeta.rows[targetIdx];
      currentMeta.traits.forEach((t, i) => {
        exTraits[t.name] = t.levels[row[i]];
      });
      setTraitSelections(exTraits);
    } else {
      const row = currentMeta.rows[targetIdx];
      currentMeta.traits.forEach((t, i) => {
        exTraits[t.name] = t.levels[row.traits[i]];
      });
      setTraitSelections(exTraits);
      setVitalInputs({
        age: String(row.vitals[0]),
        bmi: String(row.vitals[1]),
        systolic_bp: String(row.vitals[2]),
        pulse: String(row.vitals[3]),
      });
    }
    setPatientProfile((prev) => ({
      ...prev,
      name: `Historical Case #${targetIdx}`,
      chiefComplaint: 'Dataset reference case loaded for benchmark parity verification.',
    }));
  };

  // Reset form
  const handleReset = () => {
    setTraitSelections({});
    setVitalInputs({ age: '', bmi: '', systolic_bp: '', pulse: '' });
    setResults(null);
  };

  // Save current case to localStorage
  const handleSaveCase = () => {
    const name =
      caseNameInput.trim() ||
      patientProfile.name ||
      `Case ${savedCases.length + 1} (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`;
    const newCase = {
      id: `case_${Date.now()}`,
      name,
      patientProfile: { ...patientProfile, name },
      timestamp: new Date().toISOString(),
      datasetMode,
      traits: { ...traitSelections },
      vitals: { ...vitalInputs },
      enteredCount: enteredTraitsCount,
      predictedClass: results ? results.primaryConsensusClass : null,
      confidence: results ? results.consensusConfidence : null,
    };
    saveCaseToStorage([newCase, ...savedCases]);
    setCaseNameInput('');
  };

  // Load saved case
  const handleLoadSavedCase = (saved) => {
    setDatasetMode(saved.datasetMode);
    setTraitSelections(saved.traits || {});
    setVitalInputs(saved.vitals || { age: '', bmi: '', systolic_bp: '', pulse: '' });
    if (saved.patientProfile) {
      setPatientProfile(saved.patientProfile);
    } else {
      setPatientProfile((prev) => ({ ...prev, name: saved.name }));
    }
  };

  // Delete saved case
  const handleDeleteSavedCase = (caseId) => {
    const next = savedCases.filter((c) => c.id !== caseId);
    saveCaseToStorage(next);
  };

  // Print patient assessment report
  const handlePrintReport = () => {
    window.print();
  };

  // Run retrieval and prediction calculation
  const handleRunRetrieval = () => {
    if (!currentMeta || !precomputed) return;
    setIsRetrieving(true);
    const { traits } = currentMeta;
    const { nTraits, nRows, dbRows } = precomputed;

    // Convert query trait strings to numerical indices (null for unknown)
    const queryTraits = traits.map((t) => {
      const v = traitSelections[t.name];
      if (!v) return null;
      const idx = t.levels.indexOf(v);
      return idx >= 0 ? idx : null;
    });

    const isSynthetic = datasetMode === 'synthetic';
    let queryNumerics = null;
    if (isSynthetic) {
      queryNumerics = [
        vitalInputs.age !== '' ? Number(vitalInputs.age) : null,
        vitalInputs.bmi !== '' ? Number(vitalInputs.bmi) : null,
        vitalInputs.systolic_bp !== '' ? Number(vitalInputs.systolic_bp) : null,
        vitalInputs.pulse !== '' ? Number(vitalInputs.pulse) : null,
      ];
    }

    // Missing count
    const missingTraitsCount = queryTraits.filter((v) => v === null).length;
    const hasMissing = missingTraitsCount > 0;

    // 1. Gower distance
    let gowerDists;
    if (!isSynthetic) {
      gowerDists = gowerDistance(queryTraits, dbRows, nTraits, nRows);
    } else {
      gowerDists = gowerDistance(
        queryTraits,
        dbRows,
        nTraits,
        nRows,
        currentMeta.vitals,
        queryNumerics,
        precomputed.dbVitals,
        precomputed.numericRanges
      );
    }
    const gowerTop = topK(gowerDists, kParam);

    // 2. Euclidean (mode-impute)
    let euclidModeDists;
    if (!isSynthetic) {
      euclidModeDists = euclideanModeImpute(
        queryTraits,
        dbRows,
        traits,
        precomputed.modes,
        nRows
      );
    } else {
      euclidModeDists = euclideanModeImpute(
        queryTraits,
        dbRows,
        traits,
        precomputed.modes,
        nRows,
        queryNumerics,
        precomputed.dbVitals,
        precomputed.zStats.means,
        precomputed.zStats.stds,
        precomputed.medians
      );
    }
    const euclidModeTop = topK(euclidModeDists, kParam);

    // 3. Cosine (mode-impute)
    let cosineModeDists;
    if (!isSynthetic) {
      cosineModeDists = cosineModeImpute(
        queryTraits,
        dbRows,
        traits,
        precomputed.modes,
        nRows
      );
    } else {
      cosineModeDists = cosineModeImpute(
        queryTraits,
        dbRows,
        traits,
        precomputed.modes,
        nRows,
        queryNumerics,
        precomputed.dbVitals,
        precomputed.zStats.means,
        precomputed.zStats.stds,
        precomputed.medians
      );
    }
    const cosineModeTop = topK(cosineModeDists, kParam);

    // 4. Observed-only variants (shown when missing > 0)
    let euclidObsTop = null;
    let cosineObsTop = null;
    if (hasMissing) {
      let euclidObsDists, cosineObsDists;
      if (!isSynthetic) {
        euclidObsDists = euclideanObservedOnly(queryTraits, dbRows, traits, nRows);
        cosineObsDists = cosineObservedOnly(queryTraits, dbRows, traits, nRows);
      } else {
        euclidObsDists = euclideanObservedOnly(
          queryTraits,
          dbRows,
          traits,
          nRows,
          queryNumerics,
          precomputed.dbVitals,
          precomputed.zStats.means,
          precomputed.zStats.stds
        );
        cosineObsDists = cosineObservedOnly(
          queryTraits,
          dbRows,
          traits,
          nRows,
          queryNumerics,
          precomputed.dbVitals,
          precomputed.zStats.means,
          precomputed.zStats.stds
        );
      }
      euclidObsTop = topK(euclidObsDists, kParam);
      cosineObsTop = topK(cosineObsDists, kParam);
    }

    // Class votes for top-k neighbors
    const labels = currentMeta.labels;
    const classes = currentMeta.classes;
    const gowerVote = knnClassVote(gowerTop.indices, labels, classes);
    const euclidVote = knnClassVote(euclidModeTop.indices, labels, classes);
    const cosineVote = knnClassVote(cosineModeTop.indices, labels, classes);

    // Determine primary consensus phenotype under Gower & multi-metric agreement
    let primaryConsensusClass = classes[0];
    let maxGowerVotes = -1;
    for (const [cName, cnt] of Object.entries(gowerVote)) {
      if (cnt > maxGowerVotes) {
        maxGowerVotes = cnt;
        primaryConsensusClass = cName;
      }
    }
    const consensusConfidence = Math.round((maxGowerVotes / kParam) * 100);

    const gowerWinner = Object.entries(gowerVote).sort((a, b) => b[1] - a[1])[0]?.[0] || classes[0];
    const euclidWinner = Object.entries(euclidVote).sort((a, b) => b[1] - a[1])[0]?.[0] || classes[0];
    const cosineWinner = Object.entries(cosineVote).sort((a, b) => b[1] - a[1])[0]?.[0] || classes[0];
    const metricsConsensusAgree = gowerWinner === euclidWinner && euclidWinner === cosineWinner;

    // Archetype concordance analysis: compare patient traits with statistical archetype mode
    const targetArchetype = classArchetypes?.[primaryConsensusClass];
    const concordantTraits = [];
    const atypicalTraits = [];
    if (targetArchetype) {
      traits.forEach((t) => {
        const userLevel = traitSelections[t.name];
        if (!userLevel) return;
        const archMode = targetArchetype.traitModes[t.name];
        if (archMode && archMode.levelName === userLevel) {
          concordantTraits.push({
            trait: t.name,
            level: userLevel,
            percent: archMode.percent,
          });
        } else if (archMode) {
          atypicalTraits.push({
            trait: t.name,
            patientLevel: userLevel,
            archetypeLevel: archMode.levelName,
            percent: archMode.percent,
          });
        }
      });
    }
    const concordancePct =
      enteredTraitsCount > 0
        ? Math.round((concordantTraits.length / enteredTraitsCount) * 100)
        : 0;

    // Classical recommendations from literature data
    const literatureRecommendations = AYURVEDIC_RECOMMENDATIONS[primaryConsensusClass] || null;
    const traitSpecificGuidance = getTraitSpecificGuidance(traitSelections);

    // Top 5 Historical Reference Cases
    const topHistoricalMatches = gowerTop.indices.slice(0, 5).map((recIdx, rank) => {
      const dist = gowerTop.distances[rank];
      const similarityPct = Math.max(0, (1 - dist) * 100).toFixed(1);
      const recLabel = classes[labels[recIdx]];
      let matchingTraitsCount = 0;
      const traitMatches = [];
      traits.forEach((t, tIdx) => {
        const uVal = queryTraits[tIdx];
        const rVal = dbRows[recIdx]?.[tIdx];
        const isMatch = uVal !== null && uVal === rVal;
        if (isMatch) matchingTraitsCount++;
        traitMatches.push({
          trait: t.name,
          userLevel: uVal !== null ? t.levels[uVal] : 'Unknown',
          recLevel: t.levels[rVal],
          isMatch,
        });
      });
      return {
        rank: rank + 1,
        recordIndex: recIdx,
        distance: dist,
        similarityPct,
        label: recLabel,
        matchingTraitsCount,
        traitMatches,
      };
    });

    // Format vote chart data
    const voteChartData = classes.map((cName) => ({
      name: cName,
      Gower: gowerVote[cName] || 0,
      'Euclidean (mode-imp)': euclidVote[cName] || 0,
      'Cosine (mode-imp)': cosineVote[cName] || 0,
    }));

    // Agreement between primary 3 metrics on #1 neighbor
    const top1Gower = gowerTop.indices[0];
    const top1Euclid = euclidModeTop.indices[0];
    const top1Cosine = cosineModeTop.indices[0];
    const allAgreeTop1 = top1Gower === top1Euclid && top1Euclid === top1Cosine;

    // Overlap across top-k
    const gowerSet = new Set(gowerTop.indices);
    const euclidOverlap = euclidModeTop.indices.filter((i) => gowerSet.has(i)).length;
    const cosineOverlap = cosineModeTop.indices.filter((i) => gowerSet.has(i)).length;

    // Cluster assignment calculation
    let assignedClusterData = null;
    const clusterMap = dataAssets.clusterings?.clusterings?.[datasetMode];
    if (clusterMap) {
      const { metric, linkage, k } = clusteringConfig;
      const targetClust = clusterMap[metric]?.[linkage]?.[String(k)];
      if (targetClust) {
        const queryDists =
          metric === 'gower'
            ? gowerDists
            : metric === 'euclidean'
              ? euclidModeDists
              : cosineModeDists;
        const assignment = clusterAssignment(queryDists, targetClust.labels, k);
        assignedClusterData = {
          ...assignment,
          k,
          metric,
          linkage,
          ari: targetClust.ari,
          nmi: targetClust.nmi,
          clusterSizes: targetClust.cluster_sizes,
        };
      }
    }

    // 2D MDS query coordinates (centroid of top-k neighbours)
    let queryCoord = null;
    const embData = dataAssets.embeddings?.datasets?.[datasetMode]?.[clusteringConfig.metric];
    if (embData) {
      let sumX = 0;
      let sumY = 0;
      for (const idx of gowerTop.indices) {
        sumX += embData[idx][0];
        sumY += embData[idx][1];
      }
      queryCoord = [sumX / gowerTop.indices.length, sumY / gowerTop.indices.length];
    }

    // Continuous Tri-Dosha Prakriti Spectrum (Kernel / Distance-Weighted Mixture)
    // Directly overcomes the discrete single-label limitation of the dataset
    let weightSum = 0;
    let vataScore = 0;
    let pittaScore = 0;
    let kaphaScore = 0;

    for (let i = 0; i < gowerTop.indices.length; i++) {
      const recIdx = gowerTop.indices[i];
      const dist = gowerTop.distances[i];
      const weight = Math.max(0.001, 1 - dist);
      weightSum += weight;

      const recLabel = classes[labels[recIdx]];
      if (recLabel === 'Vata') {
        vataScore += weight;
      } else if (recLabel === 'Pitta') {
        pittaScore += weight;
      } else if (recLabel === 'Kapha') {
        kaphaScore += weight;
      } else if (recLabel === 'Vata+Pitta') {
        vataScore += weight * 0.5;
        pittaScore += weight * 0.5;
      } else if (recLabel === 'Vata+Kapha') {
        vataScore += weight * 0.5;
        kaphaScore += weight * 0.5;
      } else if (recLabel === 'Pitta+Kapha') {
        pittaScore += weight * 0.5;
        kaphaScore += weight * 0.5;
      }
    }

    const doshaWeightSum = weightSum > 0 ? weightSum : 1;
    let vataPct = Math.round((vataScore / doshaWeightSum) * 100);
    let pittaPct = Math.round((pittaScore / doshaWeightSum) * 100);
    let kaphaPct = Math.max(0, 100 - (vataPct + pittaPct));
    if (vataPct + pittaPct + kaphaPct !== 100) {
      kaphaPct = Math.max(0, 100 - (vataPct + pittaPct));
    }
    const triDoshaSpectrum = { vata: vataPct, pitta: pittaPct, kapha: kaphaPct };

    // Intake Completeness & Reliability Assessment
    const traitCoveragePct = Math.round((enteredTraitsCount / traits.length) * 100);
    let confidenceRating = 'High';
    let confidenceNote = 'Comprehensive trait coverage with multi-metric alignment.';
    if (enteredTraitsCount < 8) {
      confidenceRating = 'Exploratory';
      confidenceNote = 'Low trait coverage (< 30%). Dataset cohort prior baseline dominates.';
    } else if (enteredTraitsCount < 18 || !metricsConsensusAgree) {
      confidenceRating = 'Moderate';
      confidenceNote = metricsConsensusAgree
        ? 'Partial trait coverage with unanimous metric agreement.'
        : 'Metric divergence detected across distance geometries; review metric comparison.';
    }

    // Shannon Entropy / Phenotype Ambiguity across top-k
    let shannonEntropy = 0;
    for (const cnt of Object.values(gowerVote)) {
      if (cnt > 0) {
        const p = cnt / kParam;
        shannonEntropy -= p * Math.log2(p);
      }
    }
    const maxEntropy = Math.log2(Math.max(2, classes.length));
    const ambiguityPct = Math.min(100, Math.round((shannonEntropy / maxEntropy) * 100));

    // Boundary Tie Analysis at rank k
    const boundaryTieCount = gowerTop.tieCount;

    // Imputation Invariance / Divergence analysis
    let imputationAnalysis = null;
    if (hasMissing && euclidObsTop && cosineObsTop) {
      const euclidObsWinner =
        Object.entries(knnClassVote(euclidObsTop.indices, labels, classes))
          .sort((a, b) => b[1] - a[1])[0]?.[0] || classes[0];
      const isImputationRobust =
        gowerWinner === euclidWinner && euclidObsWinner === euclidWinner;
      imputationAnalysis = {
        isRobust: isImputationRobust,
        modeImputedWinner: euclidWinner,
        observedOnlyWinner: euclidObsWinner,
        divergenceNote: isImputationRobust
          ? 'Mode-imputation and observed-only metrics converge to the identical consensus phenotype.'
          : `Mode-imputation (${euclidWinner}) diverges from observed-only (${euclidObsWinner} / Gower: ${gowerWinner}).`,
      };
    }

    setResults({
      timestamp: new Date().toISOString(),
      datasetMode,
      queryTraits,
      queryNumerics,
      hasMissing,
      missingTraitsCount,
      primaryConsensusClass,
      consensusConfidence,
      maxGowerVotes,
      gowerWinner,
      euclidWinner,
      cosineWinner,
      gowerVote,
      euclidVote,
      cosineVote,
      metricsConsensusAgree,
      concordantTraits,
      atypicalTraits,
      concordancePct,
      triDoshaSpectrum,
      traitCoveragePct,
      confidenceRating,
      confidenceNote,
      ambiguityPct,
      boundaryTieCount,
      imputationAnalysis,
      literatureRecommendations,
      traitSpecificGuidance,
      topHistoricalMatches,
      gower: { ...gowerTop, dists: gowerDists },
      euclidMode: { ...euclidModeTop, dists: euclidModeDists },
      cosineMode: { ...cosineModeTop, dists: cosineModeDists },
      euclidObs: euclidObsTop,
      cosineObs: cosineObsTop,
      voteChartData,
      allAgreeTop1,
      top1Gower,
      top1Euclid,
      top1Cosine,
      euclidOverlap,
      cosineOverlap,
      assignedClusterData,
      queryCoord,
    });
    setIsRetrieving(false);
    setTimeout(() => {
      if (resultsRef.current) {
        resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  };

  // Trait Match Matrix Data (sorted)
  const traitMatrixRows = useMemo(() => {
    if (!results || !currentMeta) return [];
    const traits = currentMeta.traits;
    const topIndices = results.gower.indices;

    const rows = traits.map((t, tIdx) => {
      const qVal = results.queryTraits[tIdx];
      let matches = 0;
      let mismatches = 0;
      let unknowns = 0;

      const neighborCols = topIndices.map((recIdx) => {
        let nVal;
        if (results.datasetMode === 'real') {
          nVal = currentMeta.rows[recIdx][tIdx];
        } else {
          nVal = currentMeta.rows[recIdx].traits[tIdx];
        }

        if (qVal === null || qVal === undefined) {
          unknowns++;
          return { status: 'unknown', text: t.levels[nVal] };
        } else if (qVal === nVal) {
          matches++;
          return { status: 'match', text: t.levels[nVal] };
        } else {
          mismatches++;
          return { status: 'mismatch', text: t.levels[nVal] };
        }
      });

      return {
        traitName: t.name,
        queryLevel: qVal !== null ? t.levels[qVal] : 'Unknown',
        isQueryKnown: qVal !== null,
        matches,
        mismatches,
        unknowns,
        neighborCols,
      };
    });

    if (matrixSortBy === 'mismatches') {
      rows.sort((a, b) => b.mismatches - a.mismatches);
    }
    return rows;
  }, [results, currentMeta, datasetMode, matrixSortBy]);

  // Reactive cluster assignment and MDS query placement (eliminates stale closure on dropdown change)
  const resolvedClusterData = useMemo(() => {
    if (!results) return null;
    const clusterMap = dataAssets.clusterings?.clusterings?.[results.datasetMode];
    if (!clusterMap) return results.assignedClusterData;
    const { metric, linkage, k } = clusteringConfig;
    const targetClust = clusterMap[metric]?.[linkage]?.[String(k)];
    if (!targetClust) return results.assignedClusterData;
    const queryDists =
      metric === 'gower'
        ? results.gower?.dists
        : metric === 'euclidean'
          ? results.euclidMode?.dists
          : results.cosineMode?.dists;
    if (!queryDists) return results.assignedClusterData;
    const assignment = clusterAssignment(queryDists, targetClust.labels, k);
    return {
      ...assignment,
      k,
      metric,
      linkage,
      ari: targetClust.ari,
      nmi: targetClust.nmi,
      clusterSizes: targetClust.cluster_sizes,
    };
  }, [results, clusteringConfig, dataAssets.clusterings]);

  const resolvedQueryCoord = useMemo(() => {
    if (!results) return null;
    const { metric } = clusteringConfig;
    const embData = dataAssets.embeddings?.datasets?.[results.datasetMode]?.[metric];
    if (!embData) return results.queryCoord;
    const neighborIndices =
      metric === 'gower'
        ? results.gower?.indices
        : metric === 'euclidean'
          ? results.euclidMode?.indices
          : results.cosineMode?.indices;
    if (!neighborIndices || neighborIndices.length === 0) return results.queryCoord;
    let sumX = 0;
    let sumY = 0;
    for (const idx of neighborIndices) {
      sumX += embData[idx][0];
      sumY += embData[idx][1];
    }
    return [sumX / neighborIndices.length, sumY / neighborIndices.length];
  }, [results, clusteringConfig, dataAssets.embeddings]);

  // Export JSON handler
  const handleExportJSON = () => {
    if (!results || !currentMeta) return;
    const payload = {
      notice: R11_DISCLAIMER,
      dataset: datasetMode,
      timestamp: results.timestamp,
      patient_profile: patientProfile,
      predicted_consensus_phenotype: results.primaryConsensusClass,
      consensus_confidence_pct: results.consensusConfidence,
      archetype_concordance_pct: results.concordancePct,
      k: kParam,
      query_traits: traitSelections,
      query_vitals: datasetMode === 'synthetic' ? vitalInputs : null,
      recommendations: results.literatureRecommendations,
      functional_guidance: results.traitSpecificGuidance,
      top_k_neighbors: {
        gower: results.gower.indices.map((idx, rank) => ({
          rank: rank + 1,
          record_index: idx,
          distance: results.gower.distances[rank],
          label_of_nearest_dataset_record: currentMeta.classes[currentMeta.labels[idx]],
        })),
        euclidean_modeimpute: results.euclidMode.indices.map((idx, rank) => ({
          rank: rank + 1,
          record_index: idx,
          distance: results.euclidMode.distances[rank],
          label_of_nearest_dataset_record: currentMeta.classes[currentMeta.labels[idx]],
        })),
        cosine_modeimpute: results.cosineMode.indices.map((idx, rank) => ({
          rank: rank + 1,
          record_index: idx,
          distance: results.cosineMode.distances[rank],
          label_of_nearest_dataset_record: currentMeta.classes[currentMeta.labels[idx]],
        })),
      },
      cluster_assignment: resolvedClusterData || results.assignedClusterData,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `patient_${patientProfile.patientId || 'record'}_assessment.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export CSV handler
  const handleExportCSV = () => {
    if (!results || !currentMeta) return;
    const rows = results.gower.indices.map((idx, rank) => ({
      Rank: rank + 1,
      RecordIndex: idx,
      GowerDistance: results.gower.distances[rank].toFixed(4),
      EuclideanModeDistance: results.euclidMode.distances[rank]?.toFixed(4) || '—',
      CosineModeDistance: results.cosineMode.distances[rank]?.toFixed(4) || '—',
      LabelOfNearestDatasetRecord: currentMeta.classes[currentMeta.labels[idx]],
    }));

    const csvBody = toCsv(rows);
    const fullCsv = `# NOTICE: ${R11_DISCLAIMER}\n# Patient ID: ${patientProfile.patientId}\n# Dataset: ${datasetMode} (N=${currentMeta.rows.length})\n${csvBody}`;
    const blob = new Blob([fullCsv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `patient_${patientProfile.patientId || 'record'}_neighbors.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // -------------------------------------------------------------------------
  // Batch Mode Functions
  // -------------------------------------------------------------------------
  const handleDownloadTemplate = () => {
    if (!dataAssets.realRecords) return;
    const catHeaders = dataAssets.realRecords.traits.map((t) => t.name);
    const headers =
      datasetMode === 'synthetic'
        ? [...catHeaders, 'age', 'bmi', 'systolic_bp', 'pulse']
        : catHeaders;

    const sampleRow = dataAssets.realRecords.traits.map((t) => t.levels[0]);
    if (datasetMode === 'synthetic') {
      sampleRow.push('35', '24.5', '120', '72');
    }

    const csvContent = `${headers.join(',')}\n${sampleRow.join(',')}\n`;
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ayur_batch_template_${datasetMode}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBatchFile(file);
    setBatchErrors([]);
    setBatchParsedRows([]);
    setBatchResults(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length < 2) {
        setBatchErrors(['CSV file must have a header line and at least one data row.']);
        return;
      }

      if (lines.length - 1 > 1000) {
        setBatchErrors(['Batch upload exceeds the maximum limit of 1,000 rows.']);
        return;
      }

      const rawHeaders = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
      const traits = currentMeta.traits;

      const errors = [];
      const parsed = [];

      for (let r = 1; r < lines.length; r++) {
        const rowVals = lines[r].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map((v) =>
          v.trim().replace(/^"|"$/g, '')
        );

        if (rowVals.length < rawHeaders.length) {
          errors.push(`Row ${r}: Incomplete columns (expected ${rawHeaders.length}, got ${rowVals.length}).`);
          continue;
        }

        const rowObj = {};
        rawHeaders.forEach((h, idx) => {
          rowObj[h] = rowVals[idx];
        });

        const traitIndices = [];
        for (let tIdx = 0; tIdx < traits.length; tIdx++) {
          const t = traits[tIdx];
          const val = rowObj[t.name];
          if (!val || val === '' || val.toLowerCase() === 'unknown') {
            traitIndices.push(null);
          } else {
            const lIdx = t.levels.indexOf(val);
            if (lIdx < 0) {
              errors.push(
                `Row ${r}, trait "${t.name}": "${val}" is not a valid level. Expected one of: ${t.levels.slice(0, 3).join(', ')}...`
              );
              traitIndices.push(null);
            } else {
              traitIndices.push(lIdx);
            }
          }
        }

        let vitals = null;
        if (datasetMode === 'synthetic') {
          vitals = [];
          for (const [vKey, bounds] of Object.entries(VITAL_BOUNDS)) {
            const vVal = rowObj[vKey];
            if (!vVal || vVal === '' || vVal.toLowerCase() === 'unknown') {
              vitals.push(null);
            } else {
              const num = Number(vVal);
              if (isNaN(num)) {
                errors.push(`Row ${r}, vital "${vKey}": "${vVal}" is not a valid number.`);
                vitals.push(null);
              } else if (num < bounds.min || num > bounds.max) {
                errors.push(
                  `Row ${r}, vital "${vKey}": ${num} is out of bounds [${bounds.min}, ${bounds.max}].`
                );
                vitals.push(num);
              } else {
                vitals.push(num);
              }
            }
          }
        }

        parsed.push({ rowIdx: r, traits: traitIndices, vitals, raw: rowObj });
      }

      setBatchErrors(errors);
      setBatchParsedRows(errors.length === 0 ? parsed : []);
    };
    reader.readAsText(file);
  };

  const handleRunBatch = () => {
    if (batchParsedRows.length === 0 || !precomputed || !currentMeta) return;
    setBatchRunning(true);

    const { traits } = currentMeta;
    const { nTraits, nRows, dbRows } = precomputed;
    const isSynthetic = datasetMode === 'synthetic';
    const classes = currentMeta.classes;
    const labels = currentMeta.labels;

    const outResults = batchParsedRows.map((item) => {
      const gDists = !isSynthetic
        ? gowerDistance(item.traits, dbRows, nTraits, nRows)
        : gowerDistance(
            item.traits,
            dbRows,
            nTraits,
            nRows,
            currentMeta.vitals,
            item.vitals,
            precomputed.dbVitals,
            precomputed.numericRanges
          );
      const gTop = topK(gDists, 1);

      const eDists = !isSynthetic
        ? euclideanModeImpute(item.traits, dbRows, traits, precomputed.modes, nRows)
        : euclideanModeImpute(
            item.traits,
            dbRows,
            traits,
            precomputed.modes,
            nRows,
            item.vitals,
            precomputed.dbVitals,
            precomputed.zStats.means,
            precomputed.zStats.stds,
            precomputed.medians
          );
      const eTop = topK(eDists, 1);

      const cDists = !isSynthetic
        ? cosineModeImpute(item.traits, dbRows, traits, precomputed.modes, nRows)
        : cosineModeImpute(
            item.traits,
            dbRows,
            traits,
            precomputed.modes,
            nRows,
            item.vitals,
            precomputed.dbVitals,
            precomputed.zStats.means,
            precomputed.zStats.stds,
            precomputed.medians
          );
      const cTop = topK(cDists, 1);

      const gIdx = gTop.indices[0];
      const eIdx = eTop.indices[0];
      const cIdx = cTop.indices[0];

      return {
        rowNumber: item.rowIdx,
        topNeighborIdx: gIdx,
        gowerDist: gTop.distances[0].toFixed(4),
        gowerLabel: classes[labels[gIdx]],
        euclidLabel: classes[labels[eIdx]],
        cosineLabel: classes[labels[cIdx]],
        allAgree: gIdx === eIdx && eIdx === cIdx,
        tieCount: gTop.tieCount,
      };
    });

    setBatchResults(outResults);
    setBatchRunning(false);
  };

  const handleDownloadBatchResults = () => {
    if (!batchResults) return;
    const csvContent = toCsv(batchResults);
    const fullCsv = `# NOTICE: ${R11_DISCLAIMER}\n# Dataset: ${datasetMode} batch\n${csvContent}`;
    const blob = new Blob([fullCsv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `batch_retrieval_results_${datasetMode}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  if (dataAssets.loading) {
    return (
      <div className="paper-card p-6 text-sm text-[#827568]">
        Loading verified benchmark records from <code className="num">/data/</code>...
      </div>
    );
  }

  if (dataAssets.error) {
    return (
      <div className="paper-card border-red-200 p-6 text-sm text-red-700">
        Error loading benchmark records: {dataAssets.error}.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Workbench Header */}
      <div className="space-y-3 border-b border-[#E8DED1] pb-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold tracking-tight text-[#40382F]">
              Similarity Workbench
            </h1>
            {datasetMode === 'synthetic' && (
              <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900 border border-amber-300">
                SIMULATED
              </span>
            )}
          </div>

          {/* Mode Switcher */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('single')}
              className={`rounded px-3 py-1.5 text-xs font-medium transition flex items-center gap-1.5 ${
                activeTab === 'single'
                  ? 'bg-[#40382F] text-[#F3EADF] shadow-sm font-semibold'
                  : 'bg-white text-[#827568] border border-[#E8DED1] hover:bg-[#F3EADF]/65'
              }`}
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>Patient Intake &amp; Recommendations</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('diagnostics')}
              className={`rounded px-3 py-1.5 text-xs font-medium transition flex items-center gap-1.5 ${
                activeTab === 'diagnostics'
                  ? 'bg-[#40382F] text-[#F3EADF] shadow-sm font-semibold'
                  : 'bg-white text-[#827568] border border-[#E8DED1] hover:bg-[#F3EADF]/65'
              }`}
            >
              <Scale className="h-3.5 w-3.5" />
              <span>Metric Diagnostics &amp; MDS</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('batch')}
              className={`rounded px-3 py-1.5 text-xs font-medium transition flex items-center gap-1.5 ${
                activeTab === 'batch'
                  ? 'bg-[#40382F] text-[#F3EADF] shadow-sm font-semibold'
                  : 'bg-white text-[#827568] border border-[#E8DED1] hover:bg-[#F3EADF]/65'
              }`}
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Batch Mode (CSV)</span>
            </button>
          </div>
        </div>

        <p className="text-xs text-[#827568] leading-relaxed max-w-3xl">
          Create patient clinical profiles, predict constitutional phenotype consensus across 1,200
          historical cohort records using Gower, Euclidean, and Cosine distance metrics, and receive
          literature-grounded Ayurvedic lifestyle and dietary recommendations. All calculations
          execute locally in your browser (Rule R13: zero user data transmitted).
        </p>
      </div>

      {/* Dataset Toggle & Counter Bar */}
      <div className="paper-card p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-[#827568]">Active Database:</span>
          <div className="inline-flex flex-wrap rounded-xl border border-[#E8DED1] bg-[#F3EADF]/70 p-0.5 text-xs gap-0.5">
            <button
              type="button"
              onClick={() => {
                setDatasetMode('real');
                setResults(null);
              }}
              className={`rounded px-2.5 py-1 font-medium transition ${
                datasetMode === 'real'
                  ? 'bg-white text-[#40382F] shadow-sm'
                  : 'text-[#827568] hover:text-[#40382F]'
              }`}
            >
              Real Data (29 traits, 1,200 records)
            </button>
            <button
              type="button"
              onClick={() => {
                setDatasetMode('synthetic');
                setResults(null);
              }}
              className={`rounded px-2.5 py-1 font-medium transition flex items-center gap-1.5 ${
                datasetMode === 'synthetic'
                  ? 'bg-white text-[#40382F] shadow-sm'
                  : 'text-[#827568] hover:text-[#40382F]'
              }`}
            >
              <span>Simulated Mixed Data (29 traits + 4 vitals)</span>
              <span className="rounded bg-amber-100 px-1 py-0.2 text-[10px] font-semibold text-amber-800">
                SIMULATED
              </span>
            </button>
          </div>
        </div>

        {activeTab !== 'batch' && (
          <div className="flex items-center gap-3 text-xs text-[#827568]">
            <span>
              Traits entered:{' '}
              <strong className="num text-[#40382F]">
                {enteredTraitsCount} of {currentMeta?.traits.length || 29}
              </strong>
            </span>
            {datasetMode === 'synthetic' && (
              <span>
                Vitals entered:{' '}
                <strong className="num text-[#40382F]">{enteredVitalsCount} of 4</strong>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Sparse Warning Banner */}
      {isSparseWarning && (
        <div className="rounded border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
          <span>
            Fewer than 5 traits selected ({enteredTraitsCount} of 29). High trait missingness may
            cause distance metrics to rely heavily on mode imputation or sparse trait overlaps.
          </span>
        </div>
      )}

      {/* ==================================================================== */}
      {/* PATIENT INTAKE & RECOMMENDATIONS TAB (activeTab === 'single')        */}
      {/* ==================================================================== */}
      {activeTab === 'single' && (
        <div className="space-y-6">
          {/* Patient Demographic Profile Intake Card */}
          <div className="paper-card p-5 space-y-4 border-[#C3A989]/55 bg-gradient-to-b from-[#F3EADF]/70 to-white/75">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E8DED1] pb-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-[#967D63]" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-[#40382F]">
                  Patient Clinical Profile &amp; Demographics
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[#827568]">Record ID:</span>
                <span className="rounded bg-[#E8DED1]/85 border border-[#C3A989]/70 px-2 py-0.5 text-xs font-mono font-medium text-[#40382F]">
                  {patientProfile.patientId}
                </span>
                <button
                  type="button"
                  onClick={handleGenerateNewPatientId}
                  className="text-[11px] text-[#967D63] hover:underline font-medium"
                >
                  Generate ID
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-[#40382F]">Patient Full Name / ID</label>
                <input
                  type="text"
                  value={patientProfile.name}
                  onChange={(e) => handleProfileChange('name', e.target.value)}
                  placeholder="e.g. S. Sharma"
                  className="w-full rounded border border-[#C3A989]/50 bg-white px-2.5 py-1 text-xs text-[#40382F]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-[#40382F]">Age (years)</label>
                <input
                  type="number"
                  value={patientProfile.age}
                  onChange={(e) => handleProfileChange('age', e.target.value)}
                  placeholder="e.g. 38"
                  className="w-full rounded border border-[#C3A989]/50 bg-white px-2.5 py-1 text-xs num text-[#40382F]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-[#40382F]">Biological Sex</label>
                <select
                  value={patientProfile.gender}
                  onChange={(e) => handleProfileChange('gender', e.target.value)}
                  className="w-full rounded border border-[#C3A989]/50 bg-white px-2 py-1 text-xs text-[#40382F]"
                >
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Other">Other</option>
                  <option value="Unspecified">Unspecified</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-[#40382F]">Nearest Neighbours (k)</label>
                <select
                  id="k-selector"
                  value={kParam}
                  onChange={(e) => setKParam(Number(e.target.value))}
                  className="w-full rounded border border-[#C3A989]/50 bg-white px-2 py-1 text-xs num font-medium text-[#40382F]"
                >
                  {[1, 3, 5, 7, 10].map((val) => (
                    <option key={val} value={val}>
                      k = {val} historical records
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-[#40382F]">Chief Complaint &amp; Clinical Notes</label>
              <textarea
                rows={2}
                value={patientProfile.chiefComplaint}
                onChange={(e) => handleProfileChange('chiefComplaint', e.target.value)}
                placeholder="Describe current clinical symptoms, digestive irregularities, sleep complaints, or stress factors..."
                className="w-full rounded border border-[#C3A989]/50 bg-white px-2.5 py-1.5 text-xs text-[#40382F]"
              />
            </div>
          </div>

          {/* Quick Presets & Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded border border-[#E8DED1]">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleRunRetrieval}
                disabled={isRetrieving}
                className="inline-flex items-center gap-1.5 rounded bg-[#40382F] px-4 py-2 text-xs font-semibold text-[#F3EADF] hover:bg-[#967D63] disabled:opacity-50 shadow-sm transition"
              >
                {isRetrieving ? (
                  <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Play className="h-3.5 w-3.5 fill-current" />
                )}
                Run Retrieval
              </button>

              <span className="text-[#C3A989]">|</span>

              <span className="text-[11px] font-medium text-[#827568]">Presets:</span>
              <button
                type="button"
                onClick={() => handleLoadPreset('vata')}
                className="inline-flex items-center gap-1 rounded border border-sky-200 bg-sky-50/60 px-2.5 py-1 text-xs font-medium text-sky-800 hover:bg-sky-100 transition"
              >
                Vata
              </button>
              <button
                type="button"
                onClick={() => handleLoadPreset('pitta')}
                className="inline-flex items-center gap-1 rounded border border-amber-200 bg-amber-50/60 px-2.5 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100 transition"
              >
                Pitta
              </button>
              <button
                type="button"
                onClick={() => handleLoadPreset('kapha')}
                className="inline-flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50/60 px-2.5 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-100 transition"
              >
                Kapha
              </button>
              <button
                type="button"
                onClick={() => handleLoadPreset('dual')}
                className="inline-flex items-center gap-1 rounded border border-purple-200 bg-purple-50/60 px-2.5 py-1 text-xs font-medium text-purple-800 hover:bg-purple-100 transition"
              >
                Vata+Pitta
              </button>

              <span className="text-[#C3A989]">|</span>

              <button
                type="button"
                onClick={() => handleLoadExample(0)}
                className="inline-flex items-center gap-1.5 rounded border border-[#C3A989]/50 bg-white px-2.5 py-1 text-xs font-medium text-[#40382F] hover:bg-[#F3EADF]/65 transition"
              >
                <FolderOpen className="h-3.5 w-3.5 text-[#827568]" />
                Load Example #1
              </button>

              <button
                type="button"
                onClick={handleFillRandom}
                className="inline-flex items-center gap-1.5 rounded border border-[#C3A989]/50 bg-white px-2.5 py-1 text-xs font-medium text-[#40382F] hover:bg-[#F3EADF]/65 transition"
              >
                <Shuffle className="h-3.5 w-3.5 text-[#827568]" />
                Fill Random
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 rounded border border-[#E8DED1] bg-white px-2.5 py-1 text-xs font-medium text-[#827568] hover:bg-[#F3EADF]/65 transition"
              >
                <RotateCcw className="h-3.5 w-3.5 text-[#827568]/80" />
                Reset
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Case name (optional)"
                value={caseNameInput}
                onChange={(e) => setCaseNameInput(e.target.value)}
                className="rounded border border-[#C3A989]/50 px-2.5 py-1 text-xs text-[#40382F] placeholder-neutral-400 w-36"
              />
              <button
                type="button"
                onClick={handleSaveCase}
                className="inline-flex items-center gap-1 rounded border border-[#C3A989]/50 bg-white px-2.5 py-1 text-xs font-medium text-[#40382F] hover:bg-[#F3EADF]/65"
                title="Save case to browser localStorage"
              >
                <Save className="h-3.5 w-3.5 text-[#827568]" />
                Save Patient
              </button>
            </div>
          </div>

          {/* Saved Cases Registry Drawer (if any exist) */}
          {savedCases.length > 0 && (
            <div className="paper-card p-3 bg-[#F3EADF]/65">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#E8DED1] text-xs">
                <span className="font-semibold text-[#40382F]">
                  Saved Patient Registry ({savedCases.length} records in local storage)
                </span>
                <span className="text-[11px] text-[#827568]/80">Stored strictly in browser localStorage</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {savedCases.map((sc) => (
                  <div
                    key={sc.id}
                    className="inline-flex items-center gap-2 rounded border border-[#E8DED1] bg-white px-2.5 py-1 text-xs text-[#40382F] shadow-xs"
                  >
                    <span className="font-semibold text-[#40382F]">{sc.name}</span>
                    {sc.predictedClass && (
                      <span
                        className="rounded px-1.5 py-0.2 text-[10px] font-semibold text-white"
                        style={{ backgroundColor: DOSHA_PALETTE[sc.predictedClass] || '#666' }}
                      >
                        {sc.predictedClass}
                      </span>
                    )}
                    <span className="text-[10px] text-[#827568]/80 num">
                      {sc.enteredCount}/29 traits
                    </span>
                    <button
                      type="button"
                      onClick={() => handleLoadSavedCase(sc)}
                      className="text-[#967D63] hover:underline text-[11px] font-medium"
                    >
                      Load
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSavedCase(sc.id)}
                      className="text-[#827568]/80 hover:text-red-600"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Simulated Mode: Numeric Vitals Card */}
          {datasetMode === 'synthetic' && (
            <div className="paper-card p-5 space-y-3 bg-amber-50/20 border-amber-200">
              <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-amber-900">
                    Numeric Vitals (Simulated Ground Truth)
                  </h2>
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                    SIMULATED
                  </span>
                </div>
                <span className="text-[11px] text-[#827568]">
                  Continuous physiological vitals generated from class-conditional distributions
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-1">
                {Object.entries(VITAL_BOUNDS).map(([vKey, bounds]) => {
                  const val = vitalInputs[vKey];
                  const numVal = val !== '' ? Number(val) : null;
                  const isOutOfBounds =
                    numVal !== null &&
                    !isNaN(numVal) &&
                    (numVal < bounds.min || numVal > bounds.max);

                  return (
                    <div key={vKey} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label htmlFor={`vital-${vKey}`} className="text-xs font-medium text-[#40382F]">
                          {bounds.label}
                        </label>
                        <span className="text-[10px] text-[#827568]/80 num">
                          {bounds.min}–{bounds.max}
                        </span>
                      </div>
                      <input
                        id={`vital-${vKey}`}
                        type="number"
                        placeholder="Unknown"
                        value={val}
                        onChange={(e) => handleVitalChange(vKey, e.target.value)}
                        className={`w-full rounded border px-2.5 py-1 text-xs num ${
                          isOutOfBounds
                            ? 'border-red-400 bg-red-50 text-red-900'
                            : 'border-[#C3A989]/50 bg-white text-[#40382F]'
                        }`}
                      />
                      {isOutOfBounds && (
                        <p className="text-[10px] text-red-600">
                          Value outside physiological range [{bounds.min}, {bounds.max}].
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Trait Search & Completion Progress Banner */}
          <div className="paper-card p-4 flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-[#F3EADF]/70 via-white/80 to-[#E8DED1]/50 border-[#C3A989]/50">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#827568]/80" />
              <input
                type="text"
                value={traitFilterQuery}
                onChange={(e) => setTraitFilterQuery(e.target.value)}
                placeholder="Search traits by name (e.g. sleep, appetite, skin, digestion)..."
                className="w-full rounded-md border border-[#C3A989]/50 bg-white pl-9 pr-8 py-1.5 text-xs text-[#40382F] placeholder-[#827568]/70 focus:border-[#967D63] focus:outline-hidden shadow-2xs"
              />
              {traitFilterQuery && (
                <button
                  type="button"
                  onClick={() => setTraitFilterQuery('')}
                  className="absolute right-2.5 top-2 text-[#827568]/80 hover:text-[#827568]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 sm:gap-3 w-full sm:w-auto">
              <div className="text-left sm:text-right">
                <div className="text-xs font-semibold text-[#40382F]">
                  <span className="num font-bold text-[#967D63]">{enteredTraitsCount} / 29</span> traits entered
                </div>
                <div className="text-[10px] text-[#827568]/80">
                  {enteredTraitsCount === 29 ? 'Complete profile ready for phenotyping' : `${29 - enteredTraitsCount} traits unassigned (treated as Unknown)`}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-24 sm:w-28 h-2.5 rounded-full bg-[#E8DED1] overflow-hidden ring-1 ring-[#C3A989]/40">
                  <div
                    className="h-full bg-gradient-to-r from-[#C3A989] to-[#967D63] rounded-full transition-all duration-300"
                    style={{ width: `${(enteredTraitsCount / 29) * 100}%` }}
                  />
                </div>

                <span className="rounded bg-[#E8DED1]/80 border border-[#C3A989]/50 px-2 py-0.5 text-xs font-bold text-[#40382F] num">
                  {Math.round((enteredTraitsCount / 29) * 100)}%
                </span>
              </div>
            </div>
          </div>

          {/* Trait Form Section 1: Physical Traits (0..14) */}
          <div className="paper-card p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E8DED1] pb-2">
              <div className="flex items-center gap-2">
                <Dna className="h-4 w-4 text-[#967D63]" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-[#40382F]">
                  1. Physical Traits (Columns 1–15)
                </h2>
              </div>
              <span className="text-[11px] text-[#827568]/80">
                {filteredPhysicalIndices.length} traits visible
              </span>
            </div>

            {filteredPhysicalIndices.length === 0 ? (
              <p className="text-xs text-[#827568]/80 italic py-2">
                No physical traits match &quot;{traitFilterQuery}&quot;.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {filteredPhysicalIndices.map((tIdx) => {
                  const trait = currentMeta.traits[tIdx];
                  const selectedVal = traitSelections[trait.name] || '';

                  return (
                    <div key={trait.name} className="space-y-1">
                      <label
                        htmlFor={`trait-${tIdx}`}
                        className="block text-[11px] font-medium text-[#40382F] truncate"
                        title={trait.name}
                      >
                        {trait.name}
                      </label>
                      <select
                        id={`trait-${tIdx}`}
                        value={selectedVal}
                        onChange={(e) => handleTraitChange(trait.name, e.target.value)}
                        className="w-full rounded border border-[#C3A989]/50 bg-white px-2 py-1 text-xs text-[#40382F] truncate focus:border-[#967D63] focus:outline-hidden"
                      >
                        <option value="">— Unknown / Missing —</option>
                        {trait.levels.map((lvl) => (
                          <option key={lvl} value={lvl}>
                            {lvl}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Trait Form Section 2: Physiological & Lifestyle Traits (15..28) */}
          <div className="paper-card p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E8DED1] pb-2">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-[#967D63]" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-[#40382F]">
                  2. Physiological &amp; Lifestyle Traits (Columns 16–29)
                </h2>
              </div>
              <span className="text-[11px] text-[#827568]/80">
                {filteredPhysiologicalIndices.length} traits visible
              </span>
            </div>

            {filteredPhysiologicalIndices.length === 0 ? (
              <p className="text-xs text-[#827568]/80 italic py-2">
                No physiological traits match &quot;{traitFilterQuery}&quot;.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {filteredPhysiologicalIndices.map((tIdx) => {
                  const trait = currentMeta.traits[tIdx];
                  const selectedVal = traitSelections[trait.name] || '';

                  return (
                    <div key={trait.name} className="space-y-1">
                      <label
                        htmlFor={`trait-${tIdx}`}
                        className="block text-[11px] font-medium text-[#40382F] truncate"
                        title={trait.name}
                      >
                        {trait.name}
                      </label>
                      <select
                        id={`trait-${tIdx}`}
                        value={selectedVal}
                        onChange={(e) => handleTraitChange(trait.name, e.target.value)}
                        className="w-full rounded border border-[#C3A989]/50 bg-white px-2 py-1 text-xs text-[#40382F] truncate focus:border-[#967D63] focus:outline-hidden"
                      >
                        <option value="">— Unknown / Missing —</option>
                        {trait.levels.map((lvl) => (
                          <option key={lvl} value={lvl}>
                            {lvl}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Secondary Bottom Action Bar below traits */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#F3EADF]/65 p-4 rounded-lg border border-[#E8DED1]">
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-[#827568]">
                <span className="font-semibold text-[#40382F]">{enteredTraitsCount}</span> / {currentMeta.traits.length} traits selected
              </span>
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1 rounded border border-[#C3A989]/50 bg-white px-2.5 py-1.5 text-xs font-medium text-[#40382F] hover:bg-[#E8DED1]/70 transition"
              >
                <RotateCcw className="h-3 w-3" />
                Clear All
              </button>
            </div>

            <div className="flex items-center gap-2">
              {results && (
                <button
                  type="button"
                  onClick={() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                  className="inline-flex items-center gap-1.5 rounded border border-[#C3A989]/70 bg-[#E8DED1]/80 px-3 py-2 text-xs font-semibold text-[#967D63] hover:bg-[#E8DED1] transition"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                  Jump to Results
                </button>
              )}
              <button
                type="button"
                onClick={handleRunRetrieval}
                disabled={isRetrieving}
                className="inline-flex items-center gap-2 rounded bg-[#40382F] px-4 py-2 text-xs font-bold text-[#F3EADF] hover:bg-[#967D63] disabled:opacity-50 shadow-sm transition"
              >
                {isRetrieving ? (
                  <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Play className="h-3.5 w-3.5 fill-current" />
                )}
                Calculate Consensus &amp; Recommendations
              </button>
            </div>
          </div>

          {/* ================================================================ */}
          {/* RESULTS PANEL: PREDICTION & RECOMMENDATIONS                      */}
          {/* ================================================================ */}
          {results && (
            <div ref={resultsRef} id="retrieval-results" className="space-y-6 pt-4 border-t border-[#E8DED1] scroll-mt-20">
              {/* Baseline Prior Explanation Banner if 0 traits entered */}
              {enteredTraitsCount === 0 && (
                <div className="rounded border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold text-amber-950">Baseline Cohort Prior Displayed (0 of {currentMeta.traits.length} Traits Entered)</p>
                    <p className="text-amber-800 leading-relaxed">
                      No patient physiological traits were selected. In the absence of individual phenotypic observations, retrieval distances reflect the unconditioned dataset baseline prior ({results.primaryConsensusClass}). Select specific traits above or load a clinical preset (Vata, Pitta, Kapha) to compute individualized phenotypic nearest neighbours.
                    </p>
                  </div>
                </div>
              )}
              {/* Mandatory R11 Research Prototype Banner */}
              <div className="rounded border border-[#C3A989]/50 bg-[#E8DED1]/80 p-3 text-xs text-[#40382F] flex items-center justify-between">
                <span className="font-medium">Notice: {R11_DISCLAIMER}</span>
                <span className="text-[11px] text-[#827568]">
                  Nearest-neighbour labels reflect database records only (Rule R10).
                </span>
              </div>

              {/* Patient Case Identity Banner */}
              <div className="paper-card p-4 hero-champagne-gradient text-white flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-white/25 border border-white/50 px-2.5 py-0.5 text-[10px] font-mono font-bold tracking-wider text-white backdrop-blur-sm uppercase">
                      Patient Record #{patientProfile.patientId}
                    </span>
                    <span className="text-xs text-[#F3EADF] font-medium">
                      {patientProfile.name || 'Anonymous Patient'} ({patientProfile.age || '—'} yrs · {patientProfile.gender})
                    </span>
                  </div>
                  {patientProfile.chiefComplaint && (
                    <p className="text-xs text-[#F3EADF]/85 italic">
                      &quot;{patientProfile.chiefComplaint}&quot;
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrintReport}
                    className="inline-flex items-center gap-1.5 rounded bg-white/20 hover:bg-white/30 border border-white/45 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition"
                  >
                    <Printer className="h-3.5 w-3.5 text-[#F3EADF]" />
                    Print / PDF Report
                  </button>
                  <button
                    type="button"
                    onClick={handleExportJSON}
                    className="inline-flex items-center gap-1.5 rounded bg-white text-[#40382F] hover:bg-[#F3EADF] px-3 py-1.5 text-xs font-semibold transition shadow-sm"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Export Case JSON
                  </button>
                </div>
              </div>

              {/* Executive Consensus Phenotype Prediction Card */}
              <div className="paper-card p-6 border-[#C3A989]/60 bg-gradient-to-r from-[#F3EADF]/70 via-white/80 to-[#E8DED1]/50 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E8DED1] pb-3">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#967D63]">
                      Historical Dataset Phenotype Consensus (kNN vote, k={kParam})
                    </span>
                    <h3 className="text-base font-bold text-[#40382F] flex items-center gap-2 mt-0.5">
                      <span>Predicted Constitutional Phenotype:</span>
                      <span
                        className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded text-sm font-bold text-white shadow-xs"
                        style={{ backgroundColor: DOSHA_PALETTE[results.primaryConsensusClass] || '#0F766E' }}
                      >
                        {results.primaryConsensusClass}
                        {results.literatureRecommendations?.sanskritName && (
                          <span className="opacity-80 text-xs font-normal">
                            ({results.literatureRecommendations.sanskritName})
                          </span>
                        )}
                      </span>
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-[#E8DED1] border border-[#C3A989]/70 px-3 py-1 text-xs font-bold text-[#40382F]">
                      {results.consensusConfidence}% Cohort Confidence
                    </span>
                  </div>
                </div>

                {/* Symmetrical Multi-Metric Consensus Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                  <div className="rounded-lg border border-[#E8DED1] bg-white p-3 space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#40382F]">Gower Consensus</span>
                      <span className="text-[10px] text-[#827568]/80">Mixed Categorical</span>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="font-medium text-[#40382F]">Winner: {results.gowerWinner}</span>
                      <span className="num font-semibold text-[#967D63]">
                        {results.gowerVote[results.gowerWinner] || 0} / {kParam} votes
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-[#E8DED1]/70 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#967D63] rounded-full transition-all duration-300"
                        style={{ width: `${((results.gowerVote[results.gowerWinner] || 0) / kParam) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="rounded-lg border border-[#E8DED1] bg-white p-3 space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#40382F]">Euclidean (mode-imp)</span>
                      <span className="text-[10px] text-[#827568]/80">One-Hot + Z-score</span>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="font-medium text-[#40382F]">Winner: {results.euclidWinner}</span>
                      <span className="num font-semibold text-[#40382F]">
                        {results.euclidVote[results.euclidWinner] || 0} / {kParam} votes
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-[#E8DED1]/70 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#40382F] rounded-full transition-all duration-300"
                        style={{ width: `${((results.euclidVote[results.euclidWinner] || 0) / kParam) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="rounded-lg border border-[#E8DED1] bg-white p-3 space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#40382F]">Cosine (mode-imp)</span>
                      <span className="text-[10px] text-[#827568]/80">Angular Distance</span>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="font-medium text-[#40382F]">Winner: {results.cosineWinner}</span>
                      <span className="num font-semibold text-[#40382F]">
                        {results.cosineVote[results.cosineWinner] || 0} / {kParam} votes
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-[#E8DED1]/70 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-600 rounded-full transition-all duration-300"
                        style={{ width: `${((results.cosineVote[results.cosineWinner] || 0) / kParam) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-[#827568] bg-[#F3EADF]/65 p-2.5 rounded border border-[#E8DED1]">
                  {results.metricsConsensusAgree ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-[#967D63] shrink-0" />
                      <span>
                        Full three-metric consensus: Gower, Euclidean, and Cosine all retrieve{' '}
                        <strong>{results.primaryConsensusClass}</strong> as the dominant plurality class.
                      </span>
                    </>
                  ) : (
                    <>
                      <Info className="h-4 w-4 text-amber-600 shrink-0" />
                      <span>
                        Metric divergence detected: Gower points to {results.gowerWinner}, Euclidean to{' '}
                        {results.euclidWinner}, and Cosine to {results.cosineWinner}.
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Continuous Tri-Dosha Prakriti Spectrum (Overcoming Discrete Bucketing) */}
              {results.triDoshaSpectrum && (
                <div className="paper-card p-5 space-y-3.5 border-l-4 border-l-[#967D63] bg-gradient-to-r from-[#F3EADF]/55 via-white to-[#E8DED1]/40">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E8DED1] pb-2">
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-[#40382F] flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-[#967D63]" />
                        <span>Continuous Tri-Dosha Prakriti Spectrum (Overcoming Discrete Bucketing)</span>
                      </h3>
                      <p className="text-[11px] text-[#827568]">
                        Distance-weighted kernel mixture over retrieved neighbours, quantifying constitution as continuous biological proportions.
                      </p>
                    </div>
                    <span className="rounded bg-[#E8DED1]/80 border border-[#C3A989]/50 px-2.5 py-0.5 text-xs font-bold text-[#967D63]">
                      Prakriti Mixture Analysis
                    </span>
                  </div>

                  {/* Multi-Dosha Horizontal Spectrum Bar */}
                  <div className="space-y-1.5">
                    <div className="flex h-4 w-full overflow-hidden rounded-full bg-[#E8DED1]/70 shadow-inner">
                      <div
                        className="transition-all duration-500 bg-sky-500"
                        style={{ width: `${results.triDoshaSpectrum.vata}%` }}
                        title={`Vata: ${results.triDoshaSpectrum.vata}%`}
                      />
                      <div
                        className="transition-all duration-500 bg-amber-500"
                        style={{ width: `${results.triDoshaSpectrum.pitta}%` }}
                        title={`Pitta: ${results.triDoshaSpectrum.pitta}%`}
                      />
                      <div
                        className="transition-all duration-500 bg-emerald-600"
                        style={{ width: `${results.triDoshaSpectrum.kapha}%` }}
                        title={`Kapha: ${results.triDoshaSpectrum.kapha}%`}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] font-medium pt-0.5">
                      <span className="text-sky-700 font-semibold flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-sky-500 inline-block shadow-2xs" />
                        Vata: {results.triDoshaSpectrum.vata}%
                      </span>
                      <span className="text-amber-700 font-semibold flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-500 inline-block shadow-2xs" />
                        Pitta: {results.triDoshaSpectrum.pitta}%
                      </span>
                      <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-600 inline-block shadow-2xs" />
                        Kapha: {results.triDoshaSpectrum.kapha}%
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Clinical Reliability, Missingness & Boundary Tie Index (Overcoming Incompleteness & Geometry Ambiguity) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Intake Completeness & Reliability */}
                <div className="paper-card p-4 space-y-2 border-t-2 border-t-[#967D63]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#40382F]">Observation Coverage</span>
                    <span className="rounded bg-[#E8DED1]/80 px-2 py-0.5 font-bold text-[#967D63] text-[11px]">
                      {results.confidenceRating} Confidence
                    </span>
                  </div>
                  <div className="text-sm font-bold text-[#40382F] num">
                    {results.traitCoveragePct}% ({enteredTraitsCount} / {currentMeta.traits.length} traits)
                  </div>
                  <p className="text-[11px] text-[#827568] leading-snug">
                    {results.confidenceNote}
                  </p>
                </div>

                {/* Shannon Phenotypic Ambiguity */}
                <div className="paper-card p-4 space-y-2 border-t-2 border-t-[#C3A989]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#40382F]">Neighborhood Ambiguity</span>
                    <span className="text-[11px] text-[#827568]/80 font-mono">H / H_max</span>
                  </div>
                  <div className="text-sm font-bold text-[#40382F] num">
                    {results.ambiguityPct}% Ambiguity
                  </div>
                  <p className="text-[11px] text-[#827568] leading-snug">
                    {results.ambiguityPct < 30
                      ? 'High consensus: top-k neighbors strongly cluster into a single dominant phenotype.'
                      : 'Mixed constitutional neighborhood: multiple Dosha phenotypes present in top-k.'}
                  </p>
                </div>

                {/* Boundary Tie Analysis */}
                <div className="paper-card p-4 space-y-2 border-t-2 border-t-amber-500">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#40382F]">Boundary Tie Analysis</span>
                    <span className="text-[11px] text-[#827568]/80">Rank k={kParam}</span>
                  </div>
                  <div className="text-sm font-bold text-[#40382F] num">
                    {results.boundaryTieCount > 1
                      ? `${results.boundaryTieCount} Records Tied`
                      : 'Unique Boundary (0 Ties)'}
                  </div>
                  <p className="text-[11px] text-[#827568] leading-snug">
                    {results.boundaryTieCount > 1
                      ? `Equivalence class at boundary: ${results.boundaryTieCount} records share identical distance; stable index sort applied (R13).`
                      : 'Strict distance threshold: top-k cut-off does not split an equivalence class.'}
                  </p>
                </div>
              </div>

              {/* Imputation Invariance / Divergence Banner */}
              {results.imputationAnalysis && (
                <div className="paper-card p-4 border border-[#C3A989]/40 bg-[#F3EADF]/65 flex items-start gap-3">
                  <Info className="h-4 w-4 text-[#967D63] shrink-0 mt-0.5" />
                  <div className="space-y-0.5 text-xs text-[#40382F]">
                    <span className="font-semibold text-[#40382F]">
                      Imputation Invariance Analysis (Mitigating Missingness Bias):
                    </span>
                    <p className="leading-relaxed">
                      {results.imputationAnalysis.divergenceNote}
                    </p>
                  </div>
                </div>
              )}

              {/* Phenotypic Concordance & Trait Deviations Breakdown */}
              <div className="paper-card p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E8DED1] pb-2">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[#40382F] flex items-center gap-2">
                      <Activity className="h-4 w-4 text-[#967D63]" />
                      <span>Phenotypic Concordance &amp; Archetype Deviations</span>
                    </h3>
                    <p className="text-[11px] text-[#827568]">
                      Compares patient traits against the statistical archetype mode of{' '}
                      {results.primaryConsensusClass} in the 1,200 cohort.
                    </p>
                  </div>
                  <span className="rounded bg-[#E8DED1]/80 border border-[#C3A989]/50 px-2.5 py-0.5 text-xs font-bold text-[#967D63]">
                    {results.concordancePct}% Archetype Alignment
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Concordant Traits */}
                  <div className="rounded border border-emerald-200 bg-emerald-50/30 p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between text-xs border-b border-emerald-100 pb-1.5">
                      <span className="font-semibold text-emerald-900 flex items-center gap-1.5">
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        Concordant Archetype Traits ({results.concordantTraits.length})
                      </span>
                      <span className="text-[10px] text-emerald-700">Aligned with historical mode</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
                      {results.concordantTraits.map((ct) => (
                        <span
                          key={ct.trait}
                          className="inline-flex items-center gap-1 rounded bg-white px-2 py-0.5 text-[11px] font-medium text-emerald-900 border border-emerald-200 shadow-2xs"
                          title={`${ct.trait}: ${ct.level} (${ct.percent}% of cohort)`}
                        >
                          <span className="text-[#827568]">{ct.trait}:</span>
                          <strong>{ct.level}</strong>
                        </span>
                      ))}
                      {results.concordantTraits.length === 0 && (
                        <span className="text-xs text-[#827568]/80 italic">No traits matching archetype mode.</span>
                      )}
                    </div>
                  </div>

                  {/* Atypical Deviations */}
                  <div className="rounded border border-amber-200 bg-amber-50/30 p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between text-xs border-b border-amber-100 pb-1.5">
                      <span className="font-semibold text-amber-900 flex items-center gap-1.5">
                        <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                        Atypical Deviations &amp; Secondary Traits ({results.atypicalTraits.length})
                      </span>
                      <span className="text-[10px] text-amber-700">Potential secondary Dosha (Vikriti)</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
                      {results.atypicalTraits.map((at) => (
                        <span
                          key={at.trait}
                          className="inline-flex items-center gap-1 rounded bg-white px-2 py-0.5 text-[11px] text-amber-900 border border-amber-200 shadow-2xs"
                          title={`Patient: ${at.patientLevel} vs Typical Mode: ${at.archetypeLevel} (${at.percent}%)`}
                        >
                          <span className="text-[#827568]">{at.trait}:</span>
                          <strong className="text-[#40382F]">{at.patientLevel}</strong>
                          <span className="text-[10px] text-amber-700">(mode: {at.archetypeLevel})</span>
                        </span>
                      ))}
                      {results.atypicalTraits.length === 0 && (
                        <span className="text-xs text-[#827568]/80 italic">No atypical deviations observed.</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Classical Literature-Guided Lifestyle & Dietary Recommendations */}
              {results.literatureRecommendations && (
                <div className="paper-card p-6 space-y-5 border-[#C3A989]/60 bg-gradient-to-b from-white/80 to-[#F3EADF]/50">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E8DED1] pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-[#967D63]" />
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#40382F]">
                          Constitutional Harmonization &amp; Recommendations (Traditional Literature Reference)
                        </h3>
                      </div>
                      <p className="text-[11px] text-[#827568] mt-0.5">
                        Synthesized from classical Charaka Samhita and Ashtanga Hridaya principles for{' '}
                        <strong>{results.primaryConsensusClass}</strong> constitution.
                      </p>
                    </div>
                    <span className="rounded bg-[#E8DED1]/85 border border-[#C3A989]/70 px-2 py-0.5 text-[10px] font-semibold text-[#40382F]">
                      Non-Prescriptive Educational Reference
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Ahara (Dietary Guidance) */}
                    <div className="rounded border border-[#E8DED1] bg-white p-4 space-y-3 shadow-2xs">
                      <div className="flex items-center justify-between border-b border-[#E8DED1]/70 pb-2">
                        <span className="text-xs font-bold text-[#40382F] flex items-center gap-1.5">
                          <Heart className="h-3.5 w-3.5 text-rose-600" />
                          Ahara (Dietary Harmonization)
                        </span>
                        <span className="text-[10px] text-[#827568]">Thermal &amp; Taste Balance</span>
                      </div>

                      <div className="space-y-1.5 text-xs text-[#40382F]">
                        <div>
                          <strong className="text-[#40382F]">Favored Tastes:</strong>{' '}
                          <span className="text-[#967D63] font-medium">
                            {results.literatureRecommendations.ahara.favoredTastes}
                          </span>
                        </div>
                        <div>
                          <strong className="text-[#40382F]">Minimize Tastes:</strong>{' '}
                          <span className="text-rose-700 font-medium">
                            {results.literatureRecommendations.ahara.avoidTastes}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1.5 pt-1">
                        <span className="text-[11px] font-semibold text-[#40382F]">Dietary Principles:</span>
                        <ul className="list-disc pl-4 space-y-1 text-xs text-[#827568]">
                          {results.literatureRecommendations.ahara.dietaryPrinciples.map((dp, i) => (
                            <li key={i}>{dp}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="space-y-1 pt-1 border-t border-[#E8DED1]/70">
                        <span className="text-[11px] font-semibold text-emerald-800">Key Foods to Favor:</span>
                        <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-[#827568]">
                          {results.literatureRecommendations.ahara.foodsToFavor.slice(0, 4).map((f, i) => (
                            <li key={i}>{f}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Vihara (Lifestyle & Dinacharya) */}
                    <div className="rounded border border-[#E8DED1] bg-white p-4 space-y-3 shadow-2xs">
                      <div className="flex items-center justify-between border-b border-[#E8DED1]/70 pb-2">
                        <span className="text-xs font-bold text-[#40382F] flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                          Vihara (Lifestyle &amp; Dinacharya Routine)
                        </span>
                        <span className="text-[10px] text-[#827568]">Circadian &amp; Physical Balance</span>
                      </div>

                      <div className="text-xs text-[#40382F] space-y-1">
                        <div>
                          <strong className="text-[#40382F]">Circadian Timing:</strong>{' '}
                          <span className="text-[#827568]">
                            {results.literatureRecommendations.vihara.circadianRoutine}
                          </span>
                        </div>
                        <div>
                          <strong className="text-[#40382F]">Physical Activity:</strong>{' '}
                          <span className="text-[#827568]">
                            {results.literatureRecommendations.vihara.exerciseGuidelines}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1.5 pt-1">
                        <span className="text-[11px] font-semibold text-[#40382F]">Daily Regimen Rituals:</span>
                        <ul className="list-disc pl-4 space-y-1 text-xs text-[#827568]">
                          {results.literatureRecommendations.vihara.dailyRegimen.map((dr, i) => (
                            <li key={i}>{dr}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="space-y-1 pt-1 border-t border-[#E8DED1]/70">
                        <span className="text-[11px] font-semibold text-sky-800">Ritucharya (Seasonal Advice):</span>
                        <p className="text-[11px] text-[#827568] leading-relaxed">
                          {results.literatureRecommendations.ritucharya.seasonalAdvice}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Trait-Specific Guidance */}
                  {results.traitSpecificGuidance.length > 0 && (
                    <div className="pt-2 border-t border-[#E8DED1] space-y-2">
                      <span className="text-xs font-semibold text-[#40382F] flex items-center gap-1.5">
                        <Stethoscope className="h-3.5 w-3.5 text-[#967D63]" />
                        Personalized Clinical Adjustments (Based on Entered Functional Traits)
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {results.traitSpecificGuidance.map((tg, idx) => (
                          <div
                            key={idx}
                            className="rounded border border-[#E8DED1] bg-[#F3EADF]/70 p-2.5 text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-[#40382F]">{tg.title}</span>
                              <span className="text-[10px] text-[#967D63]">{tg.category}</span>
                            </div>
                            <p className="text-[11px] text-[#827568] leading-relaxed">
                              {tg.recommendation}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Top Matching Historical Reference Cases */}
              <div className="paper-card p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E8DED1] pb-2">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[#40382F]">
                      Nearest Reference Patient Cases from Historical Cohort
                    </h3>
                    <p className="text-[11px] text-[#827568]">
                      The closest matching historical cases from the 1,200 database rows under Gower similarity.
                    </p>
                  </div>
                  <span className="text-[11px] text-[#827568]">
                    Outputs labelled strictly as &quot;Labels of the nearest dataset records&quot; (Rule R10)
                  </span>
                </div>

                <div className="space-y-2.5">
                  {results.topHistoricalMatches.map((match) => {
                    const isExpanded = expandedHistoricalIdx === match.recordIndex;
                    return (
                      <div
                        key={match.recordIndex}
                        className="rounded border border-[#E8DED1] bg-white p-3 space-y-2 transition hover:border-[#C3A989]/50"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#E8DED1]/70 num text-xs font-bold text-[#40382F]">
                              #{match.rank}
                            </span>
                            <div>
                              <span className="num font-semibold text-[#40382F]">
                                Record #{match.recordIndex}
                              </span>
                              <span className="text-[#827568]/80 text-xs ml-2">
                                (Gower metric: <strong className="num text-[#40382F]">{match.distance.toFixed(4)}</strong>)
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <span
                              className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold text-white"
                              style={{ backgroundColor: DOSHA_PALETTE[match.label] || '#666' }}
                            >
                              {match.label}
                            </span>
                            <span className="rounded bg-[#E8DED1]/80 border border-[#C3A989]/50 px-2 py-0.5 text-xs font-bold text-[#967D63]">
                              {match.similarityPct}% Similarity
                            </span>
                            <span className="text-xs text-[#827568] num">
                              {match.matchingTraitsCount} / 29 traits
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedHistoricalIdx(isExpanded ? null : match.recordIndex)
                              }
                              className="text-xs text-[#967D63] hover:underline font-medium inline-flex items-center gap-0.5"
                            >
                              {isExpanded ? 'Hide' : 'Inspect'}
                              {isExpanded ? (
                                <ChevronDown className="h-3.5 w-3.5" />
                              ) : (
                                <ChevronRight className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Expandable Trait Inspector */}
                        {isExpanded && (
                          <div className="pt-2 border-t border-[#E8DED1]/70 max-h-56 overflow-y-auto">
                            <table className="w-full text-left text-xs">
                              <thead>
                                <tr className="text-[#827568] border-b border-[#E8DED1]/70 text-[11px]">
                                  <th className="py-1">Trait</th>
                                  <th className="py-1">Patient Value</th>
                                  <th className="py-1">Reference #{match.recordIndex}</th>
                                  <th className="py-1 text-center">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#E8DED1]/40">
                                {match.traitMatches.map((tm) => (
                                  <tr key={tm.trait} className="hover:bg-[#F3EADF]/65">
                                    <td className="py-1 font-medium text-[#40382F]">{tm.trait}</td>
                                    <td className="py-1 text-[#827568]">{tm.userLevel}</td>
                                    <td className="py-1 text-[#827568]">{tm.recLevel}</td>
                                    <td className="py-1 text-center">
                                      {tm.isMatch ? (
                                        <span className="rounded bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.2 text-[10px] font-semibold">
                                          Match
                                        </span>
                                      ) : (
                                        <span className="rounded bg-[#E8DED1]/70 text-[#827568] px-1.5 py-0.2 text-[10px]">
                                          Diff
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Side-by-Side Metric Nearest Neighbors Table */}
              <div className="paper-card p-5 space-y-4 overflow-x-auto">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E8DED1] pb-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#40382F]">
                    Retrieved Nearest Neighbours (Ranked 1 to {kParam})
                  </h3>
                  <span className="text-[11px] text-[#827568]">
                    Outputs labelled strictly as &quot;Labels of the nearest dataset records&quot; (Rule R10)
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Gower Column */}
                  <div className="rounded border border-[#E8DED1] p-3 space-y-2">
                    <div className="flex items-center justify-between border-b border-[#E8DED1]/70 pb-1">
                      <span className="text-xs font-semibold text-[#967D63]">Gower Distance</span>
                      <span className="text-[10px] text-[#827568]/80">Observed-trait mean</span>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      {results.gower.indices.map((idx, rank) => {
                        const dist = results.gower.distances[rank];
                        const cLabel = currentMeta.classes[currentMeta.labels[idx]];
                        const color = DOSHA_PALETTE[cLabel] || '#666';

                        return (
                          <div
                            key={idx}
                            className="flex items-center justify-between rounded bg-[#F3EADF]/65 px-2 py-1"
                          >
                            <span className="num font-medium text-[#827568]">
                              #{rank + 1} (rec #{idx})
                            </span>
                            <div className="flex items-center gap-2">
                              <span
                                className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold text-white"
                                style={{ backgroundColor: color }}
                              >
                                {cLabel}
                              </span>
                              <span className="num text-[#40382F]">{dist.toFixed(4)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Euclidean Mode Impute Column */}
                  <div className="rounded border border-[#E8DED1] p-3 space-y-2">
                    <div className="flex items-center justify-between border-b border-[#E8DED1]/70 pb-1">
                      <span className="text-xs font-semibold text-[#40382F]">
                        Euclidean (mode-impute)
                      </span>
                      <span className="text-[10px] text-[#827568]/80">One-hot + z-score</span>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      {results.euclidMode.indices.map((idx, rank) => {
                        const dist = results.euclidMode.distances[rank];
                        const cLabel = currentMeta.classes[currentMeta.labels[idx]];
                        const color = DOSHA_PALETTE[cLabel] || '#666';

                        return (
                          <div
                            key={idx}
                            className="flex items-center justify-between rounded bg-[#F3EADF]/65 px-2 py-1"
                          >
                            <span className="num font-medium text-[#827568]">
                              #{rank + 1} (rec #{idx})
                            </span>
                            <div className="flex items-center gap-2">
                              <span
                                className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold text-white"
                                style={{ backgroundColor: color }}
                              >
                                {cLabel}
                              </span>
                              <span className="num text-[#40382F]">{dist.toFixed(4)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Cosine Mode Impute Column */}
                  <div className="rounded border border-[#E8DED1] p-3 space-y-2">
                    <div className="flex items-center justify-between border-b border-[#E8DED1]/70 pb-1">
                      <span className="text-xs font-semibold text-[#40382F]">
                        Cosine (mode-impute)
                      </span>
                      <span className="text-[10px] text-[#827568]/80">1 - cosine similarity</span>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      {results.cosineMode.indices.map((idx, rank) => {
                        const dist = results.cosineMode.distances[rank];
                        const cLabel = currentMeta.classes[currentMeta.labels[idx]];
                        const color = DOSHA_PALETTE[cLabel] || '#666';

                        return (
                          <div
                            key={idx}
                            className="flex items-center justify-between rounded bg-[#F3EADF]/65 px-2 py-1"
                          >
                            <span className="num font-medium text-[#827568]">
                              #{rank + 1} (rec #{idx})
                            </span>
                            <div className="flex items-center gap-2">
                              <span
                                className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold text-white"
                                style={{ backgroundColor: color }}
                              >
                                {cLabel}
                              </span>
                              <span className="num text-[#40382F]">{dist.toFixed(4)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Additional observed-only columns when missing > 0 */}
                {results.hasMissing && results.euclidObs && results.cosineObs && (
                  <div className="pt-2 border-t border-[#E8DED1]/70 space-y-2">
                    <span className="text-[11px] font-medium text-[#827568]">
                      Observed-only variants (active due to {results.missingTraitsCount} unselected
                      traits):
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="rounded border border-dashed border-[#C3A989]/50 p-2.5 text-xs space-y-1">
                        <div className="flex justify-between text-[11px] font-semibold text-[#40382F]">
                          <span>Euclidean (observed-only)</span>
                          <span className="text-[#827568]/80">No imputation</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {results.euclidObs.indices.map((idx, r) => (
                            <span
                              key={idx}
                              className="rounded bg-[#E8DED1]/70 px-1.5 py-0.5 text-[11px] num"
                            >
                              #{r + 1}: rec {idx} ({results.euclidObs.distances[r].toFixed(3)})
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="rounded border border-dashed border-[#C3A989]/50 p-2.5 text-xs space-y-1">
                        <div className="flex justify-between text-[11px] font-semibold text-[#40382F]">
                          <span>Cosine (observed-only)</span>
                          <span className="text-[#827568]/80">Identical rank to Gower</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {results.cosineObs.indices.map((idx, r) => (
                            <span
                              key={idx}
                              className="rounded bg-[#E8DED1]/70 px-1.5 py-0.5 text-[11px] num"
                            >
                              #{r + 1}: rec {idx} ({results.cosineObs.distances[r].toFixed(3)})
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Class Vote Chart: Labels of nearest dataset records */}
              <div className="paper-card p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E8DED1] pb-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#40382F]">
                    Labels of the Nearest Dataset Records (kNN vote, k={kParam})
                  </h3>
                  <span className="text-[11px] text-[#827568]">
                    Direct count among top-{kParam} retrieved records (Rule R10)
                  </span>
                </div>

                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={results.voteChartData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#E8DED1" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11, fill: '#555' }}
                        interval={0}
                        angle={-15}
                        textAnchor="end"
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 10, fill: '#666' }}
                        domain={[0, kParam]}
                      />
                      <RechartsTooltip />
                      <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                      <Bar dataKey="Gower" fill="#967D63" />
                      <Bar dataKey="Euclidean (mode-imp)" fill="#40382F" />
                      <Bar dataKey="Cosine (mode-imp)" fill="#C3A989" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* METRIC DIAGNOSTICS & MDS TAB (activeTab === 'diagnostics')           */}
      {/* ==================================================================== */}
      {activeTab === 'diagnostics' && (
        <div className="space-y-6">
          {!results && (
            <div className="paper-card p-8 text-center space-y-3 bg-[#F3EADF]/65">
              <Scale className="mx-auto h-8 w-8 text-[#827568]/80" />
              <h3 className="text-sm font-semibold text-[#40382F]">
                No Active Query Computed Yet
              </h3>
              <p className="text-xs text-[#827568] max-w-md mx-auto">
                Select traits or load a preset in the Patient Intake tab, then click &quot;Run Retrieval&quot;
                to inspect multi-metric distance projections and cluster assignments here.
              </p>
              <button
                type="button"
                onClick={() => {
                  handleLoadPreset('dual');
                  setActiveTab('single');
                }}
                className="rounded bg-[#40382F] px-3.5 py-1.5 text-xs font-semibold text-[#F3EADF] hover:bg-[#967D63]"
              >
                Load Preset in Intake Studio
              </button>
            </div>
          )}

          {results && (
            <div className="space-y-6">
              {/* Trait Match Matrix */}
              <div className="paper-card p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E8DED1] pb-2">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[#40382F]">
                      Trait Match Matrix (Query vs Gower Top-{kParam} Neighbours)
                    </h3>
                    <p className="text-[11px] text-[#827568]">
                      Inspect feature-level agreement with each retrieved record
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-[#827568]">Sort rows by:</span>
                    <button
                      type="button"
                      onClick={() => setMatrixSortBy('order')}
                      className={`px-2 py-0.5 rounded border text-[11px] ${
                        matrixSortBy === 'order'
                          ? 'bg-[#40382F] text-white border-[#40382F]'
                          : 'bg-white text-[#827568] border-[#E8DED1]'
                      }`}
                    >
                      Trait Order
                    </button>
                    <button
                      type="button"
                      onClick={() => setMatrixSortBy('mismatches')}
                      className={`px-2 py-0.5 rounded border text-[11px] ${
                        matrixSortBy === 'mismatches'
                          ? 'bg-[#40382F] text-white border-[#40382F]'
                          : 'bg-white text-[#827568] border-[#E8DED1]'
                      }`}
                    >
                      Most Mismatches
                    </button>
                  </div>
                </div>

                <div className="max-h-96 overflow-y-auto border border-[#E8DED1] rounded">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#F3EADF]/65 sticky top-0 border-b border-[#E8DED1] z-10">
                      <tr>
                        <th className="p-2 font-medium text-[#40382F] w-1/4">Trait</th>
                        <th className="p-2 font-medium text-[#40382F] w-1/4">Query Input</th>
                        {results.gower.indices.map((idx, r) => (
                          <th key={idx} className="p-2 font-medium text-[#827568] num text-center">
                            #{r + 1} (rec {idx})
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E8DED1]/70">
                      {traitMatrixRows.map((row) => (
                        <tr key={row.traitName} className="hover:bg-[#F3EADF]/65">
                          <td className="p-2 font-medium text-[#40382F]">{row.traitName}</td>
                          <td className="p-2 text-[#827568]">
                            {row.isQueryKnown ? (
                              <span className="font-medium text-[#40382F]">{row.queryLevel}</span>
                            ) : (
                              <span className="text-[#827568]/80 italic">Unknown</span>
                            )}
                          </td>
                          {row.neighborCols.map((col, cIdx) => (
                            <td key={cIdx} className="p-2 text-center">
                              {col.status === 'match' && (
                                <span
                                  className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-[#E8DED1]/80 text-[#967D63] font-medium border border-[#C3A989]/50"
                                  title={col.text}
                                >
                                  Match
                                </span>
                              )}
                              {col.status === 'mismatch' && (
                                <span
                                  className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-rose-50 text-rose-800 font-medium border border-rose-200"
                                  title={col.text}
                                >
                                  Diff
                                </span>
                              )}
                              {col.status === 'unknown' && (
                                <span className="text-[#C3A989]" title={col.text}>
                                  —
                                </span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Cluster Assignment Card */}
              {resolvedClusterData && (
                <div className="paper-card p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E8DED1] pb-2">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#40382F]">
                        Unsupervised Cluster Assignment
                      </h3>
                      <p className="text-[11px] text-[#827568]">
                        Query assigned to cluster with smallest mean distance to members
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <select
                        value={clusteringConfig.metric}
                        onChange={(e) =>
                          setClusteringConfig((prev) => ({ ...prev, metric: e.target.value }))
                        }
                        className="rounded-lg border border-[#C3A989]/50 px-2.5 py-1 bg-white/80 text-xs text-[#40382F]"
                      >
                        <option value="gower">Gower</option>
                        <option value="euclidean">Euclidean</option>
                        <option value="cosine">Cosine</option>
                      </select>

                      <select
                        value={clusteringConfig.linkage}
                        onChange={(e) =>
                          setClusteringConfig((prev) => ({ ...prev, linkage: e.target.value }))
                        }
                        className="rounded-lg border border-[#C3A989]/50 px-2.5 py-1 bg-white/80 text-xs text-[#40382F]"
                      >
                        <option value="average">Average Linkage</option>
                        <option value="complete">Complete Linkage</option>
                      </select>

                      <select
                        value={clusteringConfig.k}
                        onChange={(e) =>
                          setClusteringConfig((prev) => ({
                            ...prev,
                            k: Number(e.target.value),
                          }))
                        }
                        className="rounded-lg border border-[#C3A989]/50 px-2.5 py-1 bg-white/80 text-xs num text-[#40382F]"
                      >
                        {[3, 4, 5, 6, 7, 8].map((kv) => (
                          <option key={kv} value={kv}>
                            k={kv}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-[#C3A989]/50 bg-[#F3EADF]/70 p-4 space-y-2">
                      <span className="text-xs font-bold text-[#40382F]">
                        Assigned Cluster: Cluster {resolvedClusterData.assignedCluster + 1}
                      </span>
                      <p className="text-xs text-[#827568] leading-relaxed">
                        Nearest cluster among {resolvedClusterData.k} partitions (cluster
                        size:{' '}
                        {
                          resolvedClusterData.clusterSizes[
                            resolvedClusterData.assignedCluster
                          ]
                        }{' '}
                        records). ARI against dataset labels:{' '}
                        <span className="num font-semibold text-[#40382F]">
                          {resolvedClusterData.ari.toFixed(4)}
                        </span>
                        .
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/80 bg-white/60 p-3 space-y-2 text-xs">
                      <span className="font-semibold text-[#40382F]">
                        Mean distance to cluster members:
                      </span>
                      <div className="space-y-1">
                        {resolvedClusterData.meanDistances.map((d, cIdx) => (
                          <div
                            key={cIdx}
                            className={`flex items-center justify-between px-2.5 py-1 rounded-lg ${
                              cIdx === resolvedClusterData.assignedCluster
                                ? 'bg-[#E8DED1] font-bold text-[#40382F]'
                                : 'text-[#827568]'
                            }`}
                          >
                            <span>Cluster {cIdx + 1}</span>
                            <span className="num">{d.toFixed(4)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 2D MDS Projection Map */}
              {dataAssets.embeddings && (
                <div className="paper-card p-5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E8DED1] pb-2">
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-[#40382F]">
                        2D Multidimensional Scaling (MDS) Map
                      </h3>
                      <p className="text-[11px] text-[#827568]">
                        PCoA projection of 1,200 database records with query placement at neighbour centroid
                      </p>
                    </div>
                    <span className="text-[10px] text-[#827568]/80">
                      Query placement: centroid of top-{kParam} neighbours
                    </span>
                  </div>

                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E8DED1" />
                        <XAxis type="number" dataKey="x" domain={[0, 1]} hide />
                        <YAxis type="number" dataKey="y" domain={[0, 1]} hide />
                        <ZAxis range={[25, 25]} />
                        <RechartsTooltip
                          cursor={{ strokeDasharray: '3 3' }}
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const pt = payload[0].payload;
                              return (
                                <div className="rounded bg-white p-2 border border-[#E8DED1] text-xs shadow-sm">
                                  <p className="font-semibold">{pt.name}</p>
                                  {pt.cls && <p className="text-[11px] text-[#827568]">Class: {pt.cls}</p>}
                                </div>
                              );
                            }
                            return null;
                          }}
                        />

                        <Scatter
                          name="Database Records"
                          data={(
                            dataAssets.embeddings.datasets?.[datasetMode]?.[clusteringConfig.metric] || []
                          ).map((coord, idx) => ({
                            x: coord[0],
                            y: coord[1],
                            name: `Record #${idx}`,
                            cls: currentMeta.classes[currentMeta.labels[idx]],
                            color: DOSHA_PALETTE[currentMeta.classes[currentMeta.labels[idx]]] || '#888',
                          }))}
                        >
                          {(
                            dataAssets.embeddings.datasets?.[datasetMode]?.[clusteringConfig.metric] || []
                          ).map((_, idx) => {
                            const cLabel = currentMeta.classes[currentMeta.labels[idx]];
                            const isTopNeighbor = results.gower.indices.includes(idx);
                            return (
                              <Cell
                                key={idx}
                                fill={DOSHA_PALETTE[cLabel] || '#888'}
                                opacity={isTopNeighbor ? 1 : 0.4}
                                stroke={isTopNeighbor ? '#000' : 'none'}
                                strokeWidth={isTopNeighbor ? 1.5 : 0}
                              />
                            );
                          })}
                        </Scatter>

                        {resolvedQueryCoord && (
                          <Scatter
                            name="Current Query (Centroid)"
                            data={[
                              {
                                x: resolvedQueryCoord[0],
                                y: resolvedQueryCoord[1],
                                name: 'Current Query (Approximate Centroid)',
                                cls: 'Query',
                              },
                            ]}
                            fill="#967D63"
                            shape="star"
                          />
                        )}
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* BATCH MODE TAB (activeTab === 'batch')                               */}
      {/* ==================================================================== */}
      {activeTab === 'batch' && (
        <div className="space-y-6">
          <div className="paper-card p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E8DED1] pb-3">
              <div>
                <h2 className="text-sm font-semibold text-[#40382F]">
                  {'Batch Case Retrieval (Max 1,000 Rows)'}
                </h2>
                <p className="text-xs text-[#827568]">
                  Upload a CSV file containing multiple patient cases to evaluate distance rankings
                  in batch.
                </p>
              </div>

              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="inline-flex items-center gap-1.5 rounded border border-[#C3A989]/50 bg-white px-3 py-1.5 text-xs font-medium text-[#40382F] hover:bg-[#F3EADF]/65 shadow-sm transition"
              >
                <Download className="h-3.5 w-3.5 text-[#827568]" />
                Download CSV Template
              </button>
            </div>

            {/* Upload Area */}
            <div className="rounded border-2 border-dashed border-[#C3A989]/50 p-6 text-center space-y-3 bg-[#F3EADF]/65">
              <Upload className="mx-auto h-8 w-8 text-[#827568]/80" />
              <div>
                <p className="text-xs font-medium text-[#40382F]">
                  Select a CSV file to validate and run
                </p>
                <p className="text-[11px] text-[#827568]/80">
                  Client-side evaluation: no files or data uploaded to external servers.
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded bg-white border border-[#C3A989]/50 px-3 py-1.5 text-xs font-medium text-[#40382F] hover:bg-[#F3EADF]/65 shadow-sm"
              >
                {batchFile ? `Selected: ${batchFile.name}` : 'Browse CSV File'}
              </button>
            </div>

            {/* Validation Errors */}
            {batchErrors.length > 0 && (
              <div className="rounded border border-red-200 bg-red-50 p-4 space-y-2 text-xs text-red-900">
                <span className="font-semibold">
                  CSV Validation Issues ({batchErrors.length} found):
                </span>
                <ul className="list-disc pl-5 space-y-1 max-h-48 overflow-y-auto">
                  {batchErrors.slice(0, 10).map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                  {batchErrors.length > 10 && (
                    <li>...and {batchErrors.length - 10} more errors.</li>
                  )}
                </ul>
              </div>
            )}

            {/* Ready to Run */}
            {batchParsedRows.length > 0 && batchErrors.length === 0 && (
              <div className="flex items-center justify-between bg-[#E8DED1]/80 border border-[#C3A989]/50 p-3 rounded text-xs text-[#40382F]">
                <span>
                  Validation passed: <strong className="num">{batchParsedRows.length}</strong> case
                  rows ready for client-side batch processing.
                </span>
                <button
                  type="button"
                  disabled={batchRunning}
                  onClick={handleRunBatch}
                  className="rounded bg-[#40382F] px-3.5 py-1.5 font-semibold text-[#F3EADF] hover:bg-[#967D63] disabled:opacity-50"
                >
                  {batchRunning ? 'Computing...' : 'Run Batch Retrieval'}
                </button>
              </div>
            )}

            {/* Batch Results Table */}
            {batchResults && (
              <div className="space-y-4 pt-3 border-t border-[#E8DED1]">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#40382F]">
                    Batch Output ({batchResults.length} Cases Evaluated)
                  </h3>
                  <button
                    type="button"
                    onClick={handleDownloadBatchResults}
                    className="inline-flex items-center gap-1.5 rounded border border-[#C3A989]/50 bg-white px-2.5 py-1 text-xs font-medium text-[#40382F] hover:bg-[#F3EADF]/65"
                  >
                    <Download className="h-3.5 w-3.5 text-[#827568]" />
                    Download Results CSV
                  </button>
                </div>

                <div className="max-h-80 overflow-y-auto border border-[#E8DED1] rounded">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#F3EADF]/65 sticky top-0 border-b border-[#E8DED1]">
                      <tr>
                        <th className="p-2 font-medium text-[#40382F]">Row #</th>
                        <th className="p-2 font-medium text-[#40382F]">#1 Neighbour</th>
                        <th className="p-2 font-medium text-[#40382F]">Gower Dist</th>
                        <th className="p-2 font-medium text-[#40382F]">Gower Label</th>
                        <th className="p-2 font-medium text-[#40382F]">Euclid Label</th>
                        <th className="p-2 font-medium text-[#40382F]">Cosine Label</th>
                        <th className="p-2 font-medium text-[#40382F]">All Agree?</th>
                        <th className="p-2 font-medium text-[#40382F]">Ties</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E8DED1]/70">
                      {batchResults.map((r) => (
                        <tr key={r.rowNumber} className="hover:bg-[#F3EADF]/65">
                          <td className="p-2 num">{r.rowNumber}</td>
                          <td className="p-2 num">rec #{r.topNeighborIdx}</td>
                          <td className="p-2 num">{r.gowerDist}</td>
                          <td className="p-2">{r.gowerLabel}</td>
                          <td className="p-2">{r.euclidLabel}</td>
                          <td className="p-2">{r.cosineLabel}</td>
                          <td className="p-2">
                            {r.allAgree ? (
                              <span className="text-[#967D63] font-medium">Yes</span>
                            ) : (
                              <span className="text-[#827568]/80">No</span>
                            )}
                          </td>
                          <td className="p-2 num">{r.tieCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Jump to Results Button */}
      {results && activeTab === 'single' && (
        <div className="fixed bottom-6 right-6 z-40 print:hidden">
          <button
            type="button"
            onClick={() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            className="inline-flex items-center gap-2 rounded-full bg-[#40382F] text-[#F3EADF] px-4 py-2.5 text-xs font-semibold shadow-xl hover:bg-[#967D63] border border-white/40 transition"
            title="Jump to consensus prediction results"
          >
            <ChevronDown className="h-4 w-4 text-[#F3EADF]" />
            <span>View Results &amp; Consensus</span>
          </button>
        </div>
      )}
    </div>
  );
}
