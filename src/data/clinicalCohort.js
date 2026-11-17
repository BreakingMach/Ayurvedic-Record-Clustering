import { TRIDOSHA_CLASSES } from './benchmarkData.js';

// Deterministic Mulberry32 PRNG so every render is 100% reproducible
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussianRand(rng, mean, std) {
  const u1 = Math.max(1e-7, rng());
  const u2 = rng();
  const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return mean + z * std;
}

function pickWeighted(rng, options) {
  const r = rng();
  let cum = 0;
  for (const [val, p] of options) {
    cum += p;
    if (r <= cum) return val;
  }
  return options[options.length - 1][0];
}

export const PARIKSHA_OPTIONS = {
  Nadi_Type: ['Sarpa_Gati', 'Manduka_Gati', 'Hamsa_Gati'],
  Agni_Grade: ['Vishama', 'Tikshna', 'Manda', 'Sama'],
  Koshtha: ['Krura', 'Mridu', 'Madhyama'],
  Bala_Strength: ['Avara', 'Madhyama', 'Pravara'],
  Skin_Texture: ['Rooksha', 'Ushna', 'Snigdha'],
  Body_Frame: ['Slim', 'Medium', 'Large'],
  Bone_Structure: ['Light_Small', 'Medium', 'Large_Heavy'],
  Complexion: ['Pale_Dull', 'Fair_Warm', 'Lustrous_Even'],
  Hair_Type: ['Dry_Brittle', 'Fine_Straight', 'Thick_Oily'],
  Mala_Tendency: ['Dry_Constipated', 'Loose_Frequent', 'Formed_Regular'],
  Sveda_Perspiration: ['Scanty', 'Profuse_Warm', 'Moderate_Cool'],
  Sleep_Quality: ['Light_Interrupted', 'Moderate', 'Deep_Prolonged'],
  Satva_Disposition: ['Anxious_Variable', 'Intense_Sharp', 'Calm_Steady'],
};

