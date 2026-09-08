# SPEC 2 — The Reference Site

**Target:** Claude Code
**Repo:** new
**Primary domain:** `whatdidyoutake.org`
**Redirect domains:** `phenibutwithdrawal.org`, `phenibut.help`
**Stack:** static site, Cloudflare Pages
**Deployment:** see SPEC 3 — Cloudflare Deployment and Domain Configuration

---

## 0. What this is, in one sentence

**A compound-by-compound risk reference for people who are going to take these things anyway, written by someone who is not selling them anything.**

Everything below serves that sentence. When a decision is ambiguous, resolve against it.

---

## 1. Why this site can exist and its competitors cannot

Every ranking page in this space monetizes through vendor affiliate commissions. That is the only revenue model in the category. A site that tells a reader *not* to buy something is structurally unfundable by the mechanism funding all of its competitors.

That is why the space is empty. It is also why nobody will copy this: there is no money in it, so there is no competitive response. The position is defensible by default, permanently.

**The corollary is a hard rule: the moment this site takes vendor money, an affiliate commission, or a sponsored placement, it becomes the thing it replaced and has no reason to exist.** This is not a preference. It is the entire strategic premise.

---

## 2. The readers

Write for these four. Each needs something different and each is failed by the existing internet.

**A — Considering.** Has read forum posts and vendor copy. Wants to know if it works and what the actual downside is. Currently gets marketing on one side and "consult your physician" on the other, and correctly discounts both.

**B — Using.** Something feels off, or they want to stop, or they've noticed they can't. Searching symptom-shaped queries. Currently gets forum anecdote and rehab-center SEO funnels.

**C — In trouble now.** In withdrawal, or in an ER, or watching someone deteriorate. It is 3am. Currently gets nothing usable at all.

**D — Family.** A parent, partner, or sibling who found a bag of white powder or is watching someone change. Currently gets scare content that tells them to be afraid without telling them what to do.

Note explicitly: **these are not all teenagers.** Median reader is an adult in their twenties or thirties. Write accordingly.

---

## 3. Voice and stance — the most important section in this spec

The reader has been lied to by adults about drugs before and is testing whether this source is another one. Credibility is the entire product. It is won or lost in the first two hundred words of any page.

### 3.1 The rule that governs everything

**Be right about the things the reader can already verify.**

They will look up the compound they know about first, to check you. If you say creatine is dangerous, you are done — they leave and they do not come back, and nothing you say about phenibut ever reaches them. Being accurate about low-risk compounds is what buys the right to be believed about high-risk ones.

### 3.2 Always

- Lead with what the compound actually does for the person taking it, including that it may work well. Efficacy first, then cost.
- Distinguish sharply between compounds. Differential risk *is* the product.
- State the confidence level of every claim. "Two published case reports" and "consistent finding across three randomized trials" are different and must read differently.
- Say plainly when the honest answer is "nobody knows."
- Assume the reader is intelligent and has already decided. Give them what changes the outcome, not what changes their mind.
- Write in plain adult English.

### 3.3 Never

- **Never write in the reader's assumed slang.** Attempted mimicry by an older writer is detected instantly and is worse than plain prose. Register is not the credibility lever; stance is.
- Never use uniform hedging. If every page says "risks are unknown, consult your physician," the site is noise and the reader leaves.
- Never moralize, express disappointment, or imply the reader is foolish.
- Never use scare imagery, sirens, before-and-after photos, or "one pill can kill" framing.
- Never bury the answer below a wall of preamble. The answer goes first.
- Never imply a compound is dangerous when the evidence says it isn't, to be safe. That is the lie that destroys the site.

### 3.4 Calibration examples — hold to these

> **Bad:** "Phenibut is a dangerous, unregulated substance that can destroy your life."
>
> **Good:** "Phenibut works. It reduces social anxiety genuinely and noticeably, which is exactly why it's a problem — tolerance builds within days to weeks, and stopping after regular use can produce a withdrawal severe enough to require hospitalization."

