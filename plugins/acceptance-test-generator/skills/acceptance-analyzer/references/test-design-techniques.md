# Test-design techniques — worked reference

A field guide to the techniques the analyzer applies, each with a worked example drawn from acceptance criteria (never from code). Use it to decide which technique fits a behavior and what values it produces.

## Equivalence Partitioning (EP)

Split the input domain into classes that the spec says behave identically, then test one value per class. Valid classes and **each** invalid class are all distinct.

> AC: "A discount code is 6–10 uppercase alphanumeric characters."

Classes:
- valid: `"SAVE20"` (6), `"BLACKFRIDAY"` is 11 — no; use `"NEWUSER10"` (9).
- invalid — too short: `"SAVE"` (4).
- invalid — too long: `"SUPERSAVER99"` (12).
- invalid — lowercase: `"save20"`.
- invalid — non-alphanumeric: `"SAVE-20"`.
- invalid — empty: `""`.

Six classes, six representatives. The lowercase and the symbol failures do **not** merge — they are different rules and may have different messages.

## Boundary Value Analysis (BVA)

Bugs cluster at edges. For any bounded/ordered input test `min-1, min, min+1, max-1, max, max+1` (plus zero/empty where meaningful).

> AC: "Password must be 8–64 characters."

Values: 7 (reject), 8 (accept), 9 (accept), 63 (accept), 64 (accept), 65 (reject). Fold these into a `Scenario Outline` with an `Examples` table of `length | accepted?`.

> AC: "Cart may hold up to 50 items."

Values: 0 (empty-cart behavior), 1, 49, 50 (accept), 51 (reject with the limit message).

## Decision Table

When the outcome depends on a **combination** of conditions, enumerate them. Keep every rule that changes the result; collapse don't-cares.

> AC: "Standard users get free shipping over $50. Premium users always get free shipping. Nobody gets free shipping on oversized items."

| # | User | Order ≥ $50 | Oversized | Free shipping? |
|---|------|-------------|-----------|----------------|
| 1 | Standard | no | no | No |
| 2 | Standard | yes | no | Yes |
| 3 | Standard | yes | yes | No |
| 4 | Premium | no | no | Yes |
| 5 | Premium | any | yes | No |

Five rules → a `Scenario Outline` whose `Examples` rows are the table. This is far tighter than five prose scenarios and covers the interaction of the conditions, which single-variable tests miss.

## State-Transition Testing

For a lifecycle, test valid transitions, invalid transitions, and guards.

> AC: "An expense moves Draft → Submitted → Approved → Reimbursed. A submitter may recall a Submitted expense back to Draft. Approved expenses cannot be edited."

- Valid: Draft→Submitted, Submitted→Approved, Approved→Reimbursed, Submitted→Draft (recall).
- Invalid (must be rejected): Draft→Approved (skip), Approved→Draft (edit after approval), Reimbursed→anything.
- Guard: only the submitter may recall; an approver recalling is a different (probably rejected) case.

Each invalid transition is its own negative scenario — the ones teams forget are exactly the "you can't do that from here" cases.

**Backward transitions** on the same lifecycle, the other set teams forget:

- Recall, then resubmit: Submitted→Draft→Submitted works, and the approver sees the latest version (`implied`).
- Cancel half way through editing a Draft: the saved Draft is unchanged (`convention`).
- A submit that fails validation: the expense stays Draft with the input kept, and fixing it and submitting again works once (`implied`).
- Edit a field, then restore its original value: is the form clean again or still unsaved? The AC is silent, so this is an Open Question.

## Rules, inverses and invalidation

An AC usually states only the condition that turns something on. Write it as a rule and test both halves.

> AC: "The **Export** button is enabled once at least one row is selected and a format is chosen."

Rule CR-1: Export is enabled when 1+ rows are selected **and** a format is chosen.

| # | Rows selected | Format chosen | Export |
|---|---|---|---|
| 1 | none | no | disabled (`implied`) |
| 2 | 1+ | no | disabled (`implied`) |
| 3 | none | yes | disabled (`implied`) |
| 4 | 1+ | yes | enabled (`ac`) |

Then the moments the condition **stops** holding after Export was enabled: the last row is deselected, the format is cleared. Both make Export disabled again, so they fold into one outline with a `change` column (`implied`). Pressing the export keyboard shortcut while Export is disabled does nothing (`convention`). Does a selection survive filtering the list? The AC does not say, so that is an Open Question.

