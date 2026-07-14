---
name: sprint-analyst
description: "Turns a raw sprint item list plus optional team capacity into a status-report metrics model: buckets items into Done / In Progress / To Do, computes percent complete by count and by points, counts remaining work, flags blocked and stale items, picks the up-next set, and summarizes capacity. Pure computation, no tracker access. Invoked by the sprint-status-report agent."
metadata:
  author: Taha Bikanerwala
tools: Read
---

# Sprint Analyst

Compute the metrics model that drives a sprint status deck. Input is already-fetched data;
this skill does no tracker access and no I/O. It is pure computation so it can be reasoned
about and tested in isolation.

## Input

The caller passes a JSON payload:

```json
{
  "sprint":  { "id", "name", "start", "end" },
  "items":   [ SprintItem, ... ],
  "capacity": Capacity | null,
  "policy":  { "state_categories", "blocked_indicators", "stale_after_days" },
  "today":   "YYYY-MM-DD"
}
```

`SprintItem = { id, url, title, type, state, stateCategory, assignee, points, remainingWork, updated, labels, description }`
(`stateCategory ∈ {done, in_progress, todo, unknown}`, already resolved by the adapter;
`description` is a short plain-text snippet or `""`).

**Reference date for staleness.** This skill cannot read the clock, so the caller passes
`today`. Use `today` as the reference date: an item is stale when `today − item.updated ≥
stale_after_days`. If `today` is missing, fall back to the most recent `updated` across all
items (a clock-free proxy for "now"). Never use `sprint.end` for staleness.

## Output

Return a single JSON object (the metrics model). Do not write files. Do not add prose.

```json
{
  "sprint": { "name", "start", "end" },
  "totals": {
    "count": <int>,
    "points": <number|null>,
    "by_bucket": {
      "done":        { "count", "points" },
      "in_progress": { "count", "points" },
      "todo":        { "count", "points" }
    }
  },
  "progress": {
    "pct_by_count": <0..100>,
    "pct_by_points": <0..100|null>,
    "remaining_count": <int>,
    "remaining_points": <number|null>,
    "basis": "points" | "count"
  },
  "completed":   [ { "id", "title", "blurb", "points", "assignee" }, ... ],
  "in_progress": [ { "id", "title", "blurb", "points", "assignee", "days_since_update" }, ... ],
  "at_risk":     [ { "id", "title", "blurb", "assignee", "reason": "blocked: <indicator>" | "stale: <n>d" }, ... ],
  "up_next":     [ { "id", "title", "blurb", "points", "assignee" }, ... ],
  "capacity_summary": { "total", "committed", "per_member": [ { "user", "capacity" } ], "note" } | null,
  "warnings": [ "<string>", ... ]
}
```

## Computation rules

### Bucketing
Group items by `stateCategory`:
- `done`, `in_progress`, `todo` → their buckets.
- `unknown` → count it in `todo` for totals (so nothing is dropped) AND add a warning:
  `Unmapped state '<state>' on <id>; counted as To Do. Set state_categories to classify it.`
  Group identical unmapped states into one warning naming a count, not one per item.
- Treat a `done`-category item whose vendor state is a *cancel/removed* terminal the same as
  done for progress purposes (it is no longer remaining work).

### Points
- `totals.points` and the per-bucket `points` are the sum of item `points`, skipping nulls.
- Track the null-points ratio = (items with null `points`) / (total items).
- If null-points ratio > 0.30, set `progress.basis = "count"`,
  `progress.pct_by_points = null`, `remaining_points = null`, and add a warning:
  `<n> of <total> items have no story points; progress shown by item count.`
  Otherwise `progress.basis = "points"` and compute point-based progress too.
- `remainingWork` (task hours) is not used for the headline; it may inform the capacity note.

### Progress
- `pct_by_count = round(100 × done_count / total_count)`; `remaining_count = total − done_count`.
- `pct_by_points = round(100 × done_points / total_points)` when basis is points;
  `remaining_points = total_points − done_points`.
- Empty sprint (0 items): all counts 0, `pct_by_count = 0`, `basis = "count"`, and a warning
  `Sprint '<name>' has no work items.`

### Blocked
An item is blocked if ANY of:
- a label in `policy.blocked_indicators.labels` is present on the item, or
- the item's `state` is in `policy.blocked_indicators.states`, or
- (only where board columns are exposed) its column equals `board_column`.
Record it in `at_risk` with `reason: "blocked: <the matched label/state>"`. A blocked item
that is also `in_progress` still appears in the `in_progress` list AND `at_risk`.

### Stale
An `in_progress` item is stale if `reference_date − item.updated ≥ policy.stale_after_days`.
Record `days_since_update` and add to `at_risk` with `reason: "stale: <n>d"` unless it is
already listed as blocked (blocked takes precedence; don't double-list). Compute
`days_since_update` for every in-progress item (shown in the deck), not just stale ones.

### Blurb (brief per-ticket detail)
Every item in `completed`, `in_progress`, `at_risk`, and `up_next` gets a `blurb`: one
plain-text line, at most ~140 characters, that says what the ticket is about in plain
language.

- Derive it from `item.description` when present: condense to a single clause, drop
  boilerplate headings ("Problem Statement", "Acceptance Criteria", "As a … I want …"), and
  keep the substance. Rewrite, don't just truncate mid-sentence.
- When `description` is `""`, derive the blurb from the title: restate it as a short action
  phrase (a bug title becomes what's being fixed; a story title becomes what's being built).
- Keep it factual and terse. No trailing period is required. Never invent scope the ticket
  doesn't state. Never use em dashes or spaced hyphens as separators.
- The blurb complements the title; it should not merely repeat it. If the title already
  says everything and there's no description, set `blurb` to `""` and let the deck show the
  title alone rather than padding.

### Up next
`up_next` = `todo`-bucket items in the order they arrived (the adapter sorts by backlog
rank / creation order). Cap at 8 so it fits one slide; if more remain, the last entry note
is left to the deck composer (pass the full count via a warning:
`<n> more items in To Do beyond the top 8.` only when truncating).

### Capacity summary
- `capacity == null` → `capacity_summary = null` and warning `Team capacity unavailable on
  this tracker.` ONLY if the caller expected it (Azure); for Jira, omit the warning (the
  agent knows capacity is N/A). Rule: if `capacity == null`, set `capacity_summary = null`
  and add no warning (silence is correct; the deck simply omits the slide).
- `capacity != null` → `total` = `capacity.totalCapacity`;
  `committed` = sum of `in_progress` + `todo` points (the work still on the board), or null
  when basis is count; `per_member` passed through; `note` = a one-line read such as
  `Committed <committed> pts against <total> capacity` or, when committed > total,
  `Over capacity by <diff> pts`.

## Determinism

Same input → same output. Sort every output list by a stable key (item id ascending within
each list) so runs are reproducible and diffable. Round percentages to whole numbers.

## Anti-patterns

- Do not invent points for items that have none. Missing → null, and the basis flips to count.
- Do not editorialize in `warnings`; each is a factual, actionable line.
- Do not drop items. Every input item lands in exactly one bucket total (unknown → todo).
- Do not read the clock, fetch anything, or write files.
