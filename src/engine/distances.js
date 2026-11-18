/**
 * src/engine/distances.js
 *
 * Client-side distance engine for the Workbench page.
 * All computation runs in the browser (R13).
 *
 * Implements:
 *   gowerDistance          – range-normalised numerics, simple matching categoricals, observed-only
 *   euclideanModeImpute    – z-scored numerics, one-hot categoricals, mode-imputed missing
 *   cosineModeImpute       – same encoding as euclidean, cosine similarity → distance
 *   euclideanObservedOnly  – L2 on observed traits only (no imputation)
 *   cosineObservedOnly     – cosine on observed traits only
 *   topK                   – stable sort by (distance ASC, index ASC)
 *   knnClassVote           – class frequency map over top-k
 *   clusterAssignment      – mean distance to each cluster's members
 *
 * Parity requirement: neighbour indices and distances must match Python parity.json within 1e-9.
 * Tie-break: stable ascending sort by record index (matches Python numpy.argsort(kind='stable')).
 *
 * Mode tie-break (for imputation): most frequent level in full DB; lexicographic if tied.
 * Range for Gower: derived from full DB rows (not from query); constant stored in precomputed stats.
 */

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Precompute DB statistics from real_records.json rows.
 * @param {Object} meta   – real_records.json root {traits, rows, labels}
 * @returns {{ modes, ranges, zStats }} all arrays indexed by trait position
 */
export function precomputeStats(meta) {
  const { traits, rows } = meta;
  const nTraits = traits.length;
  const nRows = rows.length;

  // Frequency tables for mode
  const freq = Array.from({ length: nTraits }, () => ({}));
  for (let r = 0; r < nRows; r++) {
    const row = rows[r];
    for (let t = 0; t < nTraits; t++) {
      const v = row[t];
      if (v !== null && v !== undefined) {
        freq[t][v] = (freq[t][v] || 0) + 1;
      }
    }
  }

  // Mode: most frequent level index; lexicographic tie-break on level string
  const modes = new Int32Array(nTraits);
  for (let t = 0; t < nTraits; t++) {
    const levels = traits[t].levels;
    let bestIdx = 0;
    let bestCount = -1;
    for (let li = 0; li < levels.length; li++) {
      const count = freq[t][li] || 0;
      if (
        count > bestCount ||
        (count === bestCount && levels[li] < levels[bestIdx])
      ) {
        bestCount = count;
        bestIdx = li;
      }
    }
    modes[t] = bestIdx;
  }

  return { modes, nTraits, nRows };
}

/**
 * Precompute Gower ranges from real_records.json rows.
 * Returns Float64Array of length nTraits (0 for categorical traits).
 * @param {Object} meta   – real_records.json root; numericCols is ignored (all categorical)
 */
export function precomputeGowerRanges(meta, numericCols = [], numericVals = null) {
  const { traits } = meta;
  const nTraits = traits.length;
  const nNum = numericCols ? numericCols.length : 0;
  const ranges = new Float64Array(nTraits + nNum);

  for (let t = 0; t < nTraits; t++) {
    ranges[t] = 1; // categorical: 0 if match, 1 if mismatch
  }

  if (nNum > 0 && numericVals) {
    for (let ni = 0; ni < nNum; ni++) {
      let mn = Infinity;
      let mx = -Infinity;
      for (let r = 0; r < numericVals.length; r++) {
        const v = numericVals[r][ni];
        if (v !== null && v !== undefined && !isNaN(v)) {
          if (v < mn) mn = v;
          if (v > mx) mx = v;
        }
      }
      ranges[nTraits + ni] = mx > mn ? mx - mn : 1;
    }
  }

  return ranges;
}

/**
 * Precompute z-score statistics for numeric vitals.
 * @param {number[][]} numericVals  – array of rows, each row is [age, bmi, sbp, pulse]
 * @returns {{ means: Float64Array, stds: Float64Array }}
 */
