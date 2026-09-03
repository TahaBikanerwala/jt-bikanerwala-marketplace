---
description: Fetch Azure DevOps or Jira work items, either an explicit list of tickets or everything matching a date range and status, and print a concise executive summary per item (one to two sentences, three or four only as a last resort) for a client-update deck. Read-only; safe to run anytime.
argument-hint: "<ticket ids/urls...> | --range this-week|last-week|this-month|last-month | --from <date> --till <date> [--status active|delivered|closed|updated[,...]] [--project <name>] [--scope <area-path-or-component>] [--tags <name>[,<name>...]] [--to <target>] [--output <path>] [--detailed] [keywords...]"
allowed-tools: Skill
---

# /ticket-summarizer:run

Turn tracker work items into plain-language summaries ready to paste into a
client-update deck.

## Examples

```
/ticket-summarizer:run AB#1234 AB#1235 https://dev.azure.com/myorg/myproj/_workitems/edit/1240
/ticket-summarizer:run --from 2026-07-01 --till 2026-07-31 --status delivered
/ticket-summarizer:run --range this-month --status closed
/ticket-summarizer:run --status active
/ticket-summarizer:run --from 2026-07-01 --till 2026-07-31 --project "Mobile App"
/ticket-summarizer:run --from 2026-08-11 --till 2026-08-12 --status closed --tags ecw
/ticket-summarizer:run --range this-week --status active,closed
/ticket-summarizer:run --status active --to #client-updates
/ticket-summarizer:run --status delivered --from 2026-07-01 --till 2026-07-31 --output ./client-update.md
/ticket-summarizer:run --status active --tags ecw --detailed
```

## Behavior

This command is a thin shell. It dispatches to the `ticket-summarizer` agent, which:

1. Detects whether the argument is an explicit list of ticket references or a
   date-range/status query.
2. Bootstraps the tracker through `issuekit:tracker-adapter` (Azure DevOps or Jira,
   auto-detected).
3. Resolves the matching work items with one batched fetch (never one call per
   item), narrowed to a small field set by default for speed and cost (`--detailed`
   widens it). Direct fetch for pasted references (any type), or a state-filtered
   search for a query (the tracker-adapter's search verb only filters by created
   date, so this plugin fetches full items and checks the exact `updated`/`resolved`
   date window itself); `--tags` always filters client-side after the fetch, on both
   trackers. Query-mode results are always
   scoped to Story, Bug, Epic, and (on Azure DevOps) Feature types only, a fixed
   default with no flag to widen it; a pasted ticket reference resolves regardless
   of its type.
4. Runs each item through `executive-blurb-writer` to produce a concise,
   plain-language summary: what was delivered, and why it matters only when the ticket
   itself says so. Targets one to two sentences; extends to three or four only as a
   last resort when two are not enough to say it accurately.
5. Prints one ready-to-paste brief line per item (`#<id>: <title>. <blurb>
   (<assignee>)`), grouped by status when a query resolves to a single status
   category; a multi-value `--status` prints one flat list instead, since a
   merged multi-state query has no single natural heading.
6. Offers to send the same summary to Slack or Teams: yourself by default, or the
   target named with `--to`. Asks first whether to send, and whether to include
   ticket ids in the message.
7. When `--output <path>` is given, offers to save the same summary to that file.
   Asks first whether to save, then whether to overwrite if the path already
   exists. Reuses the ids choice from step 6 when that already answered it.

No tracker writes, no tracker diff-and-confirm gate. Chat delivery (step 6) and file
output (step 7) are both opt-in and always ask first; unlike chat, file output
requires `--output` before it is even offered, since there is no default path.

## Query shapes

- **Explicit list:** paste ticket ids, keys, or urls, space or newline separated.
  Everything else in the argument is ignored.
- **Active:** `--status active`. No date range required.
- **Delivered / closed in range:** `--status delivered` (or `closed`) with
  `--from`/`--till`.
- **Updated in range:** `--from`/`--till` with no `--status`, or `--status updated`
  explicitly.
- **Date range via a preset:** `--range this-week|last-week|this-month|last-month`
  instead of computing `--from`/`--till` by hand. `this-week`/`this-month` run
  through today (a trailing partial period, since future dates carry no tickets
  yet); `last-week`/`last-month` are the complete prior period. Mutually
  exclusive with `--from`/`--till`.
