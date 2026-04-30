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
| [`jira-bug-triage`](./plugins/jira-bug-triage/) | 0.2.0 | Subagent that triages Jira bug tickets end-to-end: assigns, investigates (Slack/Confluence/Jira/Datadog), refines the description, sets severity-based due dates, and DMs you a summary. Bundles the `issue-investigator` skill. |

## Roadmap

These plugins are planned but not yet shipped. The `jira-bug-triage` plugin references them by name and falls back gracefully when they're not installed.

| Plugin | What it will do | Status |
|--------|-----------------|--------|
| `jira-ticket-refiner` | Restructure poorly written Jira tickets into clear, self-contained documents. | Planned |
| `prose-style` | Apply writing rules (no em dashes, no LLM vocabulary, lead with the answer) to text the model produces. | Planned |

No timeline commitments. PRs and feature requests welcome.

## Author

[Taha Bikanerwala](https://github.com/TahaBikanerwala)

## License

MIT: see [`LICENSE`](./LICENSE).