export function precomputeZStats(numericVals) {
  if (!numericVals || numericVals.length === 0) return { means: new Float64Array(0), stds: new Float64Array(0) };
  const nCols = numericVals[0].length;
  const nRows = numericVals.length;
  const means = new Float64Array(nCols);
  const stds = new Float64Array(nCols);

  for (let c = 0; c < nCols; c++) {
    let sum = 0;
    let count = 0;
    for (let r = 0; r < nRows; r++) {
      const v = numericVals[r][c];
      if (v !== null && v !== undefined && !isNaN(v)) {
        sum += v;
        count++;
      }
    }
    means[c] = count > 0 ? sum / count : 0;

    let ss = 0;
    for (let r = 0; r < nRows; r++) {
      const v = numericVals[r][c];
      if (v !== null && v !== undefined && !isNaN(v)) {
        const d = v - means[c];
        ss += d * d;
      }
    }
    stds[c] = count > 0 ? Math.sqrt(ss / count) : 1;
    if (stds[c] < 1e-12) stds[c] = 1;
  }
  return { means, stds };
}

// ---------------------------------------------------------------------------
// Gower distance (query → all DB records)
// ---------------------------------------------------------------------------

/**
 * Compute Gower distance from query to all DB records.
 *
 * Categoricals: simple matching (0=same, 1=different). Averaged over observed traits only.
 * Numerics: |q_i - x_i| / range_i, range from full DB. Missing numeric = skip.
 * Query null/undefined = trait missing (skip from both query and DB side).
 *
 * @param {(number|null)[]} queryTraits   – length nTraits; null = unknown
 * @param {Int32Array[]}    dbRows        – each row is Int32Array of length nTraits
 * @param {number}          nTraits
 * @param {number}          nRows
 * @param {number[]}        numericColIdxs  – indices into queryTraits that are numeric (empty for real data)
 * @param {number[]|null}   queryNumerics   – numeric vitals for query (synthetic only)
 * @param {number[][]}      dbNumerics      – numeric vitals per DB row (synthetic only)
 * @param {Float64Array}    numericRanges   – range per numeric vital
 * @returns {Float64Array} distances to all DB records
 */
export function gowerDistance(
  queryTraits,
  dbRows,
  nTraits,
  nRows,
  numericColIdxs = [],
  queryNumerics = null,
  dbNumerics = null,
  numericRanges = null
) {
  const distances = new Float64Array(nRows);

  for (let r = 0; r < nRows; r++) {
    const dbRow = dbRows[r];
    let sumDiff = 0;
    let count = 0;

    // Categorical traits
    for (let t = 0; t < nTraits; t++) {
      const q = queryTraits[t];
      if (q === null || q === undefined) continue; // query missing → skip
      const d = dbRow[t];
      if (d === null || d === undefined || d < 0) continue; // DB missing → skip
      sumDiff += q === d ? 0 : 1;
      count++;
    }

    // Numeric vitals (synthetic only)
    if (queryNumerics && dbNumerics && numericRanges) {
      const dbNum = dbNumerics[r];
      for (let ni = 0; ni < queryNumerics.length; ni++) {
        const qv = queryNumerics[ni];
        if (qv === null || qv === undefined || isNaN(qv)) continue;
        const dv = dbNum[ni];
        if (dv === null || dv === undefined || isNaN(dv)) continue;
        const rng = numericRanges[ni] || 1;
        sumDiff += Math.abs(qv - dv) / rng;
        count++;
      }
    }

    distances[r] = count > 0 ? sumDiff / count : 1;
  }

  return distances;
}

// ---------------------------------------------------------------------------
// One-hot encoding helper
// ---------------------------------------------------------------------------

/**
 * Build one-hot vector for a single record.
 * Missing traits are imputed with mode (modeImpute=true) or left as zeros.
 * Returns Float64Array.
 */
function buildOneHot(traitValues, traits, modes, modeImpute = true) {
  // Compute total one-hot length
  let totalLen = 0;
  for (let t = 0; t < traits.length; t++) {
    totalLen += traits[t].levels.length;
  }

  const vec = new Float64Array(totalLen);
  let offset = 0;

  for (let t = 0; t < traits.length; t++) {
    const levels = traits[t].levels;
    let val = traitValues[t];
    if (val === null || val === undefined) {
      if (modeImpute) {
        val = modes[t];
      } else {
        offset += levels.length;
        continue; // leave zeros
      }
    }
    if (val >= 0 && val < levels.length) {
      vec[offset + val] = 1;
    }
    offset += levels.length;
  }

  return vec;
}

