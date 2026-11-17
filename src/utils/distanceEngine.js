import { CLINICAL_COHORT, PARIKSHA_OPTIONS } from '../data/clinicalCohort.js';

export const NUMERICAL_KEYS = ['Age_Vaya', 'BMI', 'Systolic_BP', 'Pulse_Nadi_Rate'];
export const CATEGORICAL_KEYS = Object.keys(PARIKSHA_OPTIONS);

// Vaidya-aligned MI squared weights (Age_Vaya explicitly suppressed to 0.01 floor)
const RAW_ENGINE_WEIGHTS = {
  Age_Vaya: 0.01,
  BMI: 0.479,
  Systolic_BP: 0.170,
  Pulse_Nadi_Rate: 0.300,
  Nadi_Type: 0.555,
  Agni_Grade: 0.516,
  Koshtha: 0.428,
  Skin_Texture: 0.398,
  Body_Frame: 0.353,
  Bala_Strength: 0.316,
  Bone_Structure: 0.289,
  Complexion: 0.265,
  Hair_Type: 0.248,
  Mala_Tendency: 0.146,
  Sveda_Perspiration: 0.158,
  Sleep_Quality: 0.182,
  Satva_Disposition: 0.172,
};

const WEIGHT_SUM = Object.values(RAW_ENGINE_WEIGHTS).reduce((a, b) => a + b, 0);
export const NORMALIZED_WEIGHTS = Object.fromEntries(
  Object.entries(RAW_ENGINE_WEIGHTS).map(([k, v]) => [k, v / WEIGHT_SUM])
);

// Precompute cohort numerical stats (min, max, range, mean, std) for exact Gower & Z-score scaling
function computeNumericalStats(cohort) {
  const stats = {};
  NUMERICAL_KEYS.forEach((key) => {
    const vals = cohort.map((p) => p[key]);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const variance = vals.reduce((acc, v) => acc + (v - mean) ** 2, 0) / vals.length;
    stats[key] = {
      min,
      max,
      range: Math.max(1e-6, max - min),
      mean,
      std: Math.max(1e-6, Math.sqrt(variance)),
    };
  });
  return stats;
}

const NUM_STATS = computeNumericalStats(CLINICAL_COHORT);

// Encode patient to OHE + Z-score full vector and OHE categorical-only vector
function encodeVectors(patient) {
  const zNum = NUMERICAL_KEYS.map((k) => (patient[k] - NUM_STATS[k].mean) / NUM_STATS[k].std);
  const catOhe = [];
  CATEGORICAL_KEYS.forEach((k) => {
    const opts = PARIKSHA_OPTIONS[k];
    opts.forEach((opt) => {
      catOhe.push(patient[k] === opt ? 1 : 0);
    });
  });
  return { full: [...zNum, ...catOhe], catOhe };
}

function cosineDistanceVec(a, b) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom < 1e-9) return 1;
  return Math.max(0, Math.min(1, 1 - dot / denom));
}

function euclideanDistanceVec(a, b) {
  let sumSq = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sumSq += d * d;
  }
  return Math.sqrt(sumSq);
}

// Compute exact Vaidya-Weighted Gower Distance in [0, 1]
export function computeWeightedGower(p1, p2) {
  let weightedSum = 0;
  NUMERICAL_KEYS.forEach((k) => {
    const d = Math.min(1, Math.abs(p1[k] - p2[k]) / NUM_STATS[k].range);
    weightedSum += NORMALIZED_WEIGHTS[k] * d;
  });
  CATEGORICAL_KEYS.forEach((k) => {
    const d = p1[k] === p2[k] ? 0 : 1;
    weightedSum += NORMALIZED_WEIGHTS[k] * d;
  });
  return Math.max(0, Math.min(1, weightedSum));
}

// Compute all 4 SIH26008 distances between two patient records
export function computePairwiseDistances(p1, p2, alpha = 0.75) {
  const gower = computeWeightedGower(p1, p2);
  const v1 = encodeVectors(p1);
  const v2 = encodeVectors(p2);

  // Normalized Euclidean (normalized by theoretical max spread ~8.2 for 4 Z-vitals + 13 OHE pairs)
  const eucRaw = euclideanDistanceVec(v1.full, v2.full);
  const euclidean = Math.min(1, eucRaw / 8.2);

  // Full OHE+Z-score Cosine distance
  const cosine = cosineDistanceVec(v1.full, v2.full);

  // Modality-decoupled categorical OHE Cosine for Proposed Hybrid
  const cosineCat = cosineDistanceVec(v1.catOhe, v2.catOhe);
  const hybrid = Math.max(0, Math.min(1, alpha * gower + (1 - alpha) * cosineCat));

  return {
    gower,
    euclidean,
    cosine,
    hybrid,
    cosineCat,
  };
}

