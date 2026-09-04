---
name: dashboard-composer
description: "Composes a Pulse dashboard view payload from an already-computed sprint metrics model and an optional progress-delta model: one tile per ticket label (plus a reserved Untagged tile for tickets carrying none), each holding that tag's active and closed ticket lists and their counts, a new-since-the-baseline callout, and the same tiles rendered as paste-ready plain text for a deck. Applies the caller's date and status filter while it selects, so a date window bounds only the closed and new-since lists and never the active ones. Pure computation, no tracker access, no file writes, no publishing, no clock reads. Returns a JSON payload for the sprint-status-reporter agent to publish; the agent alone holds the Artifact capability. Invoked by the sprint-status-reporter agent in pulse mode after sprint-analyzer and delta-analyzer."
metadata:
  author: Taha Bikanerwala
tools: Read
---

# Dashboard Composer

Compose the view payload that drives the Pulse dashboard. Input is two already-computed
models, a metrics model and (when a baseline resolved) a delta model, plus the filter the
caller resolved from its flags. This skill does no tracker access, no I/O, no publishing, and
does not read the clock. It is pure computation so it can be reasoned about and tested in
isolation.

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
  "today":   "YYYY-MM-DD",
  "filters": { "show_active": true | false, "show_closed": true | false, "till": "YYYY-MM-DD" | null }
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

`filters` is what the caller resolved from `--from` / `--till` / `--range` / `--status` before
any fetch ran. It arrives beside the two models rather than folded into them, so the models stay
exactly as their analysts produced them and this skill applies the filter while it selects.
`show_active` and `show_closed` say which side of each tag to show; `till` bounds which closed
and newly-added tickets count. Absent `filters` behaves as
`{ show_active: true, show_closed: true, till: null }`: both sides, no window. Pulse mode always
sends the field; the default is there so a payload without it shows the whole sprint rather than
nothing.

The tracker policy is not passed in. Its classification rules were already applied upstream by
`sprint-analyzer` and `delta-analyzer`, so every list arrives pre-classified and this skill
has nothing left to decide with it.

## Output

Return a single JSON object. Do not write files. Do not publish. Do not add prose.

```json
{
  "live_view": {
    "tags": [
      {
        "tag":           "<display label>",
        "active_count":  <int>,
        "closed_count":  <int>,
        "active_items":  [ { "id", "title", "blurb", "assignee", "labels", "state", "points"?, "days_since_update"?, "reason"?, "newly_at_risk"? }, ... ],
        "closed_items":  [ { "id", "title", "blurb", "points", "assignee", "labels", "state"?, "from_state"?, "to_state"?, "updated"? }, ... ]
      }, ...
    ],
    "new_since": { "window_from": "YYYY-MM-DD", "count": <int>, "items": [ { "id", "title", "blurb", "points", "assignee", "state", "labels", "updated" }, ... ] } | null,
    "generated_at":    "<today>",
    "delta_available": true | false
  },
  "deck_text": "<string>",
  "warnings":  [ "<string>", ... ]
}
```

Every item object carries the fields its source list gave it, unchanged. An absent field stays
absent; a null stays null. Nothing is filled in.

The rows are therefore not uniformly shaped, because they are drawn from five differently
shaped lists. That is correct, and the page shows each field when it is there:

| Row | Drawn from | Carries | Lacks |
|---|---|---|---|
| active, at risk | `metrics.at_risk` | `reason` | `points`, `days_since_update` |
| active, in progress | `metrics.in_progress` | `points`, `days_since_update` | `reason` |
| active, up next | `metrics.up_next` | `points` | `days_since_update`, `reason` |
| closed, baseline resolved | `delta.shipped` | `from_state`, `to_state`, `updated` | `state` |
| closed, point-in-time | `metrics.completed` | `state` | `updated` |

A blocked in-progress ticket is listed from `at_risk`, so its row carries no `points` even
though the `in_progress` entry for the same id does. Leave it that way. Copying the points
across from the other list is a merge of two models, and this skill selects from them rather
than merging them.

`newly_at_risk` is the one field this skill adds to a row. It marks membership in a list the
delta already computed, not a judgement of its own. Set it to `true` on an active row whose id
appears in `delta.newly_blocked` or `delta.newly_stale`, and omit the field entirely otherwise:
there is no `false`, and no row carries it when `delta` is `null`.

## Computation rules

### The tag-tile selection rule

Three pools are selected from the analysts' own lists, then grouped into one tile per tag. No
pool is computed from a raw `state` string, and no item's fields are rewritten.

| Pool | Source | Selection |
|---|---|---|
| active | `metrics.at_risk`, `metrics.in_progress`, `metrics.up_next` | every `at_risk` entry, verbatim; plus every `in_progress` entry whose `id` is not in `at_risk`; plus every `up_next` entry whose `id` is not in `at_risk` |
| closed | `delta.shipped`, or `metrics.completed` when `delta` is `null` | every entry, then, when `filters.till` is set and the source is `delta.shipped`, only those closed on or before it |
| new-since | `delta.added` | every entry, then, when `filters.till` is set, only those added on or before it. Empty pool when `delta` is `null` |

