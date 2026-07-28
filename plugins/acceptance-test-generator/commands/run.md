---
description: Turn a user story and its acceptance criteria into a rigorous BDD test suite. Analyzes the ACs with senior test-design technique, clarifies blocking gaps, writes canonical Gherkin .feature files with smartly consolidated scenarios, and optionally creates them as Test Case work items linked to the story — behind diff-and-confirm gates. Tests derive only from the story/AC; code is read for reference only.
argument-hint: <story URL or id | path to a spec file | pasted story + AC> (optional)
allowed-tools: Skill, Read, Write, Bash, Grep, AskUserQuestion
---

# /acceptance-test-generator:run

Entry point for the `acceptance-test-generator` agent. Pass a story reference, a spec file, or pasted story text with acceptance criteria — or run it bare and provide them when asked.

## Examples

```
/acceptance-test-generator:run https://dev.azure.com/org/proj/_workitems/edit/1234
/acceptance-test-generator:run PROJ-456
/acceptance-test-generator:run ./docs/specs/checkout-discount.md
/acceptance-test-generator:run As a shopper I want to apply a discount code ... AC: 1) valid codes reduce the total ...
/acceptance-test-generator:run
```

The argument can be:
- **A tracker reference** — an Azure DevOps/Jira URL or a bare id/key. The agent reads the story and its acceptance criteria through `issuekit`.
- **A file path** — a markdown/text spec containing the story and its ACs.
- **Pasted text** — the story narrative plus its acceptance criteria.
- **Empty** — the agent asks you to provide one.

## Behavior

This command is a thin shell. It dispatches to the `acceptance-test-generator` agent in `mode=run`, which:

1. Bootstrap the tracker via `issuekit:tracker-adapter` (tolerates no tracker — local `.feature` output still works) and read the story + acceptance criteria.
2. Analyze the ACs into a coverage model with formal test-design technique — equivalence partitioning, boundary-value analysis, decision tables, state transitions, negative paths, permissions, concurrency, data variety (`acceptance-analyzer`, spec-only).
3. **Pause** to clarify any ambiguity that blocks precise test design.
4. Optionally probe the codebase **read-only** for concrete selectors, existing feature-file style, terminology, and spec-vs-code drift (`code-reference-prober`) — reference only, never the basis of a test.
5. **Pause** to pick which behaviors to generate, whether to also create tracker Test Cases, plus a free-form notes box.
6. Write canonical Gherkin (`bdd-scenario-writer`), cleaned with `issuekit:prose-style`.
7. **Pause at the local write gate**, then write the `.feature` files.
8. If chosen, **pause at the tracker diff-and-confirm gate**, then create each scenario as a Test Case work item linked back to the story.
9. Summarize with an AC→scenario traceability matrix, files/work items created, and any Open Questions or drift the author must close.

The one rule: **test cases come only from the story and its acceptance criteria.** The code is consulted for reference, never as the source of a behavior. Every gate's diff is the dry-run; declining exits cleanly with nothing written.

## Configuration

Reads `.claude/acceptance-test-policy.json` if present (this plugin's own config — not issuekit's `tracker-policy.json`). Keys: `test_output_dir` (default `tests/acceptance`), `test_framework` (default `auto`), `test_case_work_item_type`, `test_label`, `create_in_tracker` (`ask`/`always`/`never`), `link_to_story`, `scenario_granularity`, `traceability_tags`. Missing keys use defaults; the agent offers to persist your choices at the end.

## See also

- `/acceptance-test-generator:coverage` — read-only. Reports the coverage plan and gaps for a story's ACs without writing anything.
- `/story-drafter:run` — create the story and its ACs in the first place.
- `/testid-injector:run` — add the `data-testid`s that make the generated steps executable.
