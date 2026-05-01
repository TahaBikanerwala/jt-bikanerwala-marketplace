# jira-bug-triage

A Claude Code plugin that ships one subagent, `bug-triage-agent`. Paste a Jira bug ticket URL and tell it to triage; the agent assigns the ticket to you, transitions it to investigating, runs an investigation across Slack/Confluence/Jira (and optionally code), searches observability data, drafts a severity assessment, refines the ticket title and description, sets a severity-based due date, applies the triaged label, and DMs you a one-line summary on Slack. The agent assigns the ticket to you and transitions it to investigating as it starts work. It pauses at the Phase 3 confirmation gate (before posting any comment, changing the description, or updating other fields) to show you the full findings and get your approval.

## Prerequisites

### Required

- **Atlassian MCP server.** The agent needs full Jira access (read tickets, edit fields, post comments, transition, link, look up users). Install via Claude Code's plugin system (e.g., `/plugin install atlassian` if available in your marketplace) and follow the Atlassian plugin's setup docs to authenticate against your Jira site.

### Recommended (the agent gracefully degrades without these)

- **Slack MCP server.** Used for Phase 1 investigation (search threads), reporter EM lookup, and the Phase 10 summary DM. Without it, the agent skips Slack search and prints the summary instead of DM'ing it.
- **Datadog MCP server.** Used for Phase 2 log search. Without it, Phase 2 is silently skipped.

### Sibling skills

The agent calls three other skills during the workflow. Two ship bundled with this plugin; the third is planned as a separate plugin in the same marketplace.

**Bundled with this plugin** (installed automatically when you install `jira-bug-triage`):

| Skill name | Purpose | Status |
|-----------|---------|--------|
| `issue-investigator` | Phase 1 investigation (Slack/Jira/Confluence/Datadog/code with evidence tags) | Bundled, ready to use |
| `jira-ticket-refiner` | Phase 5 title and description rewrite. Works for any archetype (Bug, Feature, Task, Incident, Spike). | Bundled, ready to use |

**Future separate plugins** (planned; not yet shipped):

| Skill name | Purpose | Status |
|-----------|---------|--------|
| `prose-style` | Writing-rule application (no em dashes, no LLM vocabulary, lead with the answer) | Coming soon |

The agent ships with a brief inline fallback for `prose-style`. If `prose-style` isn't installed, the agent uses the fallback rules and warns you once at the start of Phase 5. The fallback is intentionally short; install the sibling plugin when it ships for full quality.

The agent body also retains short defensive fallbacks for the **bundled** skills (`issue-investigator`, `jira-ticket-refiner`). These fallbacks fire only in the rare case where a bundled skill fails to load at runtime. You should never need to think about them; they are kept as belt-and-suspenders for the `Skill` tool.

## Quick start

1. Add the marketplace and install the plugin:

   ```
   /plugin marketplace add github.com/TahaBikanerwala/jt-bikanerwala-marketplace
   /plugin install jira-bug-triage
   ```

2. Verify the agent appears: open the Agent tool list and confirm `bug-triage-agent` appears.
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

- `project_key`: inferred from the ticket URL prefix (e.g., `BUG-123` → `BUG`).
- `severity_field_name`: auto-discovered. Order: `Severity Level` → `Severity` → `Bug Severity`. Falls back to native `priority` if no Severity custom field is found.
- `triaged_label`: `triaged`.
- `skip_labels`: empty (no skip rule).
- `transitions`: names shown above.
- `severity_scheme`: 3-tier (Sev-1 / Sev-2 / Sev-3) with 7/14/90 day due-date offsets.
- `escalation`: all null. On Sev-1 the agent flags the severity in the assessment comment and DMs you on Slack. No comment tags, no channel pings.

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
- If Alice doesn't acknowledge within the SLA your team uses (the agent doesn't track this; your runbook does), you can ask the agent to ping `fallback_contact` the same way.

**Ad-hoc escalation:** mid-conversation you can also say "escalate this to Alice" and the agent will look her up, confirm the match, and post, without changing your config file.

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
- Tag the reporter or their EM until investigation is exhausted and a specific gap blocks meaningful triage. Reporter contact is a last resort.
- Tag anyone other than the reporter or their EM in a follow-up question.
- Remove or overwrite reporter-provided information during refinement (only append).
- Fabricate reproduction steps without verification.
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

MIT. See the [`LICENSE`](../../LICENSE) at the repo root.
