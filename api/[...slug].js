import { plantKnowledgeBase, diseaseDatabase } from "../chatbot/plantbot/backend/plantKnowledgeBase.js";

const lastPlantByClient = new Map();

const normalizeText = (text) =>
  String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const getPlantAliases = (id, plant) => {
  const aliases = new Set();
  const nameNormalized = normalizeText(plant.name);
  const idNormalized = normalizeText(id.replace(/_/g, " "));

  if (nameNormalized) aliases.add(nameNormalized);
  if (idNormalized) aliases.add(idNormalized);

  if (Array.isArray(plant.aliases)) {
    plant.aliases
      .map((alias) => normalizeText(alias))
      .filter(Boolean)
      .forEach((alias) => aliases.add(alias));
  }

  const parenMatches = plant.name.matchAll(/\(([^)]+)\)/g);
  for (const match of parenMatches) {
    match[1].split(/[,/|]/).forEach((part) => {
      const alias = normalizeText(part);
      if (alias) aliases.add(alias);
    });
  }

  return Array.from(aliases);
};

const getPlantMatchScore = (aliases, normalizedQuery, tokens) => {
  if (!normalizedQuery) return 0;
  let score = 0;

  aliases.forEach((alias) => {
    if (alias === normalizedQuery) score = Math.max(score, 4);
    if (alias.includes(normalizedQuery)) score = Math.max(score, 3);
    if (normalizedQuery.includes(alias)) score = Math.max(score, 2);
  });

  if (tokens.length > 0 && tokens.every((token) => aliases.some((alias) => alias.includes(token)))) {
    score += 2;
  } else if (tokens.length > 0 && tokens.some((token) => aliases.some((alias) => alias.includes(token)))) {
    score += 1;
  }

  return score;
};

const getPlantSuggestions = (userQuery, limit = 5) => {
  const normalizedQuery = normalizeText(userQuery);
  if (!normalizedQuery) return [];

  const tokens = normalizedQuery.split(" ").filter(Boolean);

  return Object.entries(plantKnowledgeBase)
    .map(([id, plant]) => {
      const aliases = getPlantAliases(id, plant);
      const score = getPlantMatchScore(aliases, normalizedQuery, tokens);

      return {
        id,
        name: plant.name,
        score,
      };
    })
    .filter((plant) => plant.score > 0)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, limit)
    .map(({ score, ...plant }) => plant);
};

const getDiseaseAliases = (id, disease) => {
  const aliases = new Set();
  const nameNormalized = normalizeText(disease.name);
  const idNormalized = normalizeText(id.replace(/_/g, " "));

  if (nameNormalized) aliases.add(nameNormalized);
  if (idNormalized) aliases.add(idNormalized);

  if (Array.isArray(disease.aliases)) {
    disease.aliases
      .map((alias) => normalizeText(alias))
      .filter(Boolean)
      .forEach((alias) => aliases.add(alias));
  }

  const parenMatches = disease.name.matchAll(/\(([^)]+)\)/g);
  for (const match of parenMatches) {
    match[1].split(/[,/|]/).forEach((part) => {
      const alias = normalizeText(part);
      if (alias) aliases.add(alias);
    });
  }

  return Array.from(aliases);
};

const getDiseaseMatchScore = (aliases, normalizedQuery, tokens) => {
  if (!normalizedQuery) return 0;
  let score = 0;

  aliases.forEach((alias) => {
    if (alias === normalizedQuery) score = Math.max(score, 4);
    if (alias.includes(normalizedQuery)) score = Math.max(score, 3);
    if (normalizedQuery.includes(alias)) score = Math.max(score, 2);
  });

  if (tokens.length > 0 && tokens.every((token) => aliases.some((alias) => alias.includes(token)))) {
    score += 2;
  } else if (tokens.length > 0 && tokens.some((token) => aliases.some((alias) => alias.includes(token)))) {
    score += 1;
  }

  return score;
};

const getDiseaseSuggestions = (userQuery, limit = 20) => {
  const normalizedQuery = normalizeText(userQuery);
  if (!normalizedQuery) return [];

  const tokens = normalizedQuery.split(" ").filter(Boolean);

  return Object.entries(diseaseDatabase)
    .map(([id, disease]) => {
      const aliases = getDiseaseAliases(id, disease);
      const score = getDiseaseMatchScore(aliases, normalizedQuery, tokens);
      const symptoms = normalizeText(disease.symptoms);
      const causes = normalizeText(disease.causes);

      let extraScore = 0;
      if (symptoms.includes(normalizedQuery)) extraScore += 1;
      if (causes.includes(normalizedQuery)) extraScore += 1;

      return {
        id,
        name: disease.name,
        symptoms: disease.symptoms,
        causes: disease.causes,
        score: score + extraScore,
      };
    })
    .filter((disease) => disease.score > 0)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, limit)
    .map(({ score, ...disease }) => disease);
};