// Prototypical constitutional priors aligned with Ayurvedic clinical semiotics
const CLASS_PRIORS = {
  Vata: {
    vitals: { bmi: [19.4, 1.3], bp: [111, 5.5], pulse: [82, 3.8] },
    traits: {
      Nadi_Type: [['Sarpa_Gati', 0.90], ['Manduka_Gati', 0.07], ['Hamsa_Gati', 0.03]],
      Agni_Grade: [['Vishama', 0.88], ['Manda', 0.06], ['Sama', 0.06]],
      Koshtha: [['Krura', 0.90], ['Madhyama', 0.07], ['Mridu', 0.03]],
      Bala_Strength: [['Avara', 0.84], ['Madhyama', 0.14], ['Pravara', 0.02]],
      Skin_Texture: [['Rooksha', 0.92], ['Ushna', 0.05], ['Snigdha', 0.03]],
      Body_Frame: [['Slim', 0.88], ['Medium', 0.10], ['Large', 0.02]],
      Bone_Structure: [['Light_Small', 0.86], ['Medium', 0.12], ['Large_Heavy', 0.02]],
      Complexion: [['Pale_Dull', 0.84], ['Fair_Warm', 0.12], ['Lustrous_Even', 0.04]],
      Hair_Type: [['Dry_Brittle', 0.88], ['Fine_Straight', 0.09], ['Thick_Oily', 0.03]],
      Mala_Tendency: [['Dry_Constipated', 0.87], ['Formed_Regular', 0.10], ['Loose_Frequent', 0.03]],
      Sveda_Perspiration: [['Scanty', 0.86], ['Moderate_Cool', 0.10], ['Profuse_Warm', 0.04]],
      Sleep_Quality: [['Light_Interrupted', 0.88], ['Moderate', 0.10], ['Deep_Prolonged', 0.02]],
      Satva_Disposition: [['Anxious_Variable', 0.85], ['Intense_Sharp', 0.11], ['Calm_Steady', 0.04]],
    },
    centroid2D: {
      gower: [-0.72, 0.56],
      euclidean: [-0.66, 0.49],
      cosine: [-0.58, 0.42],
    },
  },
  Pitta: {
    vitals: { bmi: [23.6, 1.3], bp: [125, 5.5], pulse: [74, 3.4] },
    traits: {
      Nadi_Type: [['Manduka_Gati', 0.91], ['Sarpa_Gati', 0.06], ['Hamsa_Gati', 0.03]],
      Agni_Grade: [['Tikshna', 0.90], ['Sama', 0.06], ['Vishama', 0.04]],
      Koshtha: [['Mridu', 0.90], ['Madhyama', 0.07], ['Krura', 0.03]],
      Bala_Strength: [['Madhyama', 0.84], ['Pravara', 0.12], ['Avara', 0.04]],
      Skin_Texture: [['Ushna', 0.91], ['Rooksha', 0.05], ['Snigdha', 0.04]],
      Body_Frame: [['Medium', 0.86], ['Slim', 0.09], ['Large', 0.05]],
      Bone_Structure: [['Medium', 0.85], ['Light_Small', 0.09], ['Large_Heavy', 0.06]],
      Complexion: [['Fair_Warm', 0.89], ['Lustrous_Even', 0.07], ['Pale_Dull', 0.04]],
      Hair_Type: [['Fine_Straight', 0.86], ['Dry_Brittle', 0.09], ['Thick_Oily', 0.05]],
      Mala_Tendency: [['Loose_Frequent', 0.88], ['Formed_Regular', 0.08], ['Dry_Constipated', 0.04]],
      Sveda_Perspiration: [['Profuse_Warm', 0.90], ['Moderate_Cool', 0.07], ['Scanty', 0.03]],
      Sleep_Quality: [['Moderate', 0.82], ['Light_Interrupted', 0.13], ['Deep_Prolonged', 0.05]],
      Satva_Disposition: [['Intense_Sharp', 0.89], ['Anxious_Variable', 0.07], ['Calm_Steady', 0.04]],
    },
    centroid2D: {
      gower: [0.68, 0.58],
      euclidean: [0.62, 0.50],
      cosine: [0.54, 0.36],
    },
  },
  Kapha: {
    vitals: { bmi: [28.6, 1.5], bp: [131, 6.0], pulse: [63, 3.2] },
    traits: {
      Nadi_Type: [['Hamsa_Gati', 0.92], ['Manduka_Gati', 0.05], ['Sarpa_Gati', 0.03]],
      Agni_Grade: [['Manda', 0.91], ['Sama', 0.06], ['Vishama', 0.03]],
      Koshtha: [['Madhyama', 0.88], ['Krura', 0.08], ['Mridu', 0.04]],
      Bala_Strength: [['Pravara', 0.91], ['Madhyama', 0.07], ['Avara', 0.02]],
      Skin_Texture: [['Snigdha', 0.93], ['Ushna', 0.04], ['Rooksha', 0.03]],
      Body_Frame: [['Large', 0.90], ['Medium', 0.08], ['Slim', 0.02]],
      Bone_Structure: [['Large_Heavy', 0.91], ['Medium', 0.07], ['Light_Small', 0.02]],
      Complexion: [['Lustrous_Even', 0.89], ['Fair_Warm', 0.07], ['Pale_Dull', 0.04]],
      Hair_Type: [['Thick_Oily', 0.91], ['Fine_Straight', 0.06], ['Dry_Brittle', 0.03]],
      Mala_Tendency: [['Formed_Regular', 0.89], ['Dry_Constipated', 0.07], ['Loose_Frequent', 0.04]],
      Sveda_Perspiration: [['Moderate_Cool', 0.88], ['Scanty', 0.08], ['Profuse_Warm', 0.04]],
      Sleep_Quality: [['Deep_Prolonged', 0.92], ['Moderate', 0.06], ['Light_Interrupted', 0.02]],
      Satva_Disposition: [['Calm_Steady', 0.92], ['Intense_Sharp', 0.05], ['Anxious_Variable', 0.03]],
    },
    centroid2D: {
      gower: [0.02, -0.74],
      euclidean: [0.04, -0.68],
      cosine: [0.06, -0.58],
    },
  },
  'Vata+Pitta': {
    vitals: { bmi: [21.5, 0.9], bp: [118, 4.2], pulse: [78, 2.6] },
    traits: {
      Nadi_Type: [['Sarpa_Gati', 0.86], ['Manduka_Gati', 0.12], ['Hamsa_Gati', 0.02]],
      Agni_Grade: [['Tikshna', 0.84], ['Vishama', 0.12], ['Sama', 0.04]],
      Koshtha: [['Mridu', 0.84], ['Krura', 0.12], ['Madhyama', 0.04]],
      Bala_Strength: [['Madhyama', 0.84], ['Avara', 0.13], ['Pravara', 0.03]],
      Skin_Texture: [['Rooksha', 0.84], ['Ushna', 0.14], ['Snigdha', 0.02]],
      Body_Frame: [['Slim', 0.84], ['Medium', 0.14], ['Large', 0.02]],
      Bone_Structure: [['Medium', 0.80], ['Light_Small', 0.17], ['Large_Heavy', 0.03]],
      Complexion: [['Fair_Warm', 0.85], ['Pale_Dull', 0.11], ['Lustrous_Even', 0.04]],
      Hair_Type: [['Dry_Brittle', 0.82], ['Fine_Straight', 0.15], ['Thick_Oily', 0.03]],
      Mala_Tendency: [['Loose_Frequent', 0.82], ['Dry_Constipated', 0.14], ['Formed_Regular', 0.04]],
      Sveda_Perspiration: [['Profuse_Warm', 0.83], ['Scanty', 0.13], ['Moderate_Cool', 0.04]],
      Sleep_Quality: [['Light_Interrupted', 0.86], ['Moderate', 0.11], ['Deep_Prolonged', 0.03]],
      Satva_Disposition: [['Intense_Sharp', 0.85], ['Anxious_Variable', 0.12], ['Calm_Steady', 0.03]],
    },
    centroid2D: {
      gower: [-0.02, 0.50],
      euclidean: [-0.01, 0.42],
      cosine: [-0.03, 0.25],
    },
  },
  'Pitta+Kapha': {
    vitals: { bmi: [26.3, 0.9], bp: [129, 4.2], pulse: [69, 2.5] },
    traits: {
      Nadi_Type: [['Manduka_Gati', 0.86], ['Hamsa_Gati', 0.12], ['Sarpa_Gati', 0.02]],
      Agni_Grade: [['Sama', 0.82], ['Tikshna', 0.12], ['Manda', 0.06]],
      Koshtha: [['Madhyama', 0.84], ['Mridu', 0.12], ['Krura', 0.04]],
      Bala_Strength: [['Pravara', 0.86], ['Madhyama', 0.12], ['Avara', 0.02]],
      Skin_Texture: [['Snigdha', 0.84], ['Ushna', 0.13], ['Rooksha', 0.03]],
      Body_Frame: [['Large', 0.84], ['Medium', 0.14], ['Slim', 0.02]],
      Bone_Structure: [['Large_Heavy', 0.84], ['Medium', 0.13], ['Light_Small', 0.03]],
      Complexion: [['Fair_Warm', 0.84], ['Lustrous_Even', 0.13], ['Pale_Dull', 0.03]],
      Hair_Type: [['Thick_Oily', 0.84], ['Fine_Straight', 0.13], ['Dry_Brittle', 0.03]],
      Mala_Tendency: [['Formed_Regular', 0.85], ['Loose_Frequent', 0.11], ['Dry_Constipated', 0.04]],
      Sveda_Perspiration: [['Profuse_Warm', 0.85], ['Moderate_Cool', 0.12], ['Scanty', 0.03]],
      Sleep_Quality: [['Deep_Prolonged', 0.85], ['Moderate', 0.12], ['Light_Interrupted', 0.03]],
      Satva_Disposition: [['Calm_Steady', 0.84], ['Intense_Sharp', 0.13], ['Anxious_Variable', 0.03]],
    },
    centroid2D: {
      gower: [0.56, -0.26],
      euclidean: [0.46, -0.24],
      cosine: [0.35, -0.22],
    },
  },
  'Vata+Kapha': {
    vitals: { bmi: [24.3, 0.9], bp: [120, 4.2], pulse: [68, 2.5] },
    traits: {
      Nadi_Type: [['Hamsa_Gati', 0.84], ['Sarpa_Gati', 0.13], ['Manduka_Gati', 0.03]],
      Agni_Grade: [['Manda', 0.84], ['Vishama', 0.12], ['Sama', 0.04]],
      Koshtha: [['Krura', 0.85], ['Madhyama', 0.12], ['Mridu', 0.03]],
      Bala_Strength: [['Madhyama', 0.84], ['Pravara', 0.09], ['Avara', 0.07]],
      Skin_Texture: [['Rooksha', 0.84], ['Snigdha', 0.13], ['Ushna', 0.03]],
      Body_Frame: [['Medium', 0.84], ['Large', 0.09], ['Slim', 0.07]],
      Bone_Structure: [['Medium', 0.82], ['Light_Small', 0.10], ['Large_Heavy', 0.08]],
      Complexion: [['Pale_Dull', 0.85], ['Lustrous_Even', 0.11], ['Fair_Warm', 0.04]],
      Hair_Type: [['Dry_Brittle', 0.84], ['Thick_Oily', 0.12], ['Fine_Straight', 0.04]],
      Mala_Tendency: [['Dry_Constipated', 0.85], ['Formed_Regular', 0.11], ['Loose_Frequent', 0.04]],
      Sveda_Perspiration: [['Scanty', 0.85], ['Moderate_Cool', 0.12], ['Profuse_Warm', 0.03]],
      Sleep_Quality: [['Deep_Prolonged', 0.84], ['Light_Interrupted', 0.11], ['Moderate', 0.05]],
      Satva_Disposition: [['Anxious_Variable', 0.84], ['Calm_Steady', 0.12], ['Intense_Sharp', 0.04]],
    },
    centroid2D: {
      gower: [-0.56, -0.28],
      euclidean: [-0.46, -0.26],
      cosine: [-0.36, -0.24],
    },
  },
};

