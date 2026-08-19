# Marketplace Gaps & Issues Report

Generated in response to issue #29. Scope: every plugin under `plugins/`, the
marketplace manifest (`.claude-plugin/marketplace.json`), and the root
`README.md`.

## How to read this report

This marketplace ships Claude Code plugins as **prompt/instruction assets**
(agent `.md` files, command `.md` files, `SKILL.md` files and their
`references/*.md`), not compiled code. A "bug" here is a contradiction, a
broken cross-reference, an undocumented assumption, or a spec gap in those
instructions — the kind of defect that causes an agent executing the
instructions to do the wrong thing, or a maintainer to be misled about the
real contract. Each finding below gives exact file:line locations, why it
matters, and a concrete fix an AI coding agent can apply without further
research. Findings are grouped by scope (marketplace-wide, then per-plugin)
and tagged with a rough severity:

- **High** — the described behavior is actually contradictory or the workflow
  has an unhandled case; following the instructions literally produces wrong
  output or an undefined state.
- **Medium** — a real inconsistency or missing spec that will surface as a
  bug the first time an edge case is hit, but the common path still works.
- **Low** — documentation drift (stale numbers, incomplete lists) that
  doesn't change runtime behavior but misleads a reader/maintainer.

Plugins audited: `issuekit`, `acceptance-test-generator`, `bug-reporter`,
`issue-triager`, `postmortem-generator`, `sprint-status-reporter`,
`story-drafter`, `testid-injector`, `ticket-summarizer`.

---

## 1. Marketplace-wide issues

### 1.1 [High] `issuekit` README installs from the wrong marketplace

**File:** `plugins/issuekit/README.md:28`

```
/plugin install issuekit@incubyte-plugins
```

This marketplace is `jt-bikanerwala-marketplace` (per
`.claude-plugin/marketplace.json:2` and the root `README.md`). `incubyte-plugins`
is a different marketplace name, almost certainly left over from a template
this repo was bootstrapped from. A user following this literal instruction
installs from (or fails to find) the wrong source.

**Fix:** Change the line to
`/plugin install issuekit@jt-bikanerwala-marketplace` (or whatever slug the
marketplace is actually registered under), matching the pattern used in the
root `README.md`'s own install instructions.

### 1.2 [Low] Version table in root README is stale against `plugin.json`

**File:** `README.md:19-29` (the "Available plugins" table)

| Plugin | README table version | Actual `plugin.json` version |
|---|---|---|
| `issuekit` | 0.2.4 | 0.2.8 |
| `story-drafter` | 1.0.0 | 1.0.1 |
| `bug-reporter` | 0.2.0 | 0.2.1 |
| `ticket-summarizer` | 0.1.0 | 0.1.1 |

(`postmortem-generator`, `issue-triager`, `testid-injector`,
`sprint-status-reporter`, `acceptance-test-generator` are correctly in sync.)

This table is hand-maintained and has drifted for four of nine plugins. A
user picking a version off this table to reason about compatibility gets a
wrong answer.

**Fix:** Update the four version cells to match each plugin's
`.claude-plugin/plugin.json`. Consider adding a CI check that fails when the
README table and the `plugin.json` versions disagree (a simple script
comparing the two would prevent recurrence).

### 1.3 [Medium] `issuekit`'s own README understates its dependents

**File:** `plugins/issuekit/README.md:3, :25`

Line 3 says only `postmortem-generator`, `issue-triager`,
`sprint-status-reporter`, `story-drafter`, `acceptance-test-generator`,
`bug-reporter`, and `ticket-summarizer` depend on it — that part is actually
correct and matches the root README. But line 25's install note narrows this
to "it's declared as a `dependencies` entry on `postmortem-generator` and
`issue-triager`", silently dropping five of the seven real dependents in the
very next section of the same file.

**Fix:** Make line 25 consistent with line 3's full list of seven dependents
(or simply say "any of the verb-plugins that depend on it — see above").

### 1.4 [Medium] `tracker-adapter/SKILL.md` references policy keys that don't exist in the policy schema

**File:** `plugins/issuekit/skills/tracker-adapter/SKILL.md:285-289` vs.
`plugins/issuekit/skills/tracker-adapter/references/policy-schema.md`

The "Detection-time pre-checks" section instructs:

> If `tracker == jira` and the policy requests AzDO-specific fields
> (`area_path_prefix`, `iteration_path_strategy`), warn once and ignore those
> keys. Same in reverse for `sprint_field_name`, `severity_field_name` when
> `tracker == azure-devops`.

