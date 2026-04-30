# Design — `issue-investigator` skill

**Date:** 2026-04-30
**Author:** Taha Bikanerwala
**Status:** Approved (ready for implementation plan)
**Architectural revision to:** `2026-04-30-claude-marketplace-design.md` (sibling-skill location)

## Goal

Add a new skill `issue-investigator` to the `jira-bug-triage` plugin. The skill investigates a Jira bug ticket and produces a structured 6-section report with evidence-tagged findings. The skill is non-interactive, never modifies Jira, and ships nested inside the plugin so it installs alongside the bug-triage agent.

The skill is genuinely original work, designed from Taha's investigation approach. The Spring Health-authored skill at `/home/taha/Desktop/MyProjects/simple-windows-setup/.claude/skills/issue-investigator/` was deliberately not read for structural reference — only its name and the bug-triage agent's expectations of what an investigation skill produces inform this design.

## Architectural revision

The original marketplace design (`2026-04-30-claude-marketplace-design.md`) listed `issue-investigator`, `jira-ticket-refiner`, and `prose-style` as future **separate plugins** in the marketplace. This spec changes that for `issue-investigator` only:

- `issue-investigator` is now nested inside the `jira-bug-triage` plugin at `plugins/jira-bug-triage/skills/issue-investigator/SKILL.md`.
- The other two skills (`jira-ticket-refiner`, `prose-style`) remain as planned separate plugins until decided otherwise.

The bug-triage agent still calls `issue-investigator` by name via the `Skill` tool — the call works the same regardless of physical location. Nesting only changes where the file lives and removes the "must install separately" caveat from user docs for this one skill.

## Skill location and metadata

**Path:** `plugins/jira-bug-triage/skills/issue-investigator/SKILL.md`
**File layout:** single self-contained `SKILL.md`. No `references/` or `assets/` for v0.2.0. Split into reference files later if the skill grows past ~400 lines.
**Skill name (frontmatter `name`):** `issue-investigator`. Kept the original name — it's descriptive, the bug-triage agent body already references it, and renaming would force a find-replace with no payoff.

**Frontmatter description (rough):**

> Investigates a Jira bug ticket by searching Slack, the ticket and related Jira/Confluence pages, Datadog, and the codebase, then writes an evidence-tagged report in the bug-archetype template. Use when a Jira bug ticket needs an investigation report before triage decisions are made.

**Frontmatter `metadata.author`:** `Taha Bikanerwala`.

**Frontmatter `tools` (read-only — the skill never modifies anything):**

```
tools: Read, Bash, Grep, mcp__plugin_atlassian_atlassian__getJiraIssue, mcp__plugin_atlassian_atlassian__searchJiraIssuesUsingJql, mcp__plugin_atlassian_atlassian__searchConfluenceUsingCql, mcp__plugin_slack_slack__slack_search_public_and_private, mcp__plugin_slack_slack__slack_read_thread, mcp__datadog__search_datadog_logs
```

No `editJiraIssue`, no `addCommentToJiraIssue`, no `slack_send_message` — investigation is read-only. Posting is the caller's responsibility (the bug-triage agent in Phase 5, or the user manually).

## Calling convention

These constraints make the skill work cleanly when invoked from the bug-triage subagent (which has its own Phase 3 confirmation gate and does not tolerate mid-flow user pauses).

- **Non-interactive.** The skill never asks the user a question during execution. No "should I check X?", no "tell me more about the customer". Inputs are inferred from the ticket data and search results.
- **Predictable structure.** Same 6 section headers every run, in the same order (with one allowed reorder for incidents — see Adaptation Rules). The bug-triage agent and any downstream skill can rely on grepping for `## What We Found` and similar.
- **Same evidence tags.** Exactly `[VERIFIED]` / `[OBSERVED]` / `[INFERRED]` / `[UNKNOWN]`. Matches what the bug-triage agent body already references.
- **Output is the last thing.** The skill ends after rendering the report. No trailing instructions, no follow-up prompts, no "let me know if you want more."
- **Read-only.** Does not modify Jira, Slack, Datadog, or any local file. Search-only access to MCP tools.

These constraints are documented in a "Calling Convention" section near the top of the SKILL.md so future maintainers don't accidentally add interactive elements.

## The 4-level search ladder

Investigation goes top to bottom. Each level has a **gate**: if the level produces enough evidence to write a useful report, skip the remaining levels.

