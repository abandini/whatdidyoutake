#!/usr/bin/env node
// Every PMID and DOI on the site is resolved against PubMed / Crossref and the
// returned title is compared with the citation we printed. A citation that
// points at a real-but-different paper is worse than a dead link: it reads as
// authoritative and is wrong. This is the check that makes the bibliography
// trustworthy rather than merely well-formatted.
//
//   node scripts/verify-citations.mjs            verify all, using cache
//   node scripts/verify-citations.mjs --refresh  ignore cache
//   node scripts/verify-citations.mjs --strict   exit non-zero on title mismatch too

import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';

const ROOT = process.cwd();
const REFRESH = process.argv.includes('--refresh');
const STRICT = process.argv.includes('--strict');
const CACHE_PATH = join(ROOT, '.citation-cache.json');
const CONTENT_DIRS = ['src/content/compounds', 'src/content/stopping'];

const cache = !REFRESH && existsSync(CACHE_PATH) ? JSON.parse(readFileSync(CACHE_PATH, 'utf8')) : {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Collect every unique source across all content, remembering where it came from. */
const sources = new Map();
for (const dir of CONTENT_DIRS) {
  const abs = join(ROOT, dir);
  if (!existsSync(abs)) continue;
  for (const f of readdirSync(abs).filter((x) => x.endsWith('.md') && !x.startsWith('_'))) {
    const raw = readFileSync(join(abs, f), 'utf8');
    const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!m) continue;
    const data = parseYaml(m[1]) ?? {};
    for (const s of data.sources ?? []) {
      const key = s.pmid ? `pmid:${s.pmid}` : s.doi ? `doi:${s.doi.toLowerCase()}` : `url:${s.url}`;
      if (!sources.has(key)) sources.set(key, { ...s, key, where: [] });
      sources.get(key).where.push(`${f}#${s.id}`);
    }
  }
}

const normalise = (s) =>
  (s ?? '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

/** Fraction of the fetched title's content words that appear in our citation string. */
function titleOverlap(fetchedTitle, ourCitation) {
  const stop = new Set(['the','a','an','of','and','in','on','for','to','with','by','from','at','is','are','as','after','during','study','trial']);
  const t = normalise(fetchedTitle).split(' ').filter((w) => w.length > 2 && !stop.has(w));
  if (!t.length) return 0;
  const c = new Set(normalise(ourCitation).split(' '));
  return t.filter((w) => c.has(w)).length / t.length;
}

async function fetchPubmed(pmid) {
  const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${pmid}&retmode=json`;
  const res = await fetch(url, { headers: { 'User-Agent': 'whatdidyoutake.org citation verifier' } });
  if (!res.ok) return { ok: false, reason: `PubMed HTTP ${res.status}` };
  const j = await res.json();
  const rec = j?.result?.[pmid];
  if (!rec || rec.error) return { ok: false, reason: 'PMID not found in PubMed' };
  return { ok: true, title: rec.title, year: parseInt(String(rec.pubdate).slice(0, 4), 10), journal: rec.fulljournalname || rec.source };
}

async function fetchCrossref(doi) {
  const res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, {
    headers: { 'User-Agent': 'whatdidyoutake.org citation verifier (mailto:corrections@whatdidyoutake.org)' },
  });
  if (res.status === 404) return { ok: false, reason: 'DOI not registered at Crossref' };
  if (!res.ok) return { ok: false, reason: `Crossref HTTP ${res.status}` };
  const j = await res.json();
  const w = j?.message;
  if (!w) return { ok: false, reason: 'no Crossref record' };
  const year = w.issued?.['date-parts']?.[0]?.[0];
  return { ok: true, title: (w.title ?? [])[0], year, journal: (w['container-title'] ?? [])[0] };
}

async function fetchUrl(url) {
  try {
    const res = await fetch(url, { method: 'GET', redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 (compatible; whatdidyoutake.org link check)' } });
    return res.ok ? { ok: true, title: null } : { ok: false, reason: `HTTP ${res.status}` };
  } catch (e) { return { ok: false, reason: e.message }; }
}

const dead = [];
const mismatched = [];
const yearOff = [];
let checked = 0;

for (const s of sources.values()) {
  let result = cache[s.key];
  if (!result) {
    if (s.pmid) result = await fetchPubmed(s.pmid);
    else if (s.doi) result = await fetchCrossref(s.doi);
    else result = await fetchUrl(s.url);
    cache[s.key] = result;
    await sleep(360); // NCBI: stay under 3 req/s without an API key
  }
  checked++;
  const where = s.where.join(', ');
  if (!result.ok) { dead.push(`${s.key}  (${where})\n      ${result.reason}\n      cited as: ${s.citation}`); continue; }
  if (result.title) {
    const overlap = titleOverlap(result.title, s.citation);
    if (overlap < 0.5) {
      mismatched.push(`${s.key}  (${where})\n      we say:   ${s.citation}\n      actually: ${result.title}${result.journal ? ` — ${result.journal}` : ''} (${result.year})\n      title overlap: ${(overlap * 100).toFixed(0)}%`);
    }
  }
  if (result.year && s.year && Math.abs(result.year - s.year) > 1) {
    yearOff.push(`${s.key}  (${where}): frontmatter says ${s.year}, record says ${result.year}`);
  }
}

mkdirSync(join(ROOT, '.'), { recursive: true });
writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));

console.log(`\nVerified ${checked} unique citation(s).`);
if (yearOff.length) { console.warn(`\n  ! ${yearOff.length} year mismatch(es):`); for (const y of yearOff) console.warn(`    ${y}`); }
if (mismatched.length) {
  console.error(`\n  ✗ ${mismatched.length} citation(s) resolve to a DIFFERENT paper than we describe:\n`);
  for (const m of mismatched) console.error(`    ${m}\n`);
}
if (dead.length) {
  console.error(`\n  ✗ ${dead.length} citation(s) do not resolve:\n`);
  for (const d of dead) console.error(`    ${d}\n`);
}
if (dead.length || (STRICT && mismatched.length)) {
  console.error('A dead or wrong citation is a credibility failure (SPEC 3 §7).\n');
  process.exit(1);
}
if (!dead.length && !mismatched.length) console.log('✓ all citations resolve and match their descriptions\n');
