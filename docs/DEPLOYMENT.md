# Deployment — whatdidyoutake.org

Implements SPEC 3 for this project only. `poisonphenibut.com` is a separate
repository (`~/CascadeProjects/phenibut-awareness-hub`) with its own project.

Everything here is static. There are no Workers, no D1, no KV and no R2, and it
must stay that way — every piece of infrastructure added is a thing that can
break at 3am when someone needs `/emergency` to load.

---

## 0. Current state — as deployed 8 September 2026

**The site is live at https://whatdidyoutake.org.** All 24 sitemap URLs return
200 with canonical and `og:url` aligned; the strict CSP, HSTS and the
`/emergency` `stale-if-error` cache rule are all confirmed on the live domain.

| Item | State |
|---|---|
| Pages project `whatdidyoutake` | ✅ created, production branch `main` |
| Deployed | ✅ `wrangler pages deploy dist` |
| Custom domains bound | ✅ `whatdidyoutake.org`, `www.whatdidyoutake.org` |
| DNS | ✅ proxied CNAMEs for apex and `www` → `whatdidyoutake.pages.dev` |
| Headers / CSP | ✅ verified live |
| `robots.txt` / `sitemap.xml` / `llms.txt` | ✅ live |
| Google Search Console | ✅ `sc-domain:whatdidyoutake.org` verified by DNS TXT, sitemap registered |
| IndexNow (Bing/Yandex) | ✅ all 24 URLs accepted (HTTP 202) |
| Analytics | ✅ none, by decision — see §4 |
| `/emergency` edge cache rule | ✅ in place; returns HIT, so `stale-if-error` can fire |
| GitHub | ✅ https://github.com/abandini/whatdidyoutake (public) |
| `www` → apex 301 | ✅ live, path preserved |
| `phenibutwithdrawal.org` → `/stopping/phenibut` | ✅ live, 301 |
| `phenibut.help` → `/emergency` | ✅ live, 301 |
| Cloudflare Access on previews | ❌ dashboard-only, not yet enabled |
| Named clinical review | ❌ outstanding — every page says so on the page |

### The three redirect rules

Created 8 September 2026 with `node scripts/create-redirects.mjs`, after
`Dynamic URL Redirects · Edit` was added to the `cf-dns-reps` token. All three
verified returning 301 to the correct destination, apex and `www` alike.

Note for anyone re-running this: the `http_request_dynamic_redirect` phase
entrypoint accepts **only** a `rules` array. Sending `name`, `kind` or `phase`
alongside it is rejected with `unknown field "kind"`. A 404 from the entrypoint
means "permitted, no ruleset yet" — not a permissions failure.

---

## 1. Cloudflare Pages project

```
Project name:       whatdidyoutake
Production branch:  main
Build command:      npm run build
Build output:       dist
Node version:       20 or newer  (set NODE_VERSION=20 if the default is older)
```

`npm run build` runs the content gates, builds, emits preview headers, then runs
the post-build gates. **A build that violates the zero-dosing rule, ships a
broken link, loses a canonical, or contains an unfilled `TKTK` placeholder fails
and does not deploy.** That is intentional.

### Custom domains

Add both, in the Pages project → Custom domains:

| Domain | Role |
|---|---|
| `whatdidyoutake.org` | canonical |
| `www.whatdidyoutake.org` | 301 → apex |

Set the `www` → apex redirect **at the Pages custom-domain level, not in
application code.** Every `<link rel="canonical">` on the site already points at
the apex, and `gate-html.mjs` fails the build if any page disagrees.

---

## 2. Redirect domains

Use **Redirect Rules**, not a Worker and not a redirect-only Pages project.
Redirect Rules run at the edge, cost nothing, and cannot break the way a Worker
can.

### `phenibutwithdrawal.org`

```
Rule name:  deep-link to stopping page
When:       hostname equals "phenibutwithdrawal.org"
            or hostname equals "www.phenibutwithdrawal.org"
Then:       Static redirect
            URL:    https://whatdidyoutake.org/stopping/phenibut
            Status: 301
            Preserve query string: OFF
```

### `phenibut.help`

```
Rule name:  deep-link to emergency page
When:       hostname equals "phenibut.help"
            or hostname equals "www.phenibut.help"
Then:       Static redirect
            URL:    https://whatdidyoutake.org/emergency
            Status: 301
            Preserve query string: OFF
```

Both destination pages are written to work as cold entry points — no assumed
prior context, and a clear path up to the full compound page for a reader who
arrived early rather than late.

### DNS for the redirect zones

With no origin server, each redirect zone needs a proxied record so Cloudflare
terminates the request and the rule can run:

```
Type: AAAA   Name: @     Content: 100::   Proxy: Proxied (orange cloud)
Type: AAAA   Name: www   Content: 100::   Proxy: Proxied (orange cloud)
```

`100::` is the discard prefix; it is never actually contacted. **If the proxy is
grey-clouded the rule will not run.**

Set SSL/TLS mode to **Full (strict)** on each redirect zone and confirm Universal
SSL is active **before** either domain is shared anywhere. Without a certificate
the redirect fails on HTTPS before it ever runs.

### Verify

```bash
curl -sSI https://phenibutwithdrawal.org  | grep -i '^location\|^HTTP'
curl -sSI https://phenibut.help           | grep -i '^location\|^HTTP'
```

Expect `301` and the exact destination. **Then test both from a phone on
cellular, not just from a desktop** — that is the connection the reader will be
on.

---

## 3. Headers

`public/_headers` is copied into `dist/` by the build. It carries HSTS,
`nosniff`, the referrer policy, the permissions policy, and a strict CSP.