const shouldSuggestPlants = (userQuery) => {
  const query = normalizeText(userQuery);
  if (!query) return false;
  return /(plant|care|water|watering|sun|light|soil|fertiliz|temperature|disease|problem|pest|leaf|flower|fruit|seed|grow)/.test(query);
};

const analyzeQuery = (userQuery) => {
  const query = String(userQuery || "").toLowerCase();
  const normalizedQuery = normalizeText(userQuery);

  const queryTokens = normalizedQuery.split(" ").filter(Boolean);
  const containsAliasPhrase = (alias) => {
    const aliasTokens = alias.split(" ").filter(Boolean);
    if (aliasTokens.length === 0 || queryTokens.length === 0) return false;
    if (aliasTokens.length > queryTokens.length) return false;

    for (let i = 0; i <= queryTokens.length - aliasTokens.length; i += 1) {
      let match = true;
      for (let j = 0; j < aliasTokens.length; j += 1) {
        if (queryTokens[i + j] !== aliasTokens[j]) {
          match = false;
          break;
        }
      }
      if (match) return true;
    }

    return false;
  };

  const plantMatch = Object.entries(plantKnowledgeBase).find(([id, plant]) => {
    const aliases = getPlantAliases(id, plant);
    return aliases.some((alias) => normalizedQuery === alias || containsAliasPhrase(alias));
  });

  if (plantMatch) {
    return { type: "plant", plant: plantMatch[1] };
  }

  if (query.includes("water") || query.includes("watering") || query.includes("dry") || query.includes("thirsty")) {
    return { type: "watering" };
  }
  if (query.includes("light") || query.includes("sun") || query.includes("bright") || query.includes("dark")) {
    return { type: "light" };
  }
  if (query.includes("disease") || query.includes("problem") || query.includes("issue") || query.includes("sick") || query.includes("yellow") || query.includes("brown") || query.includes("spot") || query.includes("mold")) {
    return { type: "disease" };
  }
  if (query.includes("temperature") || query.includes("humid") || query.includes("humidity") || query.includes("hot") || query.includes("cold")) {
    return { type: "environment" };
  }
  if (query.includes("fertiliz") || query.includes("soil") || query.includes("feed") || query.includes("nutrient")) {
    return { type: "fertilizer" };
  }
  if (query.includes("pest") || query.includes("bug") || query.includes("insect") || query.includes("spider") || query.includes("mealy")) {
    return { type: "pest" };
  }
  if (query.includes("pot") || query.includes("repot") || query.includes("transplant")) {
    return { type: "potting" };
  }
  if (query.includes("how") || query.includes("what") || query.includes("when") || query.includes("why")) {
    return { type: "question" };
  }

  return { type: "general" };
};

const buildPlantInfo = (plant) => {
  const watering = plant.wateringFrequency || "N/A";
  const sunlight = plant.sunlight || "N/A";
  const temperature = plant.temperature || "N/A";
  const ph = plant.ph || "N/A";
  const diseases = (plant.commonDiseases || []).join(", ") || "N/A";
  const symptoms = plant.symptoms
    ? Object.entries(plant.symptoms)
        .map(([key, value]) => `${key.replace(/_/g, " ")}: ${value}`)
        .join("; ")
    : "N/A";
  const tips = Array.isArray(plant.tips) && plant.tips.length > 0 ? plant.tips.join("; ") : "N/A";

  return `**${plant.name}** care guide:\n\n` +
    `• Watering: ${watering}\n` +
    `• Sunlight: ${sunlight}\n` +
    `• Temperature: ${temperature}\n` +
    `• pH: ${ph}\n` +
    `• Common diseases: ${diseases}\n` +
    `• Symptoms: ${symptoms}\n` +
    `• Tips: ${tips}`;
};

