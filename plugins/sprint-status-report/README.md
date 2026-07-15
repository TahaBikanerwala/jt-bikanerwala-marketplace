# sprint-status-report

Turn the current sprint into a status-report deck with one command, on any supported
tracker. Reads the iteration, tallies work by state, flags what's blocked or stalling, and
writes a [Marp](https://marp.app/) markdown deck you can export to PPTX or PDF. Powered by
[`issuekit`](../issuekit/), so the same command works against Azure DevOps and Jira.

Read-only by design: reports never touch the tracker, so there's no confirmation gate and
it's safe to run as often as you like.

## Plug-and-play contract

Plug-and-play in this suite = `issuekit` + `sprint-status-report` + your own MCPs. This
plugin ships **no** `.mcp.json` and bundles **no** vendor config.

## Install

```
/plugin install sprint-status-report@jt-bikanerwala-marketplace
```

`issuekit` is declared as a dependency and Claude Code auto-installs it.

You also need one tracker MCP:

- **Azure DevOps:** the official `@azure-devops/mcp` from Microsoft.
- **Jira:** the Atlassian remote MCP.

Team capacity (an optional slide) is Azure-DevOps-only; Jira has no capacity concept in its
core API, so that slide is omitted on Jira without error.

## Use

```
@sprint-status-report
```

or the slash command:

```
/sprint-status-report:run [sprint name or ID] [--team <name>] [--export pptx|pdf]
```

Examples:

```
/sprint-status-report:run
/sprint-status-report:run "Sprint 42"
/sprint-status-report:run --team "Payments"
/sprint-status-report:run "Sprint 42" --export pptx
```

All arguments are optional. With none, it reports the current sprint for your default team
and writes a markdown deck.

## Workflow

Five read-only phases:

| Phase | What happens |
|---|---|
| **0. Prepare** | Parse args. Bootstrap and detect the tracker via `issuekit:tracker-adapter`. |
| **1. Resolve sprint** | Current sprint, or the one named in the argument. |
| **2. Fetch** | `getSprintItems` for the iteration; `getTeamCapacity` (Azure DevOps only). |
| **3. Analyze** | Bucket items (Done / In Progress / To Do), compute % complete and remaining, flag blocked and stale items (`sprint-analyst`). |
| **4. Render** | Write a Marp deck to `output_directory`; optionally export with `marp-cli` (`deck-composer`). |
| **5. Summary** | Recap the numbers, the deck path, and any warnings. |

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
- `output_directory` — where the deck is written. Defaults to `./sprint-reports/` for this
  plugin.

When the file is absent, defaults are used and the agent lazy-prompts (and offers to
persist) any key it actually needs. Defaults are documented in
[`issuekit/skills/tracker-adapter/references/policy-schema.md`](../issuekit/skills/tracker-adapter/references/policy-schema.md).

## Plugin-bundled skills

| Skill | Purpose |
|---|---|
| `sprint-analyst` | Pure computation: raw `SprintItem[]` + capacity → a metrics model (buckets, %, remaining, blocked/stale, up-next, warnings). |
| `deck-composer` | Pure rendering: metrics model → Marp markdown deck written to `output_directory`. |

The agent also invokes `issuekit:tracker-adapter` for every tracker read.

## What it is not

Not a roadmap, prioritization, or estimation tool. It reports what's already in the sprint.
For changing work items (title, severity, assignment), use
[`issue-triage`](../issue-triage/). For a what-shipped narrative, a future `progress-delta`
plugin will cover the delta between two points in time.
