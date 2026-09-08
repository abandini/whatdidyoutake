import { defineCollection, z, reference } from 'astro:content';
import { glob } from 'astro/loaders';
import { BAND_KEYS, DIMENSION_KEYS } from './lib/rating-system.js';

const score = z.number().int().min(1).max(5);

const rating = z.object({
  score,
  /** One line, in plain English, saying why this score and not the one above it. */
  note: z.string().min(20),
  /** Source ids from this page's own `sources` list. Verified by gate-frontmatter. */
  refs: z.array(z.string()).default([]),
});

const source = z.object({
  id: z.string(),
  citation: z.string().min(10),
  /** At least one stable identifier is required — checked in gate-frontmatter. */
  pmid: z.string().regex(/^\d{1,9}$/).optional(),
  doi: z.string().optional(),
  url: z.string().url().optional(),
  /** 'trial' | 'case-report' etc. drives how the citation is labelled in prose. */
  kind: z.enum([
    'randomised-trial', 'controlled-trial', 'observational', 'systematic-review',
    'case-report', 'case-series', 'animal', 'in-vitro', 'regulatory',
    'poison-centre', 'analytical', 'reference',
  ]),
  year: z.number().int().min(1900).max(2100),
});

const compounds = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/compounds' }),
  schema: z.object({
    name: z.string(),
    otherNames: z.array(z.string()).default([]),
    chemicalClass: z.string(),
    tier: z.number().int().min(1).max(3),
    band: z.enum(BAND_KEYS as [string, ...string[]]),
    /** SPEC 2 §6.1 — above the fold, before anything else. One sentence. */
    verdict: z.string().min(40),
    /** The AI-retrievable summary: self-contained, meaningful lifted out of
     *  context, used for JSON-LD description. Length is not constrained. */
    summary: z.string().min(60),
    /** The SERP snippet. Different job from `summary` — must survive Google's
     *  ~160-character truncation, so it is capped rather than merely short. */
    metaDescription: z.string().min(70).max(158),
    ratings: z.object(
      Object.fromEntries(DIMENSION_KEYS.map((k) => [k, rating])) as Record<string, typeof rating>
    ),
    sources: z.array(source).min(1),
    /** Real informational queries this page answers, per SPEC 2 §12. */
    queries: z.array(z.string()).default([]),
    /** Set when a /stopping/<slug> page exists for this compound. */
    stoppingPage: z.string().optional(),
    lastReviewed: z.coerce.date(),
    /** null = no clinical review yet; the page must then say so visibly. */
    reviewedBy: reference('reviewers').optional(),
    hasCharacteristicFailureMode: z.boolean(),
    /** schema.org type for the `about` node. Most of these are not approved drugs. */
    schemaType: z.enum(['Substance', 'Drug', 'DietarySupplement']).default('Substance'),
  }),
});

const stopping = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/stopping' }),
  schema: z.object({
    compound: reference('compounds'),
    title: z.string(),
    summary: z.string().min(60),
    metaDescription: z.string().min(70).max(158),
    lastReviewed: z.coerce.date(),
    reviewedBy: reference('reviewers').optional(),
    sources: z.array(source).default([]),
    queries: z.array(z.string()).default([]),
  }),
});

const reviewers = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/reviewers' }),
  schema: z.object({
    name: z.string(),
    credentials: z.string(),
    role: z.string(),
    /** Published so the reader can check the person is real. */
    verifyUrl: z.string().url().optional(),
    conflicts: z.string(),
  }),
});

export const collections = { compounds, stopping, reviewers };
