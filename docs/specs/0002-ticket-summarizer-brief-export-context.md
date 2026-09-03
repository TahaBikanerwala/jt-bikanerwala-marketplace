# Task context: 0002-ticket-summarizer-brief-export

> Generated for spec 9494f8d2-d1c3-42aa-ae59-7211e11e8fb8 at HEAD 7cbff30f61a94116ff49f116d7ccc991c8e8d6a9 · 2026-09-03
> Read first by every agent in /anthara:plan-implementer's slice loop.

## 1. Affected modules
| Module / file | Role | Notes |
|---|---|---|
| `plugins/ticket-summarizer/agents/ticket-summarizer.md` | Orchestrating agent; Phase 0-5, only module with `Read`/`Write` (gaining `Bash`) | 482 lines — large; see §5 ai-ergonomics note |
| `plugins/ticket-summarizer/commands/run.md` | Thin CLI entry; `allowed-tools: Skill` only, dispatches to the agent | Documents flags/examples/behavior for humans, not parsed itself |
| `plugins/ticket-summarizer/skills/executive-blurb-writer/SKILL.md` | Pure computation: `Issue[]` → blurb per item | **Unmodified by this spec** — consume its output shape as-is |
| `plugins/issuekit/skills/tracker-adapter/references/verbs.md` | Shared `Issue`/`SearchQuery` contracts and `searchIssues`/`getIssuesBatch` verbs | Read-only reference; this spec adds no new verb |
| `plugins/sprint-status-reporter/agents/sprint-status-reporter.md` | Sibling agent; its Phase 4 "Optional export" block is the spec-mandated model for slice 5.3's clipboard probe | `tools:` already includes `Bash` there |
| `plugins/ticket-summarizer/.claude-plugin/plugin.json`, `README.md` | Version bump / doc extend | Named in spec §8, not walked in depth here |
| `docs/ARCHITECTURE.md` | Project-wide architecture reference, authoritative for style | Confirms *pipe-and-filter* across all 9 plugins |

## 2. Patterns to follow
- **Flags parsed before mode detection, stripped, cached under a named key with an explicit absent-default.** Defined at `agents/ticket-summarizer.md` (`--to`/`--output`/`--detailed` bullets under "Flags parsed before mode detection"). `--range` and multi-value `--status` must follow the same shape: strip, validate, cache, document the default.
- **Skill invoked with `Calling context: phase=<N>.` directive.** Defined at `agents/ticket-summarizer.md` (Phase 2 call to `executive-blurb-writer`). Unaffected by this spec (skill unmodified) but Phase numbering conventions must stay consistent when a new Phase is inserted after Phase 3.
- **Ask-first via `AskUserQuestion`, Yes/No, cache the answer, never retry on failure.** Defined at `agents/ticket-summarizer.md` Phase 4 (steps 2, 7) and Phase 5 (steps 1, 6). Slice 5.3's clipboard offer must mirror this exactly (invariant 4.2).
- **Read-only capability probe, then act, degrade silently/gracefully when absent.** Defined at `sprint-status-reporter.md` Phase 4 "Optional export" (`npx --no-install @marp-team/marp-cli --version`, then run, else print a manual-fallback message). Slice 5.3's clipboard-tool detection is explicitly required to mirror this (spec §5.3, source 4).
- **Downstream phases reuse the printed structure exactly, varying only by rendering choice.** Defined at `agents/ticket-summarizer.md` Phase 4 step 5 ("Build the message body from `blurbs`, reusing Phase 3's structure exactly"). Slice 5.2's new brief-line format and slice 5.3's clipboard payload must both flow through this same reuse, not a parallel render path.
- **Multi-value filter = OR-within, substring/category match, applied client-side.** Defined at `agents/ticket-summarizer.md` Phase 1 step 7 (`--tags`, `label.includes(filter)`). This is the shape to generalize for `--status`'s new comma-separated list (spec [invariant 4.4](0002-ticket-summarizer-brief-export-spec.md#4-invariants)) — though `--status` matches by resolved category equality, not substring.

## 3. Reusable utilities
- `plugins/issuekit/skills/tracker-adapter/references/verbs.md` — `Issue` type (`id, url, title, body, type, state, severity, assignee, reporter, created, updated, resolved, closed, labels, parent, customFields, raw`) and `SearchQuery` shape (`getIssuesBatch`, `searchIssues`)
- `plugins/ticket-summarizer/skills/executive-blurb-writer/SKILL.md` — output contract `[{ id, title, url, blurb }, ...]`, same order as input `issues`, deterministic, blurb may be `""`-adjacent (never a filler sentence) but the object itself always exists per input item
- `plugins/issuekit/skills/tracker-adapter/references/policy-schema.md` — merge-with-defaults pattern already used for `.claude/tracker-policy.json` (`state_categories`, `*_work_item_type`)

