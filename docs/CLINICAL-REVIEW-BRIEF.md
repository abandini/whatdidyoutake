# Clinical review — what we're asking for

> **Status: not being pursued.** On 11 September 2026 the operator decided
> against seeking clinical review, on the basis that cited and machine-verified
> claims, plus first-aid guidance sourced to the American Red Cross, MedlinePlus,
> NIDA and Epilepsy Action, are a sufficient standard for this site.
>
> This is a deliberate, documented deviation from `SPEC-2` §11.4. Do not treat
> it as an unfinished task or quietly revert it. Every page states that no
> clinician has reviewed it, and `/about` §4 sets out both what the standard is
> and what it does not cover — the six risk scores and the verdict bands are
> editorial judgements, and they are labelled as such.
>
> The brief below is kept intact in case that decision is revisited.

---


A one-page brief to hand to a prospective reviewer. It exists to make the ask
small, bounded and specific, because "would you review my website" is an
unanswerable question and "would you read four pages and tell me what's wrong"
is not.

---

## The site

**whatdidyoutake.org** — a risk reference covering twelve compounds sold as
supplements, nootropics, peptides and research chemicals, written for people who
have already decided to take them. It has no revenue, no advertising, no
affiliate links and no vendor relationships of any kind, and it recommends no
products or suppliers.

It is written for adults who are going to do this anyway, and its aim is to
change outcomes rather than to change minds.

---

## What we are asking you to do

**Read four pages and tell us what is wrong or missing.** Roughly two hours.

In priority order:

1. **`/emergency`** — the highest-stakes page. First aid, when to call 911, and
   a verbatim script for telling an emergency department about a compound they
   have not heard of.
2. **`/stopping/phenibut`** — abrupt cessation after regular use, and why it is
   the dangerous move.
3. **`/stopping/tianeptine`** — opioid withdrawal from a product sold as a
   supplement.
4. **`/stopping/kratom`** — opioid-type withdrawal, and buprenorphine timing.

If you have appetite for more afterwards, the next most useful thing is a pass
over the twelve **band assignments and six-dimension scores** (about an hour) —
these are editorial judgements and they are the part most likely to be wrong in
a way citations cannot catch.

**The question that matters most is not "is anything here false" — it is "what
is missing."** Every factual claim is already cited and machine-verified. What
that process cannot detect is an omission, and on a first-aid page an omission
is the dangerous failure mode.

---

## What "reviewed" would mean, and what it would not

You would be attesting to a narrow thing, and the site states it in exactly
these terms:

> Reviewed for factual accuracy of the clinical claims on this page, as at
> [date].

It explicitly does **not** mean:

- that you endorse, approve or recommend the site or its conclusions
- that you take responsibility for editorial judgements, ratings or tone
- that you have any relationship with, or duty toward, any reader
- that you vouch for anything added or changed after your review date

Every page carries a **dated** `lastReviewed` field. The build **fails** when a
page's review date passes twelve months, so an old review cannot silently
present itself as current. Corrections are published in a dated log rather than
edited quietly into the page, so the record of what changed and when is public.

---

## What is already handled

These are the things reviewers usually worry about, and they are structural
rather than promised:

- **No dosing information anywhere.** No amounts, no frequencies, no taper
  schedules, no "commonly reported" quantities. This is enforced by an automated
  scan across eight pattern families that fails the build on any match;
  exemptions require a written justification in a file in the repository, and
  there are currently none.
- **No individualised advice.** The site routes to Poison Control, emergency
  services, SAMHSA and treatment referral rather than attempting to substitute
  for them. There is no chat, no forum, no direct messaging.
- **Every claim cited**, with confidence levels stated in the prose — a case
  report is labelled a case report, and absent evidence is stated as absent. All
  67 citations are resolved against PubMed and Crossref on every build, and the
  returned title is compared with the citation as printed.
- **First-aid steps are sourced**, not invented: MedlinePlus (NIH), the American
  Red Cross, NIDA and Epilepsy Action.
- **No data collection.** No accounts, no email capture, no forms, no cookies,
  no analytics of any kind, no third-party requests.

---

## Attribution options

In descending order of what it does for readers:

1. **Named, with credentials and specialty** — strongest, and what the editorial
   policy asks for. Readers can check that you are real, which is the point.
2. **Named, with a link to your registration** — stronger still.
3. **Credentials only** — "reviewed by a board-certified emergency physician."
   Weaker, but real, and a reasonable middle ground.

You can decline attribution on individual pages, review some and not others, or
withdraw at any point — in which case the page reverts to carrying its visible
"not clinically reviewed" notice.

---

## A note on liability

We are not lawyers and this is not legal advice; it is what we can say plainly
about how the site is built.

Reviewing published educational material is not treatment, and does not involve
a patient, an examination or a clinical relationship. The site gives no
individualised advice and publishes no dosing or taper information — the two
categories that most commonly create exposure. Attribution is scoped in writing
and dated, and it lapses rather than persisting indefinitely.

If your malpractice carrier has a view on non-clinical writing, that is worth a
short call before agreeing. In our experience it is usually unremarkable — much
the same category as reviewing patient-education material for a health system —
but it should be your carrier's answer rather than ours.

---

## How to send comments

Anything is fine — a marked-up PDF, an email, tracked changes, or a phone call
we take notes on. Corrections go into the public log at `/about/corrections`,
credited or anonymous as you prefer.

**corrections@whatdidyoutake.org**
