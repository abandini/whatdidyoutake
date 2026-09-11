#!/usr/bin/env node
// SPEC 3 §4 — makes /emergency's declared cache policy actually take effect.
//
// The problem this fixes: `_headers` sets
//   Cache-Control: public, max-age=300, stale-while-revalidate=86400, stale-if-error=604800
// and the spec is explicit that stale-if-error is "the important directive: if
// the origin build is broken, the edge continues serving the last good copy for
// a week rather than an error page."
//
// It was doing nothing. Cloudflare does not cache HTML on the strength of an
// origin Cache-Control header — by default it caches only static extensions, so
// /emergency returned `cf-cache-status: DYNAMIC` on every request and there was
// never a stored copy to serve stale. Observed alongside two real 504s on that
// page. A cache rule is required to make the header mean anything.
//
// Requires a token with Zone · Cache Settings · Edit.
//   node scripts/create-cache-rules.mjs [--dry-run]

const T = process.env.CLOUDFLARE_API_TOKEN;
const DRY = process.argv.includes('--dry-run');
if (!T) { console.error('CLOUDFLARE_API_TOKEN is not set'); process.exit(2); }

const ZONE = { name: 'whatdidyoutake.org', id: 'ce1fa3375693bfa2d5989ce17be97cca' };
const PHASE = 'http_request_cache_settings';
const DESCRIPTION = 'cache /emergency at the edge so stale-if-error works';

// Only the crisis page. Caching HTML means a deploy takes up to max-age to
// propagate, which is a real cost — worth paying where "slightly old beats
// nothing" is true, and not worth paying site-wide.
const EXPRESSION = '(http.request.uri.path eq "/emergency")';

const api = async (path, opts = {}) => {
  const r = await fetch('https://api.cloudflare.com/client/v4' + path, {
    ...opts,
    headers: { Authorization: `Bearer ${T}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
  const t = await r.text();
  try { return { status: r.status, body: JSON.parse(t) }; }
  catch { return { status: r.status, body: { success: false, errors: [{ message: t.slice(0, 200) }] } }; }
};

const desired = {
  action: 'set_cache_settings',
  description: DESCRIPTION,
  expression: EXPRESSION,
  enabled: true,
  action_parameters: {
    cache: true,
    // respect_origin keeps _headers as the single source of truth for TTL, so
    // the policy lives in the repository rather than half here and half there.
    edge_ttl: { mode: 'respect_origin' },
    browser_ttl: { mode: 'respect_origin' },
  },
};

const path = `/zones/${ZONE.id}/rulesets/phases/${PHASE}/entrypoint`;
const { status, body: current } = await api(path);

if (status === 403) {
  console.error(`✗ not authorized on ${ZONE.name}.`);
  console.error('  Add to the token: Zone · Cache Settings · Edit  (API group "Cache Settings Write")');
  process.exit(1);
}

const rules = (current.success && current.result?.rules) || [];
const idx = rules.findIndex((r) => r.description === DESCRIPTION);
const existing = idx === -1 ? null : rules[idx];

const same = existing
  && existing.expression === EXPRESSION
  && existing.enabled !== false
  && existing.action_parameters?.cache === true;

if (same) { console.log(`✓ ${ZONE.name}: cache rule already correct`); process.exit(0); }

console.log(`${DRY ? '~' : '→'} ${ZONE.name}: ${existing ? 'updating' : 'creating'} "${DESCRIPTION}"`);
if (DRY) process.exit(0);

const next = idx === -1 ? [...rules, desired] : rules.map((r, i) => (i === idx ? desired : r));
const res = await api(path, { method: 'PUT', body: JSON.stringify({ rules: next }) });
if (!res.body.success) { console.error('  ✗', JSON.stringify(res.body.errors)); process.exit(1); }

console.log('  ✓ applied. Verify with:');
console.log('    curl -sSI https://whatdidyoutake.org/emergency | grep -i cf-cache-status');
console.log('    expect HIT or MISS, never DYNAMIC — DYNAMIC means it is not being stored.');
