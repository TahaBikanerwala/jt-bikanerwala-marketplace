# Design — `jt-bikanerwala-marketplace`

**Date:** 2026-04-30
**Author:** Taha Bikanerwala
**Status:** Approved (ready for implementation plan)

## Goal

Publish a public Claude Code plugin marketplace at `github.com/TahaBikanerwala/jt-bikanerwala-marketplace` that contains one plugin: `jira-bug-triage`. The plugin ships a single subagent (`bug-triage-agent`) that runs end-to-end Jira bug triage. Future plugins (investigation, ticket refinement, prose style) will be added in follow-up work and are out of scope for this design.

**Local working directory note:** Work happens in `/home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace/` (existing folder, not renamed). The marketplace `name` field in `marketplace.json` is `jt-bikanerwala-marketplace` — Claude Code reads the manifest, not the folder name, so the mismatch is harmless. The GitHub repo name (`jt-bikanerwala-marketplace`) matches the manifest, not the local folder.

## Repo structure

```
jt-bikanerwala-marketplace/
├── .claude-plugin/
│   └── marketplace.json
├── plugins/
│   └── jira-bug-triage/
│       ├── .claude-plugin/
│       │   └── plugin.json
│       ├── agents/
│       │   └── bug-triage-agent.md
│       └── README.md
├── README.md
├── LICENSE
├── .gitignore
└── docs/
    └── superpowers/specs/
        └── 2026-04-30-claude-marketplace-design.md
```

## Marketplace manifest (`.claude-plugin/marketplace.json`)

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

`name` is kebab-case (Claude Code requirement). The marketplace currently lists one plugin; the array grows as future plugins ship.

## Plugin manifest (`plugins/jira-bug-triage/.claude-plugin/plugin.json`)

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

No `dependencies` field. Three sibling skills (`issue-investigator`, `jira-ticket-refiner`, `prose-style`) are referenced from the agent body but ship later in separate plugins. The README documents the runtime expectation in plain English. When those plugins ship, `dependencies` gets populated.

## Subagent file (`plugins/jira-bug-triage/agents/bug-triage-agent.md`)

### Frontmatter

```yaml
---
name: bug-triage-agent
description: Triages a Jira bug ticket end-to-end: assigns it, transitions to investigating, runs the investigation skill, searches observability data, refines the ticket, sets severity-based due date, updates fields, and DMs you a summary. Use when the user pastes a Jira bug ticket link and says triage, investigate, or process a bug.
tools: mcp__plugin_atlassian_atlassian__*, mcp__plugin_slack_slack__*, mcp__datadog__*, Skill, Read, Bash
---
```

**Tools-list syntax verification (implementation step):** The wildcard `mcp__<server>__*` form needs to be verified against Claude Code subagent loader behavior before commit. If wildcards are not honored, the implementation step expands them to the specific MCP tool names actually used by the agent body (e.g., `mcp__plugin_atlassian_atlassian__getJiraIssue`, `editJiraIssue`, `addCommentToJiraIssue`, `transitionJiraIssue`, `getTransitionsForJiraIssue`, `searchJiraIssuesUsingJql`, `searchConfluenceUsingCql`, `lookupJiraAccountId`, `getAccessibleAtlassianResources`, `atlassianUserInfo`, `getJiraIssueTypeMetaWithFields`, `createIssueLink`; `mcp__plugin_slack_slack__slack_search_users`, `slack_search_public_and_private`, `slack_read_thread`, `slack_send_message`, `slack_read_user_profile`; `mcp__datadog__search_datadog_logs`). The plan step that writes the agent file performs this check.

### Body — workflow phases

The body is a generic rewrite of the source skill at `/home/taha/Desktop/MyProjects/simple-windows-setup/.claude/skills/bug-triage-agent/SKILL.md`. Phase numbering preserved. All Spring Health-specific content removed; project-specific values resolved through auto-discovery or project config.