**The CSP and the Astro config are coupled.** `style-src 'self'` forbids inline
`<style>`, which is why `build.inlineStylesheets` is `'never'` in
`astro.config.mjs`. Changing one without the other silently breaks every page.

`/emergency` carries `stale-if-error=604800`: if a build is broken, the edge
keeps serving the last good copy for a week rather than an error page. For that
page specifically, slightly old is vastly better than nothing.

**That header does nothing on its own.** Cloudflare does not cache HTML on the
strength of an origin `Cache-Control` — by default it caches only static
extensions. Without a cache rule, `/emergency` returns
`cf-cache-status: DYNAMIC`, no copy is ever stored, and `stale-if-error` can
never fire. This was live and undetected until 11 September 2026, alongside two
real 504s on that page. **Fixed the same day** — the cache rule is in place and
`/emergency` now returns `MISS` then `HIT`, so a stored copy exists for
`stale-if-error` to serve.

```bash
node scripts/create-cache-rules.mjs --dry-run
node scripts/create-cache-rules.mjs          # needs Zone · Cache Settings · Edit
```

Verify with `curl -sSI https://whatdidyoutake.org/emergency | grep -i cf-cache-status`
— expect `HIT` or `MISS`, never `DYNAMIC`. `npm run verify:live` now fails on
`DYNAMIC`, because a resilience header that does nothing is worse than an absent
one: it reads as a guarantee.

---

## 4. Analytics — deliberately none

**No analytics is enabled on this site, of any kind.** Not Google, not a
privacy-preserving alternative, not Cloudflare Web Analytics.

SPEC 3 §6 raised this as a judgement call and it was decided against: knowing
pageview counts is worth little, and any reader believing their visit to a
withdrawal page was logged costs a great deal more. An absolute privacy claim is
also stronger than a carefully-worded one. This is stated plainly in `/about`.

**If that is ever reversed, `/emergency` must still be excluded**, and `/about`
must be updated in the same commit — the claim there is currently unconditional.

---

## 5. Preview deployments

Cloudflare Pages creates a public preview URL for every branch and commit. For a
site making medical claims, an unreviewed draft at a guessable URL is a real
problem: a crawler or a language model can find it, and an unreviewed claim in an
AI answer is indistinguishable from a reviewed one.

Two mitigations, both required:

1. **Cloudflare Access on preview deployments.** Pages project → Settings →
   Access policy → enable for preview deployments, restricted to the operator's
   email. This is dashboard-only and is not in the repository.
2. **`X-Robots-Tag: noindex, nofollow, noarchive` on every non-production
   deployment.** Handled automatically by `scripts/emit-preview-headers.mjs`,
   which appends it whenever `CF_PAGES_BRANCH` is not `main`.

Never put a real clinical claim in a branch name — branch names appear in the
preview hostname.

---

## 6. Sequence

Do these in order. **Do not skip step 5 to step 6.**

1. Pages project created, both custom domains bound, apex canonical, `www` 301ing.
2. Universal SSL verified active on all zones **before** any domain is shared with anyone.
3. Redirect Rules live; both redirect domains tested from a phone on cellular.
4. `_headers` deployed; confirm the CSP has not broken anything (`curl -sSI https://whatdidyoutake.org | grep -i content-security`).
5. Build gates confirmed running in CI — deliberately already true, since they were built before any compound page was written.
6. `robots.txt`, `sitemap.xml`, `llms.txt` reachable at the root.
7. Cloudflare Access on preview deployments.
8. Account and continuity items below.

---

## 7. Account security and continuity

This section is the one people skip. The site is load-bearing for people the
operator will never meet, and it currently depends entirely on one person's
Cloudflare account and one person's continued attention.

- [ ] **Two-factor on the Cloudflare account.** Recovery codes stored somewhere a family member can reach.
- [ ] **Auto-renew on all four domains.** A lapsed `phenibut.help` becomes a vendor's domain within days.
- [ ] **Registrar transfer lock on** for all four.
- [ ] **Written down, on paper:** where the repositories are, where the account is, and what the sites are for — so that someone can either maintain or gracefully retire them rather than let them go stale and wrong, or lapse and be bought.
- [ ] **Repositories pushed to GitHub, not only local.** Public is fine; there is nothing secret here, and public means someone else could pick this up.

---

## 8. Ongoing

- `npm run verify` runs every gate plus live citation and outbound-link checks. Run it before any deploy that touched content.
- `gate-frontmatter.mjs` **warns** when a page's `lastReviewed` passes about four months and **fails the build** at twelve. An unreviewed medical page with a three-year-old date is worse than no page, so this is enforced rather than remembered.
- The honest ongoing cost is roughly quarterly review of twelve compound pages plus three stopping pages, and a standing relationship with one clinician.

---

## 9. Post-deploy verification (`npm run verify:live`)

A clean build says nothing about what the edge actually serves, and the two
differ. `scripts/gate-live.mjs` checks the deployed site rather than `dist/`:

- no third-party resource injected at the edge that is not in the build
- no analytics beacon, specifically — `/about` promises there is none
- security headers and the `/emergency` `stale-if-error` rule, as served
- every canonical URL returns 200 with no redirect hop
- all four redirect domains 301 to the exact SPEC 3 §2 destinations
- `robots.txt`, `sitemap.xml`, `llms.txt`, `favicon.svg` reachable

**It requests with a browser User-Agent on purpose.** Cloudflare injects its
Web Analytics beacon only for browser-shaped requests, so a bare `fetch()` is
served different HTML from a reader and would have passed the exact problem this
gate exists to find.

Run it after every production deploy. It is in `npm run verify`.

