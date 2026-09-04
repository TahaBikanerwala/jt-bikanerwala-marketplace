---
description: Publish or refresh the Pulse dashboard for a sprint. A private, always-current Claude Artifact showing one tile per ticket tag, each holding that tag's active and closed tickets, plus a paste-ready "Copy for deck" view. Bound which closed and new tickets it counts with a date window (explicit --from/--till or a --range preset) and pick which side to show with --status; active tickets always show in full regardless. Read-only; safe to run anytime.
argument-hint: "[sprint name or ID] [--team <name>] [--from <date> --till <date> | --range this-week|last-week|this-month|last-month] [--status active|delivered|closed|updated[,...]]"
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
- `--from <date>` / `--till <date>` — the date window that decides which tickets count as
  closed and which count as new. Either end may be omitted; omit both for an unbounded window.
- `--range this-week|last-week|this-month|last-month` — the same window as a preset instead of
  two dates. Mutually exclusive with `--from`/`--till`.
- `--status active|delivered|closed|updated[,...]` — which side of each tag to show. Omitted →
  both sides.

There is no `--export` flag. The dashboard is a live page, not a file; the "Copy for deck" view
is how its content reaches a deck.

## Examples

```
/sprint-status-reporter:pulse
/sprint-status-reporter:pulse "Sprint 42"
/sprint-status-reporter:pulse --team "Payments"
/sprint-status-reporter:pulse --range this-week
/sprint-status-reporter:pulse --range this-week --status closed
/sprint-status-reporter:pulse --from 2026-08-01 --till 2026-08-31 --status closed
```

## Behavior

This command is a thin shell. It dispatches to the `sprint-status-reporter` agent with
`mode=pulse` and the arguments as input. The agent runs a **read-only** workflow:

1. Bootstrap and detect the tracker via `issuekit:tracker-adapter`.
2. Resolve the sprint (current, or the one named in the argument).
3. Fetch the sprint's current work items and (Azure DevOps only) team capacity, and compute
   the current metrics (`sprint-analyzer`).
4. Resolve a baseline: the newest stored snapshot before today, or, when a window start
   resolved from `--from` or `--range`, the newest snapshot on or before that date. This is the
   same baseline mechanism `:progress-delta --since` has always used, not a second query path.
   With no baseline available (first run, or Jira with no snapshot), it carries on and
   publishes a point-in-time view that says plainly that no delta is available yet.
5. Diff baseline against current when one resolved (`delta-analyzer`).
6. Compose the dashboard payload (`dashboard-composer`), applying the window's end date and
   the `--status` choice while it selects.
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

## Window and status filtering

- **Unbounded (the default):** no window flag. Closed tickets are whatever the baseline diff
  reports as shipped, with no date bound on either end.
- **Window via two dates:** `--from <date> --till <date>`. Either end may stand alone.
- **Window via a preset:** `--range this-week|last-week|this-month|last-month`, instead of
  working the two dates out by hand. `this-week`/`this-month` run through today (a trailing
  partial period, since future dates carry no tickets yet); `last-week`/`last-month` are the
  complete prior period. Mutually exclusive with `--from`/`--till`.
- **One side only:** `--status active` shows each tag's active side alone; `--status closed`
  (or `delivered`, its synonym) shows the closed side alone. `--status updated`, and omitting
  `--status`, both show the two sides. `updated` may only appear alone: it already means no
  status filter at all, so combining it with any other value is a validation error.

**A window never hides an active ticket.** Every currently non-done ticket appears in full, in
its tag's active count and list, on every run, whatever the window
(`docs/specs/0001-pulse-dashboard-spec.md` invariant 4.5). A window bounds two things only:
which done-category tickets count as closed (those that shipped inside it), and which count as
new. This is where these flags part company with the identically-named ones on
`/ticket-summarizer:run`, which narrow a whole result set.

The window's start date does double duty: it picks the comparison baseline, and that diff is
what "closed in this window" then means. The end date is applied afterward against each
ticket's own `updated` date; nothing is reconstructed a second time as of that date. An
unrecognized `--range` or `--status` value stops the run before anything is fetched, naming the
accepted set, rather than falling back to a default.

## Configuration

Reads `.claude/tracker-policy.json` if present (shared with the rest of the suite).
Lazy-prompts for any missing key it actually needs. Keys it uses: `state_categories`,
`blocked_indicators`, `stale_after_days`, `points_field_name`, `output_directory`.
Snapshots are stored under `<output_directory>/.snapshots/` and the dashboard's URL at
`<output_directory>/.dashboard.json` (no separate config keys).