const generatePlantResponse = (userQuery, queryAnalysis, lastPlant) => {
  const query = String(userQuery || "").toLowerCase();
  const normalizedQuery = normalizeText(userQuery);

  const request = {
    wantsPlantCare: /(plant\s*care|care guide|care for|how to care)/.test(query),
    wantsWatering: /(watering schedule|watering frequency|how often|water(ing)?)/.test(query),
    wantsWateringGuide: /(watering guide|how to water|watering tips)/.test(query),
    wantsTemperature: /(temperature|temp|heat|cold)/.test(query),
    wantsSunlight: /(sunlight|light|sun exposure|bright|shade)/.test(query),
    wantsDiseases: /(common diseases|disease|problem|issue)/.test(query),
    wantsPests: /(common pests|pests|insects|bugs)/.test(query),
    wantsSymptoms: /(symptom|yellowing|spots|wilting|mold|rot)/.test(query),
    wantsTips: /(tips|advice|best practices)/.test(query),
    wantsEnvironment: /(best environment|environment|humidity|soil|ph)/.test(query),
  };

  const pestLibrary = [
    { key: "spider mites", aliases: ["spider mites", "spider mite"], summary: "Tiny moving dots, fine webbing", treatment: "Increase humidity, neem oil spray" },
    { key: "mealybugs", aliases: ["mealybugs", "mealy bug", "mealy bugs"], summary: "White cottony clusters", treatment: "Remove with alcohol-soaked cotton" },
    { key: "scale insects", aliases: ["scale insects", "scale insect", "scale"], summary: "Brown raised bumps on stems", treatment: "Scrape off, insecticidal soap" },
    { key: "fungus gnats", aliases: ["fungus gnats", "fungus gnat", "gnats"], summary: "Small flying insects", treatment: "Let soil dry, use sticky traps" },
    { key: "aphids", aliases: ["aphids", "aphid"], summary: "Soft green/black clusters on new growth", treatment: "Rinse off, insecticidal soap" },
    { key: "thrips", aliases: ["thrips", "thrip"], summary: "Silvery streaks, tiny black specks", treatment: "Blue sticky traps, neem oil" },
    { key: "whiteflies", aliases: ["whiteflies", "whitefly", "white flies", "white fly"], summary: "White moth-like insects, leaf yellowing", treatment: "Yellow sticky traps, neem oil" },
  ];

  const getRequestedPests = () =>
    pestLibrary.filter((pest) => pest.aliases.some((alias) => normalizedQuery.includes(alias)));

  const formatPestBlocks = (pests) => {
    if (!pests || pests.length === 0) return "No record.";
    return pests
      .map((pest) => `**${pest.key}**\n• ${pest.summary}\n• Treatment: ${pest.treatment}`)
      .join("\n\n");
  };

  const wantsSpecificPlantField =
    request.wantsWatering ||
    request.wantsWateringGuide ||
    request.wantsTemperature ||
    request.wantsSunlight ||
    request.wantsDiseases ||
    request.wantsPests ||
    request.wantsSymptoms ||
    request.wantsTips ||
    request.wantsEnvironment;

  const getResponseForPlant = (plant) => {
    if (request.wantsPlantCare) return buildPlantInfo(plant);
    if (request.wantsWatering) return `**${plant.name}** watering frequency: ${plant.wateringFrequency || "N/A"}`;
    if (request.wantsWateringGuide) return `**${plant.name}** watering guide: ${plant.wateringFrequency || "N/A"}`;
    if (request.wantsTemperature) return `**${plant.name}** temperature: ${plant.temperature || "N/A"}`;
    if (request.wantsSunlight) return `**${plant.name}** sunlight: ${plant.sunlight || "N/A"}`;
    if (request.wantsDiseases) {
      const diseases = (plant.commonDiseases || []).join(", ") || "N/A";
      return `**${plant.name}** common diseases:\n• ${diseases}`;
    }
    if (request.wantsPests) {
      const pests = (plant.commonPests || []).join(", ") || "N/A";
      return `**${plant.name}** common pests:\n• ${pests}`;
    }
    if (request.wantsSymptoms) {
      const symptoms = plant.symptoms
        ? Object.entries(plant.symptoms)
            .map(([key, value]) => `${key.replace(/_/g, " ")}: ${value}`)
            .join("; ")
        : "N/A";
      return `**${plant.name}** symptoms:\n• ${symptoms}`;
    }
    if (request.wantsTips) {
      const tips = Array.isArray(plant.tips) && plant.tips.length > 0 ? plant.tips.join("; ") : "N/A";
      return `**${plant.name}** tips: ${tips}`;
    }
    if (request.wantsEnvironment) {
      const environmentParts = [];
      if (plant.sunlight) environmentParts.push(`Sunlight: ${plant.sunlight}`);
      if (plant.temperature) environmentParts.push(`Temperature: ${plant.temperature}`);
      if (plant.ph) environmentParts.push(`pH: ${plant.ph}`);
      const environment = environmentParts.length > 0 ? environmentParts.join("; ") : "N/A";
      return `**${plant.name}** best environment: ${environment}`;
    }
    return buildPlantInfo(plant);
  };

  if (queryAnalysis.type === "plant") {
    return getResponseForPlant(queryAnalysis.plant);
  }

  if ((wantsSpecificPlantField || request.wantsPlantCare) && lastPlant) {
    return getResponseForPlant(lastPlant);
  }

  if (request.wantsPests) {
    const specificPests = getRequestedPests();
    if (specificPests.length > 0) return formatPestBlocks(specificPests);
    return `Common plant pests:\n\n${formatPestBlocks(pestLibrary)}`;
  }
  if (request.wantsDiseases) {
    return (
      'Common plant problems:\n\n' +
      'Fungal issues:\n' +
      '• Powdery mildew: White coating, improve air circulation\n' +
      '• Root rot: Mushy stems, reduce watering\n' +
      '• Leaf spot: Brown spots, remove affected leaves\n\n' +
      'Pest problems:\n' +
      '• Spider mites: Fine webbing, increase humidity\n' +
      '• Mealybugs: White cotton, remove with alcohol\n' +
      '• Scale: Brown bumps, scrape off\n\n' +
      'Describe your symptoms for specific diagnosis!'
    );
  }

  if (wantsSpecificPlantField || request.wantsPlantCare) {
    return "No record.";
  }

  switch (queryAnalysis.type) {
    case "watering":
      if (query.includes("how often") || query.includes("frequency")) {
        return (
          'Watering frequency depends on the plant type, season, and environment:\n\n' +
          'Houseplants: Water when top 1-2 inches of soil are dry\n' +
          'Succulents/Cacti: Every 2-3 weeks, let soil dry completely\n' +
          'Vegetables: Keep soil consistently moist\n' +
          'Flowering plants: Water when soil surface feels dry\n\n' +
          'Tips: Always check soil moisture before watering. Better to underwater than overwater.'
        );
      }
      return (
        'Watering guide:\n\n' +
        '• Check soil moisture by inserting finger 1-2 inches deep\n' +
        '• Water thoroughly until it drains from bottom\n' +
        '• Empty saucer after 30 minutes to prevent root rot\n' +
        '• Use room temperature water\n' +
        '• Water early morning or evening, not midday\n' +
        '• Reduce watering in winter when growth slows'
      );
    case "light":
      return (
        'Light requirements:\n\n' +
        'Bright indirect light (best for most houseplants):\n' +
        '• 3-4 hours of morning/evening sun\n' +
        '• North or east-facing windows\n' +
        '• 3-6 feet from south-facing window\n\n' +
        'Full sun: 6+ hours direct sunlight\n' +
        'Partial shade: 2-4 hours of light\n' +
        'Low light: Can survive with minimal light\n\n' +
        'Tip: Rotate plants weekly for even growth.'
      );
    case "disease":
      if (query.includes("yellow") || query.includes("yellowing")) {
        return (
          'Yellow leaves diagnosis:\n\n' +
          'Most common causes:\n' +
          '• Overwatering: Roots rot, leaves turn yellow\n' +
          '• Underwatering: Plant stress, gradual yellowing\n' +
          '• Poor drainage: Water sits in soil too long\n' +
          '• Nutrient deficiency: Usually older leaves first\n' +
          '• Pests: Check underside of leaves\n\n' +
          'Solutions: Check soil moisture, improve drainage, fertilize if needed.'
        );
      }
      return (
        'Common plant problems:\n\n' +
        'Fungal issues:\n' +
        '• Powdery mildew: White coating, improve air circulation\n' +
        '• Root rot: Mushy stems, reduce watering\n' +
        '• Leaf spot: Brown spots, remove affected leaves\n\n' +
        'Pest problems:\n' +
        '• Spider mites: Fine webbing, increase humidity\n' +
        '• Mealybugs: White cotton, remove with alcohol\n' +
        '• Scale insects: Brown bumps, scrape off\n\n' +
        'Describe your symptoms for specific diagnosis!'
      );
    case "environment":
      return (
        'Temperature and humidity:\n\n' +
        'Ideal range: 65-75 F (18-24 C) for most plants\n\n' +
        'Humidity levels:\n' +
        '• Low (<40%): Most homes, use pebble trays\n' +
        '• Medium (40-60%): Ideal for most plants\n' +
        '• High (>60%): Tropical plants prefer this\n\n' +
        'Tips:\n' +
        '• Group plants together to increase humidity\n' +
        '• Use humidifier in dry climates\n' +
        '• Mist leaves (but not in direct sun)\n' +
        '• Avoid cold drafts and heat vents'
      );
    case "fertilizer":
      return (
        'Fertilizing guide:\n\n' +
        'When to fertilize:\n' +
        '• Spring through summer (growing season)\n' +
        '• Every 4-6 weeks for houseplants\n' +
        '• Reduce in fall/winter\n\n' +
        'Types of fertilizer:\n' +
        '• Balanced (10-10-10): All-purpose\n' +
        '• High nitrogen: For leafy growth\n' +
        '• High phosphorus: For flowers/fruits\n' +
        '• Organic: Slower release, better for soil\n\n' +
        'Important: Never fertilize dry soil or stressed plants.'
      );
    case "pest":
      return (
        'Common plant pests:\n\n' +
        'Spider mites:\n' +
        '• Tiny moving dots, fine webbing\n' +
        '• Treatment: Increase humidity, neem oil spray\n\n' +
        'Mealybugs:\n' +
        '• White cottony clusters\n' +
        '• Treatment: Remove with alcohol-soaked cotton\n\n' +
        'Scale insects:\n' +
        '• Brown raised bumps on stems\n' +
        '• Treatment: Scrape off, insecticidal soap\n\n' +
        'Fungus gnats:\n' +
        '• Small flying insects\n' +
        '• Treatment: Let soil dry, use sticky traps\n\n' +
        'Aphids:\n' +
        '• Soft green/black clusters on new growth\n' +
        '• Treatment: Rinse off, insecticidal soap\n\n' +
        'Thrips:\n' +
        '• Silvery streaks, tiny black specks\n' +
        '• Treatment: Blue sticky traps, neem oil\n\n' +
        'Whiteflies:\n' +
        '• White moth-like insects, leaf yellowing\n' +
        '• Treatment: Yellow sticky traps, neem oil'
      );
    case "potting":
      return (
        'Potting and repotting:\n\n' +
        'When to repot:\n' +
        '• Roots growing out drainage holes\n' +
        '• Plant growing too large for pot\n' +
        '• Soil not holding moisture\n' +
        '• Every 1-2 years for houseplants\n\n' +
        'How to repot:\n' +
        '1. Choose pot 1-2 inches larger\n' +
        '2. Use fresh, well-draining soil\n' +
        '3. Gently remove plant, loosen roots\n' +
        '4. Place in new pot, fill with soil\n' +
        '5. Water thoroughly\n\n' +
        'Best time: Spring or early summer'
      );
    case "question":
    default:
      return "No record.";
  }
};

