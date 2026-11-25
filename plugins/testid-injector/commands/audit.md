---
description: "Read-only. Report which interactive elements have or lack a data-testid and the ids the injector would generate."
argument-hint: "[path or glob] (default: project's UI source)"
allowed-tools: Skill, Read, Grep, Glob, Bash
---

# /testid-injector:audit

Dispatch to the `testid-injector` agent in `mode=audit` with the argument verbatim. Read-only: stops before the gate and writes nothing.

## Examples

```
/testid-injector:audit
/testid-injector:audit src/features/checkout
```

Usage, configuration and behavior: this plugin's `README.md`.
