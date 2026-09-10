---
name: delta-analyzer
description: "Diffs two sprint snapshots (a baseline and the current fetch) into a progress-delta model: what shipped, what newly started, what was added or dropped from the sprint, what newly blocked or went stale, what regressed, and how percent-complete and remaining work moved between the two points in time. Pure computation, no tracker access. Invoked by the sprint-status-reporter agent in delta mode after sprint-analyzer."
metadata:
  author: Taha Bikanerwala
tools: Read
---

# Delta Analyst

Compute the progress-delta model that drives a "what changed" deck. Input is two
already-computed sprint states, a baseline and the current one. This skill does no tracker
access, no I/O, and does not read the clock. It is pure computation so it can be reasoned
about and tested in isolation. It complements `sprint-analyzer` (which computes a single
point-in-time model); this skill diffs two of those models plus their item lists.

## Input

The caller passes a JSON payload:

```json
{
  "sprint":  { "id", "name", "start", "end" },
  "baseline": {
    "generatedAt": "YYYY-MM-DD",
    "items":   [ SprintItem, ... ],
    "metrics": <sprint-analyzer metrics model>
  },
  "current": {
    "generatedAt": "YYYY-MM-DD",
    "items":   [ SprintItem, ... ],
    "metrics": <sprint-analyzer metrics model>
  },
  "policy":  { "state_categories", "blocked_indicators", "stale_after_days" },
  "today":   "YYYY-MM-DD",
  "baseline_source": "snapshot" | "history" | "none"
}
```

`SprintItem = { id, url, title, type, state, stateCategory, assignee, points, remainingWork, updated, labels, description }`
(`stateCategory ∈ {done, in_progress, todo, unknown}`). The two `metrics` models are the
exact output of `sprint-analyzer` for each state; reuse their numbers rather than
recomputing progress from scratch.

**Blocked / stale definitions come from `sprint-analyzer`.** An item is blocked or stale by
the same rules the analyst applies (`blocked_indicators`, `stale_after_days`). To decide
"newly blocked" / "newly stale", read the `at_risk` list on each side's metrics model: an
id at-risk now but not in the baseline is newly at-risk. Do not re-derive the rules here.

## Output

Return a single JSON object (the delta model). Do not write files. Do not add prose.

```json
{
  "sprint": { "name", "start", "end" },
  "window": {
    "from": "<baseline.generatedAt>",
    "to":   "<current.generatedAt>",
    "baseline_source": "snapshot" | "history" | "none"
  },
  "headline": {
    "pct_by_count":     { "from": <0..100>, "to": <0..100>, "delta": <int> },
    "pct_by_points":    { "from": <0..100>, "to": <0..100>, "delta": <int> } | null,
    "remaining_count":  { "from": <int>, "to": <int>, "delta": <int> },
    "remaining_points": { "from": <number>, "to": <number>, "delta": <number> } | null,
    "scope": { "added": <int>, "removed": <int>, "net_points": <number|null> }
  },
  "shipped":       [ { "id", "title", "blurb", "points", "assignee", "from_state", "to_state", "labels", "updated" }, ... ],
  "started":       [ { "id", "title", "blurb", "points", "assignee", "from_state", "to_state" }, ... ],
  "added":         [ { "id", "title", "blurb", "points", "assignee", "state", "labels", "updated" }, ... ],
  "removed":       [ { "id", "title", "points", "assignee", "last_state" }, ... ],
  "newly_blocked": [ { "id", "title", "reason": "blocked: <indicator>" }, ... ],
  "unblocked":     [ { "id", "title" }, ... ],
  "newly_stale":   [ { "id", "title", "days_since_update": <int> }, ... ],
  "regressed":     [ { "id", "title", "from_state", "to_state" }, ... ],
  "reassigned":    [ { "id", "title", "from": "<name|null>", "to": "<name|null>" }, ... ],
  "unchanged_count": <int>,
  "warnings": [ "<string>", ... ]
}
```

