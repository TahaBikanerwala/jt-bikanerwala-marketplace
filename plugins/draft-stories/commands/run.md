---
description: Turn ambiguous requirements into INVEST user stories and create them in the tracker tagged Draft. Brainstorms, clarifies blocking gaps, asks which stories to create, probes the codebase to self-answer open questions, then creates the selected stories through a single diff-and-confirm gate.
argument-hint: <pasted requirements | path to a notes/transcript file | short brief> (optional)
allowed-tools: Skill
---

# /draft-stories:run

Entry point for the `draft-stories` agent. Pass the raw requirements as the argument, or run it bare and paste them when asked.

## Examples

```
/draft-stories:run We need faculty to be able to share an agent's skills with a whole cohort, and IT wants to control who can publish.
/draft-stories:run ./notes/roadmap-sync-2026-07-16.md
/draft-stories:run ./transcripts/meeting.vtt
/draft-stories:run
```

The argument can be:
- **Pasted text** — a rough brief, feature request, or notes.
- **A file path** — a meeting transcript (`.vtt` cue/timestamp lines are ignored), design notes, or any plain-text requirements dump.
- **Empty** — the agent asks you to paste or point at the requirements.

## Behavior

This command is a thin shell. It dispatches to the `draft-stories` agent with the input. The agent runs its workflow:

1. Bootstrap the tracker via `issuekit:tracker-adapter` and read the requirements.
2. Brainstorm the requirements topic-by-topic (`requirement-brainstormer`).
3. **Pause** to clarify any blocking gaps.
4. **Pause** to ask which candidate stories to create (multi-select) plus a free-form notes box.
5. Probe the local codebase to self-answer open questions where the code already shows the answer (`codebase-prober`).
6. Write the selected stories in full (`story-writer`), cleaned with `issuekit:prose-style`.
7. **Pause at the diff-and-confirm gate**, then create each selected story as a standalone work item tagged `Draft`.

The diff IS the dry-run. Declining at the gate exits cleanly with no writes. Selecting no stories exits with nothing created.

## Configuration

Reads `.claude/tracker-policy.json` if present. Relevant keys: `story_work_item_type` (the type new stories are created as, per tracker), `draft_label` (default `Draft`), `priority_label_map` / `acceptance_criteria_field` (Jira). Lazy-prompts for any missing key at the moment it's needed and offers to persist the answer.

## See also

- `/issue-triage:run` — triage and refine an **existing** issue (this plugin creates **new** ones).
