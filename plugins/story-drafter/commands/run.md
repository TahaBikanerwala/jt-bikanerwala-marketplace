---
description: "Turn rough requirements into INVEST user stories and create the chosen ones tagged Draft, behind one diff-and-confirm gate."
argument-hint: <pasted requirements | path to a notes/transcript file | short brief> (optional)
allowed-tools: Skill
---

# /story-drafter:run

Dispatch to the `story-drafter` agent with the argument verbatim: pasted requirements, a notes or transcript file path, or nothing (the agent asks).

## Examples

```
/story-drafter:run ./notes/roadmap-sync-2026-07-16.md
/story-drafter:run ./transcripts/meeting.vtt
/story-drafter:run
```

Usage, configuration and behavior: this plugin's `README.md`.
