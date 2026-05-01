# Design — `jira-ticket-refiner` skill

**Date:** 2026-05-01
**Author:** Taha Bikanerwala
**Status:** Approved (ready for implementation plan)
**Architectural revision to:** `2026-04-30-claude-marketplace-design.md` (sibling-skill location). Mirrors the bundling pattern established in `2026-04-30-issue-investigator-design.md`.

## Goal

Add a new skill `jira-ticket-refiner` to the `jira-bug-triage` plugin. The skill restructures any Jira ticket (Bug, Feature, Task, Incident, Spike) into a clear, self-contained document that updates the ticket's title and description via the Atlassian MCP. The skill ships nested inside the plugin so it installs alongside the bug-triage agent and `issue-investigator`.

The skill is genuinely original work, designed from Taha's ticket-refinement approach. The Spring Health-authored skill at `/home/taha/Desktop/MyProjects/simple-windows-setup/.claude/skills/jira-ticket-refiner/` was deliberately not read for structural reference. The only inputs from outside this repo are the skill's name and the bug-triage agent's expectations of what a refinement skill produces.

## Architectural revision

The original marketplace design (`2026-04-30-claude-marketplace-design.md`) listed `issue-investigator`, `jira-ticket-refiner`, and `prose-style` as future **separate plugins**. The 2026-04-30 issue-investigator spec changed that for `issue-investigator` only. This spec extends the same change to `jira-ticket-refiner`:

- `jira-ticket-refiner` is now nested inside the `jira-bug-triage` plugin at `plugins/jira-bug-triage/skills/jira-ticket-refiner/`.
- `prose-style` remains the only sibling skill still planned as a separate plugin.

The bug-triage agent still calls `jira-ticket-refiner` by name via the `Skill` tool in Phase 5. The Phase 5 fallback in the agent body is retained as defensive coding for the rare case where the bundled skill fails to load at runtime, matching the precedent set for `issue-investigator`.

### Scope difference from the original Roadmap entry

The Roadmap row removed in v0.3.0 described `jira-ticket-refiner` as restructuring poorly written Jira tickets into clear, self-contained documents. The bundled implementation is broader: it works for any archetype (Bug, Feature, Task, Incident, Spike), not just Bugs. The bug-triage agent's Phase 5 still calls it on Bug-archetype tickets, but the skill itself is general-purpose and can be invoked standalone for any ticket type.

## Skill location and metadata

**Path:** `plugins/jira-bug-triage/skills/jira-ticket-refiner/`
**File layout:** multi-file with progressive disclosure. `SKILL.md` (workflow + anti-patterns + writing rules) plus four reference files and one asset:

```
plugins/jira-bug-triage/skills/jira-ticket-refiner/
├── SKILL.md
├── references/
│   ├── gathering-guide.md
│   ├── classification-guide.md
│   ├── jira-formatting.md
│   └── title-guide.md
└── assets/
    └── template.md
```

This differs from `issue-investigator`'s single-file layout. The refiner has substantially more reference material (a 7-archetype information-category map, a 15-section template with archetype-to-sections mapping, a markdown-to-ADF safety reference, an 80-character title guide). Bundling all of it into one file would push past 800 lines and force every invocation to load reference material it does not need at the current step. Splitting by workflow step (Step 1 needs `gathering-guide.md`, Steps 3 and 4 need `classification-guide.md`, Step 5 needs `template.md` and `jira-formatting.md`, Step 6 needs `title-guide.md`) keeps the per-step load smaller.

**Skill name (frontmatter `name`):** `jira-ticket-refiner`. Kept the original name. It is descriptive, the bug-triage agent body already references it, and renaming would force a find-replace with no payoff.

**Frontmatter description (rough):**

> Restructures a poorly written Jira ticket into a clear, self-contained document that a stranger can read cold and act on. Works on any ticket type (bug, feature, task, spike, incident). Updates the description and title via the Atlassian MCP and never deletes original content. Use when the user asks to refine, rewrite, restructure, clean up, or improve a Jira ticket.

**Frontmatter `metadata.author`:** `Taha Bikanerwala`.

**Frontmatter `tools` (read + write to Jira; never Slack or Datadog):**

```
tools: Read, mcp__plugin_atlassian_atlassian__getAccessibleAtlassianResources, mcp__plugin_atlassian_atlassian__getJiraIssue, mcp__plugin_atlassian_atlassian__editJiraIssue, mcp__plugin_atlassian_atlassian__addCommentToJiraIssue
```

