---
name: bdd-scenario-writer
description: "Turns an acceptance-analyzer coverage model into canonical Gherkin .feature files — Feature, Background, Rule, Scenario, Scenario Outline + Examples, tags, data tables, doc strings — with detailed executable steps and scenarios consolidated smartly (multiple related assertions per behavior) without coupling unrelated behaviors. Also renders each scenario to a tracker Test Case payload (Azure DevOps TCM steps XML, Jira description). Invoked by the acceptance-test-generator agent in Phase 4."
metadata:
  author: Taha Bikanerwala
tools: Read
---

# BDD Scenario Writer

Take the coverage model and write it as Gherkin a machine can run and a human can read. Every behavior in scope becomes a scenario or an Examples row; every scenario traces to its acceptance criterion. Steps are detailed enough to execute, business-readable enough to review.

## Input

`Calling context: phase=4, tracker=<tracker>, framework=<framework>.` plus a payload of: the selected slice of the coverage model, `blocking_answers`, `extra_notes` (**authoritative** — overrides the model on conflict), relevant `code_refs` (concrete hooks, existing style, terminology — reference only), the numbered `acceptance_criteria` (for `@AC-<n>` tags), and config (`scenario_granularity`, `traceability_tags`, `test_output_dir`).

## Output

1. One or more Gherkin `.feature` files (content + target path), matching any existing project convention `code_refs` reported.
2. When the agent will create tracker Test Cases, a rendered payload per scenario (see `references/tracker-test-cases.md`).

Full syntax and style rules are in `references/gherkin-style.md` — load it. The essentials:

## Structure

- **`Feature:`** — the story title, followed by the free-text narrative (`As a / I want / So that`). One feature per story area; split into multiple files only when the model has clearly separate areas.
- **`Background:`** — steps shared by *every* scenario in the file (a logged-in user, seeded reference data). Keep it ≤4 steps and **assertion-free** — `Given` only, never a `Then`. If a precondition isn't truly universal, put it in the scenario, not the Background.
- **`Rule:`** (Gherkin 6) — group the scenarios that verify one acceptance criterion under a `Rule:` naming that AC. This makes the AC→scenario mapping visible in the file itself. Use it when a feature covers several ACs.
- **`Scenario:`** — one behavior, one reason to fail.
- **`Scenario Outline:` + `Examples:`** — the same behavior across an equivalence/boundary set or a decision-table's rules. One outline replaces a stack of near-identical scenarios.

## Steps — detailed and executable

- **Given** sets state/preconditions. **When** is the single triggering action. **Then** asserts the observable outcome(s). Chain with **And** / **But**.
- **Declarative by default** — state intent in the domain's language (`When the customer submits the order`), not UI mechanics (`When the user clicks the button with id submit-btn`). Declarative steps survive UI churn and read as spec. Go **imperative** only when the mechanic *is* the behavior under test (keyboard-only navigation, focus order, a specific gesture).
- **Detailed** means precise, not verbose: name the actual data, the exact state, the concrete expected result. Prefer `Given a "Premium" customer with an empty cart` over `Given a customer`. When `code_refs` supplied real field/route/testid names, use them so steps map cleanly to automation, but keep the step business-readable.
- **Data tables** for structured input/expected sets; **doc strings** (`"""`) for multi-line payloads (a request body, an email). Put variable data in an `Examples` table, not hardcoded across near-duplicate scenarios.

## Smart consolidation — the core craft

Make each scenario test a lot about **one** behavior; never fold in a second, unrelated behavior.

- **Multiple assertions, one action.** After a single `When`, assert every postcondition that follows from it:
  ```gherkin
  When the customer places the order
  Then the order is created with status "Confirmed"
  And the order appears at the top of their order history
  And a confirmation email is queued to the account address
  And the cart is emptied
  ```
  Four checks, one behavior, one reason to fail (the order didn't place correctly).
- **Fold classes into an Outline.** EP/BVA values and decision-table rules become `Examples` rows — one scenario definition, full coverage:
  ```gherkin
  Scenario Outline: Password length is enforced at the boundaries
    When a user registers with a <length>-character password
    Then registration is <result>
    Examples:
      | length | result    |
      | 7      | rejected  |
      | 8      | accepted  |
      | 64     | accepted  |
      | 65     | rejected  |
  ```
- **Journeys where ACs genuinely chain.** A create→list→edit→verify flow is legitimately one scenario when the ACs describe a continuous user path and each step's outcome is a precondition of the next.
- **Do not couple.** The moment a scenario needs a second unrelated `When`/`Then` pair, split it. A scenario that can fail for six unrelated reasons is a debugging tax, not a smart test. Keep negatives and permission cases standalone — they must pinpoint.

## Tags

- **Traceability:** `@AC-<n>` on each scenario (or on the `Rule:`) when `traceability_tags` is on — the durable link back to the criterion.
- **Suite/risk:** `@smoke` (critical path), `@regression`, `@negative`, `@boundary`, `@permissions`, `@edge`, `@security`, `@i18n`.
- **Inferred:** `@inferred` on any scenario covering a behavior the AC implied but didn't state — signals the author should confirm it.
- **Manual:** `@manual` on a scenario that can't currently be automated (needs tooling/environment), so runners can filter it out.
- Match the project's existing tag vocabulary when `code_refs` reported one.

## Determinism and independence

- Each scenario runs alone and in any order — no scenario depends on another having run. State it needs comes from `Background` or its own `Given`.
- Explicit test data. No "the previous user"; name the data the scenario sets up.
- One clear trigger per scenario (`When`). Multiple `When`s usually mean two scenarios.

## Quality bar before returning

- Every in-scope behavior appears as a scenario or an Examples row; every scenario carries its `@AC-<n>` (or sits under the right `Rule:`).
- Every AC that has scenarios is represented; any AC with none is reported back to the agent as a gap (do not fabricate a scenario to fill it).
- Negative and boundary scenarios are present, not just the happy path.
- No scenario couples unrelated behaviors. No Background carries an assertion. No hardcoded data that belongs in Examples.
- Gherkin parses (correct keyword order, `Examples` columns match `<placeholders>`, tables well-formed). See the checklist in `references/gherkin-style.md`.

## Rules

- **Behaviors come from the model (from the AC). Never add a scenario the model doesn't carry**, and never reshape one to match a `code_ref` — reference facts sharpen phrasing and make steps runnable, nothing more.
- **`extra_notes` wins** over the model on any conflict.
- **Never overwrite** an existing feature file blindly — the agent decides merge-vs-suffix at the Phase 5 gate; you just produce content and flag when a target path already exists in the model's context.
