# jira-issue-triage v1.0.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Take the v0.3.0 `jira-bug-triage` plugin (one bug-only agent + two bundled skills) and turn it into a v1.0.0 `jira-issue-triage` plugin that triages any Jira archetype (Bug, Incident, Feature, Task, Spike). Rename the agent from `bug-triage-agent` to `jira-issue-triage`. Add a new bundled `requirements-investigator` skill for non-bug archetypes. Add a `/jira-issue-triage:setup` slash command and an in-agent first-run wizard fallback.

**Architecture:** Generic core for all archetypes (fetch, assign, transition, investigate, refine, link, label, DM). Bug/Incident-specific phases (severity comment + due date + escalation) gate on archetype. Feature/Task/Spike-specific Phase 4b (scope summary comment) gates on archetype. Two investigation skills (`issue-investigator` for Bug/Incident, `requirements-investigator` for Feature/Task/Spike). Setup wizard ships as both a slash command and an inline agent-body fallback.

**Tech Stack:** Markdown (skill bodies, agent body, command body, READMEs), JSON (plugin manifest, marketplace manifest, config file), `python3 + yaml` for frontmatter validation, `python3 -m json.tool` for JSON validation, `git` + `gh` for branch and PR work.

**Working directory:** `/home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace/` (existing repo, branch `feat/jira-issue-triage-v1` cut from `feat/jira-ticket-refiner` because the v0.3.0 PR is still open and the v1.0.0 work stacks on top).

**Source spec:** [docs/superpowers/specs/2026-05-01-jira-issue-triage-design.md](../specs/2026-05-01-jira-issue-triage-design.md).

---

## Task 1: Rename plugin folder and bump manifests

**Files:**
- Move: `plugins/jira-bug-triage/` → `plugins/jira-issue-triage/`
- Move: `plugins/jira-issue-triage/agents/bug-triage-agent.md` → `plugins/jira-issue-triage/agents/jira-issue-triage.md`
- Modify: `plugins/jira-issue-triage/.claude-plugin/plugin.json`
- Modify: `.claude-plugin/marketplace.json`

- [ ] **Step 1: Rename plugin folder**

```bash
git mv plugins/jira-bug-triage plugins/jira-issue-triage
```

Expected: git stages all the moves. No content changes yet.

- [ ] **Step 2: Rename the agent file**

```bash
git mv plugins/jira-issue-triage/agents/bug-triage-agent.md plugins/jira-issue-triage/agents/jira-issue-triage.md
```

- [ ] **Step 3: Update plugin manifest**

Replace `plugins/jira-issue-triage/.claude-plugin/plugin.json` with:

```json
{
  "name": "jira-issue-triage",
  "version": "1.0.0",
  "description": "End-to-end Jira issue triage subagent across all archetypes (Bug, Incident, Feature, Task, Spike). Bundles three skills (issue-investigator for Bug/Incident, requirements-investigator for Feature/Task/Spike, jira-ticket-refiner for any archetype) and ships a /jira-issue-triage:setup wizard.",
  "author": {
    "name": "Taha Bikanerwala",
    "url": "https://github.com/TahaBikanerwala"
  },
  "homepage": "https://github.com/TahaBikanerwala/jt-bikanerwala-marketplace",
  "repository": "https://github.com/TahaBikanerwala/jt-bikanerwala-marketplace",
  "license": "MIT",
  "keywords": ["jira", "issue", "triage", "bug", "feature", "spike", "subagent", "atlassian"]
}
```

- [ ] **Step 4: Update marketplace manifest**

Replace `.claude-plugin/marketplace.json` with:

```json
{
  "name": "jt-bikanerwala-marketplace",
  "description": "Taha Bikanerwala's Claude Code plugins.",
  "owner": {
    "name": "Taha Bikanerwala",
    "url": "https://github.com/TahaBikanerwala"
  },
  "plugins": [
    {
      "name": "jira-issue-triage",
      "source": "./plugins/jira-issue-triage",
      "description": "End-to-end Jira issue triage subagent across all archetypes. Bundles issue-investigator (Bug/Incident), requirements-investigator (Feature/Task/Spike), and jira-ticket-refiner (any archetype). Ships a /jira-issue-triage:setup wizard."
    }
  ]
}
```

- [ ] **Step 5: Validate JSON**

```bash
python3 -m json.tool plugins/jira-issue-triage/.claude-plugin/plugin.json > /dev/null && echo plugin OK
python3 -m json.tool .claude-plugin/marketplace.json > /dev/null && echo marketplace OK
```

Expected: `plugin OK` and `marketplace OK`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(jira-issue-triage)!: rename plugin and bump to 1.0.0

Renames plugins/jira-bug-triage to plugins/jira-issue-triage and
the agent file from bug-triage-agent.md to jira-issue-triage.md.
Updates marketplace.json source path and plugin manifest name,
version, description, and keywords. No body changes yet (those
land in the next tasks)."
```

---

## Task 2: Rewrite the agent body for archetype awareness

**Files:**
- Modify: `plugins/jira-issue-triage/agents/jira-issue-triage.md` (full rewrite)

- [ ] **Step 1: Update frontmatter**

Replace the frontmatter block at the top of the file with:

```yaml
---
name: jira-issue-triage
description: "Triages a Jira issue end-to-end across all archetypes (Bug, Incident, Feature, Task, Spike): assigns it, transitions to investigating, runs the matching investigation skill, refines the title and description, posts an archetype-appropriate assessment comment, and DMs you a summary. Use when a developer pastes a Jira ticket link and says triage, investigate, pick up, or process."
tools: Skill, Read, Write, Bash, mcp__plugin_atlassian_atlassian__getJiraIssue, mcp__plugin_atlassian_atlassian__editJiraIssue, mcp__plugin_atlassian_atlassian__addCommentToJiraIssue, mcp__plugin_atlassian_atlassian__transitionJiraIssue, mcp__plugin_atlassian_atlassian__getTransitionsForJiraIssue, mcp__plugin_atlassian_atlassian__searchJiraIssuesUsingJql, mcp__plugin_atlassian_atlassian__searchConfluenceUsingCql, mcp__plugin_atlassian_atlassian__lookupJiraAccountId, mcp__plugin_atlassian_atlassian__getAccessibleAtlassianResources, mcp__plugin_atlassian_atlassian__atlassianUserInfo, mcp__plugin_atlassian_atlassian__getJiraIssueTypeMetaWithFields, mcp__plugin_atlassian_atlassian__createIssueLink, mcp__plugin_slack_slack__slack_search_users, mcp__plugin_slack_slack__slack_search_public_and_private, mcp__plugin_slack_slack__slack_read_thread, mcp__plugin_slack_slack__slack_send_message, mcp__plugin_slack_slack__slack_read_user_profile, mcp__datadog__search_datadog_logs
---
```

The tool list adds `Write` (needed for the inline wizard to write the config file). All other tools unchanged.

- [ ] **Step 2: Update opening paragraph**

Change the opening from "Process a Jira bug ticket" to:

> Process a Jira ticket through the full triage workflow regardless of archetype: detect whether it is a Bug, Incident, Feature, Task, or Spike; investigate using the matching skill; refine the title and description; post an archetype-appropriate assessment comment; and update all metadata fields. The workflow runs a generic core for every archetype and gates a small number of phases (severity assessment, due date, escalation) on Bug/Incident vs Feature/Task/Spike.

- [ ] **Step 3: Add Configuration step in Prerequisites**

After the existing Identity step, add a new Configuration step (full text in design spec section "Agent first-run wizard fallback"). The Configuration step:
1. Reads `.claude/jira-issue-triage.config.json` if present.
2. Falls back to `.claude/jira-bug-triage.config.json` if only the legacy path exists; warns once per session.
3. If neither file exists, pauses and offers (a) run setup command, (b) inline wizard, (c) defaults.
4. Inline wizard walks the same 8 questions as the slash command and writes the config via the `Write` tool.

The full text to insert is:

```markdown
### Configuration

