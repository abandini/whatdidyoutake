#!/usr/bin/env node
// Post-build gates over dist/. SPEC 2 §15, SPEC 3 §4/§7.
// Everything here is an acceptance criterion that can be checked mechanically,
// so it gets checked on every build rather than remembered.

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import { gzipSync } from 'node:zlib';

const ROOT = process.cwd();
const DIST = join(ROOT, 'dist');
const SITE = 'https://whatdidyoutake.org';

// SPEC 2 §14 — /emergency must render usably on 2G. Budgeted separately and
// measured, not asserted.
const EMERGENCY_BUDGET = { html: 24_000, criticalPathGzip: 14_000 };

if (!existsSync(DIST)) { console.error('✗ dist/ does not exist. Run astro build first.'); process.exit(1); }

const errors = [];
const warnings = [];
const fail = (f, m) => errors.push(`${f}: ${m}`);
const warn = (f, m) => warnings.push(`${f}: ${m}`);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const all = walk(DIST);
const pages = all.filter((f) => extname(f) === '.html');
if (!pages.length) { console.error('✗ no HTML in dist/'); process.exit(1); }

/** URL path a built file is served at, e.g. dist/emergency/index.html -> /emergency */
const routeOf = (f) => {
  const r = '/' + relative(DIST, f).split('\\').join('/');
  return r.replace(/\/index\.html$/, '').replace(/\.html$/, '') || '/';
};

