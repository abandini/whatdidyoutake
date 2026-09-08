#!/usr/bin/env node
// SPEC 3 §7 — fail on any broken internal link, and (with --outbound) on any
// broken link to a cited source. A dead citation is a credibility failure.
//
//   node scripts/gate-links.mjs             internal only (runs on every build)
//   node scripts/gate-links.mjs --outbound  also check every external URL

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import { SITE } from '../src/lib/site.js';

const OWN_ORIGIN = SITE.url.replace(/\/$/, '');
const ROOT = process.cwd();
const DIST = join(ROOT, 'dist');
const OUTBOUND = process.argv.includes('--outbound');
const CACHE_PATH = join(ROOT, '.link-cache.json');

function walk(dir, out = []) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
}

const all = walk(DIST);
const pages = all.filter((f) => extname(f) === '.html');
const served = new Set();
for (const f of all) {
  const r = '/' + relative(DIST, f).split('\\').join('/');
  served.add(r);
  // Register every path the file is actually reachable at, for both Astro
  // build formats: 'directory' (foo/index.html) and 'file' (foo.html).
  if (r.endsWith('/index.html')) {
    served.add(r.replace(/\/index\.html$/, ''));
    served.add(r.replace(/index\.html$/, ''));
  } else if (r.endsWith('.html')) {
    served.add(r.replace(/\.html$/, ''));
    served.add(r.replace(/\.html$/, '/'));
  }
}
served.add('/');

const broken = [];
const external = new Map();

for (const file of pages) {
  const from = relative(DIST, file);
  const html = readFileSync(file, 'utf8');
  const ids = new Set([...html.matchAll(/\bid=["']([^"']+)["']/g)].map((m) => m[1]));

  for (const m of html.matchAll(/\b(?:href|src)=["']([^"']+)["']/gi)) {
    const raw = m[1];
    if (/^(?:mailto:|tel:|sms:|data:|javascript:|#)/i.test(raw)) {
      if (raw.startsWith('#') && raw.length > 1 && !ids.has(raw.slice(1))) {
        broken.push(`${from} -> ${raw} (no such id on the page)`);
      }
      continue;
    }
    if (/^https?:\/\//i.test(raw)) {
      // Absolute URLs on our own origin (canonicals, JSON-LD urls) are internal
      // routes, not outbound links. Verify them against the build instead of
      // fetching a domain that may not be live yet.
      if (raw.startsWith(OWN_ORIGIN)) {
        const p = raw.slice(OWN_ORIGIN.length).split('#')[0] || '/';
        if (p !== '/' && !served.has(p) && !served.has(`${p}/index.html`) && !served.has(p.replace(/\/$/, ''))) {
          broken.push(`${from} -> ${raw} (same-origin URL with no matching page in the build)`);
        }
        continue;
      }
      if (!external.has(raw)) external.set(raw, []);
      external.get(raw).push(from);
      continue;
    }
    const [path] = raw.split('#');
    if (!path.startsWith('/')) { broken.push(`${from} -> ${raw} (relative link; use absolute paths)`); continue; }
    if (!served.has(path) && !served.has(`${path}/index.html`) && !served.has(path.replace(/\/$/, ''))) {
      broken.push(`${from} -> ${raw} (no such page in the build)`);
    }
  }
}

if (broken.length) {
  console.error(`\n✗ LINK GATE FAILED — ${broken.length} broken internal link(s):\n`);
  for (const b of broken) console.error(`  ✗ ${b}`);
  console.error('');
  process.exit(1);
}
console.log(`✓ link gate: ${pages.length} pages, 0 broken internal links, ${external.size} unique outbound URL(s)`);

if (!OUTBOUND) process.exit(0);

const cache = existsSync(CACHE_PATH) ? JSON.parse(readFileSync(CACHE_PATH, 'utf8')) : {};
const dead = [];
let n = 0;
for (const [url, from] of external) {
  n++;
  let status = cache[url];
  if (status === undefined) {
    try {
      let res = await fetch(url, { method: 'HEAD', redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 (compatible; whatdidyoutake.org link check)' } });
      // Plenty of publishers reject HEAD but serve GET fine.
      if (res.status === 405 || res.status === 403 || res.status === 501) {
        res = await fetch(url, { method: 'GET', redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 (compatible; whatdidyoutake.org link check)' } });
      }
      status = res.status;
    } catch (e) { status = `ERR ${e.message}`; }
    cache[url] = status;
    await new Promise((r) => setTimeout(r, 250));
  }
  const ok = typeof status === 'number' && status < 400;
  process.stdout.write(`\r  checking outbound ${n}/${external.size}   `);
  if (!ok) dead.push(`${url}\n      status: ${status}\n      linked from: ${[...new Set(from)].join(', ')}`);
}
process.stdout.write('\r');
const { writeFileSync } = await import('node:fs');
writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));

if (dead.length) {
  console.error(`\n✗ ${dead.length} dead outbound link(s):\n`);
  for (const d of dead) console.error(`  ✗ ${d}\n`);
  process.exit(1);
}
console.log(`✓ outbound: all ${external.size} external URLs resolve`);