> **Bad:** "SARMs are unapproved drugs with serious health risks."
>
> **Good:** "Ostarine is the most-studied SARM and did produce measurable lean mass gains in Phase 2 trials. It also suppressed testosterone in those same trials, which is the main thing people take it to avoid. There are published case reports of liver injury in otherwise healthy young men. It has never been approved anywhere and there is no long-term human safety data."

---

## 4. The risk rating system

This is the site's intellectual core. Build it as structured data, not prose, so it renders consistently and can be compared across compounds.

Every compound is rated on **six independent dimensions**, each 1–5, each with a one-line justification and citations:

| Dimension | What it measures |
|---|---|
| **Dependence liability** | Does regular use produce tolerance and physical dependence, and is stopping dangerous |
| **Acute toxicity** | Overdose potential, interaction danger, how bad a single mistake can be |
| **Documented serious harm** | Case reports, hospitalizations, deaths in humans |
| **Long-term / irreversible risk** | Carcinogenicity, organ damage, permanent effects |
| **Evidence quality** | How much is actually known — high score means *well-characterized*, not *safe* |
| **Product integrity risk** | Mislabeling, contamination, dosing-by-the-user error |

**Do not average these into a single number.** A compound can be 1 on acute toxicity and 5 on long-term risk, and averaging destroys exactly the information the reader needs. Display the six-dimension profile.

Above the profile, a plain-language verdict in one of five bands:

- **Well-characterized, low concern** — e.g. creatine
- **Works as advertised, real trade-offs** — e.g. ostarine
- **Largely unknown** — promising animal data, no human evidence — e.g. BPC-157
- **Serious risk** — e.g. melanotan II, unsupervised T3, gray-market GLP-1 reconstitution
- **The evidence says don't** — e.g. cardarine, phenibut

**Every band must actually be used at launch.** A site where everything is red is a site nobody believes. The low-concern ratings are load-bearing.

Publish the rubric at `/how-we-rate`, including what would change a rating and how to submit a correction.

---

## 5. Page architecture

```
/                         Entry — routes by situation, not by compound
/compounds/               Index with the full rating matrix
/compounds/<slug>         Compound page (template §6)
/emergency                THE CRITICAL PAGE (§7)
/stopping/<slug>          Discontinuation and withdrawal (§8)
/am-i-dependent           Plain-language self-assessment (§9)
/family                   For the person watching someone else (§10)
/how-we-rate              The rubric
/about                    Who, why, funding (none), corrections policy
/sources                  Full bibliography
```

### 5.1 Redirect domain landing targets

Two additional domains point into this site. They must land on the page matching the intent that made someone type them, never on the homepage — a person who typed `phenibut.help` at 3am should not have to navigate.

| Domain | Lands on | Why |
|---|---|---|
| `phenibutwithdrawal.org` | `/stopping/phenibut` | The query is about stopping. Answer it immediately. |
| `phenibut.help` | `/emergency` | The word is "help." Assume the worst case. |

Both pages must therefore work as cold entry points: self-contained, no assumed prior context, with a clear path up to `/compounds/phenibut` for a reader who arrived early rather than late. Configuration in SPEC 3.

**Homepage does not sell the site.** It routes. Three doors, plainly labelled:

- *I'm thinking about taking something* → compounds index
- *Something is going wrong right now* → /emergency
- *I'm worried about someone else* → /family

Below the fold: the rating matrix, the funding statement, and the reviewer credentials. Nothing else.

---

## 6. Compound page template

Fixed section order on every compound page. The reader learns the shape and can navigate it.

1. **One-sentence verdict.** Above the fold, before anything else.
2. **What it is.** Chemical class, origin, current regulatory status, who developed it and what happened to that program. Where a compound was abandoned by a pharmaceutical company, say who and why — that fact does more persuasive work than any warning.
3. **What it actually does.** Mechanism in plain language, and the honest account of the effects people seek. This section is non-negotiable and comes before risks.
4. **What the evidence actually shows.** Human trials if any. Animal data labelled as animal data. Case reports labelled as case reports. Explicit statement where evidence is absent.
5. **The six-dimension risk profile.**
6. **What going wrong looks like from the inside.** See §6.1.
7. **Interactions and combinations.** Especially CNS depressant stacking.
8. **If you're already using it.** Link to `/stopping/<slug>` where one exists.
9. **Sources.** Every citation, linked, with PMID or DOI.
10. **Reviewed by / last updated.**

