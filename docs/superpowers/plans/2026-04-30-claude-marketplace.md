# jt-bikanerwala-marketplace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a public Claude Code plugin marketplace at `github.com/TahaBikanerwala/jt-bikanerwala-marketplace` containing one plugin (`jira-bug-triage`) with a single subagent (`bug-triage-agent`) that runs end-to-end Jira bug triage in a project-agnostic way.

**Architecture:** Two-level repo (marketplace at the root, plugin under `plugins/jira-bug-triage/`). Subagent body is a generic rewrite of an existing project-specific skill — Spring Health-isms removed, sibling-skill references kept by current names, project-specific values resolved through auto-discovery or `.claude/jira-bug-triage.config.json`. No code beyond JSON manifests, markdown content, and a license file.

**Tech Stack:** JSON (manifests), Markdown (subagent body, READMEs), `jq` for JSON validation, `git` + `gh` for publishing, Claude Code's `/plugin` slash commands for install validation.

**Working directory:** `/home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace/` (existing folder, not renamed). Marketplace `name` is `jt-bikanerwala-marketplace`. The local folder name and the manifest name don't have to match — Claude Code reads the manifest.

**Source spec:** `docs/superpowers/specs/2026-04-30-claude-marketplace-design.md` (in this repo).

**Source skill being rewritten:** `/home/taha/Desktop/MyProjects/simple-windows-setup/.claude/skills/bug-triage-agent/SKILL.md` (read-only reference).

---

## Pre-flight: Verify subagent `tools` wildcard syntax

The spec frontmatter uses `mcp__plugin_atlassian_atlassian__*` (wildcard). Before writing the agent file, verify whether Claude Code subagent loaders honor wildcards in `tools`. If not, the agent body uses the explicit-tool-list version shown in Task 4.

- [ ] **Step 1: Query Claude Code docs for subagent `tools` field syntax**

Run:

```
ToolSearch query "select:mcp__plugin_context7_context7__query-docs" max_results:1
```

Then call `query-docs` with `libraryId: "/websites/code_claude"` and query: `"subagent agent file frontmatter tools field syntax wildcards mcp tool patterns allowed values"`.

Expected: documentation snippet describing the `tools` frontmatter field and whether wildcards are supported.

- [ ] **Step 2: Record the finding**

Write the answer in one sentence to scratch state. Two outcomes:

- **A) Wildcards supported** — Task 4 uses the wildcard form: `tools: mcp__plugin_atlassian_atlassian__*, mcp__plugin_slack_slack__*, mcp__datadog__*, Skill, Read, Bash`.
- **B) Wildcards not supported** — Task 4 uses the explicit list shown in Task 4 below.

No commit yet (no files changed).

---

## Task 1: Repository init + LICENSE + .gitignore

**Files:**
- Create: `/home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace/.gitignore`
- Create: `/home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace/LICENSE`

- [ ] **Step 1: Verify the directory is not yet a git repo**

Run: `git -C /home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace rev-parse --is-inside-work-tree 2>&1`

Expected: an error saying it's not a git repository (or "fatal: not a git repository"). If it already says `true`, skip the `git init` step below.

- [ ] **Step 2: Initialize git**

Run: `git -C /home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace init -b main`

Expected: `Initialized empty Git repository in /home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace/.git/`.

- [ ] **Step 3: Write `.gitignore`**

Path: `/home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace/.gitignore`

Content:

```
.claude/settings.local.json
.DS_Store
node_modules/
*.swp
.env
.env.local
```

- [ ] **Step 4: Write `LICENSE` (MIT)**

Path: `/home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace/LICENSE`

Content:

```
MIT License

Copyright (c) 2026 Taha Bikanerwala

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 5: Stage and commit**

Run:

```bash
git -C /home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace add .gitignore LICENSE docs/
git -C /home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace commit -m "chore: initial commit (license, gitignore, design doc, plan)"
```

Expected: a commit with at least four files (`LICENSE`, `.gitignore`, the design doc, this plan).

---

## Task 2: Marketplace manifest

**Files:**
- Create: `/home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace/.claude-plugin/marketplace.json`

- [ ] **Step 1: Create `.claude-plugin/` directory**

Run: `mkdir -p /home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace/.claude-plugin`

- [ ] **Step 2: Write `marketplace.json`**

Path: `/home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace/.claude-plugin/marketplace.json`

Content:

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
      "name": "jira-bug-triage",
      "source": "./plugins/jira-bug-triage",
      "description": "End-to-end Jira bug triage subagent."
    }
  ]
}
```

- [ ] **Step 3: Validate JSON parses**

Run:

```bash
jq -e . /home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace/.claude-plugin/marketplace.json > /dev/null && echo OK
```

Expected: `OK`. (If `jq` isn't installed, fall back to `python3 -c "import json; json.load(open('...'))" && echo OK`.)

- [ ] **Step 4: Validate kebab-case names**

Run:

```bash
jq -r '.name, (.plugins[].name)' /home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace/.claude-plugin/marketplace.json | grep -vE '^[a-z0-9]+(-[a-z0-9]+)*$' || echo "all kebab-case"
```

Expected: `all kebab-case`.

- [ ] **Step 5: Commit**

```bash
git -C /home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace add .claude-plugin/marketplace.json
git -C /home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace commit -m "feat: add marketplace manifest"
```

---

## Task 3: Plugin manifest

**Files:**
- Create: `/home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace/plugins/jira-bug-triage/.claude-plugin/plugin.json`

- [ ] **Step 1: Create plugin directory tree**

Run: `mkdir -p /home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace/plugins/jira-bug-triage/.claude-plugin /home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace/plugins/jira-bug-triage/agents`

- [ ] **Step 2: Write `plugin.json`**

Path: `/home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace/plugins/jira-bug-triage/.claude-plugin/plugin.json`

Content:

```json
{
  "name": "jira-bug-triage",
  "version": "0.1.0",
  "description": "End-to-end Jira bug triage subagent: assigns, investigates, refines, sets severity-based due dates, and updates ticket fields.",
  "author": {
    "name": "Taha Bikanerwala",
    "url": "https://github.com/TahaBikanerwala"
  },
  "homepage": "https://github.com/TahaBikanerwala/jt-bikanerwala-marketplace",
  "repository": "https://github.com/TahaBikanerwala/jt-bikanerwala-marketplace",
  "license": "MIT",
  "keywords": ["jira", "bug", "triage", "subagent", "atlassian"]
}
```

- [ ] **Step 3: Validate JSON parses**

Run: `jq -e . /home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace/plugins/jira-bug-triage/.claude-plugin/plugin.json > /dev/null && echo OK`

Expected: `OK`.

- [ ] **Step 4: Commit**

```bash
git -C /home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace add plugins/jira-bug-triage/.claude-plugin/plugin.json
git -C /home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace commit -m "feat: add jira-bug-triage plugin manifest"
```

---

## Task 4: Subagent body — `bug-triage-agent.md`

This is the largest deliverable: a generic rewrite of the source skill. Write the whole file in one step. After writing, do a quick targeted review for the few traps (Spring Health string leakage, kebab-case agent name, frontmatter parses).

**Files:**
- Create: `/home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace/plugins/jira-bug-triage/agents/bug-triage-agent.md`

**Source-of-truth for the rewrite:** the genericization rules in the design spec at `docs/superpowers/specs/2026-04-30-claude-marketplace-design.md`. The source skill is at `/home/taha/Desktop/MyProjects/simple-windows-setup/.claude/skills/bug-triage-agent/SKILL.md` (read-only reference).

- [ ] **Step 1: Decide on `tools` line**

Pick one of the two outcomes from Pre-flight Step 2:

- **A) Wildcards supported (preferred):**
  ```
  tools: mcp__plugin_atlassian_atlassian__*, mcp__plugin_slack_slack__*, mcp__datadog__*, Skill, Read, Bash
  ```

