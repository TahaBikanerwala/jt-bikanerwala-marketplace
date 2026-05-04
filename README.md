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
| [`jira-issue-triage`](./plugins/jira-issue-triage/) | 1.2.0 | Subagent that triages Jira issues across all archetypes (Bug, Incident, Feature, Task, Spike): assigns, runs the matching investigation skill, refines the title and description, posts an archetype-appropriate assessment comment, and DMs you a summary. Bundles `issue-investigator` (Bug/Incident), `requirements-investigator` (Feature/Task/Spike), `jira-ticket-refiner` (any archetype), and `prose-style` (writing-rule application on refined output and comments). Ships a `/jira-issue-triage:setup` wizard for first-time configuration. |

## What changed in 1.2.0

The Phase 3 confirmation gate splits into separate questions: post the proposed comment? refine the title and description? You can approve one and skip the other; metadata writes (severity, sprint, labels, links) and the final transition + Slack DM still run regardless. Phase 9's assignee behavior also gates on archetype: **Bug** unassigns (returns to the team pool, since bug triage is a routing role); **Incident, Feature, Task, and Spike** stay assigned to you, since the running user is typically the owner who keeps the work. Phase 10's Slack DM messages now state the assignment outcome explicitly.

Internal cleanups: setup wizard now uses the correct `AskUserQuestion` tool name and declares `allowed-tools`; the agent's Phase 0 fetch includes `comment` in the field list instead of relying on a non-existent `expand` parameter; `prose-style` skill frontmatter is normalized to match the other three bundled skills.

No migration steps. Re-install the plugin to pick up the new behavior.

## What changed in 1.1.0

The `prose-style` skill graduates from the Roadmap into the bundled set. The triage workflow now calls a real skill instead of relying on the inline writing-rules fallback at two points: Phase 2.5 styles the assessment/scope comment draft and any reporter follow-up so the user reviews a styled version at the Phase 3 confirmation gate, and Phase 5 styles the refined title and description after `jira-ticket-refiner` runs. AI tells (em dashes, opener phrases, LLM vocabulary, bullet sprawl) get stripped on the way out. The agent body keeps a defensive inline fallback at both invocation points for the rare runtime load failure.

No migration steps. Re-install the plugin to pick up the new bundled skill.

## What changed in 1.0.0

The plugin (formerly `jira-bug-triage`) was renamed and expanded to handle all Jira archetypes, not just Bugs. The agent (formerly `bug-triage-agent`) is now `jira-issue-triage`. A new bundled skill `requirements-investigator` joins the existing two for non-bug archetypes. A `/jira-issue-triage:setup` wizard prompts for configuration on first run, and the agent body has an inline first-run wizard fallback for users who skip the slash command.

Migration: `/plugin uninstall jira-bug-triage` then `/plugin install jira-issue-triage`. The legacy config file path (`.claude/jira-bug-triage.config.json`) keeps working for one minor version (1.x) with a deprecation warning.

## Roadmap

No additional plugins are planned at this time. PRs and feature requests welcome.

## Author

[Taha Bikanerwala](https://github.com/TahaBikanerwala)

## License

MIT: see [`LICENSE`](./LICENSE).
