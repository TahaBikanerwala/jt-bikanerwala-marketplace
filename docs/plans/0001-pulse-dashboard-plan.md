# Plan: 0001-pulse-dashboard

> Spec: `docs/specs/0001-pulse-dashboard-spec.md` §5.3 (added 2026-09-04) · Context: `docs/specs/0001-pulse-dashboard-context.md` · Authored: 2026-09-04
> Risk: MODERATE (touches two shared skills consumed by all three `sprint-status-reporter` modes, and rewrites a live public Artifact's rendering) · Hard floors: none · Fabric standards: reachable (Automation Testing Conventions pack applies to the UI slice; no pack scoped to markdown agent/skill editing)

---

# Part 1 — Review this

*Everything a reviewer needs to approve or redirect the approach.*

## What we're doing

Taha wants `/sprint-status-reporter:pulse` to do two things it can't today: bound which *closed* tickets show up by when they closed (not just show every done ticket forever), and group the dashboard by tag/component instead of by a fixed Delivered/In Progress/Risks & Blockers section list, so his stakeholder deck reads by area instead of by bucket. He also wants active tickets to always be fully visible regardless of any date filter, and a "new since last refresh" count.

The forcing constraint is `docs/ARCHITECTURE.md` §7's explicit anti-pattern: *"Duplicating another plugin's already-hardened query/filter logic inside a new plugin or mode, rather than extending the plugin that already owns it"* — the exact anti-pattern spec 0002 was written to avoid when it chose to extend `ticket-summarizer` instead of adding a query panel to Pulse. Building Pulse's date filter as a `ticket-summarizer`-style independent tracker query would repeat that mistake. Instead, this plan reuses `sprint-status-reporter`'s **own** existing baseline mechanism — Phase D1's `since_arg`, already used by delta mode — and only borrows `ticket-summarizer`'s **flag vocabulary** (`--range` presets, `--status` values) for CLI consistency, not its query pipeline. This is Decision 1 below and it shapes every slice.

The second forcing constraint is that "closed" now means something narrower than before: only tickets that shipped *within the resolved window* (`delta.shipped`), not every done ticket in the sprint's history. Active tickets are explicitly exempt from any date narrowing. This is a real, disclosed behavior change from the dashboard's original Delivered semantics, not a bug.

Deliberate exception: this plan does **not** add a `--tags` narrowing flag to Pulse (mirroring `ticket-summarizer`'s), because the tag-tile view already gives full per-tag visibility without one — adding a redundant filter would be scope creep.

## How it breaks down

Two schema-widening slices come first (they're prerequisites everything else reads from), then the orchestration slice, then the two slices that actually produce the new dashboard. Slice order matches this dependency chain, not the spec's AC numbering.

| # | Slice | Delivers | Why this tier | Tier |
|---|-------|----------|---------------|------|
| 1 | Widen `sprint-analyzer` and `delta-analyzer` | `labels`/`state` on every metrics-model item; `updated`/`labels` on `shipped`/`added`; optional uncapped `up_next` | Small, mechanical, verbatim-passthrough changes to two shared pure functions — but shared by all three modes, so correctness matters more than the size suggests | `excellent` |
| 2 | Wire filtering into the agent | `--from`/`--till`/`--range`/`--status` parsing; reuses Phase D1's `since_arg`; `filters` added to the Phase P2 payload | The trickiest control flow (validation mirrored from `ticket-summarizer`, baseline-mechanism reuse) and the highest-consequence slice if Phase D1 breaks for delta mode too | `best` |
| 3 | Rewrite `dashboard-composer` | Tag-tile computation, window-scoped closed/new-since logic, Untagged handling, rewritten deck text | Genuinely new algorithm with no precedent in this codebase (context §4a); the single highest-risk slice per the code-orienteer's own flag | `best` |
| 4 | Rewrite `dashboard-page.html` | Dynamic tile-grid + per-tag list rendering, replacing the hardcoded 4-bucket layout; `plugin.json` version bump | A large but mechanical extension of an existing, well-established CSS/testid pattern (context §8a) | `excellent` |

Slice 1 has no dependency on 2; both must land before 3, which must land before 4.

## Decisions made

**1. Reuse Phase D1's `since_arg`, don't build a Pulse-specific query pipeline.** `--from`/`--range` resolve to a date that becomes Phase D1's `since_arg` — the exact mechanism delta mode's `--since` already uses, completely unmodified. This satisfies the feature without touching `docs/ARCHITECTURE.md` §7's anti-duplication rule. *Rejected: an independent date/status search over `getSprintItems`' fetch, mirroring `ticket-summarizer`'s Phase 1 filtering wholesale — this would duplicate hardened logic `ticket-summarizer` already owns, the exact anti-pattern ADR 1 records.*

**2. Active tickets are date-window blind; only closed and new-since tickets are windowed.** Every currently non-done ticket appears in full on every run ([spec invariant 4.5](../specs/0001-pulse-dashboard-spec.md#4-invariants)). A `--from`/`--till`/`--range` only changes which done tickets count as "closed" (`delta.shipped`, scoped to the window) and which count as "new" (`delta.added`, same scoping). *Rejected: filtering the whole current item set by `updated`, `ticket-summarizer`-style — this would silently hide stale/blocked active tickets, which is exactly what Taha said must never happen.*

**3. Closed = window-scoped shipped tickets, not the sprint's full done history.** When a baseline resolves, a tag's closed list is `delta.shipped` filtered to that tag, not `metrics.completed`. This is a real behavior change from the old Delivered section (every done ticket, always) — deliberate, not an oversight. On the first-ever run (no baseline yet), it falls back to `metrics.completed`, honestly labeled a point-in-time view, exactly as [5.1.8](../specs/0001-pulse-dashboard-spec.md#51-publish-or-update-the-pulse-dashboard-from-a-sprints-current-delta) already established for the old layout.

**4. `till` is a client-side proxy filter, not a second reconstruction.** `--till` filters `delta.shipped`/`delta.added` entries by their (now-added) `updated` field. It does not attempt a second point-in-time history reconstruction as of a past `till` date. *Rejected: reconstructing sprint state as of both `from` and `till` (a true historical window) — this needs Phase D1's Azure-DevOps-only history path run twice and has no defined behavior on Jira; out of proportion to what was asked.*

**5. Multi-tag fan-out; Untagged is a reserved, always-last catch-all.** A ticket with two or more labels appears once under each tag's tile and list. A ticket with none appears once under `Untagged`. Tags sort alphabetically, case-insensitive, grouped by lowercased key with the first-encountered (lowest-id) original casing used for display; `Untagged` is always last regardless of alphabetical position ([spec invariant 4.6](../specs/0001-pulse-dashboard-spec.md#4-invariants)).

**6. Widen the existing skills' schemas; don't pass raw `items` into `dashboard-composer`.** `labels`/`state` join `sprint-analyzer`'s per-item output; `labels`/`updated` join `delta-analyzer`'s `shipped`/`added` entries. `dashboard-composer`'s Phase P2 input stays `{sprint, metrics, delta, filters, today}` — no raw `SprintItem[]`. *Rejected (context §8's option (b)): widening the P2 call with raw `items` — this doubles `dashboard-composer`'s input shape (an already-computed model on one side, a raw fetch on the other) and breaks the "the analyst owns bucket-adjacent facts, the composer only selects" division of labor every other skill in this plugin follows.*

**7. Replace, don't append — at-risk signal moves to a per-row badge.** The Delivered/In Progress/Risks & Blockers sections are fully removed, per your choice. "Currently at risk" and "newly at risk" no longer get a dedicated section; instead, an active ticket that is blocked/stale carries its `reason` as a row badge, and one that is newly so carries an additional marker. This is a real, disclosed reduction in dedicated risk visibility, traded for the tag-oriented view you asked for.

## Where this could go wrong

- **Shared-skill regression.** `sprint-analyzer` and `delta-analyzer` are called by `status` and `delta` mode too. A mistake in slice 1 could silently change their existing deck output. Guarded by slice 1's quality check requiring byte-identical output when the new optional fields are omitted.
- **Data-testid breakage.** The old bucket-specific testids (`pulse-dashboard-delivered-*`, `-in-progress-*`, `-currently-at-risk-*`, `-newly-at-risk-*`) are removed, not renamed — any external automation targeting them breaks. This is disclosed here, not silent; slice 4's quality checks require the build agent to report exactly which testids were added/removed, per the Automation Testing Conventions pack's "report data-testid changes" rule.
- **No live tracker MCP during planning** (same caveat spec 0001 §9.1 already carries). Every slice's real gate is behavioral verification against a live or sandboxed project, not the fixture-only check available at plan-authoring time.
- **Tag casing drift** ("ECW" vs "ecw" on different tickets) could look like a bug if ungrouped. Guarded by Decision 5's case-insensitive grouping rule.

## What's out of scope

A `--tags` narrowing flag on Pulse (the tile view already gives full per-tag visibility). Per-tag custom tile colors. Clickable tile-to-section scrolling. Any change to `/sprint-status-reporter:run` or `:progress-delta`'s own rendered output — their calls to the widened skills simply omit the new optional fields and see no behavior change. A true point-in-time reconstruction as of a past `--till` date.

---

# Part 2 — Build detail

**Confidence markers:** `[verified]` = read directly in the code/docs during planning. `[inferred]` = pattern-matched, not directly confirmed.

## Shared conventions (all slices)

- **Architecture:** pipe-and-filter, unchanged ([context §1](../specs/0001-pulse-dashboard-context.md#1-affected-modules); `docs/ARCHITECTURE.md` §1-§3) `[verified]`. Agent orchestrates numbered phases; skills are pure (`Read` only, no clock, no I/O); only the agent holds `Artifact`/`Write`/`Bash`. This plan adds no new skill and no new tool grant to any skill.
- **Dependency direction:** agent → skills, one-directional, unchanged. `dashboard-composer` still never publishes; the agent still never pre-filters `metrics`/`delta` before passing them on (`agents/sprint-status-reporter.md` Phase P2's existing "do not pre-filter their lists" rule, `[verified]`, stays load-bearing — it is why slice 1 widens the skills' own output rather than having the agent post-process their results).
- **Calling-context convention:** every skill invocation is prefixed `Calling context: phase=<N>.` `[verified]`, unchanged.
- **Lexicon (from context §4b — do not rename):** flags `--from`/`--till`/`--range`/`--status`; range presets `this-week|last-week|this-month|last-month`; status vocabulary `active|delivered|closed|updated` (not `sprint-analyzer`'s `done`/`in_progress`/`todo` bucket names); tag source field `SprintItem.labels`; the reserved sentinel tag name is exactly `Untagged`.
- **Determinism:** every list sorted by id ascending; no clock reads inside a skill; `today` read once at Bootstrap, never re-derived (context §4c trap 2) `[verified]`.
- **Tests:** no automated test suite anywhere in this repo (confirmed by context §6 and this spec's own §5.1 Verification block) `[verified]`. Every slice's test strategy is the same behavioral pattern spec 0001/0002 already used: invoke the command against a real or sandboxed project (or, for the pure skills, hand-built fixtures matching the documented schema) and check output against the schema and the spec's ACs by inspection. For the UI slice, drive the published Artifact URL through a `chrome-devtools-mcp` browser session.
- **Automation Testing Conventions (fabric pack, applies to slice 4 only):** every interactive/assertion element gets a `data-testid`; kebab-case `[feature]-[element-or-action]`; repeated elements key off a stable id (never index); unique per screen; never couple a testid to styling or copy; do not remove/rename an existing testid without disclosing it; report every testid added/removed/renamed in the slice's summary.

---

## Slice 1 — Widen `sprint-analyzer` and `delta-analyzer` with the fields the tag-tile view needs

**Key decision:** Add verbatim-passthrough fields (Decision 6) to two shared pure skills rather than changing their bucketing logic or widening `dashboard-composer`'s input shape. `sprint-analyzer` gains `labels`/`state` on every list entry and an optional uncapped `up_next`; `delta-analyzer` gains `labels`/`updated` on `shipped`/`added` only (not `removed`/`regressed`/`reassigned`/`started` — those aren't consumed by the new dashboard, so widening them would be unused surface, per YAGNI).

**Structure**

- `plugins/sprint-status-reporter/skills/sprint-analyzer/SKILL.md` (modify)
  - Input schema: add optional `up_next_cap: <int> | null`. Absent → behaves exactly as today (cap 8, existing "`<n>` more items..." warning). `null` → no cap, every `todo`-bucket item included, no truncation warning.
  - Output schema: every entry in `completed`, `in_progress`, `at_risk`, `up_next` gains two fields, verbatim from the source `SprintItem`: `labels: string[]` and `state: string` (the raw vendor state, not the bucket).
  - "Up next" computation rule: replace the hardcoded cap of 8 with `up_next_cap ?? 8`; when the resolved cap is `null`, skip both the truncation step and the "more items" warning entirely.
- `plugins/sprint-status-reporter/skills/delta-analyzer/SKILL.md` (modify)
  - Output schema: each entry in `shipped[]` and `added[]` gains `labels: string[]` and `updated: string`, verbatim from the current-side `SprintItem` that produced the entry (for `shipped`, the current-side item; `added` only exists on the current side by definition).
  - No change to the join/classification rules, headline computation, or any other output list.

**Collaborators:** none new. Called unchanged by `sprint-status-reporter` agent's existing Phase 3 (`sprint-analyzer`) and Phase D2 (`delta-analyzer`) invocations; slice 2 is what actually passes `up_next_cap: null` from pulse mode.

**Control flow:**

- `sprint-analyzer`, up-next step: guard on `up_next_cap` — absent → `effective_cap = 8` (today's constant, now named, not re-derived); explicit `null` → no cap applied, no warning; explicit positive int → apply that cap, existing warning phrasing parameterized on the actual cap value instead of the literal "8".
- `sprint-analyzer`, every list-building step (`completed`, `in_progress`, `at_risk`, `up_next`): alongside the existing per-item field selection, also copy `item.labels` and `item.state` verbatim. No transformation, no fallback, no dedup of `labels`.
- `delta-analyzer`, `shipped`/`added` construction: alongside existing field selection, copy `labels`/`updated` verbatim from the current-side `SprintItem`.

**Tests:** No test runner in this repo. Extend the fixture-based behavioral check spec 0001 §5.1 already used: build a fixture `SprintItem[]` with (a) an item carrying two labels, (b) an item carrying `labels: []`, (c) more than 8 `todo`-bucket items. Confirm: a Phase-3-style call omitting `up_next_cap` returns exactly 8 `up_next` entries plus the existing warning, unchanged from before this slice; a call with `up_next_cap: null` returns every `todo` item with no warning; every entry in all four `sprint-analyzer` lists and in `delta-analyzer`'s `shipped`/`added` carries `labels` and (respectively) `state`/`updated` matching the source item exactly.

**Standards that bite here:** code-craft "no invented data" — `labels`/`state`/`updated` are verbatim copies, never derived; `sprint-analyzer`'s and `delta-analyzer`'s own "Determinism" and "Anti-patterns" sections (`[verified]`, both files) — same input still produces the same output, sorted the same way; ARCHITECTURE.md §7 "never re-derive a bucket from raw state" — `state` is exposed for display only, never used to recompute `stateCategory`/bucketing anywhere in this slice.

**Build-agent tier:** `excellent`

**Quality checks**

- A `sprint-analyzer` call that omits `up_next_cap` produces byte-identical output to before this slice, for every field except the two new ones (`labels`, `state`).
- **A `delta-analyzer` or `sprint-analyzer` call from `status`/`delta` mode (which never sets `up_next_cap`) sees zero behavior change** — this is the single highest-risk assertion in this slice, since both skills are shared across all three modes.
- `up_next_cap: null` returns the complete `todo`-bucket set, unsorted-cap-wise (still id-ascending per existing determinism rule), with no "more items" warning.
- Every `shipped`/`added` entry carries `updated` and `labels` verbatim from its current-side source item; no other `delta-analyzer` output list is touched.

---

## Slice 2 — Wire `--from`/`--till`/`--range`/`--status` into pulse mode, reusing Phase D1

**Key decision:** Implements Decisions 1-4. Adds a new "Pulse mode also parses" block to Phase 0, mirroring `ticket-summarizer`'s exact `--range`/`--status` resolution tables (context §4a, §4b) `[verified]` against `agents/ticket-summarizer.md`. The resolved `from` date becomes Phase D1's existing `since_arg` — zero changes to Phase D1's own case 1-4 logic, it simply becomes reachable from pulse mode. `till`, which Phase D1 has no concept of, is threaded through as a new `filters` field on the Phase P2 payload for `dashboard-composer` (slice 3) to apply.

**Structure**

- `plugins/sprint-status-reporter/agents/sprint-status-reporter.md` (modify)
  - Arguments section: new subsection "Pulse mode also parses:" (sibling to the existing "Delta mode also parses:" block), documenting `--from`/`--till`/`--range`/`--status` per the Control flow below.
  - Working state table: add rows `from_arg`, `till_arg`, `status_categories` (set in Phase 0, read in Phase D1/P2), `filters` (set in Phase 0, read in Phase P2).
  - Phase D1: no rule changes. Add one sentence noting `since_arg` may now originate from pulse mode's resolved `from_arg`, not only from delta mode's `--since`.
  - Phase P2: extend the call payload with `"filters": <filters>`, alongside the existing unmodified `sprint`/`metrics`/`delta`/`today`. The existing "pass metrics and delta exactly as produced... do not pre-filter their lists" sentence is unchanged and still governs `metrics`/`delta`; `filters` is additive, not a reshaping of either.
  - Phase 5 (pulse-mode summary): add one bullet reporting the resolved window (`from → till` or "unbounded") and which `--status` categories were shown.
- `plugins/sprint-status-reporter/commands/pulse.md` (modify)
  - `argument-hint` and Arguments section: add `[--from <date> --till <date> | --range this-week|last-week|this-month|last-month] [--status active|delivered|closed|updated[,...]]`.
  - Examples: add 2-3 mirroring `ticket-summarizer/commands/run.md`'s example style (e.g. `/sprint-status-reporter:pulse --range this-week --status closed`).
  - Behavior section: note that a resolved window narrows only closed/new tickets, never active ones, linking to spec invariant 4.5.

**Collaborators:** none new. Phase 0 constructs `filters` and passes it forward; Phase D1 and Phase P2 are the only other phases touched, both by threading a value through, not by new logic of their own.

**Control flow:**

- Phase 0, pulse mode only:
  - Parse `--from <date>` / `--till <date>` (normalize to `YYYY-MM-DD`) *or* `--range <preset>`. Guard: both given → stop, tell the user `--range` cannot be combined with `--from`/`--till` (mirrors `ticket-summarizer`'s exact validation wording, context §4a).
  - When `--range` is given: resolve `from_arg`/`till_arg` from the cached `today` using the identical table `agents/ticket-summarizer.md` Phase 0 already defines (`this-week` → Monday-of-current-ISO-week through `today`; `last-week` → Monday through Sunday of the preceding ISO week; `this-month` → 1st-of-month through `today`; `last-month` → 1st through last day of the preceding month) `[verified]`. Guard: an unrecognized preset → stop, name the four accepted values.
  - Parse `--status <value>[,...]`: split on comma, map `active` → `in_progress`, `delivered`/`closed` → `done` (synonyms, dedupe to one category), `updated` → the "unfiltered" sentinel. Guard: `updated` combined with any other value → stop, tell the user it means "no state filter at all" and cannot combine (mirrors `ticket-summarizer`'s validation verbatim).
  - Resolve `status_categories` from the mapped set: `{in_progress}` alone, `{done}` alone, `{unfiltered}` alone, or absent (no `--status` given).
  - Resolve `filters = { show_active: <status_categories is absent, {in_progress}, or {unfiltered}>, show_closed: <status_categories is absent, {done}, or {unfiltered}>, till: till_arg or null }`.
  - Set `since_arg = from_arg` when resolved (from either `--from` or `--range`); leave `since_arg` unset otherwise — this preserves today's default auto-baseline behavior exactly when no date filter is given at all.
- Phase D1: unchanged branching (cases 1-4); simply now reachable with `since_arg` set from a pulse-mode run, exactly as it already is for delta mode.
- Phase P2: unchanged except the payload gains `filters`.

**Tests:** No test runner. Behavioral: run `/sprint-status-reporter:pulse` with each flag combination (bare, `--range this-week`, `--from`/`--till`, `--status active`, `--status closed`, invalid `--range`, invalid `--status` combination, `--range` plus `--from`) against a sandboxed or real project; confirm the validation guards stop before any fetch with the correct message, and that a resolved `from_arg` visibly changes which baseline Phase D1 picks (compare against a manual delta-mode `--since` run on the same date for cross-check).

**Standards that bite here:** code-craft — guard clauses over nested conditionals for the validation checks; no comments (the control-flow outline above is the spec, not code to paste in). `ARCHITECTURE.md` §3's "only the agent performs orchestration" and Phase P2's existing no-pre-filter rule — `filters` must be additive, never a transformation of `metrics`/`delta`.

**Build-agent tier:** `best`

**Quality checks**

- **Validation matches `ticket-summarizer`'s wording and mutual-exclusion behavior exactly, and always stops before any fetch** — this is the single highest-risk assertion in this slice, since a silent default here would violate spec AC 5.3.1/5.3.2 and the "never silently default" lexicon rule (context §4c trap 4).
- `since_arg` reaches Phase D1 with zero modification to Phase D1's own case-1-through-4 logic (spec AC 5.3.3).
- `till_arg` is never passed to Phase D1 — it appears only inside `filters` on the Phase P2 payload (spec AC 5.3.4).
- `today` is read exactly once, at Bootstrap; `--range` resolution reads the cached value, never the clock again (context §4c trap 2).
- Phase P2's existing "do not pre-filter `metrics`/`delta`" sentence still holds true after this change — `filters` is a sibling field, not a wrapper around either model.

---

## Slice 3 — Rewrite `dashboard-composer`: tag-tile computation

**Key decision:** Implements Decisions 3, 4, 5, 7. Replaces the four-bucket selection table with a tag-tile selection table over an "active pool" (every non-done ticket) and a "closed pool" (window-scoped `delta.shipped`, or `metrics.completed` on first run), grouped by `labels` with multi-tag fan-out and a reserved `Untagged` catch-all. Adds a `new_since` block from `delta.added`. Rewrites `deck_text` to mirror the new shape.

**Structure**

- `plugins/sprint-status-reporter/skills/dashboard-composer/SKILL.md` (modify)
  - Input schema: add `filters: { show_active: bool, show_closed: bool, till: string | null }` alongside the existing `sprint`/`metrics`/`delta`/`today` (`delta` may still be `null`, unchanged meaning).
  - Output schema, `live_view`: replace `delivered`/`in_progress`/`currently_at_risk`/`newly_at_risk` with:
    ```
    "tags": [ { "tag", "active_count", "closed_count", "active_items": [ {id,title,blurb,points,assignee,state,labels,reason?,newly_at_risk?,days_since_update?} ], "closed_items": [ {id,title,blurb,points,assignee,state,labels} ] }, ... ],
    "new_since": { "window_from", "count", "items": [ {id,title,blurb,points,assignee,state} ] } | null
    ```
    `generated_at` and `delta_available` are unchanged in meaning and position.
  - New section "The tag-tile selection rule" (replaces "The four buckets"), per the Control flow below.

**Collaborators:** none new; still `tools: Read` only, still never publishes, still never reads the clock (uses `today` and `delta.window.from` as given).

**Control flow:**

- **Active pool** (one pass, mirrors the existing in-progress/at-risk exclusion rule, generalized to also cover `up_next`): every `metrics.at_risk` entry, verbatim, carrying `reason`; plus every `metrics.in_progress` entry whose id is *not* in `metrics.at_risk`; plus every `metrics.up_next` entry whose id is *not* in `metrics.at_risk`. When `delta` is present, mark an active-pool entry `newly_at_risk: true` if its id is in `delta.newly_blocked` or `delta.newly_stale`.
- **Closed pool:**
  - `delta` present: `delta.shipped`, then, when `filters.till` is set, keep only entries whose `updated <= filters.till`.
  - `delta` is `null`: `metrics.completed`, verbatim, unfiltered by `till` (there is nothing to window against yet — a first-run fallback, not a bug).
- **New-since pool:** only when `delta` is present: `delta.added`, then, when `filters.till` is set, keep only entries whose `updated <= filters.till`. `new_since = null` when `delta` is `null`.
- **Status gating:** when `filters.show_active` is false, every tile's `active_count`/`active_items` are `0`/`[]` (computed as empty, not omitted from the schema). Same for `filters.show_closed` and the closed side. `new_since` is unaffected by either flag (spec AC 5.3.14).
- **Grouping:** for every pool item, iterate its `labels`; group key = lowercased label, display label = the label string from the *lowest-id* item seen for that key (deterministic, since both pools are already id-ascending per each source skill's own determinism rule). An item with `labels: []` groups once under the literal key `Untagged` (not lowercased, not merged with any real tag).
- **Tile assembly:** union of tag keys present in either pool. For each key, build `active_count`/`active_items` from the active pool and `closed_count`/`closed_items` from the closed pool. **Omit a tag entirely when both its active and closed lists are empty after gating** (spec AC 5.3.8's "closed tiles/lists omitted entirely" generalizes to: an empty tile never renders). Sort the resulting tiles by display label, case-insensitive, ascending; move `Untagged` to the end regardless of where it sorted.
- **Deck text:** rewrite per the rule below (Deck text rendering rules), replacing the old three-fixed-heading format.

**Tests:** No test runner. Extend the fixture-based check: build a `metrics`/`delta` fixture pair with (a) a multi-tag ticket, (b) an untagged ticket, (c) a blocked ticket that is also `newly_blocked`, (d) a `shipped` entry whose `updated` falls outside a test `till` value, (e) `delta: null` to exercise the point-in-time fallback. Confirm every tile's counts/lists match the selection rule above exactly, `Untagged` sorts last, and the multi-tag ticket appears in both of its tags' lists (not deduplicated).

**Standards that bite here:** `dashboard-composer`'s own existing "Anti-patterns" section `[verified]` — do not reshape `metrics`/`delta`, do not fabricate a count/item/reason, do not truncate a tile (carries forward to "no display caps" per context §7). `ARCHITECTURE.md` §7 "never re-derive a bucket from raw state" — `state` is displayed only, `stateCategory`-derived bucketing is entirely inherited from `metrics`/`delta`, never recomputed here.

**Build-agent tier:** `best`

**Quality checks**

- **The active pool never double-lists an id, and an active-pool item's date-window blindness holds even when `filters.till` is set** — this is the single highest-risk assertion in this slice, since it is the direct implementation of the user's core "active tickets always show" requirement (spec invariant 4.5).
- A ticket with two labels appears once in each of its two tags' relevant list(s), never deduplicated, never dropped (spec invariant 4.6, spec AC 5.3.10).
- A ticket with `labels: []` appears exactly once, under `Untagged`, which always sorts last.
- When `delta` is `null`, `new_since` is `null` and closed tiles fall back to `metrics.completed`, both honestly reflecting the point-in-time state (spec AC 5.3.7).
- No tile, active list, or closed list is ever capped or truncated (spec AC 5.3.13).
- `deck_text` mirrors the live view's tile structure and gating exactly, with the same id-ascending order and `None.` convention the old three-section deck text used.

---

## Slice 4 — Rewrite `dashboard-page.html` for dynamic tag tiles

**Key decision:** Replaces the hardcoded `BUCKETS` array and its four render functions with a two-pass rendering of `live_view.tags[]`: first a compact tile-grid (tag name + active/closed count pills, matching the user's "tiles" request literally), then the existing detailed section-per-tag pattern extended to carry both an Active and a Closed sub-list per tag. Reuses every existing CSS token and accessibility pattern per context §8a rather than inventing a new visual language.

**Structure**

- `plugins/sprint-status-reporter/skills/dashboard-composer/references/dashboard-page.html` (modify)
  - Remove: `BUCKETS` array; `bucketSection`, `bucketHead`, `noDeltaNote` (the last is repurposed, see below) functions built around the four fixed keys.
  - Add: `tagSlug(label)` — lowercase, collapse every run of non-alphanumeric characters to one hyphen, trim leading/trailing hyphens (`Untagged` → `untagged`).
  - Add: `tileGrid(tags)` — renders the compact summary row, one card per tag (`data-testid="pulse-dashboard-tag-<slug>-tile"`), each showing the display label and two count pills (`-active-count`, `-closed-count`).
  - Add: `tagSection(tagEntry)` — renders the detailed per-tag block (`data-testid="pulse-dashboard-tag-<slug>-section"`), an Active sub-list (`-active-list`, items `-active-item-<id>`) and a Closed sub-list (`-closed-list`, items `-closed-item-<id>`), each showing `None.` when empty, each item row extended to show a small "NEW" marker when `item.newly_at_risk` is true.
  - Add: `newSinceSection(new_since)` — renders above the tile grid when `new_since` is non-null (`data-testid="pulse-dashboard-new-since-section"`, count `-new-since-count`, items `-new-since-item-<id>`).
  - Reuse unchanged: the tablist/tab logic, loading/empty/error state elements and testids, the copy-to-clipboard mechanism, the deck-text textarea (its content is just a different string now — no rendering logic change needed there).
  - Repurpose: the existing "no delta available" note (`pulse-dashboard-no-delta-state` testid, currently per-bucket) becomes one top-of-live-view note shown once when `delta_available` is `false`.
  - CSS: extend `.bucket`/`.bucket-head`/`.count`/`.item` (context §8a's identified imitation target) rather than introducing new class names. Active-count pill reuses the `--in-progress` token; closed-count pill reuses the `--delivered` token (same semantic colors as before, now on two pills per tile instead of one count per bucket).

**Collaborators:** none — this is a self-contained static page, same as today. It reads its data from the Artifact `db` document the agent already writes (Phase P3, unchanged by this plan).

**Control flow:**

- `render(document_)`: unchanged outer shape (loading/empty/error branching). Where it used to call `BUCKETS.forEach(...)`, it now: (1) calls `newSinceSection` when `view.new_since` is present, (2) calls `tileGrid(view.tags)`, (3) iterates `view.tags` calling `tagSection` for each.
- `tagSection`: for each of the two sub-lists (active, closed), guard on the corresponding array being empty → render `None.`; otherwise render one row per item via a generalized `itemRow` (unchanged signature, now also checks `item.reason`/`item.newly_at_risk` presence, same optional-field pattern the existing `metaLine` helper already uses for `points`/`days_since_update`).
- `tagSlug`: pure string transform, no DOM access — same category of helper as the existing `element`/`textNode` utilities.

**Tests:** No test runner. Behavioral: publish/refresh the dashboard against a fixture or real payload matching slice 3's output schema; drive the live URL through a `chrome-devtools-mcp` session confirming the tile grid renders correct counts, the detailed sections below show the right tickets in the right sub-list, a multi-tag ticket's row appears under each of its tags with distinct testids, and the deck-text/copy flow still works end to end.

**Standards that bite here:** Automation Testing Conventions pack (fabric, all rules in Shared conventions above) — every new interactive/assertion element gets a `data-testid`; stable ids keyed by tag-slug and ticket-id, never array index; existing testids not touched by this rewrite are preserved unchanged; the slice's own summary must report every testid added, removed, or renamed. Accessibility: preserve the existing 44×44 touch targets, `focus-visible` ring, and ARIA tablist semantics exactly (context §8a) — this slice adds no new interactive control beyond what already exists (tiles/rows are display-only).

**Build-agent tier:** `excellent`

**Quality checks**

- **Every old bucket-specific testid (`-delivered-*`, `-in-progress-*`, `-currently-at-risk-*`, `-newly-at-risk-*`) is gone, every testid the tablist/copy/loading/empty/error states used is unchanged, and the slice's summary explicitly lists what was added and removed** — this is the single highest-risk assertion in this slice, since a silent, undisclosed testid change is exactly what the Automation Testing Conventions pack forbids.
- A ticket appearing under two tags renders as two DOM rows with two distinct testids (`pulse-dashboard-tag-<slug-a>-active-item-<id>`, `pulse-dashboard-tag-<slug-b>-active-item-<id>`), never one shared id.
- No `<table>` element is used for the tile grid or lists (CSS grid/flexbox only, matching the existing layout approach).
- Contrast, focus-visibility, and 44×44 touch targets are unchanged from before this slice on every control that already existed.
- `plugin.json`'s version is bumped and its description mentions the new filtering/tag-tile capability.

---

## Hard floors

None. This is a read-only reporting surface with no auth, authorization, payment, cryptographic, or migration surface — none of the designated high-risk categories apply to any of the four slices.

## Escalation log

*(empty at authoring)*
