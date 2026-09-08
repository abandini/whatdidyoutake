// The compound template renders four sections from structured data (verdict,
// risk profile, sources, review footer) and six from hand-written prose, in one
// fixed order (SPEC 2 §6). To interleave them, the rendered body is split at its
// <h2> boundaries. Splitting by POSITION rather than by slug keeps this working
// if a heading's wording is ever adjusted — gate-frontmatter.mjs is what
// guarantees the six headings are present, correct and in order.

/** @returns {string[]} one HTML chunk per <h2> section, in document order. */
export function splitH2Sections(html) {
  if (!html) return [];
  const parts = html.split(/(?=<h2[\s>])/);
  // Anything before the first <h2> is preamble the template does not expect.
  return parts[0].trim() === '' ? parts.slice(1) : parts;
}
