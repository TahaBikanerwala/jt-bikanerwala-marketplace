# Bug report template

Read this when you reach Step 4 (Apply the Template). Every section below has a presence rule. Follow
the rules and the order exactly; a bug report that always looks the same is a bug report people learn
to skim quickly.

Write each section as readable prose where the content flows as sentences. Use a list when the content
is genuinely a list. Steps to Reproduce is always a numbered list.

Use `## <heading>` for section titles.

## Presence key

| Section | Presence |
|---------|----------|
| Summary | always |
| Environment | if known |
| Preconditions | if known |
| Steps to Reproduce | if known |
| Expected Behavior | if known |
| Actual Behavior | always |
| Frequency and Reproducibility | if known |
| Impact and Affected Scope | if known |
| Evidence | if present |
| Regression | if known |
| Workaround | if known |
| Missing Information | when any gap remains |
| Fix Verification | always |
| Open Questions | if any remain |

**`if known` / `if present`** means **omit the heading entirely** when nothing was supplied. Do not
write a placeholder, a not-provided line, an "unknown", a `TBD`, or an empty heading. A section that
is not there says what needs saying, and it says it without costing the reader a line.

**`always`** applies to exactly three sections, and none of them can come up empty:

- **Summary** and **Actual Behavior** restate the report itself. Whatever the reporter said happened is
  the actual behavior, even when that is one clause. If there is genuinely nothing to put in either
  one, there is no bug to file.
- **Fix Verification** is derived from the defect rather than supplied by the reporter, so a thin report
  still yields at least one honest check: the reported symptom no longer occurs.

### Where the gaps go instead

Every omitted section becomes a line in **Missing Information**, phrased as a question. That list is
now the only place a gap appears, which makes it the section a reporter reads to know what to add and a
fixer reads to know what is not yet established. Losing a heading loses nothing.

An **explicit negative answer is content, not a gap.** "There is no workaround" and "it never worked,
this is not a regression" are things the reporter told you, and they belong in Workaround and Regression
as `None known.` and `Not a regression; the feature has never worked.` Silence is different: nobody
answered, the section is omitted, and the question goes to Missing Information. Keep the two apart.
Severity depends on the difference between a confirmed no-workaround and an unasked question.

There is no analysis section in this template. No Suspected Area, no Proposed Fix, no Root Cause, no
Where to Look. The report says what was observed and what is still unknown, and stops there. Whoever
triages the bug adds the analysis to the work item as a comment, with the code evidence behind it.

---

## Section definitions

### Summary

One to three sentences. What is broken, who hit it, and when it started. A reader who stops here knows
whether the bug affects them.

Lead with the symptom, never with a cause. `Applying a coupon a second time crashes the checkout page
for shoppers on the web app.` Not `A null coupon state crashes checkout.`

Cite the source of the report in the same breath when it adds context: `Reported from the
support-escalation notes, 2026-07-27.`

### Environment

Where the bug was seen. Include only what was actually supplied or verified:

- environment (production, staging, a named preview)
- application version, build, or deploy reference
- browser and version, OS, device
- tenant, account, org, or region
- API or client version, when the report involves an integration

Prose for one or two values, a short list for more. Partial is fine: an environment name on its own is
worth having. When none of it was supplied, omit the whole section and ask for it in Missing
Information.

Never infer a version from the current date, a browser from the reporter's usual setup, or an
environment from the fact that someone noticed it.

### Preconditions

The state that has to exist before the steps make sense: an account of a certain type, a feature flag,
a seeded record, a permission, an existing cart or session. Omit the section when the steps are
self-contained.

### Steps to Reproduce

A numbered list, each step one action, in the order performed, specific enough that someone unfamiliar
with the feature can follow it.

```
1. Sign in as a shopper with an active cart.
2. Apply coupon code SAVE20 at checkout.
3. Apply the same code a second time without reloading.
```

When no steps were supplied, omit the section. `Steps to Reproduce: not provided` is a heading that
costs a fixer a line to learn nothing, and the request for steps is already the first thing in Missing
Information.

