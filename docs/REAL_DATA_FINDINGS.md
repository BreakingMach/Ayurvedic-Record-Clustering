# Experiment A — Real Categorical Data Findings

> Auto-generated directly from `results/real_data.json` by `python_benchmark/generate_real_findings.py` (Rule R1: zero hand-typed numbers).

## Provenance & Dataset Summary

- **Dataset:** `Updated_Prakriti_With_Features.csv` inside `Dataset/tridosha.zip` (Kaggle `adityaprashantshirke/prakriti-updated`).
- **Shape:** `1200` rows × `29` features (`0` numeric, `29` categorical).
- **Labels:** `dataset-provided Dosha labels (origin, license, and annotator unstated)`.
- **Exact duplicates:** `1` full-row duplicate (retained; row index `[1082]`).
- **Class counts:** Vata+Pitta: `624`, Vata: `264`, Pitta: `144`, Kapha: `72`, Pitta+Kapha: `48`, Vata+Kapha: `48`.
- **Run provenance:** branch `honest-benchmark`, commit `8d61f2c`, Python `3.10.5`, numpy `1.26.4`, pandas `2.1.4`, scipy `1.15.3`, scikit-learn `1.7.2`.

## 1. Pairwise Metric Equivalence (All 29 Real Categorical Traits)

| Metric A | Metric B | Spearman ρ | Max Abs Diff (Min-Max) | Mean Top-5 Overlap |
| :--- | :--- | :---: | :---: | :---: |
| gower | euclidean | 1.000000 | 0.249924 | 1.0000 |
| gower | cosine | 1.000000 | 0.000000 | 1.0000 |
| gower | hamming | 1.000000 | 0.000000 | 1.0000 |
| euclidean | cosine | 1.000000 | 0.249924 | 1.0000 |
| euclidean | hamming | 1.000000 | 0.249924 | 1.0000 |
| cosine | hamming | 1.000000 | 0.000000 | 1.0000 |

On this categorical-only dataset, Gower, Cosine, and Hamming are mathematically identical after scaling (`Spearman ρ = 1.000000`), and Euclidean is an exact monotone transform (`sqrt(2p * D)`), yielding `Spearman ρ = 1.000000` with all three.

## 2. Full 29-Trait Evaluation

| Metric | kNN Macro-F1 (3×5 CV) | kNN Accuracy (3×5 CV) | LOO Macro P@1 | LOO Macro P@5 | LOO Macro P@10 | ARI (Avg) | NMI (Avg) | ARI (Comp) | NMI (Comp) | Sil* (Avg) | Sil* (Comp) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| gower | 1.0000 ± 0.0000 | 1.0000 ± 0.0000 | 1.0000 | 0.9998 | 0.9962 | 0.1468 | 0.3116 | 0.1177 | 0.2870 | 0.0710 | 0.0748 |
| euclidean | 1.0000 ± 0.0000 | 1.0000 ± 0.0000 | 1.0000 | 0.9998 | 0.9962 | 0.2528 | 0.4040 | 0.1177 | 0.2870 | 0.0561 | 0.0451 |
| cosine | 1.0000 ± 0.0000 | 1.0000 ± 0.0000 | 1.0000 | 0.9998 | 0.9962 | 0.1468 | 0.3116 | 0.1177 | 0.2870 | 0.0710 | 0.0748 |

