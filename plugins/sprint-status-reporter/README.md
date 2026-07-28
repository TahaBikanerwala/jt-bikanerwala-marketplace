# sprint-status-reporter

Turn the current sprint into a report with one command, on any supported tracker. Two views:

- **`/run`** — a point-in-time status deck: tally work by state, flag what's blocked or
  stalling, write a [Marp](https://marp.app/) deck you can export to PPTX or PDF.
- **`/progress-delta`** — a what-changed deck: compare the sprint now against an earlier
  snapshot (or reconstructed history) and report what shipped, what newly started, scope
  added or dropped, new risk, and how progress moved.

Powered by [`issuekit`](../issuekit/), so the same commands work against Azure DevOps and
Jira. Read-only by design: reports never touch the tracker, so there's no confirmation gate
and it's safe to run as often as you like. Every run also writes a small snapshot, so deltas
accumulate over time.

## Plug-and-play contract

Plug-and-play in this suite = `issuekit` + `sprint-status-reporter` + your own MCPs. This
plugin ships **no** `.mcp.json` and bundles **no** vendor config.

## Install

```
/plugin install sprint-status-reporter@jt-bikanerwala-marketplace
```

`issuekit` is declared as a dependency and Claude Code auto-installs it.

You also need one tracker MCP:

- **Azure DevOps:** the official `@azure-devops/mcp` from Microsoft.
- **Jira:** the Atlassian remote MCP.

Team capacity (an optional slide) is Azure-DevOps-only; Jira has no capacity concept in its
core API, so that slide is omitted on Jira without error.

## Use

```
@sprint-status-reporter
```

or the slash commands:

```
/sprint-status-reporter:run [sprint name or ID] [--team <name>] [--export pptx|pdf]
/sprint-status-reporter:progress-delta [sprint name or ID] [--team <name>] [--since <YYYY-MM-DD>] [--baseline <path>] [--export pptx|pdf]
```

Examples:

```
/sprint-status-reporter:run
/sprint-status-reporter:run "Sprint 42"
/sprint-status-reporter:run --team "Payments"
/sprint-status-reporter:run "Sprint 42" --export pptx

/sprint-status-reporter:progress-delta
/sprint-status-reporter:progress-delta --since 2026-07-07
/sprint-status-reporter:progress-delta "Sprint 42" --since 2026-07-01 --export pptx
```

All arguments are optional. With none, `/run` reports the current sprint for your default
team and writes a status deck; `/progress-delta` compares it against the most recent stored
snapshot.

## progress-delta

`/progress-delta` needs a "before" state to compare the current sprint against. It resolves
one in this order:

1. `--baseline <path>` — a specific saved snapshot JSON.
2. The newest stored snapshot before today (or at/before `--since <date>`). Snapshots are
   written on every `/run` and `/progress-delta`, under `<output_directory>/.snapshots/`.
3. `--since <date>` with no stored snapshot: reconstruct the as-of state from item history.
   **Azure DevOps only** (Jira does not expose issue history through the adapter).
4. Nothing to compare (first run, or Jira with no snapshot): it establishes a baseline
   snapshot and tells you to run again later. No delta deck yet.

When the baseline comes from history reconstruction, it covers only items still in the
sprint today; items removed earlier can't be recovered, and the deck says so.

The delta deck lists what shipped (moved to Done), what newly started, scope added and
removed, and new risk (newly blocked, newly stale, regressed), with the sprint's
before → after headline movement on the summary slide.

## Workflow

Read-only phases, shared until the mode branch:

| Phase | What happens |
|---|---|
| **0. Prepare** | Parse args (including mode). Bootstrap and detect the tracker via `issuekit:tracker-adapter`. |
| **1. Resolve sprint** | Current sprint, or the one named in the argument. |
| **2. Fetch** | `getSprintItems` for the iteration; `getTeamCapacity` (Azure DevOps only). |
| **3. Analyze** | Bucket items (Done / In Progress / To Do), compute % complete and remaining, flag blocked and stale items (`sprint-analyzer`). |
| **S. Snapshot** | Write a snapshot JSON under `.snapshots/` so later deltas have a baseline. |
| **4. Render** (status) | Write a Marp status deck; optionally export with `marp-cli` (`deck-composer`). |
| **D1–D3** (delta) | Resolve a baseline, diff it against the current state (`delta-analyzer`), and render a Marp delta deck (`delta-narrator`). |
| **5. Summary** | Recap the numbers, the deck path, the snapshot path, and any warnings. |

## The deck

Marp markdown with `---` slide separators and a Mermaid pie chart for the summary (so it's
self-contained; no plotting dependency). Slides:

1. **Title** — sprint name, date range, team, generated-on date.
2. **Summary** — done/in-progress/to-do pie + headline numbers (% complete, remaining,
   at-risk count).
3. **Completed this sprint** — each ticket with a one-line detail of what shipped.
4. **In progress** — each ticket with a one-line detail, owner, and idle time.
5. **Blocked / at risk** (blocked items + stale in-progress items, each with its reason).
6. **Up next** — top of the remaining backlog order, each with a one-line detail.
7. **Capacity** — only when capacity data is available (Azure DevOps).

Completed, in-progress, and up-next tickets render as detail bullets
(`**#123 Title** (owner). Brief description of the ticket.`) so a reader gets the gist of
each item without opening the tracker. The one-line detail comes from the ticket's
description (or its title when there's no description); it never invents scope.

Export to PPTX/PDF:

```
npx @marp-team/marp-cli "sprint-reports/sprint-report-<slug>-<date>.md" --pptx
```

or pass `--export pptx` to the command to have it run for you when `marp-cli` is installed.

## Configuration

Read from `.claude/tracker-policy.json` (shared with the rest of the suite). Keys this
plugin uses:

- `state_categories` — maps vendor states to Done / In Progress / To Do. Rarely needs
  setting: the adapter falls back to the tracker's own state category. Prompted only when a
  sprint contains a state the vendor category can't classify.
- `blocked_indicators` — `{ labels, states, board_column }`; an item matching any is blocked.
- `stale_after_days` — an in-progress item older than this is flagged at-risk. Default `3`.
- `points_field_name` — Jira-only override for the story-points field. Default: auto-detect.
- `output_directory` — where decks are written. Defaults to `./sprint-reports/` for this
  plugin. Snapshots go under `<output_directory>/.snapshots/`; there is no separate key.

When the file is absent, defaults are used and the agent lazy-prompts (and offers to
persist) any key it actually needs. Defaults are documented in
[`issuekit/skills/tracker-adapter/references/policy-schema.md`](../issuekit/skills/tracker-adapter/references/policy-schema.md).

## Plugin-bundled skills

| Skill | Purpose |
|---|---|
| `sprint-analyzer` | Pure computation: raw `SprintItem[]` + capacity → a metrics model (buckets, %, remaining, blocked/stale, up-next, warnings). |
| `deck-composer` | Pure rendering: metrics model → Marp status deck written to `output_directory`. |
| `delta-analyzer` | Pure computation: a baseline snapshot + the current state → a delta model (shipped, started, added/removed, new risk, headline movement). |
| `delta-narrator` | Pure rendering: delta model → Marp "what changed" deck written to `output_directory`. |

The agent also invokes `issuekit:tracker-adapter` for every tracker read.

## What it is not

Not a roadmap, prioritization, or estimation tool. It reports what's already in the sprint.
For changing work items (title, severity, assignment), use
[`issue-triager`](../issue-triager/).