None of `area_path_prefix`, `iteration_path_strategy`, `sprint_field_name`,
or `severity_field_name` appear anywhere in `policy-schema.md`'s documented
shape or key reference. An agent trying to implement this pre-check has
nothing to validate against, and a user has no key reference explaining what
these do or how to set them.

**Fix:** Either add these four keys to `policy-schema.md`'s shape/key
reference (with defaults and lazy-prompt text, matching every other key's
documentation), or remove the dangling pre-check paragraph from `SKILL.md` if
the keys were deprecated and the check is now dead.

### 1.5 [Low] Verb-surface "quick reference" summaries are missing three verbs

**Files:** `plugins/issuekit/skills/tracker-adapter/SKILL.md:83` and
`plugins/issuekit/README.md:10`

Both summaries list reads as `getIssue, getIssueHistory, getIssueComments,
searchIssues, getIssueTypeSchema, linkedPullRequests, getCurrentSprint,
whoAmI, resolveUser, mention` (SKILL.md additionally lists
`getSprintItems, getTeamCapacity`). Neither summary lists `getIssuesBatch`,
which is fully specified in `references/verbs.md:78-97` and is actively used
by `ticket-summarizer` (`agents/ticket-summarizer.md:223-227, 245-248`). The
top-level README also omits `getSprintItems`/`getTeamCapacity`, which
`SKILL.md`'s own summary does include.

**Fix:** Add `getIssuesBatch` to both quick-reference lists, and add
`getSprintItems`/`getTeamCapacity` to the README's list so all three summary
locations (`SKILL.md`, README, and `verbs.md` itself) enumerate the same
verb set.

---

## 2. `issuekit` (shared foundation)

### 2.1 [High] `issue-triager`'s claim of zero vendor-tool-name leakage is false

**File:** `plugins/issue-triager/agents/issue-triager.md:13, :36, :190`

Line 13 states: "All tracker access goes through `issuekit:tracker-adapter`.
No vendor-specific MCP tool name appears in this prompt." But:
- Line 36 tells the agent to call `slack_search_users` directly.
- Line 190 (Phase 2a) tells the agent to call `search_datadog_logs` directly.

Both are literal vendor MCP tool names, not issuekit abstract verbs
(`resolveChatUser`, or any Datadog-abstracting verb — issuekit has none for
logs; Datadog access is meant to be tool-name-driven per
`issuekit/skills/tracker-adapter/references/detection.md`, but the *prompt's
own claim* of zero vendor names is still false as written). If the
underlying MCP renames or re-versions either tool, `issue-triager` breaks
silently, and the stated portability guarantee is not actually upheld.

**Fix:** Either drop the "No vendor-specific MCP tool name appears in this
prompt" claim (since Datadog/chat search intentionally do name concrete
tools, as issuekit itself documents no abstraction for those), or add the
missing abstraction: route Slack/Teams search and Datadog search through a
same-shaped issuekit verb the way `issuekit:issue-investigator` already
does its own chat/log search internally. At minimum, correct the false claim
in the prompt text so it doesn't mislead a maintainer about the plugin's
actual portability guarantees.

### 2.2 [Medium] `requirements-investigator` contradicts its own abstraction claim within the same file

**File:** `plugins/issue-triager/skills/requirements-investigator/SKILL.md:33`
vs. `:81`

Line 33 states the skill uses abstract verbs `searchMessages`, `readThread`,
and `searchPages` for chat/docs. Line 81 (Level 2 instructions) says: "Docs
via the resolved doc backend (Confluence: `searchConfluenceUsingCql`; Azure
Wiki: `wiki_search` / `search_wiki`)" — three concrete vendor tool names,
not the `searchPages` verb promised two paragraphs earlier.

**Fix:** Make line 81 consistent with line 33 by naming `searchPages`
(with the vendor tools noted only as "implemented by" detail, the same
pattern `issuekit:issue-investigator`'s own SKILL.md uses at
`plugins/issuekit/skills/issue-investigator/SKILL.md:83`), or drop the
`searchPages`/`searchMessages`/`readThread` abstraction claim at line 33 if
this skill was never meant to route through it.

---

## 3. `issue-triager`

### 3.1 [High] Phase 9's post-triage transition rule has no branch for Incident

**File:** `plugins/issue-triager/agents/issue-triager.md:384-387`

> Phase 4c was taken → transition to `waiting_reply`. Otherwise → transition
> to `backlog` for Bug archetype only; Story/Feature/Task/Spike stay in
> `investigating`.

Incident is treated identically to Bug through every earlier phase (0, 2a,
2b, 4a, 6 — severity + due date), but Phase 9's two branches only mention
"Bug archetype only" and "Story/Feature/Task/Spike" — Incident appears in
neither branch. The root `README.md:92` workflow table only documents
post-triage *assignment*, not state, so it doesn't resolve the gap either.
An agent executing Phase 9 literally has no instruction for what state an
Incident should end up in.