- **Multiple statuses in one run:** `--status <value>[,<value>...]` accepts a
  comma-separated combination of `active`, `delivered`, `closed`, `updated`.
  An item matches when its resolved status is any one of them. A single value
  behaves exactly as above; two or more distinct statuses (e.g.
  `active,closed`) print one flat list with no heading, since a merged
  multi-state query has no single natural heading; `delivered,closed`
  collapses to one status since they are synonyms. `updated` may only appear
  alone: it already means no state filter at all, so combining it with any
  other value is a validation error.

Every query shape above is scoped to Story, Bug, Epic, and (on Azure DevOps)
Feature types only, always. This is not configurable per run: it keeps a
client-facing summary to the units stakeholders actually care about, not internal
Task-level work. Explicit-list mode is exempt: paste a Task's id and you get it
back regardless. Jira has no standard equivalent to Feature between Epic and
Story, so a Jira query stays at Story/Bug/Epic unless a project's
`.claude/tracker-policy.json` explicitly sets `feature_work_item_type.jira`.

`--tags <name>[,<name>...]` narrows any query-mode result to items whose labels
case-insensitively **contain** at least one given substring — a filter of `ecw`
matches `"ECW"`, `"ECW Story"`, and `"ECW Bug"` alike, since each label contains
the substring; it is never an exact-match comparison. This always filters
client-side, after the fetch, on both trackers: Azure DevOps' WIQL `CONTAINS` on
tags matches whole tokens rather than substrings within a multi-word tag, so a tag
like `"ECW Bug"` would not match a search for `"ECW"`, and Jira's JQL has no
substring operator for labels either. Pushing the filter into the search would
silently miss real matches on both, so it never is.

Every printed line, in both modes, follows the same default format: `#<id>:
<title>. <blurb> (<assignee>)`, with the blurb segment dropped entirely when
there is none and `(unassigned)` shown when there is no assignee. Add
`--detailed` to fetch a richer field set per item (exact state, parent; the
narrow default already includes assignee for the brief line) and print one
extra indented line under each item: `State: <state> | Parent: <parent
title, or "none">`. Omit `--detailed` (the default) for the narrow, fast
fetch; this is the tradeoff to reach for when you need more context on a
specific run, not something to leave on by default.

## Chat delivery

After printing, the agent offers to send the same summary to Slack or Teams
(whichever is detected). Defaults to a DM to yourself; add `--to <target>` to send
elsewhere instead:

- `--to jane@company.com`: resolves to that person.
- `--to #client-updates` (or any channel/group id): sent as-is to the chat adapter.

Sending anywhere but yourself always requires `--to`; it is never inferred from the
rest of the request. Every send, self or otherwise, asks first whether to send and
whether to include ticket ids.

## File output

Add `--output <path>` to also offer saving the summary to a file (relative paths
resolve against the current working directory). Unlike chat, there is no default
destination: without `--output`, this step does not run at all. When the path
already exists, the agent asks before overwriting it. The ids choice is shared with
chat delivery: if you already answered it there, you are not asked twice.

## Clipboard delivery

After printing (and after any chat send or file save above), the agent checks the
machine for a clipboard tool: `xclip`, `xsel`, `wl-copy`, `pbcopy`, or `clip.exe`, in
that order. When one is found, it offers to copy the same summary straight to the
clipboard, no flag required and regardless of whether `--to` or `--output` were
given. Answering yes puts the exact text you would paste into a deck directly on
your system clipboard: no file, no chat round-trip. The ids choice is shared with
chat and file delivery: if you already answered it there, you are not asked again.
When no clipboard tool is detected, this offer is skipped silently, the same way
chat delivery is skipped when no chat tool is detected.

## Configuration

Reads `.claude/tracker-policy.json` for `state_categories` (how vendor state names map
to "active"/"delivered"), and `feature_work_item_type`, `story_work_item_type`,
`bug_work_item_type` (per-tracker vendor type names used to build the fixed query-mode
type filter). See `issuekit/skills/tracker-adapter/references/policy-schema.md` for the
schema. Works with zero config; the shipped defaults cover the common Agile/Scrum/Basic
AzDO states and the default Jira workflow.

## See also

- `/sprint-status-reporter:run`: a full sprint status deck (Marp/PPTX) instead of
  plain-text brief lines, scoped to the current iteration rather than an arbitrary
  date range.
- `/issue-triager:run`: investigates and fixes a single issue; this command only
  reads and summarizes.
