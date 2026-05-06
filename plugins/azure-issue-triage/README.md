# azure-issue-triage

A Claude Code plugin that ships one subagent (`azure-issue-triage`) and a setup wizard (`/azure-issue-triage:setup`). Paste any Azure DevOps work-item URL (Bug, Incident, User Story, Feature, Task, or Spike) and tell the agent to triage. The agent assigns the work item to you, transitions it to investigating, runs the matching investigation skill, drafts an archetype-appropriate assessment comment, refines the title and description, applies a triaged tag, and posts a one-line summary on Microsoft Teams. The agent pauses at the Phase 3 confirmation gate (before posting any comment, changing the description, or updating other fields) to show you the full findings and get your approval.

This plugin is a sibling of [`jira-issue-triage`](../jira-issue-triage/). The two plugins install side by side; the workflows are conceptually identical but call platform-specific tools.

## What's new in v0.2.0

The archetype scope expanded from Bug + Task (v0.1.0) to all five archetypes. **Bug, Incident, User Story, Feature, Task, and Spike** all triage end-to-end now. Process-template-aware mapping in `work_item_type_map` lets Scrum (Product Backlog Item, Impediment) and CMMI (Requirement, Issue) projects override the work-item-type names.

Still deferred to **v0.3.0**: severity SLA due-date computation, Phase 9 escalation routing (Teams channel ping, primary/fallback contacts), sprint placement via `work_list_team_iterations`, story-point estimation prompt, Azure Repos PR linking via `wit_link_work_item_to_pull_request`, and EM-fallback when the reporter is deactivated.

## Prerequisites

### Required

