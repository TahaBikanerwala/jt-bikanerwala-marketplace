---
description: "Write a complete Bug work item from a single line, or refine a vague existing Bug, behind one diff-and-confirm gate. No code investigation."
argument-hint: <one-line symptom | bug URL or id | path to a report file> (optional)
allowed-tools: Skill
---

# /bug-reporter:run

Dispatch to the `bug-reporter` agent in `mode=run` with the argument verbatim: a one-line symptom or file path (create), a bug URL or id (refine), or nothing (the agent asks).

## Examples

```
/bug-reporter:run Checkout crashes when a coupon code is applied twice
/bug-reporter:run PROJ-456
/bug-reporter:run ./notes/support-escalation.md
/bug-reporter:run
```

Usage, configuration and behavior: this plugin's `README.md`.
