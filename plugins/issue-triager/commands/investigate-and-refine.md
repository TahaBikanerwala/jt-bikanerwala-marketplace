---
description: "Lightweight triage: investigate and refine the title and description only. No code dig, assignment, transition, severity or escalation."
argument-hint: <issue URL or ID>
allowed-tools: Skill
---

# /issue-triager:investigate-and-refine

Dispatch to the `issue-triager` agent with `mode=investigate-and-refine` and the issue URL or ID verbatim. Investigates and refines the title and description only.

## Examples

```
/issue-triager:investigate-and-refine https://dev.azure.com/contoso/payments/_workitems/edit/12345
/issue-triager:investigate-and-refine RLI-1234
```

Usage, configuration and behavior: this plugin's `README.md`.
