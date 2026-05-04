# prose-style Skill Bundling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. This plan is partially retroactive: tasks are checked off because the work shipped on branch `feat/prose-style-bundling` (PR #3) alongside the plan being written. The plan documents what was done so the same pattern repeats next time.

**Goal:** Bundle the `prose-style` skill into the `jira-issue-triage` plugin (nested at `plugins/jira-issue-triage/skills/prose-style/`), wire it into the agent at two points (Phase 2.5 to clean comment and follow-up drafts before the Phase 3 preview, and Phase 5 to clean the refined title and description after `jira-ticket-refiner` runs), drop the skill from the marketplace Roadmap, bump the plugin version to 1.1.0, and tag the marketplace `v1.1.0`. Mirrors the bundling pattern used for `issue-investigator` (v0.2.0), `jira-ticket-refiner` (v0.3.0), and `requirements-investigator` (v1.0.0). The original Phase 5–only scope was extended to Phase 2.5 in PR #3 round 1 after Copilot flagged that the docs claimed "comments" but the workflow only touched description and title.

**Architecture:** Three-file skill (one `SKILL.md`, two `references/*.md`) ported from `~/Desktop/MyProjects/simple-windows-setup/.claude/skills/prose-style` with a Calling Convention section added so both bundled invocation points (Phase 2.5 draft cleaning and Phase 5 refinement cleaning) are documented. The skill is loaded on demand by the `jira-issue-triage` agent via the `Skill` tool at each phase. Existing files get small targeted edits to reflect the new bundled status (skill is no longer a Future plugin) and the dual invocation.

**Tech Stack:** Markdown (skill body, references, READMEs), JSON (plugin manifest, marketplace manifest), `python3 + yaml` for frontmatter validation, `python3 -m json.tool` for JSON validation, `git` + `gh` for tagging and pushing.