- **B) Wildcards not supported (fallback):**
  ```
  tools: Skill, Read, Bash, mcp__plugin_atlassian_atlassian__getJiraIssue, mcp__plugin_atlassian_atlassian__editJiraIssue, mcp__plugin_atlassian_atlassian__addCommentToJiraIssue, mcp__plugin_atlassian_atlassian__transitionJiraIssue, mcp__plugin_atlassian_atlassian__getTransitionsForJiraIssue, mcp__plugin_atlassian_atlassian__searchJiraIssuesUsingJql, mcp__plugin_atlassian_atlassian__searchConfluenceUsingCql, mcp__plugin_atlassian_atlassian__lookupJiraAccountId, mcp__plugin_atlassian_atlassian__getAccessibleAtlassianResources, mcp__plugin_atlassian_atlassian__atlassianUserInfo, mcp__plugin_atlassian_atlassian__getJiraIssueTypeMetaWithFields, mcp__plugin_atlassian_atlassian__createIssueLink, mcp__plugin_slack_slack__slack_search_users, mcp__plugin_slack_slack__slack_search_public_and_private, mcp__plugin_slack_slack__slack_read_thread, mcp__plugin_slack_slack__slack_send_message, mcp__plugin_slack_slack__slack_read_user_profile, mcp__datadog__search_datadog_logs
  ```

- [ ] **Step 2: Write the agent file**

Path: `/home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace/plugins/jira-bug-triage/agents/bug-triage-agent.md`

Content (substitute the chosen `tools:` line on line 4):

````markdown
---
name: bug-triage-agent
description: Triages a Jira bug ticket end-to-end: assigns it, transitions to investigating, runs the investigation skill, searches observability data, refines the ticket, sets severity-based due date, updates fields, and DMs you a summary. Use when the user pastes a Jira bug ticket link and says triage, investigate, or process a bug.
tools: <PASTE THE LINE FROM STEP 1 HERE>
---

# Bug Triage Agent

Process a Jira bug ticket through the full triage workflow: investigate, enrich with observability data, refine the description, and update all metadata fields.

## Prerequisites

Run these once at the start of the session and cache the results.

### Identity

1. Call `getAccessibleAtlassianResources` to get the `cloudId`.
2. Call `atlassianUserInfo` to get the running user's Jira `accountId` and `email`.
3. Call `slack_search_users` with the `email` from step 2. Use the returned `user.id`. Confirm the email match is exact before caching.

If any lookup fails, stop and tell the user which call failed before continuing. Never substitute hardcoded IDs.

### Configuration

