---
name: dashboard-composer
description: "Composes a Pulse dashboard view payload from an already-computed sprint metrics model and an optional progress-delta model: the Delivered, In Progress, Currently at risk, and Newly at risk buckets for the live view, plus the same three sections rendered as paste-ready plain text for a deck. Pure computation, no tracker access, no file writes, no publishing, no clock reads. Returns a JSON payload for the sprint-status-reporter agent to publish; the agent alone holds the Artifact capability. Invoked by the sprint-status-reporter agent in pulse mode after sprint-analyzer and delta-analyzer."
metadata:
  author: Taha Bikanerwala
tools: Read
---

# Dashboard Composer

Compose the view payload that drives the Pulse dashboard. Input is two already-computed
models, a metrics model and (when a baseline resolved) a delta model. This skill does no
tracker access, no I/O, no publishing, and does not read the clock. It is pure computation so
it can be reasoned about and tested in isolation.

It differs from its rendering siblings on purpose. `deck-composer` and `delta-narrator` write
their decks to disk and return a path. This skill writes nothing and publishes nothing: it
returns a payload, and the agent performs the publish. Publishing to a hosted Claude Artifact
is a side effect reserved for the agent.

The page that displays this payload is `references/dashboard-page.html`. It is a static shell:
it reads the payload from its own Artifact document store at run time and renders it. The agent
publishes that page and writes this skill's payload into the store; this skill never touches
either.

## Input

The caller passes a JSON payload:

```json
{
  "sprint":  { "id", "name", "start", "end" },
  "metrics": <sprint-analyzer metrics model>,
  "delta":   <delta-analyzer delta model> | null,
  "today":   "YYYY-MM-DD"
}
```

`metrics` and `delta` are the exact, unmodified output of `sprint-analyzer` and
`delta-analyzer`. Read their fields as they arrive; never reshape them, and never re-derive a
bucket from an item's raw `state` string.

`delta` is `null` when the pipeline could not resolve a baseline (the agent's Phase D1 case 4,
"baseline established, nothing to compare yet"). That is a real state, not an error, and not an
empty delta.

`today` is supplied by the caller because this skill cannot read the clock. It is the only
source for the payload's timestamp.

The tracker policy is not passed in. Its classification rules were already applied upstream by
`sprint-analyzer` and `delta-analyzer`, so every bucket arrives pre-classified and this skill
has nothing left to decide with it.

## Output

Return a single JSON object. Do not write files. Do not publish. Do not add prose.

```json
{
  "live_view": {
    "delivered":         [ { "id", "title", "blurb", "points", "assignee" }, ... ],
    "in_progress":       [ { "id", "title", "blurb", "points", "assignee", "days_since_update" }, ... ],
    "currently_at_risk": [ { "id", "title", "blurb", "assignee", "reason" }, ... ],
    "newly_at_risk":     [ { "id", "title", "blurb", "assignee", "reason" }, ... ],
    "generated_at":      "<today>",
    "delta_available":   true | false
  },
  "deck_text": "<string>",
  "warnings":  [ "<string>", ... ]
}
```

Every item object carries the fields the analyst gave it, unchanged. An absent field stays
absent; a null stays null. Nothing is filled in.

## Computation rules

### The four buckets

Each bucket is a selection over the analyst's own lists. No bucket is computed from a raw
`state` string, and no item's fields are rewritten.

| Bucket | Source | Selection |
|---|---|---|
| `delivered` | `metrics.completed` | every entry, verbatim |
| `in_progress` | `metrics.in_progress` | entries whose `id` is not in `metrics.at_risk` |
| `currently_at_risk` | `metrics.at_risk` | every entry, verbatim |
| `newly_at_risk` | `metrics.at_risk` | entries whose `id` appears in `delta.newly_blocked` or `delta.newly_stale` |

`delivered` is `metrics.completed`, the analyst's `done`-category bucket. It is available
whether or not a delta resolved. Never source it from `delta.shipped`, which needs a baseline.

`in_progress` excludes the at-risk ids so an item appears under In Progress or under a risk
bucket, never both. The analyst deliberately lists a blocked in-progress item in both of its
own lists; the dashboard shows it once, as a risk.