### 6.1 The section nobody else writes

Section 6 is the site's differentiator and must be written with the most care.

Every competing page lists side effects as bullet points. That format does not help, because the reader cannot map "agitation" onto their own experience at the moment it starts.

Instead, for each compound, write prose answering: **how would you know it was starting, from inside your own head?**

Worked example — phenibut:

> The bad outcome isn't a bad experience. It's that you stop being able to stop.
>
> It usually goes like this. It works well, so you use it again. Within a couple of weeks the amount that worked doesn't anymore, so you take more, and the gap between doses gets shorter. Then a day comes when you don't take it, and the anxiety that comes back is far worse than the anxiety you started with — and it's easy to read that as proof you needed it, rather than as withdrawal.
>
> That's the point where it stops being a decision. What follows can include insomnia that doesn't respond to anything, tremor, sweating, and in documented cases agitation and psychosis severe enough to require hospitalization.
>
> If you are recognizing the escalation pattern above, that is the thing to act on, and now is better than later. **Do not stop abruptly on your own** — see [stopping phenibut].

Write the equivalent for every compound where a characteristic failure mode exists. Where there isn't one, say so.

---

## 7. `/emergency` — the page that justifies the site

Highest-value page here. It does not exist anywhere on the internet in usable form.

**Design constraints:** loads on a bad connection in a hospital parking lot. No images. No JS required. Largest text on the site. Reachable in one tap from every page via a persistent element.

**Contents, in this order:**

### Immediate
- **Poison Control: 1-800-222-1222.** Free, 24/7, staffed by medical toxicologists. State plainly: they are a clinical resource, not law enforcement, and they will help you.
- 911 if unconscious, not breathing normally, seizing, or unrousable
- 988 for suicidal crisis

### If you're going to an ER, this is what to tell them

Written as a script the reader can read aloud or hand over on a phone screen:

- Say the compound name and spell it. Most staff have not heard it.
- Say how much, how often, and for how long. Underreporting makes the picture wrong and they cannot help you with a wrong picture. Nobody is calling the police.
- **For phenibut specifically:** say that it will not show on a standard drug screen, that it is a GABA-B agonist structurally related to baclofen, and that withdrawal presents like benzodiazepine or alcohol withdrawal. This changes what they consider and what they treat with.
- Bring the container if you have it. If not, bring the order confirmation or the product page on your phone.
- If you are the family member and the patient can't speak, you say this.

### If they don't recognize it
Ask them to call the regional poison center from the ER. Toxicologists take those calls from clinicians around the clock and this is a normal request, not an insult to anyone's competence.

### Absolute rule for this page
**No dosing information. No taper schedules. No "how much is safe."** The page tells someone how to get competent help and how to be understood when they arrive. It does not attempt to substitute for that help.

---

## 8. `/stopping/<slug>` — discontinuation

For compounds with real withdrawal risk. Phenibut is the priority.

**Hard constraint: this site does not publish taper protocols or doses.** Not because the information doesn't exist, but because unsupervised tapering off a GABA-B agonist is precisely the thing that goes wrong, and a page that appears to enable it does harm while looking helpful.

What the page does instead:

- Explains that abrupt cessation after regular use is the dangerous move, and that gradual reduction under clinical supervision is the standard approach
- Explains that the published literature describes clinicians using baclofen and benzodiazepines in management — as literature summary with citations, framed for the reader to raise with a clinician, never as instruction
- **Answers "I don't have a doctor,"** which is the real obstacle: Poison Control will advise; urgent care and ERs can initiate; SAMHSA's FindTreatment.gov and 1-800-662-4357; federally qualified health centers with sliding-scale fees for the uninsured; and for readers who need it, that Medicaid expansion states cover adults on income alone with no asset test and no enrollment window.
- Sets expectations honestly about duration and difficulty
- Says clearly that people do get through this

