# Benchmarking Gower, Euclidean, and Cosine Distances for Similarity-Based Grouping of Ayurvedic Patient Case Records

**Author:** Sreevyas C S (Reg No: `12400848`, B.Tech CSE — AI & ML, Lovely Professional University)  
**Supervisor:** Dr. Bhupinder Singh  
**Repository:** [https://github.com/BreakingMach/Ayurvedic-Record-Clustering](https://github.com/BreakingMach/Ayurvedic-Record-Clustering)

---

## 1. Overview & Key Findings

This repository provides a reproducible Python benchmark and an interactive web report evaluating mixed-type distance metrics — **Gower**, **Euclidean (OHE + Z-Score)**, **Cosine (OHE + Z-Score)**, **Hamming (categorical-only)**, and an untuned **Gower–Cosine Hybrid ($\alpha = 0.50$)** — across both **uniform (unsupervised)** and **train-only Mutual Information (MI)** weighting regimes.

**Key empirical finding:** Under leak-free $5 \times 4$ repeated stratified group cross-validation (20 folds, zero duplicate profile leakage), unweighted **Gower** significantly outperforms **Euclidean** and **Cosine** on held-out Macro mAP (`46.2%` vs. `43.6%`, $p = 0.0001$; and `44.9%`, $p = 0.0215$). Adding train-only MI weighting lifts every metric by `+2.7–4.9 pp` by down-weighting 9 randomized noise columns in the source dataset, while the Gower–Cosine hybrid shows **no statistically significant gain** over Weighted Gower ($p = 0.2544$, Spearman $\rho = 0.999$).

---

## 2. Data Provenance & Audit

- **Source dataset:** `Dataset/tridosha.zip` (`Updated_Prakriti_With_Features.csv`, $N = 1,200$ rows, 29 categorical features, 6 constitutional *Dosha* classes: `Vata+Pitta`, `Vata`, `Pitta`, `Kapha`, `Pitta+Kapha`, `Vata+Kapha`).
- **Replication audit:** Direct inspection shows that the 1,200 rows consist of **100 unique 20-trait base profiles replicated 12×** (`Vata+Pitta`: 52, `Vata`: 22, `Pitta`: 12, `Kapha`: 6, `Pitta+Kapha`: 4, `Vata+Kapha`: 4; 13:1 imbalance) with 9 independently randomized lifestyle columns (`MI < 0.007` nats). Evaluating without group deduplication leaks identical profile clones across train/test splits and artificially saturates retrieval at ~100%. All splits in this benchmark are strictly grouped by the 100 base profiles.
- **Simulated continuous covariates:** Because the public CSV contains questionnaire responses only, 4 continuous physiological covariates (`Age_Vaya`, `BMI`, `Systolic_BP`, `Pulse_Rate`) are simulated strictly from observable physical traits (*Body Size*, *Body Weight*, *Physical Activity Level*) — **never** conditioned on `Dosha` — to evaluate mixed-modality distance behavior without label leakage.
- **Clinical scope:** Target labels represent lifelong constitutional **Prakriti**, not acute **Vikriti** morbidity diagnosis. Standardized coding initiatives such as the Ministry of AYUSH NAMASTE portal motivate mixed-record clinical retrieval, but this dataset is an independent public corpus and is **not** sourced from NAMASTE.

---

## 3. Leak-Free Benchmark Results ($5 \times 4$ Repeated Stratified Group CV, mean ± std)

All scalers, one-hot encoders, and MI weights are fit strictly inside each training fold.

| Metric / Baseline | Weighting | ARI (PAM) | NMI (PAM) | Macro P@5 | Macro mAP | Micro P@5 | Silhouette* |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Gower (Mixed)** | Uniform | **0.128 ± 0.096** | 0.456 ± 0.080 | **43.9 ± 3.9%** | 46.2 ± 3.2% | **56.2 ± 3.8%** | 0.080 ± 0.027 |
| **Euclidean (OHE + Z)** | Uniform | 0.102 ± 0.097 | 0.431 ± 0.090 | 39.4 ± 3.1% | 43.6 ± 3.0% | 51.8 ± 3.9% | 0.044 ± 0.017 |
| **Cosine (OHE + Z)** | Uniform | 0.094 ± 0.089 | 0.425 ± 0.081 | 40.7 ± 4.9% | 44.9 ± 3.8% | 51.5 ± 4.4% | 0.080 ± 0.029 |
| **Hamming (Categorical)** | Uniform | 0.123 ± 0.085 | **0.457 ± 0.082** | 43.5 ± 3.2% | **46.8 ± 3.4%** | 55.9 ± 3.9% | 0.075 ± 0.038 |
| **Hybrid (0.50G + 0.50C)** | Uniform | 0.111 ± 0.088 | 0.449 ± 0.079 | 43.7 ± 3.8% | 46.2 ± 3.2% | 56.2 ± 3.8% | 0.077 ± 0.027 |
| **Gower (Mixed)** | Train-MI | 0.140 ± 0.080 | 0.467 ± 0.078 | 49.0 ± 4.8% | 48.9 ± 3.0% | 60.2 ± 4.7% | 0.129 ± 0.026 |
| **Euclidean (OHE + Z)** | Train-MI | 0.130 ± 0.087 | 0.463 ± 0.086 | 47.0 ± 4.5% | 48.5 ± 2.8% | 58.1 ± 4.6% | 0.079 ± 0.016 |
| **Cosine (OHE + Z)** | Train-MI | 0.120 ± 0.085 | 0.451 ± 0.075 | 48.5 ± 4.1% | **49.6 ± 3.3%** | 58.6 ± 4.5% | 0.140 ± 0.034 |
| **Hamming (Categorical)** | Train-MI | **0.149 ± 0.079** | **0.474 ± 0.071** | **49.5 ± 4.7%** | 49.1 ± 3.4% | **60.5 ± 4.7%** | 0.122 ± 0.027 |
| **Hybrid (0.50G + 0.50C)** | Train-MI | 0.147 ± 0.072 | 0.471 ± 0.073 | 49.2 ± 4.7% | 49.0 ± 3.1% | 60.3 ± 4.6% | 0.130 ± 0.029 |
| *Average-Linkage (Gower)* | Uniform | 0.151 ± 0.110 | 0.486 ± 0.101 | — | — | — | 0.101 ± 0.023 |
| *k-Prototypes (Huang 1998)* | γ = 0.5 | 0.060 ± 0.061 | 0.380 ± 0.058 | — | — | — | 0.019 ± 0.034 |
| *Supervised Posterior Proximity* | Upper Bound | — | — | 57.7 ± 9.0% | 69.8 ± 12.2% | 68.8 ± 6.9% | — |

*\*Silhouette is computed within each metric’s own geometry and is not comparable across different distance spaces; values < 0.25 indicate weak intrinsic structure (Kaufman & Rousseeuw, 1990).*

### Kernel Rank Redundancy (Spearman $\rho$, Uniform Weights)
- **Euclidean ↔ Cosine:** $\rho = 0.9545$ (near-monotone on constant-norm one-hot vectors)
- **Gower ↔ Hybrid:** $\rho = 0.9991$ and **Gower ↔ Hamming:** $\rho = 0.9912$ (categorical features dominate 29 of 33 dimensions)

---

## 4. Repository Structure

```text
Ayurvedic-Record-Clustering/
├── Dataset/
│   ├── README.md
│   └── tridosha.zip
├── Notebook/
│   └── Unsupervised.ipynb
├── python_benchmark/
│   ├── benchmark.py                    # Leak-free repeated stratified group CV pipeline
│   └── requirements.txt
├── src/                                # Light-mode interactive paper & benchmark report
│   ├── components/
│   │   ├── OverviewSection.jsx
│   │   ├── DataSection.jsx
│   │   ├── ResultsSection.jsx
│   │   ├── RetrievalDemoSection.jsx
│   │   └── LimitationsLiteratureSection.jsx
│   ├── data/
│   │   ├── realBenchmarkResults.json   # Real precomputed CV outputs from Dataset/tridosha.zip
│   │   └── literatureData.js
│   ├── utils/
│   │   └── distanceEngine.js
│   ├── App.jsx
│   └── index.css
├── index.html
├── package.json
└── vite.config.js
```

---

## 5. Quick Start

### Run the Interactive Benchmark Report (React + Vite)
```bash
npm install
npm run dev
```

### Run the Python Leak-Free Benchmark Pipeline
```bash
cd python_benchmark
pip install -r requirements.txt
python benchmark.py --alpha 0.50 --repeats 5 --folds 4 --out-dir outputs
```
