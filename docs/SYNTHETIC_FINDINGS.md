# Experiment B — SYNTHETIC/SIMULATED Mixed-Type Benchmark Findings

> **SYNTHETIC/SIMULATED DATA ONLY (Rule R4):** All cohorts and numbers below come from `ayur_bench.synth.generator`. `latent_class` is simulation ground truth by construction, not a practitioner label. Findings describe metric behaviour on the synthetic generator, not real Ayurvedic patients.
>
> Auto-generated directly from `results/synthetic.json` by `python_benchmark/generate_synthetic_findings.py` (Rule R1: zero hand-typed numbers).

## Provenance & Experimental Design

- **Baseline cell (`eps0.2_d1.0_out0.0_mis0.0_ln0.0_m29`):** `categorical_eps=0.2`, `numeric_cohens_d=1.0`, `outlier_fraction=0.0`, `missing_fraction=0.0`, `label_noise_rate=0.0`, `m_traits=29` (+ 4 numeric vitals: `age`, `bmi`, `systolic_bp`, `pulse`).
- **Seeds per cell:** `20` (seeds `5000..5019`; reduced for runtime: `False`).
- **Unique OFAT cells evaluated:** `17` across `6` one-factor-at-a-time sweeps.
- **Total runtime:** `983.32s` (`16.39 min`) on `6` parallel workers.
- **Run provenance:** branch `honest-benchmark`, commit `16644d6`, Python `3.10.5`, numpy `1.26.4`, pandas `2.1.4`, scipy `1.15.3`, scikit-learn `1.7.2`, joblib `1.5.3`.

## 1. Baseline Cell Summary (SYNTHETIC)

| Metric | kNN Macro-F1 | LOO Macro P@1 | LOO Macro P@5 | LOO Macro P@10 | ARI (Avg) | NMI (Avg) | ARI (Comp) | NMI (Comp) | Sil* (Avg) | Sil* (Comp) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| gower | 0.7266 ± 0.0174 | 0.6773 ± 0.0177 | 0.6263 ± 0.0129 | 0.5936 ± 0.0107 | 0.2036 ± 0.0108 | 0.2924 ± 0.0180 | 0.1129 ± 0.0188 | 0.2314 ± 0.0239 | 0.0025 ± 0.0073 | 0.0098 ± 0.0045 |
| euclidean | 0.8015 ± 0.0234 | 0.7460 ± 0.0205 | 0.6943 ± 0.0215 | 0.6597 ± 0.0217 | 0.2265 ± 0.1058 | 0.3153 ± 0.0686 | 0.1996 ± 0.0840 | 0.2801 ± 0.0688 | 0.0179 ± 0.0094 | 0.0099 ± 0.0055 |
| cosine | 0.8083 ± 0.0208 | 0.7587 ± 0.0193 | 0.7132 ± 0.0212 | 0.6815 ± 0.0215 | 0.3883 ± 0.1177 | 0.4304 ± 0.0657 | 0.1901 ± 0.0759 | 0.2990 ± 0.0581 | 0.0304 ± 0.0139 | 0.0222 ± 0.0121 |

