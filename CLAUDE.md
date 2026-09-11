# CLAUDE.md — whatdidyoutake.org (Site 2)

The harm-reduction reference. `README.md` has the architecture and the full list
of what each build gate enforces; read it before changing content or templates.
`SPEC-2` is the editorial spec, `SPEC-3` the deployment spec.

Sibling project: **Site 1**, `poisonphenibut.com`, at
`~/CascadeProjects/phenibut-awareness-hub`. Same owner, same Cloudflare account,
shared `SPEC-3`, **opposite audiences**. See that repo's `CLAUDE.md`.

---

## Run the gates. They are the point.

```bash
npm run build          # gates → build → gates. Refuses to ship rather than ship wrong.
npm run verify         # everything, plus live citation, outbound-link and served-site checks
npm run verify:live    # what the EDGE serves, which is not what dist/ contains
```

`verify:live` exists because every other gate reads `dist/`, and Cloudflare
injects at the edge. It caught a Web Analytics beacon on all 24 pages that no
build-time check could see — and an earlier version of it passed cleanly because
it used a bare `fetch()`; Cloudflare only injects for browser-shaped requests.
**It sends a browser User-Agent on purpose. Do not "simplify" that away.**

## Things that are load-bearing and look optional

- **`build.format: 'file'`** in `astro.config.mjs`. `'directory'` makes every
  canonical URL a 301 to a trailing-slash variant and breaks the `/emergency`
  rule in `_headers`.
- **`build.inlineStylesheets: 'never'`**. `SPEC-3` §4 sets `style-src 'self'`,
  which forbids inline `<style>`. Changing one without the other silently
  breaks every page.
- **No analytics, at all.** `/about` tells readers so in plain terms. Site 1
  runs Cloudflare Web Analytics and allowlists the beacon in its CSP; copying
  that CSP here would start collecting data this site publicly says it does not
  collect.
- **`/emergency` has a measured byte budget** and must stay text-only, no
  images, no executable JS. It has to load on a bad connection in a hospital car
  park.
- **The dosing allowlist is empty and should stay that way.** Rewrite the
  sentence instead. Stale entries also fail the build, so it cannot rot.

## Domains

This project owns `whatdidyoutake.org` (+ `www`), `phenibutwithdrawal.org` and
`phenibut.help`. The last two are 301 deep-links into this site, not Site 1 —
they have been repointed at Site 1 once before, which sends people in crisis to
a research document. `SPEC-3` §2 has the intended state.

```bash
node scripts/create-redirects.mjs --dry-run   # report drift
node scripts/create-redirects.mjs             # repair it
```

## Before promoting this anywhere

No page has been reviewed by a named clinician. Every page says so visibly,
which is honest, but `docs/CLINICAL-REVIEW-BRIEF.md` is written and ready to
send — four pages, about two hours.