Look for `.claude/jira-bug-triage.config.json` in the project root. If present, parse it and merge with the defaults below. If absent, use defaults as-is.

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
  }
}
```

### Auto-Discovery

Custom field IDs vary across Jira instances. The agent looks them up by name at runtime instead of hardcoding.

1. **Severity field.** If config has `severity_field_name`, use that name. Otherwise try in order: `Severity Level`, `Severity`, `Bug Severity`. Use `getJiraIssueTypeMetaWithFields` (or any project field-metadata call) to find the field ID. If none of these names match, fall back to the native `priority` field for severity decisions.
2. **Severity options.** Once the severity field is found, query its allowed options at runtime to build a `{name → id}` mapping (e.g., `{"Sev-1": "14854", "Sev-2": "14853", "Sev-3": "14852"}`). Cache for the session.
3. **Transitions.** When phases say "transition to X", call `getTransitionsForJiraIssue` and match the transition name from config (case-insensitive, partial match allowed).
4. **Optional custom fields.** "Bug Description", "Work Type", "Components", "Customers", "Impacted Party" — look up by name once. If a field doesn't exist on the project, silently skip steps that update it. Never fail because a field is absent.

## Sibling Skills

The agent invokes three other skills during the workflow. They live in separate plugins. Reference them by name; the `Skill` tool routes the call.

| Phase | Skill name | Purpose |
|-------|-----------|---------|
| Phase 1 | `issue-investigator` | Search Slack, Confluence, Jira, then code if needed. Produces an investigation report with evidence tags. |
| Phase 5 | `jira-ticket-refiner` | Restructure the ticket description into a clear, self-contained Bug document. |
| Phase 5 | `prose-style` | Apply writing rules to comment text and refined descriptions. |

If a skill is not installed when the agent tries to call it, the `Skill` tool returns an error. Fall back to the brief inline summary in the relevant phase and warn the user once at the start of that phase.

## Connections

| System | MCP server | Used for |
|--------|-----------|----------|
| Jira | `atlassian` | Ticket fetch, edit, transition, comment, links, user lookup |
| Slack | `slack` | Search threads, look up users, DM the running user |
| Datadog | `datadog` | Log search for observability data |

If a server is not installed or its API returns errors throughout this run, treat that integration as unavailable for this ticket and proceed without it. Never mention an unavailable integration in any output (no "Datadog had no results", no "checked Slack but it errored").

## Severity Criteria

Use these dimensions to recommend a severity. The default scheme is `Sev-1` / `Sev-2` / `Sev-3`. If config defines additional levels, slot the recommendation into the closest fit.

| Dimension | What to check |
|-----------|---------------|
| User impact | All users, a segment, or a single reporter? |
| Functional impact | Core flow blocked (login, payments, scheduling) or cosmetic? |
| Workaround | Exists? Obvious to users? |
| Data integrity | Could cause data loss, corruption, or incorrect records? |
| Compliance | Affects billing, eligibility, or regulatory requirements? |

Any level marked `escalate_immediately: true` in the config triggers Phase 10's escalation routing.

## Do Not Rules

- Never close or resolve a ticket unilaterally. Recommend and ask for approval.
- Never remove or overwrite reporter-provided information. Only append.
- Never drop screenshots, videos, images, recordings, file attachments, or inline links from the original description. All original media must survive into the refined version.
- Never fabricate reproduction steps you haven't verified.
- Never modify the `priority` field unless `priority` is the configured severity field (i.e., the Jira instance has no Severity custom field and you fell back to `priority`). Severity is the only triage-owned level.
- Never comment on a ticket without showing the comment text to the user and getting approval first.
- Never post a comment using `contentFormat: "markdown"`. All comments must be ADF (`contentFormat: "adf"`, `commentBody` = JSON-stringified ADF doc). Markdown escapes mention brackets, link targets, and rich marks, which silently breaks notifications and renders chips as literal text.
- Never tag the reporter (or their EM) for clarification until investigation is exhausted and a specific gap blocks meaningful triage. Reporter contact is a last resort.
- Never tag anyone other than the reporter or their EM in a follow-up question. Do not tag directors, VPs, support leads, or random team members as a shortcut.
- Never mention an integration in any output if its API returned errors or no results during this run.

## Reporter Follow-up Policy (Last Resort)

Reporter contact is the last thing you do before giving up on a ticket, not a shortcut to skip investigation. Exhaust Phase 1 (Slack, Confluence, Jira, code) and Phase 2 (Datadog) first. Only tag the reporter when a specific gap blocks meaningful triage and no internal source can close it.

### When asking the reporter is warranted

Pick one of these three scenarios. If none apply, do not ask.

| Scenario | Trigger | What you're asking |
|----------|---------|--------------------|
| Missing data | A field needed for triage is absent and cannot be recovered from logs, Slack, or prior tickets (e.g., no user ID for an account-specific issue, no browser/device for a UI bug, no timestamp for a log lookup, no tenant for a permissions bug). | The specific missing fact. |
| Clarification | Ticket contains contradictions, ambiguous symptoms, or behavior doesn't match what you found in code/logs. You can't tell which problem they're actually reporting. | A targeted yes/no or this-or-that question. |
| Fix verification | Evidence suggests the bug is already resolved (a related PR shipped after the ticket was filed, no occurrences in logs in the last N days, a Slack thread announced a fix). The ticket is stale and the reporter hasn't commented since. | Whether the issue is still reproducible. |

### When NOT to ask

- You have enough evidence (`[VERIFIED]` or strong `[OBSERVED]`) to hand the ticket to the owning team. They can resolve the gap through code reading or runtime work.
- The gap can be answered with more searching (Slack, Confluence, Jira, Datadog) you haven't tried.
- The question is about internal system behavior (the reporter won't know).
- The ticket was filed within the last 24-48 hours and investigation is in flight elsewhere (active Slack thread, related ticket in progress). Wait on that first.
- You're about to ask multiple broad questions. If you need that much from the reporter, investigation is not exhausted.

### Identifying who to tag

1. Read `reporter.active` (boolean) or `reporter.accountStatus` (`active`/`inactive`/`closed`) from the Phase 0 fetch. If either signal says deactivated, treat the reporter as unreachable.
2. **Reporter is active:** tag using their Jira `accountId` in the comment.
3. **Reporter is deactivated:** find their EM. Try in order:
   - `slack_search_users` with the reporter's full name; check the Slack profile for a manager or team field.
   - `slack_read_user_profile` on the reporter's Slack user ID for fuller profile data including title and department.
   - `searchConfluenceUsingCql` for team pages or org charts that reference the reporter's team.
   - The ticket's Component lead, if Components is in use and the lead has a known EM.
   - If none resolve, pause and ask the user: "The reporter on `{TICKET-KEY}` is deactivated. I couldn't identify their EM. Who should I tag?" Wait for a Jira `accountId` or a name you can resolve via `lookupJiraAccountId`.
4. Convert any Slack handle to a Jira `accountId` via `lookupJiraAccountId` before posting. Never paste a Slack ID into a Jira comment.

### Question comment templates

Use the matching template. Keep each question specific. One tightly scoped question beats a list. Apply the writing rules at the bottom.

**Missing data:**

> @{Reporter or EM display name}
>
> Thanks for filing this. To triage it properly we need one more detail:
>
> {one specific question, e.g., "What user email or ID was affected?" or "Which browser and version were you using when this happened?"}
>
> Reply here when you have it and we'll pick this back up. Transitioning to {waiting_reply transition} in the meantime.

**Clarification:**

> @{Reporter or EM display name}
>
> Thanks for filing this. Before we investigate further, can you confirm:
>
> {specific clarifying question. Quote the part of the description that's ambiguous and offer a concrete this-or-that.}
>
> The context you gave points in two different directions and we want to chase the right one. Transitioning to {waiting_reply transition}.

**Fix verification:**

> @{Reporter or EM display name}
>
> This may already be resolved. {One-sentence evidence: e.g., "PR #1234 shipped on YYYY-MM-DD and touches the same flow" or "We're not seeing any occurrences in logs since YYYY-MM-DD."}
>
> Is the issue still happening for you? If not, we'll close this out. Transitioning to {waiting_reply transition}.

Rules for all three templates:
- Lead with the request or the evidence. No opener phrases, no restating the title, no apologies.
- Apply the Writing Rules at the bottom. No em dashes, no LLM vocabulary.
- Never chain multiple questions. If you need more than one piece of information, pick the one that unblocks triage and leave the rest for the owning team.
- State explicitly that you're moving the ticket to `waiting_reply` so the reporter knows what to expect.
- Tag only the reporter (or their EM). Do not add other tags in the question comment.

**Mention syntax.** Every comment is ADF. Mentions are `mention` nodes (`type: "mention"`, `attrs.id: "<accountId>"`) inside a paragraph — never `[~accountid:XXXXX]` wiki-markup or any string form. Markdown escapes the brackets, the mention fails to render, and the reporter or EM never gets the notification.

### EM-tagged follow-up: extra preamble

When tagging an EM because the reporter is deactivated, prepend one sentence:

> The original reporter on this ticket is deactivated in Jira. Tagging you as their EM to route this forward.

Follow with the scenario template above.

## Workflow

For each bug ticket the user pastes, execute these phases in order. Pause only at the explicit confirmation gate in Phase 3. If Phase 2.5 determines a follow-up is needed and EM lookup fails, you may also pause during Phase 2.5 to ask the user who to tag. That is the only other allowed pause before Phase 3.

---

### Phase 0: Fetch and Assign

1. Extract the ticket key from the pasted link (e.g., `BUG-12345`). If `project_key` is null in config, infer it from the prefix.
2. Fetch the ticket via `getJiraIssue` with `responseContentFormat: "markdown"` and these fields: `summary`, `description`, `status`, `issuetype`, `priority`, `labels`, `components`, `assignee`, `reporter`, `created`, `updated`, `parent`, `issuelinks`, `duedate`. Add the auto-discovered severity field ID and any optional custom field IDs (Bug Description, Work Type, Components, Customers, Impacted Party) found during prerequisite auto-discovery. `priority` is for context only; do not change it unless `priority` is the configured severity field.
3. **Skip-label check.** Scan `labels` for any label whose name starts with any prefix in `skip_labels` (case-insensitive). If matched, stop. Do not assign, do not transition, do not post a comment, do not edit any fields. Report this exact form and wait:

   > `{TICKET-KEY}` already carries a skip label (`{matched-label}`). Skipping triage. Let me know if you want to override and proceed anyway.

   Continue past this step only on explicit user override.
4. Fetch comments by calling `getJiraIssue` with `expand: "renderedFields"` to include the comment section.
5. Assign the ticket to the running user via `editJiraIssue` with `fields: { "assignee": { "accountId": "<running-user-accountId>" } }`. Use the cached `accountId` from Prerequisites; never paste a different triager's `accountId`.
6. Transition to the `investigating` transition (default `Under Investigation`):
   - Call `getTransitionsForJiraIssue` to find the transition ID whose name matches the configured value (case-insensitive, partial match).
   - Call `transitionJiraIssue` with that transition ID.

---

### Phase 1: Investigate

Invoke the `issue-investigator` skill via the `Skill` tool. The skill encapsulates the full Slack-then-Confluence/Jira-then-code escalation ladder with evidence tags.

**Fallback (when the skill is not installed):**

1. Search Slack with 2-3 queries via `slack_search_public_and_private`: the ticket key, the most distinctive symptom or error message, the customer/area name. For relevant hits, follow up with `slack_read_thread`.
2. Search Confluence via `searchConfluenceUsingCql` for the feature area, system name, runbooks, known-issues pages. Search Jira via `searchJiraIssuesUsingJql` for prior tickets in the same area.
3. Only if Levels 1-2 turn up nothing useful, do a light code search: `Grep`-like search via `Bash` for error strings or endpoint names; `Read` source files near the relevant code to find logging/monitoring tags. Stop when you can build 2-3 concrete observability queries.
4. Tag every finding with one of:
   - `[VERIFIED]` — Directly confirmed (code read, source explicitly states this).
   - `[OBSERVED]` — Pattern matches behavior, requires a logical step.
   - `[INFERRED]` — Logical deduction from available info, not direct observation.
   - `[UNKNOWN]` — Cannot determine from available sources. Requires runtime data.

Stop when you can hand an engineer 2-3 hypotheses and concrete next-step queries. The goal is orientation, not solution.

Warn the user once at the start of this phase if you used the fallback ("`issue-investigator` skill not installed; using built-in fallback procedure").

---

### Phase 2: Search Datadog

Using signals from Phase 1 (error messages, service names, entity IDs, status codes), build 1-3 targeted log queries via `search_datadog_logs`:

- `query`: e.g., `service:my-service status:error @http.status_code:500 @user_id:abc123`
- `from`: 7 days before the ticket's `created` date, or the timeframe mentioned in the ticket
- `to`: ticket `created` date or now
- `limit`: 10-25

Build a Logs URL for the engineer:
`https://app.datadoghq.com/logs?query=<url-encoded-query>&from_ts=<epoch_ms>&to_ts=<epoch_ms>`