*Silhouette note: `not comparable across metrics` (computed inside each metric's own distance space).

### Three Smallest Classes (Full 29-Trait LOO Retrieval)

| Metric | Class | n | P@1 | P@5 | P@10 |
| :--- | :--- | :---: | :---: | :---: | :---: |
| gower | Pitta+Kapha | 48 | 1.0000 | 1.0000 | 1.0000 |
| gower | Vata+Kapha | 48 | 1.0000 | 1.0000 | 0.9979 |
| gower | Kapha | 72 | 1.0000 | 1.0000 | 0.9986 |
| euclidean | Pitta+Kapha | 48 | 1.0000 | 1.0000 | 1.0000 |
| euclidean | Vata+Kapha | 48 | 1.0000 | 1.0000 | 0.9979 |
| euclidean | Kapha | 72 | 1.0000 | 1.0000 | 0.9986 |
| cosine | Pitta+Kapha | 48 | 1.0000 | 1.0000 | 1.0000 |
| cosine | Vata+Kapha | 48 | 1.0000 | 1.0000 | 0.9979 |
| cosine | Kapha | 72 | 1.0000 | 1.0000 | 0.9986 |

### Paired Wilcoxon Tests (Full 29-Trait kNN Macro-F1 Across 15 CV Folds, Holm-Adjusted)

| Metric A | Metric B | Mean Diff | Cohen dz | Rank-Biserial r | p (raw) | p (Holm) |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| gower | euclidean | 0.000000 | 0.0000 | 0.0000 | 1.0000 | 1.0000 |
| gower | cosine | 0.000000 | 0.0000 | 0.0000 | 1.0000 | 1.0000 |
| euclidean | cosine | 0.000000 | 0.0000 | 0.0000 | 1.0000 | 1.0000 |

## 3. Trait-Subset Sweep (m ∈ {3, 5, 8, 12, 20, 29})

Because all 29 traits deterministically map to the dataset-provided labels, random trait subsets test metric behavior under partial information. The final two columns report the count of exact tied pairwise distances (out of 719,400 pairs) and the count of query rows with an exact distance tie at the rank-5/rank-6 boundary.

| m | Subsets | Metric | kNN Macro-F1 | LOO Macro P@5 | ARI (Avg) | NMI (Avg) | ARI (Comp) | NMI (Comp) | Tied Pairs (mean) | Top-5 Boundary Tie Rows |
| :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| 3 | 20 | gower | 0.3727 ± 0.1308 | 0.3704 ± 0.1276 | 0.0798 ± 0.0638 | 0.1414 ± 0.0938 | 0.0647 ± 0.0414 | 0.1519 ± 0.0697 | 719,396.0 | 1,197.0 |
| 3 | 20 | euclidean | 0.3727 ± 0.1308 | 0.3704 ± 0.1276 | 0.0681 ± 0.0432 | 0.1408 ± 0.0680 | 0.0647 ± 0.0414 | 0.1519 ± 0.0697 | 719,396.0 | 1,197.0 |
| 3 | 20 | cosine | 0.3727 ± 0.1308 | 0.3704 ± 0.1276 | 0.0753 ± 0.0516 | 0.1550 ± 0.0936 | 0.0647 ± 0.0414 | 0.1519 ± 0.0697 | 719,396.0 | 1,197.0 |
| 5 | 20 | gower | 0.5943 ± 0.1564 | 0.5659 ± 0.1593 | 0.0871 ± 0.0355 | 0.1825 ± 0.0691 | 0.0527 ± 0.0381 | 0.1415 ± 0.0560 | 719,394.0 | 1,142.0 |
| 5 | 20 | euclidean | 0.5943 ± 0.1564 | 0.5659 ± 0.1593 | 0.0921 ± 0.0475 | 0.1866 ± 0.0694 | 0.0527 ± 0.0381 | 0.1415 ± 0.0560 | 719,394.0 | 1,142.0 |
| 5 | 20 | cosine | 0.5943 ± 0.1564 | 0.5659 ± 0.1593 | 0.0925 ± 0.0508 | 0.1880 ± 0.0677 | 0.0527 ± 0.0381 | 0.1415 ± 0.0560 | 719,394.0 | 1,142.0 |
| 8 | 20 | gower | 0.7525 ± 0.1825 | 0.6834 ± 0.1874 | 0.1039 ± 0.0617 | 0.2195 ± 0.0816 | 0.0578 ± 0.0596 | 0.1616 ± 0.0932 | 719,391.0 | 1,086.0 |
| 8 | 20 | euclidean | 0.7525 ± 0.1825 | 0.6834 ± 0.1874 | 0.1078 ± 0.0556 | 0.2156 ± 0.0724 | 0.0578 ± 0.0596 | 0.1616 ± 0.0932 | 719,391.0 | 1,086.0 |
| 8 | 20 | cosine | 0.7525 ± 0.1825 | 0.6834 ± 0.1874 | 0.0994 ± 0.0474 | 0.2131 ± 0.0687 | 0.0578 ± 0.0596 | 0.1616 ± 0.0932 | 719,391.0 | 1,086.0 |
| 12 | 20 | gower | 0.9622 ± 0.0390 | 0.9165 ± 0.0663 | 0.1555 ± 0.0458 | 0.2931 ± 0.0511 | 0.0935 ± 0.0341 | 0.2362 ± 0.0508 | 719,387.0 | 1,026.4 |
| 12 | 20 | euclidean | 0.9622 ± 0.0390 | 0.9165 ± 0.0663 | 0.1592 ± 0.0529 | 0.2940 ± 0.0495 | 0.0935 ± 0.0341 | 0.2362 ± 0.0508 | 719,387.0 | 1,026.4 |
| 12 | 20 | cosine | 0.9622 ± 0.0390 | 0.9165 ± 0.0663 | 0.1558 ± 0.0473 | 0.2912 ± 0.0527 | 0.0935 ± 0.0341 | 0.2362 ± 0.0508 | 719,387.0 | 1,026.4 |
| 20 | 20 | gower | 0.9955 ± 0.0127 | 0.9851 ± 0.0291 | 0.2000 ± 0.0432 | 0.3422 ± 0.0526 | 0.1328 ± 0.0241 | 0.2837 ± 0.0257 | 719,379.0 | 925.6 |
| 20 | 20 | euclidean | 0.9955 ± 0.0127 | 0.9851 ± 0.0291 | 0.2032 ± 0.0461 | 0.3414 ± 0.0534 | 0.1328 ± 0.0241 | 0.2837 ± 0.0257 | 719,379.0 | 925.6 |
| 20 | 20 | cosine | 0.9955 ± 0.0127 | 0.9851 ± 0.0291 | 0.2000 ± 0.0432 | 0.3422 ± 0.0526 | 0.1328 ± 0.0241 | 0.2837 ± 0.0257 | 719,379.0 | 925.6 |
| 29 | 1 | gower | 1.0000 ± 0.0000 | 0.9998 ± 0.0000 | 0.1468 ± 0.0000 | 0.3116 ± 0.0000 | 0.1177 ± 0.0000 | 0.2870 ± 0.0000 | 719,370.0 | 859.0 |
| 29 | 1 | euclidean | 1.0000 ± 0.0000 | 0.9998 ± 0.0000 | 0.2528 ± 0.0000 | 0.4040 ± 0.0000 | 0.1177 ± 0.0000 | 0.2870 ± 0.0000 | 719,370.0 | 859.0 |
| 29 | 1 | cosine | 1.0000 ± 0.0000 | 0.9998 ± 0.0000 | 0.1468 ± 0.0000 | 0.3116 ± 0.0000 | 0.1177 ± 0.0000 | 0.2870 ± 0.0000 | 719,370.0 | 859.0 |

## 4. Shuffled-Label Control

- **Control seed:** `2026` | **Theoretical Macro P@5 chance (1/6):** `0.1667` | **Control status:** `PASSED`.

| Metric | kNN Macro-F1 (3×5 CV) | kNN Accuracy | LOO Macro P@1 | LOO Macro P@5 | LOO Macro P@10 | ARI (Avg) | NMI (Avg) | Passed |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| gower | 0.1464 ± 0.0139 | 0.3847 | 0.1542 | 0.1554 | 0.1596 | -0.0172 | 0.0099 | PASS |
| euclidean | 0.1464 ± 0.0139 | 0.3847 | 0.1542 | 0.1554 | 0.1596 | -0.0044 | 0.0077 | PASS |
| cosine | 0.1464 ± 0.0139 | 0.3847 | 0.1542 | 0.1554 | 0.1596 | -0.0172 | 0.0099 | PASS |
