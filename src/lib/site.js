// Site-wide facts. Anything only the operator can supply is written as TKTK,
// which gate-html.mjs treats as a build failure — the site cannot ship with an
// unfilled placeholder in it.

export const SITE = {
  url: 'https://whatdidyoutake.org',
  name: 'What Did You Take',
  tagline: 'A compound-by-compound risk reference for people who are going to take these things anyway.',

  /** SPEC 2 §11 — /about must say who. */
  operator: 'Bill Burkey',
  operatorBio:
    'This site is written and maintained by Bill Burkey — one person, working alone, ' +
    'with no financial relationship to any vendor, manufacturer, laboratory or treatment ' +
    'provider mentioned anywhere on it, and nothing to sell. Not being a clinician is a ' +
    'real limitation rather than a disclaimer, and it is why every factual claim here is ' +
    'cited, why every citation is machine-verified against PubMed on each build, and why ' +
    'named clinical review is treated as an outstanding requirement rather than a ' +
    'nice-to-have.',

  /** The only address on the site. Corrections in, nothing out. SPEC 2 §11.5/§11.6. */
  correctionsAddress: 'corrections@whatdidyoutake.org',

  /** SPEC 3 §6 — decided: no analytics at all on this site. Stated in /about. */
  analytics: false,

  /** IndexNow key, mirrored at /<key>.txt so Bing and Yandex can verify it. */
  indexNowKey: '70be695f1a2c4d0ea1bd6b2a08f9fbcd',

  sister: {
    name: 'poisonphenibut.com',
    url: 'https://poisonphenibut.com',
    what: 'the policy and evidence record aimed at legislators, journalists and clinicians',
  },
};

/** SPEC 2 §11.1 — printed on every page, not buried. */
export const FUNDING_STATEMENT =
  'No vendor money. No affiliate links. No advertising. No sponsorships. Nothing on this site is for sale.';

export const HELPLINES = {
  poison: { label: 'Poison Control', number: '1-800-222-1222', tel: '+18002221222' },
  emergency: { label: 'Emergency services', number: '911', tel: '911' },
  crisis: { label: 'Suicide & Crisis Lifeline', number: '988', tel: '988' },
  samhsa: { label: 'SAMHSA National Helpline', number: '1-800-662-4357', tel: '+18006624357' },
};

/**
 * Regional resources. Deliberately labelled as regional rather than presented
 * as national coverage, because the site has no way to vouch for equivalents
 * elsewhere. The bar for inclusion: verified nonprofit status, free at point of
 * use, no insurance required, and no commercial interest in the reader.
 */
export const REGIONAL_RESOURCES = [
  {
    region: 'Northeast Ohio (Cuyahoga County)',
    name: 'Project White Butterfly',
    url: 'https://projectwhitebutterfly.org/',
    tel: '+12167278725',
    phone: '216-727-8725',
    /** Verified against ProPublica's IRS extract, EIN 84-4507335, NTEE F21. */
    status: '501(c)(3), EIN 84-4507335',
    what:
      'Peer-led, staffed by people with lived experience of addiction. Distributes naloxone ' +
      'and fentanyl test strips free, runs group meetings, and connects people to treatment. ' +
      'No cost and no insurance required.',
  },
];

export const NAV = [
  { href: '/compounds', label: 'Compounds' },
  { href: '/am-i-dependent', label: 'Am I dependent?' },
  { href: '/family', label: 'For family' },
  { href: '/how-we-rate', label: 'How we rate' },
  { href: '/about', label: 'About' },
];