*Silhouette note: `not comparable across metrics` (computed inside each metric's own distance space).

- **Baseline unique winner (Holm p < 0.05 against both other metrics):** kNN Macro-F1 = `cosine`, LOO Macro P@5 = `cosine`, ARI (Avg) = `cosine`, ARI (Comp) = `none (not significant / tie)`.

## 2. Winner Map Across All OFAT Sweeps (SYNTHETIC)

A metric is listed as the unique winner of a cell ONLY when it has the highest mean AND beats BOTH other metrics at Holm-adjusted paired Wilcoxon `p < 0.05`. Cells where differences are not significant are explicitly marked `none (not significant / tie)`.

| Sweep | Value | Winner (kNN Macro-F1) | Winner (LOO Macro P@5) | Winner (ARI Avg) | Winner (ARI Comp) |
| :--- | :---: | :--- | :--- | :--- | :--- |
| categorical_eps | 0.0 | none (not significant / tie) | cosine | cosine | none (not significant / tie) |
| categorical_eps | 0.1 | none (not significant / tie) | cosine | cosine | none (not significant / tie) |
| categorical_eps | 0.2 | cosine | cosine | cosine | none (not significant / tie) |
| categorical_eps | 0.3 | cosine | cosine | cosine | none (not significant / tie) |
| categorical_eps | 0.4 | cosine | cosine | cosine | none (not significant / tie) |
| numeric_cohens_d | 0.0 | gower | gower | gower | gower |
| numeric_cohens_d | 0.25 | gower | gower | gower | gower |
| numeric_cohens_d | 0.5 | cosine | none (not significant / tie) | none (not significant / tie) | none (not significant / tie) |
| numeric_cohens_d | 1.0 | cosine | cosine | cosine | none (not significant / tie) |
| numeric_cohens_d | 2.0 | cosine | cosine | none (not significant / tie) | none (not significant / tie) |
| outlier_fraction | 0.0 | cosine | cosine | cosine | none (not significant / tie) |
| outlier_fraction | 0.05 | none (not significant / tie) | none (not significant / tie) | gower | none (not significant / tie) |
| missing_fraction | 0.0 | cosine | cosine | cosine | none (not significant / tie) |
| missing_fraction | 0.05 | cosine | cosine | cosine | none (not significant / tie) |
| missing_fraction | 0.1 | cosine | cosine | cosine | none (not significant / tie) |
| label_noise_rate | 0.0 | cosine | cosine | cosine | none (not significant / tie) |
| label_noise_rate | 0.1 | cosine | cosine | cosine | none (not significant / tie) |
| label_noise_rate | 0.2 | cosine | cosine | cosine | none (not significant / tie) |
| m_traits | 5 | cosine | cosine | none (not significant / tie) | euclidean |
| m_traits | 10 | cosine | cosine | cosine | none (not significant / tie) |
| m_traits | 20 | cosine | cosine | cosine | none (not significant / tie) |
| m_traits | 29 | cosine | cosine | cosine | none (not significant / tie) |

## 3. Detailed Sweep Tables (Mean ± Std Across 20 Seeds, SYNTHETIC)

### Sweep: `categorical_eps`

| Value | Metric | kNN Macro-F1 | LOO Macro P@5 | ARI (Avg) | NMI (Avg) | ARI (Comp) | NMI (Comp) |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| 0.0 | gower | 0.8675 ± 0.0146 | 0.8065 ± 0.0119 | 0.2616 ± 0.0474 | 0.4094 ± 0.0439 | 0.1849 ± 0.0440 | 0.3672 ± 0.0397 |
| 0.0 | euclidean | 0.9029 ± 0.0156 | 0.8407 ± 0.0193 | 0.3065 ± 0.1458 | 0.4517 ± 0.0967 | 0.2837 ± 0.0905 | 0.4240 ± 0.0848 |
| 0.0 | cosine | 0.9051 ± 0.0165 | 0.8506 ± 0.0173 | 0.4562 ± 0.1430 | 0.5456 ± 0.0777 | 0.2900 ± 0.0765 | 0.4551 ± 0.0618 |
| 0.1 | gower | 0.8046 ± 0.0186 | 0.7181 ± 0.0103 | 0.2388 ± 0.0369 | 0.3634 ± 0.0396 | 0.1506 ± 0.0272 | 0.3062 ± 0.0291 |
| 0.1 | euclidean | 0.8554 ± 0.0200 | 0.7701 ± 0.0196 | 0.2683 ± 0.1488 | 0.3791 ± 0.1197 | 0.2432 ± 0.0785 | 0.3541 ± 0.0595 |
| 0.1 | cosine | 0.8609 ± 0.0188 | 0.7870 ± 0.0199 | 0.4464 ± 0.1470 | 0.5029 ± 0.0812 | 0.2343 ± 0.0504 | 0.3736 ± 0.0504 |
| 0.2 | gower | 0.7266 ± 0.0174 | 0.6263 ± 0.0129 | 0.2036 ± 0.0108 | 0.2924 ± 0.0180 | 0.1129 ± 0.0188 | 0.2314 ± 0.0239 |
| 0.2 | euclidean | 0.8015 ± 0.0234 | 0.6943 ± 0.0215 | 0.2265 ± 0.1058 | 0.3153 ± 0.0686 | 0.1996 ± 0.0840 | 0.2801 ± 0.0688 |
| 0.2 | cosine | 0.8083 ± 0.0208 | 0.7132 ± 0.0212 | 0.3883 ± 0.1177 | 0.4304 ± 0.0657 | 0.1901 ± 0.0759 | 0.2990 ± 0.0581 |
| 0.3 | gower | 0.6357 ± 0.0251 | 0.5269 ± 0.0147 | 0.1611 ± 0.0237 | 0.2176 ± 0.0262 | 0.0701 ± 0.0172 | 0.1507 ± 0.0265 |
| 0.3 | euclidean | 0.7292 ± 0.0250 | 0.6100 ± 0.0247 | 0.1799 ± 0.0934 | 0.2451 ± 0.0858 | 0.1589 ± 0.0843 | 0.2216 ± 0.0625 |
| 0.3 | cosine | 0.7389 ± 0.0276 | 0.6344 ± 0.0250 | 0.3453 ± 0.1112 | 0.3597 ± 0.0569 | 0.1488 ± 0.0458 | 0.2329 ± 0.0500 |
| 0.4 | gower | 0.5242 ± 0.0259 | 0.4284 ± 0.0137 | 0.1237 ± 0.0197 | 0.1531 ± 0.0164 | 0.0389 ± 0.0138 | 0.0879 ± 0.0223 |
| 0.4 | euclidean | 0.6456 ± 0.0323 | 0.5220 ± 0.0247 | 0.1621 ± 0.1495 | 0.1822 ± 0.1226 | 0.1359 ± 0.0612 | 0.1894 ± 0.0565 |
| 0.4 | cosine | 0.6594 ± 0.0346 | 0.5491 ± 0.0263 | 0.2598 ± 0.1072 | 0.2745 ± 0.0647 | 0.1115 ± 0.0658 | 0.1807 ± 0.0597 |

**Pooled Paired Wilcoxon + Holm (100 paired observations in `categorical_eps` sweep):**

| Endpoint | Metric A | Metric B | Mean Diff (A−B) | Cohen dz | Rank-Biserial r | p (raw) | p (Holm) | Sig |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| knn_macro_f1 | gower | euclidean | -0.0752 | -2.070 | -0.999 | 0.0000 | 0.0000 | YES |
| knn_macro_f1 | gower | cosine | -0.0828 | -1.989 | -1.000 | 0.0000 | 0.0000 | YES |
| knn_macro_f1 | euclidean | cosine | -0.0076 | -0.578 | -0.599 | 0.0000 | 0.0000 | YES |
| loo_macro_p_at_5 | gower | euclidean | -0.0662 | -2.448 | -1.000 | 0.0000 | 0.0000 | YES |
| loo_macro_p_at_5 | gower | cosine | -0.0856 | -2.653 | -1.000 | 0.0000 | 0.0000 | YES |
| loo_macro_p_at_5 | euclidean | cosine | -0.0195 | -1.634 | -0.980 | 0.0000 | 0.0000 | YES |
| ari_average | gower | euclidean | -0.0309 | -0.234 | -0.117 | 0.3104 | 0.3104 | no |
| ari_average | gower | cosine | -0.1814 | -1.434 | -0.975 | 0.0000 | 0.0000 | YES |
| ari_average | euclidean | cosine | -0.1505 | -1.153 | -0.907 | 0.0000 | 0.0000 | YES |
| ari_complete | gower | euclidean | -0.0928 | -1.115 | -0.924 | 0.0000 | 0.0000 | YES |
| ari_complete | gower | cosine | -0.0835 | -1.138 | -0.916 | 0.0000 | 0.0000 | YES |
| ari_complete | euclidean | cosine | 0.0094 | 0.126 | 0.162 | 0.1586 | 0.1586 | no |

### Sweep: `numeric_cohens_d`

| Value | Metric | kNN Macro-F1 | LOO Macro P@5 | ARI (Avg) | NMI (Avg) | ARI (Comp) | NMI (Comp) |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| 0.0 | gower | 0.6796 ± 0.0163 | 0.5908 ± 0.0132 | 0.1953 ± 0.0144 | 0.2812 ± 0.0194 | 0.0961 ± 0.0208 | 0.2038 ± 0.0236 |
| 0.0 | euclidean | 0.6440 ± 0.0216 | 0.5539 ± 0.0121 | -0.0003 ± 0.0076 | 0.0209 ± 0.0070 | 0.0197 ± 0.0172 | 0.0592 ± 0.0225 |
| 0.0 | cosine | 0.6418 ± 0.0195 | 0.5491 ± 0.0119 | 0.1290 ± 0.0178 | 0.2183 ± 0.0235 | 0.0405 ± 0.0194 | 0.1069 ± 0.0316 |
| 0.25 | gower | 0.6834 ± 0.0181 | 0.5946 ± 0.0135 | 0.1905 ± 0.0219 | 0.2765 ± 0.0223 | 0.0965 ± 0.0232 | 0.2074 ± 0.0293 |
| 0.25 | euclidean | 0.6581 ± 0.0176 | 0.5650 ± 0.0120 | 0.0086 ± 0.0432 | 0.0344 ± 0.0545 | 0.0469 ± 0.0302 | 0.0988 ± 0.0295 |
| 0.25 | cosine | 0.6599 ± 0.0209 | 0.5642 ± 0.0128 | 0.1417 ± 0.0278 | 0.2329 ± 0.0296 | 0.0575 ± 0.0234 | 0.1305 ± 0.0355 |
| 0.5 | gower | 0.6943 ± 0.0173 | 0.6013 ± 0.0131 | 0.1930 ± 0.0157 | 0.2794 ± 0.0223 | 0.1049 ± 0.0162 | 0.2223 ± 0.0199 |
| 0.5 | euclidean | 0.7007 ± 0.0197 | 0.6001 ± 0.0142 | 0.0585 ± 0.0858 | 0.1058 ± 0.1114 | 0.0689 ± 0.0306 | 0.1289 ± 0.0333 |
| 0.5 | cosine | 0.7080 ± 0.0207 | 0.6054 ± 0.0163 | 0.2002 ± 0.0554 | 0.2822 ± 0.0510 | 0.0824 ± 0.0354 | 0.1678 ± 0.0363 |
| 1.0 | gower | 0.7266 ± 0.0174 | 0.6263 ± 0.0129 | 0.2036 ± 0.0108 | 0.2924 ± 0.0180 | 0.1129 ± 0.0188 | 0.2314 ± 0.0239 |
| 1.0 | euclidean | 0.8015 ± 0.0234 | 0.6943 ± 0.0215 | 0.2265 ± 0.1058 | 0.3153 ± 0.0686 | 0.1996 ± 0.0840 | 0.2801 ± 0.0688 |
| 1.0 | cosine | 0.8083 ± 0.0208 | 0.7132 ± 0.0212 | 0.3883 ± 0.1177 | 0.4304 ± 0.0657 | 0.1901 ± 0.0759 | 0.2990 ± 0.0581 |
| 2.0 | gower | 0.7860 ± 0.0188 | 0.6742 ± 0.0140 | 0.2211 ± 0.0234 | 0.3299 ± 0.0288 | 0.1273 ± 0.0299 | 0.2553 ± 0.0285 |
| 2.0 | euclidean | 0.9142 ± 0.0217 | 0.8290 ± 0.0254 | 0.5481 ± 0.2133 | 0.6249 ± 0.1165 | 0.4335 ± 0.0960 | 0.5530 ± 0.0621 |
| 2.0 | cosine | 0.9194 ± 0.0215 | 0.8501 ± 0.0268 | 0.6647 ± 0.1564 | 0.6651 ± 0.0905 | 0.4061 ± 0.1065 | 0.5382 ± 0.0773 |

**Pooled Paired Wilcoxon + Holm (100 paired observations in `numeric_cohens_d` sweep):**

| Endpoint | Metric A | Metric B | Mean Diff (A−B) | Cohen dz | Rank-Biserial r | p (raw) | p (Holm) | Sig |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| knn_macro_f1 | gower | euclidean | -0.0297 | -0.452 | -0.358 | 0.0019 | 0.0037 | YES |
| knn_macro_f1 | gower | cosine | -0.0335 | -0.491 | -0.419 | 0.0003 | 0.0008 | YES |
| knn_macro_f1 | euclidean | cosine | -0.0038 | -0.315 | -0.350 | 0.0024 | 0.0037 | YES |
| loo_macro_p_at_5 | gower | euclidean | -0.0310 | -0.420 | -0.295 | 0.0105 | 0.0105 | YES |
| loo_macro_p_at_5 | gower | cosine | -0.0390 | -0.464 | -0.339 | 0.0033 | 0.0066 | YES |
| loo_macro_p_at_5 | euclidean | cosine | -0.0079 | -0.584 | -0.548 | 0.0000 | 0.0000 | YES |
| ari_average | gower | euclidean | 0.0324 | 0.142 | 0.276 | 0.0166 | 0.0166 | YES |
| ari_average | gower | cosine | -0.1041 | -0.486 | -0.319 | 0.0056 | 0.0113 | YES |
| ari_average | euclidean | cosine | -0.1365 | -1.212 | -0.912 | 0.0000 | 0.0000 | YES |
| ari_complete | gower | euclidean | -0.0462 | -0.296 | -0.111 | 0.3340 | 0.6679 | no |
| ari_complete | gower | cosine | -0.0478 | -0.339 | -0.148 | 0.1997 | 0.5990 | no |
| ari_complete | euclidean | cosine | -0.0016 | -0.025 | -0.105 | 0.3604 | 0.6679 | no |

### Sweep: `outlier_fraction`

| Value | Metric | kNN Macro-F1 | LOO Macro P@5 | ARI (Avg) | NMI (Avg) | ARI (Comp) | NMI (Comp) |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| 0.0 | gower | 0.7266 ± 0.0174 | 0.6263 ± 0.0129 | 0.2036 ± 0.0108 | 0.2924 ± 0.0180 | 0.1129 ± 0.0188 | 0.2314 ± 0.0239 |
| 0.0 | euclidean | 0.8015 ± 0.0234 | 0.6943 ± 0.0215 | 0.2265 ± 0.1058 | 0.3153 ± 0.0686 | 0.1996 ± 0.0840 | 0.2801 ± 0.0688 |
| 0.0 | cosine | 0.8083 ± 0.0208 | 0.7132 ± 0.0212 | 0.3883 ± 0.1177 | 0.4304 ± 0.0657 | 0.1901 ± 0.0759 | 0.2990 ± 0.0581 |
| 0.05 | gower | 0.7134 ± 0.0172 | 0.6146 ± 0.0137 | 0.1937 ± 0.0147 | 0.2764 ± 0.0164 | 0.1005 ± 0.0203 | 0.2184 ± 0.0215 |
| 0.05 | euclidean | 0.7292 ± 0.0189 | 0.6213 ± 0.0160 | 0.0002 ± 0.0074 | 0.0127 ± 0.0032 | 0.0311 ± 0.0515 | 0.0486 ± 0.0482 |
| 0.05 | cosine | 0.7282 ± 0.0181 | 0.6179 ± 0.0153 | 0.1432 ± 0.0581 | 0.1642 ± 0.0569 | 0.1046 ± 0.0466 | 0.1565 ± 0.0311 |

**Pooled Paired Wilcoxon + Holm (40 paired observations in `outlier_fraction` sweep):**

| Endpoint | Metric A | Metric B | Mean Diff (A−B) | Cohen dz | Rank-Biserial r | p (raw) | p (Holm) | Sig |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| knn_macro_f1 | gower | euclidean | -0.0453 | -1.273 | -0.941 | 0.0000 | 0.0000 | YES |
| knn_macro_f1 | gower | cosine | -0.0482 | -1.236 | -0.941 | 0.0000 | 0.0000 | YES |
| knn_macro_f1 | euclidean | cosine | -0.0029 | -0.247 | -0.295 | 0.1058 | 0.1058 | no |
| loo_macro_p_at_5 | gower | euclidean | -0.0373 | -1.066 | -0.841 | 0.0000 | 0.0000 | YES |
| loo_macro_p_at_5 | gower | cosine | -0.0451 | -1.004 | -0.805 | 0.0000 | 0.0000 | YES |
| loo_macro_p_at_5 | euclidean | cosine | -0.0077 | -0.551 | -0.493 | 0.0058 | 0.0058 | YES |
| ari_average | gower | euclidean | 0.0853 | 0.641 | 0.607 | 0.0005 | 0.0011 | YES |
| ari_average | gower | cosine | -0.0671 | -0.448 | -0.376 | 0.0381 | 0.0381 | YES |
| ari_average | euclidean | cosine | -0.1524 | -1.686 | -0.983 | 0.0000 | 0.0000 | YES |
| ari_complete | gower | euclidean | -0.0087 | -0.081 | -0.017 | 0.9312 | 0.9312 | no |
| ari_complete | gower | cosine | -0.0407 | -0.524 | -0.546 | 0.0021 | 0.0062 | YES |
| ari_complete | euclidean | cosine | -0.0320 | -0.385 | -0.412 | 0.0224 | 0.0447 | YES |

### Sweep: `missing_fraction`

| Value | Metric | kNN Macro-F1 | LOO Macro P@5 | ARI (Avg) | NMI (Avg) | ARI (Comp) | NMI (Comp) |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| 0.0 | gower | 0.7266 ± 0.0174 | 0.6263 ± 0.0129 | 0.2036 ± 0.0108 | 0.2924 ± 0.0180 | 0.1129 ± 0.0188 | 0.2314 ± 0.0239 |
| 0.0 | euclidean | 0.8015 ± 0.0234 | 0.6943 ± 0.0215 | 0.2265 ± 0.1058 | 0.3153 ± 0.0686 | 0.1996 ± 0.0840 | 0.2801 ± 0.0688 |
| 0.0 | cosine | 0.8083 ± 0.0208 | 0.7132 ± 0.0212 | 0.3883 ± 0.1177 | 0.4304 ± 0.0657 | 0.1901 ± 0.0759 | 0.2990 ± 0.0581 |
| 0.05 | gower | 0.6956 ± 0.0227 | 0.5970 ± 0.0114 | 0.1903 ± 0.0182 | 0.2740 ± 0.0196 | 0.0986 ± 0.0189 | 0.2099 ± 0.0301 |
| 0.05 | euclidean | 0.7609 ± 0.0240 | 0.6487 ± 0.0226 | 0.1894 ± 0.0679 | 0.2757 ± 0.0702 | 0.2194 ± 0.0968 | 0.2758 ± 0.0650 |
| 0.05 | cosine | 0.7757 ± 0.0204 | 0.6730 ± 0.0219 | 0.3326 ± 0.1148 | 0.3775 ± 0.0674 | 0.1935 ± 0.0836 | 0.2794 ± 0.0595 |
| 0.1 | gower | 0.6741 ± 0.0180 | 0.5704 ± 0.0124 | 0.1809 ± 0.0225 | 0.2582 ± 0.0234 | 0.0849 ± 0.0156 | 0.1889 ± 0.0259 |
| 0.1 | euclidean | 0.7226 ± 0.0222 | 0.6034 ± 0.0178 | 0.1342 ± 0.1112 | 0.1995 ± 0.1231 | 0.1690 ± 0.0577 | 0.2330 ± 0.0434 |
| 0.1 | cosine | 0.7379 ± 0.0230 | 0.6306 ± 0.0176 | 0.3049 ± 0.1142 | 0.3416 ± 0.0666 | 0.1404 ± 0.0676 | 0.2270 ± 0.0581 |

**Pooled Paired Wilcoxon + Holm (60 paired observations in `missing_fraction` sweep):**

| Endpoint | Metric A | Metric B | Mean Diff (A−B) | Cohen dz | Rank-Biserial r | p (raw) | p (Holm) | Sig |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| knn_macro_f1 | gower | euclidean | -0.0629 | -2.366 | -0.999 | 0.0000 | 0.0000 | YES |
| knn_macro_f1 | gower | cosine | -0.0752 | -2.594 | -1.000 | 0.0000 | 0.0000 | YES |
| knn_macro_f1 | euclidean | cosine | -0.0123 | -0.816 | -0.727 | 0.0000 | 0.0000 | YES |
| loo_macro_p_at_5 | gower | euclidean | -0.0509 | -2.197 | -0.997 | 0.0000 | 0.0000 | YES |
| loo_macro_p_at_5 | gower | cosine | -0.0744 | -3.478 | -1.000 | 0.0000 | 0.0000 | YES |
| loo_macro_p_at_5 | euclidean | cosine | -0.0235 | -2.369 | -1.000 | 0.0000 | 0.0000 | YES |
| ari_average | gower | euclidean | 0.0082 | 0.080 | 0.139 | 0.3498 | 0.3498 | no |
| ari_average | gower | cosine | -0.1503 | -1.264 | -0.986 | 0.0000 | 0.0000 | YES |
| ari_average | euclidean | cosine | -0.1586 | -1.272 | -0.957 | 0.0000 | 0.0000 | YES |
| ari_complete | gower | euclidean | -0.0972 | -1.202 | -0.951 | 0.0000 | 0.0000 | YES |
| ari_complete | gower | cosine | -0.0758 | -0.945 | -0.911 | 0.0000 | 0.0000 | YES |
| ari_complete | euclidean | cosine | 0.0213 | 0.281 | 0.330 | 0.0262 | 0.0262 | YES |

### Sweep: `label_noise_rate`

| Value | Metric | kNN Macro-F1 | LOO Macro P@5 | ARI (Avg) | NMI (Avg) | ARI (Comp) | NMI (Comp) |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| 0.0 | gower | 0.7266 ± 0.0174 | 0.6263 ± 0.0129 | 0.2036 ± 0.0108 | 0.2924 ± 0.0180 | 0.1129 ± 0.0188 | 0.2314 ± 0.0239 |
| 0.0 | euclidean | 0.8015 ± 0.0234 | 0.6943 ± 0.0215 | 0.2265 ± 0.1058 | 0.3153 ± 0.0686 | 0.1996 ± 0.0840 | 0.2801 ± 0.0688 |
| 0.0 | cosine | 0.8083 ± 0.0208 | 0.7132 ± 0.0212 | 0.3883 ± 0.1177 | 0.4304 ± 0.0657 | 0.1901 ± 0.0759 | 0.2990 ± 0.0581 |
| 0.1 | gower | 0.5811 ± 0.0198 | 0.4683 ± 0.0138 | 0.1501 ± 0.0119 | 0.1846 ± 0.0118 | 0.0920 ± 0.0173 | 0.1568 ± 0.0186 |
| 0.1 | euclidean | 0.6419 ± 0.0250 | 0.5167 ± 0.0216 | 0.1692 ± 0.0821 | 0.2063 ± 0.0532 | 0.1601 ± 0.0662 | 0.1941 ± 0.0531 |
| 0.1 | cosine | 0.6486 ± 0.0252 | 0.5291 ± 0.0220 | 0.2998 ± 0.0900 | 0.2937 ± 0.0501 | 0.1537 ± 0.0630 | 0.2064 ± 0.0440 |
| 0.2 | gower | 0.4722 ± 0.0168 | 0.3708 ± 0.0140 | 0.1093 ± 0.0106 | 0.1274 ± 0.0111 | 0.0733 ± 0.0134 | 0.1116 ± 0.0117 |
| 0.2 | euclidean | 0.5165 ± 0.0252 | 0.4041 ± 0.0195 | 0.1249 ± 0.0644 | 0.1444 ± 0.0415 | 0.1249 ± 0.0530 | 0.1386 ± 0.0423 |
| 0.2 | cosine | 0.5251 ± 0.0224 | 0.4123 ± 0.0207 | 0.2296 ± 0.0692 | 0.2114 ± 0.0407 | 0.1224 ± 0.0521 | 0.1490 ± 0.0371 |

**Pooled Paired Wilcoxon + Holm (60 paired observations in `label_noise_rate` sweep):**

| Endpoint | Metric A | Metric B | Mean Diff (A−B) | Cohen dz | Rank-Biserial r | p (raw) | p (Holm) | Sig |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| knn_macro_f1 | gower | euclidean | -0.0600 | -2.690 | -1.000 | 0.0000 | 0.0000 | YES |
| knn_macro_f1 | gower | cosine | -0.0674 | -3.011 | -1.000 | 0.0000 | 0.0000 | YES |
| knn_macro_f1 | euclidean | cosine | -0.0074 | -0.633 | -0.642 | 0.0000 | 0.0000 | YES |
| loo_macro_p_at_5 | gower | euclidean | -0.0499 | -2.462 | -1.000 | 0.0000 | 0.0000 | YES |
| loo_macro_p_at_5 | gower | cosine | -0.0630 | -2.679 | -1.000 | 0.0000 | 0.0000 | YES |
| loo_macro_p_at_5 | euclidean | cosine | -0.0131 | -1.449 | -0.992 | 0.0000 | 0.0000 | YES |
| ari_average | gower | euclidean | -0.0192 | -0.227 | -0.079 | 0.5961 | 0.5961 | no |
| ari_average | gower | cosine | -0.1516 | -1.596 | -0.993 | 0.0000 | 0.0000 | YES |
| ari_average | euclidean | cosine | -0.1324 | -1.418 | -0.965 | 0.0000 | 0.0000 | YES |
| ari_complete | gower | euclidean | -0.0688 | -0.936 | -0.845 | 0.0000 | 0.0000 | YES |
| ari_complete | gower | cosine | -0.0626 | -0.890 | -0.886 | 0.0000 | 0.0000 | YES |
| ari_complete | euclidean | cosine | 0.0062 | 0.109 | 0.160 | 0.2825 | 0.2825 | no |

### Sweep: `m_traits`

| Value | Metric | kNN Macro-F1 | LOO Macro P@5 | ARI (Avg) | NMI (Avg) | ARI (Comp) | NMI (Comp) |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| 5 | gower | 0.4455 ± 0.0709 | 0.3797 ± 0.0590 | 0.0470 ± 0.0361 | 0.0899 ± 0.0414 | 0.0288 ± 0.0178 | 0.0663 ± 0.0298 |
| 5 | euclidean | 0.5537 ± 0.0535 | 0.4668 ± 0.0507 | 0.1407 ± 0.1162 | 0.1460 ± 0.0804 | 0.1406 ± 0.0681 | 0.1791 ± 0.0518 |
| 5 | cosine | 0.5651 ± 0.0532 | 0.4864 ± 0.0483 | 0.1811 ± 0.0764 | 0.2094 ± 0.0606 | 0.1042 ± 0.0397 | 0.1654 ± 0.0461 |
| 10 | gower | 0.5454 ± 0.0617 | 0.4619 ± 0.0514 | 0.1199 ± 0.0374 | 0.1705 ± 0.0375 | 0.0478 ± 0.0232 | 0.1086 ± 0.0393 |
| 10 | euclidean | 0.6531 ± 0.0561 | 0.5494 ± 0.0532 | 0.1338 ± 0.0892 | 0.1612 ± 0.0914 | 0.1491 ± 0.0455 | 0.1980 ± 0.0458 |
| 10 | cosine | 0.6628 ± 0.0526 | 0.5716 ± 0.0499 | 0.2353 ± 0.1050 | 0.2708 ± 0.0684 | 0.1288 ± 0.0610 | 0.2024 ± 0.0536 |
| 20 | gower | 0.6721 ± 0.0424 | 0.5709 ± 0.0410 | 0.1776 ± 0.0241 | 0.2498 ± 0.0355 | 0.0884 ± 0.0184 | 0.1860 ± 0.0322 |
| 20 | euclidean | 0.7502 ± 0.0363 | 0.6445 ± 0.0402 | 0.2076 ± 0.1483 | 0.2588 ± 0.1318 | 0.1575 ± 0.0623 | 0.2404 ± 0.0536 |
| 20 | cosine | 0.7612 ± 0.0406 | 0.6671 ± 0.0393 | 0.3384 ± 0.1365 | 0.3766 ± 0.0787 | 0.1764 ± 0.0515 | 0.2692 ± 0.0468 |
| 29 | gower | 0.7266 ± 0.0174 | 0.6263 ± 0.0129 | 0.2036 ± 0.0108 | 0.2924 ± 0.0180 | 0.1129 ± 0.0188 | 0.2314 ± 0.0239 |
| 29 | euclidean | 0.8015 ± 0.0234 | 0.6943 ± 0.0215 | 0.2265 ± 0.1058 | 0.3153 ± 0.0686 | 0.1996 ± 0.0840 | 0.2801 ± 0.0688 |
| 29 | cosine | 0.8083 ± 0.0208 | 0.7132 ± 0.0212 | 0.3883 ± 0.1177 | 0.4304 ± 0.0657 | 0.1901 ± 0.0759 | 0.2990 ± 0.0581 |

**Pooled Paired Wilcoxon + Holm (80 paired observations in `m_traits` sweep):**

| Endpoint | Metric A | Metric B | Mean Diff (A−B) | Cohen dz | Rank-Biserial r | p (raw) | p (Holm) | Sig |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| knn_macro_f1 | gower | euclidean | -0.0922 | -3.011 | -1.000 | 0.0000 | 0.0000 | YES |
| knn_macro_f1 | gower | cosine | -0.1020 | -3.088 | -1.000 | 0.0000 | 0.0000 | YES |
| knn_macro_f1 | euclidean | cosine | -0.0097 | -0.661 | -0.644 | 0.0000 | 0.0000 | YES |
| loo_macro_p_at_5 | gower | euclidean | -0.0791 | -3.892 | -1.000 | 0.0000 | 0.0000 | YES |
| loo_macro_p_at_5 | gower | cosine | -0.0999 | -4.894 | -1.000 | 0.0000 | 0.0000 | YES |
| loo_macro_p_at_5 | euclidean | cosine | -0.0208 | -2.186 | -0.999 | 0.0000 | 0.0000 | YES |
| ari_average | gower | euclidean | -0.0401 | -0.330 | -0.315 | 0.0142 | 0.0142 | YES |
| ari_average | gower | cosine | -0.1487 | -1.295 | -0.970 | 0.0000 | 0.0000 | YES |
| ari_average | euclidean | cosine | -0.1086 | -0.881 | -0.777 | 0.0000 | 0.0000 | YES |
| ari_complete | gower | euclidean | -0.0922 | -1.345 | -0.958 | 0.0000 | 0.0000 | YES |
| ari_complete | gower | cosine | -0.0804 | -1.293 | -0.971 | 0.0000 | 0.0000 | YES |
| ari_complete | euclidean | cosine | 0.0118 | 0.201 | 0.233 | 0.0698 | 0.0698 | no |

## 4. Baseline Shuffled-Label Control (SYNTHETIC)

- **Cell:** `eps0.2_d1.0_out0.0_mis0.0_ln0.0_m29` | **Seed:** `6026` | **Chance Macro P@5 (1/6):** `0.1667` | **Status:** `PASSED`.

| Metric | kNN Macro-F1 | kNN Accuracy | LOO Macro P@1 | LOO Macro P@5 | LOO Macro P@10 | ARI (Avg) | NMI (Avg) | Passed |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| gower | 0.1712 | 0.4131 | 0.1604 | 0.1667 | 0.1716 | -0.0163 | 0.0074 | PASS |
| euclidean | 0.1651 | 0.4089 | 0.1472 | 0.1687 | 0.1641 | -0.0157 | 0.0081 | PASS |
| cosine | 0.1601 | 0.3922 | 0.1553 | 0.1674 | 0.1643 | -0.0057 | 0.0087 | PASS |
