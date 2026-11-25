---
description: "Test a ticket or PR in a real browser against its acceptance criteria, with an edge-case plan, evidence, end-of-run questions and gated results and bugs."
argument-hint: <ticket URL/key | PR URL | #PR> [--env <name>] [--types <list>]
---

# /qa-tester:run

Dispatch to the `qa-tester` agent with `mode=run` and the argument verbatim: a ticket (URL, id or key), a pull request (Azure DevOps or GitHub URL, or `#<n>` for this repo's GitHub remote), optionally `--env <name>`, and optionally `--types <list>` (extra test types on top of functional and navigation, e.g. `ui,security`, or `none`), which skips the test-type question.

## Examples

```
/qa-tester:run https://dev.azure.com/org/proj/_workitems/edit/1234
/qa-tester:run PROJ-456 --env staging --types ui,security
/qa-tester:run https://github.com/org/app/pull/321
/qa-tester:run #321
```

Usage, configuration and behavior: this plugin's `README.md`.