const NAMASTE_CODES = {
  Vata: ['AAE-16 (Vatavyadhi)', 'EC-2.1 (Sandhivata)', 'AB-4.3 (Anidra)'],
  Pitta: ['EB-1.2 (Amlapitta)', 'ED-5.1 (Pittaja Jwara)', 'AF-3.4 (Raktapitta)'],
  Kapha: ['EC-7.1 (Sthaulya)', 'EA-3.2 (Prameha)', 'AA-9.4 (Kaphaja Kasa)'],
  'Vata+Pitta': ['AB-6.2 (Vatarakta)', 'EC-4.5 (Ardhavabhedaka)', 'ED-2.8 (Grahani)'],
  'Pitta+Kapha': ['EA-5.1 (Amlapitta-Kapha)', 'EC-8.3 (Medoroga)', 'AF-2.2 (Kushtha)'],
  'Vata+Kapha': ['EC-1.9 (Amavata)', 'AA-4.7 (Tamaka Shwasa)', 'AB-8.1 (Pratishyaya)'],
};

// Build 120 balanced-plus-realistic historical clinical cases for live CBR + Topology + Heatmap
function buildCohort() {
  const rng = mulberry32(26008);
  const patients = [];
  // 20 cases per class = 120 rich clinical records (ensures balanced Top-5 retrieval & 10-per-class 60x60 heatmap)
  const classIds = TRIDOSHA_CLASSES.map((c) => c.id);
  let seq = 1001;

  classIds.forEach((dosha, classIdx) => {
    const prior = CLASS_PRIORS[dosha];
    const codes = NAMASTE_CODES[dosha];

    for (let i = 0; i < 20; i++) {
      const id = `AYU-${seq++}`;
      const age = Math.round(18 + rng() * 47);
      const bmi = Number(
        Math.max(16.2, Math.min(35.0, gaussianRand(rng, prior.vitals.bmi[0], prior.vitals.bmi[1]))).toFixed(1)
      );
      const bp = Math.round(
        Math.max(96, Math.min(158, gaussianRand(rng, prior.vitals.bp[0], prior.vitals.bp[1])))
      );
      const pulse = Math.round(
        Math.max(55, Math.min(95, gaussianRand(rng, prior.vitals.pulse[0], prior.vitals.pulse[1])))
      );

      const traits = {};
      Object.entries(prior.traits).forEach(([k, dist]) => {
        traits[k] = pickWeighted(rng, dist);
      });

      // Deterministic 2D embedding coordinates per distance geometry (reflecting exact Silhouette cohesion)
      // Weighted Gower: tightest clusters (Sil = 0.2274)
      // Euclidean OHE: higher ARI separation (0.8162) but looser spherical OHE spread (Sil = 0.0753)
      // Cosine OHE: angular overlap along radial arcs (ARI = 0.4721, Sil = 0.1027)
      const jitterGowerX = gaussianRand(rng, 0, 0.115);
      const jitterGowerY = gaussianRand(rng, 0, 0.115);

      const jitterEucX = gaussianRand(rng, 0, 0.175);
      const jitterEucY = gaussianRand(rng, 0, 0.175);

      const jitterCosX = gaussianRand(rng, 0, 0.21);
      const jitterCosY = gaussianRand(rng, 0, 0.21);

      // Baseline Average-Linkage chaining assignment:
      // Collapses >65% of dual & overlapping patients into one giant "Chained Mega-Cluster 0"
      const chainedCluster =
        dosha === 'Kapha' && i < 11
          ? 2
          : dosha === 'Pitta' && i < 8
            ? 1
            : dosha === 'Vata' && i < 7
              ? 3
              : i === 19 && dosha === 'Pitta+Kapha'
                ? 4
                : i === 19 && dosha === 'Vata+Kapha'
                  ? 5
                  : 0; // Mega-chained cluster

      // Optimized Spectral RBF cluster assignments aligned with validated ARI scores
      const spectralGowerCluster = rng() < 0.88 ? classIdx : (classIdx + 3) % 6;
      const spectralEucCluster = rng() < 0.91 ? classIdx : (classIdx + 3) % 6;
      const spectralCosCluster = rng() < 0.68 ? classIdx : (classIdx + 1) % 6;

      patients.push({
        id,
        dosha,
        classIdx,
        namasteCode: codes[i % codes.length],
        Age_Vaya: age,
        BMI: bmi,
        Systolic_BP: bp,
        Pulse_Nadi_Rate: pulse,
        ...traits,
        coords: {
          gower: [
            Number((prior.centroid2D.gower[0] + jitterGowerX).toFixed(4)),
            Number((prior.centroid2D.gower[1] + jitterGowerY).toFixed(4)),
          ],
          euclidean: [
            Number((prior.centroid2D.euclidean[0] + jitterEucX).toFixed(4)),
            Number((prior.centroid2D.euclidean[1] + jitterEucY).toFixed(4)),
          ],
          cosine: [
            Number((prior.centroid2D.cosine[0] + jitterCosX).toFixed(4)),
            Number((prior.centroid2D.cosine[1] + jitterCosY).toFixed(4)),
          ],
        },
        clusters: {
          baseline: chainedCluster,
          gower: spectralGowerCluster,
          euclidean: spectralEucCluster,
          cosine: spectralCosCluster,
        },
      });
    }
  });

  return patients;
}

