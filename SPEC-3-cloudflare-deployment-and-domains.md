# SPEC 3 — Cloudflare Deployment and Domain Configuration

**Target:** Claude Code
**Applies to:** both sites
**Status:** domains purchased and held at Cloudflare Registrar

---

## 0. The estate

| Domain | Role | Serves |
|---|---|---|
| `poisonphenibut.com` | Authority site (Spec 1) | Legislators, journalists, clinicians, researchers |
| `whatdidyoutake.org` | Reference site (Spec 2) | People at risk, people using, people in crisis, families |
| `phenibutwithdrawal.org` | Redirect | → `whatdidyoutake.org/stopping/phenibut` |
| `phenibut.help` | Redirect | → `whatdidyoutake.org/emergency` |

Two Pages projects. Two redirect configurations. No Workers, no D1, no KV, no R2. Both sites are fully static and must stay that way — every piece of infrastructure added is a thing that can break at 3am when someone needs `/emergency` to load.

**If a requirement in this document seems to call for dynamic behaviour, the requirement is wrong.** Re-read it.

---

## 1. Pages projects

Create two separate projects. Do not attempt to serve both sites from one project with path routing — they have different audiences, different editorial policies, and must be able to fail independently.

```
Project: poisonphenibut
  Production branch:  main
  Build output:       ./dist
  Custom domains:     poisonphenibut.com, www.poisonphenibut.com

Project: whatdidyoutake
  Production branch:  main
  Build output:       ./dist
  Custom domains:     whatdidyoutake.org, www.whatdidyoutake.org
```

For each: apex is canonical, `www` 301s to apex. Set this at the Pages custom-domain level, not in application code.

**Preview deployments.** Cloudflare Pages creates a public preview URL for every branch and every commit. For a site making medical claims, an unreviewed draft reachable at a guessable URL is a real problem — a search engine or a language model can find it, and an unreviewed claim in an AI answer is indistinguishable from a reviewed one.

Mitigate:
- Enable Cloudflare Access on preview deployments for both projects, restricted to the operator's email
- Emit `X-Robots-Tag: noindex, nofollow` on every non-production deployment (see §4)
- Never put a real clinical claim in a branch name

---

## 2. Redirect domains

Use **Redirect Rules**, not a Worker and not a redirect-only Pages project. Redirect Rules run at the edge, cost nothing, add no code to maintain, and cannot break the way a Worker can.

For each redirect domain, add the domain to the Cloudflare account as a zone (it already is, via Registrar), then create a single Redirect Rule.

```
Zone: phenibutwithdrawal.org
  Rule name:   deep-link to stopping page
  When:        hostname matches "phenibutwithdrawal.org" or "www.phenibutwithdrawal.org"
  Then:        Static redirect
               URL: https://whatdidyoutake.org/stopping/phenibut
               Status: 301
               Preserve query string: OFF
```

```
Zone: phenibut.help
  Rule name:   deep-link to emergency page
  When:        hostname matches "phenibut.help" or "www.phenibut.help"
  Then:        Static redirect
               URL: https://whatdidyoutake.org/emergency
               Status: 301
               Preserve query string: OFF
```

Notes:

- **301, not 302.** These are permanent and should consolidate link equity onto the destination pages.
- **Query strings dropped deliberately.** Nothing useful arrives on these domains via query string, and dropping them prevents accidental propagation of anything a referring site appended.
- **Both domains need DNS records to be redirected.** With no origin server, use a proxied `AAAA` record for `@` and `www` pointing at `100::` (the discard prefix). Cloudflare terminates and applies the rule; the address is never actually contacted. Proxy status must be **Proxied (orange cloud)** or the rule will not run.
- Each redirect zone needs SSL/TLS mode **Full (strict)** and Universal SSL active, or the redirect fails on HTTPS before it ever runs. Verify certificates are issued before announcing either domain anywhere.

**Canonical protection.** Because two domains now point at pages that also live at their canonical URLs, `/stopping/phenibut` and `/emergency` must each carry a self-referential `<link rel="canonical">` to their `whatdidyoutake.org` URL. Without this, a 301 chain plus an inbound link on the redirect domain can produce duplicate-content ambiguity.

---

## 3. Cross-site linking

The two sites link to each other. Neither may leak reader information to the other.

- No tracking parameters, no UTM tags, no referral identifiers on any cross-site link
- `rel="noopener"` on all cross-site anchors
- Add `<meta name="referrer" content="strict-origin-when-cross-origin">` to both sites

A clinician browsing poisonphenibut.com and a person in withdrawal reaching whatdidyoutake.org are different people with different privacy stakes. Do not build anything that would let one site's logs characterize the other's readers.

---

## 4. Headers

Create `_headers` in the build output of each project.

```
/*
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), microphone=(), camera=(), interest-cohort=()
  Content-Security-Policy: default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'
```