**Working directory:** `/home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace/` (existing repo, branch `feat/prose-style-bundling` cut from `origin/main` after v1.0.0 ship; opened as PR #3).

**Source skill:** `/home/taha/Desktop/MyProjects/simple-windows-setup/.claude/skills/prose-style/` (v1.1, category: writing). Ported with a Calling Convention section and one new Jira-specific before/after example added; authorship metadata reset to Taha Bikanerwala in PR #3 round 4 (see Task 12).

---

## Task 1: Write the SKILL.md and reference files

**Files:**
- Create: `plugins/jira-issue-triage/skills/prose-style/SKILL.md`
- Create: `plugins/jira-issue-triage/skills/prose-style/references/anti-patterns.md`
- Create: `plugins/jira-issue-triage/skills/prose-style/references/examples.md`

- [x] **Step 1: Create the skill directory tree**

```bash
mkdir -p /home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace/plugins/jira-issue-triage/skills/prose-style/references
```

- [x] **Step 2: Write the SKILL.md**

Body has six sections: Setup (read both references first), Calling Convention (standalone use plus the two `jira-issue-triage` invocation points: Phase 2.5 draft cleaning and Phase 5 refinement cleaning), Core Principle, Workflow (4-row table), Critical Rules (always active), Anti-Patterns (7 hard rules).

Frontmatter field order matches the other three bundled skills: `name`, `description`, `metadata`, `tools`. The description is single-quoted (the description body has seven inner double-quoted trigger phrases like `"AI slop"`; single quotes avoid the `\"` escape clutter that double quotes would force, while still satisfying the YAML-safety quoting convention used by the other three bundled skills). `metadata.author: Taha Bikanerwala`, `metadata.version: "1.1"`, `metadata.category: writing`; the extra `version` and `category` fields are intentional (they document the skill's origin and domain) even though the other three bundled skills only carry `metadata.author`. Description body length stays under 1024 chars (the Claude Code skill discoverability budget). Round 4 dropped the `ported_by` field and replaced the original `Everett Morgan` author with the current owner; see Task 12 for the rationale.

- [x] **Step 3: Write `references/anti-patterns.md`**

Catalog mirrors the source: Punctuation and Structure (em dash, spaced hyphen, parenthetical pile-ups), Opener Patterns (delete list + soft-opener list), The LLM Lexicon (22-row table + near-synonym trap), Sentence Structure (5 patterns), Conciseness Failures (5 patterns), Bullet Overuse (heuristic).

Replaced em-dash separators in source headers ("Punctuation & Structure" with `&` works fine but the body had em dashes inside tables and bullets used as parentheticals; rewrote to parens to keep the file consistent with its own anti-em-dash rule).

- [x] **Step 4: Write `references/examples.md`**

Six before/after pairs: Short Explanation, Recommendation, Slack Message, Status Update, Technical Writeup Opening, plus one new pair (Jira Ticket Description) that exercises the Phase 5 use case explicitly. Calibration Notes section at the bottom.

- [x] **Step 5: Validate frontmatter parses as YAML**

```bash
python3 -c "
import re, yaml
content = open('plugins/jira-issue-triage/skills/prose-style/SKILL.md').read()
m = re.match(r'^---\n(.*?)\n---', content, re.DOTALL)
assert m, 'no frontmatter'
data = yaml.safe_load(m.group(1))
assert data['name'] == 'prose-style'
assert 'description' in data and len(data['description']) > 50 and len(data['description']) < 1024  # description body, not total frontmatter
assert data.get('metadata', {}).get('author') == 'Taha Bikanerwala'
assert list(data.keys()) == ['name', 'description', 'metadata', 'tools'], f'unexpected key order: {list(data.keys())}'
print('frontmatter OK')
"
```

Expected: `frontmatter OK`.

- [x] **Step 6: Em-dash-as-separator scan**

```bash
grep -nE '[a-zA-Z>] — [a-zA-Z<{]' plugins/jira-issue-triage/skills/prose-style/SKILL.md plugins/jira-issue-triage/skills/prose-style/references/*.md
```

Expected: matches only inside the catalog itself (the rule statement and its example), and only inside `references/anti-patterns.md` (the em-dash-as-separator anti-pattern row). Body prose contains none.

- [x] **Step 7: LLM-vocabulary scan**

```bash
grep -niE 'delve|leverage|robust|seamlessly|comprehensive|nuanced|elevate|foster|paradigm|ecosystem|holistic|innovative|synergy|empower|facilitate' plugins/jira-issue-triage/skills/prose-style/SKILL.md plugins/jira-issue-triage/skills/prose-style/references/*.md
```

Expected: matches only inside the catalog itself (the LLM Lexicon table, the AI-slop before examples, and the Critical Rules / Anti-Patterns rules that name the words). Body prose contains none.

---

## Task 2: Update agent body (Sibling Skills section)

**Files:**
- Modify: `plugins/jira-issue-triage/agents/jira-issue-triage.md`

The current "Sibling Skills" section had three rows in Bundled and one row in Future (`prose-style`). Move `prose-style` into the Bundled bucket, drop the Future section entirely (no future plugins remain), and add a sentence reframing the per-phase fallbacks as defensive (rare runtime load failure) rather than expected (skill not installed).

- [x] **Step 1: Read the current Sibling Skills section**

```bash
grep -n "## Sibling Skills" plugins/jira-issue-triage/agents/jira-issue-triage.md
```

Note the line range (currently approximately lines 81-99).

- [x] **Step 2: Move `prose-style` from "Future" to "Bundled" and drop the Future section**

Bundled table goes from three rows to four. The new fourth row reads:

```
| Phase 5 (any archetype) | `prose-style` | Audit and rewrite the refined description, the assessment or scope comment, and any reporter-facing follow-up so the output reads like a person wrote it. Strips AI tells: em dashes, opener phrases, LLM vocabulary, bullet sprawl. |
```

The "Future separate plugins" subheading and its one-row table get removed entirely. The trailing paragraph about `Skill` tool errors gets replaced with one sentence stating that defensive fallbacks fire only on rare runtime load failures and never need user attention.

- [x] **Step 3: Phase 5 wiring is already correct**

The Phase 5 body already says "Then apply the `prose-style` skill's writing rules to the output before posting." No edit needed there. The `**Fallback (when prose-style is not installed):**` block stays as-is for the defensive-fallback case (its wording is technically accurate: "not installed" includes "load failed at runtime").

- [x] **Step 4: Confirm sibling-skill name counts**

```bash
echo "issue-investigator: $(grep -c 'issue-investigator' plugins/jira-issue-triage/agents/jira-issue-triage.md)"
echo "requirements-investigator: $(grep -c 'requirements-investigator' plugins/jira-issue-triage/agents/jira-issue-triage.md)"
echo "jira-ticket-refiner: $(grep -c 'jira-ticket-refiner' plugins/jira-issue-triage/agents/jira-issue-triage.md)"
echo "prose-style: $(grep -c 'prose-style' plugins/jira-issue-triage/agents/jira-issue-triage.md)"
```

Expected: each count `>= 1`. `prose-style` count grew across rounds: round 1 left it at 3 (Sibling Skills row, Phase 5 wiring sentence, Phase 5 defensive fallback). Round 2 added the Phase 2.5 invocation, the Phase 2.5 fallback, three "prose-style-cleaned draft" references in Phase 4a/4b/4c, and the Reporter Follow-up Policy mention, taking the count to roughly 9. Round 3 (this PR's review pass) holds it near that number; do not depend on an exact integer.

- [x] **Step 5: Re-validate frontmatter**

```bash
python3 -c "
import re, yaml
content = open('plugins/jira-issue-triage/agents/jira-issue-triage.md').read()
m = re.match(r'^---\n(.*?)\n---', content, re.DOTALL)
data = yaml.safe_load(m.group(1))
assert data['name'] == 'jira-issue-triage'
print('frontmatter OK')
"
```

Expected: `frontmatter OK`.

---

## Task 3: Update plugin README (Bundled skills section)

**Files:**
- Modify: `plugins/jira-issue-triage/README.md`

- [x] **Step 1: Add `prose-style` to the Bundled skills table**

Table goes from three rows to four. After PR #3 round 1, the row reads:

```
| `prose-style` | Phase 2.5 + Phase 5 (any archetype) | Writing-rule application: strips em dashes, opener phrases, LLM vocabulary, bullet sprawl. Phase 2.5 invocation cleans the assessment, scope, or follow-up comment draft before the user-facing preview. Phase 5 invocation cleans the refined title and description after `jira-ticket-refiner` runs. | Bundled, ready to use |
```

Sentence above the table changes from "The agent calls three skills" to "The agent calls four skills".

- [x] **Step 2: Replace the "planned as a separate plugin" paragraph with the all-bundled defensive-fallback paragraph**

Old wording was "The `prose-style` skill (writing-rule application) is planned as a separate plugin in the same marketplace. Until it ships, the agent uses an inline fallback that enforces the same writing rules and warns you once at the start of Phase 5." That is now stale. Replaced with one paragraph stating that all four bundled skills have short defensive fallbacks in the agent body that fire only on rare runtime load failures and never need user attention.

- [x] **Step 3: Em-dash and LLM-vocabulary scans**

Same as Task 1 Steps 6 and 7. Expected: no body matches.

---

## Task 4: Update marketplace README

**Files:**
- Modify: `README.md` (top-level)

- [x] **Step 1: Bump the version in the Available plugins row**

`1.0.0` → `1.1.0`. Update the description to mention the fourth bundled skill.

- [x] **Step 2: Add a "What changed in 1.1.0" section above the existing "What changed in 1.0.0" section**

Three short paragraphs: what the bundling does, no migration steps, link to this plan file.

- [x] **Step 3: Drop `prose-style` from the Roadmap table**

Roadmap section becomes "No additional plugins are planned at this time. PRs and feature requests welcome." (the table is removed because it would be empty).

---

## Task 5: Update marketplace manifest description

**Files:**
- Modify: `.claude-plugin/marketplace.json`

- [x] **Step 1: Update the plugin description**

Append `, and prose-style (writing-rule application on refined output and comments)` to the existing `"Bundles..."` clause.

- [x] **Step 2: Validate JSON**

```bash
python3 -m json.tool .claude-plugin/marketplace.json > /dev/null && echo OK
```

Expected: `OK`.

---

## Task 6: Bump plugin manifest version and description

**Files:**
- Modify: `plugins/jira-issue-triage/.claude-plugin/plugin.json`

- [x] **Step 1: Bump `version` and update `description`**

`"version": "1.0.0"` → `"version": "1.1.0"`. Description changes "three skills" to "four skills" and lists the new one.

- [x] **Step 2: Validate JSON**

```bash
python3 -m json.tool plugins/jira-issue-triage/.claude-plugin/plugin.json > /dev/null && echo OK
```

Expected: `OK`.

---

## Task 7: Local install validation (user-driven)

Validate the marketplace and plugin install correctly **before** merging the PR.

- [ ] **Step 1: Re-add the local marketplace (or remove and re-add if cached)**

> `/plugin marketplace remove jt-bikanerwala-marketplace`
> `/plugin marketplace add /home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace`

Expected: marketplace re-added with name `jt-bikanerwala-marketplace`, no kebab-case warnings, no missing-field errors.

- [ ] **Step 2: Reinstall the plugin**

> `/plugin uninstall jira-issue-triage`
> `/plugin install jira-issue-triage`

Expected: install succeeds at version `1.1.0`.

- [ ] **Step 3: Verify all four bundled skills are discoverable**

Confirm `issue-investigator`, `requirements-investigator`, `jira-ticket-refiner`, and `prose-style` all appear in the Skill list.

- [ ] **Step 4: Standalone smoke test for `prose-style`**

Paste a short paragraph of AI-sloppy text and ask for a rewrite. Confirm the skill loads both reference files before producing output.

- [ ] **Step 5: Phase 5 smoke test for `jira-issue-triage`**

Invoke the `jira-issue-triage` agent on any ticket. Confirm Phase 5 calls `jira-ticket-refiner` first, then `prose-style` runs on the output before the user-facing preview. Confirm no defensive-fallback warnings fire (those should only appear if the skill fails to load).

The validation checkboxes stay unchecked until the user confirms a real test.

---

## Task 8: Publish to GitHub

- [ ] **Step 1: Confirm gh is authenticated**

```bash
gh auth status 2>&1 | head -5
```

Expected: logged in as `TahaBikanerwala`.

- [ ] **Step 2: Push the branch and merge the PR**

After PR review and merge:

- [ ] **Step 3: Tag v1.1.0 on the merge commit**

```bash
git tag v1.1.0
git push origin v1.1.0
```

The local `v1.1.0` tag is held back during PR work because rebase or squash merges may rewrite SHAs. The tag goes on the merge commit on `main`, not on any commit that exists only on the feature branch.

- [ ] **Step 4: Public install verification**

> ```
> /plugin marketplace remove jt-bikanerwala-marketplace
> /plugin marketplace add github.com/TahaBikanerwala/jt-bikanerwala-marketplace
> /plugin install jira-issue-triage
> ```

Confirm marketplace fetches the latest `main` (v1.1.0 commits visible), plugin installs at version `1.1.0`, and all four bundled skills are available alongside the agent.

---

## Self-review

**1. Coverage.**

Walking through what the user asked for ("Add prose-style skill similar to the one at simple-windows-setup, update plan and other docs, update READMEs"):

| Asked-for item | Implementing task |
|----------------|-------------------|
| Skill files (SKILL.md + references) | Task 1 |
| Plan written | This file (Task 0 implicit) |
| Agent body update (move from Future to Bundled) | Task 2 |
| Plugin README update | Task 3 |
| Marketplace README update | Task 4 |
| Marketplace manifest update | Task 5 |
| Plugin manifest version bump | Task 6 |
| Validation | Task 1 Steps 5-7, Tasks 5-6 JSON validation, Task 7 install smoke |
| Tag and publish | Task 8 |

All asked-for items covered.

**2. Type/name consistency.**

- Skill name `prose-style` used consistently across SKILL.md frontmatter, agent body Sibling Skills row, agent body Phase 5 wiring sentence, agent body Phase 5 defensive fallback, plugin README bundled-skills row, marketplace.json description, marketplace README Available plugins row, and this plan.
- Plugin name `jira-issue-triage` used consistently across all tasks.
- Marketplace name `jt-bikanerwala-marketplace` used consistently in Tasks 7 and 8.
- Version bump: `1.0.0` → `1.1.0` consistent across plugin.json (Task 6), marketplace README Available plugins row and changelog (Task 4), and Task 8 tag.

No drift detected.

**3. Out-of-band considerations.**

- Authorship: round 1 preserved the upstream `metadata.author: Everett Morgan` and added `metadata.ported_by: Taha Bikanerwala`. Round 4 (Task 12) reset to a single `metadata.author: Taha Bikanerwala`, matching the convention used by the other three bundled skills and reflecting the current ownership of the bundled copy.
- Added one Jira-specific before/after example in `references/examples.md` (Example 6) so the Phase 5 use case has a calibration anchor. This is the only substantive content addition over the source skill.
- Replaced em-dash separators that appeared in the source's catalog body prose (the catalog itself names em dashes as the first anti-pattern; keeping them inside the catalog made the file inconsistent with its own rule). The em dashes inside the rule-statement examples and the catalog-of-words tables remain because removing them would defeat the catalog's purpose.

---

## Out of scope

- Changing the existing fallback wording style across other Phase prose (issue-investigator, requirements-investigator, jira-ticket-refiner). They use the same "when X is not installed" framing, which is technically accurate and matches the original v0.2.0 / v0.3.0 / v1.0.0 patterns. A separate cleanup pass could reframe all four together, but doing it now would balloon the diff.
- Splitting `prose-style` into a separate plugin in the same marketplace. The user explicitly chose to bundle it, mirroring the v0.3.0 jira-ticket-refiner pattern.
- Auditing every existing markdown file in the repo for prose-style violations. The skill is the tool; running it across the existing docs is a follow-up if desired.
- Adding a `/jira-issue-triage:setup` wizard question for prose-style behavior. The skill has no per-project configuration; it always applies the same rules.

---

## Task 9: Post-Copilot review (PR #3 round 1)

Copilot opened five comments on PR #3 pointing at the same root issue: the marketplace README, marketplace.json, plugin README, and the agent body's Sibling Skills row all claimed `prose-style` runs on comments and reporter follow-ups, but the workflow only invoked the skill in Phase 5 on the refined title and description. Copilot also flagged a missing `tools:` declaration in the new SKILL.md frontmatter (the other three bundled skills declare `tools` explicitly).

The user's resolution: extend the workflow rather than narrow the documentation. `prose-style` should run on comments too. The fix lands in the same PR.

- [x] **Step 1: Add `tools: Read` to the prose-style SKILL.md frontmatter**

Mirrors `jira-ticket-refiner`, `issue-investigator`, and `requirements-investigator`. The skill only needs `Read` (the two reference files); it does not call the Atlassian, Slack, or Datadog MCPs and does not run shell commands.

- [x] **Step 2: Document the two invocation points in the SKILL.md Calling Convention**

Added a 2-row table mapping each invocation point (Phase 2.5 draft cleaning, Phase 5 refinement cleaning) to its input shape and return value. The skill never posts to Jira on its own.

- [x] **Step 3: Update the agent body Sibling Skills row**

Phase column changes from `Phase 5 (any archetype)` to `Phase 2.5 + Phase 5 (any archetype)`. The purpose cell calls out both invocation points explicitly.

- [x] **Step 4: Wire `prose-style` into Phase 2.5**

> Round 2 layout, **superseded by Task 11 Step 4** (the round-3 self-review pass refactored this into 5 steps so the follow-up decision lands before drafting; the layout below is kept as audit history, not the current behavior).

Phase 2.5 step list grew from 4 steps to 6:

1. Apply follow-up criteria (unchanged).
2. Form severity recommendation (Bug/Incident) or scope summary (Feature/Task/Spike) (unchanged).
3. **NEW:** Draft the archetype-appropriate Phase 4 comment text now (markdown shape, not yet ADF), using the Phase 4a or 4b structure.
4. If no follow-up scenario applies, set `follow_up_needed = false` and skip to step 6.
5. If one applies, set `follow_up_needed = true`, identify who to tag, draft the question comment using the matching template.
6. **NEW:** Run `prose-style` on every drafted comment text from steps 3 and 5. Replace the cached draft with the cleaned version. Defensive fallback when the skill does not load: apply the Writing Rules section inline and warn the user once at Phase 3.

- [x] **Step 5: Tighten Phase 4a, 4b, 4c language**

Each phase now states explicitly that it posts the prose-style-cleaned draft from Phase 2.5 and does not re-draft or re-style. Removes the implicit drafting that was happening at Phase 4 and concentrates all drafting in Phase 2.5.

- [x] **Step 6: Update Reporter Follow-up Policy template rules**

The "Apply the Writing Rules at the bottom" rule changes to: Phase 2.5 runs the `prose-style` skill on the filled-in template before the Phase 3 preview, with the Writing Rules section as the defensive fallback when the skill does not load.

- [x] **Step 7: Update plugin README and marketplace README phase labels**

`Phase 5 (any archetype)` → `Phase 2.5 + Phase 5 (any archetype)` in the bundled-skills row of `plugins/jira-issue-triage/README.md`. The marketplace README's "What changed in 1.1.0" paragraph now names both invocation points instead of saying "Phase 5 calls a real skill". The marketplace.json description and the marketplace README Available plugins row already said "refined output and comments" and stay as-is (now accurate).

- [x] **Step 8: Re-run validations**

```bash
python3 -c "
import re, yaml
content = open('plugins/jira-issue-triage/skills/prose-style/SKILL.md').read()
m = re.match(r'^---\n(.*?)\n---', content, re.DOTALL)
data = yaml.safe_load(m.group(1))
assert data['name'] == 'prose-style'
assert data['tools'] == 'Read'
print('frontmatter OK')
"
python3 -m json.tool .claude-plugin/marketplace.json > /dev/null && echo OK
python3 -m json.tool plugins/jira-issue-triage/.claude-plugin/plugin.json > /dev/null && echo OK
```

Expected: all three print success.

- [x] **Step 9: Commit and push**

One commit on top of the existing two:

```bash
git add -A
git commit -m "fix(prose-style): wire skill into Phase 2.5 comment drafts and add tools field"
git push
```

- [x] **Step 10: Reply to each Copilot comment**

Five replies on PR #3, each pointing at the commit SHA and the file changes that resolve the comment. Mark resolved through the GitHub UI after replying.

---

## Task 10: Post-Copilot review (PR #3 round 2)

Copilot opened one comment after round 1 noting that the new `prose-style/SKILL.md` was missing a top-level H1 title and a one-paragraph overview, which made it inconsistent with the other three bundled skills.

- [x] **Step 1: Add an H1 title and overview to SKILL.md**

The H1 reads `# Prose Style`. The overview paragraph immediately under it states what the skill does (rewrite or audit) and what it never does (invent content), so an agent skimming the file can decide whether to load the references.

- [x] **Step 2: Commit and push, reply, resolve**

One commit: `fix(prose-style): add H1 title and one-paragraph overview` (SHA `b86cea3`). Reply on the Copilot comment, resolve the thread.

---

## Task 11: Post-Copilot review (PR #3 round 3 + self-audit)

Copilot opened one more comment flagging a contradiction: Phase 3 said it would display "the full ADF body, rendered for review" but Phase 2.5 step 6 said the cached draft stays in markdown until Phase 4a/4b/4c builds ADF. The user asked for a thorough self-review pass on top of the Copilot fix to avoid further round-trips. The pass found nine issues; this task documents what shipped.

- [x] **Step 1: Fix the Phase 3 ADF/markdown contradiction (Copilot's open comment)**

Phase 3's Bug/Incident bullet, Feature/Task/Spike bullet, and follow-up bullet all said "the full ADF body, rendered for review". Rewritten to "the prose-style-cleaned markdown draft of the {comment kind} from Phase 2.5, shown inline as plain markdown. Phase 4{a,b,c} will convert this same text to ADF on post." Now consistent with Phase 2.5 step 5.

- [x] **Step 2: Fix the Phase 9 wrong-phase reference**

Phase 9 step 1 follow-up bullet said "Phase 4b already assigned the ticket". The actual assignee write happens in Phase 4c step 3. Replaced with "Phase 4c already assigned the ticket to the tagged person".

- [x] **Step 3: Fix the "Rules for all three templates" miscount**

Reporter Follow-up Policy has four templates (Missing data, Clarification, Fix verification, Relevance check). The header read "Rules for all three templates"; corrected to "Rules for all four templates".

- [x] **Step 4: Restructure Phase 2.5 so only the comment that will actually be posted is drafted**

Round 1 of Phase 2.5 wiring drafted the Phase 4a or 4b assessment/scope comment in step 3, then drafted the follow-up question in step 5 if a follow-up scenario applied. On the follow-up path, the assessment or scope draft was drafted, prose-style-cleaned, and then never used (Phase 4a and 4b are skipped on that path). The new step list moves the follow-up decision into step 3 (before any drafting), so step 4 drafts only the comment that the matching Phase 4a, 4b, or 4c will post. Step 5 runs `prose-style` on that one draft. The total step count drops from 6 to 5 and the wasted-work edge case is gone.

- [x] **Step 5: Make the Phase 5 prose-style invocation explicit**

Phase 5 said "Then apply the `prose-style` skill's writing rules to the output before posting", which read like inlined rules, not a skill call. Rewrote to "invoke `prose-style` via the `Skill` tool, passing the refiner output (title + description), to clean writing-style anti-patterns" and added step 2 in the steps list ("Invoke the `prose-style` skill via the `Skill` tool, passing the refined title and description from step 1 as input"). The remaining steps renumber from 4 to 5.

- [x] **Step 6: Make the Phase 2.5 defensive fallback list explicit**

Phase 5's defensive fallback enumerates eight rules (no em dashes, no spaced hyphens, no LLM vocabulary with the full word list, lead with the answer, no opener phrases, no trailing summaries, prose over bullets). Phase 2.5's fallback only had a parenthetical with five rules. Phase 2.5 now lists the same eight rules so behavior is symmetric whether the skill fails to load at Phase 2.5 or Phase 5.

- [x] **Step 7: Update plugin README workflow phases table**

Phase 2.5 row added the drafting + prose-style step. Phase 4a/4b/4c rows now state they convert the Phase 2.5 cleaned draft to ADF (rather than implying they re-draft). Phase 5 row added the prose-style step between refiner and preview.

- [x] **Step 8: Clean the reporter follow-up Missing data + Clarification templates**

Both templates opened with "Thanks for filing this." plus a soft setup ("To triage it properly we need one more detail" / "Before we investigate further, can you confirm"). The agent's own Reporter Follow-up rules say "Lead with the request or the evidence. No opener phrases." prose-style would catch and rewrite these at runtime. Templates now lead with the question; the rationale follows.

- [x] **Step 9: Add spaced hyphens to prose-style Core Principle**

Core Principle listed em dashes as the only punctuation tell. Critical Rules also forbids spaced hyphens as separators. Core Principle updated to mention both, so the principle and the rule list line up.

- [x] **Step 10: Update plan Architecture, Goal, branch name, and stale row text**

Plan Goal now describes both invocation points instead of "wire it into Phase 5 as a real skill call". Architecture mirrors that. Working directory line updated from branch `feat/jira-issue-triage-v1` to `feat/prose-style-bundling` (PR #3). Task 2 step 4 count assertion replaced with the per-round count history. Task 3 step 1 row text updated to the round-1 wording (`Phase 2.5 + Phase 5`).

- [x] **Step 11: Re-run validations**

Same three checks as Task 9 step 8 (frontmatter parse, both JSONs valid). Expected: all three print success.

- [x] **Step 12: Commit, push, reply, resolve (round 3 close-out)**

One commit on top of `b86cea3`. Reply to the open Copilot comment pointing at the new commit SHA and naming the contradiction now resolved. Resolve the thread through the GitHub UI. (Sub-step is named "round 3 close-out" so it does not collide with the top-level Task 12 below.)

---

## Task 12: Post-Copilot review (PR #3 round 4 + authorship reset)

Two changes land together in this round. Copilot opened one comment noting that the new `prose-style/SKILL.md` was the only one of the four bundled skills with an unquoted `description:` field; the other three (`issue-investigator`, `jira-ticket-refiner`, `requirements-investigator`) all double-quote their descriptions. Independently, the user reset the prose-style authorship from `Everett Morgan` plus `ported_by: Taha Bikanerwala` to a single `author: Taha Bikanerwala`, matching the convention of the other three bundled skills. Both changes ship in the same commit so the SKILL.md frontmatter pass is one diff hunk.

- [x] **Step 1: Quote the description field**

Single quotes, not double. The description body has seven inner double-quoted trigger phrases (`"AI slop"`, `"sounds generated"`, `"too formal"`, `"write like a human"`, `"fix the writing"`, `"rewrite this"`, `"clean up the prose"`). Double-quoting the outer string would force `\"` escapes on every one, which hurts readability. Single-quoted YAML scalars are still "quoted" for the parser's purposes; the YAML safety concern Copilot raised (accidental `:` or `#` interpretation, parser edge cases) applies equally to either quote style. The other three skills happen to use double quotes only because their description bodies do not contain inner double quotes.

- [x] **Step 2: Reset authorship metadata**

The user dropped `ported_by` and changed `author` from `Everett Morgan` to `Taha Bikanerwala`. The new metadata block now has three fields (`author`, `version`, `category`); the other three bundled skills only have `author`. The extra `version` and `category` fields stay because they convey real information about the skill's origin and domain, even if they are not standardized across the marketplace yet.

- [x] **Step 3: Update the plan to match**

Source skill line: dropped `Everett Morgan` from the parenthetical and added a note pointing at this task. Task 1 Step 2 frontmatter description: updated to single-quoted, single-author, with one sentence on why single quotes are right here. Task 1 Step 5 frontmatter validator: assertion now checks `author == 'Taha Bikanerwala'` and the `ported_by` assertion is gone. Self-review section 3 first bullet: rewrote to explain the round-1-vs-round-4 history of authorship instead of the round-1-only "preserved attribution" framing.

- [x] **Step 4: Re-run validations**

```bash
python3 -c "
import re, yaml
content = open('plugins/jira-issue-triage/skills/prose-style/SKILL.md').read()
m = re.match(r'^---\n(.*?)\n---', content, re.DOTALL)
data = yaml.safe_load(m.group(1))
assert data['name'] == 'prose-style'
assert data['tools'] == 'Read'
assert data.get('metadata', {}).get('author') == 'Taha Bikanerwala'
assert 'ported_by' not in data.get('metadata', {})
assert 'AI slop' in data['description']
print('frontmatter OK')
"
python3 -m json.tool .claude-plugin/marketplace.json > /dev/null && echo OK
python3 -m json.tool plugins/jira-issue-triage/.claude-plugin/plugin.json > /dev/null && echo OK
```

Expected: all three print success.

- [x] **Step 5: Commit, push, reply, resolve**

One commit covering the SKILL.md frontmatter and the four plan-file edits. Reply on the Copilot comment with the new SHA and the single-quote rationale. Resolve the thread.
