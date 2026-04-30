# issue-investigator Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the `issue-investigator` skill to the `jira-bug-triage` plugin (nested at `plugins/jira-bug-triage/skills/issue-investigator/SKILL.md`), update the four files that referenced it as a future separate plugin, bump the plugin version to 0.2.0, and tag the marketplace `v0.2.0`.

**Architecture:** Single new SKILL.md file (read-only investigation procedure: 4-level search ladder, 4-tag evidence model, 6-section bug-archetype report template). Five existing files get small targeted edits to reflect the architectural revision (skill is now bundled, not a separate plugin). One new design-doc note appended to the original marketplace design.

**Tech Stack:** Markdown (skill body, READMEs), JSON (plugin manifest), `python3 + yaml` for frontmatter validation, `git` + `gh` for tagging and pushing.

**Working directory:** `/home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace/` (existing repo on `main`, last commit `8799f75` on the marketplace launch v0.1.0).

**Source spec:** `docs/superpowers/specs/2026-04-30-issue-investigator-design.md` (already committed at the latest commit).

---

## Task 1: Write the SKILL.md

**Files:**
- Create: `/home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace/plugins/jira-bug-triage/skills/issue-investigator/SKILL.md`

- [ ] **Step 1: Create the skill directory**

Run: `mkdir -p /home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace/plugins/jira-bug-triage/skills/issue-investigator`

- [ ] **Step 2: Write the SKILL.md**

Path: `/home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace/plugins/jira-bug-triage/skills/issue-investigator/SKILL.md`

Content (exact, byte-for-byte):

````markdown
---
name: issue-investigator
description: "Investigates a Jira bug ticket by searching Slack, the ticket and related Jira/Confluence pages, Datadog, and the codebase, then writes an evidence-tagged report in the bug-archetype template. Use when a Jira bug ticket needs an investigation report before triage decisions are made."
metadata:
  author: Taha Bikanerwala
tools: Read, Bash, Grep, mcp__plugin_atlassian_atlassian__getJiraIssue, mcp__plugin_atlassian_atlassian__searchJiraIssuesUsingJql, mcp__plugin_atlassian_atlassian__searchConfluenceUsingCql, mcp__plugin_slack_slack__slack_search_public_and_private, mcp__plugin_slack_slack__slack_read_thread, mcp__datadog__search_datadog_logs
---

# Issue Investigator

Produce a structured report that orients an engineer for a Jira bug ticket. The report names what is broken, ranks 2-3 hypotheses, lists concrete next-step queries, and tags every claim with its evidence level.

This skill investigates. It does not solve, post, or modify anything.

## Calling Convention

This skill runs without user interaction. The constraints below let it work cleanly inside the bug-triage agent (which has its own confirmation gate) and standalone.

- **Non-interactive.** Never ask the user a question. Inputs are inferred from the ticket and search results.
- **Predictable structure.** Same six section headers every run, in the same order, with one allowed reorder for production incidents (see Adaptation Rules).
- **Same evidence tags.** Always `[VERIFIED]`, `[OBSERVED]`, `[INFERRED]`, `[UNKNOWN]`.
- **Output is the last thing.** Skill ends after the report renders. No follow-up prompts.
- **Read-only.** No `editJiraIssue`, no `addCommentToJiraIssue`, no `slack_send_message`. Posting is the caller's job.

## Search Ladder

Investigation runs four levels top to bottom. Each level has a gate: if it produces enough evidence to write a useful report, skip the remaining levels.

### Level 1: Slack

Run 2-3 queries via `slack_search_public_and_private`:

1. The ticket key (e.g., `BUG-12345`).
2. The most distinctive symptom or error message.
3. The customer or area name combined with a key term.

For each relevant hit, follow the thread in full with `slack_read_thread`.

What you are looking for:
- An engineer who already identified the root cause.
- A workaround that was shared.
- A specific service, config setting, or deploy named as the culprit.
- Links to relevant PRs, commits, or Jira tickets.

**Gate:** if a Slack thread contains a confirmed root cause or workaround, write the report citing that thread and skip Levels 2-4.

### Level 2: Ticket + Jira + Confluence

