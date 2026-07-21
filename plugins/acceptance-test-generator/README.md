# acceptance-test-generator

Turns a user story and its acceptance criteria into a rigorous BDD test suite. Point it at a story — a tracker URL, a spec file, or pasted text — and it decomposes every acceptance criterion with real test-design technique, writes canonical Gherkin `.feature` files with smartly consolidated scenarios, and can create each scenario as a Test Case work item in your tracker, linked back to the story.

Built for the BA/QA who has to turn "here's the story, write the tests" into coverage that actually holds.

## The one rule

**Test cases come only from the story and its acceptance criteria.** The acceptance criteria are the spec; every scenario traces to one. The codebase is read **read-only, for reference** — real `data-testid`s and route names to make steps executable, the existing `.feature` style to match, domain terminology, and spec-vs-code **drift** — but a fact from the code never becomes the basis of a test. Testing what the code does just re-encodes its bugs; this plugin tests what the story *promises*. Where code and AC disagree, you get an Open Question, not a silently-adjusted test.

## Install

```
/plugin install acceptance-test-generator@jt-bikanerwala-marketplace
```

Auto-installs `issuekit`. Bring your own tracker MCP (Azure DevOps or Jira) if you want to read stories from the tracker or create Test Case work items. With no tracker, it still reads a pasted/file story and writes `.feature` files locally.

## Use

```
@acceptance-test-generator write acceptance tests for PROJ-456
```

or the slash commands:

```
/acceptance-test-generator:coverage PROJ-456      # read-only: the coverage plan + gaps
/acceptance-test-generator:run PROJ-456           # generate .feature files (+ optional Test Cases)
/acceptance-test-generator:run ./docs/specs/checkout.md
/acceptance-test-generator:run                     # paste the story + AC when asked
```

Start with `coverage` to see how the ACs decompose and where they're thin. Run `run` when you're ready; it pauses at every gate so nothing lands without your say-so.

## What it produces

Canonical Gherkin — the portable, automation-ready BDD artifact (Cucumber, SpecFlow, behave, pytest-bdd, playwright-bdd):

```gherkin
Feature: Redeem a discount code at checkout
  As a shopper
  I want to apply a discount code to my cart
  So that I pay the reduced price

  Background:
    Given a shopper with a cart containing 1 item priced "$100.00"

  Rule: A valid code applies its discount and is reflected in the total

    @smoke @AC-1
    Scenario: A valid percentage code reduces the total
      When the shopper applies the code "SAVE20"
      Then the discount "20%" is shown on the cart
      And the order total is "$80.00"
      And the code "SAVE20" is listed as applied

    @boundary @AC-2
    Scenario Outline: Code length is enforced at the boundaries
      When the shopper applies a "<length>"-character code
      Then the code is "<outcome>"
      Examples:
        | length | outcome  |
        | 5      | rejected |
        | 6      | accepted |
        | 10     | accepted |
        | 11     | rejected |
```

Plus, optionally, one **Test Case** work item per scenario in your tracker — on Azure DevOps with the runnable Steps grid populated (`Microsoft.VSTS.TCM.Steps`), on Jira with the Gherkin in the description — each linked back to the source story for traceability.

## How it thinks (senior test-design, applied to the AC)

Every acceptance criterion is run through the techniques a seasoned QA reaches for — never guessed, never padded:

- **Equivalence partitioning** — one representative per class, each invalid class kept separate.
- **Boundary-value analysis** — `min-1, min, min+1 … max-1, max, max+1`, plus zero/empty.
- **Decision tables** — combinatorial rules (role × state × flag) enumerated, not sampled.
- **State-transition testing** — valid transitions *and* the invalid ones teams forget.
- **Negative / error paths** — the failure the AC names, plus the ones it implies (flagged `@inferred`).
- **Permission matrices, concurrency, idempotency, data variety** — pulled in where the domain warrants.
- **ZOMBIES** as the closing sweep — Zero, One, Many, Boundaries, Interfaces, Exceptions, Simple.

## Smart scenarios, not coupled ones

The suite is dense on purpose. One scenario asserts every postcondition of a single action; an equivalence class or decision table folds into one `Scenario Outline` + `Examples`. But unrelated behaviors are never stitched together — each scenario fails for exactly one comprehensible reason. Coverage density on one behavior, never a mega-test.

## Traceability

Every scenario carries an `@AC-<n>` tag (and sits under a `Rule:` naming its criterion). The run ends with an **AC → scenario → file/work-item** matrix and flags any AC with no coverage. Ambiguous ACs and code-vs-spec drift come back as **Open Questions** for the author, never resolved behind your back.

## Configure (optional)

Drop a `.claude/acceptance-test-policy.json` in your project root (this plugin's own config — separate from issuekit's `tracker-policy.json`):

```json
{
  "test_output_dir": "tests/acceptance",
  "feature_file_extension": ".feature",
  "test_framework": "auto",
  "test_case_work_item_type": { "azure-devops": "Test Case", "jira": "Test" },
  "test_label": "acceptance-test",
  "create_in_tracker": "ask",
  "link_to_story": true,
  "scenario_granularity": "per-scenario-work-item",
  "traceability_tags": true
}
```

| Key | Default | Notes |
|---|---|---|
| `test_output_dir` | `tests/acceptance` | Where `.feature` files are written. |
| `test_framework` | `auto` | Detects cucumber-js/jvm, SpecFlow, behave, pytest-bdd, playwright-bdd; sets step + tag conventions. Or set explicitly. |
| `test_case_work_item_type` | `{azure-devops: "Test Case", jira: "Test"}` | The work-item type each scenario is created as. |
| `test_label` | `acceptance-test` | Tag on every created Test Case. |
| `create_in_tracker` | `ask` | `ask` \| `always` \| `never`. |
| `link_to_story` | `true` | Link each created Test Case back to the source story. |
| `scenario_granularity` | `per-scenario-work-item` | One Test Case per scenario, or `per-feature-work-item`. |
| `traceability_tags` | `true` | Emit an `@AC-<n>` tag on each scenario. |

Missing keys use the defaults; a `run` offers to persist your choices at the end.

## What's inside

- **Agent:** `acceptance-test-generator` — the workflow (`mode=run`, `mode=coverage`).
- **Skills:** `acceptance-analyzer` (spec-only coverage model), `bdd-scenario-writer` (Gherkin + tracker Test Case rendering), `code-reference-prober` (read-only enrichment + drift detection).
- Reuses `issuekit:tracker-adapter` (read the story, create/link Test Cases, the diff-and-confirm gate) and `issuekit:prose-style`.

## Gates

- **Local writes:** the `.feature` files are shown before they're written; declining writes nothing.
- **Tracker writes:** Test Case creation passes through issuekit's diff-and-confirm gate. The diff is the dry-run.

Existing `.feature` files are never clobbered — the agent merges new scenarios in or writes a suffixed sibling.

## See also

- `/draft-stories:run` — create the story + ACs this plugin tests against.
- `/testid-injector:inject` — add the `data-testid`s that make the generated steps executable.
- `/issue-triage:run` — refine a rough story before you generate tests from it.
