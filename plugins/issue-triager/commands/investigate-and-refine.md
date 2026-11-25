---
description: "Lightweight triage: investigate and refine the title and description only. No code dig, assignment, transition, severity or escalation."
argument-hint: <issue URL or ID>
allowed-tools: Skill
---

# /issue-triager:investigate-and-refine

A reduced version of the `issue-triager` agent. Runs the investigation and refinement phases only.

## Examples

```
/issue-triager:investigate-and-refine https://dev.azure.com/contoso/payments/_workitems/edit/12345
/issue-triager:investigate-and-refine RLI-1234
```

## What it does

Dispatches to the `issue-triager` agent with `mode=investigate-and-refine`. The agent runs:

1. **Phase 0** — Identify the issue, detect archetype.
2. **Phase 1** — Investigate (Bug/Incident or Story/Feature/Task/Spike).
3. **Phase 3** — Diff-and-confirm gate. The batch contains only the title and description writes from Phase 5. Severity, transitions, comments, links, labels are **not** in this batch.
4. **Phase 5** — Refine title and description on confirmation, then a short inline summary with any warnings.

What this command **does not** do:

- No Phase 2b codebase dig. `fix-proposer` does not run, so there is no suspected area and no proposed fix. That step is the most expensive thing the agent does, and this command exists to be cheap. Use `/issue-triager:run` when you want the defect localized.
- No Datadog search (its only reader is the assessment comment, which this command does not post).
- No assignment changes.
- No state transitions.
- No assessment comments.
- No severity, due-date, sprint, or story-point updates.
- No linking related work.
- No `triaged` label.
- No escalation channel posts.

## When to use this vs `/issue-triager:run`

| Use this | Use `/issue-triager:run` |
|---|---|
| The reporter wrote a vague title and you want to clean it up | You're picking up the issue and committing to own it through triage |
| You're auditing a backlog for description quality | You want the defect localized in the code, with a proposed fix when the code supports one |
| You want to preview the agent's rewrite without touching state | The team relies on the `triaged` label to filter |
| You want it cheap | The issue is fresh and needs the full classification + assignment workflow |

## Configuration

Same as `/issue-triager:run`: reads `.claude/tracker-policy.json`. Lazy-prompts only the keys this reduced workflow uses (which is just `skip_labels` — to honor opt-outs).
