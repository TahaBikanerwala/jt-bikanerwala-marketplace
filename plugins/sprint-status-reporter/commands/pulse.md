---
description: "Read-only. Publish or refresh the Pulse sprint dashboard Artifact, optionally bounded by a date window and status."
argument-hint: "[sprint name or ID] [--team <name>] [--from <date> --till <date> | --range this-week|last-week|this-month|last-month] [--status active|delivered|closed|updated[,...]]"
allowed-tools: Skill
---

# /sprint-status-reporter:pulse

Dispatch to the `sprint-status-reporter` agent with `mode=pulse` and the arguments verbatim.

## Examples

```
/sprint-status-reporter:pulse
/sprint-status-reporter:pulse --range this-week
/sprint-status-reporter:pulse --from 2026-08-01 --till 2026-08-31 --status closed
```

Usage, configuration and behavior: this plugin's `README.md`.