The skill writes to Jira (description, title, optional next-steps comment). It does not search Slack, query Datadog, or post to other systems. `addCommentToJiraIssue` is included for the optional Step 8 next-steps comment.

## Calling convention

The skill works two ways. Both paths share the same workflow except for the fetch step.

- **Standalone.** User pastes a ticket key or URL and asks to refine. Skill runs end to end, including Step 1 (fetch).
- **Called from `bug-triage-agent` Phase 5.** The agent has already fetched the ticket and runs its own confirmation gate at Phase 3. The skill must reuse the agent's payload and skip the fetch step. The single confirmation gate at Step 7 still applies; it is not redundant with Phase 3 because Phase 3 confirms severity assessment and follow-up plan, while Step 7 confirms the title and description rewrite.

Other invariants:

- **One confirmation gate.** Always preview the rewrite before calling `editJiraIssue`. The user must approve.
- **Read-then-write.** Refuse to write before reading the description, comments, and (when relevant) changelog.
- **Strict superset.** The refined ticket contains every fact from the original. Restructure, rewrite, and re-tag, never truncate.
- **No solution prescription.** The skill structures information. It does not invent fixes, recommend roadmap, or editorialize on causes that are not in the ticket.

## Workflow

Eight ordered steps. Steps 1, 5, and 6 require reading the corresponding reference file when the workflow reaches that step (progressive disclosure). The references are not pre-loaded.

| Step | Name | Reference file loaded |
|------|------|------------------------|
| 1 | Fetch the ticket | `references/gathering-guide.md` |
| 2 | Classify the archetype | (inline table in `SKILL.md`) |
| 3 | Inventory information | `references/classification-guide.md` (Information Categories half) |
| 4 | Rewrite | `references/classification-guide.md` (Rewrite Principles half — already loaded in Step 3) |
| 5 | Apply the template | `assets/template.md` + `references/jira-formatting.md` |
| 6 | Rewrite the title | `references/title-guide.md` |
| 7 | Preview and confirm | (inline in `SKILL.md`) |
| 8 | Post a next-steps comment (optional) | (inline in `SKILL.md`) |

### Archetype model (Step 2)

Five archetypes drive which template sections appear:

| Archetype | Typical Jira issue types |
|-----------|--------------------------|
| Bug | Bug, Defect |
| Feature | Story, Feature, Enhancement, New Feature |
| Task | Task, Sub-task, Chore, Tech Debt |
| Incident | Incident, Outage, SEV-tagged |
| Spike | Spike, Research, Investigation |

When the issue type and the content disagree, content wins. A ticket typed `Bug` whose body is acceptance criteria and a Figma link is a Feature. The archetype drives the template, not the Jira issue type field.

### Information categories (Step 3)

Every fact in the original ticket gets one category:

| Category | Where it lands |
|----------|---------------|
| Observed symptoms | Summary, Reproduction/Expected/Actual |
| Affected scope | Affected Scope section |
| Investigation artifacts | Investigation Notes section |
| Requirements and acceptance criteria | Requirements section |
| Decisions and rationale | Context section, surfaced from comment threads |
| Unverified analysis | Working Hypotheses section, never Root Cause |
| Source-system metadata | Body sections via fact extraction; raw block dropped unless unclassifiable |
| Status updates from comments | Summarized into Context, never duplicated from sidebar |

Each fact also carries a `Verified` or `Unverified` flag. The flag determines section placement: unverified analysis goes into Working Hypotheses; verified facts go into the section their content matches.

### Template (Step 5)

15 sections, included or skipped based on archetype. The archetype-to-sections map lives in `assets/template.md` as a table; rules:

- `always` — section appears regardless of content.
- `if present` — section appears only when the original ticket has relevant material.
- `skip` — section never appears for this archetype.
- `last resort` — section appears only when truly unclassifiable content has no other home.

The Reproduction/Expected/Actual trio is Bug-only and uses three top-level headings (no shared parent). The Section Order list groups it as one slot for ordering purposes only. Other key constraints documented in the template:

- Skip empty sections. A header with no body is noise.
- Fold raw metadata blocks into the body. Source-system blocks (Applause, Zendesk, escalation forms) get extracted; the raw block does not survive.
- The first three positions stay rigid (Summary, Impact, Context) so a reader skimming the top sees what, who, and why.

### Title rule (Step 6)

