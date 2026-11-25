---
description: "Read-only. Reconcile a ticket and its PRs and write the edge-case test plan to docs/qa/<id>/test-plan.md. No browser, no tracker writes."
argument-hint: <ticket URL/key | PR URL | #PR> [--env <name>] [--types <list>]
---

# /qa-tester:plan

Dispatch to the `qa-tester` agent with `mode=plan` and the argument verbatim. Same argument forms as `:run`; `--env` decides which cases are planned as mutating; `--types` skips the test-type question.

## Examples

```
/qa-tester:plan PROJ-456
/qa-tester:plan #321 --env staging --types none
```

Usage, configuration and behavior: this plugin's `README.md`.