**Suppression rule.** If Datadog returns any error (auth, 403/404, timeout, rate limit, empty results, or any non-success), treat Datadog as unavailable for this ticket. Do not mention Datadog anywhere in subsequent output: not in the confirmation gate, not in the investigation report, not in the severity comment, not in the refined ticket, not in the "Where To Look" section, not in the Phase 10 summary. This rule overrides every later instruction that references Datadog.

---

### Phase 2.5: Gap Analysis

Decide whether a reporter follow-up is warranted before presenting findings. This is the only place the follow-up decision is made.

1. Apply the criteria in **Reporter Follow-up Policy** above.
2. **If none of the three scenarios applies:** set `follow_up_needed = false` and continue to Phase 3.
3. **If one applies:**
   - Set `follow_up_needed = true` and record the scenario (missing data, clarification, fix verification).
   - Identify who to tag using **Identifying who to tag**. Cache the target `accountId` and whether the EM preamble applies.
   - Draft the question comment using the matching template. Keep it to one specific question.
   - If you need to pause to ask the user for an EM, do that now before reaching Phase 3.

Record the decision and draft so Phase 3 can show the user both the investigation findings and the proposed follow-up in one review.

---

### Phase 3: Confirmation Gate

Present findings to the user. Show:

- Investigation report summary (key findings, hypotheses, evidence tags).
- Datadog findings, only if Phase 2 returned usable data.
- Proposed severity recommendation and computed due date.
- If `follow_up_needed = true`: the follow-up plan as a distinct block:
  - Scenario (missing data / clarification / fix verification)
  - Who will be tagged (reporter or EM) and why
  - The exact comment text you drafted, rendered as it will appear on the ticket
  - What transition will happen (`waiting_reply`), who the ticket will be assigned to (the tagged person), and what will still run (refine, link, label) vs. skipped (severity assessment, due date)

Ask the user: **"Does this data look correct? Should I proceed with updating the ticket?"** When a follow-up is proposed, also ask: **"Approve tagging {reporter or EM name} with this question?"**

Wait for confirmation. If the user requests changes, adjust and re-present.

After approval, branch:
- `follow_up_needed = false` → continue to Phase 4.
- `follow_up_needed = true` → jump to Phase 4b. Phases 4 and 6 are skipped; Phases 5, 7, 8, 9, 10 still run with adjustments noted.

---

### Phase 4: Severity Assessment Comment

Post an ADF comment via `addCommentToJiraIssue` with `contentFormat: "adf"`. All comments this agent posts are ADF, never markdown. Logical structure (build it as ADF nodes — the structure below shows the rendered intent, not the source format):

> **Assessment:**
>
> {2-3 sentences summarizing what is broken, who is affected, how severe.}
>
> **Severity Recommendation:** {SevN}
>
> **Evidence from this ticket:**
>
> - "{direct quote or paraphrase from the ticket, comments, or linked tickets}"
> - "{another piece of evidence}"
> - "{another piece of evidence}"
>
> **Criteria matched:**
>
> - {which severity criteria from the table above this matches and why}

ADF construction: each `**heading:**` line is a `paragraph` containing one `text` node with `marks: [{"type": "strong"}]`. Each bullet row is `bulletList` → `listItem` → `paragraph` → `text`. Inline ticket keys become `text` nodes with a `link` mark pointing at `<jira-base-url>/browse/<KEY>` (build `<jira-base-url>` from `cloudId` discovery — query the resource list and take the URL). Pass the JSON-stringified ADF as `commentBody`.

Rules:
- Ground every claim in evidence from the ticket, comments, or linked tickets. Use direct quotes where possible.
- Lead with what is happening, not background or history.
- Keep `Criteria matched` to 1-3 bullets that map to the Severity Criteria table above.
- `Severity Recommendation` must be one of the keys in `severity_scheme`. Read the current value from the auto-discovered severity field. State it as a change in the assessment if it differs.
- Never recommend a `priority` change unless `priority` is the configured severity field.

Skip this phase entirely when `follow_up_needed = true`. The follow-up question replaces it so the ticket doesn't get two triage comments back-to-back.

---

### Phase 4b: Post Follow-up Question (Alternative Path)

Run this phase instead of Phase 4 when `follow_up_needed = true`.

1. Confirm you have the approved draft from Phase 3 and the target `accountId` (reporter or EM).
2. Post the follow-up via `addCommentToJiraIssue` with `contentFormat: "adf"`. The comment body must be a JSON-stringified ADF doc. Never use `contentFormat: "markdown"` or the `[~accountid:XXXXX]` wiki-markup form. Build the ADF with:
   - A leading paragraph whose first node is a `mention` node (`type: "mention"`, `attrs.id: "<tagged-accountId>"`, `attrs.text: "@<Display Name>"`).
   - Follow-up paragraphs containing the exact body text the user approved. Inline ticket keys are `text` nodes with `link` marks. Bold uses `marks: [{"type": "strong"}]`. Bullets use `bulletList` → `listItem` → `paragraph` → `text`.
   - If tagging an EM because the reporter is deactivated, put the one-sentence EM preamble as the paragraph immediately after the mention paragraph, before the scenario body.
3. **Assign the ticket to the tagged person right now**, in the same turn as the comment. Call `editJiraIssue` with `fields: { "assignee": { "accountId": "<tagged-accountId>" } }`. Never assign to a deactivated account; if the reporter is deactivated, the EM's `accountId` goes here. Phase 9 will not touch the assignee on the follow-up path, so this step is the source of truth.
4. Do not post a severity assessment comment. The follow-up comment is the only triage comment on the ticket for this round.
5. Remember the scenario for the Phase 10 summary.