Two actions the reporter described in passing are steps and belong here. Restate them as a numbered
list and nothing more.

When the bug is real but not reproducible on demand, say so and keep whatever is known:

> Not reproducible on demand. The reporter saw it once at 2026-07-27 14:05 UTC; two later attempts the
> same afternoon did not reproduce.

**Never write steps nobody performed.** Inventing a plausible sequence is the most damaging thing this
template can contain: an engineer follows it, fails to reproduce, and closes the bug.

### Expected Behavior

What should have happened, in one or two sentences. Derive it from the reporter's stated expectation or
from documented behavior. When neither exists, omit the section rather than deciding what the product
ought to do.

"It should not crash" is a real expectation and worth one line when the reporter said it. Inventing the
intended behavior of a feature you have not read about is not, and the omitted heading is the honest
version.

### Actual Behavior

What happened instead. This is one of the three sections that always appears, because the report is a
statement of what happened. Include the error text verbatim in a fenced code block when there is one.

````
The page goes blank and the cart total is lost.

```
TypeError: Cannot read properties of undefined (reading 'amount')
    at applyDiscount (checkout.bundle.js:2481)
```
````

Truncate a stack trace only from the bottom, and say that you did. Never paraphrase or tidy an error
message: the exact string is what a code search matches on.

### Frequency and Reproducibility

Every time, or intermittent. How many attempts out of how many succeeded in reproducing it. When it
was first seen and last seen. Omit the section when none of that was supplied.

This section decides how a fixer approaches the bug, so a one-line answer here is worth more than a
paragraph elsewhere, and it is worth asking for in Missing Information when it is absent.

### Impact and Affected Scope

Who is affected and how badly. One or two parties as prose; four or more as a table.

Cover the population (one user, a segment, everyone), the count when it is known, what those users
cannot do, and the business consequence. This is the evidence severity gets set from, so keep claims
tied to what was supplied: a population with no count is worth stating, an invented count is not.

When the reporter said nothing about who is affected, omit the section. The caller then has no impact
evidence to resolve severity from and lazy-prompts for the tier instead, which is the correct outcome.

| Affected party | What they experience | Identifiers |
|----------------|----------------------|-------------|
| Web shoppers with a coupon | Checkout page blanks, cart lost | `tenant: retail-eu` |

### Evidence

The artifacts. Screenshots and video links, log or trace urls, request and correlation ids, customer or
order ids, related work items and pull requests, chat threads that carry detail. One bullet each, with
what the artifact shows.

Every item comes from the input or from a verified search hit. Never construct a plausible log url or
identifier.

### Regression

Whether this used to work, and the last known good version or deploy. A confirmed regression with a
version boundary is one of the strongest signals a bug report can carry, so state it plainly when it
exists and never imply it when it does not.

Both answers count as content. "Worked in 2.3.1, broken in 2.4.0" belongs here, and so does "the
reporter says it has never worked", which rules a regression out. Only silence omits the section.

### Workaround

What an affected user can do right now.

`None known.` is content, not a placeholder: when the reporter was asked and said there is no
workaround, that sentence is the input severity depends on, and it stays. When nobody answered, omit
the section and ask in Missing Information. A fixer reading `None known.` learns something a fixer
reading nothing does not, and the distinction only survives if you keep it.

### Missing Information

What the reporter still needs to supply, as questions, one per line. This is the section that replaces
guessing.

```
- Which environment and app version was this on?
- What browser and OS?
- Does it happen every time, or was it a one-off?
- How many users have hit this?
```

Order by how much each answer would change the response. Omit the section when nothing is missing.

Every section the report omitted for want of content has a question here. That is the trade: the body
carries only what is known, and this list carries everything that is not. Ask for one thing per line, in
the reporter's language, so the list can be answered in a single reply.

### Fix Verification

How someone proves the bug is fixed. Two to five checkbox items, specific to this defect: the exact
scenario that must now pass, the regression that must not appear, the environment it should be verified
in, the test that should exist.