/**
 * Build one-hot with optional z-scored numerics appended.
 */
function buildEncodedVec(traitValues, traits, modes, modeImpute,
  numericVals, zMeans, zStds, numericMedImpute) {
  const catVec = buildOneHot(traitValues, traits, modes, modeImpute);

  if (!numericVals || numericVals.length === 0) return catVec;

  const nNum = numericVals.length;
  const full = new Float64Array(catVec.length + nNum);
  full.set(catVec);

  for (let ni = 0; ni < nNum; ni++) {
    let v = numericVals[ni];
    if (v === null || v === undefined || isNaN(v)) {
      v = numericMedImpute ? numericMedImpute[ni] : 0;
    }
    full[catVec.length + ni] = (v - (zMeans?.[ni] || 0)) / (zStds?.[ni] || 1);
  }

  return full;
}

// ---------------------------------------------------------------------------
// Euclidean distance (mode-imputed)
// ---------------------------------------------------------------------------

/**
 * Euclidean distance from query to all DB records.
 * One-hot categoricals (mode-imputed), z-scored numerics (median-imputed).
 *
 * @param {(number|null)[]} queryTraits
 * @param {Int32Array[]}    dbRows
 * @param {Object[]}        traits        – [{name, levels}]
 * @param {Int32Array}      modes         – mode per trait (index)
 * @param {number}          nRows
 * @param {number[]|null}   queryNumerics
 * @param {number[][]}      dbNumerics
 * @param {Float64Array}    zMeans
 * @param {Float64Array}    zStds
 * @param {Float64Array}    numericMedians  – median per numeric col for imputation
 * @returns {Float64Array}
 */
export function euclideanModeImpute(
  queryTraits,
  dbRows,
  traits,
  modes,
  nRows,
  queryNumerics = null,
  dbNumerics = null,
  zMeans = null,
  zStds = null,
  numericMedians = null
) {
  const qVec = buildEncodedVec(
    queryTraits, traits, modes, true,
    queryNumerics, zMeans, zStds, numericMedians
  );

  const distances = new Float64Array(nRows);

  for (let r = 0; r < nRows; r++) {
    const dbNum = dbNumerics ? dbNumerics[r] : null;
    const dbVec = buildEncodedVec(
      dbRows[r], traits, modes, true,
      dbNum, zMeans, zStds, numericMedians
    );

    let ss = 0;
    for (let i = 0; i < qVec.length; i++) {
      const d = qVec[i] - dbVec[i];
      ss += d * d;
    }
    distances[r] = Math.sqrt(ss);
  }

  return distances;
}

// ---------------------------------------------------------------------------
// Cosine distance (mode-imputed)
// ---------------------------------------------------------------------------

/**
 * Cosine distance (1 - cosine similarity) from query to all DB records.
 * Same encoding as euclideanModeImpute.
 */
export function cosineModeImpute(
  queryTraits,
  dbRows,
  traits,
  modes,
  nRows,
  queryNumerics = null,
  dbNumerics = null,
  zMeans = null,
  zStds = null,
  numericMedians = null
) {
  const qVec = buildEncodedVec(
    queryTraits, traits, modes, true,
    queryNumerics, zMeans, zStds, numericMedians
  );

  const qNorm = Math.sqrt(qVec.reduce((s, v) => s + v * v, 0));

  const distances = new Float64Array(nRows);

  for (let r = 0; r < nRows; r++) {
    const dbNum = dbNumerics ? dbNumerics[r] : null;
    const dbVec = buildEncodedVec(
      dbRows[r], traits, modes, true,
      dbNum, zMeans, zStds, numericMedians
    );

    let dot = 0;
    let dbNorm2 = 0;
    for (let i = 0; i < qVec.length; i++) {
      dot += qVec[i] * dbVec[i];
      dbNorm2 += dbVec[i] * dbVec[i];
    }

    const denom = qNorm * Math.sqrt(dbNorm2);
    distances[r] = denom < 1e-15 ? 1 : 1 - dot / denom;
  }

  return distances;
}

// ---------------------------------------------------------------------------
// Observed-only variants
// ---------------------------------------------------------------------------

