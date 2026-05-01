# prose-style Skill Bundling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. This plan is partially retroactive: tasks are checked off because the work shipped on branch `feat/jira-issue-triage-v1` alongside the plan being written. The plan documents what was done so the same pattern repeats next time.

**Goal:** Bundle the `prose-style` skill into the `jira-issue-triage` plugin (nested at `plugins/jira-issue-triage/skills/prose-style/`), wire it into Phase 5 as a real skill call (replacing the inline writing-rules fallback as the primary path; the inline fallback stays as a defensive backstop), drop the skill from the marketplace Roadmap, bump the plugin version to 1.1.0, and tag the marketplace `v1.1.0`. Mirrors the bundling pattern used for `issue-investigator` (v0.2.0), `jira-ticket-refiner` (v0.3.0), and `requirements-investigator` (v1.0.0).

**Architecture:** Three-file skill (one `SKILL.md`, two `references/*.md`) ported from `~/Desktop/MyProjects/simple-windows-setup/.claude/skills/prose-style` with a small Calling Convention section added so the bundled context (Phase 5 of the agent) is documented. The skill is loaded on demand by the `jira-issue-triage` agent in Phase 5 via the `Skill` tool. Existing files get small targeted edits to reflect the new bundled status (skill is no longer a Future plugin).

**Tech Stack:** Markdown (skill body, references, READMEs), JSON (plugin manifest, marketplace manifest), `python3 + yaml` for frontmatter validation, `python3 -m json.tool` for JSON validation, `git` + `gh` for tagging and pushing.

**Working directory:** `/home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace/` (existing repo, branch `feat/jira-issue-triage-v1` cut from `main` after v1.0.0 ship).

**Source skill:** `/home/taha/Desktop/MyProjects/simple-windows-setup/.claude/skills/prose-style/` (Everett Morgan, v1.1, category: writing). Ported with a Calling Convention section and one new Jira-specific before/after example added.

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

Body has six sections: Setup (read both references first), Calling Convention (standalone vs Phase 5 of `jira-issue-triage`), Core Principle, Workflow (4-row table), Critical Rules (always active), Anti-Patterns (7 hard rules).

Frontmatter: `name: prose-style`, description starts with "Rewrites or audits prose..." and includes Jira-specific triggers ("Jira ticket text") so Phase 5 discovery is reliable. `metadata.author: Everett Morgan`, `metadata.ported_by: Taha Bikanerwala`, `metadata.version: "1.1"`, `metadata.category: writing`. Total frontmatter under 1024 chars.

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
assert 'description' in data and len(data['description']) > 50 and len(data['description']) < 1024
assert data.get('metadata', {}).get('author') == 'Everett Morgan'
assert data.get('metadata', {}).get('ported_by') == 'Taha Bikanerwala'
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

## Task 2: Update agent body — Sibling Skills section

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

Expected: each count `>= 1`. `prose-style` should have exactly 3 references (Sibling Skills row, Phase 5 wiring sentence, Phase 5 defensive fallback).

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

## Task 3: Update plugin README — Bundled skills section

**Files:**
- Modify: `plugins/jira-issue-triage/README.md`

- [x] **Step 1: Add `prose-style` to the Bundled skills table**

Table goes from three rows to four. The new fourth row reads:

```
| `prose-style` | Phase 5 (any archetype) | Writing-rule application: strips em dashes, opener phrases, LLM vocabulary, bullet sprawl. Runs after `jira-ticket-refiner` and before the user-facing preview, plus on every comment the agent drafts. | Bundled, ready to use |
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

- The skill source has `metadata.author: Everett Morgan`. Preserved that attribution and added `metadata.ported_by: Taha Bikanerwala` so credit lands in both directions.
- Added one Jira-specific before/after example in `references/examples.md` (Example 6) so the Phase 5 use case has a calibration anchor. This is the only substantive content addition over the source skill.
- Replaced em-dash separators that appeared in the source's catalog body prose (the catalog itself names em dashes as the first anti-pattern; keeping them inside the catalog made the file inconsistent with its own rule). The em dashes inside the rule-statement examples and the catalog-of-words tables remain because removing them would defeat the catalog's purpose.

---

## Out of scope

- Changing the existing fallback wording style across other Phase prose (issue-investigator, requirements-investigator, jira-ticket-refiner). They use the same "when X is not installed" framing, which is technically accurate and matches the original v0.2.0 / v0.3.0 / v1.0.0 patterns. A separate cleanup pass could reframe all four together, but doing it now would balloon the diff.
- Splitting `prose-style` into a separate plugin in the same marketplace. The user explicitly chose to bundle it, mirroring the v0.3.0 jira-ticket-refiner pattern.
- Auditing every existing markdown file in the repo for prose-style violations. The skill is the tool; running it across the existing docs is a follow-up if desired.
- Adding a `/jira-issue-triage:setup` wizard question for prose-style behavior. The skill has no per-project configuration; it always applies the same rules.
