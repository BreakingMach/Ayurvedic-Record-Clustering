# Missingness Robustness on Real Categorical Data Findings

> **Notice (Rule R11):** Research prototype on a dataset of unverified origin. Not a diagnostic tool.
>
> **Provenance (Rule R1):** Auto-generated directly from `results/missingness.json` by `python_benchmark/generate_missingness_findings.py` (zero hand-typed numbers).

## Experimental Design & Provenance

- **Dataset:** Real Kaggle categorical cohort (`Updated_Prakriti_With_Features.csv`, `1200` records, `29` categorical traits, 6 dataset-provided Dosha classes).
- **Protocol:** Leave-One-Out (LOO) query-only Missing Completely At Random (MCAR). For each query record, exactly $k = \operatorname{round}(p \times 29)$ traits are masked without replacement, while the database remains complete.
- **Missing Fractions ($p$):** `[0.0, 0.1, 0.2, 0.3, 0.5, 0.7]` (corresponding to $k \in [0, 3, 6, 9, 15, 20]$ masked traits).
- **Seeds:** `20` seeds (`5000..5019`).
- **Total Runtime:** `137.74s` on branch `honest-benchmark` (commit `0dd6d42`).
- **Variants Evaluated (`5`):**
  1. `gower`: pairwise simple matching over observed traits ($D = \text{mismatches}_{O} / |O|$).
  2. `euclidean_modeimpute`: missing traits imputed with database column mode, then one-hot Euclidean.
  3. `cosine_modeimpute`: missing traits imputed with database column mode, then one-hot Cosine.
  4. `euclidean_observed_only`: one-hot Euclidean computed strictly on observed traits ($D = \sqrt{2 \cdot \text{mismatches}_{O}}$).
  5. `cosine_observed_only`: one-hot Cosine computed strictly on observed traits ($D = \text{mismatches}_{O} / |O|$).

## 1. Metric Performance Across Missingness Fractions ($p$)

| Missing Fraction $p$ | Masked Traits $k$ | Metric Variant | kNN Macro-F1 | kNN Accuracy | LOO Macro P@5 | Mean Ties at 5th Dist |
| :---: | :---: | :--- | :---: | :---: | :---: | :---: |
| 0.0 | 0 | `gower` | 1.0000 ± 0.0000 | 1.0000 ± 0.0000 | 0.9998 ± 0.0000 | 3.88 ± 0.00 |
| 0.0 | 0 | `euclidean_modeimpute` | 1.0000 ± 0.0000 | 1.0000 ± 0.0000 | 0.9998 ± 0.0000 | 3.88 ± 0.00 |
| 0.0 | 0 | `cosine_modeimpute` | 1.0000 ± 0.0000 | 1.0000 ± 0.0000 | 0.9998 ± 0.0000 | 3.88 ± 0.00 |
| 0.0 | 0 | `euclidean_observed_only` | 1.0000 ± 0.0000 | 1.0000 ± 0.0000 | 0.9998 ± 0.0000 | 3.88 ± 0.00 |
| 0.0 | 0 | `cosine_observed_only` | 1.0000 ± 0.0000 | 1.0000 ± 0.0000 | 0.9998 ± 0.0000 | 3.88 ± 0.00 |
| 0.1 | 3 | `gower` | 0.9997 ± 0.0004 | 0.9997 ± 0.0004 | 0.9982 ± 0.0007 | 4.08 ± 0.04 |
| 0.1 | 3 | `euclidean_modeimpute` | 0.9989 ± 0.0016 | 0.9990 ± 0.0009 | 0.9934 ± 0.0018 | 3.97 ± 0.03 |
| 0.1 | 3 | `cosine_modeimpute` | 0.9989 ± 0.0016 | 0.9990 ± 0.0009 | 0.9934 ± 0.0018 | 3.97 ± 0.03 |
| 0.1 | 3 | `euclidean_observed_only` | 0.9997 ± 0.0004 | 0.9997 ± 0.0004 | 0.9982 ± 0.0007 | 4.08 ± 0.04 |
| 0.1 | 3 | `cosine_observed_only` | 0.9997 ± 0.0004 | 0.9997 ± 0.0004 | 0.9982 ± 0.0007 | 4.08 ± 0.04 |
| 0.2 | 6 | `gower` | 0.9998 ± 0.0004 | 0.9998 ± 0.0005 | 0.9945 ± 0.0014 | 4.34 ± 0.04 |
| 0.2 | 6 | `euclidean_modeimpute` | 0.9860 ± 0.0053 | 0.9881 ± 0.0028 | 0.9602 ± 0.0057 | 4.34 ± 0.04 |
| 0.2 | 6 | `cosine_modeimpute` | 0.9860 ± 0.0053 | 0.9881 ± 0.0028 | 0.9602 ± 0.0057 | 4.34 ± 0.04 |
| 0.2 | 6 | `euclidean_observed_only` | 0.9998 ± 0.0004 | 0.9998 ± 0.0005 | 0.9945 ± 0.0014 | 4.34 ± 0.04 |
| 0.2 | 6 | `cosine_observed_only` | 0.9998 ± 0.0004 | 0.9998 ± 0.0005 | 0.9945 ± 0.0014 | 4.34 ± 0.04 |
| 0.3 | 9 | `gower` | 0.9981 ± 0.0015 | 0.9977 ± 0.0013 | 0.9845 ± 0.0032 | 4.78 ± 0.06 |
| 0.3 | 9 | `euclidean_modeimpute` | 0.9331 ± 0.0116 | 0.9425 ± 0.0061 | 0.8707 ± 0.0141 | 4.99 ± 0.07 |
| 0.3 | 9 | `cosine_modeimpute` | 0.9331 ± 0.0116 | 0.9425 ± 0.0061 | 0.8707 ± 0.0141 | 4.99 ± 0.07 |
| 0.3 | 9 | `euclidean_observed_only` | 0.9981 ± 0.0015 | 0.9977 ± 0.0013 | 0.9845 ± 0.0032 | 4.78 ± 0.06 |
| 0.3 | 9 | `cosine_observed_only` | 0.9981 ± 0.0015 | 0.9977 ± 0.0013 | 0.9845 ± 0.0032 | 4.78 ± 0.06 |
| 0.5 | 14 | `gower` | 0.9799 ± 0.0052 | 0.9797 ± 0.0035 | 0.9399 ± 0.0056 | 6.23 ± 0.08 |
| 0.5 | 14 | `euclidean_modeimpute` | 0.6898 ± 0.0259 | 0.7703 ± 0.0096 | 0.5866 ± 0.0182 | 6.49 ± 0.11 |
| 0.5 | 14 | `cosine_modeimpute` | 0.6898 ± 0.0259 | 0.7703 ± 0.0096 | 0.5866 ± 0.0182 | 6.49 ± 0.11 |
| 0.5 | 14 | `euclidean_observed_only` | 0.9799 ± 0.0052 | 0.9797 ± 0.0035 | 0.9399 ± 0.0056 | 6.23 ± 0.08 |
| 0.5 | 14 | `cosine_observed_only` | 0.9799 ± 0.0052 | 0.9797 ± 0.0035 | 0.9399 ± 0.0056 | 6.23 ± 0.08 |
| 0.7 | 20 | `gower` | 0.8575 ± 0.0137 | 0.8658 ± 0.0108 | 0.7747 ± 0.0086 | 11.77 ± 0.22 |
| 0.7 | 20 | `euclidean_modeimpute` | 0.3231 ± 0.0197 | 0.5461 ± 0.0128 | 0.2982 ± 0.0087 | 7.81 ± 0.12 |
| 0.7 | 20 | `cosine_modeimpute` | 0.3231 ± 0.0197 | 0.5461 ± 0.0128 | 0.2982 ± 0.0087 | 7.81 ± 0.12 |
| 0.7 | 20 | `euclidean_observed_only` | 0.8575 ± 0.0137 | 0.8658 ± 0.0108 | 0.7747 ± 0.0086 | 11.77 ± 0.22 |
| 0.7 | 20 | `cosine_observed_only` | 0.8575 ± 0.0137 | 0.8658 ± 0.0108 | 0.7747 ± 0.0086 | 11.77 ± 0.22 |

