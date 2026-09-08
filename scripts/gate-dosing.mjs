#!/usr/bin/env node
// SPEC 2 §11.2 / SPEC 3 §7 — the zero-dosing rule, enforced mechanically.
// Fails the build on any numeric-dose pattern in content that is not explicitly
// allowlisted with a human-written justification.
//
//   node scripts/gate-dosing.mjs           scan source content
//   node scripts/gate-dosing.mjs --dist    scan built HTML (text nodes only)

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, extname, relative } from 'node:path';
import { PATTERNS, SCAN_EXTENSIONS } from './lib/patterns.mjs';

const ROOT = process.cwd();
const DIST_MODE = process.argv.includes('--dist');
const SOURCE_DIRS = ['src', 'public'];
const IGNORE = new Set(['node_modules', 'dist', '.git', '.astro', 'scripts']);

const ALLOWLIST_PATH = join(ROOT, 'scripts/dosing-allowlist.json');
const allowlist = existsSync(ALLOWLIST_PATH)
  ? JSON.parse(readFileSync(ALLOWLIST_PATH, 'utf8')).entries ?? []
  : [];

for (const [i, e] of allowlist.entries()) {
  for (const field of ['file', 'match', 'context', 'reason', 'added', 'reviewedBy']) {
    if (!e[field] || String(e[field]).trim() === '') {
      console.error(`Allowlist entry #${i} is missing "${field}". Every exemption needs a written justification — that is the audit trail.`);
      process.exit(2);
    }
  }
}

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (IGNORE.has(name) || name.startsWith('.')) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (SCAN_EXTENSIONS.has(extname(name))) out.push(p);
  }
  return out;
}

// Strip tags/scripts/styles so we scan what a reader actually sees, not markup.
function visibleText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d))
    .replace(/&nbsp;/g, ' ');
}

const files = DIST_MODE
  ? walk(join(ROOT, 'dist')).filter((f) => extname(f) === '.html' || extname(f) === '.txt')
  : SOURCE_DIRS.flatMap((d) => walk(join(ROOT, d)));

const violations = [];
const usedAllowlist = new Set();

for (const file of files) {
  const rel = relative(ROOT, file);
  const raw = readFileSync(file, 'utf8');
  // In dist mode we compare against visible text but still report source lines.
  const lines = (DIST_MODE ? visibleText(raw) : raw).split('\n');

  lines.forEach((line, idx) => {
    // Content authors mark a deliberate, reviewed exemption inline; it still
    // has to appear in the allowlist file to pass.
    for (const pat of PATTERNS) {
      const re = new RegExp(pat.re.source, pat.caseSensitive ? 'g' : 'gi');
      let m;
      while ((m = re.exec(line)) !== null) {
        const matched = m[0];
        const hit = allowlist.findIndex(
          (a) => a.file === rel && a.match === matched && line.includes(a.context)
        );
        if (hit !== -1) { usedAllowlist.add(hit); continue; }
        violations.push({ file: rel, line: idx + 1, pattern: pat.id, why: pat.why, matched, context: line.trim().slice(0, 160) });
      }
    }
  });
}

const scope = DIST_MODE ? 'built HTML' : 'source content';
if (violations.length) {
  console.error(`\n✗ DOSING GATE FAILED — ${violations.length} match(es) in ${scope}.\n`);
  console.error('  The site publishes no dosing information anywhere (SPEC 2 §11.2).');
  console.error('  Rewrite the sentence, or add a justified entry to scripts/dosing-allowlist.json.\n');
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}  [${v.pattern}]  matched: ${JSON.stringify(v.matched)}`);
    console.error(`      ${v.why}`);
    console.error(`      … ${v.context}\n`);
  }
  process.exit(1);
}

const stale = allowlist.map((a, i) => [a, i]).filter(([, i]) => !usedAllowlist.has(i));
if (!DIST_MODE && stale.length) {
  console.error(`\n✗ DOSING GATE FAILED — ${stale.length} stale allowlist entr(ies).`);
  console.error('  The allowlist is the audit trail; it does not get to grow silently.');
  console.error('  These no longer match anything and must be deleted:\n');
  for (const [a] of stale) console.error(`  ${a.file} :: ${JSON.stringify(a.match)} (added ${a.added})`);
  console.error('');
  process.exit(1);
}

console.log(`✓ dosing gate: ${files.length} ${scope} files clean, ${allowlist.length} allowlisted exemption(s)`);