Re-read the ticket itself first. Signals are often missed on a quick first pass: error messages, timestamps, customer names, browser/device, the question the reporter is actually asking.

Then search:

- **Jira related tickets** via `searchJiraIssuesUsingJql`. Common patterns:
  - `project = "<project>" AND text ~ "<error string>" ORDER BY created DESC`
  - `project = "<project>" AND summary ~ "<feature area>" AND status != Closed ORDER BY created DESC`
  - `project = "<project>" AND component = "<component>" ORDER BY created DESC`
- **Linked tickets.** Follow every `issuelinks` entry from the original `getJiraIssue` payload.
- **Confluence** via `searchConfluenceUsingCql`. Look for runbooks, architecture pages, known-issues pages, onboarding docs. Use the feature area, system name, or entity type as the search term.

For each related Jira ticket, record: key, summary, status, assignee, the most relevant finding from description or comments.
For each Confluence page, record: URL and a 1-line summary.

**Gate:** if a runbook describes the exact scenario or a prior Jira ticket has the resolution, write the report pointing at that source. Skip Levels 3-4.

### Level 3: Datadog

Build queries from signals collected in Levels 1-2: error strings, service names, entity IDs, HTTP status codes.

Call `search_datadog_logs` with:
- `query`: e.g., `service:my-service status:error @http.status_code:500 @user_id:abc123`
- `from`: 7 days before the ticket's `created` date, or the timeframe mentioned in the ticket
- `to`: ticket `created` date or now
- `limit`: 10-25

Build a Logs URL the engineer can click:
`https://app.datadoghq.com/logs?query=<url-encoded-query>&from_ts=<epoch_ms>&to_ts=<epoch_ms>`

**Suppression rule:** if Datadog returns any error (auth, 403/404, timeout, rate limit, empty results, or any non-success), treat Datadog as unavailable for this ticket. Do not mention Datadog anywhere in the report. This rule overrides every other instruction that references Datadog data.

### Level 4: Code

Enter only when Levels 1-3 turned up nothing useful, OR external sources point to a code-level cause that needs tracing.

1. **Error strings.** Use `Bash` (e.g., `grep -r 'pattern' path/`) or `Grep` to find error messages in the codebase. Identify which service owns the error.
2. **Endpoints or event handler names.** Search for route definitions or event handler names to confirm which service handles the affected flow.
3. **Observable signals.** Use `Read` to open source files near the relevant code; find logging and monitoring calls. For each call found, note the log message string and any structured tags so the "Where to Look" section can name them.
4. **Recent changes.** Run `git log --since="2 weeks ago" -- <path>` via `Bash` to find commits that correlate with the reported timeline.

Stop when you can name: which service is involved, what signals are observable, and 2-3 concrete observability queries. Do not trace full call chains unless the chain itself is the finding.

## Evidence Model

Every claim in the report carries one of four tags.

| Tag | Meaning |
|-----|---------|
| `[VERIFIED]` | Directly confirmed. Read in code, or a source explicitly states this. |
| `[OBSERVED]` | A pattern matches the reported behavior, but reaching the conclusion required a logical step. |
| `[INFERRED]` | Logical deduction from available information. Not directly observed. |
| `[UNKNOWN]` | Cannot determine from available sources. Requires runtime data. |

If the finished report has more `[INFERRED]` than `[VERIFIED]` findings, the search was insufficient. Go back and search more before writing.

Every `[UNKNOWN]` becomes a "Where to Look" item: name the runtime check that would resolve it.

## Stop Condition

Investigation is **done** when all three are true:

1. There are 2-3 ranked hypotheses, most-likely first.
2. At least one source has been consulted at every search level the investigation reached. (If Level 1 closed via its gate, Levels 2-4 do not need sources.)
3. There are concrete next-step queries or files in "Where to Look".

If any one is missing, keep investigating.

## Report Template

Every report has all six sections. If a section has nothing meaningful to say, write a 1-line note ("Not applicable for this ticket") rather than skip the section.

### 1. Lead

1-2 sentences. Name what is broken and your single best hypothesis. Inline evidence tag. Do not restate the ticket title.