The CSP is deliberately strict and will break any third-party embed. That is the intent. If something needs loosening, the something is probably the thing to remove instead.

**Exception for Spec 1's contact form:** the existing third-party form handler requires `form-action` and `connect-src` entries for that origin, scoped to the contact page only. Do not widen the site-wide policy for it.

**`/emergency` caching.** This page must survive a reader on a bad connection and must never serve stale crisis phone numbers.

```
/emergency
  Cache-Control: public, max-age=300, stale-while-revalidate=86400, stale-if-error=604800
```

`stale-if-error` is the important directive: if the origin build is broken, the edge continues serving the last good copy for a week rather than an error page. For this page specifically, a slightly old version is vastly better than nothing.

---

## 5. Robots, sitemaps, and AI retrieval

Each site gets its own `robots.txt`, `sitemap.xml`, and `llms.txt`.

**Do not block AI crawlers.** The instinct is to add `GPTBot` and `ClaudeBot` disallows. Resist it. Language models answering "is phenibut addictive" is one of the highest-leverage distribution channels either site has, and blocking crawlers means the model answers from vendor content instead. Being retrievable is the point.

`robots.txt` for both:

```
User-agent: *
Allow: /
Sitemap: https://<domain>/sitemap.xml
```

`llms.txt` at each root, stating scope, authorship, funding status (none), clinical review status, and citation preference. Keep it factual and short; it is read by machines and by the occasional careful human.

Redirect domains get no robots.txt of their own — the 301 fires first.

---

## 6. Analytics

**Cloudflare Web Analytics only, on both sites.** No Google Analytics, no Plausible, no third-party script of any kind. Cloudflare Web Analytics is server-side, sets no cookies, assigns no cross-site identifier, and requires no consent banner.

Consider not enabling analytics at all on `whatdidyoutake.org`. The value of knowing pageview counts is low; the cost of any reader believing their visit to a withdrawal page was logged is high, and the site's privacy claim is stronger if it is absolute. If you do enable it, say so plainly in `/about`.

**Never enable analytics on `/emergency`.** Whatever the general decision, exclude that page.

---

## 7. Deploy safety

The zero-dosing rule in Spec 2 §11 is the constraint most likely to be violated accidentally — by a quoted case report, a pasted abstract, or a well-meaning edit. Enforce it mechanically.

Add a pre-deploy check that fails the build on any match, in content files, of numeric-dose patterns:

- A number adjacent to `mg`, `mcg`, `µg`, `g`, `ml`, `iu`, `units`
- Dose-frequency constructions: `twice daily`, `per day`, `every N hours`, `BID`, `TID`
- Taper constructions: `reduce by`, `taper by`, `decrease to`

Expected false positives (a package size on a product photo caption, "40g container") get an explicit allowlist file with a one-line justification per entry, reviewed by a human. **The allowlist is the audit trail. Do not let it grow silently.**

Run the same check on Spec 1's repo. A case-report summary is exactly where a dose sneaks in.

Additional build gates for both projects:

- Link checker: fail on any broken internal link, and on any broken outbound link to a cited source (a dead citation is a credibility failure)
- Fail if any page is missing `<link rel="canonical">`
- Fail if JSON-LD does not parse
- Fail on any page lacking a `last-reviewed` date in frontmatter

---

## 8. Ownership and continuity

This matters more than it looks, and it is the section people skip.

Both sites are load-bearing for people you will never meet. Right now they depend entirely on one person's Cloudflare account and one person's continued attention.

- **Enable two-factor on the Cloudflare account.** Store recovery codes somewhere your wife can reach.
- **Set all four domains to auto-renew.** A lapsed `phenibut.help` becomes a vendor's domain within days.
- **Domain lock on.** Registrar transfer lock enabled for all four.
- **Write down, on paper, where the repos are, where the account is, and what the sites are for.** If something happens to you, someone needs to be able to either maintain or gracefully retire these rather than let them go stale and wrong, or lapse and get bought.
- **Repos on GitHub, not only local.** Public is fine — there is nothing secret here, and public means someone else could pick them up.

---

## 9. Sequence

1. Both Pages projects created, custom domains bound, apex canonical, `www` 301ing
2. Universal SSL verified active on all four zones **before** any domain is shared with anyone
3. Redirect Rules live; test both redirect domains from a phone on cellular, not just desktop
4. `_headers` deployed on both; verify CSP does not break the Spec 1 contact form
5. Build gates in place, including the dosing grep, before any compound page is written
6. `robots.txt`, `sitemap.xml`, `llms.txt` on both
7. Cloudflare Access on preview deployments
8. Account security and continuity items in §8

Steps 1–4 are a single evening. Do not write compound content before step 5 exists — retrofitting the dosing check onto twelve finished pages means auditing twelve pages by hand.
