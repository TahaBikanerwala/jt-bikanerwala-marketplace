---
description: "Read-only. Reconcile a ticket and its PRs and write the edge-case test plan to docs/qa/<id>/test-plan.md. No browser, no tracker writes."
argument-hint: <ticket URL/key | PR URL | #PR> [--env <name>]
---

# /qa-tester:plan

Dispatch to the `qa-tester` agent with `mode=plan` and the argument verbatim. Same argument forms as `:run`; `--env` decides which cases are planned as mutating.

## Examples

```
/qa-tester:plan PROJ-456
/qa-tester:plan #321 --env staging
```

Usage, configuration and behavior: this plugin's `README.md`.
