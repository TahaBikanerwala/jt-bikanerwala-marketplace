---
description: "Read-only. Print a one-line executive summary per Azure DevOps or Jira work item, from a ticket list or a date range and status."
argument-hint: "<ticket ids/urls...> | --range this-week|last-week|this-month|last-month | --from <date> --till <date> [--status active|delivered|closed|updated[,...]] [--project <name>] [--scope <area-path-or-component>] [--tags <name>[,<name>...]] [--to <target>] [--output <path>] [--detailed] [keywords...]"
allowed-tools: Skill
---

# /ticket-summarizer:run

Dispatch to the `ticket-summarizer` agent with the arguments verbatim.

## Examples

```
/ticket-summarizer:run AB#1234 AB#1235
/ticket-summarizer:run --range this-month --status closed
/ticket-summarizer:run --status active --tags ecw --detailed
/ticket-summarizer:run --status delivered --from 2026-07-01 --till 2026-07-31 --output ./client-update.md
```

Usage, configuration and behavior: this plugin's `README.md`.