## 4. Adjacent code that must coordinate (per slice)
- **Slice 5.1:** `agents/ticket-summarizer.md` (Phase 0 "Validation" bullets, the `--status` resolution table); `commands/run.md` (`argument-hint`, Examples, "Query shapes" section).
- **Slice 5.2:** `agents/ticket-summarizer.md` (Phase 0 `--status` parsing, Phase 1 `fields` table, Phase 3 render bullets, Phase 4 step 5 / Phase 5 step 3 body-building); `skills/executive-blurb-writer/SKILL.md` (consumed read-only, not edited); `commands/run.md` ("Query shapes", `--detailed` paragraph).
- **Slice 5.3:** `agents/ticket-summarizer.md` (`tools:` frontmatter, new Phase after Phase 3, Working state table); `sprint-status-reporter.md` Phase 4 "Optional export" block (model, not touched); `commands/run.md` ("Chat delivery" / "File output" sections — add a parallel "Clipboard delivery" section).

## 4a. Slice imitation targets
- **Slice 5.1:** no single function to mirror; shape a new `--range` resolution table the same way the existing `--status` resolution table works (`agents/ticket-summarizer.md`, Phase 0's `--status → states/status_label/date_field` table), and phrase the mutual-exclusion error the same way Bootstrap's hard-stop errors read (`agents/ticket-summarizer.md`, Bootstrap step 3: "stop and tell the user...").
- **Slice 5.2:** mirror Phase 4 step 5's "reuse Phase 3's structure exactly" convention (`agents/ticket-summarizer.md`) for how Phase 4/5 body-building must pick up the new brief-line format without a parallel render path; mirror the Phase 1 `fields` table's two-row (`detailed: false/true`) shape when adding `assignee` to both rows.
- **Slice 5.3:** mirror `sprint-status-reporter.md` Phase 4 "Optional export" (`marp-cli` probe → act → graceful-absence message) for the capability probe — spec-mandated (source 4); mirror `agents/ticket-summarizer.md` Phase 4's own offer/confirm/failure sequence (steps 2, 7) for the Yes/No question and the success/failure message pair.

## 4b. Slice lexicon
- **Slice 5.1:** flag=`--range`; values=`this-week|last-week|this-month|last-month`; clock source=`today` (Phase 0 cache key, never re-derived downstream). No existing cache keys named for resolved `--from`/`--till` in the Working state table today — establish `from`/`till` (or equivalent) consistent with the table's naming style; do not invent a differently-shaped date pair.
- **Slice 5.2:** format string=`#<id>: <title>. <blurb> (<assignee>)`; literal=`(unassigned)`; field added to both narrow and detailed lists=`assignee`; detailed extra line (post-change)=`State: <state> | Parent: <parent title, or "none">` (drops `Assignee:`); flag=`--status` now comma-separated; `status_label` stays `null` for a multi-value `--status` (flat-list rule, AC 5.2.6).
- **Slice 5.3:** tool probe order=`xclip, xsel, wl-copy, pbcopy, clip.exe`; offer text=`"Copy this summary to the clipboard?"`; success message=`"Copied to the clipboard."`; failure template=`"Could not copy to the clipboard: <reason>. The printed summary above is still the full output."`; `tools:` frontmatter addition=`Bash`; new cache keys should follow `send_to_chat`/`save_to_file`'s naming style (e.g. a boolean answer key and a detected-tool key).

## 4c. Slice traps
- **Slice 5.1:** (1) do NOT silently override when `--range` and `--from`/`--till` are both given — AC 5.1.4 requires a validation error before any fetch. (2) do NOT make `this-week` a full Monday-Sunday window by symmetry with `last-week` — it must be a trailing partial period (Monday through `today`), per AC 5.1.2. (3) do NOT silently fall back to a default window on an unrecognized `--range` value — list the four accepted presets in the error (AC 5.1.6). (4) do NOT re-derive "today" more than once — Phase 0 sets `today` from a single clock read; every range computation reads that cached value.
- **Slice 5.2:** (1) do NOT leave a flag to restore the old `- [<id>] <blurb>` bullet — spec is explicit there is none (AC 5.2.1). (2) do NOT leave a dangling ". " when `blurb` is empty — omit the blurb segment and its leading period together (AC 5.2.2). (3) do NOT forget to drop `Assignee:` from the detailed extra line now that assignee shows inline — the rest of that line (`State`/`Parent`) is unchanged (AC 5.2.4). (4) do NOT print a headed (Active/Delivered) list for a multi-value `--status` — two or more values always print one flat list (AC 5.2.6). (5) do NOT add `severity` or `customFields` to the fields list while touching it — the Do-not rules in `agents/ticket-summarizer.md` call this a hard requirement (both adapters fall back to a full unnarrowed fetch), and it is the single biggest lever on runtime/token cost for a many-item run.
- **Slice 5.3:** (1) do NOT shell out to a clipboard tool without the read-only probe first — mirror the marp-cli probe-then-act two-step, never assume a tool exists. (2) do NOT retry a failed clipboard copy, and do NOT let its failure touch Phase 3's printed output or a pending chat/file delivery (invariant 4.2). (3) do NOT re-ask "include ids" if `include_ids` is already set from Phase 4 or 5 earlier in the run — reuse it (AC 5.3.3). (4) do NOT print anything when no clipboard tool is detected — the offer is skipped fully silently, same as chat when `chat == none` (AC 5.3.6). (5) do NOT gate the clipboard offer on `--to`/`--output` having been given — it always offers once a tool is detected and the item set is non-empty (AC 5.3.2). (6) do NOT broaden the new `Bash` grant beyond the capability probe and the clipboard pipe — NFR 6.1.3 is explicit this is a least-privilege addition, not a general-purpose one.

## 5. Known dragons
- Azure DevOps WIQL search-index replication lag: a work item created ~18 minutes before a query ran was missed by `searchIssues` in a real run (spec source 5, Org Memory). Not something this spec fixes, but slice 5.1/5.2 touch the same query pipeline — do not assume `searchIssues` results are instantaneous or complete relative to very recent writes.
- Jira's `getIssuesBatch` has no native multi-id fetch; it falls back to a JQL `key in (...)` search, and if that can't return the needed fields, degrades further to one `getIssue` call per id with a one-time warning (`verbs.md`). Widening the narrow field list (slice 5.2) should not push this fallback path over an edge that was previously fine.
- `agents/ticket-summarizer.md` is 482 lines with edits scattered across Phase 0, 1, 3, 4, 5, the Working state table, and the Do-not rules — an ai-ergonomics context-window concern (per the `ai-ergonomics` skill's >500-line threshold). Read the whole file before editing; partial-view edits risk missing a table row or a Do-not rule that needs updating in parallel with the phase it documents.
- No `CLAUDE.md` exists anywhere in this repo; `docs/ARCHITECTURE.md` and this context file are the only project-specific guidance available to an agent working here.

## 6. Test conventions
- **Confirmed: this repo has no automated test suite of any kind.** No `package.json` anywhere in the repo, no `jest.config.*`/`vitest.config.*`, no `*.test.*`/`*.spec.*` file, no test step in either GitHub workflow (`.github/workflows/claude.yml`, `claude-code-review.yml` — both are Claude-Code-as-reviewer/responder workflows, not CI test runners). This matches spec 0002 §5's own "no automated test suite" verification text for all three slices, and matches spec 0001's identical claim.
- Verification is behavioral only: invoke `/ticket-summarizer:run` with the relevant flags against a real (or simulated) tracker project and a real (or simulated) clipboard tool, and check printed output against the acceptance criteria by inspection. See each slice's "Verification" block in the spec for the exact scenarios to run.

## 7. Hot paths and performance landmines
- `getIssuesBatch` over per-id `getIssue` calls is called out repeatedly as "the single biggest lever on runtime and token cost for a many-item run" (`agents/ticket-summarizer.md`, Do-not rules). Slice 5.2's field-list widening (`+assignee`) must stay inside the existing batched call, not introduce a second per-item fetch to backfill assignee.
- The narrow default `fields` list is a deliberate cost lever; `severity`/`customFields` are permanently excluded because both adapters fall back to a full unnarrowed fetch when either is requested (`verbs.md`, `getIssue`). Do not widen past what AC 5.2.4 asks for (`assignee` only).

## 8. Open uncertainties resolved during orientation
- The Working state table (`agents/ticket-summarizer.md`) does not currently name cache keys for resolved `--from`/`--till` values — they are described in prose ("normalize to `YYYY-MM-DD`") but never appear as table rows. Slice 5.1 must introduce this naming, not assume it already exists; there is no prior art to strictly imitate here, only the table's general style (see [§4a](#4a-slice-imitation-targets)).
- No context file exists for spec 0001 in `docs/specs/`; this is the first context file generated against this repo's conventions.

---
## Changelog
- 2026-09-03 — generated by code-orienteer from spec 9494f8d2-d1c3-42aa-ae59-7211e11e8fb8 at HEAD 7cbff30f61a94116ff49f116d7ccc991c8e8d6a9.
