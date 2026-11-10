---
name: test-case-designer
description: "Turns the acceptance-analyzer coverage model into an executable browser test plan. Layers UI and browser heuristics (validation, navigation, session, permissions, state, responsive, accessibility, console and network health, regression of PR-touched areas) on top of the formal test design, designs one minimal shared test data set that many cases reuse so cleanup is trivial, orders cases so records flow through their lifecycle, and writes each case with an AC trace, preconditions, data reference, concrete steps and an observable expected result. Adds exploratory charters and a cleanup plan. Invoked by the qa-tester agent in Phase 3."
metadata:
  author: Taha Bikanerwala
---

# Test Case Designer

Input: the `acceptance-analyzer` coverage model, the normalized `acceptance_criteria`, `business_rules`, `discrepancies`, `risk_areas`, the environment (`production`, `allow_mutations`), `auth.roles`, `coverage_extras`, `viewports`, `test_data_prefix`, and the provider.

Output: `test_plan` (shape at the end). Load `references/ui-qa-heuristics.md` before designing.

## 1. Start from the coverage model

Every analyzer behavior becomes one or more cases. Keep the analyzer's technique, priority, and classes. An Outline-style behavior (several values over one action) becomes **one case with a data table**, executed row by row, each row reported separately inside that case. Do not explode it into separate cases.

Expected results come only from the ACs, `business_rules`, and AC amendments. When the AC is silent on the exact outcome (error text, redirect target), write the expected result at the level the AC supports ("an error explains the email is invalid and the form is not submitted") and add a non-blocking question for the exact text. Do not copy the expected result from the code or the PR.

## 2. Add the UI and browser layer

Walk `references/ui-qa-heuristics.md` against each AC and each risk area. Add a case only when the heuristic applies to this feature; a form with no free text needs no unicode case. Tag added cases `inferred` and trace them to the nearest AC (or `REG` for regression, `NFR` for cross-cutting checks).

Always include, whatever the feature:
- **Console and network health** as a standing assertion on every case (no uncaught errors, no unexpected 4xx/5xx), not as a separate case.
- **Regression** cases for each `risk_area` with `blast_radius: wide`: the main flows of the other pages that share the changed code, one smoke case each.
- **A discrepancy check** for each `contradicts-ac` discrepancy: a case that tests the exact disputed value or behavior, so the report can say which version shipped.

Then `coverage_extras`:
- `responsive`: re-run the smoke cases at each viewport in `viewports`; add layout cases (no horizontal scroll, nothing clipped or overlapping, touch targets usable, menus collapse).
- `accessibility`: keyboard-only pass of the main flow, visible focus, labels on inputs, error announcements tied to fields, contrast on new UI, dialog focus trap and Escape.
- `lighthouse`: one audit per changed page (chrome-devtools only; otherwise the case is `Not testable` with that reason).
- `permissions`: a role × action matrix from `auth.roles` for every protected action the ACs mention, plus the unauthenticated case and direct-URL access.

## 3. Design the minimal shared test data set

This is a hard requirement: **create as little data as possible and test as many things as possible on the same records**, so the run is fast and cleanup is easy.

Procedure:

1. **List the data each case needs**: entity type, the state it must be in, the role that owns it, and whether the case only reads it, changes it reversibly, or changes it irreversibly (delete, submit, archive, send).
2. **Prefer existing data.** Any read-only case uses existing seed or production-like data when the environment has it (a list page, a search, a detail view). Note "uses existing data" and the record it expects to find; preflight verifies it exists.
3. **Merge needs into the fewest records.** Cases that need the same entity type in compatible states share one record. Validation and boundary checks on a form do not need a saved record at all; they run on the unsaved form, with only the final valid submission creating anything.
4. **Chain the lifecycle.** Order the cases so one record moves forward through its states: create (`TC` that verifies creation) → read and list checks → edits and boundary edits on the same record → state transitions in their valid order → invalid-transition checks at the state where each is invalid → delete last (which also serves as the delete test and the cleanup). One record can carry a whole CRUD and state-machine suite.
5. **Revert reversible changes in place.** When a case changes a field another case depends on, its last step restores the value, or the next case is ordered to need the changed value.
6. **Split only when you must.** Create a second record only when a case would leave the shared one in a state that later cases cannot use (an irreversible transition while other cases still need the earlier state), when two roles must each own a record, or when a concurrency case needs two. Write the reason next to the record.
7. **Name everything with the prefix.** Every created record's visible name or identifier starts with `test_data_prefix` (`{id}` replaced), for example `qa-1234-order-A`. Free-text values that must be unique add a short suffix (`qa-1234-order-A-7f3`).
8. **Plan the cleanup.** For each record: deleted by a case (which one), deleted in cleanup (how: UI action, or left for manual removal), or cannot be deleted (say so; it will be reported).

