/**
 * src/data/ayurvedicRecommendations.js
 *
 * Classical Ayurvedic literature reference data for constitutional phenotype harmonization.
 * Grounded in classical treatises (Charaka Samhita, Sushruta Samhita, Ashtanga Hridaya).
 *
 * Mandatory Rule R11 Compliance:
 * "Research prototype on a dataset of unverified origin. Not a diagnostic tool.
 * Recommendations are non-prescriptive educational summaries of classical Ayurvedic
 * principles matched to historical cohort phenotypes, not clinical prescriptions."
 */

export const AYURVEDIC_RECOMMENDATIONS = {
  Vata: {
    dosha: 'Vata',
    sanskritName: 'वात',
    elements: 'Ether (Akasha) + Air (Vayu)',
    qualities: 'Dry (Ruksha), Light (Laghu), Cold (Sheeta), Rough (Khara), Subtle (Sukshma), Mobile (Chala)',
    primaryGoal: 'Grounding, Warming, Nourishing, and Establishing Rhythmic Regularity',
    ahara: {
      favoredTastes: 'Sweet (Madhura), Sour (Amla), Salty (Lavana)',
      avoidTastes: 'Pungent (Katu), Bitter (Tikta), Astringent (Kashaya)',
      dietaryPrinciples: [
        'Prioritize warm, freshly cooked, unctuous (snigdha) meals with healthy fats such as cow ghee or sesame oil.',
        'Emphasize hearty soups, well-cooked stews, root vegetables, and cooked whole grains like basmati rice and oats.',
        'Hydrate with warm water, ginger tea, or spiced golden milk; avoid iced drinks and cold raw salads.',
        'Maintain strictly regular meal intervals to stabilize fluctuating digestive fire (Vishama Agni).'
      ],
      foodsToFavor: [
        'Cooked oats, basmati rice, quinoa, whole wheat',
        'Ghee, cold-pressed sesame oil, almond oil',
        'Soaked and peeled almonds, walnuts, pumpkin seeds',
        'Sweet ripe fruits: stewed apples, soaked dates, figs, ripe bananas',
        'Cooked root vegetables: carrots, beets, sweet potatoes, zucchini',
        'Warming spices: fresh ginger, cumin, cardamom, cinnamon, fennel, rock salt'
      ],
      foodsToModerate: [
        'Dry crackers, cold cereal, raw vegetables, unpeeled nuts',
        'Astringent and gas-producing pulses (chickpeas, raw kidney beans) unless cooked with asafoetida (hing)',
        'Cold drinks, caffeinated beverages, refined sugar, carbonated sodas'
      ]
    },
    vihara: {
      circadianRoutine: 'Wake around sunrise (~6:00–6:30 AM); bedtime strictly by 10:00–10:30 PM to avoid late-night restlessness.',
      dailyRegimen: [
        'Daily Abhyanga (warm sesame oil body massage) before shower to nourish nerves, lubricate dry joints, and calm the nervous system.',
        'Keep warm and protect head, neck, and ears from cold wind and drafts.',
        'Practice gentle, grounding yoga asanas with prolonged holding (Tadasana, Vrikshasana, Paschimottanasana).',
        'Nadi Shodhana (alternate nostril breathing) and 15 minutes of grounding meditation twice daily.'
      ],
      exerciseGuidelines: 'Low-to-moderate intensity: restorative yoga, walking in nature, swimming in warm water. Avoid exhausting high-impact workouts that deplete Ojas.'
    },
    ritucharya: {
      vulnerableSeason: 'Late Autumn and Winter (Hemanta & Shishira) - characterized by cold, dry, windy weather.',
      seasonalAdvice: 'Increase intake of warming broths, sesame preparations, warm oil massage, and avoid prolonged exposure to air conditioning or winter winds.'
    }
  },

  Pitta: {
    dosha: 'Pitta',
    sanskritName: 'पित्त',
    elements: 'Fire (Agni) + Water (Jala)',
    qualities: 'Hot (Ushna), Sharp (Tikshna), Light (Laghu), Slightly Oily (Sasneha), Liquid (Drava), Spreading (Sara)',
    primaryGoal: 'Cooling, Calming, Moderation, and Soothing Inflammatory Tendencies',
    ahara: {
      favoredTastes: 'Sweet (Madhura), Bitter (Tikta), Astringent (Kashaya)',
      avoidTastes: 'Pungent (Katu), Sour (Amla), Salty (Lavana)',
      dietaryPrinciples: [
        'Favor cooling, moderately dense, nourishing foods at room temperature or mildly warm.',
        'Emphasize cooling herbs and vegetables like cucumber, cilantro, mint, and fennel.',
        'Cook with ghee or coconut oil rather than pungent mustard or chili oils.',
        'Never skip meals or fast excessively, as sharp digestive fire (Tikshna Agni) will irritate gastric mucosa.'
      ],
      foodsToFavor: [
        'Basmati rice, barley, wheat, oats, mung dal',
        'Ghee, coconut oil, sunflower oil',
        'Sweet juicy fruits: melons, sweet apples, pears, sweet grapes, pomegranates',
        'Cooling vegetables: cucumbers, zucchini, leafy greens, asparagus, cauliflower',
        'Cooling dairy: fresh organic milk (boiled and cooled), sweet fresh paneer, coconut water',
        'Cooling spices: coriander seeds, fennel, cardamom, mint, fresh turmeric'
      ],
      foodsToModerate: [
        'Chilies, cayenne pepper, mustard, raw garlic, raw onions',
        'Fermented foods, vinegar, pickles, hard salty cheeses, sour yogurt',
        'Fried greasy snacks, citrus fruits, tomatoes, alcohol, excessive coffee'
      ]
    },
    vihara: {
      circadianRoutine: 'Wake early with the dawn (~5:30–6:00 AM); bedtime before 10:30 PM before the midnight Pitta cycle begins.',
      dailyRegimen: [
        'Abhyanga with cooling oils like coconut oil, brahmi oil, or sunflower oil.',
        'Avoid peak sun exposure between 10:00 AM and 2:00 PM; seek shade and natural cooling environments.',
        'Practice cooling pranayama: Sheetali (tongue hiss) and Sheetkari to dissipate internal metabolic heat.',
        'Cultivate calming leisure activities, evening walks under moonlight, and non-competitive hobbies.'
      ],
      exerciseGuidelines: 'Moderate intensity exercise during the cool morning or twilight hours (swimming, cycling, walking in green spaces). Avoid working out in heated gyms.'
    },
    ritucharya: {
      vulnerableSeason: 'Summer and early Autumn (Grishma & Sharad) - characterized by intense solar heat and humidity.',
      seasonalAdvice: 'Hydrate abundantly with coconut water and amla juice, favor sweet juicy fruits, apply cooling sandalwood paste if needed, and prioritize emotional relaxation.'
    }
  },

  Kapha: {
    dosha: 'Kapha',
    sanskritName: 'कफ',
    elements: 'Water (Jala) + Earth (Prithvi)',
    qualities: 'Heavy (Guru), Slow (Manda), Cold (Sheeta), Oily (Snigdha), Smooth (Shlakshna), Dense (Sandra), Static (Sthira)',
    primaryGoal: 'Stimulating, Warming, Lightening, Invigorating, and Promoting Circulation',
    ahara: {
      favoredTastes: 'Pungent (Katu), Bitter (Tikta), Astringent (Kashaya)',
      avoidTastes: 'Sweet (Madhura), Sour (Amla), Salty (Lavana)',
      dietaryPrinciples: [
        'Favor warm, light, dry, and easily digestible meals cooked with minimal oil.',
        'Incorporate pungent and aromatic spices freely to stimulate sluggish metabolism (Manda Agni).',
        'Emphasize steamed green vegetables, legumes, whole grains with high fiber, and bitter greens.',
        'Avoid snacking between meals and practice light dinners or intermittent fasting if suitable.'
      ],
      foodsToFavor: [
        'Barley, millet, buckwheat, quinoa, basmati rice (in moderation)',
        'Legumes: red lentils, split mung beans, adzuki beans, chickpeas',
        'Light fruits: pomegranates, cranberries, berries, astringent apples, pears',
        'Vegetables: spinach, kale, broccoli, cabbage, radish, bell peppers, bitter gourd',
        'Small amounts of old raw honey (never heated) as the preferred sweetener',
        'Invigorating spices: black pepper, ginger, Pippali, mustard seed, cinnamon, clove, turmeric'
      ],
      foodsToModerate: [
        'Heavy dairy (cream, cheese, cold whole milk, ice cream)',
        'Deep-fried items, fatty meats, heavy nuts, excessive butter and oils',
        'Refined sugar, white flour, cold sweetened desserts, iced drinks'
      ]
    },
    vihara: {
      circadianRoutine: 'Early rising before sunrise (~5:00–5:30 AM); avoid daytime napping at all costs as it immediately increases Kapha congestion.',
      dailyRegimen: [
        'Udvartana (dry herbal powder massage) or vigorous self-massage with warming mustard or sesame oil.',
        'Engage in brisk physical movement first thing in the morning to disperse accumulated heaviness.',
        'Kapalabhati (skull-shining breath) and Bhastrika (bellows breath) to awaken metabolic fire and clear bronchial pathways.',
        'Seek dynamic, stimulating environments and embrace variety in daily routines.'
      ],
      exerciseGuidelines: 'Vigorous daily physical exercise: brisk walking, running, high-intensity cardio, active Surya Namaskar, vigorous cycling. Break a sweat daily.'
    },
    ritucharya: {
      vulnerableSeason: 'Late Winter and Spring (Shishira & Vasanta) - when melting environmental dampness liquefies stored bodily Kapha.',
      seasonalAdvice: 'Perform gentle seasonal detoxification, drink warm honey-ginger water, increase bitter vegetables, and stay physically dynamic.'
    }
  },

  'Vata+Pitta': {
    dosha: 'Vata+Pitta',
    sanskritName: 'वात-पित्त',
    elements: 'Ether, Air, Fire, and Water',
    qualities: 'Dual phenotype: Combines lightness and mobility (Vata) with sharpness and warmth (Pitta). Sensitive to both exhaustion and overheating.',
    primaryGoal: 'Harmonizing Nervous Stability while Cooling Inflammatory Drive',
    ahara: {
      favoredTastes: 'Sweet (Madhura) is primary (balances both); Bitter (Tikta) in moderation for Pitta; Mild Salty (Lavana) for Vata.',
      avoidTastes: 'Excessively Pungent (Katu) and Harsh Sour (Amla).',
      dietaryPrinciples: [
        'Meals should be served moderately warm (neither scalding hot nor refrigerated).',
        'Ensure dishes are adequately unctuous with ghee or olive oil, avoiding sharp spices like red chili.',
        'Favor mild, aromatic digestive spices: fennel, coriander, cardamom, cumin, fresh ginger in moderate amounts.',
        'Keep regular meal intervals to nourish Vata while preventing Pitta hypoglycemia and irritability.'
      ],
      foodsToFavor: [
        'Basmati rice, oats, quinoa, mung dal, peeled soaked almonds',
        'Sweet ripe fruits: pears, sweet apples, melons, soaked raisins',
        'Cooked green vegetables, zucchini, carrots, asparagus, sweet potato',
        'Healthy fats: Ghee, coconut oil, olive oil'
      ],
      foodsToModerate: [
        'Chilies, deep-fried snacks, vinegar, dry chips, excessive caffeine'
      ]
    },
    vihara: {
      circadianRoutine: 'Wake around 6:00 AM; sleep by 10:30 PM. Maintain consistent daily timing.',
      dailyRegimen: [
        'Abhyanga with balancing oil: blend of sesame and coconut oil, or Brahmi-taila.',
        'Alternate between calming yoga flows and cooling meditation.',
        'Take midday mental breathers to prevent high-strung perfectionism and cognitive fatigue.'
      ],
      exerciseGuidelines: 'Moderate, rhythmic physical activity: brisk walking, swimming, moderate yoga. Avoid pushing to absolute exhaustion.'
    },
    ritucharya: {
      vulnerableSeason: 'Autumn (Vata aggravating) and Summer (Pitta aggravating).',
      seasonalAdvice: 'In summer, emphasize cooling foods and coconut oil; in autumn, transition to warming soups and ghee.'
    }
  },

  'Pitta+Kapha': {
    dosha: 'Pitta+Kapha',
    sanskritName: 'पित्त-कफ',
    elements: 'Fire, Water, and Earth',
    qualities: 'Dual phenotype: Both share moisture and oiliness (Snigdha), but oppose in thermal quality (Pitta is hot; Kapha is cool). Strong structural endurance with high metabolic drive.',
    primaryGoal: 'Promoting Lightness, Cooling Heat, and Minimizing Congestion and Fluid Retention',
    ahara: {
      favoredTastes: 'Bitter (Tikta) and Astringent (Kashaya) are universally balancing; Mild Sweet (Madhura).',
      avoidTastes: 'Excessive Salty (Lavana), Sour (Amla), and Heavy Oily preparations.',
      dietaryPrinciples: [
        'Prioritize steamed, light, non-greasy foods served warm or at room temperature.',
        'Minimize heavy cooking oils and dairy, favoring light plant proteins like mung beans and lentils.',
        'Use digestive spices that do not overheat: coriander, fennel, turmeric, cumin.'
      ],
      foodsToFavor: [
        'Barley, basmati rice, lentils, steamed leafy greens, cauliflower, green beans',
        'Apples, berries, pomegranates, cherries',
        'Small amounts of ghee or sunflower oil'
      ],
      foodsToModerate: [
        'Heavy cheeses, deep-fried foods, butter, rich creamy curries, alcohol, pungent red chilies'
      ]
    },
    vihara: {
      circadianRoutine: 'Wake early (~5:30 AM); sleep by 11:00 PM. Avoid daytime sleeping.',
      dailyRegimen: [
        'Daily dry brushing or light sunflower oil massage.',
        'Moderate-to-vigorous exercise to stimulate lymphatic circulation and burn excess calories.',
        'Regular hydration with lukewarm water infused with coriander and mint.'
      ],
      exerciseGuidelines: 'Active cardiovascular and strength routines: swimming, brisk hiking, cycling, active Ashtanga yoga.'
    },
    ritucharya: {
      vulnerableSeason: 'Late Spring (Kapha peak) and Early Autumn (Pitta peak).',
      seasonalAdvice: 'Practice periodic light eating during seasonal transitions to purge accumulated toxins (Ama).'
    }
  },

  'Vata+Kapha': {
    dosha: 'Vata+Kapha',
    sanskritName: 'वात-कफ',
    elements: 'Ether, Air, Water, and Earth',
    qualities: 'Dual phenotype: Both share coldness (Sheeta), but oppose in moisture and weight (Vata is dry/light; Kapha is oily/heavy). Highly sensitive to cold, damp climates.',
    primaryGoal: 'Universal Warmth, Digestive Agni Awakening, and Balanced Physical Mobility',
    ahara: {
      favoredTastes: 'Warm Pungent (Katu), Mild Sour (Amla), and Mild Salty (Lavana).',
      avoidTastes: 'Cold items, Raw salads, Ice water, Heavy cold sweets.',
      dietaryPrinciples: [
        'Warmth is paramount: all meals and drinks must be warm or hot.',
        'Keep food light and well-spiced to avoid Kapha sluggishness, but adequately moist to soothe Vata dryness.',
        'Generously use digestive spices: ginger, black pepper, cinnamon, cardamom, cumin.'
      ],
      foodsToFavor: [
        'Warm quinoa, basmati rice, buckwheat, roasted vegetables, warm dal soups',
        'Stewed fruits with cinnamon, ginger tea, warm spiced nut milk',
        'Small amounts of sesame oil or ghee'
      ],
      foodsToModerate: [
        'Cold smoothies, raw vegetables, refrigerated foods, heavy cold dairy, iced water'
      ]
    },
    vihara: {
      circadianRoutine: 'Wake by 6:00 AM; sleep by 10:30 PM. Keep bedroom warm and insulated.',
      dailyRegimen: [
        'Warm sesame oil massage followed by a hot steam shower or sauna.',
        'Keep body thoroughly warm with layered clothing, especially feet and lower back.',
        'Active morning movement to shake off cold stiffness.'
      ],
      exerciseGuidelines: 'Moderate, warming exercise: vigorous indoor walking, flow yoga, cycling in warm settings. Avoid exercising in cold damp weather.'
    },
    ritucharya: {
      vulnerableSeason: 'Winter and early Spring - cold weather severely aggravates both Vata and Kapha.',
      seasonalAdvice: 'Consume hot herbal teas (tulsi, ginger, cinnamon), dress warmly, and avoid damp chilly exposures.'
    }
  }
};

