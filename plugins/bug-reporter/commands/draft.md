---
description: "Read-only. Print the bug report the agent would file, without touching the tracker."
argument-hint: <one-line symptom | bug URL or id | path to a report file> (optional)
allowed-tools: Skill
---

# /bug-reporter:draft

Dispatch to the `bug-reporter` agent in `mode=draft` with the argument verbatim. Same argument forms as `:run`. Prints the report; writes nothing.

## Examples

```
/bug-reporter:draft Checkout crashes when a coupon code is applied twice
/bug-reporter:draft PROJ-456
/bug-reporter:draft
```

Usage, configuration and behavior: this plugin's `README.md`.
