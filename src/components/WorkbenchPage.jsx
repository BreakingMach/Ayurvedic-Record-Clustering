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

  // 2. Form state
  const [activeTab, setActiveTab] = useState('single'); // 'single' | 'batch'
  const [datasetMode, setDatasetMode] = useState('real'); // 'real' | 'synthetic'
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

  // 3. Batch mode state
  const [batchFile, setBatchFile] = useState(null);
  const [batchErrors, setBatchErrors] = useState([]);
  const [batchParsedRows, setBatchParsedRows] = useState([]);
  const [batchResults, setBatchResults] = useState(null);
  const [batchRunning, setBatchRunning] = useState(false);
  const fileInputRef = useRef(null);

  // 4. Saved cases (localStorage)
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

  // Count entered traits and vitals
  const enteredTraitsCount = useMemo(() => {
    if (!currentMeta) return 0;
    return currentMeta.traits.filter((t) => Boolean(traitSelections[t.name])).length;
  }, [currentMeta, traitSelections]);

  const enteredVitalsCount = useMemo(() => {
    if (datasetMode !== 'synthetic') return 0;
    return Object.values(vitalInputs).filter((v) => v !== '' && !isNaN(Number(v))).length;
  }, [datasetMode, vitalInputs]);

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
  };

  // Reset form
  const handleReset = () => {
    setTraitSelections({});
    setVitalInputs({ age: '', bmi: '', systolic_bp: '', pulse: '' });
    setResults(null);
  };

  // Save current case
  const handleSaveCase = () => {
    const name =
      caseNameInput.trim() ||
      `Case ${savedCases.length + 1} (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`;
    const newCase = {
      id: `case_${Date.now()}`,
      name,
      timestamp: new Date().toISOString(),
      datasetMode,
      traits: { ...traitSelections },
      vitals: { ...vitalInputs },
      enteredCount: enteredTraitsCount,
    };
    saveCaseToStorage([newCase, ...savedCases]);
    setCaseNameInput('');
  };

  // Load saved case
  const handleLoadSavedCase = (saved) => {
    setDatasetMode(saved.datasetMode);
    setTraitSelections(saved.traits || {});
    setVitalInputs(saved.vitals || { age: '', bmi: '', systolic_bp: '', pulse: '' });
  };

  // Delete saved case
  const handleDeleteSavedCase = (caseId) => {
    const next = savedCases.filter((c) => c.id !== caseId);
    saveCaseToStorage(next);
  };

  // Run retrieval calculation
  const handleRunRetrieval = () => {
    if (!currentMeta || !precomputed) return;
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

    setResults({
      timestamp: new Date().toISOString(),
      datasetMode,
      queryTraits,
      queryNumerics,
      hasMissing,
      missingTraitsCount,
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
        if (datasetMode === 'real') {
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

  // Export JSON handler
  const handleExportJSON = () => {
    if (!results || !currentMeta) return;
    const payload = {
      notice: R11_DISCLAIMER,
      dataset: datasetMode,
      timestamp: results.timestamp,
      k: kParam,
      query_traits: traitSelections,
      query_vitals: datasetMode === 'synthetic' ? vitalInputs : null,
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
      cluster_assignment: results.assignedClusterData,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `similarity_retrieval_${datasetMode}_case.json`;
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
    const fullCsv = `# NOTICE: ${R11_DISCLAIMER}\n# Dataset: ${datasetMode} (N=${currentMeta.rows.length})\n${csvBody}`;
    const blob = new Blob([fullCsv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `similarity_retrieval_${datasetMode}_neighbors.csv`;
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

    // Add 1 sample row
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

      // Check row limit (max 1000)
      if (lines.length - 1 > 1000) {
        setBatchErrors(['Batch upload exceeds the maximum limit of 1,000 rows.']);
        return;
      }

      const rawHeaders = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
      const traits = currentMeta.traits;
      const traitMap = new Map(traits.map((t) => [t.name, t]));

      const errors = [];
      const parsed = [];

      for (let r = 1; r < lines.length; r++) {
        // Simple CSV splitter handling quoted values
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

        // Validate categorical traits
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

        // Validate vitals if synthetic
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
      // 1. Gower
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

      // 2. Euclidean Mode
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

      // 3. Cosine Mode
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
      <div className="paper-card p-6 text-sm text-neutral-600">
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
      <div className="space-y-3 border-b border-neutral-200 pb-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold tracking-tight text-neutral-900">
              Similarity Workbench
            </h1>
            {datasetMode === 'synthetic' && (
              <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900 border border-amber-300">
                SIMULATED
              </span>
            )}
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('single')}
              className={`rounded px-3 py-1.5 text-xs font-medium transition ${
                activeTab === 'single'
                  ? 'bg-teal-50 text-teal-800 ring-1 ring-teal-700/30'
                  : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50'
              }`}
            >
              Single Case Entry
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('batch')}
              className={`rounded px-3 py-1.5 text-xs font-medium transition ${
                activeTab === 'batch'
                  ? 'bg-teal-50 text-teal-800 ring-1 ring-teal-700/30'
                  : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50'
              }`}
            >
              Batch Mode (CSV)
            </button>
          </div>
        </div>

        <p className="text-xs text-neutral-500 leading-relaxed max-w-3xl">
          Evaluate case similarity, nearest neighbour retrieval, and unsupervised clustering
          across Gower, Euclidean, and Cosine metrics. All computation executes locally inside your
          browser (Rule R13: zero user data transmitted).
        </p>
      </div>

      {/* Dataset Toggle & Counter Bar */}
      <div className="paper-card p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-neutral-600">Active Database:</span>
          <div className="inline-flex rounded border border-neutral-200 bg-neutral-50 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => {
                setDatasetMode('real');
                setResults(null);
              }}
              className={`rounded px-2.5 py-1 font-medium transition ${
                datasetMode === 'real'
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-900'
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
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              <span>Simulated Mixed Data (29 traits + 4 vitals)</span>
              <span className="rounded bg-amber-100 px-1 py-0.2 text-[10px] font-semibold text-amber-800">
                SIMULATED
              </span>
            </button>
          </div>
        </div>

        {activeTab === 'single' && (
          <div className="flex items-center gap-3 text-xs text-neutral-600">
            <span>
              Traits entered:{' '}
              <strong className="num text-neutral-900">
                {enteredTraitsCount} of {currentMeta?.traits.length || 29}
              </strong>
            </span>
            {datasetMode === 'synthetic' && (
              <span>
                Vitals entered:{' '}
                <strong className="num text-neutral-900">{enteredVitalsCount} of 4</strong>
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
      {/* SINGLE CASE TAB */}
      {/* ==================================================================== */}
      {activeTab === 'single' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded border border-neutral-200">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleRunRetrieval}
                className="inline-flex items-center gap-1.5 rounded bg-teal-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-800 shadow-sm transition"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                Run Retrieval
              </button>

              <button
                type="button"
                onClick={handleFillRandom}
                className="inline-flex items-center gap-1.5 rounded border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition"
              >
                <Shuffle className="h-3.5 w-3.5 text-neutral-500" />
                Fill Random
              </button>

              <button
                type="button"
                onClick={() => handleLoadExample(0)}
                className="inline-flex items-center gap-1.5 rounded border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition"
              >
                <FolderOpen className="h-3.5 w-3.5 text-neutral-500" />
                Load Example #1
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 rounded border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50 transition"
              >
                <RotateCcw className="h-3.5 w-3.5 text-neutral-400" />
                Reset
              </button>
            </div>

            {/* k and Save Case */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-neutral-600">
                <label htmlFor="k-selector" className="font-medium">
                  Neighbours (k):
                </label>
                <select
                  id="k-selector"
                  value={kParam}
                  onChange={(e) => setKParam(Number(e.target.value))}
                  className="rounded border border-neutral-300 bg-white px-2 py-1 text-xs num font-medium text-neutral-800"
                >
                  {[1, 3, 5, 7, 10].map((val) => (
                    <option key={val} value={val}>
                      {val}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  placeholder="Case name (optional)"
                  value={caseNameInput}
                  onChange={(e) => setCaseNameInput(e.target.value)}
                  className="rounded border border-neutral-300 px-2 py-1 text-xs text-neutral-800 placeholder-neutral-400 w-36"
                />
                <button
                  type="button"
                  onClick={handleSaveCase}
                  className="inline-flex items-center gap-1 rounded border border-neutral-300 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                  title="Save case to browser localStorage"
                >
                  <Save className="h-3.5 w-3.5 text-neutral-500" />
                  Save
                </button>
              </div>
            </div>
          </div>

          {/* Saved Cases Drawer (if any exist) */}
          {savedCases.length > 0 && (
            <div className="paper-card p-3 bg-neutral-50/50">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-200 text-xs">
                <span className="font-semibold text-neutral-700">
                  Saved Local Cases ({savedCases.length})
                </span>
                <span className="text-[11px] text-neutral-400">Stored in browser localStorage</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {savedCases.map((sc) => (
                  <div
                    key={sc.id}
                    className="inline-flex items-center gap-2 rounded border border-neutral-200 bg-white px-2.5 py-1 text-xs text-neutral-800 shadow-sm"
                  >
                    <span className="font-medium">{sc.name}</span>
                    <span className="text-[10px] text-neutral-400 num">
                      {sc.enteredCount}/29 traits
                    </span>
                    <button
                      type="button"
                      onClick={() => handleLoadSavedCase(sc)}
                      className="text-teal-700 hover:underline text-[11px] font-medium"
                    >
                      Load
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSavedCase(sc.id)}
                      className="text-neutral-400 hover:text-red-600"
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
                <span className="text-[11px] text-neutral-500">
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
                        <label htmlFor={`vital-${vKey}`} className="text-xs font-medium text-neutral-700">
                          {bounds.label}
                        </label>
                        <span className="text-[10px] text-neutral-400 num">
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
                            : 'border-neutral-300 bg-white text-neutral-800'
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

          {/* Trait Form Section 1: Physical Traits (0..14) */}
          <div className="paper-card p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-700">
                1. Physical Traits (Columns 1–15)
              </h2>
              <span className="text-[11px] text-neutral-400">
                Ergonomic grouping (DECISIONS.md D11)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {PHYSICAL_TRAIT_INDICES.map((tIdx) => {
                const trait = currentMeta.traits[tIdx];
                const selectedVal = traitSelections[trait.name] || '';

                return (
                  <div key={trait.name} className="space-y-1">
                    <label
                      htmlFor={`trait-${tIdx}`}
                      className="block text-[11px] font-medium text-neutral-700 truncate"
                      title={trait.name}
                    >
                      {trait.name}
                    </label>
                    <select
                      id={`trait-${tIdx}`}
                      value={selectedVal}
                      onChange={(e) => handleTraitChange(trait.name, e.target.value)}
                      className="w-full rounded border border-neutral-300 bg-white px-2 py-1 text-xs text-neutral-800 truncate"
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
          </div>

          {/* Trait Form Section 2: Physiological & Lifestyle Traits (15..28) */}
          <div className="paper-card p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-700">
                2. Physiological &amp; Lifestyle Traits (Columns 16–29)
              </h2>
              <span className="text-[11px] text-neutral-400">
                Ergonomic grouping (DECISIONS.md D11)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {PHYSIOLOGICAL_TRAIT_INDICES.map((tIdx) => {
                const trait = currentMeta.traits[tIdx];
                const selectedVal = traitSelections[trait.name] || '';

                return (
                  <div key={trait.name} className="space-y-1">
                    <label
                      htmlFor={`trait-${tIdx}`}
                      className="block text-[11px] font-medium text-neutral-700 truncate"
                      title={trait.name}
                    >
                      {trait.name}
                    </label>
                    <select
                      id={`trait-${tIdx}`}
                      value={selectedVal}
                      onChange={(e) => handleTraitChange(trait.name, e.target.value)}
                      className="w-full rounded border border-neutral-300 bg-white px-2 py-1 text-xs text-neutral-800 truncate"
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
          </div>

          {/* ================================================================ */}
          {/* RESULTS PANEL */}
          {/* ================================================================ */}
          {results && (
            <div className="space-y-6 pt-4 border-t border-neutral-200">
              {/* Mandatory R11 Research Prototype Banner */}
              <div className="rounded border border-neutral-300 bg-neutral-100/70 p-3 text-xs text-neutral-700 flex items-center justify-between">
                <span className="font-medium">Notice: {R11_DISCLAIMER}</span>
                <span className="text-[11px] text-neutral-500">
                  Nearest-neighbour labels reflect database records only (Rule R10).
                </span>
              </div>

              {/* Agreement Banner */}
              <div
                className={`paper-card p-4 flex flex-wrap items-center justify-between gap-3 ${
                  results.allAgreeTop1 ? 'border-teal-300 bg-teal-50/40' : 'border-neutral-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  {results.allAgreeTop1 ? (
                    <CheckCircle2 className="h-5 w-5 text-teal-700" />
                  ) : (
                    <Info className="h-5 w-5 text-neutral-500" />
                  )}
                  <div>
                    <h3 className="text-sm font-semibold text-neutral-900">
                      {results.allAgreeTop1
                        ? `All 3 metrics agree on #1 nearest neighbour (Record #${results.top1Gower})`
                        : `Metric divergence: #1 neighbour differs across metrics (Gower: #${results.top1Gower}, Euclidean: #${results.top1Euclid}, Cosine: #${results.top1Cosine})`}
                    </h3>
                    <p className="text-xs text-neutral-600">
                      Top-{kParam} overlap: Euclidean shares {results.euclidOverlap} of {kParam} with
                      Gower; Cosine shares {results.cosineOverlap} of {kParam} with Gower.
                    </p>
                  </div>
                </div>

                {results.gower.tieCount > 1 && (
                  <span className="rounded bg-amber-100 border border-amber-200 px-2.5 py-1 text-xs text-amber-900">
                    {results.gower.tieCount} database records tied at rank {kParam} (lowest index selected)
                  </span>
                )}
              </div>

              {/* Side-by-Side Metric Nearest Neighbors Table */}
              <div className="paper-card p-5 space-y-4 overflow-x-auto">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 pb-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-800">
                    Retrieved Nearest Neighbours (Ranked 1 to {kParam})
                  </h3>
                  <span className="text-[11px] text-neutral-500">
                    Outputs labelled strictly as &quot;Labels of the nearest dataset records&quot; (Rule R10)
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Gower Column */}
                  <div className="rounded border border-neutral-200 p-3 space-y-2">
                    <div className="flex items-center justify-between border-b border-neutral-100 pb-1">
                      <span className="text-xs font-semibold text-teal-800">Gower Distance</span>
                      <span className="text-[10px] text-neutral-400">Observed-trait mean</span>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      {results.gower.indices.map((idx, rank) => {
                        const dist = results.gower.distances[rank];
                        const cLabel = currentMeta.classes[currentMeta.labels[idx]];
                        const color = DOSHA_PALETTE[cLabel] || '#666';

                        return (
                          <div
                            key={idx}
                            className="flex items-center justify-between rounded bg-neutral-50 px-2 py-1"
                          >
                            <span className="num font-medium text-neutral-600">
                              #{rank + 1} (rec #{idx})
                            </span>
                            <div className="flex items-center gap-2">
                              <span
                                className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold text-white"
                                style={{ backgroundColor: color }}
                              >
                                {cLabel}
                              </span>
                              <span className="num text-neutral-800">{dist.toFixed(4)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Euclidean Mode Impute Column */}
                  <div className="rounded border border-neutral-200 p-3 space-y-2">
                    <div className="flex items-center justify-between border-b border-neutral-100 pb-1">
                      <span className="text-xs font-semibold text-neutral-800">
                        Euclidean (mode-impute)
                      </span>
                      <span className="text-[10px] text-neutral-400">One-hot + z-score</span>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      {results.euclidMode.indices.map((idx, rank) => {
                        const dist = results.euclidMode.distances[rank];
                        const cLabel = currentMeta.classes[currentMeta.labels[idx]];
                        const color = DOSHA_PALETTE[cLabel] || '#666';

                        return (
                          <div
                            key={idx}
                            className="flex items-center justify-between rounded bg-neutral-50 px-2 py-1"
                          >
                            <span className="num font-medium text-neutral-600">
                              #{rank + 1} (rec #{idx})
                            </span>
                            <div className="flex items-center gap-2">
                              <span
                                className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold text-white"
                                style={{ backgroundColor: color }}
                              >
                                {cLabel}
                              </span>
                              <span className="num text-neutral-800">{dist.toFixed(4)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Cosine Mode Impute Column */}
                  <div className="rounded border border-neutral-200 p-3 space-y-2">
                    <div className="flex items-center justify-between border-b border-neutral-100 pb-1">
                      <span className="text-xs font-semibold text-neutral-800">
                        Cosine (mode-impute)
                      </span>
                      <span className="text-[10px] text-neutral-400">1 - cosine similarity</span>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      {results.cosineMode.indices.map((idx, rank) => {
                        const dist = results.cosineMode.distances[rank];
                        const cLabel = currentMeta.classes[currentMeta.labels[idx]];
                        const color = DOSHA_PALETTE[cLabel] || '#666';

                        return (
                          <div
                            key={idx}
                            className="flex items-center justify-between rounded bg-neutral-50 px-2 py-1"
                          >
                            <span className="num font-medium text-neutral-600">
                              #{rank + 1} (rec #{idx})
                            </span>
                            <div className="flex items-center gap-2">
                              <span
                                className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold text-white"
                                style={{ backgroundColor: color }}
                              >
                                {cLabel}
                              </span>
                              <span className="num text-neutral-800">{dist.toFixed(4)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Additional observed-only columns when missing > 0 */}
                {results.hasMissing && results.euclidObs && results.cosineObs && (
                  <div className="pt-2 border-t border-neutral-100 space-y-2">
                    <span className="text-[11px] font-medium text-neutral-500">
                      Observed-only variants (active due to {results.missingTraitsCount} unselected
                      traits):
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="rounded border border-dashed border-neutral-300 p-2.5 text-xs space-y-1">
                        <div className="flex justify-between text-[11px] font-semibold text-neutral-700">
                          <span>Euclidean (observed-only)</span>
                          <span className="text-neutral-400">No imputation</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {results.euclidObs.indices.map((idx, r) => (
                            <span
                              key={idx}
                              className="rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] num"
                            >
                              #{r + 1}: rec {idx} ({results.euclidObs.distances[r].toFixed(3)})
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="rounded border border-dashed border-neutral-300 p-2.5 text-xs space-y-1">
                        <div className="flex justify-between text-[11px] font-semibold text-neutral-700">
                          <span>Cosine (observed-only)</span>
                          <span className="text-neutral-400">Identical rank to Gower</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {results.cosineObs.indices.map((idx, r) => (
                            <span
                              key={idx}
                              className="rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] num"
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
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 pb-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-800">
                    Labels of the Nearest Dataset Records (kNN vote, k={kParam})
                  </h3>
                  <span className="text-[11px] text-neutral-500">
                    Direct count among top-{kParam} retrieved records (Rule R10)
                  </span>
                </div>

                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={results.voteChartData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
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
                      <Bar dataKey="Gower" fill="#0F766E" />
                      <Bar dataKey="Euclidean (mode-imp)" fill="#262626" />
                      <Bar dataKey="Cosine (mode-imp)" fill="#737373" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Trait Match Matrix */}
              <div className="paper-card p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 pb-2">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-800">
                      Trait Match Matrix (Query vs Gower Top-{kParam} Neighbours)
                    </h3>
                    <p className="text-[11px] text-neutral-500">
                      Inspect feature-level agreement with each retrieved record
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-neutral-500">Sort rows by:</span>
                    <button
                      type="button"
                      onClick={() => setMatrixSortBy('order')}
                      className={`px-2 py-0.5 rounded border text-[11px] ${
                        matrixSortBy === 'order'
                          ? 'bg-neutral-800 text-white border-neutral-800'
                          : 'bg-white text-neutral-600 border-neutral-200'
                      }`}
                    >
                      Trait Order
                    </button>
                    <button
                      type="button"
                      onClick={() => setMatrixSortBy('mismatches')}
                      className={`px-2 py-0.5 rounded border text-[11px] ${
                        matrixSortBy === 'mismatches'
                          ? 'bg-neutral-800 text-white border-neutral-800'
                          : 'bg-white text-neutral-600 border-neutral-200'
                      }`}
                    >
                      Most Mismatches
                    </button>
                  </div>
                </div>

                <div className="max-h-96 overflow-y-auto border border-neutral-200 rounded">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-neutral-50 sticky top-0 border-b border-neutral-200 z-10">
                      <tr>
                        <th className="p-2 font-medium text-neutral-700 w-1/4">Trait</th>
                        <th className="p-2 font-medium text-neutral-700 w-1/4">Query Input</th>
                        {results.gower.indices.map((idx, r) => (
                          <th key={idx} className="p-2 font-medium text-neutral-600 num text-center">
                            #{r + 1} (rec {idx})
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {traitMatrixRows.map((row) => (
                        <tr key={row.traitName} className="hover:bg-neutral-50/50">
                          <td className="p-2 font-medium text-neutral-800">{row.traitName}</td>
                          <td className="p-2 text-neutral-600">
                            {row.isQueryKnown ? (
                              <span className="font-medium text-neutral-900">{row.queryLevel}</span>
                            ) : (
                              <span className="text-neutral-400 italic">Unknown</span>
                            )}
                          </td>
                          {row.neighborCols.map((col, cIdx) => (
                            <td key={cIdx} className="p-2 text-center">
                              {col.status === 'match' && (
                                <span
                                  className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-teal-50 text-teal-800 font-medium border border-teal-200"
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
                                <span className="text-neutral-300" title={col.text}>
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
              {results.assignedClusterData && (
                <div className="paper-card p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 pb-2">
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-800">
                        Unsupervised Cluster Assignment
                      </h3>
                      <p className="text-[11px] text-neutral-500">
                        Query assigned to cluster with smallest mean distance to members
                      </p>
                    </div>

                    {/* Selector */}
                    <div className="flex items-center gap-2 text-xs">
                      <select
                        value={clusteringConfig.metric}
                        onChange={(e) => {
                          setClusteringConfig((prev) => ({ ...prev, metric: e.target.value }));
                          handleRunRetrieval();
                        }}
                        className="rounded border border-neutral-300 px-2 py-0.5 bg-white text-xs"
                      >
                        <option value="gower">Gower</option>
                        <option value="euclidean">Euclidean</option>
                        <option value="cosine">Cosine</option>
                      </select>

                      <select
                        value={clusteringConfig.linkage}
                        onChange={(e) => {
                          setClusteringConfig((prev) => ({ ...prev, linkage: e.target.value }));
                          handleRunRetrieval();
                        }}
                        className="rounded border border-neutral-300 px-2 py-0.5 bg-white text-xs"
                      >
                        <option value="average">Average Linkage</option>
                        <option value="complete">Complete Linkage</option>
                      </select>

                      <select
                        value={clusteringConfig.k}
                        onChange={(e) => {
                          setClusteringConfig((prev) => ({
                            ...prev,
                            k: Number(e.target.value),
                          }));
                          handleRunRetrieval();
                        }}
                        className="rounded border border-neutral-300 px-2 py-0.5 bg-white text-xs num"
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
                    <div className="rounded border border-teal-200 bg-teal-50/30 p-4 space-y-2">
                      <span className="text-xs font-semibold text-teal-900">
                        Assigned Cluster: Cluster {results.assignedClusterData.assignedCluster + 1}
                      </span>
                      <p className="text-xs text-neutral-600 leading-relaxed">
                        Nearest cluster among {results.assignedClusterData.k} partitions (cluster
                        size:{' '}
                        {
                          results.assignedClusterData.clusterSizes[
                            results.assignedClusterData.assignedCluster
                          ]
                        }{' '}
                        records). ARI against dataset labels:{' '}
                        <span className="num font-medium">
                          {results.assignedClusterData.ari.toFixed(4)}
                        </span>
                        .
                      </p>
                    </div>

                    <div className="rounded border border-neutral-200 p-3 space-y-2 text-xs">
                      <span className="font-medium text-neutral-700">
                        Mean distance to cluster members:
                      </span>
                      <div className="space-y-1">
                        {results.assignedClusterData.meanDistances.map((d, cIdx) => (
                          <div
                            key={cIdx}
                            className={`flex items-center justify-between px-2 py-0.5 rounded ${
                              cIdx === results.assignedClusterData.assignedCluster
                                ? 'bg-teal-100/60 font-semibold text-teal-900'
                                : 'text-neutral-600'
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
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 pb-2">
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-800">
                        2D Multidimensional Scaling (MDS) Map
                      </h3>
                      <p className="text-[11px] text-neutral-500">
                        PCoA projection of 1,200 database records with query placement at neighbour centroid
                      </p>
                    </div>
                    <span className="text-[10px] text-neutral-400">
                      Query placement: centroid of top-{kParam} neighbours
                    </span>
                  </div>

                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis type="number" dataKey="x" domain={[0, 1]} hide />
                        <YAxis type="number" dataKey="y" domain={[0, 1]} hide />
                        <ZAxis range={[25, 25]} />
                        <RechartsTooltip
                          cursor={{ strokeDasharray: '3 3' }}
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const pt = payload[0].payload;
                              return (
                                <div className="rounded bg-white p-2 border border-neutral-200 text-xs shadow-sm">
                                  <p className="font-semibold">{pt.name}</p>
                                  {pt.cls && <p className="text-[11px] text-neutral-600">Class: {pt.cls}</p>}
                                </div>
                              );
                            }
                            return null;
                          }}
                        />

                        {/* Database points */}
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

                        {/* Query point */}
                        {results.queryCoord && (
                          <Scatter
                            name="Current Query (Centroid)"
                            data={[
                              {
                                x: results.queryCoord[0],
                                y: results.queryCoord[1],
                                name: 'Current Query (Approximate Centroid)',
                                cls: 'Query',
                              },
                            ]}
                            fill="#E11D48"
                            shape="star"
                          />
                        )}
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Export Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded border border-neutral-200">
                <span className="text-xs text-neutral-600">
                  Export query and top-{kParam} nearest neighbour outputs:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportJSON}
                    className="inline-flex items-center gap-1.5 rounded border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 shadow-sm transition"
                  >
                    <Download className="h-3.5 w-3.5 text-neutral-500" />
                    Export JSON
                  </button>
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="inline-flex items-center gap-1.5 rounded border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 shadow-sm transition"
                  >
                    <Download className="h-3.5 w-3.5 text-neutral-500" />
                    Export CSV
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* BATCH MODE TAB */}
      {/* ==================================================================== */}
      {activeTab === 'batch' && (
        <div className="space-y-6">
          <div className="paper-card p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 pb-3">
              <div>
                <h2 className="text-sm font-semibold text-neutral-900">
                  {'Batch Case Retrieval (Max 1,000 Rows)'}
                </h2>
                <p className="text-xs text-neutral-500">
                  Upload a CSV file containing multiple patient cases to evaluate distance rankings
                  in batch.
                </p>
              </div>

              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="inline-flex items-center gap-1.5 rounded border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 shadow-sm transition"
              >
                <Download className="h-3.5 w-3.5 text-neutral-500" />
                Download CSV Template
              </button>
            </div>

            {/* Upload Area */}
            <div className="rounded border-2 border-dashed border-neutral-300 p-6 text-center space-y-3 bg-neutral-50/50">
              <Upload className="mx-auto h-8 w-8 text-neutral-400" />
              <div>
                <p className="text-xs font-medium text-neutral-700">
                  Select a CSV file to validate and run
                </p>
                <p className="text-[11px] text-neutral-400">
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
                className="rounded bg-white border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 shadow-sm"
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
              <div className="flex items-center justify-between bg-teal-50 border border-teal-200 p-3 rounded text-xs text-teal-900">
                <span>
                  Validation passed: <strong className="num">{batchParsedRows.length}</strong> case
                  rows ready for client-side batch processing.
                </span>
                <button
                  type="button"
                  disabled={batchRunning}
                  onClick={handleRunBatch}
                  className="rounded bg-teal-700 px-3 py-1.5 font-medium text-white hover:bg-teal-800 disabled:opacity-50"
                >
                  {batchRunning ? 'Computing...' : 'Run Batch Retrieval'}
                </button>
              </div>
            )}

            {/* Batch Results Table */}
            {batchResults && (
              <div className="space-y-4 pt-3 border-t border-neutral-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-800">
                    Batch Output ({batchResults.length} Cases Evaluated)
                  </h3>
                  <button
                    type="button"
                    onClick={handleDownloadBatchResults}
                    className="inline-flex items-center gap-1.5 rounded border border-neutral-300 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                  >
                    <Download className="h-3.5 w-3.5 text-neutral-500" />
                    Download Results CSV
                  </button>
                </div>

                <div className="max-h-80 overflow-y-auto border border-neutral-200 rounded">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-neutral-50 sticky top-0 border-b border-neutral-200">
                      <tr>
                        <th className="p-2 font-medium text-neutral-700">Row #</th>
                        <th className="p-2 font-medium text-neutral-700">#1 Neighbour</th>
                        <th className="p-2 font-medium text-neutral-700">Gower Dist</th>
                        <th className="p-2 font-medium text-neutral-700">Gower Label</th>
                        <th className="p-2 font-medium text-neutral-700">Euclid Label</th>
                        <th className="p-2 font-medium text-neutral-700">Cosine Label</th>
                        <th className="p-2 font-medium text-neutral-700">All Agree?</th>
                        <th className="p-2 font-medium text-neutral-700">Ties</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {batchResults.map((r) => (
                        <tr key={r.rowNumber} className="hover:bg-neutral-50/50">
                          <td className="p-2 num">{r.rowNumber}</td>
                          <td className="p-2 num">rec #{r.topNeighborIdx}</td>
                          <td className="p-2 num">{r.gowerDist}</td>
                          <td className="p-2">{r.gowerLabel}</td>
                          <td className="p-2">{r.euclidLabel}</td>
                          <td className="p-2">{r.cosineLabel}</td>
                          <td className="p-2">
                            {r.allAgree ? (
                              <span className="text-teal-700 font-medium">Yes</span>
                            ) : (
                              <span className="text-neutral-400">No</span>
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
    </div>
  );
}
