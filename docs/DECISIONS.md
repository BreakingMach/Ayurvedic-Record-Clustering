# Methodological & Implementation Decisions (`docs/DECISIONS.md`)

Conservative choices logged per Rule `R7` in `docs/CONTEXT.md`.

---

## D1. Exact Duplicate Row in `Updated_Prakriti_With_Features.csv`
- **Observation:** `Dataset/tridosha.zip` (`Updated_Prakriti_With_Features.csv`, 1,200 rows × 30 columns) contains `1` exact full-row duplicate (1,199 unique rows).
- **Decision:** Keep all 1,200 rows as distributed in the source archive and report `duplicate_row_count` and `duplicate_row_indices` in `DatasetBundle.metadata` (`data.py`).
- **Rationale:** Conservative preservation of the source dataset; dropping rows alters published class totals (`624, 264, 144, 72, 48, 48`) without knowing whether two identical survey respondents occurred independently.

## D2. Missing-Value Imputation & Pairwise Averaging in `distances.py`
- **Gower & Hamming:** Missing entries are NOT imputed; pairwise dissimilarity between rows $i$ and $j$ averages only over features observed in both rows ($\delta_{ijk} = 1$ iff both non-missing). If two distinct rows share zero mutually observed features, dissimilarity falls back conservatively to `1.0` (maximum dissimilarity; configurable via `config.yaml`). Constant numeric columns (observed range `0`) contribute `0.0` dissimilarity where both entries are present.
- **Euclidean & Cosine:** Both operate on the exact same encoded feature matrix. Missing numeric values are imputed with the column **median** (`0.0` if an entire column is missing) prior to z-scoring (`ddof=0`, `0.0` if zero variance). Missing categorical values are imputed with the column **mode** (deterministic lexicographic tie-break; `"__MISSING__"` if entirely missing) prior to full one-hot encoding (retaining all sorted levels so categorical L2 norm is constant across rows).
- **Unsupervised preprocessing (R2):** Ranges, medians, means, standard deviations, and modes are estimated from feature columns only across all rows without any access to labels; all distance functions explicitly raise `ValueError` if a label column is present.

## D3. Deterministic Tie-Breaking in LOO Retrieval (`evaluation.py`)
- **Decision:** Leave-one-out neighbor ranking masks the diagonal to `+inf` and sorts each row with `np.argsort(..., kind="mergesort")`.
- **Rationale:** On discrete categorical data, many pairs share identical distances. `mergesort` is guaranteed stable in NumPy and deterministically breaks exact distance ties by ascending original row index, ensuring 100% reproducible `Precision@k` across runs and platforms.

## D4. Shuffled-Label Control Chance Tolerance (`test_evaluation_and_stats.py`)
- **Derivation:** Under random permutation of the 6 imbalanced dataset-provided `Dosha` labels (`counts = [624, 264, 144, 72, 48, 48]`, $N = 1,200$), each class $c$ has prior $p_c = n_c / N$.
  - Expected LOO `Precision@5` for a query of class $c$ under random labels is $p_c$, so the exact **macro-averaged LOO P@5 chance baseline** is $\frac{1}{6}\sum_{c=1}^{6} p_c = \frac{1}{6} \approx 0.1667$. With $n_{\min} = 48$ samples in the two smallest classes and $k = 5$, the binomial standard error on macro P@5 is $\approx 0.008$; a conservative band of `±0.04` (`[0.1267, 0.2067]`, $\sim 5\text{ SE}$) reliably passes under true random labels while immediately catching any label leakage.
  - For 5-NN macro-F1 on imbalanced shuffled labels, rare classes (`p = 0.04`) rarely win a 5-neighbor majority vote, so true random-label macro-F1 sits slightly below uniform chance (`~0.11–0.16`, strictly bounded well below `0.22` and above `0.05`). We assert `0.05 <= macro_f1_mean <= 0.22` across 3×5 repeated CV.

## D5. Paired Effect Size & Zero-Difference Handling (`stats.py`)
- **Decision:** Report both Cohen's $d_z = \bar{\Delta} / s_\Delta$ and matched-pairs rank-biserial correlation $r_{rb} = (W_+ - W_-) / (W_+ + W_-)$ alongside two-sided paired Wilcoxon signed-rank tests with step-down Holm–Bonferroni correction. When two metrics produce identical scores across all paired folds/seeds ($\Delta_i = 0\ \forall i$), Wilcoxon returns `stat = 0.0`, `p_raw = 1.0`, `cohen_dz = 0.0`, `rank_biserial_r = 0.0` rather than raising a SciPy error.

## D6. Trait-Subset Sampling at `m = 29` & Tied-Distance Metrics (`run_real.py`)
- **Subset count at `m = 29`:** Since the real dataset has exactly `p = 29` categorical traits, there is only $\binom{29}{29} = 1$ unique 29-trait subset. For `m < 29`, `run_real.py` samples `20` distinct random trait subsets using fixed seeds (`subset_seed_base + m * 100 + s`). For `m = 29`, it evaluates the single unique full feature set (`n_subsets = 1`, `std = 0.0`) rather than repeating the identical calculation 20 times.
- **Tied-distance reporting:** For each `(N, N)` distance matrix $D$, `tied_distance_pairs` is defined on the $\binom{N}{2} = 719{,}400$ upper-triangular pairs as `(n_pairs - n_unique_distances)` (counting exact float64 duplicates seen by `mergesort`), complemented by `top5_boundary_tie_rows` (count of rows $i$ where $d_{(5)}(i) = d_{(6)}(i)$ exactly, i.e., where top-5 retrieval depends on tie-breaking).