- **Azure DevOps MCP server.** The agent needs full Boards access (read work items, edit fields, post comments, query via WIQL, link work items, look up users). Microsoft ships an official server at [github.com/microsoft/azure-devops-mcp](https://github.com/microsoft/azure-devops-mcp) (`@azure-devops/mcp`). Install it through Claude Code's plugin or MCP config and authenticate against your Azure DevOps organization.

  **Tool-prefix note.** MCP tool names are scoped by however your Claude Code client mounts the server (e.g., `mcp__azure_devops__wit_get_work_item`, `mcp__plugin_ado__wit_get_work_item`, etc.). The agent body lists tool names in their commonly-used short form (`wit_get_work_item`, `wit_query_by_wiql`, `wiki_search`, `core_list_projects`). If your install prefixes them, the frontmatter and inline references in `agents/azure-issue-triage.md` need the prefix added once. The setup wizard prints the prefix it detects so you can update the agent body in one pass.

### Recommended (the agent gracefully degrades without these)

- **Microsoft Teams MCP server.** Used for the Phase 10 summary message. There is no canonical first-party Teams MCP yet; community options include InditexTech/mcp-teams-server and msfeldstein/MCP-MS-Teams. Without one installed, the agent prints the summary inline instead of sending a Teams message.
- **Datadog MCP server.** Used for Phase 2 log search on Bug and Incident archetypes. Without it (or for User Story / Feature / Task / Spike archetypes), Phase 2 is silently skipped.

The plugin does not depend on Slack or Confluence. If you also use `jira-issue-triage`, both plugins coexist; their `prose-style` skills resolve via plugin namespacing.

### Bundled skills

The agent calls four skills during the workflow. All four ship bundled with this plugin and install automatically.

| Skill name | Phase | Used for | Status |
|-----------|-------|----------|--------|
| `azure-issue-investigator` | Phase 1 (Bug, Incident) | Teams/AzDO/Wiki/Datadog/code investigation with evidence tags | Bundled |
| `azure-requirements-investigator` | Phase 1 (User Story, Feature, Task, Spike) | Teams/AzDO/Wiki search for prior decisions, design refs, scope; per-archetype report templates (Feature template for User Story/Feature, Task template for Task, Spike template for Spike) | Bundled |
| `azure-work-item-refiner` | Phase 5 (any archetype) | Title and description rewrite. Archetype-aware across all five archetypes. | Bundled |
| `prose-style` | Phase 2.5 + Phase 5 (any archetype) | Writing-rule application: strips em dashes, opener phrases, LLM vocabulary, bullet sprawl. Mirror of `jira-issue-triage/skills/prose-style/`. | Bundled |

The agent body retains short defensive fallbacks for all four bundled skills.

## Quick start

1. Add the marketplace and install the plugin:

   ```
   /plugin marketplace add github.com/TahaBikanerwala/jt-bikanerwala-marketplace
   /plugin install azure-issue-triage
   ```

2. (Optional but recommended) Run the setup wizard:

   ```
   /azure-issue-triage:setup
   ```

   The wizard walks through six questions (organization URL, project, area path, severity field, transition mapping, Teams channel) and writes `.claude/azure-issue-triage.config.json`. You can re-run it any time to update.

   If you skip this step, the agent detects the missing config on first run and offers to walk through the same questions inline or use defaults.

3. Verify the agent appears: open the Agent tool list and confirm `azure-issue-triage` appears.

4. Paste any Azure DevOps work-item URL and ask the agent to triage:

   > Triage `https://dev.azure.com/<org>/<project>/_workitems/edit/12345`.

   The agent runs through phases 0-10, pauses at the Phase 3 confirmation gate, and waits for your approval before posting comments or changing fields.

## Setup wizard

The `/azure-issue-triage:setup` slash command walks through six questions and writes the result to `.claude/azure-issue-triage.config.json`:

1. Organization URL (e.g., `https://dev.azure.com/contoso`).
2. Project name (or "infer from URL").
3. Default area path prefix (optional).
4. Severity field — built-in `Microsoft.VSTS.Common.Severity` (default) or fall back to `Microsoft.VSTS.Common.Priority`.
5. State + Reason mapping for `investigating` and `waiting_reply`.
6. Teams channel for the Phase 10 summary (optional; null disables Teams).

Auto-discovery uses `core_list_projects` and `wit_my_work_items` to suggest defaults. Failures are non-fatal; the wizard falls back to static defaults and tells you.

The wizard never modifies Azure DevOps (read-only auto-discovery). Re-running it on an existing config offers to overwrite or keep current.

## Configuration

Configuration is **optional**. The agent uses sensible defaults if no config file is found. To override, run `/azure-issue-triage:setup` or create `.claude/azure-issue-triage.config.json` in your project root by hand:

```json
{
  "organization_url": null,
  "project": null,
  "default_team": null,
  "area_path_prefix": null,
  "severity_field": "Microsoft.VSTS.Common.Severity",
  "triaged_tag": "triaged",
  "skip_tags": [],
  "states": {
    "investigating": { "state": "Active", "reason": "Investigating" },
    "waiting_reply": { "state": "Active", "reason": "Awaiting Customer" }
  },
  "work_item_type_map": {
    "Bug": "Bug",
    "Incident": "Issue",
    "User Story": "User Story",
    "Feature": "Feature",
    "Task": "Task",
    "Spike": "Task"
  },
  "archetype_assignment_after_triage": {
    "Bug": "unassign",
    "Incident": "self",
    "User Story": "self",
    "Feature": "self",
    "Task": "self",
    "Spike": "self"
  },
  "teams_channel": null,
  "description_preview_pause_seconds": 3
}
```

### Defaults (when config is absent)

- `organization_url` and `project`: required at first run if not configured. The agent inspects the work-item URL and asks you to confirm or override.
- `severity_field`: `Microsoft.VSTS.Common.Severity` (the Agile process template's built-in field). Falls back to `Microsoft.VSTS.Common.Priority` if Severity is not enabled on your project.
- `triaged_tag`: `triaged` (Azure DevOps stores tags as a semicolon-delimited string; the agent appends without overwriting existing tags).
- `skip_tags`: empty (no skip rule).
- `states`: shown above. Azure DevOps requires a `State` + `Reason` pair on most transitions, so each entry is an object. Mapping depends on your process template (Agile, Scrum, CMMI). The defaults match Agile.
- `work_item_type_map`: assumes the **Agile** process template. `Bug -> Bug`, `Incident -> Issue`, `User Story -> User Story`, `Feature -> Feature`, `Task -> Task`, `Spike -> Task` (Spike has no canonical work-item type; the agent treats a Task tagged `spike` as a Spike). Override for Scrum (`User Story` becomes `Product Backlog Item`; `Incident` becomes `Impediment` or stays as a Bug with an `incident` tag) or CMMI (`User Story` becomes `Requirement`; `Incident` becomes `Issue`). Unknown work-item types pause the run and ask you which archetype to apply.
- `archetype_assignment_after_triage`: `Bug = "unassign"`; `Incident, User Story, Feature, Task, Spike = "self"`. Override per archetype. Common overrides: `"Incident": "unassign"` to route Sev-1 incidents back to the on-call pool; `"Bug": "self"` when bug triage and bug fixing are the same person.
- `teams_channel`: null. The agent prints the summary inline.
- `description_preview_pause_seconds`: `3`. The pause between the Phase 5 informational preview and the actual write.

### Process-template note

The defaults assume the **Agile** process template. If your project uses Scrum or CMMI, override `work_item_type_map` and (for Scrum) `severity_field`:

- **Scrum:** Replace `"User Story": "User Story"` with `"User Story": "Product Backlog Item"`. Replace `"Incident": "Issue"` with `"Incident": "Impediment"` (or `"Bug"` if your team uses Bugs tagged `incident` instead). Severity is not present by default; override `severity_field` to `Microsoft.VSTS.Common.Priority` and use the 1-4 priority field instead.
- **CMMI:** Replace `"User Story": "User Story"` with `"User Story": "Requirement"`. Bug, Task, Feature, Issue keep the same names. Severity is built in. Investigation states differ ("Proposed", "Active", "Resolved"). Override the `states` block.

The wizard does not auto-detect the process template; it presents Agile defaults and you override the relevant fields if your project differs.

### Skipping triage on certain work items

Use `skip_tags` to skip triage on work items carrying any matching tag:

```json
{ "skip_tags": ["external-vendor", "compliance-review"] }
```

A tag whose name *starts with* any prefix in `skip_tags` (case-insensitive) triggers the skip. The agent reports the matched tag and stops. You can override per-work-item by telling the agent to proceed anyway.

### Custom states

Mapping logical states to AzDO `State + Reason` pairs:

```json
{
  "states": {
    "investigating": { "state": "Active", "reason": "In Triage" },
    "waiting_reply": { "state": "Active", "reason": "Awaiting Customer Response" }
  }
}
```

The agent reads this map and writes both `System.State` and `System.Reason` in a single `wit_update_work_item` call.

### Datadog not installed

Phase 2 is silently skipped. The agent never mentions Datadog in any output. No configuration needed. Phase 2 also skips silently for User Story / Feature / Task / Spike archetypes regardless of installation.

### Teams not installed

Phase 10 prints the summary inline as agent output instead of sending a Teams message. The agent notes once at the end of the run: "Teams DM unavailable; install a Teams MCP server to enable."

## Workflow phases

The workflow runs a generic core for every archetype. Four phases gate on archetype.

| Phase | What it does | Archetypes |
|-------|--------------|------------|
| Prerequisites | Auto-discover identity, load config (with first-run wizard fallback if missing), confirm work-item-type and severity-field availability. | All |
| Phase 0 | Fetch work item via `wit_get_work_item`, run skip-tag check, detect archetype, assign to you (`System.AssignedTo`), transition to `investigating` state+reason. | All |
| Phase 1 | Investigation: `azure-issue-investigator` (Bug, Incident) or `azure-requirements-investigator` (User Story, Feature, Task, Spike). | All (skill choice gates on archetype) |
| Phase 2 | Datadog log search using signals from Phase 1. Silently suppressed on errors or when archetype is User Story / Feature / Task / Spike. | Bug, Incident |
| Phase 2.5 | Decide whether reporter follow-up is warranted. Form severity recommendation (Bug, Incident) or scope summary (User Story, Feature, Task, Spike). Draft the matching Phase 4 comment in markdown, then run `prose-style` on it. | All |
| Phase 3 | **Hard pause.** Show findings, archetype detection, and proposed updates. Asks all decisions side by side in a single `AskUserQuestion` panel. Metadata writes always run after the gate. | All |
| Phase 4a | Convert the cleaned draft to safe HTML and post the severity assessment as a discussion comment via `wit_add_work_item_comment`. | Bug, Incident |
| Phase 4b | Convert the cleaned draft to safe HTML and post the scope summary comment. The "What's in scope" body adapts to archetype (User Story / Feature: requirements found and design refs; Task: definition of done and why-now; Spike: question to answer and what's already known). | User Story, Feature, Task, Spike |
| Phase 4c | Convert the cleaned draft to safe HTML and post the follow-up question tagging the reporter. Replaces 4a or 4b. | All (only when follow_up_needed) |
| Phase 5 | Refine via `azure-work-item-refiner` (with `Calling context: skip_preview=true.` to suppress the skill's own preview gate), then run `prose-style` on the refined title and description, render the cleaned output inline as an informational preview, and write `System.Title` + `System.Description` after `description_preview_pause_seconds`. | All |
| Phase 6 | Severity write for Bug or Incident (`Microsoft.VSTS.Common.Severity`). Skipped for User Story / Feature / Task / Spike. No SLA due-date computation yet (deferred to v0.3.0). | Bug, Incident |
| Phase 7 | Link related/duplicate work items via `wit_update_work_item` adding a relations entry (`System.LinkTypes.Related`, `System.LinkTypes.Hierarchy-Forward`, `System.LinkTypes.Duplicate-Forward`). | All |
| Phase 8 | Append the triaged tag to `System.Tags`. | All |
| Phase 9 | Final assignee per `archetype_assignment_after_triage[<archetype>]`. The follow-up path moves to `waiting_reply` here; the standard path leaves the work item in `investigating` from Phase 0. | All |
| Phase 10 | Teams summary if a Teams MCP is installed and `teams_channel` is set; otherwise print inline. | All |

## Limitations

The agent will never:
- Close or resolve a work item without your approval.
- Modify `Microsoft.VSTS.Common.Priority` unless `severity_field` is configured to it.
- Post a comment without showing you the text first AND getting an explicit yes at the Phase 3 gate.
- Refine the title or description without an explicit yes at the Phase 3 gate. Phase 5 then renders the cleaned output inline as an informational preview and pauses for `description_preview_pause_seconds` (default 3) before writing.
- Tag the reporter until investigation is exhausted and a specific gap blocks meaningful triage. Reporter contact is a last resort.
- Remove or overwrite reporter-provided information during refinement (only append).
- Fabricate reproduction steps without verification.
- Mention an integration (Datadog, Teams, etc.) in any output if its API errored or returned no results.
- Drop screenshots, attachments, or inline links from the original description during refinement.

## FAQ

**Q: Can I run the agent on work items I'm not assigned to?**
A: Yes. Phase 0 assigns the work item to you as part of triage. After triage, the work item either stays with you or returns to the team pool based on `archetype_assignment_after_triage[<archetype>]`. Defaults: Bug unassigns; Incident, User Story, Feature, Task, and Spike stay assigned. Override per archetype if your team uses a different ownership rule.

**Q: Can I run the agent on a non-bug work item?**
A: Yes. Phase 1 calls `azure-requirements-investigator` instead of `azure-issue-investigator` for User Story, Feature, Task, and Spike. Phase 4 posts a scope summary instead of a severity assessment, with content adapted to the archetype. Phase 6 (severity write) is skipped.

**Q: Can I run only part of the workflow?**
A: Yes. The Phase 3 confirmation gate asks separately whether to post the proposed comment and whether to refine the title and description. Answer No to either and the agent skips that write while still doing the other updates.

**Q: Do I need to run `/azure-issue-triage:setup` before the first work item?**
A: Optional. The agent detects missing config on first run and offers to walk through the wizard inline or use defaults.

**Q: What happens if the agent encounters an error mid-flight?**
A: It stops at the failing phase, tells you what went wrong, and asks how to proceed. It does not roll back changes already made (Azure DevOps revision history is the audit trail).

**Q: How does archetype detection work?**
A: Phase 0 maps the work item's `System.WorkItemType` to one of Bug, Incident, User Story, Feature, Task, or Spike using the inverse of `work_item_type_map`. If the work-item type doesn't match any value in the map (e.g., a custom type), the agent pauses and asks which archetype to apply. If the type and content disagree (e.g., a Bug filed with acceptance criteria and a Figma link), the agent trusts the content and asks you to confirm at Phase 3.

**Q: I use `jira-issue-triage` for one project and `azure-issue-triage` for another. Will they collide?**
A: No. The investigator and refiner skills are prefixed (`azure-issue-investigator`, `azure-work-item-refiner`, etc.). The `prose-style` skills in the two plugins share a name but are addressed via plugin namespacing (`jira-issue-triage:prose-style`, `azure-issue-triage:prose-style`); the agents call their own copy.

## Contributing

Issues and PRs welcome at the marketplace repo. The agent body is at `agents/azure-issue-triage.md`; the manifest is at `.claude-plugin/plugin.json`. Bundled skills live under `skills/`.

## License

MIT. See the [`LICENSE`](../../LICENSE) at the repo root.
