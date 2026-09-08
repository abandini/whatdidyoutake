#!/usr/bin/env node
// SPEC 3 §1 — an unreviewed draft reachable at a guessable preview URL is a
// real problem for a site making medical claims: a search engine or a language
// model can find it, and an unreviewed claim in an AI answer is
// indistinguishable from a reviewed one.
//
// Cloudflare Pages sets CF_PAGES_BRANCH on every build. On anything that is not
// the production branch, append a blanket noindex to dist/_headers.
// Cloudflare Access on preview deployments is the other half of this and is
// configured in the dashboard (see docs/DEPLOYMENT.md §5).

import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const PRODUCTION_BRANCH = 'main';
const branch = process.env.CF_PAGES_BRANCH;
const headersPath = join(process.cwd(), 'dist/_headers');

if (!existsSync(headersPath)) {
  console.error('✗ dist/_headers is missing — public/_headers should have been copied by the build.');
  process.exit(1);
}

if (!branch) {
  console.log('· not a Cloudflare Pages build (no CF_PAGES_BRANCH); _headers left as-is');
  process.exit(0);
}

if (branch === PRODUCTION_BRANCH) {
  console.log(`✓ production branch (${branch}); no preview noindex added`);
  process.exit(0);
}

if (readFileSync(headersPath, 'utf8').includes('X-Robots-Tag')) {
  console.log('· preview noindex already present');
  process.exit(0);
}

appendFileSync(
  headersPath,
  `\n# Preview deployment (branch: ${branch}). Never indexable — SPEC 3 §1.\n/*\n  X-Robots-Tag: noindex, nofollow, noarchive\n`
);
console.log(`✓ preview branch (${branch}); appended X-Robots-Tag: noindex to dist/_headers`);
