---
description: "Read-only. Report the test-coverage plan for a story's acceptance criteria: behaviors, techniques, boundaries, gaps and open questions. Writes nothing."
argument-hint: <story URL or id | path to a spec file | pasted story + AC> (optional)
allowed-tools: Skill, Read, Bash, Grep, AskUserQuestion
---

# /acceptance-test-generator:coverage

Dispatch to the `acceptance-test-generator` agent in `mode=coverage` with the argument verbatim. Same argument forms as `:run`. Read-only: no files, no tracker writes, no gate.

## Examples

```
/acceptance-test-generator:coverage PROJ-456
/acceptance-test-generator:coverage ./docs/specs/checkout-discount.md
/acceptance-test-generator:coverage
```

Usage, configuration and behavior: this plugin's `README.md`.