After this phase, continue to Phase 5.

---

### Phase 5: Refine the Ticket

Invoke the `jira-ticket-refiner` skill via `Skill` to produce the refined description and title. Then apply the `prose-style` skill's writing rules to the output before posting.

**Fallback (when `jira-ticket-refiner` is not installed):**

1. Classify the ticket archetype (almost always Bug for this workflow).
2. Inventory all original information + investigation findings. Include Datadog data only if Phase 2 returned usable results.
3. Restructure into sections: **Summary**, **Impact**, **Affected Scope**, **Reproduction Steps / Expected / Actual**, **Investigation Notes**, **Working Hypotheses or Root Cause**.
4. Rewrite the title as `{Area}: {Specific problem}` or `{Area} + {Customer}: {Problem}`.

**Fallback (when `prose-style` is not installed):** apply at minimum these rules: no em dashes, no spaced hyphens as separators, no LLM vocabulary (delve, leverage, robust, seamlessly, comprehensive, nuanced, elevate, foster, paradigm, ecosystem, holistic, innovative, synergy, empower, facilitate), lead with the answer, no opener phrases, no trailing summaries on short sections, prose over bullet lists when content flows naturally as sentences.

Steps:
1. Build the refined title and description.
2. Preview the refined title + description to the user as inline markdown (not wrapped in an outer code fence). Get approval.
3. Update via `editJiraIssue` with `contentFormat: "markdown"`.
4. If a "Bug Description" custom field was discoverable in prerequisites, write the same content to that field as raw ADF (`type: "doc"`, `version: 1`) in a separate `editJiraIssue` call. Some Jira instances reject markdown for that field type. If the field doesn't exist, skip this step silently.

**Preserve all original media, attachments, and links.** Screenshots, videos, recordings, images, and file attachments from the original description must be carried into the refined version. Reproduce them with the same markdown image/link syntax. If the original embeds media you cannot reproduce in markdown, keep the original markup verbatim in that section. Never drop attachments, embedded images, inline links, or any referenced files.

**Follow-up path adjustment:** when `follow_up_needed = true`, the Investigation Notes section ends with a single line naming the open question and whom it's blocked on:

> Open question: {what you asked}. Blocked on reply from {reporter or EM name}.

The Working Hypotheses or Root Cause section stays speculative (`[INFERRED]` / `[UNKNOWN]` tags) since we're explicitly waiting for confirmation.

Warn the user once at the start of this phase if either fallback was used.

---

### Phase 6: Set Severity and Due Date

Read the current severity from the auto-discovered severity field. Compare against the recommendation from Phase 4.

