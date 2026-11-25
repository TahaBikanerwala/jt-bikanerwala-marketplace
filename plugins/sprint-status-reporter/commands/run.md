---
description: "Read-only. Tally the current sprint by state, flag blocked and stale items, and emit a Marp status deck."
argument-hint: "[sprint name or ID] [--team <name>] [--export pptx|pdf]"
allowed-tools: Skill
---

# /sprint-status-reporter:run

Dispatch to the `sprint-status-reporter` agent (`mode=status`, the default) with the arguments verbatim.

## Examples

```
/sprint-status-reporter:run
/sprint-status-reporter:run "Sprint 42" --export pptx
/sprint-status-reporter:run --team "Payments"
```

Usage, configuration and behavior: this plugin's `README.md`.