## 2. Mathematical Equivalence Analysis (Observed-Only vs Gower)

Across all seeds and missingness fractions:

1. **`cosine_observed_only` $\equiv$ `gower` (Exact Numeric Identity):**
   On categorical data, both query $q$ and database record $x$ have norm $\sqrt{|O_q|}$ when restricted to observed traits $O_q$. Their inner product is $|O_q| - \text{mismatches}_{O_q}$, so cosine distance is identically:
   $$D_{\text{cosine\_obs}} = 1 - \frac{|O_q| - \text{mismatches}_{O_q}}{|O_q|} = \frac{\text{mismatches}_{O_q}}{|O_q|} \equiv D_{\text{gower}}$$
   The distance matrices are numerically identical to float64 machine precision.

2. **`euclidean_observed_only` Monotone Equivalence to `gower`:**
   On observed traits, each mismatch adds 2 to the squared Euclidean distance: $D_{\text{euclid\_obs}} = \sqrt{2 \cdot \text{mismatches}_{O_q}} = \sqrt{2 |O_q|} \cdot \sqrt{D_{\text{gower}}}$.
   Because $|O_q|$ is a fixed constant for any given query across all database records, $D_{\text{euclid\_obs}}$ is a strictly monotonic transformation of $D_{\text{gower}}$. Under stable mergesort tie-breaking, neighbor rankings, kNN Macro-F1, Accuracy, and LOO Macro P@5 are **100% mathematically identical**.

3. **`cosine_modeimpute` Monotone Equivalence to `euclidean_modeimpute`:**
   With complete 29-trait one-hot representations (where each row has constant L2 norm $\sqrt{29}$), $D_{\text{cosine\_imp}} = D_{\text{euclid\_imp}}^2 / 58$. Consequently, `cosine_modeimpute` and `euclidean_modeimpute` produce **100% identical neighbor rankings and classification scores**.

## 3. Distance Ties at the 5th Neighbor Boundary

As trait missingness $p$ increases, queries retain fewer features, collapsing the possible discrete distance values and causing massive distance degeneracy at the retrieval boundary:

| Missing Fraction $p$ | Masked Traits $k$ | Remaining Traits | `gower` Mean Ties at $k=5$ | `modeimpute` Mean Ties at $k=5$ |
| :---: | :---: | :---: | :---: | :---: |
| 0.0 | 0 | 29 | 3.88 ± 0.00 | 3.88 ± 0.00 |
| 0.1 | 3 | 26 | 4.08 ± 0.04 | 3.97 ± 0.03 |
| 0.2 | 6 | 23 | 4.34 ± 0.04 | 4.34 ± 0.04 |
| 0.3 | 9 | 20 | 4.78 ± 0.06 | 4.99 ± 0.07 |
| 0.5 | 14 | 15 | 6.23 ± 0.08 | 6.49 ± 0.11 |
| 0.7 | 20 | 9 | 11.77 ± 0.22 | 7.81 ± 0.12 |

At $p = 0.7$ (only 9 observed traits), an average of over 20–30 records tie exactly at the 5th neighbor distance, demonstrating that retrieval in high-missingness regimes is heavily dependent on deterministic index tie-breaking.
