#!/usr/bin/env node
// SPEC 3 §2 — enforces the redirect rules for all four domains.
//
// This is a RECONCILER, not a seeder. It asserts the intended end state and
// repairs anything that differs, because "create if absent" is what let these
// rules drift: they were later edited in place, keeping their descriptions, so a
// presence check saw nothing wrong while both domains pointed somewhere else.
//
// Rules not managed here are left untouched.
// Requires a token with Zone · Dynamic URL Redirects · Edit.
//
//   node scripts/create-redirects.mjs            apply
//   node scripts/create-redirects.mjs --dry-run   report differences only

const T = process.env.CLOUDFLARE_API_TOKEN;
const DRY = process.argv.includes('--dry-run');
if (!T) { console.error('CLOUDFLARE_API_TOKEN is not set'); process.exit(2); }

const api = async (path, opts = {}) => {
  const r = await fetch('https://api.cloudflare.com/client/v4' + path, {
    ...opts,
    headers: { Authorization: `Bearer ${T}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
  const t = await r.text();
  try { return JSON.parse(t); } catch { return { success: false, errors: [{ message: t.slice(0, 200) }] }; }
};

const SITE = 'https://whatdidyoutake.org';

// The intended state. `dynamic` means the target is an expression rather than a
// literal, so the path can be carried across.
const INTENDED = [
  {
    zone: 'whatdidyoutake.org', id: 'ce1fa3375693bfa2d5989ce17be97cca',
    description: 'www to apex',
    expression: '(http.host eq "www.whatdidyoutake.org")',
    target: `concat("${SITE}", http.request.uri.path)`, dynamic: true,
  },
  {
    zone: 'phenibutwithdrawal.org', id: 'dd5bbdb53a1866c5e93a7dfd77018256',
    description: 'deep-link to stopping page',
    expression: '(http.host eq "phenibutwithdrawal.org") or (http.host eq "www.phenibutwithdrawal.org")',
    // The query is about stopping. Answer it immediately — do NOT send someone
    // in withdrawal to the research dossier, which per SPEC 1 §1 is explicitly
    // not written for them.
    target: `${SITE}/stopping/phenibut`, dynamic: false,
  },
  {
    zone: 'phenibut.help', id: 'cfd50a788f5aa5caef87b14875d7e5f1',
    description: 'deep-link to emergency page',
    expression: '(http.host eq "phenibut.help") or (http.host eq "www.phenibut.help")',
    // The word is "help". Assume the worst case.
    target: `${SITE}/emergency`, dynamic: false,
  },
];

const PHASE = 'http_request_dynamic_redirect';
let changed = 0, ok = 0, failed = 0;

for (const want of INTENDED) {
  const path = `/zones/${want.id}/rulesets/phases/${PHASE}/entrypoint`;
  const current = await api(path);
  const rules = (current.success && current.result.rules) || [];

  const desired = {
    action: 'redirect',
    description: want.description,
    expression: want.expression,
    enabled: true,
    action_parameters: {
      from_value: {
        status_code: 301,                // SPEC 3 §2: permanent, consolidates link equity
        target_url: want.dynamic ? { expression: want.target } : { value: want.target },
        preserve_query_string: false,    // nothing useful arrives this way
      },
    },
  };

  const idx = rules.findIndex((r) => r.description === want.description);
  const existing = idx === -1 ? null : rules[idx];
  const fv = existing ? (existing.action_parameters?.from_value ?? {}) : null;
  const actualTarget = fv ? (fv.target_url?.value ?? fv.target_url?.expression) : null;

  const drift = [];
  if (!existing) drift.push('rule missing');
  else {
    if (fv.status_code !== 301) drift.push(`status ${fv.status_code} -> 301`);
    if (actualTarget !== want.target) drift.push(`target ${actualTarget} -> ${want.target}`);
    if (existing.expression !== want.expression) drift.push('expression differs');
    if (existing.enabled === false) drift.push('disabled -> enabled');
  }

  if (!drift.length) { console.log(`✓ ${want.zone}: already correct`); ok++; continue; }

  console.log(`${DRY ? '~' : '→'} ${want.zone}: ${drift.join('; ')}`);
  if (DRY) { changed++; continue; }

  // Replace ours in place, preserve every rule we do not manage.
  const next = idx === -1 ? [...rules, desired] : rules.map((r, i) => (i === idx ? desired : r));
  const res = await api(path, { method: 'PUT', body: JSON.stringify({ rules: next }) });
  if (res.success) { console.log(`  ✓ ${want.zone} updated`); changed++; }
  else { console.error(`  ✗ ${want.zone}: ${JSON.stringify(res.errors)}`); failed++; }
}

console.log(`\n${ok} already correct, ${changed} ${DRY ? 'would change' : 'changed'}, ${failed} failed`);
process.exit(failed ? 1 : 0);
