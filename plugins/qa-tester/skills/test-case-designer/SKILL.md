---
name: test-case-designer
description: "Turns an acceptance-analyzer coverage model into an executable browser test plan. Models the feature's screens, controls and states, always adds functional and navigation cases plus the test types chosen for the run, attacks every rule the way a QA tries to break things, reviews its own plan for gaps, and fits it all on one minimal shared data set. Refines the plan from the browser reconnaissance inventory (phase=refine). Invoked by the qa-tester agent in Phases 3 and 4b."
metadata:
  author: Taha Bikanerwala
---

# Test Case Designer

**Input, `phase=design` (default):** the `acceptance-analyzer` coverage model, the normalized `acceptance_criteria`, `business_rules`, `discrepancies`, `risk_areas`, the PR's changed files, `test_types` (always `functional` and `navigation`, plus whichever types the run chose), the environment (`production`, `allow_mutations`), `auth.roles`, `viewports`, `test_data_prefix`, the provider, and `missing_capabilities` (what the provider cannot do; plan those cases as `Not testable (provider lacks <capability>)`).

**Input, `phase=refine`:** the current `test_plan` and the `recon` inventory from the executor. See the last section.

Output: `test_plan` (shape at the end). Load `references/ui-qa-heuristics.md` before designing.

The analyzer's model is the floor, not the plan. It reads only the ACs, so it derives the rules, inverses and break-it behaviors the AC text supports, but it misses what a QA finds by looking at the screen: controls the ACs never mention, their states, the routes and dialogs around them, and everything the AC author took for granted. This skill adds those, and it thinks like someone trying to break the feature, not someone confirming it works.

## 1. Model the feature

Before writing any case, build a model of what the user will touch. Sources:

- the ACs, description and business rules (the screens, buttons, fields and messages they name);
- the PR's changed UI files. Open up to ten templates, components or route definitions to list screens, routes and controls by their visible labels. Read them for **what exists**, never for **how it should behave**;
- in `phase=refine`, the recon inventory of the real screens.

Build four parts:

1. **Screens and routes.** Every page, route, tab, dialog, drawer and wizard step the change adds or touches, with each way in and each way out.
2. **Control rules.** Start from the analyzer's `Rules` (keep their `CR-n` ids and their inverse behaviors). Then, for every interactive control on those screens, add the rules the analyzer could not see: when the control is visible, enabled, read-only, selected or loading, as one-line rules numbered after the analyzer's. Where an AC states the rule, cite it (`oracle: ac`). Where it does not, write the rule the AC implies and mark it `implied`. For example, "**Run** is enabled once the query is valid" implies "**Run** is disabled whenever the query is not valid, including straight after the query is edited".
3. **States and transitions.** The UI states (pristine, dirty, invalid, valid, saving, saved, stale, error) and the record's lifecycle states, with every transition between them. Include the backward transitions: editing after a save, re-entering a completed step, cancelling half way, retrying after an error.
4. **Data flow.** Where each input goes and everywhere it shows up again (list, detail, header, other pages, exports), so every write gets a "shows up everywhere, survives a reload" check.

The model goes into the plan so a reviewer can see what was considered.

## 2. Start from the coverage model

Every analyzer behavior becomes one or more cases. Keep the analyzer's technique, priority, classes and oracle. Its `adversarial` and navigation behaviors become cases of the same type; the break-it pass in step 4 adds only what they lack. An Outline-style behavior (several values over one action) becomes **one case with a data table**, executed row by row, with each row reported separately inside that case. Do not explode it into separate cases.

## 3. Derive cases from the model (always)

- **Functional.** Test every control rule in both directions and through every input path, following "Control states and invalidation" in the heuristics. Test every transition in the state model, valid and invalid, including every backward one. Check every write after a reload and everywhere the data flow says it appears.
- **Navigation.** For every screen and route in the model, walk the Navigation heuristics: ways in and out, Back and Forward, Back after a write, refresh, deep links signed in and signed out, bad ids, the unsaved-changes guard, URL state.
- **Console and network health** is a standing assertion on every case (no uncaught errors, no unexpected 4xx or 5xx), not a separate case.
- **Regression** cases for each `risk_area` with `blast_radius: wide`: the main flows of the other pages that share the changed code, one smoke case each.
- **A discrepancy check** for each `contradicts-ac` discrepancy: a case that tests the exact disputed value or behavior, so the report can say which version shipped.

## 4. Break it

Walk the ten "Break it" questions in the heuristics against every AC, every control rule and every state transition. Every answer that could reveal a defect becomes a case with `type: adversarial`. Be specific about the action and the observable result. Question 3 ("change it after it worked") applies to every step that enables, unlocks or produces something. Never skip it.

