---
description: Publish or refresh the Pulse dashboard for a sprint. A private, always-current Claude Artifact showing what's delivered, what's in progress, and what's at risk, plus a paste-ready "Copy for deck" view. Read-only; safe to run anytime.
argument-hint: "[sprint name or ID] [--team <name>]"
allowed-tools: Skill
---

# /sprint-status-reporter:pulse

Dashboard entry point for the `sprint-status-reporter` agent. Runs the same read-only pipeline
as `:progress-delta`, then publishes the result to a private Claude Artifact instead of a Marp
deck. The first run for a project creates the dashboard and remembers its URL; every later run
refreshes that same dashboard in place. Runs against whatever tracker MCP is active (Azure
DevOps or Jira), resolved through `issuekit`.

## Arguments (all optional)

- `sprint` — a sprint name or ID. Omitted → the current/active sprint.
- `--team <name>` — the team whose board to read. Omitted → your default team.

There is no `--export` flag. The dashboard is a live page, not a file; the "Copy for deck" view
is how its content reaches a deck.

## Examples

```
/sprint-status-reporter:pulse
/sprint-status-reporter:pulse "Sprint 42"
/sprint-status-reporter:pulse --team "Payments"
```

## Behavior

This command is a thin shell. It dispatches to the `sprint-status-reporter` agent with
`mode=pulse` and the arguments as input. The agent runs a **read-only** workflow:

1. Bootstrap and detect the tracker via `issuekit:tracker-adapter`.
2. Resolve the sprint (current, or the one named in the argument).
3. Fetch the sprint's current work items and (Azure DevOps only) team capacity, and compute
   the current metrics (`sprint-analyzer`).
4. Resolve a baseline: the newest stored snapshot before today. With no baseline available
   (first run, or Jira with no snapshot), it carries on and publishes a point-in-time view that
   says plainly that no delta is available yet.
5. Diff baseline against current when one resolved (`delta-analyzer`).
6. Compose the dashboard payload (`dashboard-composer`).
7. Publish a new private Artifact, or write the payload into the existing one, and print its URL.

Every run also writes a snapshot under `<output_directory>/.snapshots/`, so deltas accumulate
over time whether you use `:run`, `:progress-delta`, or `:pulse`.

The dashboard's URL is remembered at `<output_directory>/.dashboard.json`, so re-running
refreshes the same page rather than creating a second one. Delete that file if you want a fresh
dashboard.

A run that fails leaves the dashboard showing its last successful data and its last successful
timestamp. Nothing is blanked and nothing is re-stamped.

Nothing is ever written to the tracker. There is no confirmation gate because there are no
tracker writes. Run it as often as you like.

## Configuration

Reads `.claude/tracker-policy.json` if present (shared with the rest of the suite).
Lazy-prompts for any missing key it actually needs. Keys it uses: `state_categories`,
`blocked_indicators`, `stale_after_days`, `points_field_name`, `output_directory`.
Snapshots are stored under `<output_directory>/.snapshots/` and the dashboard's URL at
`<output_directory>/.dashboard.json` (no separate config keys).