**The active pool is blind to the date window, and cannot be otherwise.** Its entries carry no
date field at all: `sprint-analyzer`'s list entries have none, and only `delta.shipped` and
`delta.added` carry `updated`. So `filters.till` has nothing to bind against on the active side,
and every currently non-done ticket is listed in full on every run whatever window the caller
asked for. Never reconstruct a date for an active row out of `days_since_update` and `today` in
order to narrow it. That turns a display field into a filter and breaks the one guarantee this
view makes.

The two exclusions keep the active pool free of duplicates. The analyst deliberately lists a
blocked ticket in both its `at_risk` list and whichever of `in_progress` / `up_next` it belongs
to; the dashboard lists it once, as the at-risk row, so the `reason` travels with it.

**Closed means closed inside the window, not done at some point.** With a baseline resolved, a
tag's closed list is `delta.shipped`, the tickets that reached done since that baseline. It is
not `metrics.completed`, which is every currently-done ticket in the sprint and has no window
behind it at all. This is a narrower reading than a plain "done" list, and it is the point of
the window.

**Comparing a ticket's date to `till` compares calendar dates, not strings.** `updated` arrives
as the tracker gave it, which on both Azure DevOps and Jira is a full ISO timestamp
(`2026-09-03T23:45:00Z`), while `till` is a plain `YYYY-MM-DD`. Take the calendar date of
`updated` (its first ten characters) and keep the entry when that date is on or before `till`,
inclusive. Comparing the two raw strings instead would drop every ticket closed on the `till`
date itself, since `2026-09-03T23:45:00Z` sorts after `2026-09-03`.

An entry whose `updated` is absent or empty cannot be placed inside or outside the window. Keep
it, and warn. Dropping it would hide a real closed ticket on the strength of a field that is not
there, and giving it a date would fabricate one.

**When `delta` is `null`:** the closed pool is `metrics.completed`, verbatim, and `filters.till`
does not apply to it. There is nothing to apply it to: `metrics.completed` is a point-in-time
reading of what is done now, and its entries carry no `updated` to test. `new_since` is `null`
and `delta_available` is `false`; the deck text says so in its first line. The empty state of a
list never stands for "no delta" on its own.

**When `delta` is present:** `delta_available` is `true`, even when nothing shipped and nothing
was added. That is a real "nothing moved" reading, and it is different from having no baseline
at all.

### Status gating

`filters.show_active` false → the active pool is empty. `filters.show_closed` false → the closed
pool is empty. Both fields stay in every tile, as `0` and `[]`; they are never dropped from the
shape, so the page renders one structure whatever the filter.

`new_since` is not gated by either flag. `--status` chooses which side of a tag's work to show;
what arrived since the baseline is a separate reading and stays.

### Grouping into tags

For every entry in every pool, walk its `labels` and file the entry under each one.

- **Group key** is the label lowercased. Two spellings of one tag (`ECW` on one ticket, `ecw` on
  another) are one tile, not two.
- **Display label** is the label string carried by the lowest-id entry, in either pool, that
  maps to that key. It decides the tile's name, so the name does not depend on which pool was
  read first.
- **A ticket with several labels is filed under each of them.** One ticket counted once per area
  is what a per-area read is for. Never dedupe it down to a single tile, and never pick a
  primary label.
- **A ticket whose `labels` is empty** is filed under the single reserved key `Untagged`, spelled
  exactly that way and never lowercased into the key space real labels occupy. It is a catch-all,
  not a tag: a ticket lands there because it has no labels, never because a label said so.
  A project that genuinely uses a label spelled `untagged` gets its own separate tile for it, and
  a warning, since two tiles reading nearly the same is confusing.

### Tile assembly and order

Tag keys are the union of the keys present in either pool. For each key, `active_items` are the
active-pool entries filed under it and `closed_items` the closed-pool entries filed under it,
each in id-ascending order.

`active_count` and `closed_count` are the lengths of the two lists beside them, and nothing
else. A count that disagrees with its list is a fabricated number.

**Drop a tag whose `active_items` and `closed_items` are both empty.** An empty tile says
nothing and takes up a row. This is also what carries the status filter through to the tiles:
with the closed side alone showing, a tag holding only active work has nothing left to show and
does not render.

Order the tiles by display label, case-insensitively ascending, then move `Untagged` to the end
whatever position it sorted into. It goes last because it is the leftover.

### The new-since callout

`new_since` exists only when `delta` is present:
`{ window_from, count, items }`. `items` is the new-since pool in id-ascending order, `count` is
its length, and `window_from` is `delta.window.from` verbatim, the date a baseline actually
resolved to rather than the date the caller asked for. When `delta` is `null`, `new_since` is
`null`: nothing arrived since a baseline that does not exist.

### Reasons

`reason` on an active row is the analyst's own string, `blocked: <indicator>` or `stale: <n>d`,
passed through character for character. Never reword one, never recompute one, never translate
one into a different vocabulary. It renders as a badge on the row, and that badge is the whole
of the dashboard's risk signal, so a reworded reason loses information nothing else carries.

