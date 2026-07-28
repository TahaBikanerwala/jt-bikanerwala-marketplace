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
| Environment | always |
| Preconditions | if known |
| Steps to Reproduce | always |
| Expected Behavior | always |
| Actual Behavior | always |
| Frequency and Reproducibility | always |
| Impact and Affected Scope | always |
| Evidence | if present |
| Regression | if known |
| Workaround | always |
| Suspected Area | only with evidence |
| Proposed Fix (unverified) | only when the caller supplied a proposal |
| Where to Look | if present |
| Missing Information | when any gap remains |
| Fix Verification | always |
| Open Questions | if any remain |

**`always`** means the heading appears even when the content is unknown; write the explicit
not-provided line the section defines. **`if known` / `if present`** means omit the heading entirely
when there is nothing to put under it. **`only with evidence`** means the caller supplied it and the
evidence tag came with it.

### Why unknowns appear twice

An `always` section with nothing under it says "this is unknown" to the engineer reading top to
bottom. Missing Information collects the same gaps into one list, phrased as questions, for the
reporter to answer. The two audiences are different, so the repetition is deliberate. Keep the
in-section line to one short sentence and put the actual question in Missing Information.

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

Prose for one or two values, a short list for more. When none of it was supplied, write
`Not provided by the reporter.` and put the question in Missing Information.

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

When steps were not supplied, write exactly:

> Not provided by the reporter.

When the bug is real but not reproducible on demand, say so and keep whatever is known:

> Not reproducible on demand. The reporter saw it once at 2026-07-27 14:05 UTC; two later attempts the
> same afternoon did not reproduce.

**Never write steps nobody performed.** Inventing a plausible sequence is the most damaging thing this
template can contain: an engineer follows it, fails to reproduce, and closes the bug.

### Expected Behavior

What should have happened, in one or two sentences. Derive it from the reporter's stated expectation or
from documented behavior. When neither exists, write `Not stated by the reporter.` rather than deciding
what the product ought to do.

### Actual Behavior

What happened instead. Include the error text verbatim in a fenced code block when there is one.

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
was first seen and last seen. `Not provided by the reporter.` when unknown.

This section decides how a fixer approaches the bug, so a one-line answer here is worth more than a
paragraph elsewhere.

### Impact and Affected Scope

Who is affected and how badly. One or two parties as prose; four or more as a table.

Cover the population (one user, a segment, everyone), the count when it is known, what those users
cannot do, and the business consequence. This is the evidence severity gets set from, so keep claims
tied to what was supplied. `Scope not established.` is a legitimate answer and is better than an
invented count.

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

Whether this used to work, and the last known good version or deploy. When the report does not say and
nothing verified it, write `Not established.` A confirmed regression with a version boundary is one of
the strongest signals a bug report can carry, so it is worth stating plainly when it exists and worth
not implying when it does not.

### Workaround

What an affected user can do right now. When there is none, write `None known.` Do not omit the
section: an explicit "no workaround" is itself the input severity depends on.

### Suspected Area

Where in the code the behavior lives, from the caller's `fix-proposer` findings, with the evidence tag
it came with. Paths and what each owns, no line numbers.

- `services/checkout/coupon.ts` — owns coupon validation and applies the discount `[OBSERVED]`

This section is orientation, not a cause. Keep it to what was read.

### Proposed Fix (unverified)

Appears only when the caller supplied a proposal that cleared `fix-proposer`'s confidence floor.
Reproduce it with its structure and its evidence tag intact:

> **Coupon reapplication reuses a discount object that was already consumed** `[OBSERVED]`
> (confidence: medium)
>
> - **Location:** `services/checkout/coupon.ts` → `applyDiscount`
> - **Now:** the function reads the cached discount for the code and mutates it in place.
> - **Why it produces the symptom:** the second call reads the object after the first call cleared its
>   amount, so the amount is undefined when the total is recomputed.
> - **Fix would change:** resolve a fresh discount per application, or reject a second application of
>   the same code.
> - **Blast radius:** two other callers apply discounts through the same function.
> - **Confirm by:** applying the same code twice against a local build and watching whether the second
>   call sees a cleared amount.
> - **Would raise confidence:** a reproduction against the version the reporter was on.

Never upgrade the tag, never restate it as a root cause, and never add a patch. When the caller
supplied no proposal, the section does not exist; do not write "no proposal found" as a section body.

### Where to Look

Two to five items from the caller's findings. Each names the tool, gives the ready-to-paste query, path,
or url, and says in one phrase what a hit or a miss tells you.

- **Code search:** `grep -rn "applyCoupon" services/ web/` — a single call site means the double
  application happens client-side.

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

### Fix Verification

How someone proves the bug is fixed. Two to five checkbox items, specific to this defect: the exact
scenario that must now pass, the regression that must not appear, the environment it should be verified
in, the test that should exist.

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

Skipped sections close the gap.

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
12. Suspected Area
13. Proposed Fix (unverified)
14. Where to Look
15. Missing Information
16. Fix Verification
17. Open Questions

The top runs symptom, then where, then how to see it: what a fixer needs in the order they need it.
Analysis sits below the facts so nobody mistakes a hypothesis for a report. Missing Information sits
below the analysis because it is the reporter's homework, not the fixer's.

When the caller passes `field_routing`, sections 2 through 7 leave the description and go to the
tracker's own fields (Environment to System Info; Preconditions, Steps, Expected, Actual, and Frequency
to Repro Steps). They appear in exactly one place.

---

## Worked example: a one-line report, honestly thin

Input: `checkout crashes when you apply a coupon twice`, with the reporter answering only the scope
question and skipping the rest.

```
=== BUG: Checkout: applying the same coupon twice crashes the page ===

--- DESCRIPTION (body) ---
## Summary
Applying a coupon code a second time crashes the checkout page and the cart total is lost. Reported as
a one-line report on 2026-07-28; scope confirmed by the reporter as multiple shoppers.

## Environment
Not provided by the reporter.

## Steps to Reproduce
1. Apply a coupon code at checkout.
2. Apply the same code again.

## Expected Behavior
Not stated by the reporter. The second application should not crash the page.

## Actual Behavior
The checkout page crashes and the cart total is lost. No error text was supplied.

## Frequency and Reproducibility
Not provided by the reporter.

## Impact and Affected Scope
Multiple shoppers cannot complete checkout after a repeated coupon application. The reporter did not
give a count, so the population size is not established.

## Regression
Not established.

## Workaround
None known.

## Suspected Area
- `services/checkout/coupon.ts` — owns coupon validation and applies the discount `[OBSERVED]`

## Where to Look
- **Code search:** `grep -rn "applyCoupon" services/ web/` — a single call site means the double
  application happens client-side.

## Missing Information
- Which environment and app version was this on?
- What browser and OS?
- What exactly appears on the crash: a blank page, an error message, a stack trace?
- Does it happen every time, and when was it first seen?
- How many shoppers have hit this?

## Fix Verification
- [ ] Applying the same coupon twice leaves the cart total intact and shows a clear message
- [ ] A regression test covers a repeated application of one code
- [ ] No change to single-application discount totals
```

Two things to notice. The steps are the reporter's own two actions restated, not an invented six-step
sequence. And there is no Proposed Fix, because reading the coupon path explained a double discount but
not a crash, so `fix-proposer` withheld one and only the Suspected Area survived.