// Retrieve Top-K nearest historical patients across all 4 metrics for Module 3 Live CBR Simulator
export function retrieveTopKPatients(queryPatient, alpha = 0.75, k = 5) {
  const scored = CLINICAL_COHORT.map((candidate) => {
    const dists = computePairwiseDistances(queryPatient, candidate, alpha);
    const matchedTraits = CATEGORICAL_KEYS.filter(
      (key) => queryPatient[key] === candidate[key]
    );
    return {
      patient: candidate,
      dists,
      matchedTraits,
      matchRatio: matchedTraits.length / CATEGORICAL_KEYS.length,
    };
  });

  const pickTop = (metricKey) =>
    [...scored]
      .sort((a, b) => a.dists[metricKey] - b.dists[metricKey])
      .slice(0, k)
      .map((item, rank) => ({
        rank: rank + 1,
        patient: item.patient,
        distance: Number(item.dists[metricKey].toFixed(4)),
        similarityPct: Number(((1 - item.dists[metricKey]) * 100).toFixed(1)),
        matchedTraits: item.matchedTraits,
        matchedCount: item.matchedTraits.length,
        totalTraits: CATEGORICAL_KEYS.length,
        bmiDelta: Number((item.patient.BMI - queryPatient.BMI).toFixed(1)),
        pulseDelta: Math.round(item.patient.Pulse_Nadi_Rate - queryPatient.Pulse_Nadi_Rate),
      }));

  const results = {
    gower: pickTop('gower'),
    euclidean: pickTop('euclidean'),
    cosine: pickTop('cosine'),
    hybrid: pickTop('hybrid'),
  };

  // Compute concordance vs expectedDosha (or majority class of Hybrid Top-5 if custom)
  const expected =
    queryPatient.expectedDosha ||
    results.hybrid[0]?.patient.dosha ||
    'Vata';

  const precisionAt5 = {};
  Object.entries(results).forEach(([metric, list]) => {
    const matches = list.filter((r) => r.patient.dosha === expected).length;
    precisionAt5[metric] = Number(((matches / k) * 100).toFixed(1));
  });

  return {
    expectedDosha: expected,
    topK: results,
    precisionAt5,
  };
}

// Build a 60x60 class-sorted distance matrix (10 patients per Tridosha class) for Module 4 Heatmap
export function buildClassSortedHeatmapMatrix(metric = 'gower', alpha = 0.75) {
  const sample = [];
  const classes = ['Vata', 'Pitta', 'Kapha', 'Vata+Pitta', 'Pitta+Kapha', 'Vata+Kapha'];
  classes.forEach((cls) => {
    const subset = CLINICAL_COHORT.filter((p) => p.dosha === cls).slice(0, 10);
    sample.push(...subset);
  });

  const n = sample.length;
  const matrix = Array.from({ length: n }, () => new Float32Array(n));
  const nonZero = [];

  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      if (i === j) {
        matrix[i][j] = 0;
      } else {
        const d = computePairwiseDistances(sample[i], sample[j], alpha)[metric];
        matrix[i][j] = d;
        matrix[j][i] = d;
        nonZero.push(d);
      }
    }
  }

  nonZero.sort((a, b) => a - b);
  const median = nonZero[Math.floor(nonZero.length / 2)] || 0.35;
  const gamma = 1 / (2 * median * median);

  // Compute intra-class vs inter-class mean distance ratio (Block Contrast Index)
  let intraSum = 0;
  let intraCount = 0;
  let interSum = 0;
  let interCount = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (sample[i].dosha === sample[j].dosha) {
        intraSum += matrix[i][j];
        intraCount++;
      } else {
        interSum += matrix[i][j];
        interCount++;
      }
    }
  }

  const intraMean = intraSum / Math.max(1, intraCount);
  const interMean = interSum / Math.max(1, interCount);

  return {
    sample,
    matrix,
    n,
    median: Number(median.toFixed(4)),
    gamma: Number(gamma.toFixed(3)),
    intraMean: Number(intraMean.toFixed(4)),
    interMean: Number(interMean.toFixed(4)),
    contrastRatio: Number((interMean / Math.max(1e-5, intraMean)).toFixed(2)),
  };
}