| Phase | What it does | Notes |
|-------|--------------|-------|
| Prerequisites | Resolve `cloudId`, user `accountId`, Slack `user_id`. Cache for session. Load `.claude/jira-bug-triage.config.json` if present. | Uses `getAccessibleAtlassianResources`, `atlassianUserInfo`, `slack_search_users`. |
| Phase 0 | Fetch ticket, run skip-label check, assign to running user, transition to "investigating". | Skip-label list comes from config (`skip_labels`). |
| Phase 1 | Investigation — invoke the investigation skill (currently named `issue-investigator`). | Subagent calls `Skill` tool. References by name. Falls back gracefully if skill not installed: warns the user and continues without that level of detail. |
| Phase 2 | Search Datadog for related logs. | Suppressed silently if Datadog returns errors or is not installed. |
| Phase 2.5 | Gap analysis — decide if reporter follow-up is warranted. | Three scenarios: missing data, clarification, fix verification. |
| Phase 3 | Confirmation gate — show user findings + proposed updates, wait for approval. | Hard pause. |
| Phase 4 | Severity assessment comment (ADF). | Severity field auto-discovered by name. |
| Phase 4b | Follow-up question comment (replaces Phase 4 when reporter follow-up is needed). | Mention via ADF mention node. Assigns ticket to tagged person. |
| Phase 5 | Refine the ticket — invoke the refinement skill (currently named `jira-ticket-refiner`). Apply prose style rules from the prose skill (currently named `prose-style`). | Same `Skill` invocation pattern with graceful fallback. |
| Phase 6 | Set severity (`customfield_<auto-discovered>`) and due date (`created + due_offset_days` from config). | Skipped on follow-up path. |
| Phase 7 | Link related/duplicate tickets via `createIssueLink`. | Skip links that already exist. |
| Phase 8 | Append triaged label (default `triaged`, configurable). Fill optional fields by name (Components, Customers, Impacted Party) when discoverable. | Silently skip fields that don't exist on the project. |
| Phase 9 | Final update — assignee + transition (Backlog for low severity, stay-in-investigating for high, Waiting for Reply on follow-up path). | Transition names from config. |
| Phase 10 | Slack DM to running user with one-line summary. Optional escalation routing per config. | No hardcoded recipients. |

### Genericization rules

| Original (Spring Health) | Replaced with |
|--------------------------|---------------|
| `springhealth.atlassian.net`, hardcoded `cloudId` | `getAccessibleAtlassianResources` at session start |
| `customfield_12468` (severity), `customfield_10153` (Bug Description), `customfield_10892` (Work Type), `customfield_10114`, `customfield_12424` | Look up by field name; skip silently if absent |
| Severity option IDs `14854`/`18320`/`14853`/`18321`/`14852` | Query field options at runtime, build the mapping |
| 5-tier severity scheme (`Sev-1` / `Sev-1.5` / `Sev-2` / `Sev-2.5` / `Sev-3`) with fixed SLAs | 3-tier default (`Sev-1` / `Sev-2` / `Sev-3` with 7/14/90 day offsets); user overrides via config |
| `applause.*` skip rule | Generic `skip_labels` list; default `[]` |
| `se.triaged` label | `triaged` label; configurable |
| Named people (Everett, Pradip Thachile) | `escalation.primary_contact` / `escalation.fallback_contact`; default null |
| Slack channel `#support-engineering-bug-backlog-04-2026` | `escalation.slack_channel`; default null |
| "Care blocking: Yes/No" requirement in Impact section | Removed (healthcare-specific) |
| "Compass", member/provider/payer terminology, "Known Problem Areas" volumes table | Removed (org-specific) |
| Hardcoded `BUG` project key | Inferred from ticket URL prefix; configurable override |

### Sibling skill references

The agent body refers to three future skills by their original names. When those plugins ship under (possibly different) new names, these references get updated via find-replace:

- `issue-investigator` — Phase 1 investigation
- `jira-ticket-refiner` — Phase 5 refinement
- `prose-style` — writing rules applied throughout