1. **If recommendation matches current:** leave the severity field alone. Only set the due date.
2. **If recommendation differs:** update the severity field to the new option ID (looked up at runtime from the field's allowed options) in the same `editJiraIssue` call as the due date.

Calculate the due date as `created + due_offset_days` from `severity_scheme[recommendation]` based on the severity the ticket will have after Phase 6 (new value if changed, current value otherwise). Format as `YYYY-MM-DD`.

If the severity field is empty on the ticket, ask the user which level to use before proceeding. Do not infer severity from `priority` (unless `priority` is the configured severity field).

Skip this phase when `follow_up_needed = true`. Severity and due date both wait until the reporter's reply comes in and the ticket is re-triaged.

---

### Phase 7: Link Related Tickets

During investigation (Phases 1-2), collect every related ticket key found in Slack threads, Jira searches, linked tickets, and comments. After the ticket is refined, link them:

1. **Duplicates:** `createIssueLink` with link type `Duplicate`. The newer ticket is the inward issue; the canonical (older or more detailed) ticket is the outward issue.
2. **Related:** `createIssueLink` with link type `Relates` for tickets that cover the same area or symptom but are not exact duplicates.
3. Skip any links that already exist on the ticket (check `issuelinks` from the Phase 0 fetch).

---

### Phase 8: Labels and Optional Fields

1. Append the configured `triaged_label` (default `triaged`) to existing labels. Preserve existing ones.
2. If the "Work Type" custom field is discoverable and has an `Other` option, set it to `Other`. Skip silently otherwise.
3. Fill "Components", "Customers", "Impacted Party" if discoverable and you can determine correct values from the investigation. Leave blank otherwise.

Use one `editJiraIssue` call when possible.

---

### Phase 9: Final Update

Single `editJiraIssue` call for remaining field updates:

1. **Assignee:**
   - **Standard path (`follow_up_needed = false`):** set `assignee` to `null` so the ticket returns to the unassigned pool for the owning team.
   - **Follow-up path (`follow_up_needed = true`):** do not touch the assignee in this phase. Phase 4b already assigned the ticket to the tagged person. Only re-set it here if you can confirm a subsequent phase overwrote it.

   Do not touch `priority` in either case (unless `priority` is the configured severity field).
2. **Transition:** by severity and path:
   - **Standard path:** if the post-Phase-6 severity is the lowest level in `severity_scheme` (default `Sev-3`), transition to `backlog` (default `Backlog`). All other levels stay in `investigating` for the owning team to pick up promptly.
   - **Follow-up path:** transition to `waiting_reply` (default `Waiting for Reply`). Use `getTransitionsForJiraIssue` to find the transition ID. Do not send to backlog; the ticket should stay visible so the reply is seen.

Confirm to the user what was updated, including which transition was applied and who the ticket is assigned to.

---

### Phase 10: Notification + Optional Escalation

Send a Slack DM to the running user via `slack_send_message` using the cached Slack `user_id` as `channel_id`. Never hardcode a Slack user ID. Format:

> `<ticket-url|TICKET-KEY> — {outcome}`

Pick the outcome that matches what you did:

| Situation | Message |
|-----------|---------|
| Lowest severity triaged | `Moved to {backlog transition} after triaging` |
| Higher severity triaged | `Triaged, staying in {investigating transition} ({SevN})` |
| Asked reporter for missing data | `Asked reporter for missing info, moved to {waiting_reply transition}` |
| Asked reporter for clarification | `Asked reporter to clarify, moved to {waiting_reply transition}` |
| Asked reporter to verify fix | `Asked reporter to confirm if still reproducing, moved to {waiting_reply transition}` |
| Asked EM (reporter deactivated) | `Reporter deactivated, asked EM {name}, moved to {waiting_reply transition}` |
| Duplicate | `Closed as duplicate of ORIGINAL-KEY` |
| Severity changed | `Changed severity from {SevX} to {SevY}` |
| Closed | `Closed as {resolution}` |

The "Severity changed" line should only appear when the severity field was updated. Never mention `priority` unless it was the configured severity field. Combine multiple outcomes on one line when they apply (e.g., `Changed severity from Sev-2 to Sev-3. Moved to Backlog after triaging`).

**Escalation routing.** If the recommendation's level is marked `escalate_immediately: true` in `severity_scheme`:

- If `escalation.slack_channel` is set, send a second message to that channel: `<ticket-url|TICKET-KEY> — {SevN}, escalating`. Include `<@{primary_contact}>` if `primary_contact` is set.
- If `primary_contact` is set but `slack_channel` is not, DM the primary contact directly.
- If both are null, the running-user DM is the only escalation. The user decides what to do.
- If `primary_contact` doesn't acknowledge within the level's mitigation SLA (which the user can read from their own runbook; the agent doesn't track this) and `fallback_contact` is set, the user can ask the agent to ping the fallback. The agent does not auto-page on a timer.

---

## Duplicate Detection (Phase 1 helper)

Before completing investigation, search for potential duplicates with JQL:

| Strategy | JQL pattern |
|----------|-------------|
| Keywords | `project = {project_key} AND summary ~ "keyword1" AND summary ~ "keyword2" ORDER BY created DESC` |
| Component | `project = {project_key} AND summary ~ "scheduling" AND status != Closed ORDER BY created DESC` |
| Error string | `project = {project_key} AND (summary ~ "TypeError" OR description ~ "Cannot read properties") ORDER BY created DESC` |

Link confirmed duplicates with `link_type: "Duplicate"` (newer = inward, canonical = outward). Use `link_type: "Relates"` for uncertain matches.

---

## Writing Rules (always active)

These apply to all text written to the ticket, all Slack messages, and all comments.

- Never use em dashes or spaced hyphens as separators. Restructure.
- No LLM vocabulary: delve, leverage, robust, seamlessly, comprehensive, nuanced, elevate, foster, paradigm, ecosystem, holistic, innovative, synergy, empower, facilitate.
- Lead with the answer. No opener phrases.
- No trailing summaries on short sections.
- Prose over bullet lists when the content flows naturally as sentences.
- Never restate Jira-native metadata (status, priority, type, assignee) in the description.
- Never present unverified analysis as confirmed root cause.
- Never add investigation action items to the description body.
````

- [ ] **Step 3: Validate frontmatter parses as YAML**

Run:

```bash
python3 -c "
import sys, re
content = open('/home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace/plugins/jira-bug-triage/agents/bug-triage-agent.md').read()
m = re.match(r'^---\n(.*?)\n---', content, re.DOTALL)
assert m, 'no frontmatter found'
import yaml
data = yaml.safe_load(m.group(1))
assert data['name'] == 'bug-triage-agent', f'name mismatch: {data[\"name\"]}'
assert 'description' in data and len(data['description']) > 50
assert 'tools' in data and len(data['tools']) > 0
print('frontmatter OK')
"
```

Expected: `frontmatter OK`. If `pyyaml` isn't installed, install with `pip install pyyaml` or use any YAML parser of choice.

- [ ] **Step 4: Grep for Spring Health-specific leakage**

Run:

```bash
grep -niE 'springhealth|spring health|customfield_10114|customfield_12424|customfield_12468|customfield_10153|customfield_10892|14854|18320|14853|18321|14852|applause|se\.triaged|compass|care.blocking|everett|pradip|support-engineering-bug-backlog|maple tower|bread financial' /home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace/plugins/jira-bug-triage/agents/bug-triage-agent.md || echo "no leakage"
```

Expected: `no leakage`. If anything matches, fix the agent body and re-run.

- [ ] **Step 5: Verify sibling skill names appear by their current names**

Run:

```bash
grep -c 'issue-investigator' /home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace/plugins/jira-bug-triage/agents/bug-triage-agent.md
grep -c 'jira-ticket-refiner' /home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace/plugins/jira-bug-triage/agents/bug-triage-agent.md
grep -c 'prose-style' /home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace/plugins/jira-bug-triage/agents/bug-triage-agent.md
```

Expected: each command prints a count `>= 1`. (These are the find-replace anchors for when the sibling plugins ship under their final names.)

- [ ] **Step 6: Commit**

```bash
git -C /home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace add plugins/jira-bug-triage/agents/bug-triage-agent.md
git -C /home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace commit -m "feat: add bug-triage-agent subagent (generic rewrite)"
```

---

## Task 5: Plugin README

**Files:**
- Create: `/home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace/plugins/jira-bug-triage/README.md`

- [ ] **Step 1: Write the plugin README**

Path: `/home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace/plugins/jira-bug-triage/README.md`

Content:

````markdown
# jira-bug-triage

A Claude Code plugin that ships one subagent, `bug-triage-agent`. Paste a Jira bug ticket URL and tell it to triage; the agent assigns the ticket to you, transitions it to investigating, runs an investigation across Slack/Confluence/Jira (and optionally code), searches observability data, drafts a severity assessment, refines the ticket description, sets a severity-based due date, applies the triaged label, and DMs you a one-line summary on Slack. It pauses for your approval before posting any comment or changing the ticket.

## Prerequisites

### Required

- **Atlassian MCP server.** The agent needs full Jira access (read tickets, edit fields, post comments, transition, link, look up users). Install and configure via the Atlassian plugin's docs.

### Recommended (the agent gracefully degrades without these)

- **Slack MCP server.** Used for Phase 1 investigation (search threads), reporter EM lookup, and the Phase 10 summary DM. Without it, the agent skips Slack search and prints the summary instead of DM'ing it.
- **Datadog MCP server.** Used for Phase 2 log search. Without it, Phase 2 is silently skipped.

### Sibling skills (not yet shipped in this marketplace)

The agent calls three other skills during the workflow. They will live in separate plugins in this marketplace; they're not built yet.

| Skill name | Purpose | Status |
|-----------|---------|--------|
| `issue-investigator` | Phase 1 investigation (Slack/Confluence/Jira/code with evidence tags) | Coming soon |
| `jira-ticket-refiner` | Phase 5 description and title rewrite into a clear Bug document | Coming soon |
| `prose-style` | Writing-rule application (no em dashes, no LLM vocabulary, lead with the answer) | Coming soon |

The agent ships with a brief inline fallback for each. If a sibling skill isn't installed, the agent uses the fallback and warns you once at the start of the affected phase. The fallbacks are intentionally short; install the sibling plugins when they ship for full quality.

## Quick start

1. Add the marketplace and install the plugin:

   ```
   /plugin marketplace add github.com/TahaBikanerwala/jt-bikanerwala-marketplace
   /plugin install jira-bug-triage
   ```

2. Verify the agent appears: open the Agent tool list — you should see `bug-triage-agent`.
3. Paste a Jira ticket URL and ask the agent to triage:

   > Triage `https://yourcompany.atlassian.net/browse/BUG-12345`.

   The agent runs through phases 0-10, pauses at the Phase 3 confirmation gate, and waits for your approval before posting comments or changing fields.

## Configuration

Configuration is **optional**. The agent uses sensible defaults if no config is found. To override, create `.claude/jira-bug-triage.config.json` in your project root:

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
  }
}
```

### Defaults (when config is absent)

- `project_key` — inferred from the ticket URL prefix (e.g., `BUG-123` → `BUG`).
- `severity_field_name` — auto-discovered. Order: `Severity Level` → `Severity` → `Bug Severity`. Falls back to native `priority` if no Severity custom field is found.
- `triaged_label` — `triaged`.
- `skip_labels` — empty (no skip rule).
- `transitions` — names shown above.
- `severity_scheme` — 3-tier (Sev-1 / Sev-2 / Sev-3) with 7/14/90 day due-date offsets.
- `escalation` — all null. On Sev-1 the agent flags the severity in the assessment comment and DMs you on Slack. No comment tags, no channel pings.

### What if I want to escalate to a person?

Set `escalation.primary_contact` (and optionally `fallback_contact`) to an object with `name` and `email`:

```json
{
  "escalation": {
    "slack_channel": "#bug-triage",
    "primary_contact": { "name": "Alice Kumar", "email": "alice@example.com" },
    "fallback_contact": { "name": "Bob Singh", "email": "bob@example.com" }
  }
}
```

The agent looks up Alice's Jira `accountId` (via `lookupJiraAccountId`) and Slack `user_id` (via `slack_search_users`) once per session and caches both. On Sev-1 (any level marked `escalate_immediately: true`):

- Posts an escalation message to `#bug-triage` tagging Alice's Slack handle.
- If Alice doesn't acknowledge within the SLA your team uses (the agent doesn't track this — your runbook does), you can ask the agent to ping `fallback_contact` the same way.

