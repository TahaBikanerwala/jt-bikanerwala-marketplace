---
description: Test a ticket or pull request in a real browser like a senior QA. Reads the ticket and its linked PRs (both directions), treats the ticket's acceptance criteria as the source of truth and flags where the PR differs, drafts an edge-case test plan on a minimal shared data set, executes every case via chrome-devtools MCP or Claude in Chrome, asks all questions at the end, and optionally posts results and files bugs behind gates.
argument-hint: <ticket URL/key | PR URL | #PR> [--env <name>]
---

# /qa-tester:run

Entry point for the `qa-tester` agent in `mode=run`.

## Examples

```
/qa-tester:run https://dev.azure.com/org/proj/_workitems/edit/1234
/qa-tester:run PROJ-456 --env staging
/qa-tester:run https://dev.azure.com/org/proj/_git/web/pullrequest/789
/qa-tester:run https://github.com/org/app/pull/321
/qa-tester:run #321
```

The argument can be a tracker ticket (Azure DevOps or Jira URL, id, or key), a pull request (Azure DevOps or GitHub URL, or `#<n>` for the current repo's GitHub remote), or both. Linked items are followed either way, so one reference is enough.

## Behavior

Dispatch to the `qa-tester` agent with `mode=run` and the argument verbatim. The agent:

1. Bootstraps the tracker and browser provider. On the very first run, asks a four-question setup card (environments, login, data mutation rules, extra coverage) and saves it to `.claude/qa-tester-policy.json`.
2. Reads the ticket(s) and PR(s), following links both ways, and reconciles them. The ticket wins; every difference is reported.
3. Drafts the test plan: functional, negative, boundary, state, permission, data-variety, navigation, responsive and accessibility cases, plus exploratory charters, all running on a minimal shared data set. Written to `docs/qa/<id>/test-plan.md`.
4. Preflights the environment and login, then executes every case without stopping, capturing console, network and screenshot evidence. Cleans up the test data it created.
5. Writes `docs/qa/<id>/test-report.md` with a Go / Go with risks / No-go verdict.
6. Asks all clarifying questions in one card at the end, and re-runs any case the answers unblock.
7. Offers a results comment on the ticket and one bug per defect (via `bug-reporter`), each behind its own diff-and-confirm gate.

## See also

- `/qa-tester:plan` drafts the plan without opening a browser.
- `/qa-tester:setup` changes the saved environments and preferences.
