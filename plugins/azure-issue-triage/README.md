# azure-issue-triage

A Claude Code plugin that ships one subagent (`azure-issue-triage`) and a setup wizard (`/azure-issue-triage:setup`). Paste any Azure DevOps work-item URL (Bug or Task) and tell the agent to triage. The agent assigns the work item to you, transitions it to investigating, runs the matching investigation skill, drafts an archetype-appropriate assessment comment, refines the title and description, applies a triaged tag, and posts a one-line summary on Microsoft Teams. The agent pauses at the Phase 3 confirmation gate (before posting any comment, changing the description, or updating other fields) to show you the full findings and get your approval.

This plugin is a sibling of [`jira-issue-triage`](../jira-issue-triage/). The two plugins install side by side; the workflows are conceptually identical but call platform-specific tools.

## Status: v0.1.0 cut-down release

This is the initial v0.1.0 release. Compared to `jira-issue-triage` v1.3.0:

- **Supported archetypes:** Bug and Task only. Incident, User Story, Spike, Epic, and Feature ship in a future release.
- **Severity SLA dates and escalation are deferred** to v0.2.0. The agent records severity but does not compute due dates or page on-call.
- **Sprint placement (iteration path)** and advanced custom fields are deferred to v0.2.0.
- **Azure Repos PR linking** (`wit_link_work_item_to_pull_request`) is deferred to v0.2.0.

The cut-down scope keeps v0.1.0 reviewable and lets you exercise the workflow against real work items before more surface area lands.

## Prerequisites

### Required