This section is derived from the defect, not supplied by the reporter, which is why it always appears. A
thin report yields fewer items, not none: the reported symptom no longer happening is always checkable.
Do not invent a verification step for a scenario nobody described.

```
- [ ] Applying the same coupon twice leaves the cart total intact and shows a clear message
- [ ] A regression test covers a repeated application of one code
- [ ] Verified on staging on the build that ships the fix
- [ ] No change to single-application discount totals
```

Keep it about proving this bug is gone. Generic release checklists belong to the team's definition of
done, not to a bug.

### Open Questions

Questions that are open for the team rather than for the reporter (a product decision, an ownership
question, a dependency). Reporter-facing gaps belong in Missing Information.

| # | Question | Owner | Blocking? |
|---|----------|-------|-----------|
| 1 | Should a repeated coupon be rejected or silently ignored? | Product | No |

Omit the section when none remain.

---

## Section order

Omitted sections close the gap. Nothing marks where they would have been.

1. Summary
2. Environment
3. Preconditions
4. Steps to Reproduce
5. Expected Behavior
6. Actual Behavior
7. Frequency and Reproducibility
8. Impact and Affected Scope
9. Evidence
10. Regression
11. Workaround
12. Missing Information
13. Fix Verification
14. Open Questions

The top runs symptom, then where, then how to see it: what a fixer needs in the order they need it.
Missing Information sits below the facts because it is the reporter's homework, and it reads as the
honest bottom line of everything above it.

When the caller passes `field_routing`, sections 2 through 7 leave the description and go to the
tracker's own fields (Environment to System Info; Preconditions, Steps, Expected, Actual, and Frequency
to Repro Steps). They appear in exactly one place.

A routed block follows the same rule as a section. When every section that routes to a field was omitted
for want of content, **emit no block for that field at all** and the caller writes nothing to it. This is
the common case for System Info: Environment is the single section it carries, so a report with no
environment details produces no System Info block rather than a field containing a placeholder. The Repro
Steps block always has at least Actual Behavior in it.

---

## Worked example: a one-line report, honestly thin

Input: `checkout crashes when you apply a coupon twice`. On the clarification card the reporter answered
the scope question and said there is no workaround, and skipped everything else.

```
=== BUG: Checkout: applying the same coupon twice crashes the page ===

--- DESCRIPTION (body) ---
## Summary
Applying a coupon code a second time crashes the checkout page and the cart total is lost. Reported as
a one-line report on 2026-07-28; scope confirmed by the reporter as multiple shoppers.

## Steps to Reproduce
1. Apply a coupon code at checkout.
2. Apply the same code again.

## Actual Behavior
The checkout page crashes and the cart total is lost.

## Impact and Affected Scope
Multiple shoppers cannot complete checkout after a repeated coupon application. The reporter did not
give a count.

## Workaround
None known.

## Missing Information
- Which environment and app version was this on?
- What browser and OS?
- What exactly appears on the crash: a blank page, an error message, a stack trace?
- Does it happen every time, and when was it first seen?
- How many shoppers have hit this?
- Did this work in an earlier version?

## Fix Verification
- [ ] Applying the same coupon twice leaves the cart total intact and shows a clear message
- [ ] A regression test covers a repeated application of one code
- [ ] No change to single-application discount totals
```

Seven of the fourteen sections appear. Environment, Preconditions, Expected Behavior, Frequency,
Evidence, Regression, and Open Questions are simply not there, and nothing marks where they would have
been. The
report is short because the intake was short, and it reads as a short report rather than as a form with
seven blanks in it.

Three things to notice in what survived. The steps are the reporter's own two actions restated, not an
invented six-step sequence. `None known.` stayed under Workaround because the reporter said it, while
Regression went away because nobody asked; the two look similar and are not, and Missing Information
carries the regression question instead. And nothing guesses at a cause, even though "applying twice"
practically invites one: no file, no symbol, no hypothesis. Whoever picks this up runs
`/issue-triager:run` and gets that analysis with the code behind it.
