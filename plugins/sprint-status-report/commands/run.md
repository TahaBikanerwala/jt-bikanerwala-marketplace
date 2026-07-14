---
description: Read the current sprint, tally work by state, flag blocked/stale items, and emit a Marp status deck. Read-only; safe to run anytime.
argument-hint: "[sprint name or ID] [--team <name>] [--export pptx|pdf]"
allowed-tools: Skill
---

# /sprint-status-report:run

Entry point for the `sprint-status-report` agent. Runs against whatever tracker MCP is
active (Azure DevOps or Jira), resolved through `issuekit`.

## Arguments (all optional)

- `sprint` — a sprint name or ID. Omitted → the current/active sprint.
- `--team <name>` — the team whose board to read. Omitted → your default team.
- `--export pptx|pdf` — after writing the deck, also run `marp-cli` to produce that
  format (only if `marp-cli` is installed; otherwise the deck is still written and the
  exact export command is printed).

## Examples

```
/sprint-status-report:run
/sprint-status-report:run "Sprint 42"
/sprint-status-report:run --team "Payments"
/sprint-status-report:run "Sprint 42" --export pptx
```

## Behavior

This command is a thin shell. It dispatches to the `sprint-status-report` agent with the
arguments as input. The agent runs a five-phase, **read-only** workflow:

1. Bootstrap and detect the tracker via `issuekit:tracker-adapter`.
2. Resolve the sprint (current, or the one named in the argument).
3. Fetch the sprint's work items and (Azure DevOps only) team capacity.
4. Analyze: bucket by state, compute progress, flag blocked and stale items (`sprint-analyst`).
5. Render a Marp markdown deck to your `output_directory` (`deck-composer`); optionally export.

Nothing is ever written to the tracker. There is no confirmation gate because there are no
writes. Run it as often as you like.

## Configuration

Reads `.claude/tracker-policy.json` if present (shared with the rest of the suite).
Lazy-prompts for any missing key it actually needs — typically `output_directory`, and
only rarely `state_categories` (when a sprint contains a state the vendor category can't
classify). Keys it uses: `state_categories`, `blocked_indicators`, `stale_after_days`,
`points_field_name`, `output_directory`.