Example:

> Sessions for tenant `MapleTower` started failing at the join step yesterday after deploy `2026-04-29T18:00Z`; the new SSO middleware is the most likely cause `[OBSERVED]`.

### 2. Scope & Status

Who is affected (one user, a segment, or all). Whether investigation is complete or needs runtime verification. Stale-ticket flag if the ticket has been quiet for more than 2 weeks while the bug may already be fixed.

### 3. Domain Context

2-4 sentences. Define vendor names, internal acronyms, or product terminology a new team member would not know. Skip with "Not applicable" if the affected area is obvious from the title.

### 4. What Happened

2-4 sentences. Plain language. Include the exact error message and when the issue started if known.

### 5. What We Found

Narrative prose with evidence tags inline. Cover:

- Which service or component owns the behavior.
- 2-3 hypotheses ranked by likelihood, each with its evidence trail.
- Recent changes (deploys, PRs, config) that correlate with the timeline.
- Related prior tickets and what they say.

No tables in this section. No code snippets unless the snippet itself is the finding (then keep it short).

### 6. Where To Look

2-5 tool-by-tool items. Each item:

- Names the tool (Datadog, Sentry, admin URL, code search, Slack).
- Gives the exact ready-to-paste query, URL, or file path.
- Says in one phrase what a hit or miss tells you.

Example:

> - **Datadog logs:** `service:auth-svc @user_id:abc123 status:error` from 2026-04-29T17:00 to now. A hit confirms hypothesis 1 (SSO failure); a miss points at hypothesis 2 (cookie middleware).

## Adaptation Rules

These rules tweak section ORDER, not section presence. All six sections always appear.

- **Found at Level 1 (Slack):** Section 5 leads with the Slack source and links the thread. Sections 3, 4 may be 1 line each.
- **Found at Level 2 (runbook or prior Jira ticket):** Section 5 leads with the source. Same brevity allowed elsewhere.
- **Required Levels 3-4 (code/logs):** Section 5 includes code references inline as `path/to/file.ext:line`. No long code snippets unless the snippet is the finding.
- **Production incident (live impact):** Reorder. Put Section 6 ("Where To Look") immediately after Section 1 ("Lead"). Sections 2-5 follow. Engineers reading this need next actions before context.
- **Vague ticket (almost no signal):** Section 5 describes what was searched and what is unknown. Section 6 begins with the broadest signal and notes which question to the reporter would narrow the investigation.

## Writing Rules

These apply to all text in the report.

- No em dashes or spaced hyphens as separators. Em dashes inside parenthetical asides are fine.
- No LLM vocabulary: delve, leverage, robust, seamlessly, comprehensive, nuanced, elevate, foster, paradigm, ecosystem, holistic, innovative, synergy, empower, facilitate.
- Lead with the answer. No opener phrases.
- No trailing summaries on short sections.
- Prose over bullet lists when the content flows naturally as sentences.
- Never present unverified analysis as a confirmed root cause.
````

- [ ] **Step 3: Validate frontmatter parses as YAML**

```bash
python3 -c "
import re
content = open('/home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace/plugins/jira-bug-triage/skills/issue-investigator/SKILL.md').read()
m = re.match(r'^---\n(.*?)\n---', content, re.DOTALL)
assert m, 'no frontmatter'
import yaml
data = yaml.safe_load(m.group(1))
assert data['name'] == 'issue-investigator'
assert 'description' in data and len(data['description']) > 50
assert 'tools' in data and len(data['tools']) > 0
assert data.get('metadata', {}).get('author') == 'Taha Bikanerwala'
print('frontmatter OK')
"
```

Expected: `frontmatter OK`.

- [ ] **Step 4: Spring Health leakage scan**

```bash
grep -niE 'springhealth|spring health|customfield_10114|customfield_12424|customfield_12468|customfield_10153|customfield_10892|14854|18320|14853|18321|14852|applause|se\.triaged|compass|care.blocking|everett|pradip|support-engineering-bug-backlog|maple tower|bread financial' /home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace/plugins/jira-bug-triage/skills/issue-investigator/SKILL.md || echo "no leakage"
```

