class SeverityService {
  constructor() {}

  // Determine severity from collected follow-up responses
  // Rules:
  // - Critical: any red_flags answered positively OR severe chest pain descriptors
  // - Medium: any risk factors (hypertension, diabetes, smoking, etc.) present
  // - Low: otherwise
  analyze(symptomName, responses) {
    const normalized = this._normalizeResponses(responses);

    if (this._hasCriticalIndicators(symptomName, normalized)) {
      return { level: "CRITICAL", decorated: "🔴 CRITICAL!!!" };
    }

    if (this._hasRiskFactors(normalized)) {
      return { level: "MEDIUM", decorated: "🟡 Medium!" };
    }

    return { level: "LOW", decorated: "🟢 Low" };
  }

  _normalizeResponses(responses) {
    // Flatten array answers into a single string per category for keyword checks
    const out = {};
    for (const [category, answers] of Object.entries(responses || {})) {
      if (Array.isArray(answers)) {
        out[category] = answers.join(" \n ").toLowerCase();
      } else if (typeof answers === "string") {
        out[category] = answers.toLowerCase();
      } else {
        out[category] = String(answers || "").toLowerCase();
      }
    }
    return out;
  }

  _hasCriticalIndicators(symptomName, responsesByCategory) {
    // Red flags present?
    const redFlagsText = responsesByCategory["red_flags"] || "";
    const redFlagKeywords = [
      "sudden",
      "severe",
      "tearing",
      "profuse sweating",
      "shortness of breath",
      "syncope",
      "faint",
      "hemoptysis",
      "confusion",
      "stroke",
      "vision loss",
    ];
    if (this._containsAny(redFlagsText, redFlagKeywords)) return true;

    // Chest pain specific severe descriptors
    const isChestPain = (symptomName || "").toLowerCase().includes("chest");
    if (isChestPain) {
      const symptomDetails = responsesByCategory["symptom_details"] || "";
      const chestPainSevere = [
        "pressure",
        "squeezing",
        "radiate",
        "arm",
        "jaw",
        "back",
        "sweating",
        "nausea",
        "shortness of breath",
        "sudden",
        "severe",
        "constant",
      ];
      if (this._containsAny(symptomDetails, chestPainSevere)) return true;
    }

    return false;
  }

  _hasRiskFactors(responsesByCategory) {
    const lifestyle = responsesByCategory["lifestyle_risk_factors"] || "";
    const pastMedical = responsesByCategory["past_medical_history"] || "";
    const medicalHistory = responsesByCategory["medical_history"] || "";

    const riskKeywords = [
      "hypertension",
      "high blood pressure",
      "diabetes",
      "smok",
      "tobacco",
      "high cholesterol",
      "hyperlip",
      "obesity",
      "sedentary",
      "family history",
    ];

    return (
      this._containsAny(lifestyle, riskKeywords) ||
      this._containsAny(pastMedical, riskKeywords) ||
      this._containsAny(medicalHistory, riskKeywords)
    );
  }

  _containsAny(text, keywords) {
    const t = (text || "").toLowerCase();
    return keywords.some((k) => t.includes(k));
  }
}

module.exports = SeverityService;