> AC: "After the address is verified, the customer can place the order."

Verification produces something ("verified") that depends on the address. Changing the postcode after verification, or picking a different saved address, makes the address unverified and disables **Place order** until it is verified again (`implied`). That is one outline with two triggers. This invalidation case is the one suites most often miss.

## Break it

The adversarial sweep, asked of every AC and every rule: do it **twice**; do it **out of order**; **change it after it worked**; **undo** it; **abandon** it half way; **fail, then recover**; **get round the guard** by another route; **two at once**; and list **what else should change and what must not**. Each answer that could reveal a defect is a behavior of type `adversarial`.

> AC: "A shopper can apply one discount code to the cart."

- Twice: applying the same code again does not apply the discount twice.
- Out of order: applying a code to an empty cart (Open Question if the AC is silent on the outcome).
- Change it after it worked: removing an item so the cart drops below the code's minimum spend; the discount is removed or recalculated (`implied` if the AC states a minimum).
- Undo: removing the code restores the original total.
- What must not change: applying a code does not change item quantities or the shipping address.

## Navigation and flow

When the story describes screens or a flow.

> AC: "After submitting the expense, the user sees a confirmation page."

- Back from the confirmation page does not submit a second expense (`convention`).
- Refreshing the confirmation page does not submit again (`convention`).
- The confirmation URL for an expense that does not exist shows a not-found state (`convention`).
- Opening the confirmation URL signed out leads to sign-in, then back to the confirmation (`convention`).

## Negative / Error-path Analysis

For every input and action, ask what breaks. A checklist to run per field/action:

empty · missing · null/blank · whitespace-only · malformed · wrong type · too long · too short · duplicate · not-found · unauthorized · unauthenticated · expired/stale · conflicting · out-of-range · dependency-unavailable · timeout.

Each failure the AC names is a required scenario. Each failure the AC *implies* but doesn't state is a candidate — include it tagged `@inferred` and raise the expected behavior as an Open Question if the message/outcome isn't specified.

## Permission / Role Matrix

actor × action, with the denial shape.

> AC: "Managers can approve leave; employees can only request it."

| Actor | Request | Approve own | Approve other | View team |
|-------|---------|-------------|---------------|-----------|
| Employee | Yes | n/a | Denied (403/hidden) | Own only |
| Manager | Yes | Denied (segregation) | Yes | Yes |
| Unauthenticated | Redirect to login | — | — | — |

Note *how* denial manifests (hidden control vs error vs read-only) — the AC should say; if it doesn't, Open Question.

## Concurrency / Idempotency / Ordering

Relevant when state is shared or a write can repeat.

- **Double-submit:** clicking "Pay" twice charges once (idempotency key / disabled button).
- **Lost update:** two users edit the same record; last-write-wins vs optimistic-lock conflict — which does the AC promise?
- **Retry after timeout:** the request succeeded server-side but the client retried.
- **Out-of-order:** event B arrives before event A.

Only pull these in when the domain (payments, inventory, bookings, collaborative editing) makes them real.

## Data-variety stress

For free-text and locale-sensitive inputs: leading/trailing/only whitespace, unicode + emoji, very long strings, case sensitivity, `'`/`<script>` treated as *data-safety* expectations (stored/escaped, never executed), numbers with separators/negatives/decimals/precision, timezones + DST, leap years, currency + locale formatting, RTL text. Pick what the field's domain warrants.

## ZOMBIES as the closing sweep

After the technique-specific values, walk **Z**ero, **O**ne, **M**any, **B**oundaries, **I**nterfaces, **E**xceptions, **S**imple. It catches the empty-list rendering, the pagination boundary, and the "what does the neighbouring feature receive" case that per-field analysis skips.

## Consolidation vs coupling — the judgment call

The goal is scenarios that test a lot **per behavior**, not scenarios that test many behaviors.

- **Consolidate (good):** assert every postcondition of one action (`Then the order is created / And it appears in the list / And a confirmation email is queued`); fold an EP/BVA set into one `Scenario Outline`; run a realistic journey where the ACs genuinely chain.
- **Couple (bad):** stitch unrelated behaviors into one scenario to cut the count — now a failure could mean six different things and the report is useless.

Rule of thumb: a scenario may have many `Then`s if they all follow from one `When`. The moment you need a second unrelated `When`-`Then` pair, it's a second scenario.
