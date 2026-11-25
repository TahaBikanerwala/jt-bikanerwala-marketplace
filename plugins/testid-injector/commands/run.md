---
description: "Add missing data-testid attributes to interactive UI elements, behind one diff-and-confirm gate."
argument-hint: "[path or glob] (default: project's UI source)"
allowed-tools: Skill, Read, Edit, Grep, Glob, Bash, AskUserQuestion
---

# /testid-injector:run

Dispatch to the `testid-injector` agent in `mode=inject` with the argument verbatim: a file, directory or glob, or nothing (the agent infers the UI source root).

## Examples

```
/testid-injector:run
/testid-injector:run src/features/checkout
/testid-injector:run "src/**/*.tsx"
```

Usage, configuration and behavior: this plugin's `README.md`.