If the referenced skill is not installed, the subagent falls back to a brief inline summary (a few sentences each, included in the body) and warns the user. The brief summaries are the only inlined content from the originals; the verbose detail (evidence model tables, level-by-level investigation procedure, ADF JSON examples) does not live in this agent.

## Configuration model (`.claude/jira-bug-triage.config.json`, project-local, optional)

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

### Defaults when config absent

- `project_key` — inferred from ticket URL prefix (e.g., `BUG-123` → `BUG`).
- `severity_field_name` — auto-discovery order: `Severity Level` → `Severity` → `Bug Severity` → fall back to native `priority`.
- `triaged_label` — `triaged`.
- `skip_labels` — empty (no skip rule).
- `transitions` — names shown above.
- `severity_scheme` — 3-tier scheme shown above.
- `escalation` — all null. Sev-1/Sev-2 trigger a flag in the assessment comment and a DM to the running user; no comment tags, no channel pings.

### Escalation behavior

| Case | Behavior |
|------|----------|
| No config | On Sev-1/Sev-2: severity flagged in assessment comment, agent DMs the running user on Slack. No tagging, no channel ping. |
| `primary_contact` set | Agent posts an escalation comment tagging `primary_contact` (resolved via `lookupJiraAccountId` from email or name). If `slack_channel` is set, also pings that channel. |
| `primary_contact` + `fallback_contact` | Same as above; if primary doesn't respond within the SLA, agent pings fallback. |
| Ad-hoc ("escalate this to Alice") | Agent looks up Alice via `lookupJiraAccountId` and `slack_search_users`, confirms the match with the user, posts the escalation. Does not modify config. |

### Custom severity scheme example (5-tier)

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

### Skip-label example (Spring Health applause-style)

```json
{ "skip_labels": ["applause"] }
```

Matches any label whose name starts with `applause` (case-insensitive). Skips triage and reports the matched label to the user.

## README files

### Top-level `README.md`

1. **Title:** `jt-bikanerwala-marketplace`
2. **What this is:** A Claude Code plugin marketplace by Taha Bikanerwala.
3. **Install:**
   ```
   /plugin marketplace add github.com/TahaBikanerwala/jt-bikanerwala-marketplace
   ```
4. **Available plugins:** Table — `jira-bug-triage` (current), description, status `0.1.0`.
5. **Roadmap:** Future plugins — investigation, ticket refinement, prose style. No timeline commitments.
6. **License:** MIT.
7. **Author:** Taha Bikanerwala, with link to GitHub profile.

### Plugin-level `plugins/jira-bug-triage/README.md`

1. **What it does** — one paragraph in plain English describing the workflow end to end.
2. **Prerequisites:**
   - Required: Atlassian MCP (Jira access).
   - Recommended: Slack MCP (search + DM), Datadog MCP (log search). Each section gives the install command and a one-line "skip if you don't have this" note.
3. **Sibling skills** — section explicitly names the three sibling skills the agent expects. States they are not yet shipped in this marketplace; agent runs in degraded mode (with brief inline fallbacks) until they are installed. Links to roadmap when available.
4. **Quick start** — install, paste a ticket URL, run.
5. **Configuration** — full schema, defaults, every "what if":
   - No config (default behavior)
   - Custom project key
   - Custom severity scheme (5-tier example)
   - Custom transition names
   - Skip-triage labels (applause example)
   - Escalation (four cases: default, configured, ad-hoc, full auto, with example configs)
   - Datadog unavailable (auto-handled)
   - Jira fields missing (auto-handled)
6. **Workflow phases** — short summary table mirroring the design doc.
7. **Limitations** — what the agent will not do (close tickets, modify priority, post comments without approval, tag users not approved by the operator).
8. **Known issues / FAQ.**
9. **Contributing.**
10. **License.**

## `.gitignore`

```
.claude/settings.local.json
.DS_Store
node_modules/
*.swp
.env
.env.local
```

## `LICENSE`

Standard MIT license, copyright `Taha Bikanerwala`, year `2026`.

## Validation plan