1. Look for `.claude/jira-issue-triage.config.json` in the project root. If present, parse it and merge with the defaults below.
2. Fall back to `.claude/jira-bug-triage.config.json` (the legacy path used by jira-bug-triage v0.3.0 and earlier). If only the legacy file exists, read it AND warn the user once per session: "Found legacy config at .claude/jira-bug-triage.config.json. Consider renaming to .claude/jira-issue-triage.config.json (the agent will keep reading both for now; legacy support is removed in 2.0.0)."
3. If neither file exists, pause before Phase 0 and ask:

   > I don't see a configuration file. Choose how to proceed:
   > (a) Run /jira-issue-triage:setup to walk through the setup wizard, then re-paste the ticket.
   > (b) Let me ask the same questions inline before triaging this ticket.
   > (c) Use defaults (sensible for most teams: 3-tier severity, no escalation, infer project key from URL).

4. If (a), exit cleanly. If (b), inline-walk the 8 wizard questions (identical to the body of `/jira-issue-triage:setup`; see commands/setup.md for the canonical question list) and write the config via the `Write` tool with `path: ".claude/jira-issue-triage.config.json"`. If (c), proceed with defaults and append a one-line note in the Phase 10 DM: "Triaged with default config; run /jira-issue-triage:setup any time to customize."

The default config (used as the merge target for parsed values, and as-is when the user picks option c):

[the existing default config JSON block stays here, schema extended with the four new optional fields]
```

- [ ] **Step 4: Update default config JSON**

The default config block in Prerequisites currently shows the v0.3.0 schema. Extend it to:

```json
{
  "project_key": null,
  "severity_field_name": null,
  "triaged_label": "triaged",
  "skip_labels": [],
  "transitions": {
    "investigating": "Under Investigation",
    "waiting_reply": "Waiting for Reply",
    "backlog": "Backlog"
  },
  "severity_scheme": {
    "Sev-1": { "due_offset_days": 7,  "escalate_immediately": true  },
    "Sev-2": { "due_offset_days": 14, "escalate_immediately": false },
    "Sev-3": { "due_offset_days": 90, "escalate_immediately": false }
  },
  "escalation": {
    "slack_channel": null,
    "primary_contact": null,
    "fallback_contact": null
  },
  "scope_summary_field_name": null,
  "sprint_field_name": null,
  "story_points_field_name": null,
  "non_bug_transitions": {
    "ready": null
  }
}
```

- [ ] **Step 5: Update Sibling Skills section**

Update the bundled-skills table to three rows:

```markdown
| Phase | Skill name | Purpose |
|-------|-----------|---------|
| Phase 1 (Bug/Incident) | `issue-investigator` | Search Slack, the ticket and related Jira/Confluence pages, Datadog, then code if needed. Produces an evidence-tagged report in the 6-section bug-archetype template. |
| Phase 1 (Feature/Task/Spike) | `requirements-investigator` | Search Slack and Confluence for prior decisions, read linked design and product docs, search related Jira tickets. Produces an evidence-tagged report in the matching archetype template (Feature, Task, or Spike). |
| Phase 5 (any archetype) | `jira-ticket-refiner` | Restructure the ticket description into a clear, self-contained document. Updates the title and description via the Atlassian MCP and never deletes original content. |
```

The future-plugins table shrinks to one row (`prose-style` only).

- [ ] **Step 6: Add archetype detection in Phase 0**

After the existing fetch step in Phase 0, add a new sub-step:

```markdown
7. **Detect archetype.** Map the issue type field from the fetched ticket to one of: `Bug`, `Incident`, `Feature`, `Task`, `Spike`. Use the table below. If issue type and content disagree (e.g., issue type `Bug` but content is acceptance criteria and a Figma link), trust the content. Cache the archetype for downstream phase gating.

| Jira issue type | Archetype |
|-----------------|-----------|
| Bug, Defect | Bug |
| Incident, Outage, SEV-tagged tickets | Incident |
| Story, Feature, Enhancement, New Feature | Feature |
| Task, Sub-task, Chore, Tech Debt | Task |
| Spike, Research, Investigation | Spike |

Tickets whose issue type does not match any row default to the closest match by content. When ambiguous, pick `Task` as the safe default.
```

- [ ] **Step 7: Branch Phase 1 by archetype**

Replace the existing Phase 1 body with:

```markdown
### Phase 1: Investigate

Branch on the archetype detected in Phase 0:

- **Bug or Incident:** Invoke the `issue-investigator` skill via the `Skill` tool.
- **Feature, Task, or Spike:** Invoke the `requirements-investigator` skill via the `Skill` tool.

Both skills follow the same calling convention (non-interactive, evidence-tagged output, read-only).

**Fallback (when the matching skill is not installed):** [existing fallback procedure for issue-investigator stays here as the Bug/Incident fallback. For Feature/Task/Spike, fall back to: read the ticket carefully, search Slack with 2-3 queries, search Confluence for product briefs and design docs, summarize findings in plain prose. Tag every finding with the same evidence levels.]

Warn the user once at the start of this phase if you used a fallback.
```

- [ ] **Step 8: Adjust Phase 2 for archetype**

Add an "Applies to:" line at the top of Phase 2:

```markdown
### Phase 2: Search Datadog

**Applies to:** Bug, Incident
**Skipped on:** Feature, Task, Spike (silently)

[existing body unchanged]
```

- [ ] **Step 9: Split Phase 4 into 4a/4b/4c**

Rename the existing "Phase 4: Severity Assessment Comment" to "Phase 4a: Severity Assessment Comment" and add an "Applies to:" line. Insert a new Phase 4b for non-bug archetypes between 4a and the existing Phase 4b (which gets renamed to 4c).

```markdown
### Phase 4a: Severity Assessment Comment

**Applies to:** Bug, Incident
**Skipped on:** Feature/Task/Spike, follow_up_needed=true

[existing Phase 4 body, unchanged]

### Phase 4b: Scope Summary Comment

**Applies to:** Feature, Task, Spike
**Skipped on:** Bug/Incident, follow_up_needed=true

After the user approved the comment text at Phase 3, post the previewed comment via `addCommentToJiraIssue` with `contentFormat: "adf"`. The comment summarizes what is in scope based on the investigation findings, named in archetype-appropriate terms.

Logical structure (build it as ADF nodes; the structure below shows the rendered intent):

