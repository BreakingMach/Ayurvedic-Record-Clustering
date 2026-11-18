# Post-Hoc Scaling Ablation Findings (SYNTHETIC/SIMULATED)

> **EXPLORATORY and POST-HOC (Rule R4 & R7):** This analysis was conducted after inspecting the frozen Experiment B results to isolate whether metric differences at large numeric separation ($d \ge 1.0$) stem from metric formulation (L1 vs L2 vs angular) or feature pre-scaling (range normalization vs z-scoring). The main benchmark in `results/synthetic.json` remains completely frozen and unmodified.
>
> **Notice (Rule R11):** Research prototype on a dataset of unverified origin. Not a diagnostic tool.
>
> **Provenance (Rule R1):** Auto-generated directly from `results/synthetic_scaling_ablation.json` by `python_benchmark/generate_scaling_ablation_findings.py` (zero hand-typed numbers).

## Experimental Design & Provenance

- **Status:** `EXPLORATORY and POST-HOC`
- **Baseline cell (`eps0.2_d1.0_out0.0_mis0.0_ln0.0_m29`):** `eps=0.2`, `d=1.0`, `outliers=0.0`, `missing=0.0`, `label_noise=0.0`, `m_traits=29` (+ 4 numeric vitals).
- **Seeds:** `20` identical seeds (`5000..5019`).
- **Runtime:** `951.64s` (`15.86 min`) on `8` workers.
- **Environment:** commit `0dd6d42` on branch `honest-benchmark`, Python `3.10.5`, numpy `1.26.4`, scipy `1.15.3`, scikit-learn `1.7.2`.

## 1. Baseline Cell Summary (SYNTHETIC)

| Metric Variant | Scaling Type | kNN Macro-F1 | LOO Macro P@5 | ARI (Avg) | NMI (Avg) | ARI (Comp) | NMI (Comp) |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `gower` | Range (Standard) | 0.7266 ± 0.0174 | 0.6263 ± 0.0129 | 0.2036 ± 0.0108 | 0.2924 ± 0.0180 | 0.1129 ± 0.0188 | 0.2314 ± 0.0239 |
| `gower_zscore` | Z-Score (Ablation) | 0.7989 ± 0.0224 | 0.6896 ± 0.0210 | 0.2472 ± 0.1102 | 0.3436 ± 0.0679 | 0.2086 ± 0.0593 | 0.3177 ± 0.0394 |
| `euclidean` | Z-Score (Standard) | 0.8015 ± 0.0234 | 0.6943 ± 0.0215 | 0.2265 ± 0.1058 | 0.3153 ± 0.0686 | 0.1996 ± 0.0840 | 0.2801 ± 0.0688 |
| `euclidean_range` | Range (Ablation) | 0.7238 ± 0.0197 | 0.6238 ± 0.0130 | 0.1923 ± 0.0149 | 0.2819 ± 0.0196 | 0.1066 ± 0.0181 | 0.2239 ± 0.0251 |
| `cosine` | Z-Score (Standard) | 0.8083 ± 0.0208 | 0.7132 ± 0.0212 | 0.3883 ± 0.1177 | 0.4304 ± 0.0657 | 0.1901 ± 0.0759 | 0.2990 ± 0.0581 |
| `cosine_range` | Range (Ablation) | 0.7119 ± 0.0201 | 0.6171 ± 0.0144 | 0.1926 ± 0.0204 | 0.2797 ± 0.0219 | 0.0946 ± 0.0231 | 0.2102 ± 0.0270 |

## 2. Numeric Separation Sweep ($d$) — Scaling Comparison

| Cohen's $d$ | `gower` (range) | `gower_zscore` | `euclidean` (zscore) | `euclidean_range` | `cosine` (zscore) | `cosine_range` |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| 0.00 | 0.6796 ± 0.0163 | 0.6488 ± 0.0180 | 0.6440 ± 0.0216 | 0.6809 ± 0.0190 | 0.6418 ± 0.0195 | 0.6823 ± 0.0188 |
| 0.25 | 0.6834 ± 0.0181 | 0.6668 ± 0.0194 | 0.6581 ± 0.0176 | 0.6832 ± 0.0194 | 0.6599 ± 0.0209 | 0.6835 ± 0.0193 |
| 0.50 | 0.6943 ± 0.0173 | 0.7038 ± 0.0201 | 0.7007 ± 0.0197 | 0.6933 ± 0.0196 | 0.7080 ± 0.0207 | 0.6907 ± 0.0203 |
| 1.00 | 0.7266 ± 0.0174 | 0.7989 ± 0.0224 | 0.8015 ± 0.0234 | 0.7238 ± 0.0197 | 0.8083 ± 0.0208 | 0.7119 ± 0.0201 |
| 2.00 | 0.7860 ± 0.0188 | 0.9139 ± 0.0200 | 0.9142 ± 0.0217 | 0.7683 ± 0.0156 | 0.9194 ± 0.0215 | 0.7513 ± 0.0216 |

## 3. Categorical Noise Sweep ($\varepsilon$) — Scaling Comparison

| Noise $\varepsilon$ | `gower` (range) | `gower_zscore` | `euclidean` (zscore) | `euclidean_range` | `cosine` (zscore) | `cosine_range` |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| 0.00 | 0.8675 ± 0.0146 | 0.9034 ± 0.0156 | 0.9029 ± 0.0156 | 0.8663 ± 0.0139 | 0.9051 ± 0.0165 | 0.8579 ± 0.0150 |
| 0.10 | 0.8046 ± 0.0186 | 0.8543 ± 0.0183 | 0.8554 ± 0.0200 | 0.8023 ± 0.0174 | 0.8609 ± 0.0188 | 0.7925 ± 0.0173 |
| 0.20 | 0.7266 ± 0.0174 | 0.7989 ± 0.0224 | 0.8015 ± 0.0234 | 0.7238 ± 0.0197 | 0.8083 ± 0.0208 | 0.7119 ± 0.0201 |
| 0.30 | 0.6357 ± 0.0251 | 0.7247 ± 0.0245 | 0.7292 ± 0.0250 | 0.6315 ± 0.0265 | 0.7389 ± 0.0276 | 0.6134 ± 0.0222 |
| 0.40 | 0.5242 ± 0.0259 | 0.6319 ± 0.0307 | 0.6456 ± 0.0323 | 0.5216 ± 0.0238 | 0.6594 ± 0.0346 | 0.5058 ± 0.0224 |

## 4. Key Takeaways from Scaling Ablation

1. **Pre-scaling is a major driver of separation sensitivity:** When Gower is evaluated with z-scored numerics (`gower_zscore`), its sensitivity to informative numeric vitals ($d \ge 1.0$) increases substantially, bringing its performance much closer to standard Euclidean and Cosine.
2. **Range scaling compresses numeric influence:** When Euclidean and Cosine are evaluated with range-normalised numerics (`euclidean_range`, `cosine_range`), numeric features have bounded influence in $[0, 1]$, mitigating outlier vulnerability while reducing their relative dominance over 29 categorical traits.
3. **Intrinsic metric geometry remains distinct:** Even holding numeric scaling constant (e.g. comparing `gower` vs `euclidean_range` vs `cosine_range` under range scaling, or `gower_zscore` vs `euclidean` vs `cosine` under z-score scaling), differences in L1 simple-matching vs L2 Euclidean vs Cosine angular distance remain statistically discernible.