1. Run `git init` in the repo root, add the GitHub remote `git@github.com:TahaBikanerwala/jt-bikanerwala-marketplace.git`.
2. Stage and commit all files with a clear message.
3. Install locally first via file path: `/plugin marketplace add /home/taha/Desktop/MyProjects/taha-bikanerwala-marketplace`.
4. Run `/plugin install jira-bug-triage`. Verify both manifests validate (no kebab-case warnings, no missing fields, no schema errors).
5. Verify the subagent appears via the Agent tool list (named `bug-triage-agent`).
6. Run a dry-run invocation against a sample ticket URL — confirm the agent loads, reads the config, and pauses at Phase 0 step 3 (skip-label check) cleanly even with no real ticket access.
7. Push to GitHub with `git push -u origin main`.
8. Test the public install: `/plugin marketplace remove jt-bikanerwala-marketplace`, then `/plugin marketplace add github.com/TahaBikanerwala/jt-bikanerwala-marketplace`, install, verify.
9. Tag `v0.1.0`.

## Out of scope

- The three sibling plugins (`issue-investigator`, `jira-ticket-refiner`, `prose-style`). Each gets its own design + plan + implementation cycle.
- Renaming the sibling skills to new names. The agent references them by current names; renaming happens when they ship.
- Any non-Jira issue trackers (Linear, GitHub Issues, ServiceNow). Future enhancement.
- Multi-language support for the agent body.

## Architectural revision (2026-04-30)

`issue-investigator` is no longer a separate-plugin item on the roadmap; it now ships nested inside `jira-bug-triage` at `plugins/jira-bug-triage/skills/issue-investigator/`. The bug-triage agent still calls it by name via the `Skill` tool. The other two sibling skills (`jira-ticket-refiner`, `prose-style`) remain planned as separate plugins. See `docs/superpowers/specs/2026-04-30-issue-investigator-design.md` for the full spec of the bundled skill.

## Architectural revision (2026-05-01)

`jira-ticket-refiner` is no longer a separate-plugin item on the roadmap. It now ships nested inside `jira-bug-triage` at `plugins/jira-bug-triage/skills/jira-ticket-refiner/`, alongside `issue-investigator`. The bug-triage agent still calls it by name via the `Skill` tool in Phase 5. The Phase 5 fallback in the agent body is retained as defensive coding for the rare case where the bundled skill fails to load.

Scope difference from the original Roadmap entry: the bundled skill works for any archetype (Bug, Feature, Task, Incident, Spike), not just Bugs. The bug-triage agent's Phase 5 still calls it on Bug-archetype tickets, but the skill itself is general-purpose and can be invoked standalone for any ticket type.

File layout: a multi-file structure with `SKILL.md` plus four reference files (`gathering-guide.md`, `classification-guide.md`, `jira-formatting.md`, `title-guide.md`) and one asset (`template.md`). This differs from `issue-investigator`'s single-file layout because the refiner has substantially more reference material that benefits from progressive disclosure.

The plugin manifest version bumps to `0.3.0` to reflect the second bundled skill. `prose-style` remains the only sibling skill still planned as a separate plugin.

## Architectural revision (2026-05-01b)

The plugin was renamed from `jira-bug-triage` to `jira-issue-triage` and expanded to handle all Jira archetypes (Bug, Incident, Feature, Task, Spike), not just Bugs. The agent was renamed from `bug-triage-agent` to `jira-issue-triage`. A new bundled skill `requirements-investigator` joins `issue-investigator` and `jira-ticket-refiner` so the plugin now ships three bundled skills. A `/jira-issue-triage:setup` slash command and an in-agent first-run wizard fallback let new users configure the plugin without hand-editing JSON.

The plugin manifest version bumps to `1.0.0`. The legacy config file path (`.claude/jira-bug-triage.config.json`) keeps working for one minor version (1.x) with a deprecation warning. `prose-style` remains the only sibling skill still planned as a separate plugin. See `docs/superpowers/specs/2026-05-01-jira-issue-triage-design.md` for the full v1.0.0 spec and `docs/superpowers/plans/2026-05-01-jira-issue-triage.md` for the bite-sized plan.