> **Scope Summary:**
>
> {2-3 sentences naming what this ticket covers.}
>
> **For Feature:** Requirements found, design refs, open questions.
> **For Task:** Definition of done, why-now, risks.
> **For Spike:** Question to answer, what's already known, what's unknown.
>
> **Evidence from this ticket:**
>
> - "{direct quote or paraphrase from the ticket, comments, or linked tickets}"
> - "{another piece of evidence}"
>
> **Open questions:**
>
> - {one named open question with whom it's blocked on, if anyone}

Rules:
- Ground every claim in evidence from the ticket, comments, or linked tickets. Use direct quotes where possible.
- Lead with what is in scope, not background or history.
- Keep "Open questions" to the genuine unknowns. Do not pad with "we should also..." prescriptive items.
- Do not assign story points or sprint placement here. Those go in Phase 6 if `sprint_field_name` or `story_points_field_name` are configured.

ADF construction follows the same node patterns as Phase 4a (paragraph + strong text marks for headings, bulletList + listItem for bullets, link marks for ticket keys). Pass the JSON-stringified ADF as `commentBody`.

Skip this phase entirely when archetype is Bug or Incident, or when `follow_up_needed = true`.

### Phase 4c: Post Follow-up Question (Alternative Path)

**Applies to:** any archetype with follow_up_needed=true
**Skipped on:** follow_up_needed=false

[existing Phase 4b body, unchanged except heading rename]
```

- [ ] **Step 10: Gate Phase 6 on archetype**

Replace the existing Phase 6 body with:

```markdown
### Phase 6: Set Severity, Due Date, or Sprint Placement

**Applies to:** see archetype branches below
**Skipped on:** follow_up_needed=true (always)

**Bug or Incident path:**

[existing Phase 6 body, unchanged]

**Feature, Task, or Spike path:**

1. Skip the severity field and due date entirely. Severity is a Bug/Incident concept.
2. If `sprint_field_name` is configured in config:
   - Look up the active sprint for the configured `project_key` (or the inferred project key from the ticket URL) via `searchJiraIssuesUsingJql` with `sprint in openSprints() AND project = <key>` to find a representative sprint ID.
   - Set the ticket's sprint field to the active sprint ID via `editJiraIssue`.
3. If `story_points_field_name` is configured AND the user provided an estimate during the Phase 3 confirmation gate, write the estimate to the configured field via `editJiraIssue`.
4. If neither `sprint_field_name` nor `story_points_field_name` is configured, skip Phase 6 silently for non-bug archetypes.

Skip this phase entirely when `follow_up_needed = true`. Severity, due date, sprint placement, and story points all wait until the reporter's reply comes in and the ticket is re-triaged.
```

- [ ] **Step 11: Adjust Phase 9 for archetype**

Replace the Phase 9 transition rule:

```markdown
2. **Transition:** by archetype, severity, and path:
   - **Bug/Incident standard path:** if the post-Phase-6 severity is the lowest level in `severity_scheme` (default `Sev-3`), transition to `backlog`. All other levels stay in `investigating` for the owning team to pick up promptly.
   - **Feature/Task/Spike standard path:** if `non_bug_transitions.ready` is configured, transition to that. Otherwise, stay in `investigating` for the owning team to pick up.
   - **Follow-up path (any archetype):** transition to `waiting_reply`. Use `getTransitionsForJiraIssue` to find the transition ID. Do not send to backlog; the ticket should stay visible so the reply is seen.
```

- [ ] **Step 12: Adjust Phase 10 outcome strings**

Add new outcome rows to the Phase 10 message table:

```markdown
| Feature/Task/Spike triaged (no follow-up) | `Triaged, staying in {investigating transition} (Feature/Task/Spike)` |
| Feature/Task/Spike triaged with sprint placement | `Triaged and added to active sprint, staying in {investigating transition}` |
| Default-config first run | (append) `Triaged with default config; run /jira-issue-triage:setup any time to customize.` |
```

- [ ] **Step 13: Update Severity Criteria scope note**

At the top of the Severity Criteria section, prepend:

> **Applies to:** Bug, Incident only. Skipped for Feature/Task/Spike (severity is not used for those archetypes; estimation and sprint placement live in Phase 6 instead).

- [ ] **Step 14: Validate frontmatter**

```bash
python3 -c "
import re, yaml
content = open('plugins/jira-issue-triage/agents/jira-issue-triage.md').read()
m = re.match(r'^---\n(.*?)\n---', content, re.DOTALL)
assert m, 'no frontmatter'
data = yaml.safe_load(m.group(1))
assert data['name'] == 'jira-issue-triage'
assert 'description' in data and 50 < len(data['description']) < 1024
assert 'tools' in data and len(data['tools']) > 0
print('frontmatter OK')
"
```

Expected: `frontmatter OK`.

- [ ] **Step 15: Em-dash and LLM-vocab scans**

```bash
grep -nE '[a-zA-Z>] — [a-zA-Z<{]' plugins/jira-issue-triage/agents/jira-issue-triage.md
grep -niE 'delve|leverage|robust|seamlessly|comprehensive|nuanced|elevate|foster|paradigm|ecosystem|holistic|innovative|synergy|empower|facilitate' plugins/jira-issue-triage/agents/jira-issue-triage.md
```

Expected: no em-dash separator matches in body prose. LLM-vocab matches only in the rule statements at the bottom of the file.

- [ ] **Step 16: Commit**

```bash
git add plugins/jira-issue-triage/agents/jira-issue-triage.md
git commit -m "feat(jira-issue-triage): rewrite agent body for archetype-aware workflow

- Frontmatter: name jira-issue-triage, description covers all 5 archetypes, Write tool added
- Configuration step in Prerequisites with first-run wizard fallback (3 options: setup command, inline wizard, defaults)
- Reads new and legacy config file paths
- Default config schema extended with 4 optional fields for non-bug archetypes
- Sibling Skills updated to 3 bundled rows
- Phase 0 detects archetype after fetch
- Phase 1 branches: issue-investigator (Bug/Incident) or requirements-investigator (Feature/Task/Spike)
- Phase 2 (Datadog) gated to Bug/Incident
- Phase 4 split into 4a (Severity, Bug/Incident), 4b (Scope Summary, Feature/Task/Spike, new), 4c (Follow-up, any archetype)
- Phase 6 split: Bug/Incident keeps severity+due-date; Feature/Task/Spike does optional sprint placement
- Phase 9 transition rules archetype-aware
- Phase 10 outcome strings extended for non-bug archetypes
- Severity Criteria scoped to Bug/Incident"
```

---

## Task 3: Create the setup slash command

**Files:**
- Create: `plugins/jira-issue-triage/commands/setup.md`

- [ ] **Step 1: Create the commands directory**

```bash
mkdir -p plugins/jira-issue-triage/commands
```

- [ ] **Step 2: Write the slash command file**

Create `plugins/jira-issue-triage/commands/setup.md` with:

```markdown
---
description: First-time setup wizard for jira-issue-triage. Walks through configuration questions and writes .claude/jira-issue-triage.config.json.
argument-hint: (no args)
---

# jira-issue-triage Setup Wizard

Walks through 8 configuration questions and writes the result to `.claude/jira-issue-triage.config.json`. Re-running it on an existing config offers to overwrite or keep current.

## Steps

1. **Check for existing config.** Read `.claude/jira-issue-triage.config.json` if present. Also check `.claude/jira-bug-triage.config.json` (legacy path).
   - If a new-path config exists: show the current contents and ask `Overwrite the existing config? (yes / no)`. If no, exit cleanly.
   - If only the legacy file exists: show it, note that the wizard will write the new path and the legacy file can be deleted afterwards.
   - If neither: proceed.

2. **Auto-discover defaults.** Call `getAccessibleAtlassianResources` to get the cloudId and the user's accessible Atlassian sites. Call `atlassianUserInfo` to get the user's account info. Use these to:
   - Suggest the project key based on the user's most recently active project (if discoverable). Default fallback: "infer from URL".
   - Pre-populate the severity field name auto-discovery order (`Severity Level` → `Severity` → `Bug Severity` → `priority`).

3. **Walk through the 8 wizard questions, one at a time.** Use `AskQuestion` for multiple-choice answers. Use free-text prompts for names, emails, and labels.

   ### Q1: Project key
   Ask: `Default Jira project key? (Type a key like "ENG" or "BUG", or type "infer" to derive it from each ticket URL.)`
   Default: "infer".

   ### Q2: Severity field name
   Ask via `AskQuestion`: `Which Jira field holds the severity for bug tickets?`
   Options: `Severity Level (recommended default)`, `Severity`, `Bug Severity`, `priority (use the native Jira priority field)`, `Custom (I'll type the name)`.
   On "Custom", ask for the field name as free text.

   ### Q3: Triaged label
   Ask: `Label to add to tickets after triage? (Default: triaged)`
   Default: `triaged`.

   ### Q4: Skip labels
   Ask: `Comma-separated list of label prefixes that should skip triage entirely (e.g., "applause,external-vendor"). Press Enter for none.`
   Default: empty list.

   ### Q5: Transition names
   Ask three free-text prompts in sequence:
   - `Transition name for "investigating"? (Default: Under Investigation)`
   - `Transition name for "waiting for reply"? (Default: Waiting for Reply)`
   - `Transition name for "backlog"? (Default: Backlog)`

   ### Q6: Severity scheme
   Ask via `AskQuestion`: `Which severity scheme do you want to use?`
   Options: `3-tier (Sev-1, Sev-2, Sev-3) with 7/14/90 day SLAs (recommended default)`, `5-tier (Sev-1, Sev-1.5, Sev-2, Sev-2.5, Sev-3)`, `Custom (I'll specify each level)`.
   On "Custom", walk through each level: name, due_offset_days, escalate_immediately (yes/no).

   ### Q7: Escalation
   Ask three sub-prompts:
   - `Slack channel for high-severity escalation pings? (e.g., "#bug-triage". Press Enter for none.)`
   - `Primary escalation contact name and email? (Format: "Alice Kumar <alice@example.com>". Press Enter for none.)`
   - `Fallback escalation contact name and email? (Same format. Press Enter for none.)`

   ### Q8: Save?
   Show the assembled config as pretty-printed JSON. Ask via `AskQuestion`: `Save this config to .claude/jira-issue-triage.config.json?`
   Options: `Yes, write the file`, `No, discard and exit`, `Edit a specific question (which one?)`.
   On "Edit", re-prompt the named question and loop back to Q8.

4. **Write the config file** via the `Write` tool with `path: ".claude/jira-issue-triage.config.json"`. Pretty-print with 2-space indent and sort keys alphabetically at the top level for stable diffs.

5. **Confirmation message:** `Wrote .claude/jira-issue-triage.config.json. You can re-run /jira-issue-triage:setup any time to update.`

## Notes

- The four advanced fields (`scope_summary_field_name`, `sprint_field_name`, `story_points_field_name`, `non_bug_transitions`) are NOT asked here. They default to null/empty in the written config and can be added by editing the file directly. See the plugin README for documentation.
- This wizard never modifies Jira. Read-only auto-discovery only.
- If `getAccessibleAtlassianResources` or `atlassianUserInfo` fails, proceed with the static defaults and note the auto-discovery failure to the user.
```

- [ ] **Step 3: Validate frontmatter**

```bash
python3 -c "
import re, yaml
content = open('plugins/jira-issue-triage/commands/setup.md').read()
m = re.match(r'^---\n(.*?)\n---', content, re.DOTALL)
assert m, 'no frontmatter'
data = yaml.safe_load(m.group(1))
assert 'description' in data and len(data['description']) > 20
print('frontmatter OK')
"
```

Expected: `frontmatter OK`.

- [ ] **Step 4: Em-dash and LLM-vocab scans**

```bash
grep -nE '[a-zA-Z>] — [a-zA-Z<{]' plugins/jira-issue-triage/commands/setup.md
grep -niE 'delve|leverage|robust|seamlessly|comprehensive|nuanced|elevate|foster|paradigm|ecosystem|holistic|innovative|synergy|empower|facilitate' plugins/jira-issue-triage/commands/setup.md
```

Expected: no matches.

- [ ] **Step 5: Commit**

```bash
git add plugins/jira-issue-triage/commands/setup.md
git commit -m "feat(jira-issue-triage): add /jira-issue-triage:setup wizard

8-question wizard that prompts for project key, severity field, triaged label, skip labels, transition names, severity scheme, and escalation contacts. Writes the result to .claude/jira-issue-triage.config.json. Auto-discovers defaults via Atlassian MCP. Re-runnable to update an existing config."
```

---

## Task 4: Create the requirements-investigator skill

**Files:**
- Create: `plugins/jira-issue-triage/skills/requirements-investigator/SKILL.md`
- Create: `plugins/jira-issue-triage/skills/requirements-investigator/references/report-template.md`

- [ ] **Step 1: Create the skill directory tree**

```bash
mkdir -p plugins/jira-issue-triage/skills/requirements-investigator/references
```

- [ ] **Step 2: Write the SKILL.md**

Create `plugins/jira-issue-triage/skills/requirements-investigator/SKILL.md`. Frontmatter:

```yaml
---
name: requirements-investigator
description: "Investigates a non-bug Jira ticket (Feature, Task, Spike) by reading the ticket and linked design or product docs, searching Slack and Confluence for prior decisions, and producing an evidence-tagged orientation report. Use when a developer is about to pick up a Feature, Task, or Spike ticket and wants context before starting work."
metadata:
  author: Taha Bikanerwala
tools: Read, Bash, Grep, mcp__plugin_atlassian_atlassian__getJiraIssue, mcp__plugin_atlassian_atlassian__searchJiraIssuesUsingJql, mcp__plugin_atlassian_atlassian__searchConfluenceUsingCql, mcp__plugin_slack_slack__slack_search_public_and_private, mcp__plugin_slack_slack__slack_read_thread
---
```

Body sections (mirror `issue-investigator` shape):
- **Calling Convention:** non-interactive, predictable structure (per-archetype template), evidence tags, output-is-the-last-thing, read-only.
- **Search Ladder:** three levels (Slack, Ticket+Jira+Confluence, Code optional). No Datadog level.
- **Evidence Model:** identical 4 tags (`[VERIFIED]`, `[OBSERVED]`, `[INFERRED]`, `[UNKNOWN]`).
- **Stop Condition:** identical to `issue-investigator` (2-3 ranked findings, sources at every level reached, concrete next-step queries).
- **Report Template:** points to `references/report-template.md` for per-archetype sections.
- **Writing Rules:** identical to `issue-investigator`.

The body text reuses the prose style of `issue-investigator` for consistency. Where `issue-investigator` says "Bug ticket", this skill says "Feature, Task, or Spike ticket".

- [ ] **Step 3: Write references/report-template.md**

Create `plugins/jira-issue-triage/skills/requirements-investigator/references/report-template.md` with three archetype templates:

```markdown
# Report Template

Read this when you reach the report-writing step. Skip on earlier steps.

The report template differs by archetype. Pick the matching template based on the archetype passed by the caller (the agent in Phase 1) or inferred from the issue type when running standalone.

## Feature Template

Six sections:

### 1. Lead

1-2 sentences. Name what is being built and the single best summary of scope. Inline evidence tag.

### 2. Background

2-4 sentences. Why this ticket exists. Prior decisions, related history, links to product briefs, design docs, runbooks, related Jira tickets. Pull this from Confluence and the linked tickets discovered in Level 2.

### 3. Requirements Found

Concrete acceptance criteria, definition of done, success metrics, target user stories. Pull from the ticket itself, linked tickets, and any Confluence spec the ticket points to. Flag gaps as `[UNKNOWN]`.

### 4. Design Refs

Links to Figma boards, design docs, mockup reviews, ADRs. One bullet per link with a one-phrase summary of what's at the link. If nothing is linked, write "None found in ticket or comments." A Feature ticket with no design refs is itself a triage flag.

### 5. Open Questions

Genuine unknowns that need an answer before development starts. Each question is specific (not "what's the scope?"). Tag the most likely answerer if discoverable.

### 6. Where To Look

2-5 tool-by-tool items. Each item: tool name + ready-to-paste query/URL + what a hit or miss tells you. Examples: code search for the affected service, Confluence search for related design ADRs, Slack search for recent decisions in the area.

## Task Template

Five sections:

### 1. Lead

1-2 sentences. Name what needs to happen and the why-now.

### 2. Why Now

2-3 sentences. The trigger for the task: dependency upgrade unblocks something, deprecation deadline, related migration, runbook execution. Pull from the ticket and recent Slack discussions.

### 3. Definition of Done Found

Concrete completion criteria. Pull from the ticket and any linked checklist or runbook. Flag gaps as `[UNKNOWN]`.

### 4. Risks

Anything in the affected code, config, or runbook that makes this task non-trivial. One bullet per risk. Examples: shared config touched by other teams, dependency with a known breaking change, infrastructure resource with downstream consumers.

### 5. Where To Look

Same format as Feature template Section 6.

## Spike Template

Five sections:

### 1. Lead

1-2 sentences. Name the question being investigated and the time-box if known.

### 2. Question to Answer

The specific decision or unknown the spike is meant to resolve. Quote it directly from the ticket if the ticket states it well; rewrite if vague. Multiple sub-questions are allowed if they are all in scope.

### 3. What's Already Known

Findings from any prior spike, design doc, related ticket, or Slack thread that bear on the question. Tag each with evidence level. If nothing is known, write "Nothing prior found." (which is itself a signal).

### 4. What's Unknown

The gaps that the spike needs to fill. One bullet per gap. Each phrased as a concrete check ("Does Cognito support more than 100 IdPs?") rather than a vague topic ("scalability").

### 5. Where To Look

Same format as Feature template Section 6. For Spikes, "Where To Look" frequently includes external research (vendor docs, RFCs, comparison articles) in addition to internal sources.

## Section Order

Sections appear in the order shown for each archetype. Skipping a section is allowed only when the section legitimately has nothing to say AND the absence itself is documented in the Lead (e.g., "Lead: ... no design refs were found in the ticket, see Design Refs section").
```

- [ ] **Step 4: Validate frontmatter**

```bash
python3 -c "
import re, yaml
content = open('plugins/jira-issue-triage/skills/requirements-investigator/SKILL.md').read()
m = re.match(r'^---\n(.*?)\n---', content, re.DOTALL)
assert m, 'no frontmatter'
data = yaml.safe_load(m.group(1))
assert data['name'] == 'requirements-investigator'
assert 'description' in data and 50 < len(data['description']) < 1024
assert 'tools' in data and len(data['tools']) > 0
assert data.get('metadata', {}).get('author') == 'Taha Bikanerwala'
print('frontmatter OK')
"
```

Expected: `frontmatter OK`.

- [ ] **Step 5: Em-dash, LLM-vocab, and leakage scans**

```bash
grep -nE '[a-zA-Z>] — [a-zA-Z<{]' plugins/jira-issue-triage/skills/requirements-investigator/SKILL.md plugins/jira-issue-triage/skills/requirements-investigator/references/report-template.md
grep -niE 'delve|leverage|robust|seamlessly|comprehensive|nuanced|elevate|foster|paradigm|ecosystem|holistic|innovative|synergy|empower|facilitate' plugins/jira-issue-triage/skills/requirements-investigator/SKILL.md plugins/jira-issue-triage/skills/requirements-investigator/references/report-template.md
grep -niE 'springhealth|spring health|customfield_|applause|se\.triaged|compass|everett|pradip' plugins/jira-issue-triage/skills/requirements-investigator/SKILL.md plugins/jira-issue-triage/skills/requirements-investigator/references/report-template.md
```

Expected: no matches.

- [ ] **Step 6: Commit**

```bash
git add plugins/jira-issue-triage/skills/requirements-investigator/
git commit -m "feat(requirements-investigator): add bundled investigation skill for Feature/Task/Spike archetypes

Mirrors issue-investigator's calling convention (non-interactive, evidence-tagged, read-only) but uses a 3-level search ladder (Slack, Ticket+Jira+Confluence, Code) and per-archetype report templates (Feature: 6 sections; Task: 5 sections; Spike: 5 sections). Drops the Datadog level since non-bug tickets rarely have runtime telemetry to query."
```

---

## Task 5: Update existing skills for the rename and scope tightening

**Files:**
- Modify: `plugins/jira-issue-triage/skills/issue-investigator/SKILL.md`
- Modify: `plugins/jira-issue-triage/skills/jira-ticket-refiner/SKILL.md`

- [ ] **Step 1: Tighten issue-investigator frontmatter description**

Replace the description in the frontmatter with:

> Investigates a Jira **Bug or Incident** ticket by searching Slack, the ticket and related Jira/Confluence pages, Datadog, and the codebase, then writes an evidence-tagged report in the bug-archetype template. Use when a Bug or Incident ticket needs an investigation report before triage decisions are made. For Feature, Task, or Spike tickets, see `requirements-investigator`.

- [ ] **Step 2: Add scope note in issue-investigator body**

After the existing intro paragraph (the one starting "Produce a structured report..."), add a one-line note:

> **Scope:** Bug and Incident archetypes. For Feature, Task, or Spike tickets, the agent calls `requirements-investigator` instead.

- [ ] **Step 3: Update jira-ticket-refiner Calling Convention**

In `plugins/jira-issue-triage/skills/jira-ticket-refiner/SKILL.md`, find:

> When the bug-triage agent calls this skill in Phase 5, treat the agent's already-fetched payload and investigation findings as the source data and skip the fetch step.

Replace with:

> When the jira-issue-triage agent calls this skill in Phase 5, treat the agent's already-fetched payload and investigation findings as the source data and skip the fetch step.

And in Step 1 of the workflow, find:

> If the calling context (the bug-triage agent in Phase 5) has already fetched the ticket and exposes the payload, reuse it. Do not refetch.

Replace `the bug-triage agent` with `the jira-issue-triage agent`.

- [ ] **Step 4: Validate frontmatter on both files**

```bash
python3 -c "
import re, yaml
for path in ['plugins/jira-issue-triage/skills/issue-investigator/SKILL.md', 'plugins/jira-issue-triage/skills/jira-ticket-refiner/SKILL.md']:
  content = open(path).read()
  m = re.match(r'^---\n(.*?)\n---', content, re.DOTALL)
  assert m, f'no frontmatter in {path}'
  data = yaml.safe_load(m.group(1))
  assert 'name' in data
  assert 'description' in data and 50 < len(data['description']) < 1024
  print(f'{path}: OK')
"
```

Expected: both lines print `OK`.

- [ ] **Step 5: Commit**

```bash
git add plugins/jira-issue-triage/skills/issue-investigator/SKILL.md plugins/jira-issue-triage/skills/jira-ticket-refiner/SKILL.md
git commit -m "refactor(skills): tighten issue-investigator scope and update refiner agent name

- issue-investigator: frontmatter description tightened to Bug/Incident scope. One-line scope note in body pointing at requirements-investigator for non-bug archetypes.
- jira-ticket-refiner: replace 'bug-triage agent' references with 'jira-issue-triage agent' in Calling Convention and Step 1."
```

---

## Task 6: Rewrite the plugin README

**Files:**
- Modify: `plugins/jira-issue-triage/README.md` (full rewrite)

- [ ] **Step 1: Rewrite the README**

The new README structure:

1. **Title and one-paragraph what-it-is.** "A Claude Code plugin that ships one subagent (`jira-issue-triage`) and a setup wizard (`/jira-issue-triage:setup`). Paste any Jira ticket URL (Bug, Incident, Feature, Task, or Spike) and tell it to triage..."

2. **Migration note.** A clearly-labeled section at the top for users coming from `jira-bug-triage` v0.3.0:
   - `/plugin uninstall jira-bug-triage` then `/plugin install jira-issue-triage`.
   - Config file: rename `.claude/jira-bug-triage.config.json` to `.claude/jira-issue-triage.config.json` (the legacy path still works for one minor version).
   - Agent name: scripts and CLAUDE.md memory referencing `bug-triage-agent` need to be updated to `jira-issue-triage`.

3. **Prerequisites:** unchanged. Atlassian MCP required; Slack and Datadog recommended.

4. **Sibling skills:** three bundled skills (issue-investigator, requirements-investigator, jira-ticket-refiner) + one future plugin (prose-style).

5. **Quick start:** install + run setup wizard + paste a ticket.

6. **Configuration:** full schema with all four new optional fields documented. Setup wizard section explaining the 8 questions. Defaults section unchanged. New "Advanced configuration" subsection covering scope_summary_field_name, sprint_field_name, story_points_field_name, non_bug_transitions.

7. **Workflow phases:** updated table with archetype gating shown:

```markdown
| Phase | What it does | Archetypes |
|-------|--------------|------------|
| Prerequisites | Auto-discover identity, load config, look up severity field and transitions by name. First-run wizard if no config. | All |
| Phase 0 | Fetch ticket, run skip-label check, assign to you, transition to investigating. Detect archetype. | All |
| Phase 1 | Investigation: issue-investigator (Bug/Incident) or requirements-investigator (Feature/Task/Spike). | All |
| Phase 2 | Datadog log search. | Bug, Incident |
| Phase 2.5 | Decide whether reporter follow-up is warranted. | All |
| Phase 3 | Hard pause. Show findings + proposed updates, wait for approval. | All |
| Phase 4a | Severity assessment comment (ADF). | Bug, Incident |
| Phase 4b | Scope or AC summary comment (ADF). | Feature, Task, Spike |
| Phase 4c | Follow-up question tagging reporter or EM. Replaces 4a or 4b on follow-up path. | All (only when follow_up_needed) |
| Phase 5 | Refine ticket via jira-ticket-refiner. | All |
| Phase 6 | Severity + due date (Bug/Incident) OR sprint placement + story points (Feature/Task/Spike, optional). | All |
| Phase 7 | Link related/duplicate tickets. | All |
| Phase 8 | Append triaged label. Fill optional fields if discoverable. | All |
| Phase 9 | Final assignee + transition. | All |
| Phase 10 | Slack DM summary. Optional escalation. | All |
```

8. **Limitations:** unchanged + one new line: "The agent will never assign story points or pick a sprint without your approval."

9. **FAQ:** unchanged + new entries:
   - "Can I run the agent on a Feature ticket?" → "Yes. Phase 1 calls requirements-investigator instead of issue-investigator. Phase 4 posts a scope summary instead of a severity assessment. Phase 6 is skipped (or does sprint placement if configured)."
   - "Do I need to run /jira-issue-triage:setup before the first ticket?" → "Optional. The agent detects missing config on first run and offers three choices: run the setup command, walk through the same wizard inline, or use defaults."

10. **Contributing and License:** unchanged.

(The full file content is large; the implementation step writes the README in one go using the structure above. Em-dash and LLM-vocab scans run after the write.)

- [ ] **Step 2: Em-dash and LLM-vocab scans**

```bash
grep -nE '[a-zA-Z>] — [a-zA-Z<{]' plugins/jira-issue-triage/README.md
grep -niE 'delve|leverage|robust|seamlessly|comprehensive|nuanced|elevate|foster|paradigm|ecosystem|holistic|innovative|synergy|empower|facilitate' plugins/jira-issue-triage/README.md
```

Expected: no em-dash separator matches. LLM-vocab matches only in the rule-statement areas (writing rules, etc.).

- [ ] **Step 3: Commit**

```bash
git add plugins/jira-issue-triage/README.md
git commit -m "docs(jira-issue-triage): rewrite plugin README for v1.0.0 scope

- Migration note for v0.3.0 users at the top
- Three bundled skills documented
- Workflow table shows archetype gating per phase
- Full config schema with four new optional fields
- Setup wizard section
- New FAQ entries for Feature tickets and the wizard"
```

---

## Task 7: Update marketplace README

**Files:**
- Modify: `README.md` (repo root)

- [ ] **Step 1: Update plugin row**

Replace the Available plugins row:

```markdown
| Plugin | Version | What it does |
|--------|---------|--------------|
| [`jira-issue-triage`](./plugins/jira-issue-triage/) | 1.0.0 | Subagent that triages Jira issues across all archetypes (Bug, Incident, Feature, Task, Spike): assigns, runs the matching investigation skill, refines the ticket, and DMs you a summary. Bundles `issue-investigator`, `requirements-investigator`, and `jira-ticket-refiner`. Ships a `/jira-issue-triage:setup` wizard for first-time configuration. |
```

- [ ] **Step 2: Add "What changed in 1.0.0" paragraph**

After the table, add:

```markdown
## What changed in 1.0.0

The plugin (formerly `jira-bug-triage`) was renamed and expanded to handle all Jira archetypes, not just Bugs. The agent (formerly `bug-triage-agent`) is now `jira-issue-triage`. A new bundled skill `requirements-investigator` joins the existing two for non-bug archetypes. A `/jira-issue-triage:setup` wizard prompts for configuration on first run.

Migration: `/plugin uninstall jira-bug-triage` then `/plugin install jira-issue-triage`. The legacy config file path (`.claude/jira-bug-triage.config.json`) keeps working for one minor version with a deprecation warning. See the [design spec](./docs/superpowers/specs/2026-05-01-jira-issue-triage-design.md) for the full change list.
```

- [ ] **Step 3: Em-dash scan**

```bash
grep -nE '[a-zA-Z>] — [a-zA-Z<{]' README.md
```

Expected: no matches.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: update marketplace README for jira-issue-triage v1.0.0 rename"
```

---

## Task 8: Append architectural-revision notes to existing specs and plans

**Files:**
- Modify: `docs/superpowers/specs/2026-04-30-claude-marketplace-design.md`
- Modify: `docs/superpowers/specs/2026-04-30-issue-investigator-design.md`
- Modify: `docs/superpowers/specs/2026-05-01-jira-ticket-refiner-design.md`
- Modify: `docs/superpowers/plans/2026-05-01-jira-ticket-refiner.md`

- [ ] **Step 1: Append to marketplace design spec**

After the existing `## Architectural revision (2026-05-01)` section, add:

```markdown
## Architectural revision (2026-05-01b)

The plugin was renamed from `jira-bug-triage` to `jira-issue-triage` and expanded to handle all Jira archetypes (Bug, Incident, Feature, Task, Spike), not just Bugs. The agent was renamed from `bug-triage-agent` to `jira-issue-triage`. A new bundled skill `requirements-investigator` joins `issue-investigator` and `jira-ticket-refiner` so the plugin now ships three bundled skills. A `/jira-issue-triage:setup` slash command and an in-agent first-run wizard fallback let new users configure the plugin without hand-editing JSON.

The plugin manifest version bumps to `1.0.0`. The legacy config file path (`.claude/jira-bug-triage.config.json`) keeps working for one minor version (1.x) with a deprecation warning. `prose-style` remains the only sibling skill still planned as a separate plugin. See `docs/superpowers/specs/2026-05-01-jira-issue-triage-design.md` for the full v1.0.0 spec.
```

- [ ] **Step 2: Append to issue-investigator design spec**

After the existing `## Update (2026-05-01)` section, add:

```markdown
## Update (2026-05-01b)

The skill's frontmatter description was tightened from "Investigates a Jira bug ticket..." to "Investigates a Jira Bug or Incident ticket..." to make scope explicit now that a sibling skill (`requirements-investigator`) ships in the same plugin for Feature/Task/Spike tickets. A one-line scope note was added at the top of the body pointing at `requirements-investigator` for non-bug archetypes. The 6-section report template, search ladder, and writing rules are unchanged.

The plugin housing this skill was renamed from `jira-bug-triage` to `jira-issue-triage` in v1.0.0. See `docs/superpowers/specs/2026-05-01-jira-issue-triage-design.md`.
```

- [ ] **Step 3: Append to jira-ticket-refiner design spec**

After the spec body, add:

```markdown
## Update (2026-05-01b)

The agent that calls this skill in Phase 5 was renamed from `bug-triage-agent` to `jira-issue-triage` in plugin v1.0.0. The skill body was updated in two places (Calling Convention paragraph and Step 1 reuse-the-payload note) to use the new agent name. No template, archetype, or workflow changes; the skill was already archetype-aware. See `docs/superpowers/specs/2026-05-01-jira-issue-triage-design.md` for the v1.0.0 spec.
```

- [ ] **Step 4: Append to jira-ticket-refiner plan**

After the existing `## Out of scope` section, add:

```markdown
## Update (2026-05-01b): v1.0.0 rename impact

In plugin v1.0.0, the agent that calls this skill in Phase 5 was renamed from `bug-triage-agent` to `jira-issue-triage`, and the plugin folder was renamed from `plugins/jira-bug-triage` to `plugins/jira-issue-triage`. This skill's body was updated to reflect the new agent name (Calling Convention and Step 1 reuse-the-payload note). No archetype-handling or template changes; the skill was already general-purpose. The Task 9 and Task 10 validation/publish steps in this plan were never executed for v0.3.0 in isolation; they were rolled into the v1.0.0 release. See `docs/superpowers/plans/2026-05-01-jira-issue-triage.md` for the v1.0.0 plan.
```

- [ ] **Step 5: Em-dash scan on appended sections**

```bash
grep -nE '[a-zA-Z>] — [a-zA-Z<{]' docs/superpowers/specs/2026-04-30-claude-marketplace-design.md docs/superpowers/specs/2026-04-30-issue-investigator-design.md docs/superpowers/specs/2026-05-01-jira-ticket-refiner-design.md docs/superpowers/plans/2026-05-01-jira-ticket-refiner.md
```

Expected: matches only in pre-existing prose (not in the appended sections).

- [ ] **Step 6: Commit**

```bash
git add docs/superpowers/specs/ docs/superpowers/plans/
git commit -m "docs(specs,plans): append v1.0.0 architectural-revision notes"
```

---

## Task 9: Full self-review pass

**Files:** all of the above. No new files.

This task addresses the user's request: "review thoroughly so that Co-pilot does not find any issues, discrepencies or contradictions."

- [ ] **Step 1: Grep audit for old agent name**

```bash
grep -rn 'bug-triage-agent' plugins/ docs/ README.md .claude-plugin/ 2>/dev/null | grep -v '.git/'
```

Expected: matches ONLY in:
- Rename-history notes in specs and plans (`docs/superpowers/specs/2026-*-design.md`, `docs/superpowers/plans/2026-*.md`).
- The plugin README's Migration section (where it tells users about the rename).
- The repo root README's "What changed in 1.0.0" paragraph.

If matches appear in the agent body, slash command body, or new skill body, fix them before continuing.

- [ ] **Step 2: Grep audit for old plugin name**

```bash
grep -rn 'jira-bug-triage' plugins/ docs/ README.md .claude-plugin/ 2>/dev/null | grep -v '.git/'
```

Expected: matches ONLY in:
- Same rename-history notes.
- Migration sections in READMEs.
- Back-compat code in agent body that reads `.claude/jira-bug-triage.config.json`.

- [ ] **Step 3: Grep audit for old config path**

```bash
grep -rn '\.claude/jira-bug-triage\.config\.json' plugins/ docs/ README.md 2>/dev/null | grep -v '.git/'
```

Expected: matches ONLY in:
- Agent body's Configuration step (legacy path read).
- Plugin README Migration section.
- Setup slash command body's "check legacy path" step.
- Spec's migration story section.

- [ ] **Step 4: JSON validators**

```bash
python3 -m json.tool plugins/jira-issue-triage/.claude-plugin/plugin.json > /dev/null && echo plugin OK
python3 -m json.tool .claude-plugin/marketplace.json > /dev/null && echo marketplace OK
```

Expected: both `OK`.

- [ ] **Step 5: YAML frontmatter validators on every .md with frontmatter**

```bash
python3 -c "
import re, yaml, sys
files = [
    'plugins/jira-issue-triage/agents/jira-issue-triage.md',
    'plugins/jira-issue-triage/commands/setup.md',
    'plugins/jira-issue-triage/skills/issue-investigator/SKILL.md',
    'plugins/jira-issue-triage/skills/requirements-investigator/SKILL.md',
    'plugins/jira-issue-triage/skills/jira-ticket-refiner/SKILL.md',
]
for path in files:
    content = open(path).read()
    m = re.match(r'^---\n(.*?)\n---', content, re.DOTALL)
    if not m:
        print(f'NO FRONTMATTER: {path}')
        sys.exit(1)
    data = yaml.safe_load(m.group(1))
    assert 'name' in data or path.endswith('commands/setup.md'), f'no name in {path}'
    assert 'description' in data, f'no description in {path}'
    print(f'OK: {path}')
"
```

Expected: every line `OK`.

Note: slash command files don't require a `name` field (Claude Code derives the name from the filename).

- [ ] **Step 6: Cross-file consistency check for config schema**

The same JSON schema appears in four places. Check they match:
- Default config in agent body (Prerequisites > Configuration step, after the choice block).
- Schema example in plugin README (Configuration section).
- Wizard output schema in setup slash command body.
- Schema example in design spec.

```bash
python3 -c "
import re

def extract_first_json_block(path, marker):
    content = open(path).read()
    # Find the first \`\`\`json block after the marker
    idx = content.find(marker)
    if idx == -1:
        print(f'NO MARKER {marker} in {path}')
        return None
    rest = content[idx:]
    m = re.search(r'\`\`\`json\n(\{.*?\n\})\n\`\`\`', rest, re.DOTALL)
    if not m:
        print(f'NO JSON after {marker} in {path}')
        return None
    return m.group(1)

# These should all have the same canonical schema (the four new optional fields included)
import json
for path, marker in [
    ('plugins/jira-issue-triage/agents/jira-issue-triage.md', '### Configuration'),
    ('plugins/jira-issue-triage/README.md', '## Configuration'),
    ('docs/superpowers/specs/2026-05-01-jira-issue-triage-design.md', '### Schema (full)'),
]:
    block = extract_first_json_block(path, marker)
    if block:
        try:
            data = json.loads(block)
            keys = sorted(data.keys())
            print(f'{path}: keys = {keys}')
        except json.JSONDecodeError as e:
            print(f'{path}: INVALID JSON: {e}')
"
```

Expected: all three lines print the same sorted list of top-level keys: `['escalation', 'non_bug_transitions', 'project_key', 'scope_summary_field_name', 'severity_field_name', 'severity_scheme', 'skip_labels', 'sprint_field_name', 'story_points_field_name', 'transitions', 'triaged_label']`.

If any line shows a different set of keys, fix the source file.

- [ ] **Step 7: Cross-file consistency check for phase numbering**

Verify the phase list in agent body, plugin README, and design spec all use the same numbering (Prerequisites, 0, 1, 2, 2.5, 3, 4a, 4b, 4c, 5, 6, 7, 8, 9, 10).

```bash
echo '=== Agent body ==='
grep -E '^### Phase' plugins/jira-issue-triage/agents/jira-issue-triage.md
echo '=== Plugin README ==='
grep -E '^\| Phase' plugins/jira-issue-triage/README.md | head -20
echo '=== Design spec ==='
grep -E '^\| Phase' docs/superpowers/specs/2026-05-01-jira-issue-triage-design.md | head -20
```

Expected: all three lists include the same phase identifiers (Phase 0 through 10, with 4a/4b/4c sub-letters explicit).

- [ ] **Step 8: Cross-file consistency check for skill names**

Confirm every skill name referenced in the agent body resolves to a real skill folder:

```bash
for skill in $(grep -oE '\`[a-z-]+-investigator\`|\`jira-ticket-refiner\`|\`prose-style\`' plugins/jira-issue-triage/agents/jira-issue-triage.md | sort -u | tr -d '\`'); do
  if [ -d "plugins/jira-issue-triage/skills/$skill" ]; then
    echo "$skill: EXISTS"
  elif [ "$skill" = "prose-style" ]; then
    echo "$skill: planned future plugin (OK)"
  else
    echo "$skill: MISSING"
  fi
done
```

Expected: `issue-investigator: EXISTS`, `requirements-investigator: EXISTS`, `jira-ticket-refiner: EXISTS`, `prose-style: planned future plugin (OK)`.

- [ ] **Step 9: Em-dash scan on all touched files**

```bash
grep -rnE '[a-zA-Z>] — [a-zA-Z<{]' plugins/jira-issue-triage/ docs/superpowers/specs/2026-05-01-* docs/superpowers/plans/2026-05-01-* README.md
```

Expected: no matches in body prose. If the only matches are in the writing-rules statements at the bottom of the agent body or skill bodies, that's acceptable.

- [ ] **Step 10: LLM-vocab scan on all touched files**

```bash
grep -rniE 'delve|leverage|robust|seamlessly|comprehensive|nuanced|elevate|foster|paradigm|ecosystem|holistic|innovative|synergy|empower|facilitate' plugins/jira-issue-triage/ docs/superpowers/specs/2026-05-01-* docs/superpowers/plans/2026-05-01-* README.md
```

Expected: matches only in writing-rules statements (the rule itself lists the forbidden words).

- [ ] **Step 11: Spring Health leakage scan**

```bash
grep -rniE 'springhealth|spring health|customfield_10114|customfield_12424|customfield_12468|customfield_10153|customfield_10892|14854|18320|14853|18321|14852|se\.triaged|compass|care.blocking|everett|pradip|support-engineering-bug-backlog' plugins/jira-issue-triage/ docs/superpowers/specs/2026-05-01-* docs/superpowers/plans/2026-05-01-*
```

Expected: no matches except in spec validation-plan sections that reference the leakage scan itself by name.

- [ ] **Step 12: Document findings**

If any of Steps 1-11 turned up issues that were fixed during this task, list them in a comment in the commit message for traceability. If nothing was found, the commit message just says "review pass clean".

- [ ] **Step 13: Commit**

```bash
git add -A
git commit --allow-empty -m "chore(self-review): full consistency check pass

[List any issues found and fixed inline; or 'review pass clean']"
```

---

## Task 10: Local install validation (user-driven)

- [ ] **Step 1: Add the marketplace from the local file path**

> `/plugin marketplace add /home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace`

Expected: marketplace re-loads cleanly. The plugin list shows `jira-issue-triage` (not `jira-bug-triage`).

- [ ] **Step 2: Install the plugin**

> `/plugin install jira-issue-triage`

Expected: install succeeds at version `1.0.0`.

- [ ] **Step 3: Verify components are discoverable**

- Confirm `jira-issue-triage` shows up in the Agent tool list.
- Confirm `issue-investigator`, `requirements-investigator`, and `jira-ticket-refiner` all show up in the Skill list.
- Confirm `/jira-issue-triage:setup` shows up in the slash-command list.

- [ ] **Step 4: Run setup wizard end to end**

> `/jira-issue-triage:setup`

Walk through all 8 questions. Confirm `.claude/jira-issue-triage.config.json` is written with the right schema (all top-level keys present, including the four optional new ones).

- [ ] **Step 5: Smoke test on a Bug ticket**

Paste a real Bug ticket key and ask the agent to triage. Expected:
- Phase 0 detects archetype `Bug`.
- Phase 1 calls `issue-investigator`.
- Phase 4a runs (severity assessment), not 4b.
- Phase 6 sets severity and due date.

- [ ] **Step 6: Smoke test on a Feature ticket**

Paste a real Feature ticket key and ask the agent to triage. Expected:
- Phase 0 detects archetype `Feature`.
- Phase 1 calls `requirements-investigator`.
- Phase 2 (Datadog) is skipped silently.
- Phase 4b runs (scope summary), not 4a.
- Phase 6 is skipped (or does sprint placement if `sprint_field_name` is configured).

The validation checkboxes stay unchecked until the user confirms a real-ticket test against their Jira instance.

---

## Task 11: Publish v1.0.0

- [ ] **Step 1: Confirm gh is authenticated**

```bash
gh auth status 2>&1 | head -5
```

Expected: logged in as `TahaBikanerwala`.

- [ ] **Step 2: Push branch**

```bash
git push -u origin feat/jira-issue-triage-v1
```

- [ ] **Step 3: Open PR**

```bash
gh pr create --title "feat: rename to jira-issue-triage and expand to all archetypes (v1.0.0)" --body "$(cat <<'EOF'
## Summary

- Rename plugin from `jira-bug-triage` to `jira-issue-triage`
- Expand workflow to handle all five archetypes (Bug, Incident, Feature, Task, Spike)
- Add bundled `requirements-investigator` skill for Feature/Task/Spike investigation
- Add `/jira-issue-triage:setup` slash command and first-run wizard fallback
- Bump plugin version 0.3.0 → 1.0.0 (breaking change)
- Read both new and legacy config file paths for migration

See [the design spec](./docs/superpowers/specs/2026-05-01-jira-issue-triage-design.md) for full rationale and architecture.

## Test plan

- [ ] Local install validation per Task 10 of the implementation plan
- [ ] Smoke test on a Bug ticket (Phase 4a fires)
- [ ] Smoke test on a Feature ticket (Phase 4b fires, Phase 6 skips)
- [ ] Setup wizard runs end to end and writes the expected schema
EOF
)"
```

- [ ] **Step 4: Address Copilot review rounds in additional commits**

Do NOT amend. Each round of review feedback gets its own commit. Use the existing v0.3.0 plan's Task 8 polish-commit pattern as a template.

- [ ] **Step 5: Merge and tag**

After all review rounds and approval:

```bash
gh pr merge --squash --delete-branch
git checkout main && git pull
git tag v1.0.0
git push origin v1.0.0
```

- [ ] **Step 6: Public install verification**

> ```
> /plugin marketplace remove jt-bikanerwala-marketplace
> /plugin marketplace add github.com/TahaBikanerwala/jt-bikanerwala-marketplace
> /plugin install jira-issue-triage
> ```

Confirm marketplace fetches the latest `main` (v1.0.0 commits visible), plugin installs at version `1.0.0`, agent + 3 skills + 1 slash command all available, and the smoke tests from Task 10 still pass.

---

## Self-review

**1. Spec coverage.**

Walking through `docs/superpowers/specs/2026-05-01-jira-issue-triage-design.md` section by section:

| Spec section | Implementing task |
|--------------|-------------------|
| Architectural revision (rename, scope expansion, three skills, setup wizard) | Tasks 1-7 |
| Workflow flow (per-archetype branching) | Task 2 |
| Phase-by-phase change log | Task 2 |
| Components: renamed agent | Tasks 1, 2 |
| Components: new setup slash command | Task 3 |
| Components: agent first-run wizard fallback | Task 2 (Step 3) |
| Components: requirements-investigator skill | Task 4 |
| Components: modified issue-investigator | Task 5 (Steps 1-2) |
| Components: modified jira-ticket-refiner | Task 5 (Step 3) |
| Components: modified manifests | Task 1 (Steps 3-4) |
| Configuration model (file path, schema, defaults, new optional fields) | Tasks 2 (default config), 3 (wizard output), 6 (README schema), Task 8 (spec append) |
| Migration story | Task 6 (README migration section), Task 7 (root README "What changed in 1.0.0") |
| Architecture-update side effects table | Tasks 1-8 (each row has a corresponding task) |
| Versioning (0.3.0 → 1.0.0) | Task 1 (Step 3) |
| Validation plan | Tasks 9, 10, 11 |
| Out of scope | Honored (no `prose-style` work, no non-Jira trackers, no auto-migration of legacy config, advanced fields not in wizard) |

All spec sections covered.

**2. Type and name consistency.**

- Plugin name `jira-issue-triage` — used consistently in Tasks 1, 2, 3, 4, 5, 6, 7, 9.
- Agent name `jira-issue-triage` (no `-agent` suffix) — used consistently in Tasks 1 (Step 2), 2 (Step 1), 5 (Step 3), 6 (Step 1), 9 (Step 8).
- Skill name `requirements-investigator` — used consistently in Tasks 2 (Steps 5, 7), 4, 6 (Step 1), 9 (Step 8).
- Marketplace name `jt-bikanerwala-marketplace` — used consistently in Tasks 1 (Step 4), 11 (Step 6).
- Version bump `0.3.0` → `1.0.0` — consistent across Task 1 (Step 3), Task 7 (Step 1), Task 11 (Step 5).
- Phase numbering `Phase 4a/4b/4c` — consistent across Tasks 2 (Step 9), 6 (Step 1), 9 (Step 7).
- Config file path `.claude/jira-issue-triage.config.json` — consistent across Tasks 2 (Steps 3-4), 3 (Step 2), 6 (Step 1), 9 (Step 6).

No drift detected.

**3. Placeholder scan.**

No "TBD", "TODO", "fill in", or "implement later" markers. Steps that say "the existing body unchanged" or "[existing fallback procedure]" are not placeholders; they reference text that already exists in the file being modified, which the implementing agent reads from the file directly.

---

## Out of scope (re-stated from spec)

- Renaming `jira-ticket-refiner` (already archetype-aware, name fits).
- Renaming `issue-investigator` (name still fits its scope; description tightened).
- Building `prose-style` (still planned for later).
- Non-Jira issue trackers (Linear, GitHub Issues, ServiceNow).
- Auto-migrating the legacy config file to the new path (read-both with deprecation warning is enough for 1.x).
- Adding the four advanced fields (`scope_summary_field_name`, `sprint_field_name`, `story_points_field_name`, `non_bug_transitions`) to the v1.0.0 wizard.
- Visual companion / mockups.
