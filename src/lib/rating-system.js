// SPEC 2 §4 — the risk rating system. Single source of truth: the content
// schema, the page templates, the matrix, and /how-we-rate all read from here,
// so a band or dimension cannot drift between the data and the prose.

/** The six independent dimensions. Deliberately never averaged. */
export const DIMENSIONS = [
  {
    key: 'dependence',
    label: 'Dependence liability',
    measures: 'Does regular use produce tolerance and physical dependence, and is stopping dangerous.',
    scale: {
      1: 'No meaningful tolerance or physical dependence.',
      2: 'Mild tolerance; stopping is uncomfortable at most.',
      3: 'Clear tolerance; psychological dependence documented.',
      4: 'Physical dependence documented; stopping is difficult and needs planning.',
      5: 'Physical dependence develops fast; abrupt cessation can be medically dangerous.',
    },
  },
  {
    key: 'acuteToxicity',
    label: 'Acute toxicity',
    measures: 'Overdose potential, interaction danger, how bad a single mistake can be.',
    scale: {
      1: 'A single excessive amount is not expected to cause serious harm.',
      2: 'Unpleasant but self-limiting in overdose.',
      3: 'Overdose produces real symptoms; some interactions matter.',
      4: 'Overdose commonly reaches medical attention; dangerous in combination.',
      5: 'A single mistake can be life-threatening, especially combined.',
    },
  },
  {
    key: 'documentedHarm',
    label: 'Documented serious harm',
    measures: 'Case reports, hospitalisations, and deaths in humans.',
    scale: {
      1: 'No credible reports of serious harm in humans.',
      2: 'Isolated reports, causation unclear.',
      3: 'A consistent set of published case reports.',
      4: 'Many case reports and hospitalisations, or deaths that occur mainly in combination with other drugs.',
      5: 'Deaths attributable to the compound itself, or harm frequent enough to be routine in clinical settings.',
    },
  },
  {
    key: 'longTerm',
    label: 'Long-term / irreversible risk',
    measures: 'Carcinogenicity, organ damage, permanent effects.',
    scale: {
      1: 'No signal of lasting harm across substantial human use.',
      2: 'No known lasting harm, but the follow-up is short.',
      3: 'Plausible lasting effects; incomplete human data.',
      4: 'Documented organ-level or endocrine harm that may not fully reverse.',
      5: 'Demonstrated irreversible harm, including carcinogenicity.',
    },
  },
  {
    key: 'evidenceQuality',
    label: 'Evidence quality',
    // The dimension readers misread most often, so the label carries its own warning.
    measures: 'How much is actually known. A high score means well-characterised, NOT safe.',
    scale: {
      1: 'Essentially nothing in humans. Animal or in-vitro data only.',
      2: 'Case reports and uncontrolled series only.',
      3: 'Small or short human trials, or one substantial one.',
      4: 'Multiple controlled human trials, though gaps remain.',
      5: 'Large, replicated, long-duration human evidence.',
    },
    inverted: true, // high = more known, not more dangerous
  },
  {
    key: 'productIntegrity',
    label: 'Product integrity risk',
    measures: 'Mislabelling, contamination, and error introduced by the user measuring it.',
    scale: {
      1: 'Regulated supply chain; independent testing is routine.',
      2: 'Mostly reliable; occasional quality problems.',
      3: 'Unregulated but usually contains what it claims.',
      4: 'Analyses regularly find wrong identity, wrong quantity, or contaminants.',
      5: 'Content is unpredictable, and the user is also measuring or preparing it themselves.',
    },
  },
];

export const DIMENSION_KEYS = DIMENSIONS.map((d) => d.key);

/**
 * The five verdict bands. `rank` orders them; `shape` and `pattern` carry the
 * band without colour, per SPEC 2 §14 (never colour alone).
 */
export const BANDS = [
  {
    key: 'low-concern',
    rank: 1,
    label: 'Well-characterised, low concern',
    short: 'Low concern',
    gloss: 'Studied properly, used widely, and the honest answer is that it is broadly fine.',
    shape: 'circle',
    example: 'creatine',
  },
  {
    key: 'real-tradeoffs',
    rank: 2,
    label: 'Works as advertised, real trade-offs',
    short: 'Real trade-offs',
    gloss: 'It does the thing people take it for, and it costs something specific and known.',
    shape: 'square',
    example: 'ostarine',
  },
  {
    key: 'largely-unknown',
    rank: 3,
    label: 'Largely unknown',
    short: 'Largely unknown',
    gloss: 'Promising or popular, but the human evidence to judge it does not exist yet.',
    shape: 'diamond',
    example: 'BPC-157',
  },
  {
    key: 'serious-risk',
    rank: 4,
    label: 'Serious risk',
    short: 'Serious risk',
    gloss: 'Documented harm in humans that is severe, common, or hard to see coming.',
    shape: 'triangle',
    example: 'melanotan II',
  },
  {
    key: 'evidence-says-dont',
    rank: 5,
    label: 'The evidence says don’t',
    short: 'Evidence says don’t',
    gloss: 'The known downside is severe enough that we will say it plainly rather than hedge.',
    shape: 'octagon',
    example: 'cardarine',
  },
];

export const BAND_KEYS = BANDS.map((b) => b.key);
export const bandByKey = (key) => BANDS.find((b) => b.key === key);
export const dimensionByKey = (key) => DIMENSIONS.find((d) => d.key === key);