If `allow_mutations` is false for the environment, no record is created: every case that would create or change data is planned as `Skipped (mutation guard)` and the read-only cases use existing data only.

Target: a typical ticket needs one to three records. More than five for a single ticket means the design is wrong; revisit step 3 and 4 before accepting it.

## 4. Write each case

Every case is executable by someone who has never seen the app:

- `id`: `TC-01`, `TC-02`, ... in execution order.
- `title`: the behavior, phrased as an outcome ("Saving with an empty name shows a required-field error").
- `trace`: `AC-n` (or `AC-n, AC-m`), `REG`, `NFR`, or `D-n` for a discrepancy check.
- `type`: positive | negative | boundary | state | permission | data-variety | navigation | responsive | accessibility | regression.
- `priority`: P1 (smoke, blocks release) | P2 (high) | P3 (regression) | P4 (edge).
- `technique`: EP, BVA, decision table, state transition, error guessing, etc.
- `role` and `viewport`.
- `data`: the data set record(s) used (`R1`, `R2`) or `none` or `existing: <what>`. Plus input values, or a data table for outline-style cases.
- `preconditions`: state the record and app must be in, including which earlier case leaves it that way.
- `steps`: numbered, concrete UI actions using visible labels ("Click **Save**", "Type `qa-1234-order-A` in **Name**").
- `expected`: observable outcome(s) a browser can confirm: text shown, element state, URL, list contents, field value after reload. Several related postconditions of one action belong in one case.
- `mutates`: none | reversible | irreversible.
- `automatable`: yes | partial (needs a human step, e.g. email) | no (with the reason). A `no` here is planned now as `Not testable` with its reason and question, so execution does not discover it late.

Keep each case failing for exactly one reason. Do not chain unrelated behaviors to save data; reuse the **record**, not the **case**.

## 5. Exploratory charters

Two to four charters aimed at `risk_areas` and the gaps the ACs leave, each: mission ("Explore the order edit form with unusual but valid input to find data-loss or validation gaps"), area, data it may use (shared records only), and what to look for. Charters do not create new records unless they say so.

## 6. Order and output

Order: setup and data creation first, then P1 smoke, then the lifecycle chain, then the rest by priority, cleanup cases last, mutation-guard skips listed but not ordered. Within that, group by role to minimize logins, and by viewport to minimize resizes.

```
test_plan:
  data_set:  [{ ref: R1, kind, name, created_by: TC-xx|existing, used_by: [TC...], end_state, cleanup: "deleted by TC-14" | "deleted in cleanup via <action>" | "cannot delete: <why>", reason_for_separate_record? }]
  cases:     [{ id, title, trace, type, priority, technique, role, viewport, data, preconditions, steps, expected, mutates, automatable, planned_status? }]
  charters:  [{ id: EX-n, mission, area, data, look_for }]
  order:     [TC-01, TC-02, ...]
  cleanup:   [{ ref, action }]
  coverage:  [{ ac, cases: [...] }]            # every AC must have at least one case
  questions: [{ text, unblocks: [...], kind }]
```

Before returning, check: every AC has at least one case; every created record is named with the prefix and has a cleanup line; no expected result cites the PR or code; the record count is the smallest the cases allow.