/**
 * Euclidean distance computed only over observed (non-null) traits.
 * Missing traits from query are excluded on both sides.
 * This is equivalent to Gower on categorical-only real data (up to monotone scaling).
 */
export function euclideanObservedOnly(
  queryTraits,
  dbRows,
  traits,
  nRows,
  queryNumerics = null,
  dbNumerics = null,
  zMeans = null,
  zStds = null
) {
  // Build partial one-hot for observed query traits
  const observedMask = queryTraits.map((v) => v !== null && v !== undefined);
  const nTraits = traits.length;

  // Partial one-hot offsets
  const offsets = new Int32Array(nTraits + 1);
  for (let t = 0; t < nTraits; t++) {
    offsets[t + 1] = offsets[t] + traits[t].levels.length;
  }
  const totalCatLen = offsets[nTraits];

  const distances = new Float64Array(nRows);

  for (let r = 0; r < nRows; r++) {
    let ss = 0;

    for (let t = 0; t < nTraits; t++) {
      if (!observedMask[t]) continue;
      const qv = queryTraits[t];
      const dv = dbRows[r][t];
      const levels = traits[t].levels;

      // One-hot for query
      for (let li = 0; li < levels.length; li++) {
        const qi = qv === li ? 1 : 0;
        const di = dv === li ? 1 : 0;
        const diff = qi - di;
        ss += diff * diff;
      }
    }

    // Numeric vitals (observed only)
    if (queryNumerics && dbNumerics && zMeans && zStds) {
      const dbNum = dbNumerics[r];
      for (let ni = 0; ni < queryNumerics.length; ni++) {
        const qv = queryNumerics[ni];
        if (qv === null || qv === undefined || isNaN(qv)) continue;
        const dv = dbNum[ni];
        if (dv === null || dv === undefined || isNaN(dv)) continue;
        const qz = (qv - zMeans[ni]) / zStds[ni];
        const dz = (dv - zMeans[ni]) / zStds[ni];
        ss += (qz - dz) * (qz - dz);
      }
    }

    distances[r] = Math.sqrt(ss);
  }

  return distances;
}

/**
 * Cosine distance computed only over observed traits (no imputation).
 */
export function cosineObservedOnly(
  queryTraits,
  dbRows,
  traits,
  nRows,
  queryNumerics = null,
  dbNumerics = null,
  zMeans = null,
  zStds = null
) {
  const observedMask = queryTraits.map((v) => v !== null && v !== undefined);
  const nTraits = traits.length;

  const distances = new Float64Array(nRows);

  for (let r = 0; r < nRows; r++) {
    let dot = 0;
    let qNorm2 = 0;
    let dNorm2 = 0;

    for (let t = 0; t < nTraits; t++) {
      if (!observedMask[t]) continue;
      const qv = queryTraits[t];
      const dv = dbRows[r][t];
      const levels = traits[t].levels;

      for (let li = 0; li < levels.length; li++) {
        const qi = qv === li ? 1 : 0;
        const di = dv === li ? 1 : 0;
        dot += qi * di;
        qNorm2 += qi * qi;
        dNorm2 += di * di;
      }
    }

    // Numeric vitals
    if (queryNumerics && dbNumerics && zMeans && zStds) {
      const dbNum = dbNumerics[r];
      for (let ni = 0; ni < queryNumerics.length; ni++) {
        const qv = queryNumerics[ni];
        if (qv === null || qv === undefined || isNaN(qv)) continue;
        const dv = dbNum[ni];
        if (dv === null || dv === undefined || isNaN(dv)) continue;
        const qz = (qv - zMeans[ni]) / zStds[ni];
        const dz = (dv - zMeans[ni]) / zStds[ni];
        dot += qz * dz;
        qNorm2 += qz * qz;
        dNorm2 += dz * dz;
      }
    }

    const denom = Math.sqrt(qNorm2) * Math.sqrt(dNorm2);
    distances[r] = denom < 1e-15 ? 1 : 1 - dot / denom;
  }

  return distances;
}

// ---------------------------------------------------------------------------
// Top-k retrieval
// ---------------------------------------------------------------------------

