import benchmarkData from '../data/realBenchmarkResults.json';

const NUM_COLS = ['Age_Vaya', 'BMI', 'Systolic_BP', 'Pulse_Rate'];
const CAT_COLS = Object.keys(benchmarkData.catVocabFull);
const ALL_COLS = [...NUM_COLS, ...CAT_COLS];
const CORE_CAT_COLS = CAT_COLS.slice(0, 20);
const ALPHA_DEFAULT = benchmarkData.meta.alpha; // 0.50 untuned neutral mix

const { numStatsFull, catVocabFull, miWeightsFull, uniqueProfiles } = benchmarkData;

const UNIFORM_WEIGHTS = Object.fromEntries(ALL_COLS.map((c) => [c, 1 / ALL_COLS.length]));

function encodeProfile(profile, weights) {
  const normNum = NUM_COLS.map((col) => {
    const st = numStatsFull[col];
    return (profile[col] - st.min) / Math.max(1e-6, st.range);
  });

  const zNumW = NUM_COLS.map((col) => {
    const st = numStatsFull[col];
    const z = (profile[col] - st.mean) / Math.max(1e-6, st.std);
    return z * Math.sqrt(weights[col] * ALL_COLS.length);
  });

  const catOheW = [];
  CAT_COLS.forEach((col) => {
    const vocab = catVocabFull[col];
    const sqrtW = Math.sqrt(weights[col] * ALL_COLS.length);
    for (let v = 0; v < vocab.length; v++) {
      catOheW.push(profile[col] === vocab[v] ? sqrtW : 0);
    }
  });

  return {
    normNum,
    fullW: [...zNumW, ...catOheW],
    catOheW,
  };
}

function cosineDist(a, b) {
  let dot = 0;
  let nA = 0;
  let nB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    nA += a[i] * a[i];
    nB += b[i] * b[i];
  }
  const denom = Math.sqrt(nA * nB);
  return denom > 1e-12 ? Math.max(0, Math.min(1, 1 - dot / denom)) : 1;
}

function euclideanDist(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    s += d * d;
  }
  return Math.sqrt(s);
}

function pairwiseDistance(pA, encA, pB, encB, metric, weights, alpha = ALPHA_DEFAULT) {
  if (metric === 'gower' || metric === 'hybrid') {
    let gSum = 0;
    let wTot = 0;
    for (let i = 0; i < NUM_COLS.length; i++) {
      const w = weights[NUM_COLS[i]];
      gSum += w * Math.min(1, Math.abs(encA.normNum[i] - encB.normNum[i]));
      wTot += w;
    }
    for (let i = 0; i < CAT_COLS.length; i++) {
      const col = CAT_COLS[i];
      const w = weights[col];
      gSum += w * (pA[col] === pB[col] ? 0 : 1);
      wTot += w;
    }
    const dGower = wTot > 0 ? gSum / wTot : 0;
    if (metric === 'gower') return dGower;
    const dCosCat = cosineDist(encA.catOheW, encB.catOheW);
    return alpha * dGower + (1 - alpha) * dCosCat;
  }

  if (metric === 'euclidean') {
    return euclideanDist(encA.fullW, encB.fullW);
  }

  if (metric === 'cosine') {
    return cosineDist(encA.fullW, encB.fullW);
  }

  return 0;
}

/**
 * Retrieve Top-K nearest unique profiles (strictly excluding query's own groupId to prevent clone leakage)
 * across Gower, Euclidean, Cosine, and Hybrid under either Uniform or Train-MI weighting.
 */
export function retrieveComparisonTable(queryProfile, weighting = 'uniform', k = 5) {
  const weights = weighting === 'mi' ? miWeightsFull : UNIFORM_WEIGHTS;
  const encQuery = encodeProfile(queryProfile, weights);
  const gallery = uniqueProfiles.filter((p) => p.groupId !== queryProfile.groupId);
  const kernels = ['gower', 'euclidean', 'cosine', 'hybrid'];

  const encodedGallery = gallery.map((p) => ({
    profile: p,
    enc: encodeProfile(p, weights),
  }));

  const byKernel = {};
  for (const kernel of kernels) {
    const ranked = encodedGallery
      .map(({ profile, enc }) => {
        const d = pairwiseDistance(queryProfile, encQuery, profile, enc, kernel, weights, ALPHA_DEFAULT);
        const matchedCore = CORE_CAT_COLS.filter((c) => queryProfile[c] === profile[c]);
        const mismatchedCore = CORE_CAT_COLS.filter((c) => queryProfile[c] !== profile[c]);
        return {
          profile,
          distance: Number(d.toFixed(4)),
          matchedCore,
          mismatchedCore,
          matchedCount: matchedCore.length,
          totalCore: CORE_CAT_COLS.length,
        };
      })
      .sort((a, b) => a.distance - b.distance)
      .slice(0, k);

    byKernel[kernel] = ranked;
  }

  // Build rank-indexed rows (#1..#5) and flag cells where kernels disagree on neighbor ID or class
  const rows = Array.from({ length: k }, (_, rankIdx) => {
    const cells = Object.fromEntries(kernels.map((m) => [m, byKernel[m][rankIdx]]));
    const ids = new Set(kernels.map((m) => cells[m].profile.id));
    const classes = new Set(kernels.map((m) => cells[m].profile.dosha));
    // Identify consensus neighbor ID if a majority shares it
    const idCounts = {};
    kernels.forEach((m) => {
      const id = cells[m].profile.id;
      idCounts[id] = (idCounts[id] || 0) + 1;
    });
    const maxCount = Math.max(...Object.values(idCounts));
    const majorityId =
      maxCount >= 2 ? Object.keys(idCounts).find((id) => idCounts[id] === maxCount) : null;

    return {
      rank: rankIdx + 1,
      cells,
      anyIdDisagreement: ids.size > 1,
      anyClassDisagreement: classes.size > 1,
      majorityId,
    };
  });

  // Compute P@5 concordance for this single query per kernel
  const queryP5 = {};
  for (const kernel of kernels) {
    const hits = byKernel[kernel].filter((item) => item.profile.dosha === queryProfile.dosha).length;
    queryP5[kernel] = `${hits}/${k}`;
  }

  return {
    rows,
    queryP5,
    kernels,
  };
}

export { NUM_COLS, CAT_COLS, CORE_CAT_COLS };