**Fix:** Add an explicit third branch, e.g. "Incident → transition to
`backlog` also" (matching Bug, since both hand off to whoever picks up the
work) or "Incident stays in `investigating`" (matching the other archetypes)
— whichever matches the intended handoff semantics — and update the phase
text to name all six archetypes across the two (or three) branches.

### 3.2 [Medium] "Leaf-level" vs "epic-level" Story/Feature classification is never defined

**File:** `plugins/issue-triager/agents/issue-triager.md:141`,
`plugins/issue-triager/skills/requirements-investigator/references/report-template.md:11`,
`README.md:99-106`

Phase 0's archetype detection says AzDO's `Feature` type maps to `Story`
"(when leaf-level)" or `Feature` "(when epic-level)" — the only definition
of this distinction anywhere is this one unexplained phrase, repeated
verbatim (and equally undefined) in `requirements-investigator`'s report
template. The root README's taxonomy table treats AzDO `Feature` as an
unconditional mapping to the Feature archetype, contradicting Phase 0's
conditional logic.

**Fix:** Define the "leaf-level"/"epic-level" test explicitly (e.g. "has no
child work items" vs. "has one or more child Stories/PBIs linked via
`Hierarchy-Forward`") in Phase 0, and either align the README's taxonomy
table with the conditional logic or state there that AzDO `Feature` is
unconditionally the Feature archetype and remove the conditional branch from
Phase 0.

### 3.3 [Medium] Two "empty section" conventions contradict each other within one plugin

**Files:** `plugins/issue-triager/skills/issue-refiner/assets/template.md:31`
and `SKILL.md:88` (omit empty sections entirely, no placeholder, not even an
empty heading) vs.
`plugins/issue-triager/skills/requirements-investigator/references/report-template.md:7, :148`
("Do not omit a section heading. If a section has nothing meaningful to say,
write a one-line note under the heading.")

Both skills belong to the same plugin, share the same evidence-tag
vocabulary, and are invoked from the same agent — but they mandate opposite
conventions for how to handle a section with nothing to report.

**Fix:** Pick one convention and apply it to both skills, or explicitly
document the difference at the top of each `SKILL.md` (e.g. "unlike
`issue-refiner`, this skill always keeps every heading") so it reads as an
intentional design choice rather than an oversight.

---

## 4. `bug-reporter`

### 4.1 [High] `issue_payload`'s declared type doesn't match what it actually holds

**File:** `plugins/bug-reporter/agents/bug-reporter.md:122` (Working State
table types `issue_payload` as bare `Issue`) vs. `:193` (Phase 0 merges
`getIssue`, `getIssueComments` → `Comment[]`, and `getIssueHistory` →
`Revision[]` results into it) and
`plugins/bug-reporter/skills/bug-report-writer/SKILL.md:35, :43, :58-60`
(which depends on `issue_payload` carrying description + comments + history
for its "strict superset" no-data-loss guarantee).

If a future edit trusts the Working State table's type column over the
Phase 0 prose, it could ship a version of Phase 0 that only calls `getIssue`
and drops comments/history — silently violating the explicit "Never drop a
fact in refine submode" rule at line 155-156.

**Fix:** Change the Working State table's type for `issue_payload` to
something like `Issue & { comments: Comment[], history: Revision[] }`, or
introduce a named type in the file that documents the merge explicitly.

### 4.2 [Medium] Severity resolution cites a policy key that doesn't govern severity tiers, and that this plugin never uses for its actual purpose

**File:** `plugins/bug-reporter/agents/bug-reporter.md:80, :320-321` vs.
`plugins/issuekit/skills/tracker-adapter/references/policy-schema.md:84-91`

The agent says severity is resolved "against `severity_scheme`", but
issuekit's `severity_scheme` key only configures `due_offset_days` and
`escalate_immediately` (SLA timing), not evidence-to-tier criteria — the
actual sev1-sev4 evidence table is hardcoded in the prompt at lines
324-328, sourced from nowhere in policy. Worse, `bug-reporter` explicitly
never sets a due date or escalates (line 158's "Do not" rule), so the one
thing `severity_scheme` configures is a field this plugin never touches.
This reads as copy-paste leftover from `issue-triager`, which does use
`severity_scheme` for its intended purpose.

**Fix:** Remove the `severity_scheme` reference from bug-reporter's config
list and Phase 3 text; the hardcoded evidence table already stands on its
own and doesn't need a policy citation that doesn't back it.

### 4.3 [Low] Bootstrap call uses a non-numeric `phase` value against its own documented convention

**File:** `plugins/bug-reporter/agents/bug-reporter.md:108` (documents
`phase` as "this agent's phase number") vs. `:52` (bootstrap invocation sends
`Calling context: phase=bootstrap.`)

**Fix:** Either special-case "bootstrap" explicitly in the `phase` key's
documentation (call out that it is the one non-numeric value), or renumber
the bootstrap step as Phase 0 and send `phase=0` for consistency with every
other call site.

### 4.4 [Low] The "no tracker detected" stop path is documented once but missing from the canonical Stops list

**File:** `plugins/bug-reporter/agents/bug-reporter.md:56-58`
(Prerequisites: no tracker → stop) vs. `:173-182` (canonical "Stops (exit
cleanly)" list — only 4 entries, no-tracker isn't one of them)

**Fix:** Add "No tracker MCP detected" as a fifth entry in the Stops list so
it's discoverable from the one place a maintainer would look for the
complete set of exit conditions.

---

## 5. `postmortem-generator`

### 5.1 [Medium] Stale "v1.0.0" feature gates despite the plugin shipping as 2.0.0

**Files:** `plugins/postmortem-generator/README.md:62`,
`agents/postmortem-generator.md:50, :73, :101`,
`skills/postmortem-writer/SKILL.md:11, :103`

Six places gate behavior on "in v1.0.0" (e.g. "template-only value, no
directive keys yet", "no auto-created action items"), but
`.claude-plugin/plugin.json:3` declares `2.0.0`, and the root README's
migration table confirms the `incident-postmortem` → `postmortem-generator`
rename took a **major** version bump specifically to 2.0.0. It's unclear
whether these v1.0.0-gated behaviors were supposed to change in 2.0.0 and
the text just never got updated, or whether "v1.0.0" here means something
else entirely.

**Fix:** Decide whether each "in v1.0.0" gate should now read "in 2.0.0" (if
the limitation still holds) or be removed (if the 2.0.0 rewrite lifted it),
and update all six occurrences consistently. If future versioned feature
gates are needed, key them off a named capability instead of a raw version
string so this doesn't recur.

### 5.2 [Medium] Orphaned config key `description_preview_pause_seconds`

**File:** `plugins/postmortem-generator/agents/postmortem-generator.md:26`
(states only `output_directory`, `postmortem_template`,
`incident_identifier`, and `datadog_default_service` are read, "other keys
are ignored silently") vs. `:35` (default config block ships
`"description_preview_pause_seconds": 3` anyway)

This key is never read, validated, or referenced anywhere else in the file.

**Fix:** Remove `description_preview_pause_seconds` from the shipped default
config block, or if a pause-before-render feature was intended, implement it
and document it alongside the other four keys the agent actually reads.

### 5.3 [High] Computed "Responders" data has no destination in the final document

**File:** `plugins/postmortem-generator/agents/postmortem-generator.md:127,
:200, :235` (caches a deduplicated responder list explicitly "for use in
Phase 4 (Header Author/Responders fields)" and passes `responders` through
the Phase 4 payload) vs.
`plugins/postmortem-generator/skills/postmortem-writer/SKILL.md:45, :75-86`
and `references/postmortem-template.md:11-16` (the header field catalog has
Status, Author, Severity, Duration, Detection, Customer impact — no
Responders field anywhere in the 13-section template)

The agent computes and forwards data for a header field the template
contract never defines a place to render, so the responders list is only
ever shown at the Phase 3 confirmation display and silently disappears from
the actual postmortem document.

**Fix:** Either add a "Responders" row to the header field catalog in
`postmortem-template.md` and the corresponding render step in
`postmortem-writer/SKILL.md`'s Step 2, or remove the "Header
Author/Responders fields" destination claim from the agent and clarify that
the responders list is confirmation-display-only.

### 5.4 [Low] README's Configuration section omits config keys the agent actually reads

**File:** `plugins/postmortem-generator/README.md:59-65` (lists only
`output_directory`, `postmortem_template`, `incident_identifier`) vs.
`agents/postmortem-generator.md:30-45, :238-242` and
`skills/postmortem-writer/references/postmortem-template.md:42, :103, :113`
(agent and template also branch on `datadog_default_service`,
`include_action_items`, `include_timeline_evidence_links`)

**Fix:** Add the three missing keys (and their defaults/semantics) to the
README's Configuration table so a user configuring
`.claude/tracker-policy.json` from the README alone sees the full set of
keys the agent responds to.

---

## 6. `sprint-status-reporter`

### 6.1 [High] `{{ team }}` template placeholder has no data source

**Files:** `plugins/sprint-status-reporter/skills/deck-composer/references/deck-template.md:19`
and `skills/delta-narrator/references/delta-template.md:19` (both render
`Team: {{ team }} · Generated {{ today }}` on the title slide) vs.
`skills/deck-composer/SKILL.md:17-24` and `skills/delta-narrator/SKILL.md:18-25`
(input schemas list `sprint`, `metrics`/`delta`, `today`, `output_directory`
— no `team`) and `agents/sprint-status-reporter.md:190-196, :254-260` (the
Phase 4 / Phase D3 payloads never include `team`)

Neither rendering skill's documented input contract, nor the agent's payload
to either skill, nor issuekit's `Sprint` type (`id, name, start, end` per
`plugins/issuekit/skills/tracker-adapter/references/verbs.md:26`) carries a
team name. The template placeholder is unfillable as specified.

**Fix:** Either add `team` to both skills' input schemas and thread the
`team_arg`/resolved team name through the agent's Phase 4 and Phase D3
payloads (caching it past Phase 0, where it currently gets dropped per the
Working State table), or remove the `{{ team }}` placeholder from both
templates if team name isn't meant to appear on the deck.

### 6.2 [High] Self-contradictory instruction on the capacity-null warning

**File:** `plugins/sprint-status-reporter/skills/sprint-analyzer/SKILL.md:134-137`

The bullet first says to add the warning "Team capacity unavailable on this
tracker." only if the caller expected it (i.e., on Azure DevOps; omit on
Jira), then the very next sentence states an unconditional rule: "if
`capacity == null`, set `capacity_summary = null` and add no warning (silence
is correct...)." These two sentences directly contradict each other for the
Azure-DevOps-with-null-capacity case.

**Fix:** Resolve to one rule. Given Jira has no capacity concept at all (so
silence is clearly correct there per
`plugins/issuekit/skills/tracker-adapter/references/policy-schema.md`'s
description of `getTeamCapacity`), the more likely intended rule is: warn
only when `tracker == azure-devops` and `capacity == null` (an unexpected
miss); stay silent when `tracker == jira` (an expected absence). Rewrite the
paragraph to state only that rule.

### 6.3 [Medium] History-reconstruction path never derives `stateCategory`, which `sprint-analyzer` requires

**File:** `plugins/sprint-status-reporter/agents/sprint-status-reporter.md:219-227`
(Phase D1 case 3: replays `Revision[]`, deriving `state`, `points`,
`assignee`, `updated` — no `stateCategory`) vs.
`plugins/sprint-status-reporter/skills/sprint-analyzer/SKILL.md:29-31, :73-79`
(bucketing logic operates strictly on `stateCategory`, documented as
"already resolved by the adapter" — never on raw `state`)

The one code path that hand-builds `SprintItem`s instead of getting them from
`getSprintItems` fails to populate the field the very next skill call
depends on.

**Fix:** Add a `stateCategory` derivation step to the reconstruction logic
in Phase D1, using the same `policy.state_categories` mapping (with vendor
category fallback) that `getSprintItems` uses, so reconstructed items are
shape-compatible with real snapshot items before being handed to
`sprint-analyzer`.

---

## 7. `acceptance-test-generator`

### 7.1 [High] Phase 6 batches multiple dependent creates into one gate, violating issuekit's batching rule

**File:** `plugins/acceptance-test-generator/agents/acceptance-test-generator.md:199-209`
(builds one `createIssue` per scenario plus one dependent `linkIssue` per
created Test Case, then routes "the whole batch" through the gate in one
shot) vs.
`plugins/issuekit/skills/tracker-adapter/references/diff-and-confirm.md:44`
("A batch may create at most one item that later tuples depend on; when more
than one `createIssue` precedes a dependent tuple, the verb-plugin must
split the writes into separate batches instead of relying on ordering.")

Any run with more than one selected scenario produces exactly the disallowed
shape (N `createIssue`s, each with a dependent `linkIssue`) in a single
batch. `story-drafter`'s equivalent phase avoids this by never chaining a
dependent write off its `createIssue`s.

**Fix:** Change Phase 6 to build one create+link batch per Test Case (or
split into groups of one `createIssue` each) instead of a single batch
across every scenario, matching issuekit's documented constraint.

### 7.2 [Medium] `code-reference-prober` instructs a tool it never declares

**File:** `plugins/acceptance-test-generator/skills/code-reference-prober/SKILL.md:6`
(frontmatter grants `tools: Read, Grep, Bash`) vs. `:32` ("How to look"
section instructs using `Glob`/`Bash ls` to find `**/*.feature`,
`features/`, `steps/`, `cucumber.*`, `*.config.*`)

`Glob` is never in the tool grant, so the documented discovery method is
partly unusable as written.

**Fix:** Either add `Glob` to the frontmatter `tools:` list, or rewrite the
"How to look" section to use only `Bash ls`/`find` (tools already granted)
without presenting `Glob` as an equally available option.

### 7.3 [Medium] Agent asserts an issuekit validation behavior for a key issuekit doesn't recognize — and contradicts its own prior statement

**File:** `plugins/acceptance-test-generator/agents/acceptance-test-generator.md:47`
("do not add these keys to the tracker policy, issuekit rejects unknown keys
there") vs. `:61` ("If `test_case_work_item_type` ... is not a valid type on
`target_project`, the issuekit adapter lazy-prompts with the live type list
when `createIssue` runs.")

`test_case_work_item_type` lives in this plugin's own
`.claude/acceptance-test-policy.json`, not issuekit's schema — issuekit has
no documented lazy-prompt behavior for a key it doesn't own, and this
contradicts the plugin's own statement two paragraphs earlier that issuekit
doesn't know about this key at all.

**Fix:** Move the type-validation responsibility to this plugin itself:
before calling `createIssue`, call `getIssueTypeSchema` directly and
lazy-prompt (via `AskUserQuestion`) if `test_case_work_item_type` isn't in
the live type list, rather than attributing that behavior to issuekit.

### 7.4 [Low] `acceptance-analyzer`'s reference file is never loaded by its own skill

**File:** `plugins/acceptance-test-generator/skills/acceptance-analyzer/references/test-design-techniques.md`
(exists, contains worked EP/BVA/decision-table/state-transition examples)
vs. `plugins/acceptance-test-generator/skills/acceptance-analyzer/SKILL.md`
(never references the file by name anywhere)

Unlike `bdd-scenario-writer/SKILL.md`, which explicitly says to load
`references/gherkin-style.md`, `acceptance-analyzer/SKILL.md` never wires in
its own reference file, so it's dead documentation that never gets read
during a run.

**Fix:** Add an explicit "Read `references/test-design-techniques.md` before
decomposing any AC" instruction to `acceptance-analyzer/SKILL.md`, matching
the pattern already used by `bdd-scenario-writer`.

---

## 8. `story-drafter`

### 8.1 [Medium] `story-writer/SKILL.md` misattributes Jira acceptance-criteria folding

**File:** `plugins/story-drafter/skills/story-writer/SKILL.md:50` ("on Jira,
the caller folds AC into the body") vs.
`plugins/issuekit/skills/tracker-adapter/references/verbs.md:196` and
`references/policy-schema.md:192` (it is `createIssue` itself that folds AC
into the description when `acceptance_criteria_field` is unset) and
`plugins/story-drafter/agents/story-drafter.md:158-163` (Phase 6 passes
`acceptanceCriteria` as its own field uniformly for every tracker, with no
Jira-specific folding step)

A maintainer reading only `story-writer/SKILL.md` could conclude Phase 6 is
missing a folding step and add a redundant one, producing duplicated
acceptance criteria in the created story.

**Fix:** Change the line to state that `createIssue` (via issuekit) folds AC
into the body on Jira automatically — the calling agent does nothing
tracker-specific here.

### 8.2 [Low] Dead "Acceptance Criteria" row in the story template's heading table

**File:** `plugins/story-drafter/skills/story-writer/references/story-template.md:12`
(lists `| Acceptance Criteria | ✅ |` in the fixed `## <emoji> <heading>`
table) vs. `SKILL.md:44` ("The DESCRIPTION block holds every section except
acceptance criteria") and `story-template.md:66-77, :85, :125` (the AC
block is always bare Given/When/Then bullets with no heading/emoji at all)

**Fix:** Remove the "Acceptance Criteria" row from the heading/emoji table,
since that section never gets a `## <emoji> <heading>` treatment.

### 8.3 [Low] Bootstrap announces chat/doc/log detection the workflow never uses

**File:** `plugins/story-drafter/agents/story-drafter.md:21-22` (announces
the full `tracker/chat/doc/log` 4-tuple) — none of `chat`, `doc`, or `log` is
read anywhere in the agent's 8 phases (Phase 7 explicitly says "no chat
send", line 173). This also means the plugin's session-start line prints
`chat=none doc=none log=none` for a plugin that never uses any of the three,
in tension with the root README's stated guarantee that "no plug-in mention
of an unavailable backend appears in any output" (`README.md:77`).

**Fix:** Drop `chat`/`doc`/`log` from the announcement line for this plugin
(only announce `tracker=<tracker>`, which is the only thing story-drafter
actually uses), since the full 4-tuple announcement is boilerplate copied
from `postmortem-generator`/`issue-triager`, which do use all four.

---

## 9. `testid-injector`

### 9.1 [High] Idempotency check doesn't cover bound/dynamic test-id syntax

**Files:** `plugins/testid-injector/skills/element-catalog/SKILL.md:69, :87-95`
and `agents/testid-injector.md:13, :91` (existing-id detection is described
only as a literal `data-testid="..."` attribute match) vs.
`skills/element-catalog/references/vue.md:36` (Vue's bound `:data-testid="expr"`
is a documented valid way to write a dynamic id) and
`references/angular.md:35` (Angular's `[attr.data-testid]="expr"`, same idea)

A scanner that matches literally on `data-testid=` will not recognize an
element that already has a *bound* id as already tagged, and can inject a
second, conflicting static `data-testid` attribute onto the same element —
directly contradicting the "idempotent, never overwrites" guarantee.

**Fix:** Extend the "already has the configured attribute" check in
`element-catalog/SKILL.md` to match the bound/dynamic attribute forms
per-framework (`:attr`, `v-bind:attr` for Vue; `[attr.name]` for Angular) in
addition to the literal string form, and cross-reference this explicitly
from the Vue/Angular reference files.

### 9.2 [Medium] `.claude/testid-policy.json` has no dedicated schema reference doc, and its two inline descriptions disagree

**Files:** `plugins/testid-injector/agents/testid-injector.md:35-49` and
`README.md:59-84` (both describe the policy schema inline, since there is no
`references/policy-schema.md`-equivalent file under either `skills/element-catalog/`
or `skills/testid-namer/`) — the README's table omits the `include`/`exclude`/
`elements` keys that `agent.md` lists.

Unlike `issuekit`, which ships a dedicated, complete `references/policy-schema.md`
for its own policy file, `testid-injector` (the one plugin with no issuekit
dependency to point at instead) never built an equivalent, so the two
existing descriptions have drifted apart.

**Fix:** Create `plugins/testid-injector/skills/element-catalog/references/testid-policy-schema.md`
(or similar) as the single source of truth for `.claude/testid-policy.json`,
matching issuekit's pattern, and have both `agent.md` and `README.md` point
to it instead of duplicating the key list inline.

### 9.3 [Low] Stale "Working state" table entry for `manual_review`

**File:** `plugins/testid-injector/agents/testid-injector.md:60` (table says
`manual_review` is "Read in [Phase] 5" only) vs. `:108` (also consumed in
Phase 2's audit-mode summary), `:114` (explicitly read in Phase 3), `:136`
(explicitly read in Phase 6) — Phase 5 (lines 125-128) never actually reads
`manual_review` at all.

**Fix:** Update the table's "Read in" column for `manual_review` to
"2, 3, 6" (or whichever phases are correct after review) and remove 5 if
Phase 5 indeed never touches it.

---

## 10. `ticket-summarizer`

### 10.1 [Medium] README's Configuration table lists two keys; the agent actually reads four

**File:** `plugins/ticket-summarizer/README.md:99-105` ("Reads two keys...":
`state_categories`, `feature_work_item_type`) vs.
`agents/ticket-summarizer.md:114-127` (also reads `story_work_item_type` and
`bug_work_item_type`, used in Phase 0 to build the fixed type filter)

A user configuring per-tracker vendor type names via
`.claude/tracker-policy.json` has no way to know from the README that these
two keys apply to `ticket-summarizer` as well as to `story-drafter`/
`bug-reporter`.

**Fix:** Add rows for `story_work_item_type` and `bug_work_item_type` to the
README's Configuration table and change "Reads two keys" to "Reads four
keys."

### 10.2 [Medium] `commands/run.md` misdescribes where date-window filtering happens

**File:** `plugins/ticket-summarizer/commands/run.md:35-36` ("A
state-filtered `searchIssues` call, narrowed further by the exact
`updated`/`resolved` date window in query mode") vs.
`agents/ticket-summarizer.md:236-237, :432-434` ("`dateWindow` is
deliberately not used here... the precise window check happens client-side
against the fetched `Issue`") and `README.md:58-60` (which describes the
same step correctly, with an explicit clarifying parenthetical)

`run.md` reads as though `searchIssues` itself applies the update/resolved
window, which is the one thing the agent's own explicit "Do not" rule says
never to rely on. A maintainer skimming only `run.md` could "optimize" by
pushing `dateWindow` into the search call, silently breaking `updated`/
`resolved` filtering.

**Fix:** Rewrite `run.md`'s line to match the README's correct phrasing:
the state-filtered `searchIssues` call fetches full items, and the exact
`updated`/`resolved` date window is then checked client-side against each
fetched `Issue`.

### 10.3 [Low] Query-mode item fetch has no unresolved-id handling, unlike explicit mode

**File:** `plugins/ticket-summarizer/agents/ticket-summarizer.md:223-227`
(explicit mode: diffs requested vs. returned ids from `getIssuesBatch`,
routes misses to `unresolved_refs`) vs. `:245-248` (query mode: calls the
same `getIssuesBatch` verb on `searchIssues` results, but never diffs the
result)

If an item is deleted or permission-restricted between the `searchIssues`
call and the `getIssuesBatch` detail fetch, it silently vanishes from the
output in query mode with no note to the user — unlike explicit mode, which
surfaces exactly this via a "Could not resolve `<reference>`." message. The
Working State table even scopes `unresolved_refs` to "(explicit mode)" only,
so this is a real, currently-undocumented asymmetry.

**Fix:** Either extend the same diff to query mode (surfacing a one-line
note when fewer items come back than `searchIssues` returned ids for), or
explicitly document why the asymmetry is intentional (e.g. "misses in query
mode are expected and not worth surfacing because ...").

---

## Summary table

| # | Plugin / scope | Severity | One-line issue |
|---|---|---|---|
| 1.1 | marketplace | High | `issuekit` README installs from wrong marketplace name |
| 1.2 | marketplace | Low | Stale version table in root README (4 plugins) |
| 1.3 | marketplace | Medium | `issuekit` README understates its 7 real dependents |
| 1.4 | issuekit | Medium | Policy keys referenced in SKILL.md, undocumented in policy-schema.md |
| 1.5 | issuekit | Low | `getIssuesBatch`/sprint verbs missing from quick-reference summaries |
| 2.1 | issue-triager | High | Vendor tool names leak despite "zero vendor names" claim |
| 2.2 | issue-triager | Medium | `requirements-investigator` contradicts its own abstraction claim |
| 3.1 | issue-triager | High | Phase 9 transition rule has no branch for Incident |
| 3.2 | issue-triager | Medium | "Leaf-level"/"epic-level" Story/Feature test never defined |
| 3.3 | issue-triager | Medium | Two contradictory "empty section" conventions in one plugin |
| 4.1 | bug-reporter | High | `issue_payload` type doesn't match what it actually holds |
| 4.2 | bug-reporter | Medium | Severity resolution cites a policy key it doesn't use |
| 4.3 | bug-reporter | Low | Non-numeric `phase=bootstrap` violates its own convention |
| 4.4 | bug-reporter | Low | No-tracker stop path missing from canonical Stops list |
| 5.1 | postmortem-generator | Medium | Stale "v1.0.0" gates despite 2.0.0 version |
| 5.2 | postmortem-generator | Medium | Orphaned config key never read |
| 5.3 | postmortem-generator | High | Computed "Responders" data has no template destination |
| 5.4 | postmortem-generator | Low | README omits config keys the agent reads |
| 6.1 | sprint-status-reporter | High | `{{ team }}` placeholder has no data source |
| 6.2 | sprint-status-reporter | High | Self-contradictory capacity-null warning rule |
| 6.3 | sprint-status-reporter | Medium | History reconstruction never derives `stateCategory` |
| 7.1 | acceptance-test-generator | High | Phase 6 violates issuekit's single-dependent-create batching rule |
| 7.2 | acceptance-test-generator | Medium | `code-reference-prober` instructs an undeclared tool (`Glob`) |
| 7.3 | acceptance-test-generator | Medium | Agent misattributes validation behavior to issuekit |
| 7.4 | acceptance-test-generator | Low | `acceptance-analyzer` never loads its own reference file |
| 8.1 | story-drafter | Medium | `story-writer` misattributes Jira AC-folding to the caller |
| 8.2 | story-drafter | Low | Dead "Acceptance Criteria" heading row in template |
| 8.3 | story-drafter | Low | Bootstrap announces unused chat/doc/log detection |
| 9.1 | testid-injector | High | Idempotency check misses bound/dynamic test-id syntax |
| 9.2 | testid-injector | Medium | No dedicated policy schema doc; two inline descriptions disagree |
| 9.3 | testid-injector | Low | Stale `manual_review` "Working state" table entry |
| 10.1 | ticket-summarizer | Medium | README Configuration table omits two real policy keys |
| 10.2 | ticket-summarizer | Medium | `run.md` misdescribes where date filtering happens |
| 10.3 | ticket-summarizer | Low | Query mode has no unresolved-id handling, unlike explicit mode |

**Totals:** 33 findings — 9 High, 15 Medium, 9 Low.