/**
 * Generate trait-specific guidance based on the patient's entered functional traits.
 */
export function getTraitSpecificGuidance(traitSelections) {
  const guidance = [];

  // 1. Digestion Quality & Appetite
  const digestion = traitSelections['Digestion Quality']?.toLowerCase();
  const appetite = traitSelections['Appetite']?.toLowerCase();

  if (digestion === 'weak' || appetite?.includes('slow')) {
    guidance.push({
      category: 'Metabolic & Agni Support',
      title: 'Sluggish Agni (Manda Agni)',
      recommendation:
        'Stimulate low digestive enzyme activity with fresh ginger slices sprinkled with rock salt and lemon juice 10 minutes before principal meals. Avoid cold water with meals.'
    });
  } else if (digestion === 'strong' || appetite?.includes('unbearable')) {
    guidance.push({
      category: 'Metabolic & Agni Support',
      title: 'Hyperactive Agni (Tikshna Agni)',
      recommendation:
        'Soothe excessive acid and rapid combustion by eating meals at consistent times. Sip room-temperature fennel-coriander infusion throughout the day; avoid skipping meals.'
    });
  } else if (appetite?.includes('irregular')) {
    guidance.push({
      category: 'Metabolic & Agni Support',
      title: 'Variable Agni (Vishama Agni)',
      recommendation:
        'Establish fixed daily meal hours (Breakfast 8:00 AM, Lunch 12:30 PM, Dinner 7:00 PM). Consistent timing is the primary therapeutic tool for irregular digestive rhythm.'
    });
  }

  // 2. Sleep Patterns
  const sleep = traitSelections['Sleep Patterns']?.toLowerCase();
  if (sleep === 'short') {
    guidance.push({
      category: 'Circadian Hygiene',
      title: 'Restorative Sleep Promotion',
      recommendation:
        'Apply warm sesame or brahmi oil to the soles of feet (Padabhyanga) before bed. Discontinue screen use 60 minutes prior to sleep and sip warm almond milk with a pinch of nutmeg.'
    });
  } else if (sleep === 'long') {
    guidance.push({
      category: 'Circadian Hygiene',
      title: 'Circadian Activation',
      recommendation:
        'Rise strictly before 6:00 AM (Kapha time starts at 6:00 AM). Avoid sleeping in on weekends and refrain from afternoon naps, which exacerbate metabolic sluggishness.'
    });
  }

  // 3. Stress Levels
  const stress = traitSelections['Stress Levels']?.toLowerCase();
  if (stress === 'high') {
    guidance.push({
      category: 'Psychosomatic Harmonization',
      title: 'Nervous System De-escalation',
      recommendation:
        'Practice 10 minutes of Pranayama (specifically Nadi Shodhana with 4-count inhale, 4-count exhale) morning and evening. Consider adaptogenic classical herbs like Ashwagandha or Brahmi under qualified guidance.'
    });
  }

  // 4. Climate Preference
  const climate = traitSelections['Climate Preference']?.toLowerCase();
  if (climate === 'warm') {
    guidance.push({
      category: 'Thermoregulation',
      title: 'Cold Sensitivity Management',
      recommendation:
        'Protect extremities with natural fibers (wool, silk). Consume warm cooked meals exclusively and incorporate gentle warming spices like cinnamon and black pepper.'
    });
  } else if (climate === 'cool') {
    guidance.push({
      category: 'Thermoregulation',
      title: 'Heat Sensitivity Management',
      recommendation:
        'Keep hydrated with coconut water or mint-infused water. Avoid hot showers and limit outdoor exposure during peak solar hours.'
    });
  }

  return guidance;
}
