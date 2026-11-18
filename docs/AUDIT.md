# Repository Audit (`honest-benchmark` branch, base commit `1630eba`)

This audit inspects the current repository files on disk without modifying any code. It records:
1. Real file paths located by content search (`gower`, `np.random.normal`, `evaluate_matrix`, `mulberry32`).
2. Confirmation status for each listed problem (`P1`–`P4`) with exact file paths and line numbers.
3. Additional rule gaps (`R1`–`R9`) observed in the current tree to address in later steps.

---

## 1. Files Located by Content Search

| Search Token | Files Matched in Current Working Tree | Notes |
| :--- | :--- | :--- |
| `gower` | `Notebook/Unsupervised.ipynb`, `python_benchmark/benchmark.py`, `python_benchmark/requirements.txt`, `src/utils/distanceEngine.js`, `src/components/OverviewSection.jsx`, `src/components/ResultsSection.jsx`, `src/components/RetrievalDemoSection.jsx`, `src/components/LimitationsLiteratureSection.jsx`, `src/data/literatureData.js`, `README.md`, `package.json` | Old `python_benchmark/benchmark_sih26008.py` was previously removed and replaced by `python_benchmark/benchmark.py` (commit `9cfdb48`). |
| `np.random.normal` | `Notebook/Unsupervised.ipynb` (lines 64–67, 242–244, 394–395, 709–711) | `python_benchmark/benchmark.py` uses `rng.normal(...)` (lines 117–119) rather than `np.random.normal`. |
| `evaluate_matrix` | *(no matches in current working tree)* | Existed in deleted script `python_benchmark/benchmark_sih26008.py` (commit `72ba20d`); the same label-based selection pattern still exists inline in `Notebook/Unsupervised.ipynb` (lines 614, 780). |
| `mulberry32` | *(no matches in current working tree)* | Existed in deleted `src/data/clinicalCohort.js` (commit `72ba20d`), removed in commit `9cfdb48`. |

---

## 2. Confirmation of Problems P1–P4

### P1 — Label-leaked synthetic vitals (`y*2.2`, `y*4.5`, `-y*3.5`)
- **Status in `Notebook/Unsupervised.ipynb`:** **CONFIRMED (STILL PRESENT)**
  - `Notebook/Unsupervised.ipynb:64-66` — Synthetic demo cell generates `BMI` directly from `y_vaidya` (`np.where(y_vaidya == 0, np.random.normal(19, 2, ...))`).
  - `Notebook/Unsupervised.ipynb:240-244` — Cell 4 invents `Age_Vaya`, `BMI`, `Systolic_BP`, `Pulse_Nadi_Rate` and shifts three of them by the label index:
    - Line 242: `X['BMI'] = np.round(np.random.normal(22.5, 3.5, size=len(X)) + (y_vaidya * 1.8), 1)`
    - Line 243: `X['Systolic_BP'] = np.round(np.random.normal(118, 12, size=len(X)) + (y_vaidya * 4.0), 0)`
    - Line 244: `X['Pulse_Nadi_Rate'] = np.round(np.random.normal(72, 8, size=len(X)) - (y_vaidya * 3.0), 0)`
  - `Notebook/Unsupervised.ipynb:707-711` — Cell 8 invents the same four columns with exact shifts cited in P1:
    - Line 709: `X['BMI'] = np.round(np.random.normal(22.5, 2.0, size=len(X)) + (y_vaidya * 2.2), 1)`
    - Line 710: `X['Systolic_BP'] = np.round(np.random.normal(118, 8, size=len(X)) + (y_vaidya * 4.5), 0)`
    - Line 711: `X['Pulse_Nadi_Rate'] = np.round(np.random.normal(72, 5, size=len(X)) - (y_vaidya * 3.5), 0)`
- **Status in Python benchmark script (`python_benchmark/benchmark.py`):** **PARTIALLY RESOLVED / NEW SIMULATED VITALS STILL PRESENT**
  - The old `benchmark_sih26008.py` with `y_vaidya` shifts was removed in `9cfdb48`.
  - However, `python_benchmark/benchmark.py:103-124` still invents 4 simulated columns (`Age_Vaya`, `BMI`, `Systolic_BP`, `Pulse_Rate`) conditioned on `Body Size`, `Body Weight`, and `Physical Activity Level` (not `Dosha`). Under R4/R5 and the Problem Statement, categorical-only real data (`Updated_Prakriti_With_Features.csv`) and any clearly labelled `SYNTHETIC/SIMULATED` mixed-data experiment must be kept strictly separated rather than quietly mixed into the primary real-data benchmark.

### P2 — Label-based selection between spectral and complete-linkage via true ARI
- **Status in `Notebook/Unsupervised.ipynb`:** **CONFIRMED (STILL PRESENT)**
  - `Notebook/Unsupervised.ipynb:614` — `preds = spec_preds if adjusted_rand_score(y_vaidya, spec_preds) >= adjusted_rand_score(y_vaidya, comp_preds) else comp_preds`
  - `Notebook/Unsupervised.ipynb:780` — Identical label-based selection line in the final benchmark cell.