// Anything that would make the browser talk to a host other than ours.
// Only <link rel> values that actually fetch something count. rel="canonical"
// points at our own absolute URL by design and is not a resource load.
const EXTERNAL_RESOURCE = /<(?:script|img|iframe|source|video|audio|embed|object|track)\b[^>]*?\b(?:src|data)\s*=\s*["'](https?:)?\/\/([^"'/]+)/gi;
const EXTERNAL_LINK_TAG = /<link\b[^>]*\brel=["'](stylesheet|preload|preconnect|prefetch|dns-prefetch|modulepreload|icon)["'][^>]*\bhref=["'](https?:)?\/\/([^"'/]+)/gi;
const OWN_HOST = new URL(SITE).host;
const AFFILIATE_HINT = /[?&](?:tag|ref|aff|affid|aff_id|a_aid|utm_source|utm_campaign|partner|clickid|subid)=/i;
// Commerce calls to action only. The bare word "affiliate" is NOT a hit — the
// footer's "No affiliate links" is the policy, and a gate that fires on a site
// stating its own policy trains you to ignore it. Actual affiliate links are
// caught by AFFILIATE_HINT against hrefs below, which is the real invariant.
const VENDOR_HINT = /\b(?:buy now|shop now|order here|use code|discount code|coupon code|where to buy|our recommended (?:source|vendor|supplier)|best place to (?:buy|get))\b/i;

for (const file of pages) {
  const f = relative(DIST, file);
  const route = routeOf(file);
  const html = readFileSync(file, 'utf8');
  const head = html.slice(0, html.indexOf('</head>') + 7);
  const body = html.slice(html.indexOf('<body'));

  // --- canonical (SPEC 3 §2, SPEC 3 §7) ---
  const isNoindex = /<meta\s+name=["']robots["']\s+content=["'][^"']*noindex/i.test(head);
  const canon = head.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i);
  if (!canon && !isNoindex) fail(f, 'missing <link rel="canonical">');
  else if (canon && isNoindex) fail(f, 'a noindex page must not carry a canonical URL');
  else if (canon) {
    const expected = route === '/' ? `${SITE}/` : `${SITE}${route}`;
    if (canon[1] !== expected) fail(f, `canonical is "${canon[1]}", expected "${expected}"`);
  }

  // --- referrer policy (SPEC 3 §3) ---
  if (!/<meta\s+name=["']referrer["']\s+content=["']strict-origin-when-cross-origin["']/i.test(head)) {
    fail(f, 'missing <meta name="referrer" content="strict-origin-when-cross-origin">');
  }

  // --- basic document quality ---
  if (!/<html[^>]+lang=/i.test(html)) fail(f, 'missing lang attribute on <html>');
  // Title and description are graded against what a search result actually
  // shows. Over-long ones are not penalised but they truncate, which wastes the
  // one line of persuasion the site gets in a result page.
  const titleTag = (head.match(/<title>([^<]*)<\/title>/i) || [])[1];
  if (!titleTag || titleTag.length < 10) fail(f, 'missing or trivial <title>');
  else if (titleTag.length > 65) fail(f, `<title> is ${titleTag.length} chars; it truncates in search results above ~65`);

  const metaDesc = (head.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i) || [])[1];
  if (!metaDesc || metaDesc.length < 70) fail(f, `meta description is ${metaDesc ? metaDesc.length : 0} chars; too short to earn the snippet`);
  else if (metaDesc.length > 165) fail(f, `meta description is ${metaDesc.length} chars; it truncates above ~165`);

  // og:url must agree with canonical or shares and search disagree about the page.
  const ogUrl = (head.match(/<meta\s+property=["']og:url["']\s+content=["']([^"']+)["']/i) || [])[1];
  if (canon && ogUrl && ogUrl !== canon[1]) fail(f, `og:url (${ogUrl}) does not match canonical (${canon[1]})`);

  // --- JSON-LD must parse (SPEC 3 §7) ---
  const ld = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const [, json] of ld) {
    try {
      const parsed = JSON.parse(json);
      if (!parsed['@context']) fail(f, 'JSON-LD block has no @context');
    } catch (e) { fail(f, `JSON-LD does not parse: ${e.message}`); }
  }

  // --- no third-party requests on load (SPEC 2 §14) ---
  for (const m of html.matchAll(EXTERNAL_RESOURCE)) {
    if (m[2] !== OWN_HOST) fail(f, `loads a third-party resource from ${m[2]} — the site makes no third-party requests`);
  }
  for (const m of html.matchAll(EXTERNAL_LINK_TAG)) {
    if (m[3] !== OWN_HOST) fail(f, `<link rel="${m[1]}"> fetches from ${m[3]} — the site makes no third-party requests`);
  }

  // --- zero affiliate / vendor surface (SPEC 2 §11.1, §11.3) ---
  for (const m of html.matchAll(/href=["'](https?:\/\/[^"']+)["']/gi)) {
    if (AFFILIATE_HINT.test(m[1])) fail(f, `outbound link carries a tracking/affiliate parameter: ${m[1]}`);
  }
  const vendorPhrase = body.replace(/<[^>]+>/g, ' ').match(VENDOR_HINT);
  if (vendorPhrase) fail(f, `contains vendor/commerce language: "${vendorPhrase[0]}"`);

  // --- no data collection anywhere (SPEC 2 §11.7) ---
  if (/<form\b/i.test(body)) fail(f, 'contains a <form>. The site captures nothing — no email, no accounts, no health data.');
  if (/<input\b(?![^>]*type=["'](?:search|checkbox|radio)["'])/i.test(body)) {
    fail(f, 'contains a non-search <input>. No data capture anywhere.');
  }

  // --- emergency link is the first interactive element (SPEC 2 §15) ---
  const firstInteractive = body.match(/<(?:a\b[^>]*href=|button\b|input\b|select\b|textarea\b|[a-z]+\b[^>]*tabindex=)[^>]*>/i);
  if (!firstInteractive) {
    fail(f, 'no interactive element found in <body> — every page needs the emergency link');
  } else if (!/href=["']\/emergency["']/i.test(firstInteractive[0])) {
    fail(f, `first interactive element is not the /emergency link. Found: ${firstInteractive[0].slice(0, 110)}`);
  }

  // --- unfilled placeholders (TKTK) block the deploy outright ---
  if (/\bTKTK\b/.test(html)) {
    const ctx = html.replace(/<[^>]+>/g, ' ').match(/.{0,70}\bTKTK\b.{0,70}/);
    fail(f, `contains an unfilled TKTK placeholder — someone has to supply this fact before it ships.\n      … ${ctx ? ctx[0].replace(/\s+/g, ' ').trim() : ''}`);
  }

  // --- WCAG 2.2 AA structural checks (SPEC 2 §14) ---
  // Contrast is verified numerically against the token palette; these are the
  // structural failures that creep in as pages are edited.
  const ids = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map((m) => m[1]);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dupes.length) fail(f, `duplicate id(s): ${[...new Set(dupes)].join(', ')}`);

  const h1s = [...body.matchAll(/<h1\b/gi)].length;
  if (h1s !== 1) fail(f, `${h1s} <h1> elements; there must be exactly one`);

  const levels = [...body.matchAll(/<h([1-6])\b/gi)].map((m) => Number(m[1]));
  for (let i = 1; i < levels.length; i++) {
    if (levels[i] > levels[i - 1] + 1) fail(f, `heading level jumps from h${levels[i - 1]} to h${levels[i]} — levels must not be skipped`);
  }

  for (const m of body.matchAll(/<img\b[^>]*>/gi)) {
    if (!/\balt=/i.test(m[0])) fail(f, `<img> without alt attribute: ${m[0].slice(0, 80)}`);
  }

  for (const m of body.matchAll(/<svg\b[^>]*>/gi)) {
    if (!/aria-hidden=["']true["']|role=["']img["']/i.test(m[0])) {
      fail(f, `<svg> is neither aria-hidden nor role="img": ${m[0].slice(0, 80)}`);
    }
  }

  for (const m of body.matchAll(/<table\b[\s\S]*?<\/table>/gi)) {
    if (!/<th\b/i.test(m[0])) fail(f, 'a <table> has no <th> header cells');
    for (const th of m[0].matchAll(/<th\b[^>]*>/gi)) {
      if (!/\bscope=/i.test(th[0])) fail(f, `<th> without scope attribute: ${th[0].slice(0, 70)}`);
    }
  }

  for (const m of body.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gi)) {
    const text = m[1].replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, ' ').trim();
    if (!text && !/aria-label=|aria-labelledby=/i.test(m[0])) {
      fail(f, `link with no accessible text: ${m[0].slice(0, 90)}`);
    }
  }

  if (/tabindex=["']\s*[1-9]/i.test(body)) fail(f, 'positive tabindex overrides natural focus order');

  // --- cross-site anchors need rel="noopener" (SPEC 3 §3) ---
  for (const m of body.matchAll(/<a\b[^>]*href=["']https?:\/\/[^"']+["'][^>]*>/gi)) {
    if (!/rel=["'][^"']*noopener/i.test(m[0])) fail(f, `outbound anchor without rel="noopener": ${m[0].slice(0, 110)}`);
  }
}

// --------------------------------------------------------- /emergency budget
// Resolve regardless of Astro's build.format ('file' vs 'directory').
const emergencyFile = [join(DIST, 'emergency.html'), join(DIST, 'emergency/index.html')].find(existsSync);
if (!emergencyFile) fail('/emergency', 'page was not built');
else {
  const html = readFileSync(emergencyFile, 'utf8');
  const bytes = Buffer.byteLength(html);
  if (bytes > EMERGENCY_BUDGET.html) fail('/emergency', `HTML is ${bytes} bytes, over the ${EMERGENCY_BUDGET.html}-byte 2G budget`);

  // SPEC 2 §7 — no images, no JS required.
  if (/<img\b|<picture\b|<svg[^>]*>\s*<image/i.test(html)) fail('/emergency', 'contains an image. The page is text only.');
  if (/<script\b(?![^>]*type=["']application\/ld\+json["'])/i.test(html)) fail('/emergency', 'contains executable script. The page must work with JS disabled and load nothing extra.');

  // Critical path = the HTML plus every stylesheet it blocks on.
  let critical = gzipSync(Buffer.from(html)).length;
  for (const m of html.matchAll(/<link\b[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["']/gi)) {
    const p = join(DIST, m[1].replace(/^\//, ''));
    if (existsSync(p)) critical += gzipSync(readFileSync(p)).length;
    else fail('/emergency', `stylesheet ${m[1]} is missing from the build`);
  }
  if (critical > EMERGENCY_BUDGET.criticalPathGzip) {
    fail('/emergency', `critical path is ${critical} bytes gzipped, over the ${EMERGENCY_BUDGET.criticalPathGzip}-byte budget`);
  } else {
    console.log(`  · /emergency critical path: ${critical} bytes gzipped (budget ${EMERGENCY_BUDGET.criticalPathGzip})`);
  }

  // SPEC 2 §7 — the numbers that make the page worth existing.
  for (const needle of ['1-800-222-1222', '988', '911']) {
    if (!html.includes(needle)) fail('/emergency', `does not contain ${needle}`);
  }
}

// --------------------------------------------------------- required artefacts
for (const required of ['robots.txt', 'sitemap.xml', 'llms.txt', '_headers']) {
  if (!existsSync(join(DIST, required))) fail('(build)', `dist/${required} is missing`);
}

for (const w of warnings) console.warn(`  ! ${w}`);
if (errors.length) {
  console.error(`\n✗ HTML GATE FAILED — ${errors.length} problem(s):\n`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  console.error('');
  process.exit(1);
}
console.log(`✓ html gate: ${pages.length} pages clean`);