---

## 9. `/am-i-dependent`

Plain-language, non-clinical, no scoring, no diagnosis. A short set of recognitions:

- The amount that worked doesn't work anymore
- The gap between doses is shrinking
- You've thought about what happens if you run out
- You've tried to stop and started again because stopping felt worse than continuing
- You're taking it to feel normal rather than to feel better

Then: what to do about each, without judgement, and a route to §8.

**No email capture. No account. No quiz results page. No lead generation.** If this page ever collects an address, the site is a funnel and the reader was right not to trust it.

---

## 10. `/family`

For the reader who found something and doesn't know what it is.

- **What you may be looking at:** unlabeled powders, plain vials, plastic bags with a chemical name, packages from research-chemical vendors, a scale
- **How to identify it** without confronting anyone: search the exact name on the label; check the order history
- **What to do first:** call Poison Control at 1-800-222-1222 even with no emergency. They answer identification questions and they are not law enforcement.
- **What not to do:** don't flush a supply someone is physically dependent on. Abrupt cessation is the dangerous event.
- **How to talk about it.** Moralizing produces concealment, and concealment is what kills people. The goal is that they tell you the truth next time, not that they feel bad this time.
- **If they're already in trouble:** direct link to `/emergency`
- **The insurance and access problem,** addressed practically — because "get them to a doctor" is not actionable advice for a family without coverage.

---

## 11. Editorial policy — publish this, and hold it

At `/about`, stated plainly and linked from every page footer:

1. **No vendor money, ever.** No affiliate links, no sponsorships, no advertising, no free product, no vendor-supplied content. Stated on every page, not buried.
2. **No dosing information.** Anywhere. Including "commonly reported" doses.
3. **No product recommendations.** The site never tells anyone where to buy anything or which source is more trustworthy.
4. **Named clinical review** on every medical claim, with reviewer credentials published. Where a page is unreviewed, say so on the page.
5. **Corrections published, not silently edited.** A dated correction log at `/about/corrections`. Anyone can submit a correction; the process is described.
6. **Crises are routed, never absorbed.** No DMs, no chat, no support forum, no "reach out anytime." The operator is one person and cannot be a crisis line. Trying will consume them and will fail someone.
7. **No user accounts, no email capture, no tracking, no health data collected.**

---

## 12. Search and AI-retrieval strategy

**Do not compete on commercial-intent queries.** "Best SARMs 2026" is where the affiliate money is and the site will lose and should not try.

**Target the informational long tail** — lower competition, and the only moment the reader is genuinely receptive:

- `phenibut withdrawal how long`
- `can't sleep after stopping phenibut`
- `phenibut taper`
- `is phenibut addictive`
- `does phenibut show on a drug test`
- `elevated liver enzymes after rad 140`
- `how long does testosterone suppression last after ostarine`
- `what does cardarine do long term`
- `is cardarine a carcinogen`
- `melanotan mole changes`
- `how to reconstitute — DO NOT TARGET; this query wants dosing and the site does not provide it`
- `found white powder in my son's room`
- `what is a research chemical vendor`

Build the query list per compound from the actual failure modes, not from keyword tools.

**AI retrieval is the second channel and may become the first.** Models increasingly answer these questions directly and need a credible structured source. Requirements:

- Every claim self-contained in one sentence, meaningful when lifted out of context
- Headings phrased as the questions people ask
- Numbers with units, source, and date in the same sentence
- Clean semantic HTML, all content server-rendered
- `llms.txt` describing scope, authorship, funding, and citation preference
- `MedicalWebPage`, `FAQPage`, and `Drug`-adjacent JSON-LD where appropriate, with `reviewedBy` populated

---

## 13. Launch scope — twelve compounds, not one hundred fifty

Selection rule: **the honest answer differs sharply from the marketing answer, AND the harm is real.**

**Tier 1 — build first, these carry the site:**
1. Phenibut
2. Cardarine (GW-501516)
3. Kratom (migrated from Site 1, if that option is taken)
4. Tianeptine