Note: the SKILL.md uses `MapleTower` (one word, illustrative tenant name in an example) which is intentionally distinct from `maple tower` (two words, Spring Health's actual customer). The grep above does NOT match `MapleTower` against `maple tower` (different tokenization). Expected: `no leakage`.

- [ ] **Step 5: Em-dash-as-separator scan**

```bash
grep -nE '[a-zA-Z>] — [a-zA-Z<{]' /home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace/plugins/jira-bug-triage/skills/issue-investigator/SKILL.md || echo "no separator em dashes"
```

Expected: `no separator em dashes`. Em dashes inside parentheticals (e.g., "tagged with `[OBSERVED]` — see Evidence Model") are acceptable, but the SKILL.md content above contains none.

- [ ] **Step 6: Section header check**

Confirm all six required section headers are present in the report template:

```bash
for h in "### 1. Lead" "### 2. Scope & Status" "### 3. Domain Context" "### 4. What Happened" "### 5. What We Found" "### 6. Where To Look"; do
  grep -F "$h" /home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace/plugins/jira-bug-triage/skills/issue-investigator/SKILL.md > /dev/null && echo "OK: $h" || echo "MISSING: $h"
done
```

Expected: 6 lines, all `OK:`.

- [ ] **Step 7: Commit**

```bash
git -C /home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace add plugins/jira-bug-triage/skills/issue-investigator/SKILL.md
git -C /home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace commit -m "feat(issue-investigator): add bundled investigation skill"
```

Expected: commit created with one new file.

---

## Task 2: Update bug-triage agent body — Sibling Skills section

**Files:**
- Modify: `/home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace/plugins/jira-bug-triage/agents/bug-triage-agent.md`

The current "Sibling Skills" section has one paragraph + one 3-row table. Replace with: same paragraph (slightly reworded), a "Bundled with this plugin" subsection (1-row table for `issue-investigator`), and a "Future separate plugins" subsection (2-row table for `jira-ticket-refiner` and `prose-style`). The closing paragraph (about fallback when a skill is not installed) stays.

- [ ] **Step 1: Read the current Sibling Skills section to confirm exact wording**

Run: `grep -n "## Sibling Skills" /home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace/plugins/jira-bug-triage/agents/bug-triage-agent.md` to find the line number, then `Read` the file with `offset` near that line for ~25 lines.

Use that exact wording in the next step's `Edit` `old_string`.

- [ ] **Step 2: Replace the Sibling Skills section**

The current section is approximately:

```
## Sibling Skills

The agent invokes three other skills during the workflow. They live in separate plugins (or other marketplaces). Reference them by name; the `Skill` tool routes the call.

| Phase | Skill name | Purpose |
|-------|-----------|---------|
| Phase 1 | `issue-investigator` | Search Slack, Confluence, Jira, then code if needed. Produces an investigation report with evidence tags. |
| Phase 5 | `jira-ticket-refiner` | Restructure the ticket description into a clear, self-contained Bug document. |
| Phase 5 | `prose-style` | Apply writing rules to comment text and refined descriptions. |

If a skill is not installed when the agent tries to call it, the `Skill` tool returns an error. Fall back to the brief inline summary in the relevant phase and warn the user once at the start of that phase.
```

(Read the actual file content first; the exact wording may differ. Match what's actually there as `old_string` for the `Edit`.)

Replace with:

```
## Sibling Skills

The agent invokes three other skills during the workflow. Reference them by name; the `Skill` tool routes the call.

**Bundled with this plugin** (always available when `jira-bug-triage` is installed):

| Phase | Skill name | Purpose |
|-------|-----------|---------|
| Phase 1 | `issue-investigator` | Search Slack, the ticket and related Jira/Confluence pages, Datadog, then code if needed. Produces an evidence-tagged report in the 6-section bug-archetype template. |

**Future separate plugins** (planned; not yet shipped in this marketplace):

| Phase | Skill name | Purpose |
|-------|-----------|---------|
| Phase 5 | `jira-ticket-refiner` | Restructure the ticket description into a clear, self-contained Bug document. |
| Phase 5 | `prose-style` | Apply writing rules to comment text and refined descriptions. |

If a skill is not installed when the agent tries to call it, the `Skill` tool returns an error. Fall back to the brief inline summary in the relevant phase and warn the user once at the start of that phase.
```

Use the `Edit` tool with `old_string` matching the actual existing block (read first to get exact wording).

- [ ] **Step 3: Confirm sibling-skill name counts unchanged**

```bash
echo "issue-investigator: $(grep -c 'issue-investigator' /home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace/plugins/jira-bug-triage/agents/bug-triage-agent.md)"
echo "jira-ticket-refiner: $(grep -c 'jira-ticket-refiner' /home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace/plugins/jira-bug-triage/agents/bug-triage-agent.md)"
echo "prose-style: $(grep -c 'prose-style' /home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace/plugins/jira-bug-triage/agents/bug-triage-agent.md)"
```

Expected: each count `>= 1`. Pre-edit values were `3, 3, 3` per the prior commit `5bdf534`. Post-edit may differ slightly because the table description for `issue-investigator` is now longer. Each count should be at least 1 — that's what matters for find-replace anchors when sibling skills get renamed.

- [ ] **Step 4: Re-validate frontmatter (no frontmatter changes expected)**

```bash
python3 -c "
import re
content = open('/home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace/plugins/jira-bug-triage/agents/bug-triage-agent.md').read()
m = re.match(r'^---\n(.*?)\n---', content, re.DOTALL)
import yaml
data = yaml.safe_load(m.group(1))
assert data['name'] == 'bug-triage-agent'
print('frontmatter OK')
"
```

Expected: `frontmatter OK`.

- [ ] **Step 5: Commit**

```bash
git -C /home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace add plugins/jira-bug-triage/agents/bug-triage-agent.md
git -C /home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace commit -m "docs(bug-triage-agent): split Sibling Skills into bundled vs future"
```

---

## Task 3: Update plugin README — Sibling skills section

**Files:**
- Modify: `/home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace/plugins/jira-bug-triage/README.md`

The current "Sibling skills (not yet shipped in this marketplace)" section needs to split between bundled and future-separate. The wording in the README is more user-facing than the agent body — keep that tone.

- [ ] **Step 1: Read the current "Sibling skills" section to confirm exact wording**

Run: `grep -n "Sibling skills" /home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace/plugins/jira-bug-triage/README.md` to find the line.

Use the actual wording for the `old_string`.

- [ ] **Step 2: Replace the section**

The current section is approximately:

```
### Sibling skills (not yet shipped in this marketplace)

The agent calls three other skills during the workflow. They will live in separate plugins in this marketplace; they're not built yet.

| Skill name | Purpose | Status |
|-----------|---------|--------|
| `issue-investigator` | Phase 1 investigation (Slack/Confluence/Jira/code with evidence tags) | Coming soon |
| `jira-ticket-refiner` | Phase 5 description and title rewrite into a clear Bug document | Coming soon |
| `prose-style` | Writing-rule application (no em dashes, no LLM vocabulary, lead with the answer) | Coming soon |

The agent ships with a brief inline fallback for each. If a sibling skill isn't installed, the agent uses the fallback and warns you once at the start of the affected phase. The fallbacks are intentionally short; install the sibling plugins when they ship for full quality.
```

Replace with:

```
### Sibling skills

The agent calls three other skills during the workflow. One ships bundled with this plugin; the other two are planned as separate plugins in the same marketplace.

**Bundled with this plugin** (installed automatically when you install `jira-bug-triage`):

| Skill name | Purpose | Status |
|-----------|---------|--------|
| `issue-investigator` | Phase 1 investigation (Slack/Jira/Confluence/Datadog/code with evidence tags) | Bundled, ready to use |

**Future separate plugins** (planned; not yet shipped):

| Skill name | Purpose | Status |
|-----------|---------|--------|
| `jira-ticket-refiner` | Phase 5 description and title rewrite into a clear Bug document | Coming soon |
| `prose-style` | Writing-rule application (no em dashes, no LLM vocabulary, lead with the answer) | Coming soon |

The agent ships with a brief inline fallback for `jira-ticket-refiner` and `prose-style`. If a sibling skill isn't installed, the agent uses the fallback and warns you once at the start of the affected phase. The fallbacks are intentionally short; install the sibling plugins when they ship for full quality.
```

Use `Edit` tool with the actual exact `old_string` from Step 1's read.

- [ ] **Step 3: Em-dash scan**

```bash
grep -n '—' /home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace/plugins/jira-bug-triage/README.md
```

Expected: no separator em dashes (the prior commit removed all of them).

- [ ] **Step 4: Leakage scan**

```bash
grep -niE 'springhealth|spring health|customfield_10114|customfield_12424|customfield_12468|customfield_10153|customfield_10892|14854|18320|14853|18321|14852|se\.triaged|compass|care.blocking|everett|pradip|support-engineering-bug-backlog|maple tower|bread financial' /home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace/plugins/jira-bug-triage/README.md || echo "no leakage"
```

Expected: only the intentional `applause` reference remains (in the `skip_labels` example), as before.

- [ ] **Step 5: Commit**

```bash
git -C /home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace add plugins/jira-bug-triage/README.md
git -C /home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace commit -m "docs(jira-bug-triage): split README sibling skills into bundled vs future"
```

---

## Task 4: Update marketplace README — remove issue-investigator from Roadmap

**Files:**
- Modify: `/home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace/README.md`

The Roadmap table currently has 3 rows. Remove the `issue-investigator` row and update the description in the "Available plugins" row to mention the bundled skill.

- [ ] **Step 1: Read the current README to confirm exact wording**

Use `Read` to view the entire file (it's only ~41 lines).

- [ ] **Step 2: Edit the "Available plugins" row description**

Find the row in the "Available plugins" table:

```
| [`jira-bug-triage`](./plugins/jira-bug-triage/) | 0.1.0 | Subagent that triages Jira bug tickets end-to-end: assigns, investigates (Slack/Confluence/Jira/Datadog), refines the description, sets severity-based due dates, and DMs you a summary. |
```

Replace with:

```
| [`jira-bug-triage`](./plugins/jira-bug-triage/) | 0.2.0 | Subagent that triages Jira bug tickets end-to-end: assigns, investigates (Slack/Confluence/Jira/Datadog), refines the description, sets severity-based due dates, and DMs you a summary. Bundles the `issue-investigator` skill. |
```

(Version bumped from `0.1.0` to `0.2.0`; description appended with the bundled-skill note.)

- [ ] **Step 3: Edit the Roadmap table**

Find the Roadmap rows:

```
| `issue-investigator` | Search Slack, Confluence, Jira, then code if needed; produces an evidence-tagged investigation report. | Planned |
| `jira-ticket-refiner` | Restructure poorly written Jira tickets into clear, self-contained documents. | Planned |
| `prose-style` | Apply writing rules (no em dashes, no LLM vocabulary, lead with the answer) to text the model produces. | Planned |
```

Replace with (drop the `issue-investigator` row):

```
| `jira-ticket-refiner` | Restructure poorly written Jira tickets into clear, self-contained documents. | Planned |
| `prose-style` | Apply writing rules (no em dashes, no LLM vocabulary, lead with the answer) to text the model produces. | Planned |
```

- [ ] **Step 4: Commit**

```bash
git -C /home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace add README.md
git -C /home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace commit -m "docs(marketplace): bump jira-bug-triage to 0.2.0, drop issue-investigator from roadmap"
```

---

## Task 5: Bump plugin manifest version

**Files:**
- Modify: `/home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace/plugins/jira-bug-triage/.claude-plugin/plugin.json`

- [ ] **Step 1: Read current plugin.json**

```bash
cat /home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace/plugins/jira-bug-triage/.claude-plugin/plugin.json
```

Confirm current `version` is `"0.1.0"` and `description` matches what's in the marketplace manifest task above.

- [ ] **Step 2: Replace the version and description fields**

Use `Edit` to change:

Find: `"version": "0.1.0",`
Replace with: `"version": "0.2.0",`

Find: `"description": "End-to-end Jira bug triage subagent: assigns, investigates, refines, sets severity-based due dates, and updates ticket fields.",`
Replace with: `"description": "End-to-end Jira bug triage subagent (assigns, investigates, refines, sets severity-based due dates, updates ticket fields). Bundles the issue-investigator skill for read-only investigation reports.",`

- [ ] **Step 3: Validate JSON**

```bash
jq -e . /home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace/plugins/jira-bug-triage/.claude-plugin/plugin.json > /dev/null && echo OK
```

Expected: `OK`.

- [ ] **Step 4: Commit**

```bash
git -C /home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace add plugins/jira-bug-triage/.claude-plugin/plugin.json
git -C /home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace commit -m "feat(jira-bug-triage): bump to 0.2.0 (bundled issue-investigator)"
```

---

## Task 6: Append architectural-revision note to original design doc

**Files:**
- Modify: `/home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace/docs/superpowers/specs/2026-04-30-claude-marketplace-design.md`

Keep the original design as historical record. Append one paragraph at the end pointing at the new spec.

- [ ] **Step 1: Append the note**

Open the file, navigate to the very end (after the "Out of scope" section), and append:

```markdown

## Architectural revision (2026-04-30)

`issue-investigator` is no longer a separate-plugin item on the roadmap; it now ships nested inside `jira-bug-triage` at `plugins/jira-bug-triage/skills/issue-investigator/`. The bug-triage agent still calls it by name via the `Skill` tool. The other two sibling skills (`jira-ticket-refiner`, `prose-style`) remain planned as separate plugins. See `docs/superpowers/specs/2026-04-30-issue-investigator-design.md` for the full spec of the bundled skill.
```

(Use `Edit` with `old_string` being the last few lines of the file and `new_string` being those same lines plus the appended note. Or use `Write` if Read confirms the file content first.)

- [ ] **Step 2: Commit**

```bash
git -C /home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace add docs/superpowers/specs/2026-04-30-claude-marketplace-design.md
git -C /home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace commit -m "docs(spec): note issue-investigator architectural revision"
```

---

## Task 7: Local install validation (user-driven)

These steps require the user to run slash commands in their Claude Code session.

- [ ] **Step 1: Tell the user to remove the existing local marketplace install (if present) and re-add**

> Run in your Claude Code session and confirm output:
>
> ```
> /plugin marketplace remove jt-bikanerwala-marketplace
> /plugin marketplace add /home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace
> /plugin install jira-bug-triage
> ```

Expected:
- The marketplace is added with no kebab-case warnings.
- The plugin installs cleanly (now version `0.2.0` per the manifest).
- The `bug-triage-agent` subagent appears in the Agent list.
- The `issue-investigator` skill appears in the Skill list (e.g., when checking available skills via the Skill tool's discoverable list).

If anything errors, fix and re-run. If the marketplace had no prior install, the `remove` command will warn but the `add` will still work.

- [ ] **Step 2: Smoke test — Skill tool can find issue-investigator**

> Run in the Claude Code session: ask Claude (in any conversation, ideally a fresh one) to list available skills, OR invoke the Skill tool with `issue-investigator` and confirm the skill body loads with the frontmatter description shown.

Pass criteria:
- Skill name `issue-investigator` is discoverable.
- Skill description matches the frontmatter.
- Skill body loads when invoked (the calling-convention rules at the top, the search ladder, the report template).

If the skill isn't discoverable, double-check the file path (`plugins/jira-bug-triage/skills/issue-investigator/SKILL.md`) and that the plugin manifest doesn't override the default `skills` location.

---

## Task 8: Publish to GitHub

- [ ] **Step 1: Confirm gh is authenticated**

```bash
gh auth status 2>&1 | head -5
```

Expected: logged in as `TahaBikanerwala`.

- [ ] **Step 2: Push commits to origin/main**

```bash
git -C /home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace push origin main 2>&1
```

Expected: 6 new commits pushed (Tasks 1-6).

- [ ] **Step 3: Tag v0.2.0 and push tag**

```bash
git -C /home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace tag v0.2.0
git -C /home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace push origin v0.2.0 2>&1
```

Expected: tag created and pushed.

- [ ] **Step 4: User-driven public install verification**

> Run in your Claude Code session:
>
> ```
> /plugin marketplace remove jt-bikanerwala-marketplace
> /plugin marketplace add github.com/TahaBikanerwala/jt-bikanerwala-marketplace
> /plugin install jira-bug-triage
> ```
>
> Confirm:
> - Marketplace fetches the latest `main` (v0.2.0 commits visible).
> - Plugin installs at version `0.2.0`.
> - Both `bug-triage-agent` and `issue-investigator` are available.

If yes, the v0.2.0 release is live.

---

## Self-review

**1. Spec coverage.**

Walking through `docs/superpowers/specs/2026-04-30-issue-investigator-design.md` section by section:

| Spec section | Implementing task |
|--------------|-------------------|
| Architectural revision | Tasks 2, 3, 4, 5, 6 |
| Skill location and metadata (path, frontmatter, tools, author) | Task 1 |
| Calling convention (non-interactive, predictable, etc.) | Task 1 (Calling Convention section in SKILL.md body) |
| 4-level search ladder (Slack, ticket+Jira+Confluence, Datadog, code) | Task 1 (Search Ladder section) |
| Evidence model (4 tags) | Task 1 (Evidence Model section) |
| Stop condition (3 criteria) | Task 1 (Stop Condition section) |
| Report template (6 sections) | Task 1 (Report Template section) |
| Adaptation rules (5 cases) | Task 1 (Adaptation Rules section) |
| Writing rules | Task 1 (Writing Rules section) |
| Architecture-update side effects (5 files) | Tasks 2-6 |
| Versioning (0.1.0 → 0.2.0) | Tasks 4 (marketplace README), 5 (plugin manifest) |
| Validation plan (frontmatter parses, leakage grep, evidence tags, install verification) | Task 1 Steps 3-6, Task 7 |
| Out of scope items | Honored — no posting, no Jira mutation, no other sibling plugins, no non-Jira trackers, no SKILL.md split |

All spec sections covered. No gaps.

**2. Placeholder scan.**

Scanning the plan for "TBD", "TODO", "implement later", "fill in", "add appropriate":

- Task 2 Step 1 says "Read the actual file content first; the exact wording may differ. Match what's actually there as `old_string`." This is not a placeholder — it's an instruction to handle the real-world case where the file content might have small differences from the snippet shown in the plan. The snippet itself is the best-known approximation.
- Task 3 Step 1 has the same pattern. Same reasoning.
- Task 6 Step 1 says "Use `Edit` with `old_string` being the last few lines of the file and `new_string` being those same lines plus the appended note. Or use `Write` if Read confirms the file content first." This is two valid approaches; both are concrete. Not a placeholder.

No actual placeholders.

**3. Type/name consistency.**

- Skill name `issue-investigator` — used consistently in Task 1 frontmatter, Tasks 2-4 cross-references, Task 6 architectural note, validation greps.
- Plugin name `jira-bug-triage` — used consistently across all tasks.
- Marketplace name `jt-bikanerwala-marketplace` — consistent in Task 7 and Task 8.
- Version bump: `0.1.0` → `0.2.0` — consistent across Task 4 (marketplace README), Task 5 (plugin manifest), Task 8 (tag).
- Evidence tags `[VERIFIED]` / `[OBSERVED]` / `[INFERRED]` / `[UNKNOWN]` — Task 1 SKILL.md uses these exactly. Matches what the bug-triage agent body expects (already verified in prior commits).
- Sibling-skill names (`jira-ticket-refiner`, `prose-style`) used consistently in Tasks 2 and 3.

No drift detected.

---

## Out of scope (re-stated from spec)

- The other two sibling plugins (`jira-ticket-refiner`, `prose-style`). Each gets its own design + plan + implementation cycle.
- Posting the report. The skill produces text only.
- Modifying Jira/Slack/Datadog state. Read-only by design.
- Splitting the SKILL.md into reference files. Re-evaluate if the file grows past ~400 lines.
- Non-Jira issue trackers.
