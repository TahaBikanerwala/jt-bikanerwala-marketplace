# jira-ticket-refiner Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. This plan is retroactive: tasks are checked off because the work shipped on branch `feat/jira-ticket-refiner` ahead of the plan being written. The plan documents what was done so future skills follow the same pattern.

**Goal:** Add the `jira-ticket-refiner` skill to the `jira-bug-triage` plugin (nested at `plugins/jira-bug-triage/skills/jira-ticket-refiner/`), update the files that referenced it as a future separate plugin, bump the plugin version to 0.3.0, and tag the marketplace `v0.3.0`. Mirrors the v0.2.0 bundling pattern used for `issue-investigator`.

**Architecture:** Multi-file skill (one `SKILL.md`, four `references/*.md`, one `assets/template.md`) chosen because the refiner has substantially more reference material than fits cleanly in a single file. Each reference file is loaded on demand at the workflow step that needs it (progressive disclosure). Existing files get small targeted edits to reflect the architectural revision (skill is now bundled, not a separate plugin).

**Tech Stack:** Markdown (skill body, references, template, READMEs), JSON (plugin manifest, marketplace manifest), `python3 + yaml` for frontmatter validation, `python3 -m json.tool` for JSON validation, `git` + `gh` for tagging and pushing.

**Working directory:** `/home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace/` (existing repo, branch `feat/jira-ticket-refiner` cut from `main` after v0.2.0 ship at commit `8799f75`).