`newly_at_risk` is a subset of `currently_at_risk`, carrying the current `reason` string. An id
that `delta` reports as newly blocked or newly stale but that is no longer in
`metrics.at_risk` is not listed, and earns a warning.

When `delta` is `null`: `newly_at_risk` is `[]` and `delta_available` is `false`. The empty
list alone never stands for "no delta"; `delta_available` is the signal.

When `delta` is present: `delta_available` is `true`, even when both
`delta.newly_blocked` and `delta.newly_stale` are empty. That is a real "nothing newly at
risk" reading, and it is different from having no baseline at all.

### Reasons

`currently_at_risk[].reason` and `newly_at_risk[].reason` are the analyst's own strings,
`blocked: <indicator>` or `stale: <n>d`, passed through character for character. Never reword
one, never recompute one, never translate one into a different vocabulary.

### Timestamp

`generated_at` is `today`, verbatim. It is the dashboard's "last updated" reading, so it must
describe the run that produced this payload and nothing else.

### Display caps

There are none. The dashboard scrolls, so every item in every bucket is listed. `sprint-analyzer`'s
8-item `up_next` cap and the deck composers' per-slide pagination exist to fit a slide; they do
not transfer here. Never truncate a bucket, and never summarize one as a count alone.

## Deck text rendering rules

`deck_text` is plain text for pasting into a deck. No markdown, no HTML, no table syntax.

Three sections, in this order, each introduced by its heading on its own line:

```
Delivered
In Progress
Risks & Blockers
```

Under each heading, one line per item:

```
<id> <title>: <blurb>
```

- Omit `: <blurb>` when `blurb` is `""` or absent, leaving `<id> <title>`.
- Under Risks & Blockers, append the reason in parentheses: `<id> <title>: <blurb> (<reason>)`.
- Risks & Blockers lists `currently_at_risk` first, then, when `newly_at_risk` is not empty, a
  `New since last check` sub-heading line followed by those items.
- An empty section renders one line: `None.`
- When `delta_available` is `false`, the section ends with the line
  `No delta available yet; this is a point-in-time view.`

Order the lines the same way the lists are ordered, by id ascending.

## Writing rules

- Never use em dashes or spaced hyphens as separators. Restructure the line.
- No LLM vocabulary: delve, leverage, robust, seamlessly, comprehensive, nuanced, elevate,
  foster, paradigm, ecosystem, holistic, innovative, synergy, empower, facilitate.
- Terse: ids, titles, the analyst's blurb, the analyst's reason. No commentary, no encouragement.
- Never rewrite a blurb. It arrives already condensed from the ticket; pass it through.

## Warnings

Each warning is one factual, actionable line. Add one for each of:

- An id in `delta.newly_blocked` or `delta.newly_stale` that is absent from `metrics.at_risk`:
  `Item <id> is reported newly at risk but is no longer in the current at-risk list; not shown under Newly at risk.`
- An `at_risk` entry whose `reason` starts with neither `blocked:` nor `stale:`:
  `Item <id> carries an unrecognized at-risk reason '<reason>'; shown as given.`

Do not restate `metrics.warnings` or `delta.warnings`. The agent surfaces those itself.

## Determinism

Same input produces the same output. Sort every list by item id ascending. Never introduce
randomness, never read the clock, and never depend on the order the input lists arrived in.

## Anti-patterns

- Do not read the clock, fetch anything, write a file, or publish an Artifact. This skill has
  `tools: Read` for a reason: the agent owns every side effect, including the dashboard publish.
- Do not reshape `metrics` or `delta`. Select from their lists; never rename, merge, round, or
  recompute a field.
- Do not re-derive Delivered or at-risk status from an item's raw `state`. Delivered is the
  analyst's `completed` list, which the analyst built from `stateCategory` under the tracker
  policy.
- Do not hardcode a project's state names. No vendor state string belongs in this skill.
- Do not fabricate an item, a count, a blurb, a reason, or a timestamp. Missing data stays missing.
- Do not emit an empty delta when `delta` is `null`. Set `delta_available: false` and say so in
  the deck text.
- Do not truncate a bucket or replace one with a count.
- Do not return the payload as prose or wrap it in commentary. The agent publishes the object.
