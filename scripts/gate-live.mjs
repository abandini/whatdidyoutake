#!/usr/bin/env node
// Post-deploy gate: checks what the edge actually SERVES, not what the build
// produced. These are different, and the difference is not theoretical —
// Cloudflare injects a Web Analytics beacon into HTML responses when a zone has
// automatic setup enabled, which no amount of scanning dist/ can detect.
//
//   node scripts/gate-live.mjs                 check production
//   node scripts/gate-live.mjs <base-url>      check a preview deployment

import { readFileSync, existsSync } from 'node:fs';

const BASE = (process.argv[2] || 'https://whatdidyoutake.org').replace(/\/$/, '');
const IS_PROD = BASE === 'https://whatdidyoutake.org';

const errors = [];
const warnings = [];
const fail = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

const PAGES = existsSync('dist/sitemap.xml')
  ? [...readFileSync('dist/sitemap.xml', 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)]
      .map((m) => m[1].replace('https://whatdidyoutake.org', ''))
  : ['/', '/emergency', '/compounds/phenibut', '/stopping/phenibut', '/family', '/about'];

const OWN_HOST = new URL(BASE).host;

// Cloudflare only injects its Web Analytics beacon for requests that look like
// a real browser. A bare fetch() is not served the same HTML a reader gets, so
// checking with default headers would have silently passed the exact problem
// this gate exists to catch.
const BROWSER = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

// Anything in the served HTML that would make a browser talk to another host.
const THIRD_PARTY = /<(?:script|link|img|iframe|source|video|audio|embed|object)\b[^>]*?\b(?:src|href)\s*=\s*["'](?:https?:)?\/\/([^"'/]+)/gi;
const LINK_REL_FETCHES = /\brel=["'](?:stylesheet|preload|preconnect|prefetch|dns-prefetch|modulepreload)["']/i;

console.log(`Checking live site: ${BASE}\n`);

for (const path of PAGES) {
  const url = BASE + (path === '/' ? '/' : path);
  let res;
  try { res = await fetch(url, { redirect: 'manual', cache: 'no-store', headers: BROWSER }); }
  catch (e) { fail(`${path}: request failed — ${e.message}`); continue; }

  // A canonical URL must serve directly. A 3xx here means the canonical and the
  // served URL disagree, which wastes crawl budget and adds a hop for a reader
  // on a bad connection.
  if (res.status >= 300 && res.status < 400) {
    fail(`${path}: serves ${res.status} -> ${res.headers.get('location')} (canonical URLs must not redirect)`);
    continue;
  }
  if (!res.ok) { fail(`${path}: HTTP ${res.status}`); continue; }

  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('html')) continue;
  const html = await res.text();

  for (const m of html.matchAll(THIRD_PARTY)) {
    const host = m[1];
    const isFetchingLink = m[0].startsWith('<link') ? LINK_REL_FETCHES.test(m[0]) : true;
    if (host !== OWN_HOST && isFetchingLink) {
      fail(`${path}: the EDGE is serving a third-party resource from ${host} that is not in the build — ${m[0].slice(0, 90)}`);
    }
  }

  // The specific case that prompted this gate.
  if (/cloudflareinsights|beacon\.min\.js|googletagmanager|google-analytics/i.test(html)) {
    fail(`${path}: an analytics beacon is being injected at the edge. /about promises there is none — disable Web Analytics for this zone.`);
  }

  if (!/<meta name="referrer" content="strict-origin-when-cross-origin">/i.test(html)) {
    warn(`${path}: referrer meta missing from served HTML`);
  }
}

// --- headers, checked once on the page that matters most ---
const em = await fetch(`${BASE}/emergency`, { redirect: 'follow', cache: 'no-store', headers: BROWSER });
const H = (n) => em.headers.get(n) || '';

for (const [name, want] of [
  ['content-security-policy', "script-src 'self'"],
  ['strict-transport-security', 'max-age=31536000'],
  ['x-content-type-options', 'nosniff'],
  ['referrer-policy', 'strict-origin-when-cross-origin'],
]) {
  if (!H(name).includes(want)) fail(`/emergency: header ${name} missing or unexpected (got ${JSON.stringify(H(name))})`);
}

// SPEC 3 §4 — if a build breaks, the edge must keep serving the last good copy
// of this page for a week rather than an error.
if (!H('cache-control').includes('stale-if-error')) {
  fail(`/emergency: cache-control lacks stale-if-error (got ${JSON.stringify(H('cache-control'))})`);
}

// ...and the header only means something if the page is actually stored at the
// edge. Cloudflare does not cache HTML on the strength of an origin header, so
// this was DYNAMIC — the directive above was decorative, which is worse than
// absent because it reads as a guarantee. Needs a cache rule; see
// scripts/create-cache-rules.mjs.
const cacheStatus = H('cf-cache-status');
if (cacheStatus && /^(DYNAMIC|BYPASS|NONE)/i.test(cacheStatus)) {
  fail(`/emergency: cf-cache-status is ${cacheStatus}, so nothing is stored at the edge and stale-if-error cannot fire. Run scripts/create-cache-rules.mjs.`);
}

// --- redirect domains (production only) ---
if (IS_PROD) {
  const REDIRECTS = [
    ['https://phenibutwithdrawal.org', 'https://whatdidyoutake.org/stopping/phenibut'],
    ['https://www.phenibutwithdrawal.org', 'https://whatdidyoutake.org/stopping/phenibut'],
    ['https://phenibut.help', 'https://whatdidyoutake.org/emergency'],
    ['https://www.phenibut.help', 'https://whatdidyoutake.org/emergency'],
    ['https://www.whatdidyoutake.org/emergency', 'https://whatdidyoutake.org/emergency'],
  ];
  for (const [from, want] of REDIRECTS) {
    try {
      const r = await fetch(from, { redirect: 'manual' });
      if (r.status !== 301) fail(`${from}: expected 301, got ${r.status}`);
      else if (r.headers.get('location') !== want) fail(`${from}: redirects to ${r.headers.get('location')}, expected ${want}`);
    } catch (e) { fail(`${from}: ${e.message}`); }
  }

  for (const f of ['/robots.txt', '/sitemap.xml', '/llms.txt', '/favicon.svg']) {
    const r = await fetch(BASE + f);
    if (!r.ok) fail(`${f}: HTTP ${r.status}`);
  }
}

for (const w of warnings) console.warn(`  ! ${w}`);
if (errors.length) {
  console.error(`\n✗ LIVE GATE FAILED — ${errors.length} problem(s):\n`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  console.error('');
  process.exit(1);
}
console.log(`✓ live gate: ${PAGES.length} pages served clean, headers and redirects correct`);
