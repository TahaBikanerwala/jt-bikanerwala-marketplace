---
description: "Full issue triage: investigate, localize a bug in code, refine, set severity or sprint, link work and summarize, behind one diff-and-confirm gate."
argument-hint: <issue URL or ID>
allowed-tools: Skill
---

# /issue-triager:run

Dispatch to the `issue-triager` agent (`mode=full`, the default) with the issue URL or ID verbatim. Run it from the repository the issue is about: the code dig reads the working directory.

## Examples

```
/issue-triager:run https://dev.azure.com/contoso/payments/_workitems/edit/12345
/issue-triager:run RLI-1234
```

Usage, configuration and behavior: this plugin's `README.md`.