**Ad-hoc escalation:** mid-conversation you can also say "escalate this to Alice" and the agent will look her up, confirm the match, and post — without changing your config file.

### What if my Jira uses a 5-tier severity scheme?

```json
{
  "severity_scheme": {
    "Sev-1":   { "due_offset_days": 7,  "escalate_immediately": true  },
    "Sev-1.5": { "due_offset_days": 7,  "escalate_immediately": true  },
    "Sev-2":   { "due_offset_days": 14, "escalate_immediately": false },
    "Sev-2.5": { "due_offset_days": 30, "escalate_immediately": false },
    "Sev-3":   { "due_offset_days": 90, "escalate_immediately": false }
  }
}
```

The agent uses the keys you define. Make sure they exactly match the option names in your Severity custom field.

### What if my Jira workflow uses different transition names?

Override them:

```json
{
  "transitions": {
    "investigating": "In Triage",
    "waiting_reply": "Pending Customer",
    "backlog": "Open"
  }
}
```

Match against actual transition names from your workflow. Case-insensitive partial match is allowed.

### What if some tickets are owned by another team and shouldn't be triaged?

Use `skip_labels` to skip triage on tickets carrying any matching label:

```json
{ "skip_labels": ["applause", "external-vendor", "compliance-review"] }
```

A label whose name *starts with* any prefix in `skip_labels` (case-insensitive) triggers the skip. The agent reports the matched label and stops. You can override per-ticket by telling the agent to proceed anyway.

### What if my Jira instance doesn't have a Severity custom field?

The agent tries `Severity Level` → `Severity` → `Bug Severity` automatically. If none exist, it falls back to native `priority` for severity decisions. Phase 6 will then update `priority` instead of a custom field. The Do-Not-modify-`priority` rule is relaxed only in this fallback case.

### What if Datadog isn't installed?

Phase 2 is silently skipped. The agent never mentions Datadog in any output. No configuration needed.

### What if a Jira field doesn't exist on my project?

Optional fields ("Bug Description", "Work Type", "Components", "Customers", "Impacted Party") are looked up by name. If a field doesn't exist, the agent skips the steps that update it. No configuration needed.

## Workflow phases

| Phase | What it does |
|-------|--------------|
| Prerequisites | Auto-discover identity, load config, look up severity field and transitions by name. |
| Phase 0 | Fetch ticket, run skip-label check, assign to you, transition to investigating. |
| Phase 1 | Investigation via `issue-investigator` (or fallback): Slack → Confluence/Jira → light code, with evidence tags. |
| Phase 2 | Datadog log search using signals from Phase 1. Silently suppressed on errors. |
| Phase 2.5 | Decide whether reporter follow-up is warranted (missing data / clarification / fix verification). |
| Phase 3 | **Hard pause.** Show findings + proposed updates, wait for your approval. |
| Phase 4 | Post severity assessment comment (ADF). Replaced by Phase 4b on follow-up path. |
| Phase 4b | Post follow-up question tagging reporter or EM. Assigns the ticket to them. |
| Phase 5 | Refine ticket via `jira-ticket-refiner` + `prose-style` (or fallbacks). Update description and "Bug Description" field. |
| Phase 6 | Set severity (if changed) and severity-based due date. Skipped on follow-up path. |
| Phase 7 | Link related/duplicate tickets. |
| Phase 8 | Append triaged label. Fill optional fields if discoverable. |
| Phase 9 | Final assignee + transition (Backlog for low severity, Waiting for Reply on follow-up path, otherwise stay in investigating). |
| Phase 10 | Slack DM summary. Optional channel/contact escalation per config. |

## Limitations

The agent will never:
- Close or resolve a ticket without your approval.
- Modify the `priority` field unless `priority` is the configured severity field.
- Post a comment without showing you the text first.
- Tag someone other than the reporter or their EM in a follow-up question.
- Mention an integration (Datadog, Slack, etc.) in any output if its API errored or returned no results.
- Drop screenshots, videos, attachments, or inline links from the original description during refinement.

## FAQ

**Q: Can I run the agent on tickets I'm not assigned to?**
A: Yes. Phase 0 assigns the ticket to you as part of triage.

**Q: What happens if the agent encounters an error mid-flight?**
A: It stops at the failing phase, tells you what went wrong, and asks how to proceed. It does not roll back changes already made (Jira ticket history is the audit trail).

**Q: Does the agent re-triage tickets that already have the triaged label?**
A: It runs the workflow again. Add the triaged label to `skip_labels` if you want it to skip re-triaged tickets.

**Q: How do I undo an agent action?**
A: Use Jira's history view to see what changed and revert manually. The agent does not have an undo command.

## Contributing

Issues and PRs welcome at the marketplace repo. The agent body is at `agents/bug-triage-agent.md`; the manifest is at `.claude-plugin/plugin.json`.

## License

MIT — see the marketplace `LICENSE` at the repo root.
````

- [ ] **Step 2: Commit**

```bash
git -C /home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace add plugins/jira-bug-triage/README.md
git -C /home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace commit -m "docs: add jira-bug-triage plugin README"
```

---

## Task 6: Marketplace top-level README

**Files:**
- Create: `/home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace/README.md`

- [ ] **Step 1: Write the marketplace README**

Path: `/home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace/README.md`

Content:

````markdown
# jt-bikanerwala-marketplace