const generateDiagnosis = (symptoms) => {
  const sym = String(symptoms || "").toLowerCase();

  for (const [key, disease] of Object.entries(diseaseDatabase)) {
    if (String(disease.symptoms || "").toLowerCase().split(",").some((s) => sym.includes(s.trim()))) {
      let response = `🔍 Possible Diagnosis: ${disease.name}\n\n`;
      response += `Symptoms: ${disease.symptoms}\n\n`;
      response += `Treatment:\n`;
      if (Array.isArray(disease.treatment)) {
        disease.treatment.forEach((t) => {
          response += `• ${t}\n`;
        });
      }
      return response;
    }
  }

  if (sym.includes("mushy") || sym.includes("soft") || sym.includes("rot")) {
    return (
      'Root Rot Detected\n\n' +
      'Symptoms: Soft stems, mushy roots, foul soil smell\n\n' +
      'Treatment:\n' +
      '• Stop watering immediately\n' +
      '• Repot in fresh, dry soil\n' +
      '• Remove all affected roots with clean knife\n' +
      '• Improve drainage with perlite mix\n' +
      '• Allow soil to dry between waterings'
    );
  }

  return 'Unable to identify specific disease from symptoms. Please describe more details or try the chat feature for more guidance.';
};

const routeHandler = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  const slug = req.query.slug;
  const segments = Array.isArray(slug) ? slug : slug ? [slug] : [];
  const [root, ...rest] = segments;

  try {
    if (root === "health" && req.method === "GET") {
      return res.json({ status: "Backend is running", service: "Plant Care APIs" });
    }

    if (root === "chat" && req.method === "POST") {
      const { message } = req.body || {};
      if (!message || String(message).trim() === "") {
        return res.status(400).json({ error: "Message is required" });
      }
      const clientKey = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "local";
      const normalizedMessage = normalizeText(message);
      if (normalizedMessage === "clear") {
        lastPlantByClient.delete(clientKey);
        return res.json({ id: crypto.randomUUID(), message: "Memory cleared.", timestamp: new Date(), source: "plant-database" });
      }
      const queryAnalysis = analyzeQuery(message);
      const lastPlant = lastPlantByClient.get(clientKey);
      const response = generatePlantResponse(message, queryAnalysis, lastPlant);
      if (queryAnalysis.type === "plant") {
        lastPlantByClient.set(clientKey, queryAnalysis.plant);
      }
      return res.json({ id: crypto.randomUUID(), message: response, timestamp: new Date(), source: "plant-database" });
    }

    if (root === "diagnose" && req.method === "POST") {
      const { symptoms } = req.body || {};
      if (!symptoms || String(symptoms).trim() === "") {
        return res.status(400).json({ error: "Symptoms are required" });
      }
      const diagnosis = generateDiagnosis(symptoms);
      return res.json({ diagnosis, timestamp: new Date(), source: "disease-database" });
    }

    if (root === "search-plants" && req.method === "GET") {
      const query = String(req.query.query || "");
      if (!query.trim()) {
        return res.status(400).json({ error: "Search query required" });
      }
      const normalizedQuery = query.toLowerCase().replace(/[^a-z0-9\s]/g, " ").trim();
      const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
      const results = Object.entries(plantKnowledgeBase)
        .map(([id, plant]) => {
          const name = String(plant.name || "").toLowerCase();
          const key = String(id || "").toLowerCase();
          let score = 0;
          if (name.includes(normalizedQuery)) score += 3;
          if (key.includes(normalizedQuery)) score += 2;
          if (tokens.length > 0 && tokens.every((token) => name.includes(token))) score += 2;
          if (tokens.length > 0 && tokens.some((token) => name.includes(token))) score += 1;
          return { id, name: plant.name, source: "local", score };
        })
        .filter((plant) => plant.score > 0)
        .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
        .slice(0, 20)
        .map(({ score, ...plant }) => plant);
      return res.json({ plants: results, source: results.length > 0 ? "local-database" : "none" });
    }

    if (root === "plants-search" && req.method === "GET") {
      const [query] = rest;
      if (!query) {
        return res.status(400).json({ error: "Plant query required" });
      }
      const plant = plantKnowledgeBase[query.toLowerCase()] || Object.entries(plantKnowledgeBase).find(([_, p]) => p.name.toLowerCase() === query.toLowerCase())?.[1];
      if (plant) {
        return res.json({ ...plant, source: "local-database" });
      }
      return res.status(404).json({ error: "Plant not found" });
    }

    if (root === "plants" && req.method === "GET") {
      if (rest.length === 0) {
        const plants = Object.entries(plantKnowledgeBase).map(([key, value]) => ({ id: key, name: value.name, watering: value.wateringFrequency, sunlight: value.sunlight }));
        return res.json(plants);
      }
      const plantName = rest[0].toLowerCase();
      const plant = plantKnowledgeBase[plantName];
      if (!plant) {
        return res.status(404).json({ error: "Plant not found in database" });
      }
      return res.json(plant);
    }

    if (root === "diseases" && req.method === "GET") {
      if (rest.length === 0) {
        const diseases = Object.entries(diseaseDatabase).map(([key, value]) => ({ id: key, name: value.name, symptoms: value.symptoms, causes: value.causes }));
        return res.json(diseases);
      }
      const diseaseName = String(rest[0] || "").toLowerCase().replace(/\s+/g, "_");
      const disease = diseaseDatabase[diseaseName];
      if (!disease) {
        return res.status(404).json({ error: "Disease not found in database" });
      }
      return res.json(disease);
    }

    if (root === "search-diseases" && req.method === "GET") {
      const query = String(req.query.query || "");
      if (!query.trim()) {
        return res.status(400).json({ error: "Search query required" });
      }
      const results = getDiseaseSuggestions(query, 25);
      return res.json({ diseases: results, source: results.length > 0 ? "local-database" : "none" });
    }

    return res.status(404).json({ error: "Not found" });
  } catch (error) {
    console.error("API error:", error);
    return res.status(500).json({ error: "Server failed" });
  }
};

export default routeHandler;