- **Azure DevOps MCP server.** The agent needs full Boards access (read work items, edit fields, post comments, query via WIQL, link work items, look up users). Microsoft ships an official server at [github.com/microsoft/azure-devops-mcp](https://github.com/microsoft/azure-devops-mcp) (`@azure-devops/mcp`). Install it through Claude Code's plugin or MCP config and authenticate against your Azure DevOps organization.

  **Tool-prefix note.** MCP tool names are scoped by however your Claude Code client mounts the server (e.g., `mcp__azure_devops__wit_get_work_item`, `mcp__plugin_ado__wit_get_work_item`, etc.). The agent body lists tool names in their commonly-used short form (`wit_get_work_item`, `wit_query_by_wiql`, `wiki_search`, `core_list_projects`). If your install prefixes them, the frontmatter and inline references in `agents/azure-issue-triage.md` need the prefix added once. The setup wizard prints the prefix it detects so you can update the agent body in one pass.

### Recommended (the agent gracefully degrades without these)

- **Microsoft Teams MCP server.** Used for the Phase 10 summary message. There is no canonical first-party Teams MCP yet; community options include InditexTech/mcp-teams-server and msfeldstein/MCP-MS-Teams. Without one installed, the agent prints the summary inline instead of sending a Teams message.
- **Datadog MCP server.** Used for Phase 2 log search on Bug archetypes. Without it (or for Task archetypes), Phase 2 is silently skipped.

The plugin does not depend on Slack or Confluence. If you also use `jira-issue-triage`, both plugins coexist; their `prose-style` skills resolve via plugin namespacing.

### Bundled skills

The agent calls four skills during the workflow. All four ship bundled with this plugin and install automatically.

| Skill name | Phase | Used for | Status |
|-----------|-------|----------|--------|
| `azure-issue-investigator` | Phase 1 (Bug) | Teams/AzDO/Wiki/Datadog/code investigation with evidence tags | Bundled, beta |
| `azure-requirements-investigator` | Phase 1 (Task) | Teams/AzDO/Wiki search for prior decisions, design refs, scope; per-archetype report templates | Bundled, beta |
| `azure-work-item-refiner` | Phase 5 (any archetype) | Title and description rewrite. Already archetype-aware (Bug, Task). | Bundled, beta |
| `prose-style` | Phase 2.5 + Phase 5 (any archetype) | Writing-rule application: strips em dashes, opener phrases, LLM vocabulary, bullet sprawl. Mirror of `jira-issue-triage/skills/prose-style/`. | Bundled, ready to use |

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
    "Task": "Task"
  },
  "archetype_assignment_after_triage": {
    "Bug": "unassign",
    "Task": "self"
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
- `work_item_type_map`: `Bug -> Bug`, `Task -> Task`. Override for Scrum (`Bug -> Bug`, `Task -> Task` is the same; if you triage Product Backlog Items add a key once Story is in scope) or CMMI.
- `archetype_assignment_after_triage`: `Bug = "unassign"`, `Task = "self"`. Override per archetype.
- `teams_channel`: null. The agent prints the summary inline.
- `description_preview_pause_seconds`: `3`. The pause between the Phase 5 informational preview and the actual write.

### Process-template note

The defaults assume the **Agile** process template. If your project uses Scrum or CMMI:

- **Scrum:** Bug and Task work-item types exist with the same names. Severity is not present by default; override `severity_field` to `Microsoft.VSTS.Common.Priority` and use the 1-4 priority field instead.
- **CMMI:** Bug and Task exist; Severity is built in. Investigation states differ ("Proposed", "Active", "Resolved"). Override the `states` block.

The wizard auto-detects the process template via `core_list_projects` where possible and proposes the matching defaults.

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

Phase 2 is silently skipped. The agent never mentions Datadog in any output. No configuration needed. Phase 2 also skips silently for Task archetypes.

### Teams not installed

Phase 10 prints the summary inline as agent output instead of sending a Teams message. The agent notes once at the end of the run: "Teams DM unavailable; install a Teams MCP server to enable."

## Workflow phases

The workflow runs a generic core for both supported archetypes. The investigation skill and the Phase 4 comment shape gate on archetype.

| Phase | What it does | Archetypes |
|-------|--------------|------------|
| Prerequisites | Auto-discover identity, load config (with first-run wizard fallback if missing), confirm work-item-type and severity-field availability. | All |
| Phase 0 | Fetch work item via `wit_get_work_item`, run skip-tag check, detect archetype, assign to you (`System.AssignedTo`), transition to `investigating` state+reason. | All |
| Phase 1 | Investigation: `azure-issue-investigator` (Bug) or `azure-requirements-investigator` (Task). | All (skill choice gates on archetype) |
| Phase 2 | Datadog log search using signals from Phase 1. Silently suppressed on errors or when archetype is Task. | Bug |
| Phase 2.5 | Decide whether reporter follow-up is warranted. Form severity recommendation (Bug) or scope summary (Task). Draft the matching Phase 4 comment in markdown, then run `prose-style` on it. | All |
| Phase 3 | **Hard pause.** Show findings, archetype detection, and proposed updates. Asks all decisions side by side in a single `AskUserQuestion` panel. Metadata writes always run after the gate. | All |
| Phase 4a | Convert the cleaned draft to safe HTML and post the severity assessment as a discussion comment via `wit_add_work_item_comment`. | Bug |
| Phase 4b | Convert the cleaned draft to safe HTML and post the scope summary comment. | Task |
| Phase 4c | Convert the cleaned draft to safe HTML and post the follow-up question tagging the reporter. Replaces 4a or 4b. | All (only when follow_up_needed) |
| Phase 5 | Refine via `azure-work-item-refiner` (with `Calling context: skip_preview=true.` to suppress the skill's own preview gate), then run `prose-style` on the refined title and description, render the cleaned output inline as an informational preview, and write `System.Title` + `System.Description` after `description_preview_pause_seconds`. | All |
| Phase 6 | Severity assignment for Bug (writes `Microsoft.VSTS.Common.Severity`). Skipped for Task. No SLA due-date computation in v0.1.0. | Bug |
| Phase 7 | Link related/duplicate work items via `wit_update_work_item` adding a relations entry (`System.LinkTypes.Related`, `System.LinkTypes.Hierarchy-Forward`, `System.LinkTypes.Duplicate-Forward`). | All |
| Phase 8 | Append the triaged tag to `System.Tags`. | All |
| Phase 9 | Final assignee per `archetype_assignment_after_triage[<archetype>]`. **No final transition in v0.1.0** beyond what Phase 0 set; the work item stays in the investigating state until the next workflow step. | All |
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
A: Yes. Phase 0 assigns the work item to you as part of triage. After triage, the work item either stays with you or returns to the team pool based on `archetype_assignment_after_triage[<archetype>]`. Defaults: Bug unassigns; Task stays assigned.

**Q: Can I run the agent on a Task work item?**
A: Yes. Phase 1 calls `azure-requirements-investigator` instead of `azure-issue-investigator`. Phase 4 posts a scope summary instead of a severity assessment. Phase 6 is skipped.

**Q: Can I run only part of the workflow?**
A: Yes. The Phase 3 confirmation gate asks separately whether to post the proposed comment and whether to refine the title and description. Answer No to either and the agent skips that write while still doing the other updates.

**Q: Do I need to run `/azure-issue-triage:setup` before the first work item?**
A: Optional. The agent detects missing config on first run and offers to walk through the wizard inline or use defaults.

**Q: What happens if the agent encounters an error mid-flight?**
A: It stops at the failing phase, tells you what went wrong, and asks how to proceed. It does not roll back changes already made (Azure DevOps revision history is the audit trail).

**Q: How does archetype detection work?**
A: Phase 0 maps the work item's `System.WorkItemType` to one of Bug or Task using `work_item_type_map`. If the work-item-type and content disagree, the agent trusts the content and asks you to confirm at Phase 3.

**Q: I use `jira-issue-triage` for one project and `azure-issue-triage` for another. Will they collide?**
A: No. The investigator and refiner skills are prefixed (`azure-issue-investigator`, `azure-work-item-refiner`, etc.). The `prose-style` skills in the two plugins share a name but are addressed via plugin namespacing (`jira-issue-triage:prose-style`, `azure-issue-triage:prose-style`); the agents call their own copy.

## Contributing

Issues and PRs welcome at the marketplace repo. The agent body is at `agents/azure-issue-triage.md`; the manifest is at `.claude-plugin/plugin.json`. Bundled skills live under `skills/`.

## License

MIT. See the [`LICENSE`](../../LICENSE) at the repo root.
