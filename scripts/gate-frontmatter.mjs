#!/usr/bin/env node
// Editorial gates over content source. Runs before `astro build`, so a
// structural mistake fails fast with a readable message rather than a Zod dump.
//
// Enforces: the fixed ten-section order (SPEC 2 §6), citation integrity,
// review metadata (SPEC 2 §11.4 / SPEC 3 §7), and that all five bands are
// genuinely used across the corpus (SPEC 2 §4).

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { BAND_KEYS, DIMENSION_KEYS, BANDS } from '../src/lib/rating-system.js';
import { AUTHORED_HEADINGS } from '../src/lib/page-structure.js';

const ROOT = process.cwd();
const COMPOUND_DIR = join(ROOT, 'src/content/compounds');
const STOPPING_DIR = join(ROOT, 'src/content/stopping');
const REVIEWER_DIR = join(ROOT, 'src/content/reviewers');
const LAUNCH_SCOPE = 12; // SPEC 2 §13. Do not expand until all twelve are complete.

const errors = [];
const warnings = [];
const fail = (file, msg) => errors.push(`${file}: ${msg}`);
const warn = (file, msg) => warnings.push(`${file}: ${msg}`);

function readEntries(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md') && !f.startsWith('_'))
    .map((f) => {
      const raw = readFileSync(join(dir, f), 'utf8');
      const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
      if (!m) { fail(f, 'no YAML frontmatter block'); return null; }
      let data;
      try { data = parseYaml(m[1]); }
      catch (e) { fail(f, `frontmatter is not valid YAML: ${e.message}`); return null; }
      return { file: f, slug: f.replace(/\.md$/, ''), data: data ?? {}, body: m[2] };
    })
    .filter(Boolean);
}

const reviewerSlugs = new Set(readEntries(REVIEWER_DIR).map((r) => r.slug));
const compounds = readEntries(COMPOUND_DIR);
const stopping = readEntries(STOPPING_DIR);

