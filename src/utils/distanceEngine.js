/**
 * Client-side mirror of python_benchmark/ayur_bench/distances.py for real categorical retrieval,
 * plus a lightweight RFC-4180 CSV parser for Dataset/synthetic/synthetic_cases_default.csv.
 */

export function parseCsvSummary(csvText) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const ch = csvText[i];
    if (inQuotes) {
      if (ch === '"' && csvText[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field.replace(/\r$/, ''));
    rows.push(row);
  }

  const valid = rows.filter((r) => r.length > 1);
  const headers = valid[0] || [];
  const body = valid.slice(1);
  const numericNames = ['age', 'bmi', 'systolic_bp', 'pulse'];

  const numericSummaries = numericNames.map((name) => {
    const idx = headers.indexOf(name);
    const vals = body
      .map((r) => Number(r[idx]))
      .filter((v) => Number.isFinite(v))
      .sort((a, b) => a - b);
    const n = vals.length;
    const mean = n > 0 ? vals.reduce((a, b) => a + b, 0) / n : 0;
    const variance = n > 1 ? vals.reduce((a, v) => a + (v - mean) ** 2, 0) / (n - 1) : 0;
    return {
      name,
      n,
      mean,
      std: Math.sqrt(variance),
      min: n > 0 ? vals[0] : 0,
      median: n > 0 ? vals[Math.floor(n / 2)] : 0,
      max: n > 0 ? vals[n - 1] : 0,
    };
  });

  const latentIdx = headers.indexOf('latent_class');
  const classCounts = {};
  if (latentIdx >= 0) {
    for (const r of body) {
      const cls = r[latentIdx];
      classCounts[cls] = (classCounts[cls] || 0) + 1;
    }
  }

  return {
    nRows: body.length,
    nColumns: headers.length,
    nNumeric: numericNames.filter((n) => headers.includes(n)).length,
    nCategorical: headers.filter(
      (h) => !numericNames.includes(h) && h !== 'latent_class' && h !== 'eval_label'
    ).length,
    numericSummaries,
    classCounts,
  };
}

function buildCategoryVocab(records, nCat) {
  const vocabs = Array.from({ length: nCat }, () => new Set());
  for (const r of records) {
    for (let c = 0; c < nCat; c++) {
      vocabs[c].add(r.traits[c]);
    }
  }
  return vocabs.map((s) => Array.from(s).sort());
}

function encodeOneHot(traits, vocabs) {
  const vec = [];
  for (let c = 0; c < vocabs.length; c++) {
    const levels = vocabs[c];
    const val = traits[c];
    for (let l = 0; l < levels.length; l++) {
      vec.push(val === levels[l] ? 1 : 0);
    }
  }
  return Float64Array.from(vec);
}

function euclideanVec(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    s += d * d;
  }
  return Math.sqrt(s);
}

function cosineVec(a, b) {
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
 * Retrieve Top-K nearest neighbours for a real record from the 1,200 real rows
 * under Gower, Euclidean (one-hot), and Cosine (one-hot). Never reads labels.
 */
export function retrieveTopKReal(queryRecord, realCases, k = 5) {
  const { records, categorical_cols: catCols } = realCases;
  const p = catCols.length;
  const vocabs = buildCategoryVocab(records, p);
  const qVec = encodeOneHot(queryRecord.traits, vocabs);

  const scored = [];
  for (const cand of records) {
    if (cand.row_idx === queryRecord.row_idx) continue;

    let mismatches = 0;
    const differed = [];
    for (let c = 0; c < p; c++) {
      if (queryRecord.traits[c] !== cand.traits[c]) {
        mismatches += 1;
        differed.push({
          trait: catCols[c],
          queryVal: queryRecord.traits[c],
          candVal: cand.traits[c],
        });
      }
    }

    const cVec = encodeOneHot(cand.traits, vocabs);
    const dGower = mismatches / p;
    const dEuc = euclideanVec(qVec, cVec);
    const dCos = cosineVec(qVec, cVec);

    scored.push({
      record: cand,
      distances: { gower: dGower, euclidean: dEuc, cosine: dCos },
      matchedCount: p - mismatches,
      totalTraits: p,
      differed,
    });
  }

  const metrics = ['gower', 'euclidean', 'cosine'];
  const byMetric = {};
  for (const m of metrics) {
    byMetric[m] = [...scored]
      .sort((a, b) => {
        const diff = a.distances[m] - b.distances[m];
        if (Math.abs(diff) > 1e-15) return diff;
        return a.record.row_idx - b.record.row_idx;
      })
      .slice(0, k);
  }

  // Flag per rank column whether all three metrics agree on the retrieved neighbour ID
  const rankDisagreements = [];
  let anyDisagreementOverall = false;
  for (let r = 0; r < k; r++) {
    const ids = new Set(metrics.map((m) => byMetric[m][r].record.case_id));
    const disagrees = ids.size > 1;
    rankDisagreements.push(disagrees);
    if (disagrees) anyDisagreementOverall = true;
  }

  return {
    metrics,
    byMetric,
    rankDisagreements,
    allAgree: !anyDisagreementOverall,
  };
}