The base pattern is `{Area}: {specific problem or goal}`. Variants for customer-specific bugs (`{Area} + {Customer}: {problem}`), incidents (`P{n}: {Area} {short problem}`), and spikes (`Spike: {Area} {question}`). Hard ceiling 80 characters; aim for 60-75 to avoid Jira board truncation.

### Preview format (Step 7)

The preview is rendered as inline markdown, not wrapped in an outer code fence. Layout:

1. Horizontal rule.
2. The new title on its own line: `**Title:** \`{the rewritten title}\`` (the value lands in `fields.summary`).
3. Blank line.
4. Full refined description as plain markdown.
5. Horizontal rule.
6. One-sentence approval prompt.

Wrapping the whole preview in an outer fence would break every inner fenced code block (errors, queries, JSON). The preview must show what will land on the ticket so the user can catch mistakes.

### Next-steps comment (Step 8)

Optional. Skipped unless the user asks. When asked: post via `addCommentToJiraIssue` with `contentFormat: "adf"` and a JSON-stringified ADF doc as `commentBody`. Markdown is forbidden for comments in this plugin (escapes mention brackets, link targets, rich marks); the same rule appears in `bug-triage-agent.md`. The skeleton ADF doc has a `heading` (level 2) titled `Next Steps (YYYY-MM-DD)` and an `orderedList` of action items.

## API constraints (formatting reference)

Documented in `references/jira-formatting.md`:

- `editJiraIssue` and `createJiraIssue` accept the description as a markdown **string**. Raw ADF JSON in the description field returns `Failed to convert markdown to adf`.
- The description content the markdown converter sees must contain real line breaks. The JSON-encoded `\n` on the wire is decoded back to a real newline before the markdown converter runs; that is fine. Literal `\n` characters inside the description content (after JSON decoding) render as the two characters backslash-n on the ticket.
- Some rich-text custom fields (notably a "Bug Description" field on Jira instances configured for it) require raw ADF and are written via a separate `editJiraIssue` call. The standard `description` field is markdown.
- Confirmed safe: headings, bold, italic, inline code, fenced code blocks (with language tags), numbered/bullet lists, links.
- Confirmed broken: interactive checkboxes (`- [ ]`, `- [x]`) render as escaped bracket text inside a bullet list.
- Forbidden: raw ADF in the description, HTML tags, Jira wiki markup (`{code}`, `{panel}`, `h1.`, `||header||`), nested blockquotes.
- ADF content-loss warning: smart links, mentions, panels with content, status lozenges, expand/collapse sections, task lists with checked items, embedded media, date pickers, multi-column layouts. Warn the user only when a loss is substantive; cosmetic-only losses (smart-link card becoming a plain URL) do not need a warning.

## Anti-patterns

Hard rules. Each prevents a failure mode observed on real refinements. Documented in `SKILL.md`:

1. Never present unverified analysis as confirmed root cause.
2. Never inject solutions that are not in the original ticket.
3. Never add roadmap or tech-debt suggestions.
4. Never replace the description with less information.
5. Never lose investigation artifacts (customer IDs, log links, query results, error strings, attachment URLs, screenshot embeds, video links).
6. Never use escaped newlines (`\n` renders as literal backslash-n in Jira).
7. Never send raw ADF JSON in the description field.
8. Never restate sidebar metadata (status, priority, issue type, parent, assignee, reporter, labels, components).
9. Never use bug sections on non-bug tickets (no Reproduction Steps on a Feature, no Acceptance Criteria on a Spike).
10. Never put a to-do list in the description (next-step actions belong in a comment via Step 8).

## Writing rules

Same rules as `issue-investigator` and `bug-triage-agent`:

- No em dashes or spaced hyphens as separators in the report.
- No LLM vocabulary: delve, leverage, robust, seamlessly, comprehensive, nuanced, elevate, foster, paradigm, ecosystem, holistic, innovative, synergy, empower, facilitate.
- Lead with the answer. No opener phrases.
- No trailing summaries on short sections.
- Prose over bullet lists when the content flows naturally as sentences.

When `prose-style` ships as a separate plugin, the skill defers to it after producing the rewrite. The rules above are the floor.

## Architecture-update side effects

The following files change because of this addition:

| File | Change |
|------|--------|
| `plugins/jira-bug-triage/agents/bug-triage-agent.md` | Sibling Skills table: move `jira-ticket-refiner` from "Future separate plugins" to "Bundled with this plugin". Phase 5 fallback retained as defensive coding. |
| `plugins/jira-bug-triage/README.md` | Sibling skills section: `jira-ticket-refiner` becomes "Bundled, ready to use"; only `prose-style` stays "Coming soon". Add one paragraph clarifying that defensive fallbacks exist for both bundled skills. |
| `README.md` (marketplace) | Remove `jira-ticket-refiner` row from Roadmap. Roadmap shrinks to one row (`prose-style`). Update `jira-bug-triage` row description to mention both bundled skills. Bump version cell from `0.2.0` to `0.3.0`. |
| `.claude-plugin/marketplace.json` | Update plugin description to mention both bundled skills. |
| `plugins/jira-bug-triage/.claude-plugin/plugin.json` | Bump `version` from `0.2.0` to `0.3.0`. Update `description` to mention both bundled skills. |
| `docs/superpowers/specs/2026-04-30-claude-marketplace-design.md` | Append a `## Architectural revision (2026-05-01)` section noting the bundling, scope difference, multi-file layout, and v0.3.0 bump. |
| `docs/superpowers/specs/2026-04-30-issue-investigator-design.md` | Append a small `## Update (2026-05-01)` section pointing at this spec, since the v0.2.0 spec's claims about `jira-ticket-refiner` remaining a separate plugin are now stale. |
| **New:** `plugins/jira-bug-triage/skills/jira-ticket-refiner/SKILL.md` | Workflow body. |
| **New:** `plugins/jira-bug-triage/skills/jira-ticket-refiner/references/gathering-guide.md` | Step 1 reference. |
| **New:** `plugins/jira-bug-triage/skills/jira-ticket-refiner/references/classification-guide.md` | Steps 3-4 reference. |
| **New:** `plugins/jira-bug-triage/skills/jira-ticket-refiner/references/jira-formatting.md` | Step 5 reference. |
| **New:** `plugins/jira-bug-triage/skills/jira-ticket-refiner/references/title-guide.md` | Step 6 reference. |
| **New:** `plugins/jira-bug-triage/skills/jira-ticket-refiner/assets/template.md` | Step 5 template. |
| **New:** `docs/superpowers/specs/2026-05-01-jira-ticket-refiner-design.md` | This spec. |
| **New:** `docs/superpowers/plans/2026-05-01-jira-ticket-refiner.md` | Implementation plan. |

## Versioning

Plugin manifest version: `0.2.0` → `0.3.0`. Reasoning: a new bundled skill is a feature addition; semver minor bump within pre-1.0 is the right call. The marketplace itself isn't versioned in the manifest, but the repo gets tagged `v0.3.0` to keep tag and plugin version aligned. The local `v0.3.0` tag is held back until the merge commit lands, because rebase or squash merges may rewrite SHAs.

`1.0.0` is reserved for when the plugin has been used against real tickets and the API feels settled.

## Validation plan

After implementation:

1. The `SKILL.md` frontmatter parses as YAML; the `description` field stays under the 1024-character limit.
2. `python3 -m json.tool` confirms `plugin.json` parses.
3. Em-dash-as-separator scan against the new skill files returns no hits (em dashes inside parenthetical asides are fine).
4. LLM-vocabulary scan returns no hits outside the rule-statement list itself.
5. `ReadLints` on the new skill directory returns no errors.
6. Local install: `/plugin marketplace add /home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace`, `/plugin install jira-bug-triage`. Verify the skill is discoverable.
7. Standalone invocation: paste a real Jira ticket key and ask to refine. Confirm the preview gate appears before any `editJiraIssue` call.
8. Bug-triage agent invocation: trigger Phase 5 on a Bug ticket. Confirm the skill picks up the agent's already-fetched payload rather than refetching.
9. Title rewrite respects the 80-character ceiling on a real Jira board view.
10. Push to GitHub, tag `v0.3.0` on the merge commit, retest from the public marketplace.

## Out of scope

- Posting next-steps comments without explicit user request. Step 8 runs only when asked.
- Modifying any Jira field other than `summary`, `description`, and the optional comment thread. The skill never touches status, priority, assignee, labels, components, or custom fields outside the standard description path.
- The remaining sibling plugin (`prose-style`). Gets its own design when its time comes.
- Non-Jira issue trackers (Linear, GitHub Issues, ServiceNow). Future enhancement.
- Automatic re-fetch detection beyond "calling agent passed a payload" / "ran standalone" branching.
- Restructuring the four reference files into a different split. Re-evaluate if any single reference grows past ~250 lines.
