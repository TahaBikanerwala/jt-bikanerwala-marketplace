---
description: Show what changed in a sprint between two points in time. What shipped, what newly started, scope added or dropped, new risk, and how progress moved. Emits a Marp delta deck. Read-only; safe to run anytime.
argument-hint: "[sprint name or ID] [--team <name>] [--since <YYYY-MM-DD>] [--baseline <path>] [--export pptx|pdf]"
allowed-tools: Skill
---

# /sprint-status-reporter:progress-delta

Delta entry point for the `sprint-status-reporter` agent. Compares the sprint's current state
against an earlier one and reports what changed. Runs against whatever tracker MCP is active
(Azure DevOps or Jira), resolved through `issuekit`.

## Arguments (all optional)

- `sprint` — a sprint name or ID. Omitted → the current/active sprint.
- `--team <name>` — the team whose board to read. Omitted → your default team.
- `--since <YYYY-MM-DD>` — the "before" date. Used to pick a stored snapshot, or to
  reconstruct the baseline from item history when no snapshot exists (Azure DevOps only).
- `--baseline <path>` — compare against a specific saved snapshot JSON instead of the
  most-recent one.
- `--export pptx|pdf` — after writing the deck, also run `marp-cli` to produce that format
  (only if `marp-cli` is installed; otherwise the deck is still written and the exact export
  command is printed).

## Examples

```
/sprint-status-reporter:progress-delta
/sprint-status-reporter:progress-delta --since 2026-07-07
/sprint-status-reporter:progress-delta "Sprint 42" --since 2026-07-01 --export pptx
/sprint-status-reporter:progress-delta --baseline sprint-reports/.snapshots/sprint-42-2026-07-07.json
```

## Behavior

This command is a thin shell. It dispatches to the `sprint-status-reporter` agent with
`mode=delta` and the arguments as input. The agent runs a **read-only** workflow:

1. Bootstrap and detect the tracker via `issuekit:tracker-adapter`.
2. Resolve the sprint (current, or the one named in the argument).
3. Fetch the sprint's current work items and (Azure DevOps only) team capacity, and compute
   the current metrics (`sprint-analyzer`).
4. Resolve a baseline, in order: `--baseline <path>` → the newest stored snapshot before now
   (or at/before `--since`) → for `--since` with no snapshot, reconstruct the as-of state
   from item history (Azure DevOps only). With no baseline available (first run, or Jira with
   no snapshot), it writes a baseline snapshot and exits, telling you to run again later.
5. Diff baseline against current (`delta-analyzer`).
6. Render a Marp delta deck to your `output_directory` (`delta-narrator`); optionally export.

Every run also writes a snapshot under `<output_directory>/.snapshots/`, so deltas
accumulate over time whether you use `:run` or `:progress-delta`.

Nothing is ever written to the tracker. There is no confirmation gate because there are no
tracker writes. Run it as often as you like.

## Configuration

Reads `.claude/tracker-policy.json` if present (shared with the rest of the suite).
Lazy-prompts for any missing key it actually needs. Keys it uses: `state_categories`,
`blocked_indicators`, `stale_after_days`, `points_field_name`, `output_directory`.
Snapshots are stored under `<output_directory>/.snapshots/` (no separate config key).