### Timestamp

`generated_at` is `today`, verbatim. It is the dashboard's "last updated" reading, so it must
describe the run that produced this payload and nothing else.

### Display caps

There are none, for tiles or for lists. The dashboard scrolls, so every tag gets a tile and
every ticket in every list is listed. `sprint-analyzer`'s default 8-item `up_next` cap and the
deck composers' per-slide pagination exist to fit a slide; they do not transfer here, which is
why pulse mode asks the analyst for an uncapped `up_next` in the first place. Never truncate a
list, never keep only the top few tags, and never replace a list with its count.

## Deck text rendering rules

`deck_text` is plain text for pasting into a deck. No markdown, no HTML, no table syntax. It
mirrors the live view: the same tiles, in the same order, under the same gating. What the live
view omits, it omits.

Blocks in this order, separated by one blank line:

1. The point-in-time note, when `delta_available` is `false`, as the first line on its own:
   `No delta available yet; this is a point-in-time view.`
2. The new-since block, when `new_since` is not `null`.
3. One block per tile, in `live_view.tags` order.

**New-since block.** A heading line `New since <window_from> (<count>)`, then one line per item,
or `None.` when there are none.

**Tile block.** A heading line naming the tag and the counts of the sides being shown:

| Sides shown | Heading line |
|---|---|
| both | `<tag> (active <active_count>, closed <closed_count>)` |
| active only | `<tag> (active <active_count>)` |
| closed only | `<tag> (closed <closed_count>)` |

Then, for each side being shown, a sub-heading line `Active` or `Closed`, followed by one line
per item in that list, or `None.` when the list is empty.

A side that `filters` gated off gets no sub-heading and no `None.` line. `None.` means the list
is empty, and letting it stand for "you filtered this out" would report a filter as a fact about
the sprint.

**Item line:**

```
<id> <title>: <blurb> (<annotations>)
```

- Omit `: <blurb>` when `blurb` is `""` or absent, leaving `<id> <title>`.
- Annotations go inside one pair of parentheses, comma-separated, in this order: the row's
  `reason` when it has one, then `newly at risk` when the row is marked. Omit the parentheses
  entirely when the row has neither.

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
  `Item <id> is reported newly at risk but is no longer in the current at-risk list; no row is marked for it.`
- An `at_risk` entry whose `reason` starts with neither `blocked:` nor `stale:`:
  `Item <id> carries an unrecognized at-risk reason '<reason>'; shown as given.`
- An id that lands in both the active and the closed pool, so its tags list it on both sides:
  `Item <id> is both at risk and closed; it is listed on both sides of its tags.`
- A closed or newly-added entry with no usable `updated` while `filters.till` is set:
  `Item <id> has no update date; kept in the window, since it cannot be placed outside it.`
- A label whose lowercased form is `untagged`, which reads as the reserved catch-all:
  `Label '<label>' collides with the reserved Untagged tile; both are shown, as separate tiles.`

Do not restate `metrics.warnings` or `delta.warnings`. The agent surfaces those itself.

## Determinism

Same input produces the same output. Sort every item list by item id ascending, and order the
tiles by the rule above. A tag's display casing is decided by the lowest id carrying it, not by
which pool happened to be read first, so tiles are named the same way on every run. Never
introduce randomness, never read the clock, and never depend on the order the input lists
arrived in.

## Anti-patterns

- Do not read the clock, fetch anything, write a file, or publish an Artifact. This skill has
  `tools: Read` for a reason: the agent owns every side effect, including the dashboard publish.
- Do not reshape `metrics` or `delta`. Select from their lists; never rename, merge, round, or
  recompute a field.
- Do not narrow the active pool by `filters.till`, and do not reconstruct a date for an active
  row from `days_since_update` in order to narrow it. Active tickets are shown in full on every
  run; the window bounds the closed and new-since lists alone.
- Do not merge two of the analyst's lists to fill in a row. A row missing `points` is missing
  them because the list it came from has none.
- Do not dedupe a ticket that carries several labels down to one tile, and do not choose a
  primary label for it. It belongs to every tag it names.
- Do not treat `Untagged` as a label. It is the reserved name for having none, and no ticket's
  `labels` puts it there.
- Do not let a count disagree with the list beside it, and do not count a pool the gating
  emptied.
- Do not re-derive closed or at-risk status from an item's raw `state`. The closed list is the
  analyst's or the delta's own, built from `stateCategory` under the tracker policy.
- Do not hardcode a project's state names. No vendor state string belongs in this skill.
- Do not fabricate an item, a count, a blurb, a reason, a date, or a timestamp. Missing data
  stays missing.
- Do not emit an empty delta when `delta` is `null`. Set `delta_available: false`, leave
  `new_since` null, and say so in the deck text.
- Do not truncate a list, drop a tile to fit, or replace either with a count.
- Do not return the payload as prose or wrap it in commentary. The agent publishes the object.
