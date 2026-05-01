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
| [`jira-issue-triage`](./plugins/jira-issue-triage/) | 1.0.0 | Subagent that triages Jira issues across all archetypes (Bug, Incident, Feature, Task, Spike): assigns, runs the matching investigation skill, refines the title and description, posts an archetype-appropriate assessment comment, and DMs you a summary. Bundles `issue-investigator` (Bug/Incident), `requirements-investigator` (Feature/Task/Spike), and `jira-ticket-refiner` (any archetype). Ships a `/jira-issue-triage:setup` wizard for first-time configuration. |

## What changed in 1.0.0

The plugin (formerly `jira-bug-triage`) was renamed and expanded to handle all Jira archetypes, not just Bugs. The agent (formerly `bug-triage-agent`) is now `jira-issue-triage`. A new bundled skill `requirements-investigator` joins the existing two for non-bug archetypes. A `/jira-issue-triage:setup` wizard prompts for configuration on first run, and the agent body has an inline first-run wizard fallback for users who skip the slash command.

Migration: `/plugin uninstall jira-bug-triage` then `/plugin install jira-issue-triage`. The legacy config file path (`.claude/jira-bug-triage.config.json`) keeps working for one minor version (1.x) with a deprecation warning. See the [design spec](./docs/superpowers/specs/2026-05-01-jira-issue-triage-design.md) for the full change list and the [implementation plan](./docs/superpowers/plans/2026-05-01-jira-issue-triage.md) for the bite-sized steps.

## Roadmap

These plugins are planned but not yet shipped. The `jira-issue-triage` plugin references them by name and falls back gracefully when they're not installed.

| Plugin | What it will do | Status |
|--------|-----------------|--------|
| `prose-style` | Apply writing rules (no em dashes, no LLM vocabulary, lead with the answer) to text the model produces. | Planned |

No timeline commitments. PRs and feature requests welcome.

## Author

[Taha Bikanerwala](https://github.com/TahaBikanerwala)

## License

MIT: see [`LICENSE`](./LICENSE).
