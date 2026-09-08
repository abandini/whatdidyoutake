// SPEC 2 §6 — the fixed section order for every compound page.
// Four of the ten sections are GENERATED from structured frontmatter (verdict,
// risk profile, sources, review footer) so ratings and bibliography cannot
// drift out of sync with the prose. The other six are written by hand, and
// their headings must match this list exactly, in this order.

export const COMPOUND_SECTIONS = [
  { n: 1, id: 'verdict', heading: null, generated: true, from: 'frontmatter.verdict' },
  { n: 2, id: 'what-it-is', heading: 'What it is' },
  { n: 3, id: 'what-it-does', heading: 'What it actually does' },
  { n: 4, id: 'evidence', heading: 'What the evidence actually shows' },
  { n: 5, id: 'risk-profile', heading: null, generated: true, from: 'frontmatter.ratings' },
  { n: 6, id: 'from-the-inside', heading: 'What going wrong looks like from the inside' },
  { n: 7, id: 'interactions', heading: 'Interactions and combinations' },
  { n: 8, id: 'already-using', heading: 'If you’re already using it' },
  { n: 9, id: 'sources', heading: null, generated: true, from: 'frontmatter.sources' },
  { n: 10, id: 'review', heading: null, generated: true, from: 'frontmatter.lastReviewed' },
];

/** The six hand-written headings, in the order they must appear in the body. */
export const AUTHORED_HEADINGS = COMPOUND_SECTIONS.filter((s) => s.heading).map((s) => s.heading);
export const AUTHORED_SECTIONS = COMPOUND_SECTIONS.filter((s) => s.heading);

/** Heading text -> stable anchor id, matching Astro's slugger closely enough for our own splitting. */
export function sectionIdFor(heading) {
  const found = COMPOUND_SECTIONS.find((s) => s.heading === heading);
  return found ? found.id : null;
}
