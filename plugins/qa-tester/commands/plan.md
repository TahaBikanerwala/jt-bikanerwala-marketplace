---
description: Read-only. Reads a ticket and its linked PRs (or a PR and its tickets), reconciles them with the ticket as source of truth, and drafts the full edge-case test plan with its minimal shared data set. Writes docs/qa/<id>/test-plan.md only; opens no browser and writes nothing to the tracker.
argument-hint: <ticket URL/key | PR URL | #PR> [--env <name>]
---

# /qa-tester:plan

Dispatch to the `qa-tester` agent with `mode=plan` and the argument verbatim.

The agent runs bootstrap (including first-run setup if no policy exists), gathers and cross-links the ticket and PR, reconciles them, and designs the test plan. It writes `<output_dir>/<id>/test-plan.md`, prints the case count by priority, the shared data set, the ticket-vs-PR discrepancies, and open questions, and stops.

`--env` matters here because it decides which cases are planned as mutating versus skipped by the mutation guard.

Run `/qa-tester:run` with the same reference to execute the plan.
