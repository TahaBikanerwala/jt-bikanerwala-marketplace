---
description: "Read-only. Show what changed in the sprint between two points in time as a Marp delta deck."
argument-hint: "[sprint name or ID] [--team <name>] [--since <YYYY-MM-DD>] [--baseline <path>] [--export pptx|pdf]"
allowed-tools: Skill
---

# /sprint-status-reporter:progress-delta

Dispatch to the `sprint-status-reporter` agent with `mode=delta` and the arguments verbatim.

## Examples

```
/sprint-status-reporter:progress-delta
/sprint-status-reporter:progress-delta --since 2026-07-07
/sprint-status-reporter:progress-delta --baseline sprint-reports/.snapshots/sprint-42-2026-07-07.json
```

Usage, configuration and behavior: this plugin's `README.md`.
