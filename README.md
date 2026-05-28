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
| [`issuekit`](./plugins/issuekit/) | 0.1.0 | Shared adapter layer for issue-tracker plugins. Auto-detects the active MCP (Azure DevOps, Jira) and exposes an abstract verb surface (`getIssue`, `addComment`, `transition`, `linkIssue`, ...). Auto-installed as a dependency of `incident-postmortem` and `issue-triage`. Ships no MCP, no agent, no slash command — it's a library. Bring your own MCPs. |
| [`incident-postmortem`](./plugins/incident-postmortem/) | 1.0.0 | Paste an incident URL (Azure DevOps or Jira) and the agent gathers evidence from chat (Slack/Teams), the tracker, Datadog logs, and merged pull requests; reconstructs a chronological timeline with evidence tags; pauses for review; then writes a Google-SRE-style blameless postmortem. Bundles `incident-timeline-builder` and `postmortem-writer`. Ships `/incident-postmortem:run <URL or ID>`. Auto-installs `issuekit`. |
| [`issue-triage`](./plugins/issue-triage/) | 1.0.0 | Triages an issue end-to-end across all archetypes (Bug, Incident, Story, Feature, Task, Spike) on any supported tracker (Azure DevOps, Jira): assigns, transitions to investigating, runs the matching investigation skill, refines title and description, posts an assessment comment, sets severity + due date or sprint + story points, links related work, applies the triaged label, and posts a chat summary. All writes pass through a single diff-and-confirm gate; the diff is the dry-run. Bundles `issue-refiner` and `requirements-investigator`. Ships `/issue-triage:run <URL or ID>` (full workflow) and `/issue-triage:investigate-and-refine <URL or ID>` (lightweight subset). Auto-installs `issuekit`. |

`incident-postmortem` and `issue-triage` declare `issuekit` as a dependency; Claude Code auto-installs it when you install either verb-plugin. Install `issuekit` directly only if you want the shared verb surface for some other purpose.

## Configure your MCPs

Plug-and-play in this suite = **`issuekit` + a verb-plugin + your own MCPs.** No plugin bundles a `.mcp.json`; you bring whatever you have.

### Required: at least one tracker MCP

- **Azure DevOps:** the official Microsoft Azure DevOps MCP server, [`@azure-devops/mcp`](https://github.com/microsoft/azure-devops-mcp).
- **Jira:** the Atlassian remote MCP (or a community Jira MCP that exposes the same tool surface).

Register the MCP at the user level (in `~/.claude.json`) or project level (in `.mcp.json` at your repo root). Example AzDO entry:

```json
{
  "mcpServers": {
    "azure-devops": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@azure-devops/mcp", "YOUR_ORG_SLUG"],
      "env": { "AZURE_DEVOPS_PAT": "${AZURE_DEVOPS_PAT}" }
    }
  }
}
```

Replace `YOUR_ORG_SLUG` with the slug from your AzDO URL (`https://dev.azure.com/<slug>`) and export `AZURE_DEVOPS_PAT` from your shell. PAT needs at least: Work Items (Read & Write), Code (Read), Wiki (Read), Identity (Read).

`issuekit` matches on tool-name **suffix** (`*__wit_get_work_item`, `*__getJiraIssue`, etc.), so it doesn't matter how the MCP is registered — pick whatever name you like.

When both an AzDO MCP and a Jira MCP are present, `issuekit` resolves the active tracker per-issue by inspecting the URL/key the user pastes.

### Optional MCPs the agents use opportunistically

| MCP | Used by | Behavior when missing |
|---|---|---|
| Slack or Teams | Both verb-plugins (chat search, escalation channel post) | Chat-search step skips silently; channel post falls back to inline summary |
| Confluence or Azure Wiki | Both verb-plugins (runbook / design-doc search) | Doc-search step skips silently |
| Datadog | Both verb-plugins (log search) | Log step skips silently |

No plug-in mention of an unavailable backend appears in any output.

## Migrating from the vendor-specific plugins

This marketplace previously shipped three vendor-specific plugins: `jira-issue-triage`, `azure-issue-triage`, and `azure-incident-postmortem`. They've been replaced by the tracker-agnostic suite above. The new plugins detect the active tracker MCP at session start, so one plugin covers both AzDO and Jira instead of one per vendor.

If you had the old plugins installed, uninstall them and install the new ones:

```
/plugin uninstall jira-issue-triage
/plugin uninstall azure-issue-triage
/plugin uninstall azure-incident-postmortem

/plugin install issue-triage
/plugin install incident-postmortem
```

The old `*-setup` wizards are gone. `issuekit` lazy-prompts for any missing policy key at the moment it's needed and offers to persist the answer to `.claude/tracker-policy.json`.

The legacy plugin source still lives in this repo's git history if you need to recover it.

## Roadmap

Additional tracker adapters (GitHub Issues, Linear, Shortcut) are tracked but not committed to. PRs and feature requests welcome.

## Author

[Taha Bikanerwala](https://github.com/TahaBikanerwala)

## License

MIT: see [`LICENSE`](./LICENSE).