**Tier 2:**
5. Ostarine (MK-2866)
6. RAD-140
7. LGD-4033
8. MK-677

**Tier 3 — includes the credibility anchors:**
9. Creatine — the low-concern rating that makes the others believable
10. BPC-157 — the honest "we don't know" case
11. Melanotan II
12. Gray-market GLP-1s — where the risk is the reconstitution, not the molecule

One excellent page outperforms forty thin ones for ranking, for AI retrieval, and for the reader. **Do not expand the list until all twelve are complete and reviewed.**

---

## 14. Technical

- Static. Cloudflare Pages. No backend, no database, no auth, no accounts.
- Compound data in structured files (`compounds/<slug>.md` with YAML frontmatter carrying the six ratings, citations, and review metadata). Pages generated from data so ratings and bibliography cannot drift out of sync with prose.
- Content complete with JavaScript disabled.
- No third-party requests on load. Self-hosted fonts. Cloudflare Web Analytics only, if any.
- Lighthouse 100 accessibility, 100 SEO, ≥95 performance on throttled mobile.
- `/emergency` must render usably on a 2G connection. Budget it separately and test it that way.
- WCAG 2.2 AA. Visible focus. Emergency link is the first interactive element in the DOM on every page.
- Full-text search client-side over a prebuilt index; no query leaves the device.

### Visual direction

Not clinical-institutional (that is Site 1), and emphatically not scare-campaign. The register is **a knowledgeable person telling you the truth in a quiet room.**

- **Palette:** a calm, low-contrast neutral ground — not white, not cream. Something with a slight cool cast reads as level-headed rather than either sterile or cozy. One accent for interactive elements. Red reserved exclusively for `/emergency` and the highest risk band, used nowhere else.
- **Risk bands need a color system that is not a traffic light** — five bands, distinguishable by non-colour means as well (shape, label, position), never colour alone.
- **Type:** one humanist sans at a generous size for body. This is read on phones, often at night, often by someone not at their best. Minimum 18px body. Line length under 70 characters.
- **No cards, no hero image, no stock photography, no illustrations of pills.**
- **Motion:** none beyond focus and disclosure states.
- **Dark mode:** required, and it is the default-respecting kind (`prefers-color-scheme`), because a meaningful share of this traffic arrives at 3am.

---

## 15. Acceptance criteria

- [ ] Twelve compound pages complete, each with all ten template sections
- [ ] All five risk bands genuinely used across the twelve
- [ ] Every compound page leads with what the compound does for the user before any risk content
- [ ] "What going wrong looks like from the inside" written as prose for every compound with a characteristic failure mode
- [ ] `/emergency` loads usably on throttled 2G with JS disabled
- [ ] `/emergency` contains a verbatim script for talking to ER staff
- [ ] Zero dosing information site-wide — verified by explicit grep against a numeric-dose pattern list before each deploy
- [ ] Zero affiliate links, zero outbound vendor links, zero advertising
- [ ] No email capture, no accounts, no health-data collection anywhere
- [ ] Editorial policy published and linked from every page
- [ ] Corrections log live and reachable
- [ ] Named clinical reviewer on every medical claim, or a visible per-page notice that the page is unreviewed
- [ ] `llms.txt` present; JSON-LD validates
- [ ] Dark mode; WCAG 2.2 AA; full content without JS
- [ ] Emergency link is first interactive element in DOM on every page

---

## 16. What would make this a failure

Stated so it can be checked against later:

- It becomes a funnel — email capture, an affiliate link, a rehab referral fee
- It becomes uniformly alarmist, and the reader who checks the creatine page leaves
- It publishes a taper protocol somebody follows unsupervised
- It becomes a crisis line the operator cannot sustain
- It grows to a hundred thin pages instead of twelve good ones
- It goes stale — an unreviewed medical site with a three-year-old date is worse than no site

The maintenance commitment is real and should be understood before launch: roughly quarterly review of twelve pages, plus a standing relationship with one clinician. That is the honest ongoing cost.
