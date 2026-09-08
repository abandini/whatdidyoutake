import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { SITE } from '../lib/site.js';

// Generated rather than hand-maintained, so a new compound page cannot be
// published and left out of the sitemap.
const STATIC: { path: string; priority: string }[] = [
  { path: '/', priority: '1.0' },
  { path: '/emergency', priority: '1.0' },
  { path: '/compounds', priority: '0.9' },
  { path: '/am-i-dependent', priority: '0.8' },
  { path: '/family', priority: '0.8' },
  { path: '/how-we-rate', priority: '0.6' },
  { path: '/about', priority: '0.5' },
  { path: '/about/corrections', priority: '0.4' },
  { path: '/sources', priority: '0.4' },
];

export const GET: APIRoute = async () => {
  const compounds = await getCollection('compounds');
  const stopping = await getCollection('stopping');
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const today = iso(new Date());

  const urls = [
    ...STATIC.map((s) => ({ loc: s.path, lastmod: today, priority: s.priority })),
    ...compounds.map((c) => ({ loc: `/compounds/${c.id}`, lastmod: iso(c.data.lastReviewed), priority: '0.9' })),
    // Both are redirect-domain landing targets, so they carry full weight.
    ...stopping.map((p) => ({ loc: `/stopping/${p.id}`, lastmod: iso(p.data.lastReviewed), priority: '1.0' })),
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map((u) => `  <url>\n    <loc>${SITE.url}${u.loc === '/' ? '/' : u.loc}</loc>\n    <lastmod>${u.lastmod}</lastmod>\n    <priority>${u.priority}</priority>\n  </url>`)
  .join('\n')}
</urlset>
`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