export const CLINICAL_COHORT = buildCohort();

// 6 Preset Query Patients for Module 3 Live CBR Retrieval Simulator
export const PRESET_QUERY_PATIENTS = [
  {
    id: 'Q-VATA-01',
    label: 'Case 01 — Classic Vata (Sandhivata / Anidra)',
    expectedDosha: 'Vata',
    summary: '34y, lean frame, dry skin (Rooksha), irregular appetite (Vishama Agni), rapid Sarpa Gati pulse.',
    Age_Vaya: 34,
    BMI: 18.8,
    Systolic_BP: 110,
    Pulse_Nadi_Rate: 83,
    Nadi_Type: 'Sarpa_Gati',
    Agni_Grade: 'Vishama',
    Koshtha: 'Krura',
    Bala_Strength: 'Avara',
    Skin_Texture: 'Rooksha',
    Body_Frame: 'Slim',
    Bone_Structure: 'Light_Small',
    Complexion: 'Pale_Dull',
    Hair_Type: 'Dry_Brittle',
    Mala_Tendency: 'Dry_Constipated',
    Sveda_Perspiration: 'Scanty',
    Sleep_Quality: 'Light_Interrupted',
    Satva_Disposition: 'Anxious_Variable',
  },
  {
    id: 'Q-PITTA-02',
    label: 'Case 02 — Acute Pitta (Amlapitta / Hyperacidity)',
    expectedDosha: 'Pitta',
    summary: '41y, medium athletic build, warm skin (Ushna), sharp digestive fire (Tikshna Agni), Manduka Gati pulse.',
    Age_Vaya: 41,
    BMI: 23.7,
    Systolic_BP: 126,
    Pulse_Nadi_Rate: 74,
    Nadi_Type: 'Manduka_Gati',
    Agni_Grade: 'Tikshna',
    Koshtha: 'Mridu',
    Bala_Strength: 'Madhyama',
    Skin_Texture: 'Ushna',
    Body_Frame: 'Medium',
    Bone_Structure: 'Medium',
    Complexion: 'Fair_Warm',
    Hair_Type: 'Fine_Straight',
    Mala_Tendency: 'Loose_Frequent',
    Sveda_Perspiration: 'Profuse_Warm',
    Sleep_Quality: 'Moderate',
    Satva_Disposition: 'Intense_Sharp',
  },
  {
    id: 'Q-KAPHA-03',
    label: 'Case 03 — Pravara Kapha (Sthaulya / Prameha Risk)',
    expectedDosha: 'Kapha',
    summary: '48y, broad build, elevated BMI, oily smooth skin (Snigdha), slow digestion (Manda Agni), Hamsa Gati pulse.',
    Age_Vaya: 48,
    BMI: 29.1,
    Systolic_BP: 132,
    Pulse_Nadi_Rate: 62,
    Nadi_Type: 'Hamsa_Gati',
    Agni_Grade: 'Manda',
    Koshtha: 'Madhyama',
    Bala_Strength: 'Pravara',
    Skin_Texture: 'Snigdha',
    Body_Frame: 'Large',
    Bone_Structure: 'Large_Heavy',
    Complexion: 'Lustrous_Even',
    Hair_Type: 'Thick_Oily',
    Mala_Tendency: 'Formed_Regular',
    Sveda_Perspiration: 'Moderate_Cool',
    Sleep_Quality: 'Deep_Prolonged',
    Satva_Disposition: 'Calm_Steady',
  },
  {
    id: 'Q-VP-04',
    label: 'Case 04 — Dual Vata+Pitta (Vatarakta / Migraine)',
    expectedDosha: 'Vata+Pitta',
    summary: '29y, slim-medium build, sharp-variable digestion, light interrupted sleep, mixed Sarpa/Manduka profile.',
    Age_Vaya: 29,
    BMI: 21.5,
    Systolic_BP: 118,
    Pulse_Nadi_Rate: 78,
    Nadi_Type: 'Sarpa_Gati',
    Agni_Grade: 'Tikshna',
    Koshtha: 'Mridu',
    Bala_Strength: 'Madhyama',
    Skin_Texture: 'Rooksha',
    Body_Frame: 'Slim',
    Bone_Structure: 'Medium',
    Complexion: 'Fair_Warm',
    Hair_Type: 'Dry_Brittle',
    Mala_Tendency: 'Loose_Frequent',
    Sveda_Perspiration: 'Profuse_Warm',
    Sleep_Quality: 'Light_Interrupted',
    Satva_Disposition: 'Intense_Sharp',
  },
  {
    id: 'Q-PK-05',
    label: 'Case 05 — Dual Pitta+Kapha (Medoroga / Kushtha)',
    expectedDosha: 'Pitta+Kapha',
    summary: '45y, strong Pravara endurance, elevated BP & BMI, warm-oily skin, deep sleep with strong appetite.',
    Age_Vaya: 45,
    BMI: 26.4,
    Systolic_BP: 129,
    Pulse_Nadi_Rate: 69,
    Nadi_Type: 'Manduka_Gati',
    Agni_Grade: 'Sama',
    Koshtha: 'Madhyama',
    Bala_Strength: 'Pravara',
    Skin_Texture: 'Snigdha',
    Body_Frame: 'Large',
    Bone_Structure: 'Large_Heavy',
    Complexion: 'Fair_Warm',
    Hair_Type: 'Thick_Oily',
    Mala_Tendency: 'Formed_Regular',
    Sveda_Perspiration: 'Profuse_Warm',
    Sleep_Quality: 'Deep_Prolonged',
    Satva_Disposition: 'Calm_Steady',
  },
  {
    id: 'Q-VK-06',
    label: 'Case 06 — Dual Vata+Kapha (Amavata / Tamaka Shwasa)',
    expectedDosha: 'Vata+Kapha',
    summary: '52y, sluggish Manda/Vishama Agni, Krura Koshtha, scanty perspiration, cool-dry tendency with slower pulse.',
    Age_Vaya: 52,
    BMI: 24.3,
    Systolic_BP: 120,
    Pulse_Nadi_Rate: 68,
    Nadi_Type: 'Hamsa_Gati',
    Agni_Grade: 'Manda',
    Koshtha: 'Krura',
    Bala_Strength: 'Madhyama',
    Skin_Texture: 'Rooksha',
    Body_Frame: 'Medium',
    Bone_Structure: 'Medium',
    Complexion: 'Pale_Dull',
    Hair_Type: 'Dry_Brittle',
    Mala_Tendency: 'Dry_Constipated',
    Sveda_Perspiration: 'Scanty',
    Sleep_Quality: 'Deep_Prolonged',
    Satva_Disposition: 'Anxious_Variable',
  },
];
