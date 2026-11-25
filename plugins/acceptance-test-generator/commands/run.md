---
description: "Turn a user story and its acceptance criteria into Gherkin .feature files, optionally created as linked Test Case work items behind diff-and-confirm gates."
argument-hint: <story URL or id | path to a spec file | pasted story + AC> (optional)
allowed-tools: Skill, Read, Write, Bash, Grep, AskUserQuestion
---

# /acceptance-test-generator:run

Dispatch to the `acceptance-test-generator` agent in `mode=run` with the argument verbatim: a story URL or id, a spec file path, pasted story text with acceptance criteria, or nothing (the agent asks).

## Examples

```
/acceptance-test-generator:run https://dev.azure.com/org/proj/_workitems/edit/1234
/acceptance-test-generator:run PROJ-456
/acceptance-test-generator:run ./docs/specs/checkout-discount.md
/acceptance-test-generator:run
```

Usage, configuration and behavior: this plugin's `README.md`.
