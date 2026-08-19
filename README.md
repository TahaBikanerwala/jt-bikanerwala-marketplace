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
| [`issuekit`](./plugins/issuekit/) | 0.2.8 | Shared adapter layer for issue-tracker plugins. Auto-detects the active MCP (Azure DevOps, Jira) and exposes an abstract verb surface (`getIssue`, `getIssuesBatch`, `createIssue`, `addComment`, `transition`, `linkIssue`, `getSprintItems`, `getTeamCapacity`, ...). Auto-installed as a dependency of `postmortem-generator`, `issue-triager`, `sprint-status-reporter`, `story-drafter`, `acceptance-test-generator`, and `bug-reporter`. Ships no MCP, no agent, no slash command — it's a library. Bring your own MCPs. |
| [`postmortem-generator`](./plugins/postmortem-generator/) | 2.0.0 | Paste an incident URL (Azure DevOps or Jira) and the agent gathers evidence from chat (Slack/Teams), the tracker, Datadog logs, and merged pull requests; reconstructs a chronological timeline with evidence tags; pauses for review; then writes a Google-SRE-style blameless postmortem. Bundles `incident-timeline-builder` and `postmortem-writer`. Ships `/postmortem-generator:run <URL or ID>`. Auto-installs `issuekit`. |
| [`issue-triager`](./plugins/issue-triager/) | 2.1.0 | Triages an issue end-to-end across all archetypes (Bug, Incident, Story, Feature, Task, Spike) on any supported tracker (Azure DevOps, Jira): assigns, transitions to investigating, runs the matching investigation skill, refines title and description, posts an assessment comment, sets severity + due date or sprint + story points, links related work, applies the triaged label, and posts a chat summary. **This is where the codebase dig lives.** On a Bug or Incident it runs `fix-proposer` over your checkout to localize the defect, and adds a **Proposed fix (unverified)** to the assessment comment naming the file, symbol, why the code produces the symptom, blast radius, and the confirming check **only** when the suspect code was actually read and explains the symptom at `[VERIFIED]`/`[OBSERVED]`; below that bar you get a suspected area and a where-to-look instead, and no patch is ever written. All writes pass through a single diff-and-confirm gate; the diff is the dry-run. Bundles `issue-refiner`, `requirements-investigator`, and `fix-proposer`. Ships `/issue-triager:run <URL or ID>` (full workflow) and `/issue-triager:investigate-and-refine <URL or ID>` (lightweight subset, skips the code dig). Auto-installs `issuekit`. |
| [`testid-injector`](./plugins/testid-injector/) | 0.2.0 | Adds missing `data-testid` attributes to web UI source. Scans React/JSX/TSX first, auto-detecting plain HTML, Vue SFC, and Angular templates; finds every form control, dropdown, dropdown option, link, and element made interactive by a handler or role that lacks a test id; then generates stable semantic kebab-case ids and writes them in. Idempotent — it never overwrites an existing id — and gated: every change passes through one diff-and-confirm step. Attribute name, naming scheme, scope, and include/exclude globs are configurable via `.claude/testid-policy.json`. Bundles `element-catalog` and `testid-namer`. Ships `/testid-injector:run` (scan and write, gated) and `/testid-injector:audit` (read-only coverage report). No MCPs required. |
| [`sprint-status-reporter`](./plugins/sprint-status-reporter/) | 2.0.0 | Reports on the current sprint on any supported tracker (Azure DevOps, Jira) two ways. `/run` tallies work items by state (Done / In Progress / To Do), computes percent complete and remaining count, flags blocked and stale items, then emits a [Marp](https://marp.app/) status deck. `/progress-delta` compares the sprint now against an earlier snapshot (or reconstructed history) and emits a what-changed deck: what shipped, newly started, scope added/dropped, new risk, and progress movement. Every run writes a snapshot so deltas accumulate. Read-only: no tracker writes, no confirmation gate, safe to run anytime. Bundles `sprint-analyzer`, `deck-composer`, `delta-analyzer`, and `delta-narrator`. Ships `/sprint-status-reporter:run` and `/sprint-status-reporter:progress-delta`. Auto-installs `issuekit`. |
| [`story-drafter`](./plugins/story-drafter/) | 1.0.1 | Turns ambiguous, unclear requirements (pasted notes, a meeting transcript, or a rough brief) into INVEST user stories and creates them standalone in the tracker (Azure DevOps, Jira) tagged `Draft`. Brainstorms the requirements topic-by-topic, clarifies the gaps that block story creation, asks which candidate stories to create (multi-select + free-form notes), probes the local codebase to self-answer open questions the code already answers, then writes full stories (Problem Statement, Background, Given/When/Then acceptance criteria, In/Out of Scope, Definition of Done, Open Questions) and creates them behind a single diff-and-confirm gate. Bundles `requirements-brainstormer`, `story-writer`, and `codebase-prober`. Ships `/story-drafter:run <requirements or file path>`. Auto-installs `issuekit`. |
| [`bug-reporter`](./plugins/bug-reporter/) | 0.2.1 | Writes a proper **Bug** in the tracker (Azure DevOps, Jira) from a single line, or turns an ambiguously written bug into one, in seconds. Searches for duplicates (confirming by reading the candidate, not by title), then asks in one card only what the reporter alone can answer. Files the report: Summary, Environment, Preconditions, Steps to Reproduce, Expected vs Actual, Frequency, Impact and Affected Scope, Evidence, Regression, Workaround, Fix Verification, and an explicit **Missing Information** list. **Any section the input does not answer is omitted entirely** — no `Not provided by the reporter.`, no `TBD`, no empty heading, and on Azure DevOps no write to the field at all — so the report is exactly as long as what is known and a thin intake reads as thin; every one of those gaps becomes a question in Missing Information rather than an invented fact. An explicit "no" is an answer and stays (`None known.` under Workaround), which is the distinction severity depends on. **It never reads your codebase and never investigates** — no `Grep`, no `Bash`, no suspected area, no proposed fix, no theory of the cause — so reporting a bug stays fast; `/issue-triager:run` owns the code dig and runs when someone picks the bug up. Severity and priority land as real fields; on Azure DevOps the repro sections route to `Microsoft.VSTS.TCM.ReproSteps` and environment to `SystemInfo`. Leaves the bug unassigned and untransitioned for `issue-triager`. Bundles `bug-report-writer`. Ships `/bug-reporter:run` (create or refine, gated) and `/bug-reporter:draft` (read-only preview). Auto-installs `issuekit`. |
| [`acceptance-test-generator`](./plugins/acceptance-test-generator/) | 0.1.1 | Turns a user story and its acceptance criteria into a rigorous BDD test suite. Reads the story from the tracker (Azure DevOps, Jira), a spec file, or pasted text, decomposes every AC with senior test-design technique (equivalence partitioning, boundary-value analysis, decision tables, state-transition and negative-path coverage), then writes canonical Gherkin `.feature` files with smartly consolidated scenarios (multiple related assertions per behavior, never coupled) and detailed steps. **Test cases derive only from the story and acceptance criteria; the codebase is read read-only for reference** — selectors, existing feature-file style, terminology, spec-vs-code drift — and never as the basis of a test. Optionally creates each scenario as a Test Case work item (Azure DevOps Test Case with the runnable Steps grid populated; Jira Test) linked back to the source story, behind a single diff-and-confirm gate. Every scenario carries an `@AC-<n>` traceability tag. Bundles `acceptance-analyzer`, `bdd-scenario-writer`, and `code-reference-prober`. Ships `/acceptance-test-generator:run` (generate) and `/acceptance-test-generator:coverage` (read-only coverage plan). Auto-installs `issuekit`. |
| [`ticket-summarizer`](./plugins/ticket-summarizer/) | 0.1.1 | Fetches Azure DevOps or Jira work items — either an explicit list of tickets, or everything matching a date range and status — and turns each into a plain-language, one-to-two sentence executive summary for a client-update deck. Supports three query shapes: pasted ticket ids/urls, a date range with a status (`delivered`/`closed`, or generic `updated`), or all currently active work items. Every blurb states what was delivered and, only when the ticket's own text supports it, why it matters; it never invents a business-value claim. Bundles `executive-blurb-writer`. Ships `/ticket-summarizer:run`. Read-only: no tracker writes, no confirmation gate. Auto-installs `issuekit`. |

`postmortem-generator`, `issue-triager`, `sprint-status-reporter`, `story-drafter`, `acceptance-test-generator`, `bug-reporter`, and `ticket-summarizer` declare `issuekit` as a dependency; Claude Code auto-installs it when you install any of them. Install `issuekit` directly only if you want the shared verb surface for some other purpose.

### Naming convention

Every plugin is named for the tool it is — an actor noun ending in `-er` or `-or`. Each one's primary entry point is `:run`; secondary commands keep descriptive names (`:audit`, `:draft`, `:coverage`, `:progress-delta`, `:investigate-and-refine`).

The same rule governs bundled skills, with one carve-out: skills that *do* work take actor nouns (`postmortem-writer`, `delta-analyzer`, `fix-proposer`), while skills that *are* a reference or adapter layer keep descriptive nouns — `tracker-adapter`, `element-catalog`, `prose-style`. `issuekit` is exempt for that same reason: it's a library, not an actor.

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

`issuekit` matches on tool-name **suffix** (`*__wit_get_work_item`, `*__getJiraIssue`, etc.), so it doesn't matter how the MCP is registered — pick whatever name you like. It also recognizes both Azure DevOps MCP tool-naming conventions: the classic one-tool-per-operation surface (`wit_get_work_item`, `wit_update_work_item`, ...) and the consolidated action-dispatched surface the official Microsoft server ships (`wit_work_item`, `wit_work_item_write`, ...), and picks whichever is actually present. If you somehow have two AzDO MCPs registered at once, it prefers a server named `azure-devops`/`azure_devops` and falls back to one named `ado`, then whatever else is registered — see `issuekit`'s `tracker-adapter` skill for the exact resolution order.

When both an AzDO MCP and a Jira MCP are present, `issuekit` resolves the active tracker per-issue by inspecting the URL/key the user pastes.

### Optional MCPs the agents use opportunistically

| MCP | Used by | Behavior when missing |
|---|---|---|
| Slack or Teams | Both verb-plugins (chat search, escalation channel post) | Chat-search step skips silently; channel post falls back to inline summary |
| Confluence or Azure Wiki | Both verb-plugins (runbook / design-doc search) | Doc-search step skips silently |
| Datadog | Both verb-plugins (log search) | Log step skips silently |

No plug-in mention of an unavailable backend appears in any output.

## Migrating from the previous plugin names

Four plugins were renamed onto the actor-noun convention above. A plugin name is its install identifier, so this is a breaking change and each renamed plugin took a major version bump.

| Old name | New name |
|---|---|
| `incident-postmortem` | `postmortem-generator` |
| `issue-triage` | `issue-triager` |
| `sprint-status-report` | `sprint-status-reporter` |
| `draft-stories` | `story-drafter` |

```
/plugin uninstall incident-postmortem
/plugin uninstall issue-triage
/plugin uninstall sprint-status-report
/plugin uninstall draft-stories

/plugin install postmortem-generator
/plugin install issue-triager
/plugin install sprint-status-reporter
/plugin install story-drafter
```

Three primary commands moved to `:run` in the same pass. The first two had been documented as `:run` all along while actually shipping under a different name, so those documented invocations never resolved:

| Old command | New command |
|---|---|
| `/incident-postmortem:postmortem` | `/postmortem-generator:run` |
| `/issue-triage:triage` | `/issue-triager:run` |
| `/testid-injector:inject` | `/testid-injector:run` |

Three bundled skills were renamed too: `sprint-analyst` → `sprint-analyzer`, `delta-analyst` → `delta-analyzer`, and `requirement-brainstormer` → `requirements-brainstormer`. These are internal to their plugins; nothing you invoke directly changes.

`issuekit` was not renamed, and its dependency ranges are unaffected. Each old plugin name is retained as a search keyword, so looking up `issue-triage` still surfaces `issue-triager`.

## Migrating from the vendor-specific plugins

This marketplace previously shipped three vendor-specific plugins: `jira-issue-triage`, `azure-issue-triage`, and `azure-incident-postmortem`. They've been replaced by the tracker-agnostic suite above. The new plugins detect the active tracker MCP at session start, so one plugin covers both AzDO and Jira instead of one per vendor.

If you had the old plugins installed, uninstall them and install the new ones:

```
/plugin uninstall jira-issue-triage
/plugin uninstall azure-issue-triage
/plugin uninstall azure-incident-postmortem

/plugin install issue-triager
/plugin install postmortem-generator
```

The old `*-setup` wizards are gone. `issuekit` lazy-prompts for any missing policy key at the moment it's needed and offers to persist the answer to `.claude/tracker-policy.json`.

The legacy plugin source still lives in this repo's git history if you need to recover it.

## Roadmap

Additional tracker adapters (GitHub Issues, Linear, Shortcut) are tracked but not committed to. PRs and feature requests welcome.

## Author

[Taha Bikanerwala](https://github.com/TahaBikanerwala)

## License

MIT: see [`LICENSE`](./LICENSE).
