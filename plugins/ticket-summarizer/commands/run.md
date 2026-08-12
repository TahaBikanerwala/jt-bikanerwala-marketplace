---
description: Fetch Azure DevOps or Jira work items, either an explicit list of tickets or everything matching a date range and status, and print a one-to-two sentence executive summary per item for a client-update deck. Read-only; safe to run anytime.
argument-hint: "<ticket ids/urls...> | --from <date> --till <date> [--status active|delivered|closed|updated] [--project <name>] [--scope <area-path-or-component>] [--tags <name>[,<name>...]] [keywords...]"
allowed-tools: Skill
---

# /ticket-summarizer:run

Turn tracker work items into plain-language summaries ready to paste into a
client-update deck.

## Examples

```
/ticket-summarizer:run AB#1234 AB#1235 https://dev.azure.com/myorg/myproj/_workitems/edit/1240
/ticket-summarizer:run --from 2026-07-01 --till 2026-07-31 --status delivered
/ticket-summarizer:run --status active
/ticket-summarizer:run --from 2026-07-01 --till 2026-07-31 --project "Mobile App"
/ticket-summarizer:run --from 2026-08-11 --till 2026-08-12 --status closed --tags ecw
```

## Behavior

This command is a thin shell. It dispatches to the `ticket-summarizer` agent, which:

1. Detects whether the argument is an explicit list of ticket references or a
   date-range/status query.
2. Bootstraps the tracker through `issuekit:tracker-adapter` (Azure DevOps or Jira,
   auto-detected).
3. Resolves the matching work items: `getIssue` per reference in explicit mode, or a
   state-filtered `searchIssues` narrowed further by the exact `updated`/`resolved`
   date window in query mode.
4. Runs each item through `executive-blurb-writer` to produce a one-to-two sentence,
   plain-language summary: what was delivered, and why it matters only when the ticket
   itself says so.
5. Prints the summaries as bullets, grouped by status when a query was run.

No writes, no confirmation gate.

## Query shapes

- **Explicit list:** paste ticket ids, keys, or urls, space or newline separated.
  Everything else in the argument is ignored.
- **Active:** `--status active`. No date range required.
- **Delivered / closed in range:** `--status delivered` (or `closed`) with
  `--from`/`--till`.
- **Updated in range:** `--from`/`--till` with no `--status`, or `--status updated`
  explicitly.

`--tags <name>[,<name>...]` narrows any query-mode result to items whose labels
case-insensitively contain at least one given substring. This match happens
client-side against each fetched item, not in the search itself.

## Configuration

Reads `.claude/tracker-policy.json` for `state_categories` (how vendor state names map
to "active"/"delivered"). See
`issuekit/skills/tracker-adapter/references/policy-schema.md` for the schema. Works
with zero config; the shipped defaults cover the common Agile/Scrum/Basic AzDO states
and the default Jira workflow.

## See also

- `/sprint-status-reporter:run`: a full sprint status deck (Marp/PPTX) instead of
  plain-text bullets, scoped to the current iteration rather than an arbitrary date
  range.
- `/issue-triager:run`: investigates and fixes a single issue; this command only
  reads and summarizes.
