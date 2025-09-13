class SeverityService {
  constructor() {
    this.labels = {
      low: "🟢 Low",
      medium: "🟡 Medium!",
      critical: "🔴 CRITICAL!!!",
    };

    this.affirmativePatterns = [
      /\b(yes|yep|yeah|affirmative|true|certainly|of course)\b/i,
    ];

    this.criticalKeywords = [
      // General critical descriptors
      /\b(severe|sudden|tearing|crushing|unbearable|worst)\b/i,
      /\b(profuse|heavy)\s+(sweating|diaphoresis)\b/i,
      /\b(hemoptysis|blood\s+in\s+sputum|massive\s+bleeding)\b/i,
      /\b(syncope|fainted|loss\s+of\s+consciousness)\b/i,
      /\b(hypoxia|very\s+low\s+oxygen)\b/i,
      /\b(neurological\s+deficits|facial\s+droop|speech\s+difficulty)\b/i,
      // Chest pain specific
      /\b(pressure|squeez(ing)?|tight(ness)?|radiat(e|ing))\b/i,
      /\b(jaw|arm|back)\b/i,
      /\b(nausea|vomiting|shortness\s+of\s+breath|dyspnea)\b/i,
    ];

    this.riskFactorKeywords = [
      /\b(hypertension|high\s+blood\s+pressure|bp\s*\d{2,3}\/\d{2,3})\b/i,
      /\b(diabetes|high\s+blood\s+sugar)\b/i,
      /\b(smok(e|ing|er)|tobacco)\b/i,
      /\b(high\s+cholesterol|hyperlipidemia)\b/i,
      /\b(obese|obesity|overweight)\b/i,
      /\b(family\s+history|coronary\s+artery\s+disease|cad|stent|angioplasty|heart\s+attack|myocardial\s+infarction|mi)\b/i,
      /\b(copd|asthma|heart\s+failure|valve\s+disease)\b/i,
    ];
  }

  classify(symptomName, responsesByCategory) {
    const textCorpus = this.flattenResponses(responsesByCategory).join("\n");

    // 1) Critical: any red flag affirmative or critical keywords
    if (this.hasRedFlags(responsesByCategory) || this.matchesAny(textCorpus, this.criticalKeywords)) {
      return { level: "critical", label: this.labels.critical };
    }

    // 2) Medium: any risk factors present
    if (this.matchesAny(textCorpus, this.riskFactorKeywords)) {
      return { level: "medium", label: this.labels.medium };
    }

    // 3) Low: default
    return { level: "low", label: this.labels.low };
  }

  hasRedFlags(responsesByCategory) {
    const redFlagResponses = responsesByCategory?.red_flags;
    if (!redFlagResponses) return false;

    const answers = Array.isArray(redFlagResponses)
      ? redFlagResponses
      : [String(redFlagResponses)];

    return answers.some((answer) => this.isAffirmative(answer) || this.matchesAny(answer, this.criticalKeywords));
  }

  isAffirmative(text) {
    return this.affirmativePatterns.some((re) => re.test(String(text)));
  }

  matchesAny(text, patterns) {
    return patterns.some((re) => re.test(String(text)));
  }

  flattenResponses(responsesByCategory) {
    if (!responsesByCategory || typeof responsesByCategory !== "object") return [];
    const flat = [];
    for (const value of Object.values(responsesByCategory)) {
      if (Array.isArray(value)) flat.push(...value.map((v) => String(v)));
      else if (value != null) flat.push(String(value));
    }
    return flat;
  }
}

module.exports = SeverityService;