**Source spec:** `docs/superpowers/specs/2026-05-01-jira-ticket-refiner-design.md` (this plan's companion).

---

## Task 1: Write the SKILL.md and reference files

**Files:**
- Create: `plugins/jira-bug-triage/skills/jira-ticket-refiner/SKILL.md`
- Create: `plugins/jira-bug-triage/skills/jira-ticket-refiner/references/gathering-guide.md`
- Create: `plugins/jira-bug-triage/skills/jira-ticket-refiner/references/classification-guide.md`
- Create: `plugins/jira-bug-triage/skills/jira-ticket-refiner/references/jira-formatting.md`
- Create: `plugins/jira-bug-triage/skills/jira-ticket-refiner/references/title-guide.md`
- Create: `plugins/jira-bug-triage/skills/jira-ticket-refiner/assets/template.md`

- [x] **Step 1: Create the skill directory tree**

```bash
mkdir -p /home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace/plugins/jira-bug-triage/skills/jira-ticket-refiner/references
mkdir -p /home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace/plugins/jira-bug-triage/skills/jira-ticket-refiner/assets
```

- [x] **Step 2: Write the SKILL.md**

Workflow body. Eight ordered steps with progressive-disclosure references. Calling Convention section near the top documents the standalone vs. agent-Phase-5 split and the four invariants (one confirmation gate, read-then-write, strict superset, no solution prescription). Anti-Patterns section enumerates the ten hard rules. Writing Style section is the floor (defers to `prose-style` when installed).

Frontmatter description below the 1024-char limit. `tools` field includes only Atlassian MCP tools the skill uses (`getAccessibleAtlassianResources`, `getJiraIssue`, `editJiraIssue`, `addCommentToJiraIssue`) plus `Read`. No Slack, no Datadog (the skill never queries those).

- [x] **Step 3: Write `references/gathering-guide.md` (Step 1 of the workflow)**

What to fetch (`getJiraIssue` with the field list, `responseContentFormat: "markdown"`, full comment thread, changelog only when warranted, walk every `issuelinks` entry). Reuse-the-payload note for the bug-triage agent path. "Fetch for Context, Not for Output" table that lists every sidebar field and explains why surfacing comment-thread content is the primary value of the skill. Completeness Gate checklist that blocks Step 2. Per-archetype priorities table. ADF Content-Loss Check table.

- [x] **Step 4: Write `references/classification-guide.md` (Steps 3-4)**

Information Categories table (eight categories). Verified-vs-Unverified flag. Rewrite Principles table (eleven principles). Three Common Patterns illustrating the most-frequent failure modes (buried decisions, unverified root causes stated as fact, evidence trapped in comments).

- [x] **Step 5: Write `references/jira-formatting.md` (Step 5)**

API Format Rule explaining the markdown-string contract and the JSON-encoding-vs-content layer distinction. Confirmed Safe table (headings, bold, italic, inline code, fenced code blocks, lists, links). Likely Safe table (blockquotes, horizontal rules, tables, strikethrough, inline images, nested lists). Confirmed Broken table (interactive checkboxes). Forbidden table (raw ADF JSON, HTML tags, wiki markup, literal `\n` after JSON decoding, nested blockquotes). ADF Content-Loss Warning table.

- [x] **Step 6: Write `references/title-guide.md` (Step 6)**

Why-it-matters opener. Five rules. Base pattern with three variants. Examples by archetype (four tables: Bugs, Features and Stories, Tasks and Chores, Incidents, Spikes and Investigations). When-to-keep-the-original guidance.

- [x] **Step 7: Write `assets/template.md` (Step 5)**

Archetype-to-Sections Map (15 sections × 5 archetypes). Section Definitions for each of the 15 sections with one-paragraph descriptions and small structural templates. The Reproduction/Expected/Actual section uses a four-backtick outer fence so the inner three-backtick stack-trace fence is plain (no escaping). Section Order list (15 positions; the trio sits at position 5 as a single slot for ordering, not because the trio shares a parent heading).

- [x] **Step 8: Validate frontmatter parses as YAML**

```bash
python3 -c "
import re, yaml
content = open('plugins/jira-bug-triage/skills/jira-ticket-refiner/SKILL.md').read()
m = re.match(r'^---\n(.*?)\n---', content, re.DOTALL)
assert m, 'no frontmatter'
data = yaml.safe_load(m.group(1))
assert data['name'] == 'jira-ticket-refiner'
assert 'description' in data and len(data['description']) > 50 and len(data['description']) < 1024
assert 'tools' in data and len(data['tools']) > 0
assert data.get('metadata', {}).get('author') == 'Taha Bikanerwala'
print('frontmatter OK')
"
```

Expected: `frontmatter OK`. Actual: `frontmatter OK` (description = 369 characters).

- [x] **Step 9: Em-dash-as-separator scan**

```bash
grep -nE '[a-zA-Z>] — [a-zA-Z<{]' plugins/jira-bug-triage/skills/jira-ticket-refiner/*.md plugins/jira-bug-triage/skills/jira-ticket-refiner/**/*.md
```

Expected: no matches. Em dashes inside parentheticals are acceptable, but the new files contain none.

- [x] **Step 10: LLM-vocabulary scan**

```bash
grep -niE 'delve|leverage|robust|seamlessly|comprehensive|nuanced|elevate|foster|paradigm|ecosystem|holistic|innovative|synergy|empower|facilitate' plugins/jira-bug-triage/skills/jira-ticket-refiner/SKILL.md plugins/jira-bug-triage/skills/jira-ticket-refiner/**/*.md
```

Expected: only the rule-statement list itself contains these words (the `## Writing Style` section in `SKILL.md` and the matching reference in any guide that restates the rule). No occurrences in body prose.

- [x] **Step 11: Spring Health leakage scan**

```bash
grep -niE 'springhealth|spring health|customfield_10114|customfield_12424|customfield_12468|customfield_10153|customfield_10892|14854|18320|14853|18321|14852|applause|se\.triaged|compass|care.blocking|everett|pradip|support-engineering-bug-backlog|maple tower|bread financial' plugins/jira-bug-triage/skills/jira-ticket-refiner/**/*.md plugins/jira-bug-triage/skills/jira-ticket-refiner/SKILL.md
```

Expected: `MapleTower` (one word, illustrative tenant) is acceptable. `Bread Financial` appears once as an illustrative customer name in `assets/template.md` Affected Scope example; not a leakage of Spring Health internal data.

- [x] **Step 12: Commit**

```bash
git add plugins/jira-bug-triage/skills/jira-ticket-refiner/
git commit -m "feat(jira-ticket-refiner): add bundled refinement skill for all ticket archetypes"
```

Actual: commit `471ceb2`.

---

## Task 2: Update bug-triage agent body — Sibling Skills section

**Files:**
- Modify: `plugins/jira-bug-triage/agents/bug-triage-agent.md`

The current "Sibling Skills" section already uses the bundled-vs-future split from v0.2.0, with `issue-investigator` in "Bundled with this plugin" and both `jira-ticket-refiner` and `prose-style` in "Future separate plugins". Move `jira-ticket-refiner` into the bundled bucket and update its description to mention all-archetype scope.

- [x] **Step 1: Read the current Sibling Skills section**

```bash
grep -n "## Sibling Skills" plugins/jira-bug-triage/agents/bug-triage-agent.md
```

Note the line range (currently approximately lines 62-79). Read the block to confirm exact wording.

- [x] **Step 2: Move `jira-ticket-refiner` from "Future" to "Bundled" and expand its description**

Bundled table goes from one row to two:

```
| Phase 1 | `issue-investigator` | Search Slack, the ticket and related Jira/Confluence pages, Datadog, then code if needed. Produces an evidence-tagged report in the 6-section bug-archetype template. |
| Phase 5 | `jira-ticket-refiner` | Restructure the ticket description into a clear, self-contained document. Works for any archetype (Bug / Feature / Task / Incident / Spike). Updates the title and description via the Atlassian MCP and never deletes original content. |
```

Future separate plugins table shrinks to one row (`prose-style` only).

- [x] **Step 3: Confirm sibling-skill name counts**

```bash
echo "issue-investigator: $(grep -c 'issue-investigator' plugins/jira-bug-triage/agents/bug-triage-agent.md)"
echo "jira-ticket-refiner: $(grep -c 'jira-ticket-refiner' plugins/jira-bug-triage/agents/bug-triage-agent.md)"
echo "prose-style: $(grep -c 'prose-style' plugins/jira-bug-triage/agents/bug-triage-agent.md)"
```

Expected: each count `>= 1`.

- [x] **Step 4: Re-validate frontmatter**

Same `python3 + yaml` check as v0.2.0. Expected: `frontmatter OK`.

---

## Task 3: Update plugin README — Sibling skills section

**Files:**
- Modify: `plugins/jira-bug-triage/README.md`

- [x] **Step 1: Move `jira-ticket-refiner` to the Bundled section**

Bundled table goes from one row to two. Future Separate Plugins table shrinks to one row (`prose-style`).

- [x] **Step 2: Add the defensive-fallback paragraph**

Append one paragraph clarifying that the agent body retains short defensive fallbacks for **both** bundled skills (`issue-investigator`, `jira-ticket-refiner`). The original wording said the agent only retained a fallback for `prose-style`, which contradicts the actual agent body. Updated wording: defensive fallbacks fire only on rare runtime load failures and never need user attention.

- [x] **Step 3: Em-dash and leakage scans**

Same as Task 1 Steps 9 and 11. Expected: no separator em dashes; only intentional `applause` reference remains.

---

## Task 4: Update marketplace README — remove jira-ticket-refiner from Roadmap

**Files:**
- Modify: `README.md` (top-level)

- [x] **Step 1: Edit the "Available plugins" row**

Bump version from `0.2.0` to `0.3.0`. Update description to mention both bundled skills.

- [x] **Step 2: Drop `jira-ticket-refiner` from the Roadmap table**

Roadmap shrinks to one row (`prose-style`).

---

## Task 5: Update marketplace manifest description

**Files:**
- Modify: `.claude-plugin/marketplace.json`

- [x] **Step 1: Update the plugin description**

Change `"End-to-end Jira bug triage subagent. Bundles the issue-investigator skill."` to a longer string that mentions both bundled skills. The plugin.json description does the same.

- [x] **Step 2: Validate JSON**

```bash
python3 -m json.tool .claude-plugin/marketplace.json > /dev/null && echo OK
```

Expected: `OK`.

---

## Task 6: Bump plugin manifest version and description

**Files:**
- Modify: `plugins/jira-bug-triage/.claude-plugin/plugin.json`

- [x] **Step 1: Bump `version` and update `description`**

`"version": "0.2.0"` → `"version": "0.3.0"`. Description appended with the second bundled skill.

- [x] **Step 2: Validate JSON**

```bash
python3 -m json.tool plugins/jira-bug-triage/.claude-plugin/plugin.json > /dev/null && echo OK
```

Expected: `OK`.

---

## Task 7: Append architectural-revision note to original design doc

**Files:**
- Modify: `docs/superpowers/specs/2026-04-30-claude-marketplace-design.md`

Keep the original design as historical record. Append a `## Architectural revision (2026-05-01)` section mirroring the existing 2026-04-30 one for `issue-investigator`. Document the bundling, the scope difference (works on all archetypes, not Bug-only), the multi-file layout rationale, and the v0.3.0 bump.

- [x] **Step 1: Append the section**

After the existing `## Architectural revision (2026-04-30)` section, add a `## Architectural revision (2026-05-01)` section with the four points above.

- [x] **Step 2: Append `## Update (2026-05-01)` to the v0.2.0 spec**

`docs/superpowers/specs/2026-04-30-issue-investigator-design.md` makes claims about `jira-ticket-refiner` and `prose-style` remaining as planned separate plugins. Add a small Update section at the bottom pointing at the new spec, noting that the "future separate plugins" claims in the v0.2.0 spec are accurate as of 2026-04-30 but stale for `jira-ticket-refiner` after v0.3.0.

---

## Task 8: Self-found polish (post-Copilot review)

The PR went through three rounds of Copilot review and one round of self-review. Each reviewer-identified issue and self-found drift was fixed. The fixes themselves are not architectural changes; they are targeted documentation tightening that did not require a spec revision.

- [x] **Step 1: `references/jira-formatting.md` — fenced-code-blocks table cell**

The original table cell wrapped triple-backtick content inside a triple-backtick inline-code span. The inner triples closed the outer span, leaving `language ```` floating outside the code span. Replaced with prose plus single-backtick-delimited inline code that uses the leading-and-trailing-space rule to embed triple backticks safely.

- [x] **Step 2: `SKILL.md` Step 8 — comment format consistency**

The original Step 8 prescribed markdown for next-steps comments, contradicting the plugin convention in `bug-triage-agent.md` line 113 (`Never post a comment using contentFormat: "markdown"`). Switched to `contentFormat: "adf"` with a JSON-stringified ADF doc and a worked skeleton showing `heading` + `orderedList` + `listItem` + `paragraph` + `text` nodes.

- [x] **Step 3: Plugin README — defensive-fallback wording**

The original wording said the agent only retained a fallback for `prose-style`, but the agent body still has a defensive fallback for `jira-ticket-refiner` (kept for the rare skill-load-failure case, matching the issue-investigator precedent). Added one paragraph clarifying that defensive fallbacks exist for both bundled skills.

- [x] **Step 4: `references/jira-formatting.md` — JSON-encoding-vs-content layer**

The original showed the JSON-encoded `\n` escape next to a "no `\n`" Forbidden row without explanation. Restructured to show description content as raw markdown first, then the JSON wire payload, with prose explaining that the `\n` on the wire is a JSON escape decoded before the markdown converter runs. The Forbidden row now reads "Literal `\n` characters inside the description content (after JSON decoding)" so the rule and the example stop appearing to contradict.

- [x] **Step 5: `assets/template.md` — Reproduction/Expected/Actual parent heading**

The original said the trio sits "under one parent section". The example shows three top-level headings with no parent. Updated wording to match the example: "Three top-level sections that always travel together. Use these exact headings, in this order, with no shared parent heading above them." Section Order list groups them as one slot for ordering purposes only.

- [x] **Step 6: `assets/template.md` — Investigation Notes nested fence**

Original used escaped triple-backticks inside a triple-backtick fence. Switched the outer fence to four backticks so the inner stack-trace fence is plain three-backtick with no escaping. Added a one-line note above the example clarifying that the outer fence exists only for the template document and should be dropped when the section is copied into a real ticket.

- [x] **Step 7: `SKILL.md` Step 7 — title-vs-summary terminology**

The original called the value inside the inline-code span "the rewritten summary", but the line is meant to show the rewritten title (Jira's `fields.summary`). Renamed placeholder to `{the rewritten title}` and added prose explicitly defining "Title" here as the user-facing label and the value that lands in `fields.summary`. Line 13 (`description and summary`) aligned with `description and title (the fields.summary API field)`.

- [x] **Step 8: `SKILL.md` Step 8 — hardcoded date and stringification**

Replaced hardcoded `Next Steps (2026-05-01)` with `Next Steps (YYYY-MM-DD)` placeholder. Added prose above the skeleton stating the structure is shown as an object for readability and must be serialized with `JSON.stringify(adfDoc)` before passing to `addCommentToJiraIssue` as `commentBody`. Added a second small JSON block showing the full call shape with the stringified body.

- [x] **Step 9: `references/gathering-guide.md` — markdown-only claim scope**

The original said "Markdown is the only format `editJiraIssue` accepts on the way back in". Some Jira instances expose a rich-text "Bug Description" custom field that needs raw ADF, which `references/jira-formatting.md` already documents. Rescoped to the standard `description` field with a one-clause pointer to the ADF custom-field path.

- [x] **Step 10: `references/jira-formatting.md` — drop backslash-escaped pipes inside inline-code spans**

The "Likely Safe" table cell for Tables showed the markdown syntax as `` `\| col \| col \|` `` and the "Forbidden" table cell for Wiki markup embedded `` `\|\|header\|\|` `` inside an inline-code span. Per CommonMark, backslash escapes do not process inside code spans (backslashes render literally). Per GFM, pipes inside table-cell code spans are already preserved without escaping. The backslashes were both unnecessary and visible to the reader. Dropped them so the cells render as clean `| col | col |` and `||header||`.

- [x] **Step 11: Commits**

The polish landed across four commits:
- `9a13133`: Steps 1-3 (Copilot round 1)
- `3a17a2d`: Steps 4-6 (Copilot round 2)
- `39358ff`: Steps 7-9 (Copilot round 3 + self-found terminology drift)
- Round 4: Step 10 (Copilot round 4, backslash-escaped pipes inside table-cell code spans)

---

## Task 9: Local install validation (user-driven)

Validate the marketplace and plugin install correctly **before** merging the PR.

- [ ] **Step 1: Add the marketplace from the local file path**

> `/plugin marketplace add /home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace`

Expected: marketplace added with name `jt-bikanerwala-marketplace`, no kebab-case warnings, no missing-field errors.

- [ ] **Step 2: Install the plugin**

> `/plugin install jira-bug-triage`

Expected: install succeeds at version `0.3.0`.

- [ ] **Step 3: Verify the skill is discoverable**

Confirm `jira-ticket-refiner` shows up in the Skill list alongside `issue-investigator`.

- [ ] **Step 4: Standalone smoke test**

Paste a real Jira ticket key and ask the agent to refine it. Confirm the preview gate appears before any `editJiraIssue` call.

- [ ] **Step 5: Bug-triage-agent Phase 5 smoke test**

Invoke `bug-triage-agent` on a Bug ticket. Confirm Phase 5 picks up the agent's already-fetched payload rather than refetching, and the title rewrite respects the 80-char ceiling on a real Jira board view.

The validation checkboxes stay unchecked until the user confirms a real-ticket test against their Jira instance.

---

## Task 10: Publish to GitHub

- [ ] **Step 1: Confirm gh is authenticated**

```bash
gh auth status 2>&1 | head -5
```

Expected: logged in as `TahaBikanerwala`.

- [ ] **Step 2: Push the branch and merge the PR**

The PR is open at `github.com/TahaBikanerwala/jt-bikanerwala-marketplace/pull/1`. Three rounds of Copilot review have been addressed. After merge:

- [ ] **Step 3: Tag v0.3.0 on the merge commit**

```bash
git tag v0.3.0
git push origin v0.3.0
```

The local `v0.3.0` tag was held back during PR work because rebase or squash merges may rewrite SHAs. The tag goes on the merge commit on `main`, not on any commit that exists only on the feature branch.

- [ ] **Step 4: Public install verification**

> ```
> /plugin marketplace remove jt-bikanerwala-marketplace
> /plugin marketplace add github.com/TahaBikanerwala/jt-bikanerwala-marketplace
> /plugin install jira-bug-triage
> ```

Confirm marketplace fetches the latest `main` (v0.3.0 commits visible), plugin installs at version `0.3.0`, and both `bug-triage-agent` and the two bundled skills are available.

---

## Self-review

**1. Spec coverage.**

Walking through `docs/superpowers/specs/2026-05-01-jira-ticket-refiner-design.md` section by section:

| Spec section | Implementing task |
|--------------|-------------------|
| Architectural revision | Tasks 2, 3, 4, 5, 6, 7 |
| Skill location and metadata (path, frontmatter, tools, author) | Task 1 |
| Calling convention (standalone vs Phase 5, four invariants) | Task 1 (Calling Convention section) |
| 8-step workflow | Task 1 (workflow body) |
| Archetype model | Task 1 (Step 2 table in `SKILL.md`) |
| Information categories + verified/unverified flag | Task 1 (`references/classification-guide.md`) |
| Template (15 sections, archetype-to-sections map, section order) | Task 1 (`assets/template.md`) |
| Title rule | Task 1 (`references/title-guide.md`) |
| Preview format | Task 1 (Step 7 in `SKILL.md`) |
| Next-steps comment (ADF, optional) | Task 1 (Step 8 in `SKILL.md`) |
| API constraints (markdown-string, JSON-encoding layers, ADF content loss) | Task 1 (`references/jira-formatting.md`) |
| Anti-patterns (10 hard rules) | Task 1 (`SKILL.md` Anti-Patterns section) |
| Writing rules | Task 1 (`SKILL.md` Writing Style section, mirrored across references) |
| Architecture-update side effects (8 modified + 7 new files) | Tasks 2-7 |
| Versioning (0.2.0 → 0.3.0) | Tasks 4 (marketplace README), 5 (marketplace.json), 6 (plugin.json) |
| Validation plan | Task 1 Steps 8-11, Task 9 |
| Out of scope | Honored. No Slack, no Datadog, no field changes outside summary/description/comments, no `prose-style` work, no non-Jira trackers. |

All spec sections covered.

**2. Type/name consistency.**

- Skill name `jira-ticket-refiner` — used consistently in Task 1 frontmatter, Tasks 2-4 cross-references, Task 7 architectural revision, validation greps.
- Plugin name `jira-bug-triage` — used consistently across all tasks.
- Marketplace name `jt-bikanerwala-marketplace` — consistent in Tasks 9 and 10.
- Version bump: `0.2.0` → `0.3.0` — consistent across Task 4 (marketplace README), Task 5 (marketplace.json), Task 6 (plugin.json), Task 10 (tag).
- Sibling-skill names (`issue-investigator`, `jira-ticket-refiner`, `prose-style`) used consistently in Tasks 2 and 3.

No drift detected.

**3. Out-of-band edits caught after the PR was opened.**

The Copilot reviewer found two issues that were genuinely contradictions in the PR's own diff (Steps 1-2 of Task 8) and one cross-file inconsistency with the existing agent body (Step 3). The self-review caught one terminology drift that none of the reviewers flagged (Step 7 — `summary` vs `title` placeholder mismatch). All four are documented in Task 8 with the commit SHAs.

---

## Out of scope (re-stated from spec)

- Posting next-steps comments without explicit user request. Step 8 runs only when asked.
- Modifying any Jira field other than `summary`, `description`, and the optional comment thread.
- The remaining sibling plugin (`prose-style`). Gets its own design when its time comes.
- Non-Jira issue trackers (Linear, GitHub Issues, ServiceNow). Future enhancement.
- Automatic re-fetch detection beyond "calling agent passed a payload" / "ran standalone" branching.
- Restructuring the four reference files into a different split. Re-evaluate if any single reference grows past ~250 lines.
