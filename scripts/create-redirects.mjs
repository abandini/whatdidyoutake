#!/usr/bin/env node
// SPEC 3 §2 — creates the three Redirect Rules. Idempotent: re-running is safe.
// Requires a token with Zone · Transform Rules · Edit. See docs/DEPLOYMENT.md §0.

const T = process.env.CLOUDFLARE_API_TOKEN;
const api = async (path, opts={}) => {
  const r = await fetch('https://api.cloudflare.com/client/v4' + path, {
    ...opts, headers: { Authorization: `Bearer ${T}`, 'Content-Type': 'application/json', ...(opts.headers||{}) },
  });
  const t = await r.text();
  try { return JSON.parse(t); } catch { return { success:false, errors:[{message:t.slice(0,200)}] }; }
};

// SPEC 3 §2 — Redirect Rules at the edge. Not a Worker, not a redirect-only
// Pages project: these cost nothing and cannot break the way code can.
const ZONES = [
  { zone: 'whatdidyoutake.org',     id: 'ce1fa3375693bfa2d5989ce17be97cca',
    name: 'www to apex',
    expr: '(http.host eq "www.whatdidyoutake.org")',
    // Preserve the path here: www/<page> must land on apex/<page>.
    value: 'concat("https://whatdidyoutake.org", http.request.uri.path)', dynamic: true },

  { zone: 'phenibutwithdrawal.org', id: 'dd5bbdb53a1866c5e93a7dfd77018256',
    name: 'deep-link to stopping page',
    expr: '(http.host eq "phenibutwithdrawal.org" or http.host eq "www.phenibutwithdrawal.org")',
    value: 'https://whatdidyoutake.org/stopping/phenibut', dynamic: false },

  { zone: 'phenibut.help',          id: 'cfd50a788f5aa5caef87b14875d7e5f1',
    name: 'deep-link to emergency page',
    expr: '(http.host eq "phenibut.help" or http.host eq "www.phenibut.help")',
    value: 'https://whatdidyoutake.org/emergency', dynamic: false },
];

for (const z of ZONES) {
  const rule = {
    action: 'redirect',
    description: z.name,
    expression: z.expr,
    action_parameters: {
      from_value: {
        status_code: 301,               // permanent: consolidates link equity on the destination
        target_url: z.dynamic ? { expression: z.value } : { value: z.value },
        preserve_query_string: false,   // nothing useful arrives this way; drop it deliberately
      },
    },
  };

  // http_request_dynamic_redirect is the phase that holds single redirect rules.
  const existing = await api(`/zones/${z.id}/rulesets/phases/http_request_dynamic_redirect/entrypoint`);
  const has = existing.success && (existing.result.rules||[]).some(r => r.description === z.name);
  if (has) { console.log(`· ${z.zone}: rule "${z.name}" already exists, skipping`); continue; }

  // The phase entrypoint accepts only `rules`. Sending name/kind/phase is
  // rejected; a 404 above just means the entrypoint has no ruleset yet, and
  // PUTting rules creates it.
  const body = { rules: [...((existing.success && existing.result.rules) || []), rule] };

  const res = await api(`/zones/${z.id}/rulesets/phases/http_request_dynamic_redirect/entrypoint`, {
    method: 'PUT', body: JSON.stringify(body),
  });
  console.log(res.success
    ? `✓ ${z.zone}: "${z.name}" -> ${z.value} (301)`
    : `✗ ${z.zone}: ${JSON.stringify(res.errors)}`);
}