`from_state` / `to_state` / `last_state` / `state` carry the raw vendor `state` string (not
the bucket) so the deck can show what actually happened. `blurb` follows the same rule as
`sprint-analyzer` (a short plain-text line; `""` when the title says everything). `shipped`
and `added` entries also carry `labels` and `updated`, copied verbatim from the
current-side `SprintItem` that produced the entry. No other output list carries these two
fields.

## Computation rules

### Join
Build a map of baseline items by `id` and current items by `id`. Iterate the union of ids.
For each id determine `baseline_bucket` and `current_bucket` from each side's
`stateCategory` (treat a missing side as absent, not a bucket). Classify:

- **shipped** — present both sides, `current_bucket == done` and `baseline_bucket != done`.
- **started** — present both sides, `baseline_bucket == todo` and
  `current_bucket == in_progress`.
- **added** — present in current, absent in baseline. (On `baseline_source == "history"`,
  note the reconstruction caveat below; still list it.)
- **removed** — present in baseline, absent in current.
- **regressed** — present both sides and the bucket moved backward in the order
  `todo < in_progress < done` (e.g. `done → in_progress`, `in_progress → todo`,
  `done → todo`). A shipped item is never also regressed.
- **reassigned** — present both sides and `assignee` changed (either direction, including
  to/from null). Emit only when it changed.

An id can appear in at most one of {shipped, started, regressed} (the primary transition)
but may also appear in reassigned. `unchanged_count` = ids present both sides whose bucket
and assignee did not change.

### Newly blocked / unblocked / newly stale
Compare the `at_risk` entries on `baseline.metrics` and `current.metrics` by id:
- **newly_blocked** — id whose current `at_risk.reason` starts with `blocked:` and was not
  blocked in the baseline. Carry the current reason string.
- **unblocked** — id blocked in the baseline but not blocked now (still in the sprint).
- **newly_stale** — id whose current `at_risk.reason` starts with `stale:` and was not
  stale in the baseline. Carry `days_since_update` from the current metrics.

Do not recompute blocked/stale from raw items; trust each side's analyst model.

### Headline
Pull `from` values from `baseline.metrics.progress` and `to` values from
`current.metrics.progress`; `delta = to − from` (integer for percentages/counts).

- `pct_by_points` / `remaining_points`: emit the object only when **both** sides used
  `basis == "points"`. If either side is count-basis, set both point fields to `null` and
  add a warning: `Progress-by-points unavailable: <side> lacked story points; showing count-based movement only.`
- `scope.added` = count of `added`; `scope.removed` = count of `removed`.
- `scope.net_points` = (sum of `points` on added items) − (sum of `points` on removed
  items), skipping nulls; `null` when neither side carried points.

### Window
`window.from` = `baseline.generatedAt`, `window.to` = `current.generatedAt`,
`window.baseline_source` = the passed `baseline_source`.

### Warnings
Add a factual line for each of:
- `baseline_source == "history"`: `Baseline reconstructed from item history; items removed from the sprint before now cannot be recovered, so 'removed' may undercount.`
- A `basis` mismatch between the two sides (see Headline).
- An id present both sides with `stateCategory == unknown` on either side:
  `Item <id> has an unmapped state on one side of the window; its transition may be misclassified.`

## Determinism

Same input → same output. Sort every output list by item id ascending. Round percentage
deltas to whole numbers. Never introduce randomness or clock reads.

## Anti-patterns

- Do not recompute progress, blocked, or stale from raw items; consume the two
  `sprint-analyzer` models. This skill only diffs.
- Do not invent a baseline. If `baseline` is absent the caller handles that before invoking
  this skill; this skill is never called without both sides.
- Do not double-list an id across the primary transition buckets (shipped/started/regressed).
- Do not fabricate points or blurbs. Missing points → null; a title that says everything →
  `blurb: ""`.
- Do not read the clock, fetch anything, or write files.