// ---------------------------------------------------------------- compounds
for (const { file, slug, data, body } of compounds) {
  // --- the six authored headings, exact text, exact order, nothing extra ---
  const h2s = [...body.matchAll(/^##\s+(.+?)\s*$/gm)].map((m) => m[1].trim());
  const expected = AUTHORED_HEADINGS;
  if (h2s.length !== expected.length || h2s.some((h, i) => h !== expected[i])) {
    fail(file, 'section headings do not match the fixed template (SPEC 2 §6).');
    errors.push(`    expected, in order:\n${expected.map((h, i) => `      ${i + 1}. ## ${h}`).join('\n')}`);
    errors.push(`    found:\n${h2s.length ? h2s.map((h, i) => `      ${i + 1}. ## ${h}`).join('\n') : '      (none)'}`);
  }

  // --- band ---
  if (!BAND_KEYS.includes(data.band)) fail(file, `band "${data.band}" is not one of: ${BAND_KEYS.join(', ')}`);

  // --- ratings: all six dimensions, in range, each justified and cited ---
  const sourceIds = new Set((data.sources ?? []).map((s) => s.id));
  for (const key of DIMENSION_KEYS) {
    const r = data.ratings?.[key];
    if (!r) { fail(file, `missing rating dimension "${key}"`); continue; }
    if (!Number.isInteger(r.score) || r.score < 1 || r.score > 5) fail(file, `ratings.${key}.score must be an integer 1–5, got ${JSON.stringify(r.score)}`);
    if (!r.note || r.note.trim().length < 20) fail(file, `ratings.${key}.note must be a real one-line justification`);
    for (const ref of r.refs ?? []) {
      if (!sourceIds.has(ref)) fail(file, `ratings.${key}.refs points at unknown source id "${ref}"`);
    }
  }

  // --- sources: every citation needs a stable identifier (SPEC 2 §6.9) ---
  const seen = new Set();
  for (const s of data.sources ?? []) {
    if (seen.has(s.id)) fail(file, `duplicate source id "${s.id}"`);
    seen.add(s.id);
    if (!s.pmid && !s.doi && !s.url) fail(file, `source "${s.id}" has no PMID, DOI, or URL`);
  }
  // Every source must actually be cited somewhere, or it is decoration.
  for (const s of data.sources ?? []) {
    const citedInRating = DIMENSION_KEYS.some((k) => (data.ratings?.[k]?.refs ?? []).includes(s.id));
    const citedInBody = body.includes(`[^${s.id}]`) || body.includes(`{{${s.id}}}`);
    if (!citedInRating && !citedInBody) warn(file, `source "${s.id}" is listed but never cited in a rating or the body`);
  }

  // --- review metadata (SPEC 2 §11.4) ---
  if (!data.lastReviewed) fail(file, 'missing lastReviewed date');
  else {
    const d = new Date(data.lastReviewed);
    if (Number.isNaN(+d)) fail(file, `lastReviewed "${data.lastReviewed}" is not a date`);
    else {
      const months = (Date.now() - +d) / (1000 * 60 * 60 * 24 * 30.44);
      if (months > 12) fail(file, `lastReviewed is ${months.toFixed(0)} months old. A stale medical page is worse than no page (SPEC 2 §16).`);
      else if (months > 4) warn(file, `lastReviewed is ${months.toFixed(0)} months old; quarterly review is due.`);
    }
  }
  if (data.reviewedBy && !reviewerSlugs.has(data.reviewedBy)) fail(file, `reviewedBy "${data.reviewedBy}" is not a reviewer in src/content/reviewers/`);

  if (typeof data.hasCharacteristicFailureMode !== 'boolean') fail(file, 'hasCharacteristicFailureMode must be true or false — SPEC 2 §6.1 requires saying so explicitly when there is no characteristic failure mode');

  // --- SPEC 2 §6.1: section 6 is prose, not a bullet list ---
  const insideIdx = body.indexOf(`## ${AUTHORED_HEADINGS[3]}`);
  if (insideIdx !== -1) {
    const next = body.indexOf('\n## ', insideIdx + 1);
    const section = body.slice(insideIdx, next === -1 ? undefined : next);
    const bulletLines = (section.match(/^\s*[-*+]\s+/gm) ?? []).length;
    const proseChars = section.replace(/^##.*$/m, '').trim().length;
    if (data.hasCharacteristicFailureMode) {
      if (bulletLines > 0) fail(file, '"What going wrong looks like from the inside" contains a bullet list. SPEC 2 §6.1 requires prose — bullets are precisely the format that does not help.');
      if (proseChars < 400) fail(file, `"What going wrong looks like from the inside" is only ${proseChars} characters. This is the section that differentiates the site; write it properly.`);
    }
  }

  if (data.stoppingPage && !existsSync(join(STOPPING_DIR, `${slug}.md`))) {
    fail(file, `stoppingPage is set but src/content/stopping/${slug}.md does not exist`);
  }
}

// ---------------------------------------------------------------- corpus-wide
if (compounds.length) {
  const used = new Set(compounds.map((c) => c.data.band));
  const unused = BANDS.filter((b) => !used.has(b.key));
  if (compounds.length >= LAUNCH_SCOPE && unused.length) {
    fail('(corpus)', `SPEC 2 §4: every band must actually be used at launch. Unused: ${unused.map((b) => b.key).join(', ')}. A site where everything is red is a site nobody believes.`);
  }
  if (compounds.length > LAUNCH_SCOPE) {
    fail('(corpus)', `${compounds.length} compounds. SPEC 2 §13 caps launch at ${LAUNCH_SCOPE}; do not expand until all twelve are complete and reviewed.`);
  }
  if (compounds.length < LAUNCH_SCOPE) {
    warn('(corpus)', `${compounds.length}/${LAUNCH_SCOPE} compounds written.`);
  }
}

// ---------------------------------------------------------------- stopping
for (const { file, data } of stopping) {
  if (!data.compound) fail(file, 'missing compound reference');
  else if (!existsSync(join(COMPOUND_DIR, `${data.compound}.md`))) fail(file, `compound "${data.compound}" has no compound page`);
  if (!data.lastReviewed) fail(file, 'missing lastReviewed date');
  if (data.reviewedBy && !reviewerSlugs.has(data.reviewedBy)) fail(file, `reviewedBy "${data.reviewedBy}" is not a known reviewer`);
}

// ---------------------------------------------------------------- report
for (const w of warnings) console.warn(`  ! ${w}`);
if (errors.length) {
  console.error(`\n✗ CONTENT GATE FAILED — ${errors.filter((e) => !e.startsWith('    ')).length} problem(s):\n`);
  for (const e of errors) console.error(e.startsWith('    ') ? e : `  ✗ ${e}`);
  console.error('');
  process.exit(1);
}
console.log(`✓ content gate: ${compounds.length} compound(s), ${stopping.length} stopping page(s), ${reviewerSlugs.size} reviewer(s)`);