### Level 1: Slack

- Tools: `slack_search_public_and_private`, `slack_read_thread`.
- Run 2-3 queries: the ticket key, the most distinctive symptom or error message, the customer/area name combined with a key term.
- For each relevant hit, follow the thread in full.
- **Gate:** if a Slack thread contains a confirmed root cause or workaround, write the report citing that thread and skip Levels 2-4.

### Level 2: Ticket + Jira + Confluence

- Tools: `getJiraIssue` (re-read the ticket carefully, follow `issuelinks`), `searchJiraIssuesUsingJql` (find related tickets), `searchConfluenceUsingCql` (runbooks, architecture pages, known-issues docs).
- Re-read the ticket itself first (signals are often missed on a quick first pass).
- For each relevant Jira ticket: capture key, summary, status, assignee, most relevant finding from description or comments.
- For each relevant Confluence page: capture URL and a 1-line summary.
- **Gate:** if a runbook describes the exact scenario or a prior Jira ticket has the resolution, write the report pointing at that source. Skip Levels 3-4.

### Level 3: Datadog

- Tools: `search_datadog_logs`.
- Build queries from signals collected in Levels 1-2: error strings, service names, entity IDs, HTTP status codes.
- Use a sensible time window (e.g., 7 days before the ticket's `created` date through the `created` date, or the timeframe mentioned in the ticket).
- Build a Logs URL the engineer can click: `https://app.datadoghq.com/logs?query=<url-encoded>&from_ts=<ms>&to_ts=<ms>`.
- **Gate:** Datadog suppression rule from the bug-triage agent applies here too — if Datadog returns errors or no results, treat it as unavailable and proceed without it. Never mention Datadog in the report when suppressed.

### Level 4: Code

- Tools: `Bash` (with `grep -r` and `git log`), `Read`, `Grep`.
- Enter only when Levels 1-3 turned up nothing useful, OR external sources specifically point to a code-level cause that needs tracing.
- Search for: error string literals, endpoint or event handler names, recent commits in the affected area (`git log --since="2 weeks ago" -- <path>`).
- Find logging/monitoring tags near the relevant code so the report can suggest concrete observability queries.
- Stop at: which service is involved, what signals are observable, 2-3 ready-to-use queries. Don't trace full call chains unless the chain itself is the finding.

## Evidence model

Every claim in the report carries one of four tags. Verbatim definitions in the SKILL.md:

| Tag | Meaning |
|-----|---------|
| `[VERIFIED]` | Directly confirmed. Read in code, or a source explicitly states this. |
| `[OBSERVED]` | A pattern matches the reported behavior, but reaching the conclusion required a logical step. |
| `[INFERRED]` | Logical deduction from available information; not directly observed. |
| `[UNKNOWN]` | Cannot determine from available sources. Requires runtime data. |

If a finished report has more `[INFERRED]` than `[VERIFIED]` findings, the search was insufficient — go back and search more. Every `[UNKNOWN]` becomes a "Where to Look" item.

## Stop condition

Investigation is **done** when **all three** are true:

1. There are 2-3 ranked hypotheses (most-likely first).
2. At least one source has been consulted at every search level the investigation reached. (If Level 1 closed via a gate, Levels 2-4 don't need sources.)
3. There are concrete next-step queries or files in "Where to Look".

If any one of these is missing, keep investigating. The stop condition is testable, not vague.

## Report template

Every report has all 6 sections. If a section has nothing meaningful to say, write a 1-line note ("Not applicable for this ticket" or similar) — do not omit the section.

| # | Section | Content |
|---|---------|---------|
| 1 | **Lead** | 1-2 sentences. What is broken + your single best hypothesis. Inline evidence tag. No restating the ticket title. |
| 2 | **Scope & Status** | Who is affected (one user / segment / all). Whether investigation is complete or needs runtime verification. Stale-ticket flag if relevant. |
| 3 | **Domain Context** | 2-4 sentences on terminology, vendor names, internal product references that someone outside the affected team wouldn't know. Write "Not applicable" if the affected area is obvious from the title. |
| 4 | **What Happened** | 2-4 sentences. Plain language. Exact error message. When it started if known. |
| 5 | **What We Found** | Narrative prose. Cover: which service owns the behavior, 2-3 ranked hypotheses, recent changes that correlate, related prior tickets. Evidence tags inline. No tables. |
| 6 | **Where To Look** | 2-5 tool-by-tool items. Each names the tool, gives the exact ready-to-paste query/URL, and says in one phrase what a hit or miss tells you. |

### Adaptation rules

These rules tweak section ORDER, not section presence. All 6 sections always appear.

- **Found at Level 1 (Slack):** Section 5 ("What We Found") leads with the source and links the thread. Sections 3, 4 may be 1 line each.
- **Found at Level 2 (runbook or prior ticket):** Same as Level 1 — Section 5 leads with the source.
- **Required Levels 3-4 (code/logs):** Section 5 includes code references inline as `path/to/file.ext:line`. No large code snippets unless the snippet itself is the finding.
- **Production incident (live impact):** Reorder — put Section 6 ("Where To Look") immediately after Section 1 ("Lead"). Engineers reading this need next actions before context. Sections 2-5 follow.
- **Vague ticket (almost no signal):** Section 5 describes what was searched and what is unknown. Section 6 begins with the broadest signal and notes which question to the reporter would narrow it.

## Writing rules

The skill applies the same writing rules as the bug-triage agent (which currently inlines them and will eventually delegate to `prose-style` when that plugin ships):

- No em dashes or spaced hyphens as separators in the report. Em dashes inside parenthetical asides are fine.
- No LLM vocabulary (delve, leverage, robust, seamlessly, comprehensive, nuanced, elevate, foster, paradigm, ecosystem, holistic, innovative, synergy, empower, facilitate).
- Lead with the answer. No opener phrases.
- No trailing summaries on short sections.
- Prose over bullet lists when the content flows naturally as sentences.
- Never present unverified analysis as confirmed root cause.

## Architecture-update side effects

The following files change because of this addition:

| File | Change |
|------|--------|
| `plugins/jira-bug-triage/agents/bug-triage-agent.md` | Update the "Sibling Skills" section: split table into "bundled with this plugin" (`issue-investigator`) and "future separate plugins" (`jira-ticket-refiner`, `prose-style`). Surrounding paragraph updated. Phase 1 fallback retained as defensive coding. |
| `plugins/jira-bug-triage/README.md` | Update "Sibling skills" section the same way. `issue-investigator` becomes "Bundled, ready to use"; the other two stay "Coming soon". |
| `README.md` (marketplace) | Remove `issue-investigator` row from the Roadmap table. Roadmap shrinks to 2 rows. |
| `plugins/jira-bug-triage/.claude-plugin/plugin.json` | Bump `version` from `0.1.0` to `0.2.0`. Update `description` to mention the bundled investigation skill. |
| `docs/superpowers/specs/2026-04-30-claude-marketplace-design.md` | Append a one-paragraph "Architectural revision" note at the end pointing at this spec. Keep the original design as historical record. |
| **New:** `plugins/jira-bug-triage/skills/issue-investigator/SKILL.md` | The skill itself. |
| **New:** `docs/superpowers/specs/2026-04-30-issue-investigator-design.md` | This spec (already written). |

## Versioning

Plugin manifest version: `0.1.0` → `0.2.0`. Reasoning: the plugin gains a new feature (the bundled skill); semver minor bump within pre-1.0 is the right call. The marketplace itself isn't versioned in the manifest, but we'll tag the repo `v0.2.0` to keep tag and plugin version aligned.

`1.0.0` is reserved for when the plugin has been used against real tickets and the API feels settled.

## Validation plan

After implementation:

1. The skill file parses (frontmatter is valid YAML).
2. `grep` checks: no Spring Health-specific strings, no em-dash separators, evidence tags use the canonical 4-level form.
3. The bug-triage agent body's references to `issue-investigator` still resolve (skill exists at the expected location).
4. Local install: `/plugin marketplace add /home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace`, `/plugin install jira-bug-triage`. Verify both `bug-triage-agent` (subagent) and `issue-investigator` (skill) appear in their respective lists.
5. Push to GitHub, tag `v0.2.0`, retest from public marketplace.

## Out of scope

- Posting the report. The skill produces text; the caller (user, or the bug-triage agent in Phase 5) handles posting.
- Modifying Jira/Slack/Datadog state. Read-only by design.
- The other two sibling plugins (`jira-ticket-refiner`, `prose-style`). Each gets its own design when their time comes.
- Non-Jira issue trackers. Future enhancement.
- Splitting the SKILL.md into reference files. Re-evaluate if the file grows past ~400 lines.
