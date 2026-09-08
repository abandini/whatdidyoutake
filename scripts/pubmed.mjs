#!/usr/bin/env node
// Authoring aid: find real PMIDs instead of recalling them.
//   node scripts/pubmed.mjs "creatine supplementation safety position stand"
//   node scripts/pubmed.mjs --id 28615996
const args = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const UA = { 'User-Agent': 'whatdidyoutake.org authoring' };

async function summarise(ids) {
  const r = await fetch(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids.join(',')}&retmode=json`, { headers: UA });
  const j = await r.json();
  for (const id of ids) {
    const rec = j.result?.[id];
    if (!rec || rec.error) { console.log(`${id}\tNOT FOUND`); continue; }
    const type = (rec.pubtype ?? []).join('/');
    console.log(`${id}\t${String(rec.pubdate).slice(0,4)}\t${rec.title.replace(/\s+/g,' ')}\n\t\t${rec.fulljournalname ?? rec.source}${type ? ` [${type}]` : ''}\n`);
  }
}

if (args[0] === '--id') { await summarise(args.slice(1)); process.exit(0); }

const term = args.join(' ');
const r = await fetch(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmax=8&sort=relevance&retmode=json&term=${encodeURIComponent(term)}`, { headers: UA });
const j = await r.json();
const ids = j.esearchresult?.idlist ?? [];
if (!ids.length) { console.log('no results'); process.exit(0); }
await sleep(350);
await summarise(ids);
