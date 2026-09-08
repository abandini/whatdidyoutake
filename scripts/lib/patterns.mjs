// Numeric-dose and dose-adjacent patterns. SPEC 3 §7.
// A match is a build failure unless allowlisted in scripts/dosing-allowlist.json.

export const PATTERNS = [
  {
    id: 'number-unit',
    why: 'A number adjacent to a dose unit (mg, mcg, µg, g, ml, IU, units).',
    re: /\b\d+(?:[.,]\d+)?\s*(?:(?:-|–|—|to)\s*\d+(?:[.,]\d+)?\s*)?(?:mg|mcg|µg|μg|ug|g|kg|ml|l|iu|units?|grams?|milligrams?|micrograms?|millilit(?:er|re)s?|international units?)\b/gi,
  },
  {
    id: 'per-volume',
    why: 'A concentration or reconstitution ratio.',
    re: /\bper\s*(?:ml|millilit(?:er|re)|cc|injection|syringe|capsule|scoop|tablet)\b/gi,
  },
  {
    id: 'dose-frequency-words',
    why: 'A dose-frequency construction.',
    re: /\b(?:twice|three times|thrice|four times|once)\s+(?:a|per|each)\s+(?:day|daily|week|night)\b|\btwice[- ]daily\b|\bper day\b|\bdaily dose\b|\bdoses? per\b/gi,
  },
  {
    id: 'dose-frequency-interval',
    why: 'An "every N hours/days" dosing interval.',
    re: /\bevery\s+\d+(?:[.,]\d+)?\s*(?:-|–|to)?\s*\d*\s*(?:hours?|hrs?|h|days?|weeks?)\b/gi,
  },
  {
    id: 'dose-frequency-abbrev',
    // Case-SENSITIVE: "bid" is an ordinary English word, "BID" is a prescription abbreviation.
    why: 'A prescription frequency abbreviation (BID/TID/QID/QD/PRN).',
    re: /\b(?:BID|TID|QID|QD|QHS|PRN|Q\d+H)\b|\b[btq]\.i\.d\.|\bq\.d\.|\bp\.r\.n\./g,
    caseSensitive: true,
  },
  {
    id: 'taper-construction',
    why: 'A taper instruction.',
    // Stems + inflections, so "tapered by" and "reduces to" are caught too.
    re: /\b(?:reduc|taper|decreas|lower|titrat|halv|wean)(?:e|es|ed|ing)?\s+(?:the\s+|your\s+|it\s+|him\s+|her\s+|them\s+)?(?:dose\s+|amount\s+|intake\s+)?(?:by|to|down to)\b|\b(?:cut|cuts|cutting|step|steps|stepped|stepping|drop|drops|dropped|dropping)\s+(?:the\s+|your\s+|it\s+)?(?:dose\s+|amount\s+)?(?:by|to|down to)\b|\btaper(?:ing)? (?:schedule|protocol|plan|regimen|chart|calculator)\b|\bweaning schedule\b/gi,
  },
  {
    id: 'percent-reduction',
    why: 'A percentage dose reduction.',
    re: /\b\d+(?:[.,]\d+)?\s*(?:%|percent)\s*(?:reduction|decrease|cut|drop|less|lower|per|each|every|weekly|daily)\b/gi,
  },
  {
    id: 'how-much-is-safe',
    why: 'Framing that promises a safe quantity.',
    re: /\bhow much (?:is|would be|are) (?:safe|too much|enough)\b|\bsafe (?:dose|dosage|amount|range|upper limit)\b|\bstarting dose\b|\brecommended dose\b|\bcommonly reported dose\b/gi,
  },
];

export const SCAN_EXTENSIONS = new Set(['.md', '.mdx', '.astro', '.html', '.txt']);
