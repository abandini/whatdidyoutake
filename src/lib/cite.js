// Inline citations. Prose is written with {{source-id}} markers; this turns each
// into a superscript link to the numbered entry in the page's Sources list, so
// a claim and its evidence stay connected and the numbering cannot drift — both
// come from the same frontmatter array.

/**
 * @param {string} html   rendered section HTML
 * @param {{id:string}[]} sources  the page's sources, in display order
 * @param {string} where  file/section name, for error messages
 */
export function linkCitations(html, sources, where = '') {
  const index = new Map(sources.map((s, i) => [s.id, i + 1]));
  return html.replace(/\{\{([a-z0-9-]+)\}\}/gi, (_, id) => {
    const n = index.get(id);
    if (!n) throw new Error(`${where}: inline citation {{${id}}} has no matching source in frontmatter`);
    return `<sup class="cite"><a href="#source-${id}" aria-label="Source ${n}">${n}</a></sup>`;
  });
}

/**
 * SPEC 3 §3 — every cross-site anchor carries rel="noopener", and outbound
 * citation links carry nofollow. Markdown does not emit these, and relying on
 * an author to hand-write them in prose is how one eventually ships without.
 * Applied to rendered body HTML so it cannot be forgotten.
 */
export function hardenExternalLinks(html) {
  return html.replace(/<a\b([^>]*\bhref=["']https?:\/\/[^"']+["'][^>]*)>/gi, (tag, attrs) => {
    if (/\brel=/i.test(attrs)) return tag;
    return `<a${attrs} rel="noopener nofollow">`;
  });
}

/** The single transform applied to every rendered markdown body. */
export function prepareBody(html, sources, where = '') {
  return hardenExternalLinks(linkCitations(html, sources, where));
}