/**
 * Return top-k nearest records with stable tie-breaking by record index (ascending).
 *
 * @param {Float64Array} distances – distances to all DB records
 * @param {number}       k        – number of neighbours
 * @returns {{ indices: number[], distances: number[], tieCount: number }}
 *   tieCount = number of records with distance == distances[k-1] (the k-th NN distance)
 */
export function topK(distances, k) {
  const n = distances.length;
  k = Math.min(k, n);

  // Build index array and sort stably
  const indices = Array.from({ length: n }, (_, i) => i);
  // JS Array.sort is stable in V8 (ES2019 spec requires stable sort)
  indices.sort((a, b) => {
    const diff = distances[a] - distances[b];
    if (diff !== 0) return diff;
    return a - b; // tie-break: lower index first (matches Python mergesort)
  });

  const topIndices = indices.slice(0, k);
  const topDistances = topIndices.map((i) => distances[i]);

  // Count ties at k-th distance
  const kDist = topDistances[k - 1];
  let tieCount = 0;
  for (let i = 0; i < n; i++) {
    if (Math.abs(distances[i] - kDist) < 1e-12) tieCount++;
  }

  return { indices: topIndices, distances: topDistances, tieCount };
}

// ---------------------------------------------------------------------------
// kNN class vote
// ---------------------------------------------------------------------------

/**
 * Count class occurrences among top-k neighbours.
 * @param {number[]} topKIndices – indices of top-k records
 * @param {number[]} labels      – class label per record (integer codes)
 * @param {string[]} classNames  – class name per code
 * @returns {{ className: count }} sorted descending by count
 */
export function knnClassVote(topKIndices, labels, classNames) {
  const counts = {};
  for (const idx of topKIndices) {
    const cls = classNames[labels[idx]];
    counts[cls] = (counts[cls] || 0) + 1;
  }
  return counts;
}

// ---------------------------------------------------------------------------
// Cluster assignment
// ---------------------------------------------------------------------------

/**
 * Assign query to the cluster with smallest mean distance to its members.
 *
 * @param {Float64Array} queryDistances – distances from query to all 1,200 (or N) DB records
 * @param {number[]}     clusterLabels  – cluster label per DB record (integers 0..k-1)
 * @param {number}       k             – number of clusters
 * @returns {{ assignedCluster: number, meanDistances: number[], memberCounts: number[] }}
 */
export function clusterAssignment(queryDistances, clusterLabels, k) {
  const sumDist = new Float64Array(k);
  const counts = new Int32Array(k);

  for (let i = 0; i < clusterLabels.length; i++) {
    const c = clusterLabels[i];
    if (c >= 0 && c < k) {
      sumDist[c] += queryDistances[i];
      counts[c]++;
    }
  }

  const meanDist = new Float64Array(k);
  let bestCluster = 0;
  let bestMean = Infinity;

  for (let c = 0; c < k; c++) {
    meanDist[c] = counts[c] > 0 ? sumDist[c] / counts[c] : Infinity;
    if (meanDist[c] < bestMean) {
      bestMean = meanDist[c];
      bestCluster = c;
    }
  }

  return {
    assignedCluster: bestCluster,
    meanDistances: Array.from(meanDist),
    memberCounts: Array.from(counts),
  };
}

// ---------------------------------------------------------------------------
// CSV export helper
// ---------------------------------------------------------------------------

/**
 * Build CSV string from an array of objects with consistent keys.
 */
export function toCsv(rows) {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(
      headers
        .map((h) => {
          const v = String(row[h] ?? '');
          return v.includes(',') || v.includes('"') || v.includes('\n')
            ? `"${v.replace(/"/g, '""')}"`
            : v;
        })
        .join(',')
    );
  }
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// CSV import helper (from legacy App.jsx – preserved for compat)
// ---------------------------------------------------------------------------
export function parseCsvSummary(csvText) {
  const lines = csvText.split('\n').filter((l) => l.trim());
  const header = lines[0].split(',').map((h) => h.trim());
  const rows = lines.slice(1).map((l) => {
    const vals = l.split(',');
    const obj = {};
    header.forEach((h, i) => { obj[h] = vals[i]?.trim(); });
    return obj;
  });
  return { header, rows, nRows: rows.length };
}
