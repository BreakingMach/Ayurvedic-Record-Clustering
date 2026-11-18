/**
 * Client-side exact mirror of python_benchmark/ayur_bench/distances.py.
 *
 * Operates strictly on feature values (never accesses label columns).
 * Tie-breaking matches Python's `np.argsort(..., kind='mergesort')`:
 * exact distance ties are broken deterministically by ascending `row_idx`.
 */

function buildCategoryVocab(records, nCat) {
  const vocabs = Array.from({ length: nCat }, () => new Set());
  for (const r of records) {
    for (let c = 0; c < nCat; c++) {
      vocabs[c].add(r.traits[c]);
    }
  }
  return vocabs.map((s) => Array.from(s).sort());
}

function encodeVector(numerics, traits, numericCols, numericStats, vocabs) {
  const vec = [];
  for (let i = 0; i < numericCols.length; i++) {
    const st = numericStats[numericCols[i]];
    const z = st.std > 0 ? (numerics[i] - st.mean) / st.std : 0;
    vec.push(z);
  }
  for (let c = 0; c < vocabs.length; c++) {
    const levels = vocabs[c];
    const val = traits[c];
    for (let l = 0; l < levels.length; l++) {
      vec.push(val === levels[l] ? 1 : 0);
    }
  }
  return Float64Array.from(vec);
}

function computeGowerPair(qNum, qTraits, cNum, cTraits, numericCols, numericStats) {
  const pNum = numericCols.length;
  const pCat = qTraits.length;
  let sum = 0;
  let count = 0;

  for (let i = 0; i < pNum; i++) {
    const st = numericStats[numericCols[i]];
    const range = st.range > 0 ? st.range : 1;
    sum += st.range > 0 ? Math.abs(qNum[i] - cNum[i]) / range : 0;
    count += 1;
  }
  for (let c = 0; c < pCat; c++) {
    sum += qTraits[c] === cTraits[c] ? 0 : 1;
    count += 1;
  }
  return count > 0 ? sum / count : 0;
}

function computeEuclideanPair(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    s += d * d;
  }
  return Math.sqrt(s);
}

function computeCosinePair(a, b) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na * nb);
  return denom > 1e-12 ? Math.max(0, Math.min(2, 1 - dot / denom)) : 1;
}

/**
 * Retrieve Top-K nearest neighbours for a query record under Gower, Euclidean, and Cosine.
 * Excludes the query's own `row_idx` (leave-one-out).
 */
export function retrieveTopKAcrossMetrics({
  queryRecord,
  numericOverrides = null,
  cohort,
  k = 5,
}) {
  const { records, categorical_cols: catCols, numeric_cols: numCols, numeric_stats: numStats } =
    cohort;
  const vocabs = buildCategoryVocab(records, catCols.length);
  const qNum =
    numCols.length > 0 ? (numericOverrides ?? queryRecord.numerics) : [];
  const qTraits = queryRecord.traits;
  const qVec = encodeVector(qNum, qTraits, numCols, numStats, vocabs);

  const scored = [];
  for (const cand of records) {
    if (cand.row_idx === queryRecord.row_idx) continue;
    const cNum = numCols.length > 0 ? cand.numerics : [];
    const cVec = encodeVector(cNum, cand.traits, numCols, numStats, vocabs);

    const dGower = computeGowerPair(qNum, qTraits, cNum, cand.traits, numCols, numStats);
    const dEuc = computeEuclideanPair(qVec, cVec);
    const dCos = computeCosinePair(qVec, cVec);

    const matchedCols = [];
    const differedCols = [];
    for (let c = 0; c < catCols.length; c++) {
      if (qTraits[c] === cand.traits[c]) matchedCols.push(catCols[c]);
      else differedCols.push({ col: catCols[c], queryVal: qTraits[c], candVal: cand.traits[c] });
    }

    scored.push({
      record: cand,
      distances: { gower: dGower, euclidean: dEuc, cosine: dCos },
      matchedCount: matchedCols.length,
      totalCat: catCols.length,
      matchedCols,
      differedCols,
    });
  }

  const kernels = ['gower', 'euclidean', 'cosine'];
  const byKernel = {};
  for (const m of kernels) {
    byKernel[m] = [...scored]
      .sort((a, b) => {
        const diff = a.distances[m] - b.distances[m];
        if (Math.abs(diff) > 1e-15) return diff;
        return a.record.row_idx - b.record.row_idx; // deterministic mergesort tie-break
      })
      .slice(0, k);
  }

  const labelKey = queryRecord.dataset_label !== undefined ? 'dataset_label' : 'latent_class';
  const queryLabel = queryRecord[labelKey];

  const rows = Array.from({ length: k }, (_, rankIdx) => {
    const cells = Object.fromEntries(
      kernels.map((m) => {
        const item = byKernel[m][rankIdx];
        return [
          m,
          {
            record: item.record,
            label: item.record[labelKey],
            distance: item.distances[m],
            matchedCount: item.matchedCount,
            totalCat: item.totalCat,
            differedCols: item.differedCols,
            matchesQueryLabel: item.record[labelKey] === queryLabel,
          },
        ];
      })
    );

    const ids = new Set(kernels.map((m) => cells[m].record.case_id));
    const idCounts = {};
    kernels.forEach((m) => {
      const id = cells[m].record.case_id;
      idCounts[id] = (idCounts[id] || 0) + 1;
    });
    const maxCount = Math.max(...Object.values(idCounts));
    const majorityId =
      maxCount >= 2 ? Object.keys(idCounts).find((id) => idCounts[id] === maxCount) : null;

    return {
      rank: rankIdx + 1,
      cells,
      anyDisagreement: ids.size > 1,
      majorityId,
    };
  });

  const hitsByKernel = Object.fromEntries(
    kernels.map((m) => [
      m,
      `${byKernel[m].filter((item) => item.record[labelKey] === queryLabel).length}/${k}`,
    ])
  );

  return {
    kernels,
    rows,
    hitsByKernel,
    queryLabel,
    labelKey,
  };
}
