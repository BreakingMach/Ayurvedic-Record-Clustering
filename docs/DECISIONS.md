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

## D7. Blinded Expert-Review Sheet Stratified Allocation & Answer Key Separation (`expert_review/`)
- **Stratified 40-query allocation:** Exact proportional shares for 40 queries out of 1,200 rows are `[20.8, 8.8, 4.8, 2.4, 1.6, 1.6]` across `[Vata+Pitta, Vata, Pitta, Kapha, Pitta+Kapha, Vata+Kapha]`. To treat the two equal-sized smallest classes (`48` rows each) symmetrically while minimizing total rounding error via largest-remainder allocation, `build_sheet.py` allocates `[21, 9, 4, 2, 2, 2]` (`sum = 40`).
- **Hidden answer key separation:** The unblinded mapping (`pair_id`, original row indices, true `neighbour_rank`, real-data distance, and dataset-provided `Dosha` labels) is written separately to `expert_review/private/answer_key.csv` so only `rating_sheet.xlsx` and `instructions.md` are shared with reviewers.
- **Pending status enforcement:** Until at least one completed reviewer sheet is scored by `expert_review/analysis/expert_agreement.py`, `results/expert_review.json` reports `"status": "pending"` and `"display_label": "Practitioner validation: pending"`, surfaced consistently in docs and the UI.

## D8. Post-Hoc Scaling Ablation on Synthetic Cohorts (`run_scaling_ablation.py`)
- **Status:** Labelled explicitly as `EXPLORATORY and POST-HOC`. Added after inspecting Experiment B results to isolate the confounder between distance metric formulation (L1 vs L2 vs angular) and numeric feature pre-scaling (range normalization vs z-scoring).
- **Frozen Main Grid (R3):** The primary benchmark results in `results/synthetic.json` remain completely frozen and unmodified. Ablation results are stored separately in `results/synthetic_scaling_ablation.json` and documented in `docs/SCALING_ABLATION.md`.
- **Ablation Scope:** Evaluated on the synthetic baseline (`eps=0.2, d=1.0, outliers=0, missing=0, label_noise=0, m=29`), the numeric separation sweep ($d \in \{0.0, 0.25, 0.5, 1.0, 2.0\}$), and the categorical noise sweep ($\varepsilon \in \{0.0, 0.1, 0.2, 0.3, 0.4\}$) across the identical 20 seeds (`42..61`).
- **Variants:**
  - `gower_zscore`: Standard deviation normalized numerics ($|x_{ik} - x_{jk}| / s_k = |z_{ik} - z_{jk}|$) averaged with simple matching categoricals.
  - `euclidean_range`: Range-normalised numerics $[0, 1]$ concatenated with one-hot categoricals, Euclidean distance.
  - `cosine_range`: Range-normalised numerics $[0, 1]$ concatenated with one-hot categoricals, Cosine distance.

## D9. Missingness Robustness Protocol on Real Categorical Data (`run_missingness.py`)
- **Protocol:** Evaluates query-only MCAR missingness across missing fractions $p \in \{0.0, 0.1, 0.2, 0.3, 0.5, 0.7\}$ over all $N=1,200$ leave-one-out queries against the complete database across 20 fixed seeds (`42..61`). For each query, exactly $k = \text{round}(p \times 29)$ traits are masked at random without replacement.
- **Observed-Only Mathematical Equivalence:**
  - On categorical data, `cosine_observed_only` is algebraically identical to `gower` ($D_{\text{cosine\_obs}} \equiv D_{\text{gower}} = \text{mismatches}_{O_i} / |O_i|$).
  - `euclidean_observed_only` is an exact monotone transform of `gower` ($D_{\text{euclid\_obs}} = \sqrt{2 |O_i|} \cdot \sqrt{D_{\text{gower}}}$). Because $|O_i|$ is constant across all candidate database records for a fixed query, neighbour rankings, kNN macro-F1, accuracy, and LOO macro P@5 under stable mergesort are 100% mathematically identical to `gower`.
  - Similarly, `cosine_modeimpute` is an exact monotonic transformation of `euclidean_modeimpute` ($D_{\text{cosine\_imp}} = D_{\text{euclid\_imp}}^2 / 58$ on 29-trait one-hot vectors), producing identical neighbour rankings and retrieval scores.
- **Tie Reporting:** To measure the role of deterministic tie-breaking as missingness degrades trait resolution, `mean_kth_distance_ties` reports the average number of candidate database records sharing the exact distance of the 5th-ranked neighbor ($d_{(5)}$).

## D10. UI Data Exports & Parity Fixtures (`export_ui_data.py`, `tests/fixtures/parity.json`)
- **Parity-Tested Workbench Logic (R10):** Top-10 nearest-neighbour retrieval in the frontend workbench must exactly match the Python reference implementation down to float precision and stable mergesort tie-breaking across complete, partial, and duplicate queries.
- **Non-Diagnostic Language (R10, R11):** Outputs derived from retrieved neighbours are named strictly "labels of nearest dataset records", never "diagnosis", "prediction", or "disease classification". All exports embed the mandatory research prototype disclaimer.
- **No Label-Based Metric Highlighting (R12):** Exports and dashboard views present all three metrics side-by-side without selecting or defaulting to a "winner" based on label metrics. Default configurations are specified neutrally by config.
- **Client-Side Isolation (R13):** All workbench distance computations execute locally in the client environment without transmitting user-entered trait queries across the network.

## D11. Workbench Trait Categorization (Form UI Convenience Grouping)
- **Grouping Logic:** The 29 categorical traits from the dataset are split into two sections in the Workbench case entry form:
  * **Physical Traits (columns 0 to 14):** Body Size, Body Weight, Height, Bone Structure, Complexion, General feel of skin, Texture of Skin, Hair Color, Appearance of Hair, Shape of face, Eyes, Eyelashes, Blinking of Eyes, Cheeks, Nose.
  * **Physiological & Lifestyle Traits (columns 15 to 28):** Teeth and gums, Lips, Nails, Appetite, Liking tastes, Metabolism Type, Climate Preference, Stress Levels, Sleep Patterns, Dietary Habits, Physical Activity Level, Water Intake, Digestion Quality, Skin Sensitivity.
- **Scope & Disclaimer:** This two-section split is strictly an ergonomic layout grouping to simplify user navigation across 29 dropdowns; it is not an external clinical classification or diagnostic taxonomy.
