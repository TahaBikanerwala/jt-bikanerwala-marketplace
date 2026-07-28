---
description: Read-only test-id coverage report. Lists every interactive and form element in scope, which already have a data-testid, which are missing one, and the id the injector would generate. Writes nothing.
argument-hint: "[path or glob] (default: project's UI source)"
allowed-tools: Skill, Read, Grep, Glob, Bash
---

# /testid-injector:audit

Entry point for the `testid-injector` agent in `mode=audit`. Same scan and id generation as `/testid-injector:run`, but it stops before the gate and writes nothing.

## Examples

```
/testid-injector:audit
/testid-injector:audit src/features/checkout
/testid-injector:audit "src/**/*.{tsx,jsx}"
```

## Output

A per-file coverage table:

| File | Element | Current testid | Proposed testid | Status |
|------|---------|----------------|-----------------|--------|

plus totals: elements found, already tagged, missing (would add), and flagged for manual review. Use this to size the work or to wire into CI as a coverage check before running `/testid-injector:run`.