- **Status in `python_benchmark/benchmark.py`:** **NOT PRESENT IN CURRENT FILE (REMOVED IN `9cfdb48`)**
  - `evaluate_matrix` no longer exists in `python_benchmark/benchmark.py`; the script currently evaluates `pam_cluster` (`python_benchmark/benchmark.py:259-294, 381`).

### P3 — Non-reproducible README baseline ARIs (`0.4762`, `0.3122`, `0.2731`, `0.1620`) & cross-space silhouette comparison
- **Status in `README.md`:** **OLD NUMBERS REMOVED IN `9cfdb48`, BUT HAND-TYPED NUMBERS REMAIN (R1 GAP)**
  - The old baseline ARIs (`0.4762`, `0.3122`, `0.2731`, `0.1620`) are no longer in `README.md` (they remain in historical cell outputs inside `Notebook/Unsupervised.ipynb:357-360` and `837-840`).
  - `README.md:46` now includes a caveat that silhouette is not comparable across metric spaces.
  - However, `README.md:13, 32-44, 49-50` still contains hand-typed numbers copied from a separate scratch JS script rather than generated from `results/*.json` produced by `python_benchmark/benchmark.py` (violating R1).

### P4 — Fake patients in `clinicalCohort.js` & hard-coded results in `benchmarkData.js`
- **Status in current `src/`:** **LEGACY FILES DELETED IN `9cfdb48`, BUT HARD-CODED PROSE & NON-PYTHON JSON REMAIN (R1/R4 GAPS)**
  - `src/data/clinicalCohort.js` and `src/data/benchmarkData.js` no longer exist in the repository (deleted in commit `9cfdb48`).
  - Current UI reads `src/data/realBenchmarkResults.json`, which was produced by an external scratch Node script (not committed in the repo and not located in `results/*.json` produced by Python code — violating R1).
  - `src/components/OverviewSection.jsx:44-52` hard-codes numeric findings directly in JSX prose (`46.2%`, `43.6%`, `p = 0.0001`, `44.9%`, `p = 0.0215`, `+2.7–4.9 pp`, `p = 0.2544`, `ρ = 0.999`) instead of reading them dynamically from `results/*.json` (violating R1).
  - `src/components/ResultsSection.jsx:553-555` hard-codes `ρ = 0.955` and `ρ > 0.99` in JSX prose rather than reading from JSON (violating R1).
  - `src/components/LimitationsLiteratureSection.jsx:14, 24` hard-codes `MI < 0.007` and `ARI (0.10–0.15)` in JSX prose rather than referencing JSON or qualitative text (R1).

---

## 3. Additional Rule Gaps Observed (`R1`–`R9`)

1. **R1 (`results/*.json` pipeline):** No `results/` directory exists yet; `python_benchmark/benchmark.py` defaults to `--out-dir outputs` and does not write the complete JSON consumed by the UI.
2. **R2 (Train-only label usage):** `python_benchmark/benchmark.py` computes MI strictly on training folds, which obeys R2, but `src/utils/distanceEngine.js:12, 100` uses `miWeightsFull` (computed on all 100 profiles) in the interactive Retrieval Demo when toggled to `Train-MI weights`.
3. **R4 (Synthetic/Simulated separation & labelling):** `python_benchmark/benchmark.py:101-124` mixes 4 simulated continuous vitals directly into the single benchmark run rather than separating (a) the real categorical-only CSV (`Updated_Prakriti_With_Features.csv`) from (b) any explicitly labelled `SYNTHETIC/SIMULATED` mixed-modality benchmark.
4. **R6 (Superseded notebook banner):** `Notebook/Unsupervised.ipynb` does not yet have a top markdown cell stating that it is superseded and contains leaked-vitals and label-selection logic.
5. **Data provenance wording (`CONTEXT.md` Data facts):** `README.md:19` and `src/components/OverviewSection.jsx:64-67` do not yet cite Kaggle `adityaprashantshirke/prakriti-updated`, nor state that origin/license/labeler are unstated, nor consistently refer to the labels as `"dataset-provided Dosha labels"`. Also `Dataset/tridosha.zip` check confirms `1` exact duplicate row (1,199 unique full 30-column rows) alongside 100 unique 20-column prefixes.
6. **Headline framing (`CONTEXT.md` Problem statement):** Current UI/Python code mixes MI weighting, Hamming, and Hybrid into the primary benchmark table rather than putting the three-distance benchmark (`Gower`, `Euclidean`, `Cosine`) as the headline and labelling MI weighting, hybrid distance, and spectral clustering as `EXPLORATORY`.
7. **R9 (`SIH26008` / `Smart India Hackathon`):** Verified absent from all code, notebook, and README files on disk (excluding the prohibition rule inside `docs/CONTEXT.md`).