Thorough is the goal. Padding is not. A case that could not reveal a defect this feature could plausibly have is padding.

## 5. Add the chosen test types

For each type in `test_types` beyond `functional` and `navigation`, walk its section of the heuristics against each screen and AC. Types not chosen get no cases. They are listed in the plan's scope as not selected, so the report can say they were not covered.

`missing_capabilities` still applies. A Lighthouse audit on Claude in Chrome, for example, is planned as `Not testable (provider lacks Lighthouse)`.

## 6. Expected results and their oracle

Every case records where its expected result comes from:

- `ac`: an AC, a business rule or an amendment states it.
- `implied`: it follows from a condition an AC states. For example, the enabling condition no longer holds, so the control is disabled again. Name the AC.
- `convention`: no AC speaks to it, but users would expect it anyway. Examples: a disabled control cannot be triggered, Back does not resubmit, saved data survives a reload, input renders as text and never runs as script, an error clears once fixed. Name the convention in one phrase.

Never take an expected result from the PR or the code. When the AC is silent on the exact outcome (error text, redirect target), write the expected result at the level the AC supports ("an error explains the email is invalid and the form is not submitted") and add a non-blocking question asking for the exact text.

A `convention` case runs and can fail like any other. The report files its failure as a defect one priority lower and asks whether the behavior is intended.

## 7. Design the minimal shared test data set

This is a hard requirement: **create as little data as possible and test as many things as possible on the same records**, so the run is fast and cleanup is easy. Adversarial, navigation and re-edit cases reuse the records the lifecycle already creates. Most navigation cases need no data at all, or one existing record.

Procedure:

1. **List the data each case needs**: entity type, the state it must be in, the role that owns it, and whether the case only reads it, changes it reversibly, or changes it irreversibly (delete, submit, archive, send).
2. **Prefer existing data.** Any read-only case uses existing seed or production-like data when the environment has it (a list page, a search, a detail view). Note "uses existing data" and the record it expects to find; preflight verifies it exists.
3. **Merge needs into the fewest records.** Cases that need the same entity type in compatible states share one record. Validation, boundary and control-state checks on a form do not need a saved record at all. They run on the unsaved form, and only the final valid submission creates anything.
4. **Chain the lifecycle.** Order the cases so one record moves forward through its states: create (`TC` that verifies creation) → read and list checks → edits, re-edits and boundary edits on the same record → state transitions in their valid order → invalid-transition checks at the state where each is invalid → delete last, as the delete test. The delete case is a test, not the cleanup. Give it a precondition on every earlier case that used the record, so that if one of them failed reproducibly, the delete case is `Blocked (precondition)` and the record survives for recording the defect and for debugging. One record can carry a whole CRUD and state-machine suite.
5. **Revert reversible changes in place.** When a case changes a field another case depends on, its last step restores the value, or the next case is ordered to need the changed value.
6. **Split only when you must.** Create a second record only when a case would leave the shared one in a state later cases cannot use (an irreversible transition while other cases still need the earlier state), when two roles must each own a record, or when a concurrency case needs two. Write the reason next to the record.
7. **Name everything with the prefix.** Every created record's visible name or identifier starts with `test_data_prefix` (`{id}` replaced), for example `qa-1234-order-A`. Free-text values that must be unique add a short suffix (`qa-1234-order-A-7f3`).
8. **Plan the cleanup.** For each record, say whether it is deleted by a case (which one), deleted in cleanup (how: a UI action, or left for manual removal), or cannot be deleted (say so; it will be reported). The cleanup plan is not run automatically. The agent runs it at the end, only after the user agrees, or on production when every case passed.

If `allow_mutations` is false for the environment, no record is created: every case that would create or change data is planned as `Skipped (mutation guard)` and the read-only cases use existing data only.

Target: a typical ticket needs one to three records. More than five for a single ticket means the design is wrong; revisit steps 3 and 4 before accepting it.

## 8. Write each case

Every case is executable by someone who has never seen the app:

- `id`: `TC-01`, `TC-02`, ... in execution order.
- `title`: the behavior, phrased as an outcome ("Editing the query after a successful run disables **Run** again").
- `trace`: `AC-n` (or `AC-n, AC-m`), plus the control rule when there is one (`AC-2, CR-3`), or `REG`, `NFR`, or `D-n` for a discrepancy check.
- `category`: functional | navigation | ui | accessibility | security | responsive | performance | permissions | resilience | regression.
- `type`: positive | negative | boundary | state | data-variety | adversarial.
- `priority`: P1 (smoke, blocks release) | P2 (high) | P3 (regression) | P4 (edge). A control rule's "turns back off" case on a P1 flow is P2. An adversarial case is P3, raised to P2 when its failure would corrupt data or let an action run in an invalid state. Security cases are P2.
- `technique`: EP, BVA, decision table, state transition, error guessing, and so on.
- `oracle`: ac | implied (AC-n) | convention (named).
- `role` and `viewport`.
- `data`: the data set record(s) used (`R1`, `R2`), or `none`, or `existing: <what>`. Plus input values, or a data table for outline-style cases.
- `preconditions`: the state the record and the app must be in, including which earlier case leaves it that way.
- `steps`: numbered, concrete UI actions using visible labels ("Click **Save**", "Type `qa-1234-order-A` in **Name**", "Press browser **Back**").
- `expected`: observable outcomes a browser can confirm: text shown, the URL, list contents, a field value after reload, and control state as the accessibility tree reports it (disabled, expanded, checked), never as colour or appearance. Several related postconditions of one action belong in one case.
- `must_not_change`: what the action must leave untouched (other fields, other records, the previous page's state), when that is part of the risk.
- `mutates`: none | reversible | irreversible.
- `automatable`: yes | partial (needs a human step, e.g. email) | no (with the reason). A `no` here is planned now as `Not testable` with its reason and question, so execution does not discover it late.

Keep each case failing for exactly one reason. Do not chain unrelated behaviors to save data; reuse the **record**, not the **case**.

## 9. Exploratory charters

Two to four charters aimed at `risk_areas` and the gaps the ACs leave. Each has a mission ("Try to break the query editor: edit, undo, re-run and navigate away in unusual orders, looking for stale results and controls in the wrong state"), an area, the data it may use (shared records only), and what to look for. At least one charter is a break-it session on the most complex screen in the model. Charters do not create new records unless they say so.

## 10. Review the plan for gaps

Before returning, review the plan as a second QA who did not write it and is hunting for what it missed:

1. Walk "Commonly missed" in the heuristics and add a case for every line that applies and has none.
2. Fill the coverage grid: every screen in the model against every category in `test_types`. Each cell needs at least one case, or a one-phrase reason in `skipped`.
3. Every control rule has a case that turns it on and a case that turns it back off. Every AC has at least one negative or adversarial case.
4. Every AC has at least one case. Every created record carries the prefix and has a cleanup line. No expected result cites the PR or the code. The record count is the smallest the cases allow.

Record every heuristic you considered and skipped in `skipped`, one line each with its reason, grouped by category.

## 11. Order and output

Order: setup and data creation first, then P1 smoke, then the lifecycle chain, then the rest by priority, delete cases last, mutation-guard skips listed but not ordered. Within that, group by role to minimize logins, and by viewport to minimize resizes.

```
test_plan:
  scope:     { included: [functional, navigation, ...], not_selected: [...] }
  model:     { screens: [{ name, route, entries: [...], exits: [...] }],
               rules: [{ id: CR-n, control, rule, oracle, source }],
               states: [...], transitions: [{ from, to, trigger }] }
  data_set:  [{ ref: R1, kind, name, created_by: TC-xx|existing, used_by: [TC...], end_state, cleanup: "deleted by TC-14" | "deleted in cleanup via <action>" | "cannot delete: <why>", reason_for_separate_record? }]
  cases:     [{ id, title, trace, category, type, priority, technique, oracle, role, viewport, data, preconditions, steps, expected, must_not_change?, mutates, automatable, planned_status?, added_after_recon? }]
  charters:  [{ id: EX-n, mission, area, data, look_for }]
  order:     [TC-01, TC-02, ...]
  cleanup:   [{ ref, action }]
  coverage:  [{ ac, cases: [...] }]            # every AC must have at least one case
  grid:      [{ screen, category, cases: [...] | skipped: "<reason>" }]
  skipped:   [{ category, heuristic, reason }]
  questions: [{ text, unblocks: [...], kind }]
```

## phase=refine

Input: the `test_plan` and `recon: { screens: [{ url, title, controls: [{ role, name, state }], text: [...], navigation: [...] }], not_reached: [...], console: [...] }`.

1. Compare each recon screen and control with the model. Add whatever is missing to the model, then design for it with the same rules as above. A new control gets its rules and both-direction cases. A new route, tab or dialog gets the navigation set. A control whose observed state seems to contradict an AC gets a case that tests it. Recon is not a verdict; the case is.
2. Text the ticket quotes that is missing or different on screen becomes a `ui` case when `ui` is selected, and a question otherwise.
3. Fit the new cases into the existing data set and order. Add a record only when rule 6 of step 7 requires it. New ids continue after the highest existing one, carry `added_after_recon: true`, and are placed by `order`. Never renumber existing cases.
4. Re-run the gap review (step 10) on the new parts.

Return the updated `test_plan` and `recon_delta: { screens, controls, added: [ids], notes }`.
