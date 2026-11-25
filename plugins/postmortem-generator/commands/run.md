---
description: "Generate a blameless postmortem for an incident URL or ID, with one review stop after the timeline."
argument-hint: <incident URL or ID>
allowed-tools: Skill
---

# /postmortem-generator:run

Dispatch to the `postmortem-generator` agent with the incident URL or ID verbatim.

## Examples

```
/postmortem-generator:run https://contoso.atlassian.net/browse/INC-456
/postmortem-generator:run 12345
```

Usage, configuration and behavior: this plugin's `README.md`.
