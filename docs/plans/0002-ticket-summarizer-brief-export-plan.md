# Plan: 0002-ticket-summarizer-brief-export

> Spec: `docs/specs/0002-ticket-summarizer-brief-export-spec.md` · Context: `docs/specs/0002-ticket-summarizer-brief-export-context.md` · Authored: 2026-09-03
> Risk: LOW (personal read-only tooling, no compliance pack scoped to this repo, no regulated data, no tracker writes, no auth surface touched) · Hard floors: none (see [Hard floors](#hard-floors)) · Fabric standards: reachable — the org-wide packs matched were mostly code-review-lens and UI/Rolai-specific rules that don't fit this markdown-plugin repo; the one actionable hit (shell-command injection avoidance) is folded into slice 5.3 below.

---

# Part 1 — Review this

*Everything a reviewer needs to approve or redirect the approach. If you only read one part, read this one.*

## What we're doing

Three small, additive changes to the already-shipped `ticket-summarizer` command: a `--range` shorthand that resolves `this-week`/`last-week`/`this-month`/`last-month` into a concrete date window, a new default one-line rendering per ticket (`#3702: Fix Flow Errors After MCP Reauthorization. Flows now recover automatically... (Rajkumar Buddha)`) that replaces the current bare bullet, a `--status` flag that now accepts a comma-separated list instead of one value, and a third delivery channel, copy-to-clipboard, alongside the chat-send and file-save the command already offers.

The constraint that forces this shape: this repo (`jt-bikanerwala-marketplace`) has no application code, no database, and no test runner anywhere in it — every plugin is a markdown agent/skill definition executed by Claude Code itself, verified by running the command and inspecting its output, not by a CI suite. Nothing in this plan introduces a build step, a dependency, or a test file the repo has no machinery to run.

One deliberate exception: `ticket-summarizer`'s agent currently holds no `Bash` tool at all. Slice 5.3 adds it, but narrowly, for exactly two calls (the clipboard-tool probe and the clipboard pipe) — this is a genuine new capability grant, not a formality, and it's called out per-slice rather than folded silently into the shared conventions.

## How it breaks down

Each slice touches the same one file (`agents/ticket-summarizer.md`) at different points, so they build in spec order rather than in parallel, and each slice is scoped to avoid touching another slice's edit points. Slice 5.1 is the smallest and safest (pure date math, one new validation error). Slice 5.2 is the widest-reaching (five touch points, a breaking rendering change, a new dedup rule this repo has no prior art for). Slice 5.3 is new and isolated (a new phase after the others, a new tool grant), but it reuses whatever slices 5.1/5.2 already produce rather than building its own rendering path.

| # | Slice | Delivers | Why this tier | Tier |
|---|-------|----------|---------------|------|
| 1 | [Resolve a week or month range with one flag](../specs/0002-ticket-summarizer-brief-export-spec.md#51-resolve-a-week-or-month-range-with-one-flag-instead-of-two-dates) | `--range` weekly/monthly shorthand, resolved before the existing query runs | Localized, but the calendar-boundary math (trailing vs. complete period) and a new mutual-exclusion error must be exactly right the first time | `excellent` |
| 2 | [Print every matching ticket as one ready-to-paste line](../specs/0002-ticket-summarizer-brief-export-spec.md#52-print-every-matching-ticket-as-one-ready-to-paste-line) | New default brief-line rendering; `--status` becomes a comma-separated, category-deduped list | The widest slice: touches Phase 0, 1, 3, 4, and 5, is a breaking format change, and invents a dedup rule with no prior art in this codebase to imitate | `excellent` |
| 3 | [Copy the printed summary straight to the clipboard](../specs/0002-ticket-summarizer-brief-export-spec.md#53-copy-the-printed-summary-straight-to-the-clipboard) | A third, always-offered delivery channel via a detected OS clipboard tool | New `Bash` grant and a real shell-injection hazard to avoid; this plan fully specifies the safe technique so the executor implements a known-good pattern, not an improvised one | `excellent` |

None of the three needed `best`: nothing here is a novel algorithm or a new abstraction the slice has to design — the harder ones (5.2's category dedup, 5.3's safe shell-out) are fully worked out below, so `excellent` is well-fed enough to execute them faithfully. None qualified for `fast` either: all three edit the same 482-line, multi-touch-point file the context file flags as an ai-ergonomics concern, and getting the calendar math, the dedup rule, or the shell-safety pattern slightly wrong is the kind of error `fast` is more likely to make under-specified.

## Decisions made

**1. Extend `ticket-summarizer` in place rather than add a query panel to `sprint-status-reporter`'s Pulse dashboard.** The dashboard is a push architecture (the agent computes everything server-side, once per run) with no live tracker query capability from the browser; a panel would duplicate fetch, filter, and blurb logic `ticket-summarizer` already has hardened over eight prior commits, plus add a new stored Artifact document and an arbitrary date ceiling. Lands in the spec's overview and every slice's Reachability. *Rejected: a "Live Panel" tab in Pulse with date/dropdown inputs — genuinely buildable, but it duplicates already-working logic for a UX win that shrinks to nothing once "download" turned out to mean clipboard-copy anyway.*

**2. The brief-line format becomes the universal default, with no flag to restore the old bullet.** One rendering path, used by both query mode and explicit-list mode, by both the printed output and the chat/file bodies. Lands in slice 5.2. *Rejected: an opt-in `--brief` flag preserving the old format as default — keeps a permanent branch for a format nobody would choose once the new one exists, and the reuse-Phase-3's-structure pattern (context §2) would have to branch on the flag at every downstream consumer instead of just once.*

**3. `--status` generalizes to a comma-separated, category-deduped list rather than a second flag.** Values are resolved to their category first (`active`→in-progress, `delivered`/`closed`→done — already synonyms today), then deduped; one resulting category behaves exactly as it does today, two or more print one flat list with no heading, and `updated` (which means "no state filter at all") may only appear alone since combining "unfiltered" with a specific filter is incoherent. Lands in slice 5.2. *Rejected: a new `--status-any`/multi flag — would fragment the query surface `--tags` already established the OR-list convention for on the same command.*

**4. Clipboard delivery is the last of three optional delivery phases, offered unconditionally whenever a tool is detected.** It runs after chat (Phase 4) and file (Phase 5) so it can reuse whichever `include_ids` answer either of them already resolved, and it never gates behind a flag — the offer just appears whenever the machine has a clipboard tool and there's something to copy. Lands in slice 5.3. *Rejected: an explicit `--copy` flag — adds one more thing to remember to type for the one delivery channel that should just be there when available, unlike file save, which genuinely needs a path to be told anything at all.*

**5. The clipboard payload reaches the OS tool through a temp file and shell redirection, never a command string built from ticket text.** Ticket titles and blurbs are untrusted-enough text (arbitrary characters, occasionally including shell metacharacters) to never be interpolated into a Bash command line. Lands in slice 5.3, directly satisfying the org-wide `os-command` standard surfaced during planning. *Rejected: `echo "<payload>" | <tool>` with the payload inlined — a title or blurb containing a backtick, `$()`, or unescaped quote would be parsed as shell syntax, not literal text.*

## Where this could go wrong

- **The 482-line agent file has edits scattered across five phases, the Working-state table, and the Do-not rules** (flagged by code-orienteer as an ai-ergonomics concern). A partial-view edit risks missing a table row or a Do-not-rules line that has to change in lockstep with the phase it documents. Guarded by: every slice's Structure section below names every touch point explicitly, and each slice-builder is instructed to read the whole file before editing.
- **Slice 5.2's category-dedup rule for multi-value `--status` is new — this codebase has no prior art for it.** Guarded by: slice 5.2's Quality checks require flat-list behavior to key off *distinct resolved categories*, not raw flag-value count (so `--status delivered,closed`, a same-category synonym pair, is verified to behave as a single category, not as a flat list).
- **The clipboard shell-out (slice 5.3) is the one place this plan introduces genuinely new I/O risk.** Guarded by: the temp-file-and-redirection design in Decision 5, and a Quality check that no ticket-sourced text ever appears inside a Bash command string.
- **Azure DevOps' known WIQL search-index replication lag** (a work item missed by `searchIssues` ~18 minutes after creation, per org memory) can make a just-created ticket briefly invisible to slices 5.1/5.2's queries. This plan does not fix it — it's a tracker-side issue, not a bug this slice introduces — but the executor should not mistake a missing just-created ticket for a defect in the new range/status logic.

## What's out of scope

No change to `sprint-status-reporter` or the Pulse dashboard (Decision 1). No change to `executive-blurb-writer`'s blurb-generation logic — this plan only consumes its existing `{id, title, url, blurb}[]` output differently. No new tracker verb, no new write capability, and no confirmation gate — the command stays fully read-only. No flag to restore the old bullet-list rendering (Decision 2).

---

# Part 2 — Build detail

*Prescriptive detail for the build agent. Reviewers can skim or skip.*

**Confidence markers used below:** `[verified]` = the planner read the code or docs and confirmed it. `[inferred]` = pattern-matched from a sibling implementation, not confirmed — the build agent should check before assuming.

## Shared conventions (all slices)

- **Architecture:** pipe-and-filter, phase-orchestrated agent + pure-computation skills, per `docs/ARCHITECTURE.md` [verified]. Unchanged by this plan: `ticket-summarizer`'s agent gains phase count and (in slice 5.3) one tool grant; it does not become a different shape, and `executive-blurb-writer` stays untouched and Read-only.
- **Dependency direction:** the agent → `issuekit:tracker-adapter` (all tracker reads) and agent → `executive-blurb-writer` (skill, Read-only, unmodified), one-directional, unchanged [verified]. No skill in this plan gains `Write` or `Bash`; the one new tool grant (`Bash`, slice 5.3) is on the agent alone.
- **Lexicon (from context §4b — do not rename):**
  - Slice 5.1: flag `--range`; accepted values `this-week`, `last-week`, `this-month`, `last-month`; clock source is the already-existing `today` cache key (never re-derived).
  - Slice 5.2: format string `#<id>: <title>. <blurb> (<assignee>)`; missing-assignee literal `(unassigned)`; new field on both fetch-field lists: `assignee`; detailed extra line becomes `State: <state> | Parent: <parent title, or "none">` (drops `Assignee:`).
  - Slice 5.3: tool probe order `xclip`, `xsel`, `wl-copy`, `pbcopy`, `clip.exe`; offer text `"Copy this summary to the clipboard?"`; success message `"Copied to the clipboard."`; failure template `"Could not copy to the clipboard: <reason>. The printed summary above is still the full output."`; `tools:` frontmatter gains `Bash`.
- **Tests:** this repo has no automated test suite of any kind — no `package.json`, no test-runner config, no `*.test.*`/`*.spec.*` file, no test step in either GitHub workflow (confirmed by code-orienteer's repo-wide search; matches spec 0001's and this spec's own claim). No test files are created or modified anywhere in this plan. Every slice's verification is behavioral: invoke `/ticket-summarizer:run` with the relevant flags against a real or simulated tracker project (and, for slice 5.3, a real or simulated clipboard tool) and check the printed output against the spec's acceptance criteria by inspection, per each slice's spec Verification block.

---

## Slice 5.1 — Resolve a week or month range with one flag

**Key decision:** Add a `--range <preset>` flag, parsed alongside the existing `--from`/`--till` inside the mode=query flag block (not the "stripped before mode detection" block, since `--range`, like `--from`/`--till`, is query-mode-only). It resolves to a concrete `{from, till}` pair before Phase 1 runs, using the single `today` clock read Phase 0 already establishes. No new abstraction: this is one more entry in the existing flag-parsing shape (context §4a).

**Structure**

- `plugins/ticket-summarizer/agents/ticket-summarizer.md` (modify):
  - **Arguments** section, mode=query flag list: add a `--range <preset>` bullet, phrased the same way the `--from <date>` / `--till <date>` bullet is phrased today.
  - **Validation** bullets: (a) new bullet — `--range` combined with either `--from` or `--till` is a validation error surfaced before any fetch, phrased in the same voice as Bootstrap's existing hard-stop errors ("stop and tell the user...") [verified against Bootstrap step 3's phrasing]. (b) new bullet — an unrecognized `--range` value is a validation error that lists all four accepted presets. (c) edit the existing `--status delivered|closed|updated` with-no-date-range bullet: its "neither `--from` nor `--till`" condition becomes "neither `--from`, `--till`, nor `--range`" — `--range` alone satisfies the same "a date range was given" test `--from`/`--till` already satisfy (AC 5.1.5).
  - **Working state** table: add two rows, `from` and `till` — Set in: Phase 0, Read in: Phase 1 — the resolved date pair, whether it came from `--range` or from explicit `--from`/`--till`. `[inferred]`: the table's existing style (see `mode`, `states`, `date_field` rows) is the naming model; there are no pre-existing `from`/`till` rows to imitate (context §8 — this is new naming, not a rename).
  - **Phase 0: Parse** narrative: add the `--range` resolution step, described as a decision table (not code):

    | `--range` value | `from` | `till` |
    |---|---|---|
    | `this-week` | Monday of the current ISO week | `today` |
    | `last-week` | Monday of the immediately preceding ISO week | Sunday of the immediately preceding ISO week |
    | `this-month` | 1st of the current calendar month | `today` |
    | `last-month` | 1st of the immediately preceding calendar month | Last day of the immediately preceding calendar month |

    When `--range` is absent, `from`/`till` are the explicit `--from`/`--till` values (or absent), exactly as today.

**Collaborators:** none new — this slice adds parsing and a lookup table inside the existing agent; it calls no new skill and no new adapter verb.

**Control flow:**
- Guard: `--range` set AND (`--from` set OR `--till` set) → validation error, stop before Phase 1.
- Guard: `--range` set AND value not in `{this-week, last-week, this-month, last-month}` → validation error listing all four, stop before Phase 1.
- Else if `--range` set → resolve `from`/`till` per the table above, using cached `today`.
- Else → `from`/`till` are whatever `--from`/`--till` resolved to today (unchanged).
- Validation bullet (c)'s check now reads `from`/`till` (populated either way) rather than the raw `--from`/`--till` flags, so `--range` correctly satisfies it.

**Tests:** none (no test runner in this repo). Verification is behavioral per the spec's Verification block for this slice: run each of the four presets on different calendar days and confirm the resolved window; run `--range` combined with `--from` and confirm the validation error; run `--range bogus-value` and confirm the error lists all four presets; run bare `--status closed` (no date flags) and confirm the existing AskUserQuestion prompt still fires (regression check for the edited Validation bullet).

**Standards that bite here:** `code-craft`'s "fail fast at boundaries" (both new validation errors happen before any fetch, not after a partial run); `code-craft`'s categorical framing (the four presets are a closed enum, not a string matched by ad hoc branching — resolve via the lookup table above, not a chain of if/else string comparisons).

**Quality checks**

- Mutual exclusion is enforced before any fetch runs, never as a silent override (AC 5.1.4).
- `this-week`'s window ends at `today`, never extends to a future Sunday (AC 5.1.2) — a trailing partial period, not a symmetric complete one.
- An unrecognized `--range` value's error text names all four accepted presets, never falls back to a default window (AC 5.1.6).
- Bare `--status delivered|closed|updated` with no date flag at all still triggers the existing AskUserQuestion default-range prompt exactly as before (AC 4.1 — no regression from editing the shared Validation bullet).
- **`today` is read exactly once in Phase 0; every range computation in the table above reads that cached value, never a second clock read.**

---

## Slice 5.2 — Print every matching ticket as one ready-to-paste line

**Key decision:** Two changes land together because they share every downstream touch point: Phase 3's rendering switches from `- [<id>] <blurb>` to the brief-line format (Decision 2), and `--status` becomes a comma-separated, category-deduped list (Decision 3). Both flow through the existing "downstream phases reuse Phase 3's structure exactly" pattern (context §2), so Phase 4/5's body-building needs no parallel render path — only the with-ids/without-ids toggle changes what's shown.

**Structure**

- `plugins/ticket-summarizer/agents/ticket-summarizer.md` (modify):
  - **Arguments** section: `--status` bullet's value grammar becomes a comma-separated list of `active|delivered|closed|updated`, with a new rule: `updated` may only appear alone — combining it with any other value is a validation error (it means "no state filter at all," which is incoherent alongside a specific filter). This is new: no prior art in this codebase resolves a multi-value status set [inferred: generalizes the existing `--tags` OR-list convention (context §2, Phase 1 step 7), but by category-equality rather than substring].
  - **Validation** bullets: replace the (already slice-5.1-edited) `--status delivered|closed|updated` bullet with: "When the resolved `--status` category set is anything other than exactly `{active}` alone, and neither `--from`, `--till`, nor `--range` was given: ask once via `AskUserQuestion` for a date range (default suggestion: last 30 days)." This correctly extends the existing single-value rule to multi-value sets like `active,closed`, which need a date range because they include something beyond pure `active`, even though `active` alone would not.
  - **Phase 0** `--status` resolution table: replace the existing single-value table with a two-step resolution: (1) split on comma, map each value to its category (`active`→`in_progress`; `delivered`/`closed`→`done`; `updated`→a sentinel meaning "unfiltered"); reject if the sentinel appears alongside any other value; (2) dedupe to the distinct category set. If exactly one distinct category remains, resolve `states`/`status_label`/`date_field` exactly as the existing single-category table does today (AC 4.1, no behavior change for a single value). If two or more distinct categories remain: `states` = the union of each category's vendor-state list from `policy.state_categories`; `status_label` = `null` (AC 5.2.6, triggers the existing "flat list, no heading" branch Phase 3 already has for `mode=explicit`); `date_field` = `"updated"` (the one date field guaranteed present on every fetched `Issue` regardless of category, `[verified]` against `verbs.md`'s `Issue` type — `resolved` is done-category-only).
  - **Phase 1** `fields` table: add `assignee` to both rows (`detailed: false` and `detailed: true`) [verified against context §4a's imitation target — the table's existing two-row shape]. `[verified]` against `plugins/issuekit/skills/tracker-adapter/references/verbs.md`: `getIssuesBatch`'s Jira fallback (JQL `key in (...)` with an explicit fields list, degrading to per-id `getIssue` only when the search tool's own capability can't return the requested fields at all) is gated on tool/version capability, not field-list length — adding one more named field does not, by itself, push this fallback path anywhere it wasn't already (context §5's dragon is addressed, not left open).
  - **Phase 3: Print** rendering bullets: replace the flat-bullet format (`- [<id>] <blurb>`) with the brief-line format `#<id>: <title>. <blurb> (<assignee>)`. Omit `. <blurb>` (segment and its leading period together) when `blurb` is `""`. Render `(unassigned)` literally when `assignee` is absent. The existing heading-vs-flat-list branch (currently keyed on `mode=explicit` or `status_label == null`) gains one more condition that also yields `status_label == null`: a 2+-distinct-category `--status` (already resolved that way in Phase 0, so no new branch logic is needed here — it inherits the existing flat-list path for free). The `--detailed` extra indented line drops its `Assignee:` segment (redundant now that assignee is always inline), keeping `State: <state> | Parent: <parent title, or "none">` unchanged.
  - **Phase 4** step 5 / **Phase 5** step 3 ("reuses Phase 3's structure exactly"): no new logic — these already say to reuse Phase 3's structure, so once Phase 3 renders brief-line by default, they inherit it. Make explicit in the body-building bullets: with `include_ids`, each line keeps its leading `#<id>: `; without, that prefix alone is dropped, leaving `<title>. <blurb> (<assignee>)`.
  - **Do-not rules**: add one bullet — "Never leave a flag or code path that restores the old `- [<id>] <blurb>` bullet format; the brief line is the only rendering this command produces." Leave the existing "never request `severity`/`customFields`" rule untouched (context §4c trap 5 — do not touch this rule while editing the fields table above, only add `assignee`).
- `plugins/ticket-summarizer/commands/run.md` (modify): update the `argument-hint`, the "Query shapes" section, and the `--tags`/`--detailed` prose to describe the comma-separated `--status`, the brief-line default, and the dropped `Assignee:` line under `--detailed`. Exact wording is genuine coder latitude — this is documentation prose, not load-bearing logic.

**Collaborators:** none new. `executive-blurb-writer` is called exactly as today (Phase 2, unchanged) — its `{id, title, url, blurb}[]` output [verified against its `SKILL.md`] is consumed by the new Phase 3 rendering, not altered.

**Control flow:**
- `--status` parse: split on comma → map each to category or the `updated` sentinel → guard: sentinel present AND list length > 1 → validation error → else dedupe categories.
- One distinct category → existing per-category resolution (unchanged branch).
- Two-plus distinct categories → union `states`, `status_label = null`, `date_field = "updated"`.
- Phase 3 render, per item: build `#<id>: <title>`; append `. <blurb>` only if `blurb` is non-empty; append ` (<assignee or "unassigned">)`.
- Phase 3 heading choice: existing condition (`mode == explicit` or `status_label == null`) — no new condition to add, since the multi-category case already sets `status_label = null` in Phase 0.

**Tests:** none (no test runner). Verification is behavioral: run an explicit-list invocation and a `--range`/`--status`/`--tags` query against a real tracker project; confirm every line matches the format exactly, including one item with no blurb and one with no assignee; run `--status active,closed` and confirm a flat list (no heading); run `--status delivered,closed` (same-category synonyms) and confirm it behaves as the single `"Delivered"`-headed case, not a flat list; run `--status updated,active` and confirm the validation error; run `--detailed` and confirm the extra line has no `Assignee:` segment.

**Standards that bite here:** `code-craft`'s categorical framing (status resolution is a lookup/dedup over categories, not a branching if/else on raw strings); `code-craft`'s "no fabricated data" discipline, already an existing agent rule, now also covering the new `(unassigned)` literal (it's a known convention, never a guess); the repo-wide `max-lines`/file-size-discipline standard, relevant because this slice is the widest touch on an already-482-line file — keep every edit inside its existing section rather than growing new standalone blocks.

**Quality checks**

- Every printed line, in both modes, matches the exact format string; no code path produces the old bullet format anywhere (AC 5.2.1).
- A missing blurb never leaves a dangling `.` or extra space; the segment and its leading period are both absent together (AC 5.2.2).
- A missing assignee always renders the literal `(unassigned)`, never blank or omitted parens (AC 5.2.3).
- The `--detailed` extra line never repeats assignee (AC 5.2.4).
- `--status delivered,closed` (same-category synonyms) behaves as the single `"Delivered"` case, not a flat list; `--status active,closed` (distinct categories) always prints flat, no heading (AC 5.2.6, keyed on distinct resolved categories, not raw value count).
- `--status updated` combined with any other value is a validation error, never silently resolved.
- Bare `--status active` (single value) resolves identically to its pre-slice behavior (AC 4.1 — no regression).
- **`severity` and `customFields` are not added to either fields-table row alongside `assignee` — the narrow-fetch discipline (the single biggest lever on runtime/token cost per the agent's own Do-not rules) is preserved exactly.**

---

## Slice 5.3 — Copy the printed summary straight to the clipboard

**Key decision:** A new Phase 6 (after the existing Phase 4 chat and Phase 5 file phases) offers clipboard delivery, mirroring the `marp-cli` probe-then-act-then-degrade pattern `sprint-status-reporter` already uses (spec-mandated imitation target, context §4a) for tool detection, and mirroring `ticket-summarizer`'s own Phase 4/5 ask-first structure for the offer itself. The one genuinely new design element is the safe-piping technique in Decision 5: the payload never touches a Bash command string as inline text.

**Structure**

- `plugins/ticket-summarizer/agents/ticket-summarizer.md` (modify):
  - **Frontmatter**: `tools:` changes from `Skill, Read, Write, AskUserQuestion` to `Skill, Read, Write, Bash, AskUserQuestion` [verified against the file's current frontmatter].
  - **Working state** table: add `clipboard_tool` (Set in: Phase 6, Read in: Phase 6 — the first detected tool's command name, or absent) and `copy_to_clipboard` (Set in: Phase 6, Read in: Phase 6 — the user's Yes/No answer), named in the same style as the existing `send_to_chat`/`save_to_file` rows [inferred: context §4b names this naming style as the model].
  - **New "Phase 6: Offer clipboard delivery (optional)"** section, inserted after the existing Phase 5, structured as a numbered list mirroring Phase 4's shape:
    1. Skip entirely, with no message, when `issues` is empty (mirrors Phase 4/5's existing empty-set skip).
    2. Run the capability probe: check for `xclip`, `xsel`, `wl-copy`, `pbcopy`, `clip.exe` in that order (`command -v <tool>`, first success wins); cache the first found as `clipboard_tool`. Skip entirely, with no message, when none is found (AC 5.3.6) — mirrors `sprint-status-reporter`'s `marp-cli` probe (context §4a, spec-mandated model).
    3. Ask via `AskUserQuestion`: `"Copy this summary to the clipboard?"` (Yes/No). Cache as `copy_to_clipboard`. If `No`, stop here.
    4. If `Yes` and `include_ids` is not already set (from Phase 4 or Phase 5 earlier in this run), ask the same with-ids/without-ids question those phases already ask; cache as `include_ids`. Reuse it unchanged if already set.
    5. Build the clipboard payload exactly as Phase 4 step 5 / Phase 5 step 3 already build their bodies (brief-line list, truncation note, unresolved-refs notes), rendered per `include_ids` — no new rendering logic.
    6. Write the payload to a fresh temporary file via the `Write` tool (never via a Bash heredoc or `echo` with the payload inlined). Invoke the detected `clipboard_tool` via `Bash` with input redirected from that file's path (`<tool> < <tempfile-path>`) — the command string itself contains only the agent-chosen tool name and file path, never any ticket-sourced text. Remove the temp file afterward, on both the success and failure path.
    7. On success: `"Copied to the clipboard."` On failure (the shell-out errors): `"Could not copy to the clipboard: <reason>. The printed summary above is still the full output."` Do not retry (invariant 4.2) — mirrors Phase 4 step 7 / Phase 5 step 6's failure-reporting shape exactly.
  - **Do-not rules**: add one bullet — "Never build a clipboard (or any Bash) command string that embeds ticket-sourced text (title, blurb, assignee) directly; route such text through a file the tool reads via redirection instead."
- `plugins/ticket-summarizer/commands/run.md` (modify): add a "Clipboard delivery" section paralleling the existing "Chat delivery" and "File output" sections, describing the always-offered, tool-detected behavior. Exact wording is genuine coder latitude.

**Collaborators:** none new beyond the `Bash` tool itself, now on the agent. No skill is touched or gains a new tool.

**Control flow:**
- Guard: `issues` empty → skip Phase 6 entirely.
- Guard: no clipboard tool detected → skip Phase 6 entirely, no message.
- Ask copy? → No → stop.
- Ask copy? → Yes → resolve `include_ids` (reuse if set) → build payload (reuse Phase 4/5's body-building) → write payload to temp file → pipe via redirection to `clipboard_tool` → report success or failure → remove temp file.

**Tests:** none (no test runner). Verification is behavioral: run the command on a machine with a clipboard tool present, confirm the offer appears and the copied content matches Phase 4/5's body exactly (paste elsewhere to confirm); run on a machine with none present (or simulate absence) and confirm the offer is skipped with no message; run a chat-then-clipboard sequence and confirm `include_ids` is asked once, not twice.

**Standards that bite here:** the org-wide `os-command` standard ("never pass user input through a shell... validate the command against an allowlist of permitted executables") — directly satisfied by the temp-file-and-redirection design plus the fixed five-tool probe list (never a user- or ticket-supplied command name); `code-craft`'s "throw close to detection, catch close to recovery" (the failure message is built exactly where the shell-out fails, not re-derived elsewhere); NFR 6.1.3's least-privilege framing (the new `Bash` grant is exercised only by steps 2 and 6 above — nothing else in the agent gains a new Bash call as a side effect of this slice).

**Quality checks**

- **No ticket-sourced text (title, blurb, assignee) ever appears inside a Bash command string; the payload reaches the tool only via redirection from a path the agent itself generated, never via inline interpolation.**
- The offer never appears, and nothing prints, when no clipboard tool is detected (AC 5.3.6).
- A failed copy reports the exact failure template and leaves Phase 3's printed output, and any completed chat/file delivery, untouched (invariant 4.2).
- `include_ids` is asked at most once per run across chat, file, and clipboard combined (AC 5.3.3).
- The temp file created for the payload is removed after the pipe completes, on both the success and failure path.
- The new `Bash` grant is exercised only by the capability probe and the clipboard pipe/cleanup; no other phase gains a Bash call as a side effect of this slice (NFR 6.1.3).

---

## Hard floors

None. No slice in this plan touches a designated high-risk category (auth, authorization/guard, payment, security-as-crypto/secrets/signing, or migrations). Slice 5.3's shell-out is a real risk this plan takes seriously — addressed through the specific temp-file-and-redirection design in Decision 5 and its Quality checks — but it falls outside the five designated floor categories, so it is guarded by design and by ordinary end-of-spec review rather than a mandatory `≥ excellent` floor.

## Escalation log

*(empty at authoring — `/anthara:plan-implementer` appends one-way tier bumps here, with reasons, as they happen)*
