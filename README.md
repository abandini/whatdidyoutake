# whatdidyoutake.org

A compound-by-compound risk reference for people who are going to take these
things anyway, written by someone who is not selling them anything.

Implements **SPEC 2**; deployment implements **SPEC 3** for this project.
Static Astro site, no backend, no database, no accounts, no analytics.

---

## Quick start

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # gates → build → gates. Fails loudly rather than shipping wrong.
npm run verify     # everything, plus live citation and outbound-link checks
```

---

## The constraints, and where each one is enforced

The editorial rules are not left to memory. Each is a check that fails the build.

| Rule | Enforced by |
|---|---|
| No dosing information anywhere | `scripts/gate-dosing.mjs` — 8 pattern families, allowlist requires written justification, **stale allowlist entries also fail** |
| Fixed ten-section order on compound pages | `scripts/gate-frontmatter.mjs` + `src/lib/page-structure.js` |
| "What going wrong looks like" is prose, never bullets | `gate-frontmatter.mjs` |
| All five risk bands genuinely used | `gate-frontmatter.mjs` (fails at 12 compounds) |
| Launch scope capped at twelve compounds | `gate-frontmatter.mjs` |
| Every rating cites a real source on its own page | `gate-frontmatter.mjs` |
| Every PMID/DOI resolves **and matches its description** | `scripts/verify-citations.mjs` (live PubMed + Crossref) |
| Emergency link is the first interactive element in the DOM | `scripts/gate-html.mjs` |
| `/emergency` loads on 2G, no images, no JS | `gate-html.mjs` (measured gzip budget) |
| Canonical on every page, JSON-LD parses | `gate-html.mjs` |
| No third-party requests, no affiliate links, no forms | `gate-html.mjs` |
| WCAG 2.2 AA structure (headings, tables, ids, svg, links) | `gate-html.mjs` |
| No broken internal or citation links | `scripts/gate-links.mjs` |
| Review date present and not stale | `gate-frontmatter.mjs` (warns ~4 months, fails at 12) |
| No unfilled `TKTK` placeholder ships | `gate-html.mjs` |
| Previews are never indexable | `scripts/emit-preview-headers.mjs` |

Contrast is verified numerically against the token palette rather than by eye;
severity is encoded as weight on one neutral hue, with shape and text carrying
the band so it never depends on colour.

---

## Layout

```
src/
  content/
    compounds/<slug>.md    twelve compound pages — frontmatter carries the six
                           ratings, the band, and the full bibliography
    stopping/<slug>.md     discontinuation pages (phenibut, kratom, tianeptine)
    reviewers/             named clinical reviewers (currently empty — see below)
  lib/
    rating-system.js       the six dimensions and five bands — single source of
                           truth for the schema, the pages, and /how-we-rate
    page-structure.js      the fixed compound-page section order
    cite.js                {{source-id}} → linked superscript; hardens external links
    site.js                site-wide facts and helpline numbers
scripts/                   the gates (above) and authoring aids
docs/DEPLOYMENT.md         Cloudflare Pages, redirect domains, DNS, continuity
```

Pages are generated from structured data, so ratings and bibliography cannot
drift out of sync with the prose.

### Authoring aid

```bash
node scripts/pubmed.mjs "search terms"     # find real PMIDs
node scripts/pubmed.mjs --id 30852710      # confirm one
```

Use it. Every citation on this site was found this way and then machine-verified,
which is why the bibliography can be trusted rather than merely well-formatted.

---

## Before this goes live

Two things are outstanding and neither can be resolved from inside the repository:

1. **`SITE.operator` / `SITE.operatorBio` in `src/lib/site.js` are `TKTK`.**
   The build fails until they are filled. `/about` has to say who runs this.
2. **No page has been clinically reviewed.** All twelve compound pages carry a
   visible notice saying so, which is the honest state — but SPEC 2 §11.4 wants a
   named reviewer with published credentials. Add a file to
   `src/content/reviewers/` and set `reviewedBy:` on each page; the notice
   disappears automatically and `reviewedBy` populates in the JSON-LD.

---

## What would make this a failure

Kept here deliberately, so it can be checked against later:

- It becomes a funnel — email capture, an affiliate link, a rehab referral fee.
- It becomes uniformly alarmist, and the reader who checks the creatine page leaves.
- It publishes a taper protocol somebody follows unsupervised.
- It becomes a crisis line one person cannot sustain.
- It grows to a hundred thin pages instead of twelve good ones.
- It goes stale — an unreviewed medical site with a three-year-old date is worse
  than no site.