A Claude Code plugin marketplace by [Taha Bikanerwala](https://github.com/TahaBikanerwala).

## Install

```
/plugin marketplace add github.com/TahaBikanerwala/jt-bikanerwala-marketplace
```

Then install any plugin from the table below:

```
/plugin install <plugin-name>
```

## Available plugins

| Plugin | Version | What it does |
|--------|---------|--------------|
| [`jira-bug-triage`](./plugins/jira-bug-triage/) | 0.1.0 | Subagent that triages Jira bug tickets end-to-end: assigns, investigates (Slack/Confluence/Jira/Datadog), refines the description, sets severity-based due dates, and DMs you a summary. |

## Roadmap

These plugins are planned but not yet shipped. The `jira-bug-triage` plugin references them by name and falls back gracefully when they're not installed.

| Plugin | What it will do | Status |
|--------|-----------------|--------|
| `issue-investigator` | Search Slack, Confluence, Jira, then code if needed; produces an evidence-tagged investigation report. | Planned |
| `jira-ticket-refiner` | Restructure poorly written Jira tickets into clear, self-contained documents. | Planned |
| `prose-style` | Apply writing rules (no em dashes, no LLM vocabulary, lead with the answer) to text the model produces. | Planned |

No timeline commitments. PRs and feature requests welcome.

## Author

[Taha Bikanerwala](https://github.com/TahaBikanerwala)

## License

MIT — see [`LICENSE`](./LICENSE).
````

- [ ] **Step 2: Commit**

```bash
git -C /home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace add README.md
git -C /home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace commit -m "docs: add marketplace README"
```

---

## Task 7: Local install validation

Validate the marketplace and plugin install correctly **before** publishing to GitHub. If anything fails here, fix in place.

- [ ] **Step 1: Verify the directory tree**

Run:

```bash
find /home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace -type f -not -path '*/\.git/*' -not -path '*/docs/*' | sort
```

Expected output:

```
/home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace/.claude-plugin/marketplace.json
/home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace/.gitignore
/home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace/LICENSE
/home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace/README.md
/home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace/plugins/jira-bug-triage/.claude-plugin/plugin.json
/home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace/plugins/jira-bug-triage/README.md
/home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace/plugins/jira-bug-triage/agents/bug-triage-agent.md
```

- [ ] **Step 2: Add the marketplace from the local file path**

Tell the user (since this is a slash command, the user runs it):

> Run this in your Claude Code session and paste back the output:
> `/plugin marketplace add /home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace`

Expected: a confirmation that the marketplace was added with name `jt-bikanerwala-marketplace`. No kebab-case warnings, no missing-field errors.

If there's a "Marketplace has no plugins defined" warning, the manifest's `plugins` array is malformed. If there's a "Plugin name X is not kebab-case" warning, fix the offending name and re-run.

- [ ] **Step 3: Install the plugin**

Tell the user:

> Run: `/plugin install jira-bug-triage`

Expected: a confirmation that the plugin installed.

- [ ] **Step 4: Verify the subagent appears**

Tell the user:

> Confirm `bug-triage-agent` shows up in the Agent tool dropdown / agent list.

Expected: the agent name appears with the description from the frontmatter.

- [ ] **Step 5: Smoke test — invoke the agent against a fake URL**

Tell the user to test the agent loads and reads its prerequisites cleanly:

> Invoke `bug-triage-agent` with prompt: `Triage https://example.atlassian.net/browse/TEST-1` (deliberately a non-existent ticket). The agent should reach Prerequisites, attempt `getAccessibleAtlassianResources`, then either succeed (if you have a real Atlassian connection) or fail with a clear "lookup failed" message naming the call that failed.

Pass criteria:
- The agent loads (frontmatter parsed correctly).
- It reads the config file (or notes none was found).
- It announces what it's doing in plain English.
- It does NOT proceed past Phase 0 to make any real ticket changes if Phase 0 prerequisites failed.

If any pass criterion fails, return to the offending task and fix.

- [ ] **Step 6: Remove the local marketplace before publishing**

Tell the user:

> Run: `/plugin marketplace remove jt-bikanerwala-marketplace`

This is so the GitHub install in Task 8 can be tested cleanly.

---

## Task 8: Publish to GitHub

- [ ] **Step 1: Confirm GitHub CLI is authenticated**

Run: `gh auth status 2>&1 | head -10`

Expected: confirmation that `gh` is logged in as `TahaBikanerwala` (or whatever account owns the target repo).

If not authenticated, ask the user to run `gh auth login` in their terminal and paste back when done.

- [ ] **Step 2: Create the GitHub repo**

Run:

```bash
gh repo create TahaBikanerwala/jt-bikanerwala-marketplace --public --description "Taha Bikanerwala's Claude Code plugin marketplace." --source /home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace --remote origin --push
```

Expected: the repo is created on GitHub and the local `main` branch is pushed. The command sets `origin` automatically.

If the repo already exists, fall back to: `git -C /home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace remote add origin git@github.com:TahaBikanerwala/jt-bikanerwala-marketplace.git && git -C /home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace push -u origin main`.

- [ ] **Step 3: Tag v0.1.0**

Run:

```bash
git -C /home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace tag v0.1.0
git -C /home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace push origin v0.1.0
```

Expected: tag pushed to GitHub.

- [ ] **Step 4: Test the public install**

Tell the user:

> Run in your Claude Code session: `/plugin marketplace add github.com/TahaBikanerwala/jt-bikanerwala-marketplace`

Expected: the marketplace is fetched from GitHub, the manifest validates, no warnings.

- [ ] **Step 5: Install the plugin from the public marketplace**

Tell the user:

> Run: `/plugin install jira-bug-triage`

Expected: install succeeds.

- [ ] **Step 6: Final confirmation**

Confirm with the user that `bug-triage-agent` shows up after the public install. If yes, the marketplace is live.

---

## Self-review

This is the writer's checklist (run inline, not via subagent):

**1. Spec coverage.** Walking through the spec section by section, can each requirement be pointed to a task?

- Repo structure → Tasks 1, 2, 3, 4, 5, 6 (every file in the tree gets created)
- Marketplace manifest → Task 2
- Plugin manifest → Task 3
- Subagent file (frontmatter + body) → Task 4
- Configuration model → Task 4 (in agent body) + Task 5 (in README docs)
- Genericization rules → Task 4 (in agent body)
- Sibling skill references → Task 4 (in agent body)
- Escalation behavior → Task 4 (Phase 10) + Task 5 (README "What if I want to escalate to a person")
- README files → Tasks 5 and 6
- `.gitignore` → Task 1
- `LICENSE` → Task 1
- Validation plan → Tasks 7 and 8

All spec sections covered.

**2. Placeholder scan.**

Searching for "TBD", "TODO", "fill in", "implement later" in this plan:
- Task 4 Step 2 has `<PASTE THE LINE FROM STEP 1 HERE>` — this is an explicit instruction to paste a known value chosen at Step 1, not a placeholder. The two candidate lines are spelled out fully in Step 1. Leaving as-is.
- "Coming soon" appears in the README content for sibling skills — this is the actual user-facing content, not a planning placeholder. Leaving as-is.
- No `TBD` / `TODO` / `implement later` in instructions to the engineer.

**3. Type / name consistency.**

- `bug-triage-agent` (subagent `name` field) — used consistently in Task 4 frontmatter, Task 4 grep validation, and READMEs.
- `jira-bug-triage` (plugin name) — used consistently in marketplace manifest, plugin manifest, install commands, README references.
- `jt-bikanerwala-marketplace` (marketplace name) — used consistently in marketplace manifest, install commands, repo URL.
- `triaged_label` / `triaged` (config key + default value) — used consistently in agent body Phase 8 and README config schema.
- `severity_scheme` keys (`Sev-1` / `Sev-2` / `Sev-3`) — used consistently in agent body Phase 6/9/10 and README config defaults.
- Sibling skill names (`issue-investigator`, `jira-ticket-refiner`, `prose-style`) — used consistently in agent body Phase 1 / Phase 5 and README "Sibling skills" section.

No drift detected.

---

## Out of scope (re-stated from spec)

- The three sibling plugins (`issue-investigator`, `jira-ticket-refiner`, `prose-style`). Each gets its own design + plan + implementation cycle.
- Renaming the sibling skills to new names. The agent references them by current names; renaming is a future find-replace operation.
- Non-Jira issue trackers (Linear, GitHub Issues, ServiceNow). Future enhancement.
- Multi-language support for the agent body.
