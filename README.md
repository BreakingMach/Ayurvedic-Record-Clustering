# AyurFoundry — SIH26008: Benchmarking Gower, Euclidean, and Cosine Distances for Similarity-Based Grouping of Ayurvedic Patient Case Records

[![SIH26008](https://img.shields.io/badge/Smart%20India%20Hackathon-SIH26008-06B6D4?style=for-the-badge)](https://github.com/BreakingMach/Ayurvedic-Record-Clustering)
[![Ministry of AYUSH](https://img.shields.io/badge/AYUSH%20NAMASTE-6.19M%20Cases%20%7C%202,888%20Codes-10B981?style=for-the-badge)](https://namstp.ayush.gov.in/)
[![React + Vite](https://img.shields.io/badge/Workbench-React%20%2B%20Tailwind%20%2B%20Recharts-8B5CF6?style=for-the-badge)](#quick-start)
[![Python 3.10+](https://img.shields.io/badge/Benchmark-Python%20%7C%20Gower%20%7C%20Scikit--Learn-F59E0B?style=for-the-badge)](#python-benchmark-pipeline)

> **Author / Developer:** Sreevyas C S (Reg No: `12400848`, B.Tech CSE — AI & ML, Lovely Professional University)  
> **Supervisor:** Dr. Bhupinder Singh  
> **Repository:** [https://github.com/BreakingMach/Ayurvedic-Record-Clustering](https://github.com/BreakingMach/Ayurvedic-Record-Clustering)

---

## Executive Overview

**AyurFoundry** is a production-ready **3-Pillar Clinical Decision Support System (CDSS)**, **Case-Based Reasoning (CBR)** retrieval workbench, and reproducible **Python benchmarking repository** built for **Smart India Hackathon Problem Statement SIH26008**.

Aligned with the **Ministry of AYUSH NAMASTE Portal** (`6,192,458` standardized Ayurvedic outpatient cases across `2,888` diagnostic codes), this system systematically benchmarks mixed-modality patient dissimilarity kernels — **Vaidya-Weighted Gower**, **Normalized Euclidean (OHE + Z-Score)**, **Cosine (OHE Angular)**, and our **Proposed Modality-Decoupled Hybrid Distance ($D_{\text{AyurHybrid}}$)** — across $N = 1,200$ consolidated Ayurvedic patient case records spanning $p = 33$ attributes and 6 practitioner-assigned *Tridosha* diagnostic classes (`Vata`, `Pitta`, `Kapha`, `Vata+Pitta`, `Pitta+Kapha`, `Vata+Kapha`).

---

## The 3-Pillar Research Architecture

### Pillar 1 — Consolidated Mixed Clinical Schema & Vaidya-Aligned $MI^2$ Weighting
- **Cohort:** $N = 1,200$ patients across 6 imbalanced *Tridosha* classes (`Vata+Pitta`: 624, `Vata`: 264, `Pitta`: 144, `Kapha`: 72, `Pitta+Kapha`: 48, `Vata+Kapha`: 48).
- **4 Continuous Numerical Vitals ($\mathbf{X}_{\text{num}}$):** `Age_Vaya` (18–65 yrs), `BMI` (kg/m²), `Systolic_BP` (mmHg), `Pulse_Nadi_Rate` (bpm).
- **29 Categorical & Ordinal *Pariksha* Attributes ($\mathbf{X}_{\text{cat}}$):** *Dashavidha* and *Ashtavidha Pariksha* traits including `Nadi_Type`, `Agni_Grade`, `Koshtha`, `Bala_Strength`, `Skin_Texture`, `Body_Frame`, `Bone_Structure`, `Complexion`, `Hair_Type`, `Mala_Tendency`, `Sveda_Perspiration`, `Sleep_Quality`, and `Satva_Disposition`.
- **Vaidya-Aligned Squared Mutual Information Weighting ($w_k^*$):** Suppresses noisy demographic age spread (`w_Age = 0.01` floor) while amplifying primary clinical signals:

$$w_k^* = \frac{I(X_k; y_{\text{Vaidya}})^2}{\sum_{m=1}^{p} I(X_m; y_{\text{Vaidya}})^2}$$

### Pillar 2 — Distance Formulations & Spectral RBF Graph Partitioning
- **Proposed Modality-Decoupled Hybrid Distance ($D_{\text{AyurHybrid}}$):**

$$D_{\text{AyurHybrid}}(\mathbf{x}_i, \mathbf{x}_j) = \alpha \cdot D_{\text{Gower}}(\mathbf{x}_i, \mathbf{x}_j) + (1 - \alpha) \cdot D_{\text{Cos}}\!\left(\mathbf{x}_{i,\text{cat}}^{(\text{OHE})},\, \mathbf{x}_{j,\text{cat}}^{(\text{OHE})}\right), \quad \alpha = 0.75$$

- **Solving the Hierarchical Chaining Effect:** Standard `Average-Linkage` agglomerative clustering collapses the imbalanced 6-class *Tridosha* manifold into a single chained mega-cluster. Converting each pairwise dissimilarity matrix $\mathbf{D}$ into a Gaussian Radial Basis Function (RBF) affinity graph:

$$S_{ij} = \exp\!\left(-\gamma D_{ij}^2\right), \quad \gamma = \frac{1}{2 \cdot \operatorname{median}(D_{ij > 0})^2}$$

and applying **Spectral Graph Partitioning** dramatically recovers *Tridosha* structure across every distance kernel.

### Pillar 3 — Exact Validated Benchmark Results

| Distance Metric | Baseline ARI (Avg. Linkage) | Optimized ARI (Spectral RBF) | Optimized NMI (Info Match) | Silhouette Score (Cohesion) | Precision@5 (CBR Retrieval) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Euclidean Distance (OHE + Z-Score)** | 0.4762 | **0.8162** *(Best ARI)* | 0.8019 | 0.0753 *(Poor — OHE Sparsity)* | 99.95% |
| **Cosine Distance (OHE Angular)** | 0.3122 | 0.4721 | 0.6666 | 0.1027 | 99.98% |
| **Gower Distance (Vaidya-Weighted)** | 0.2731 | 0.7739 | **0.8037** *(Best NMI)* | **0.2274** *(Best — 3.0× Euclidean)* | 99.97% |
| **Proposed Hybrid (0.75 Gower + 0.25 Cos)** | 0.1620 | 0.6076 | 0.7947 | 0.1679 *(2.2× Euclidean)* | **100.00%** *(Best Retrieval)* |

---

## AyurFoundry Interactive Web Modules

1. **Top Telemetry Header & KPI Ribbon:** SIH26008 credentials, NAMASTE Portal context, and 4 glowing KPI cards highlighting Best ARI (`0.8162`), Best NMI (`0.8037`), Best Silhouette (`0.2274`), and Best Precision@5 (`100.00%`).
2. **Module 1 — Pillar 1 Schema & Vaidya MI Weight Explorer:** 6-class *Tridosha* distribution, interactive horizontal MI weight chart highlighting `Age_Vaya` suppression (`w = 0.01`), and searchable 33-attribute clinical schema registry.
3. **Module 2 — Pillar 2 2D Cluster Topology & $\alpha$-Sensitivity Sandbox:** High-DPI Canvas 2D topology scatter with patient hover inspector, 4-metric switcher, `Baseline Average-Linkage` vs `Optimized Spectral RBF` toggle, live $\alpha \in [0.00, 1.00]$ mixing slider, and $\alpha$-sensitivity curve.
4. **Module 3 — Pillar 3 Live CBR Patient Retrieval Simulator:** Select from 6 preset clinical cases or customize vitals (`Age_Vaya`, `BMI`, `Systolic_BP`, `Pulse_Nadi_Rate`) and *Pariksha* traits to compute real-time side-by-side **Top-5 Nearest Historical Patients** across Gower, Euclidean, Cosine, and Proposed Hybrid kernels with exact $D_{ij}$, trait matches, and `Precision@5` concordance.
5. **Module 4 — SOTA Architecture, $N \times N$ Distance Heatmap & Literature Tab:** Interactive $60 \times 60$ class-sorted pairwise distance & RBF affinity canvas heatmap, 4-Layer System Architecture explorer, and searchable 15-paper SOTA Literature Review table.

---

## Repository Structure

```text
Ayurvedic-Record-Clustering/
├── Dataset/
│   ├── README.md
│   └── tridosha.zip                  # Consolidated 1,200-patient Tridosha clinical dataset
├── Notebook/
│   └── Unsupervised.ipynb            # Original SIH26008 research & validation notebook
├── python_benchmark/
│   ├── benchmark_sih26008.py         # Standalone Python pipeline (Gower, Euclidean, Cosine, Hybrid)
│   └── requirements.txt              # gower, scikit-learn, pandas, numpy, matplotlib, seaborn
├── public/
│   └── favicon.svg
├── src/                              # React + Tailwind "AyurFoundry" Telemetry Web App
│   ├── components/
│   │   ├── TelemetryHeader.jsx
│   │   ├── Pillar1SchemaExplorer.jsx
│   │   ├── Pillar2ClusterSandbox.jsx
│   │   ├── Pillar3CbrSimulator.jsx
│   │   └── Module4ArchitectureLit.jsx
│   ├── data/
│   │   ├── benchmarkData.js
│   │   ├── clinicalCohort.js
│   │   └── literatureData.js
│   ├── utils/
│   │   └── distanceEngine.js
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
├── index.html
├── package.json
├── tailwind.config.js
├── postcss.config.js
├── vite.config.js
└── README.md
```

---

## Quick Start

### 1. Run the AyurFoundry Web Workbench (React + Vite)

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in your browser. To build for production:

```bash
npm run build
npm run preview
```

### 2. Run the Python Benchmark Pipeline

```bash
cd python_benchmark
pip install -r requirements.txt
python benchmark_sih26008.py --alpha 0.75 --out-dir outputs
```

This loads `Dataset/tridosha.zip`, computes all 4 pairwise distance matrices, runs both Baseline Average-Linkage and Optimized Spectral RBF Partitioning, executes the $\alpha$-sensitivity sweep, and exports CSV/JSON metrics plus dark-mode PNG figures to `python_benchmark/outputs/`.

---

## License & Citation

Developed for **Smart India Hackathon — SIH26008** at **Lovely Professional University** under the supervision of **Dr. Bhupinder Singh**. If you build upon this benchmark or hybrid similarity formulation, please cite the repository:

```bibtex
@misc{sreevyas2026sih26008,
  author       = {Sreevyas C S and Bhupinder Singh},
  title        = {SIH26008: Benchmarking Gower, Euclidean, and Cosine Distances for Similarity-Based Grouping of Ayurvedic Patient Case Records},
  year         = {2026},
  institution  = {Lovely Professional University},
  howpublished = {\url{https://github.com/BreakingMach/Ayurvedic-Record-Clustering}}
}
```
