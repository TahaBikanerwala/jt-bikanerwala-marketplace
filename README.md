# jt-bikanerwala-marketplace

A Claude Code plugin marketplace by [Taha Bikanerwala](https://github.com/TahaBikanerwala).

## Install

Add the marketplace once:

```
/plugin marketplace add TahaBikanerwala/jt-bikanerwala-marketplace
```

The full URL works too: `/plugin marketplace add https://github.com/TahaBikanerwala/jt-bikanerwala-marketplace`.

Then install any plugin from the table below:

```
/plugin install <plugin-name>@jt-bikanerwala-marketplace
```

For example, `/plugin install qa-tester@jt-bikanerwala-marketplace`. Dependencies such as `issuekit` install automatically. To pick up new versions later, run `/plugin marketplace update jt-bikanerwala-marketplace`.

## Available plugins

| Plugin | Version | What it does |
|--------|---------|--------------|
| [`issuekit`](./plugins/issuekit/) | 0.2.9 | Shared adapter layer for issue-tracker plugins. Auto-detects the active MCP (Azure DevOps, Jira) and exposes an abstract verb surface (`getIssue`, `getIssuesBatch`, `createIssue`, `addComment`, `transition`, `linkIssue`, `linkedPullRequests`, `getPullRequest`, `getSprintItems`, `getTeamCapacity`, ...). Auto-installed as a dependency of `postmortem-generator`, `issue-triager`, `sprint-status-reporter`, `story-drafter`, `acceptance-test-generator`, `bug-reporter`, `ticket-summarizer`, and `qa-tester`. Ships no MCP, no agent, no slash command — it's a library. Bring your own MCPs. |
| [`postmortem-generator`](./plugins/postmortem-generator/) | 2.0.0 | Paste an incident URL (Azure DevOps or Jira) and the agent gathers evidence from chat (Slack/Teams), the tracker, Datadog logs, and merged pull requests; reconstructs a chronological timeline with evidence tags; pauses for review; then writes a Google-SRE-style blameless postmortem. Bundles `incident-timeline-builder` and `postmortem-writer`. Ships `/postmortem-generator:run <URL or ID>`. Auto-installs `issuekit`. |
| [`issue-triager`](./plugins/issue-triager/) | 2.1.0 | Triages an issue end-to-end across all archetypes (Bug, Incident, Story, Feature, Task, Spike) on any supported tracker (Azure DevOps, Jira): assigns, transitions to investigating, runs the matching investigation skill, refines title and description, posts an assessment comment, sets severity + due date or sprint + story points, links related work, applies the triaged label, and posts a chat summary. **This is where the codebase dig lives.** On a Bug or Incident it runs `fix-proposer` over your checkout to localize the defect, and adds a **Proposed fix (unverified)** to the assessment comment naming the file, symbol, why the code produces the symptom, blast radius, and the confirming check **only** when the suspect code was actually read and explains the symptom at `[VERIFIED]`/`[OBSERVED]`; below that bar you get a suspected area and a where-to-look instead, and no patch is ever written. All writes pass through a single diff-and-confirm gate; the diff is the dry-run. Bundles `issue-refiner`, `requirements-investigator`, and `fix-proposer`. Ships `/issue-triager:run <URL or ID>` (full workflow) and `/issue-triager:investigate-and-refine <URL or ID>` (lightweight subset, skips the code dig). Auto-installs `issuekit`. |
| [`testid-injector`](./plugins/testid-injector/) | 0.2.0 | Adds missing `data-testid` attributes to web UI source. Scans React/JSX/TSX first, auto-detecting plain HTML, Vue SFC, and Angular templates; finds every form control, dropdown, dropdown option, link, and element made interactive by a handler or role that lacks a test id; then generates stable semantic kebab-case ids and writes them in. Idempotent — it never overwrites an existing id — and gated: every change passes through one diff-and-confirm step. Attribute name, naming scheme, scope, and include/exclude globs are configurable via `.claude/testid-policy.json`. Bundles `element-catalog` and `testid-namer`. Ships `/testid-injector:run` (scan and write, gated) and `/testid-injector:audit` (read-only coverage report). No MCPs required. |
| [`sprint-status-reporter`](./plugins/sprint-status-reporter/) | 2.2.0 | Reports on the current sprint on any supported tracker (Azure DevOps, Jira) three ways. `/run` tallies work items by state (Done / In Progress / To Do), computes percent complete and remaining count, flags blocked and stale items, then emits a [Marp](https://marp.app/) status deck. `/progress-delta` compares the sprint now against an earlier snapshot (or reconstructed history) and emits a what-changed deck: what shipped, newly started, scope added/dropped, new risk, and progress movement. `/pulse` publishes the same numbers to a private, always-current Claude Artifact dashboard with one tile per ticket label (active and closed counts), Risks & Blockers, and a paste-ready "Copy for deck" view, and refreshes that same page on every later run. `/pulse` takes a `--from`/`--till` or `--range` date window and a `--status` filter to bound which closed and new tickets show; active tickets always show in full. Every run writes a snapshot so deltas accumulate. Read-only: no tracker writes, no confirmation gate, safe to run anytime. Bundles `sprint-analyzer`, `deck-composer`, `delta-analyzer`, `delta-narrator`, and `dashboard-composer`. Ships `/sprint-status-reporter:run`, `/sprint-status-reporter:progress-delta`, and `/sprint-status-reporter:pulse`. Auto-installs `issuekit`. |
| [`story-drafter`](./plugins/story-drafter/) | 1.0.1 | Turns ambiguous, unclear requirements (pasted notes, a meeting transcript, or a rough brief) into INVEST user stories and creates them standalone in the tracker (Azure DevOps, Jira) tagged `Draft`. Brainstorms the requirements topic-by-topic, clarifies the gaps that block story creation, asks which candidate stories to create (multi-select + free-form notes), probes the local codebase to self-answer open questions the code already answers, then writes full stories (Problem Statement, Background, Given/When/Then acceptance criteria, In/Out of Scope, Definition of Done, Open Questions) and creates them behind a single diff-and-confirm gate. Bundles `requirements-brainstormer`, `story-writer`, and `codebase-prober`. Ships `/story-drafter:run <requirements or file path>`. Auto-installs `issuekit`. |
| [`bug-reporter`](./plugins/bug-reporter/) | 0.2.1 | Writes a proper **Bug** in the tracker (Azure DevOps, Jira) from a single line, or turns an ambiguously written bug into one, in seconds. Searches for duplicates (confirming by reading the candidate, not by title), then asks in one card only what the reporter alone can answer. Files the report: Summary, Environment, Preconditions, Steps to Reproduce, Expected vs Actual, Frequency, Impact and Affected Scope, Evidence, Regression, Workaround, Fix Verification, and an explicit **Missing Information** list. **Any section the input does not answer is omitted entirely** — no `Not provided by the reporter.`, no `TBD`, no empty heading, and on Azure DevOps no write to the field at all — so the report is exactly as long as what is known and a thin intake reads as thin; every one of those gaps becomes a question in Missing Information rather than an invented fact. An explicit "no" is an answer and stays (`None known.` under Workaround), which is the distinction severity depends on. **It never reads your codebase and never investigates** — no `Grep`, no `Bash`, no suspected area, no proposed fix, no theory of the cause — so reporting a bug stays fast; `/issue-triager:run` owns the code dig and runs when someone picks the bug up. Severity and priority land as real fields; on Azure DevOps the repro sections route to `Microsoft.VSTS.TCM.ReproSteps` and environment to `SystemInfo`. Leaves the bug unassigned and untransitioned for `issue-triager`. Bundles `bug-report-writer`. Ships `/bug-reporter:run` (create or refine, gated) and `/bug-reporter:draft` (read-only preview). Auto-installs `issuekit`. |
| [`acceptance-test-generator`](./plugins/acceptance-test-generator/) | 0.1.1 | Turns a user story and its acceptance criteria into a rigorous BDD test suite. Reads the story from the tracker (Azure DevOps, Jira), a spec file, or pasted text, decomposes every AC with senior test-design technique (equivalence partitioning, boundary-value analysis, decision tables, state-transition and negative-path coverage), then writes canonical Gherkin `.feature` files with smartly consolidated scenarios (multiple related assertions per behavior, never coupled) and detailed steps. **Test cases derive only from the story and acceptance criteria; the codebase is read read-only for reference** — selectors, existing feature-file style, terminology, spec-vs-code drift — and never as the basis of a test. Optionally creates each scenario as a Test Case work item (Azure DevOps Test Case with the runnable Steps grid populated; Jira Test) linked back to the source story, one diff-and-confirm gate per Test Case. Every scenario carries an `@AC-<n>` traceability tag. Bundles `acceptance-analyzer`, `bdd-scenario-writer`, and `code-reference-prober`. Ships `/acceptance-test-generator:run` (generate) and `/acceptance-test-generator:coverage` (read-only coverage plan). Auto-installs `issuekit`. |
| [`ticket-summarizer`](./plugins/ticket-summarizer/) | 0.2.0 | Fetches Azure DevOps or Jira work items — either an explicit list of tickets, or everything matching a date range and status — and turns each into a concise, plain-language blurb for a client-update deck: one short sentence, rarely a second, never a third. Accepts pasted ticket ids/urls, a `--from`/`--till` window or a `--range this-week/last-week/this-month/last-month` preset, and a `--status` that combines `active`, `delivered`, `closed` and `updated`. Queries are scoped to Story, Bug and Epic (plus Feature on Azure DevOps). Prints one ready-to-paste brief line per item (id, title, blurb, assignee). Every blurb states what was delivered and, only when the ticket's own text supports it, why it matters; it never invents a business-value claim. After asking, it can send the summary to Slack or Teams, save it to a file, or copy it to the clipboard. Bundles `executive-blurb-writer`. Ships `/ticket-summarizer:run`. Read-only against the tracker: no tracker writes, no confirmation gate. Auto-installs `issuekit`. |
| [`qa-tester`](./plugins/qa-tester/) | 0.1.0 | Tests a ticket or pull request in a real browser like a senior QA. Reads the Azure DevOps or Jira ticket and every linked PR, following links both ways. **The ticket and its acceptance criteria are the source of truth**: anything in the PR that differs (missing scope, extra scope, contradicting values, scope changed in review) is reported as a discrepancy and tested against the ticket. Drafts a full edge-case test plan built on a **minimal shared test data set**, so many cases reuse the same records and cleanup is trivial. Then executes every case through chrome-devtools MCP or Claude in Chrome, whichever is connected, with console, network and screenshot evidence and flake re-runs. Untestable cases are marked with the reason and the run continues; **all questions come once, at the end**, and any case the answers unblock is re-run. Writes `docs/qa/<id>/test-plan.md` and a `test-report.md` with a Go / Go with risks / No-go verdict, then optionally posts a results comment and files one Bug per defect through `bug-reporter`, each behind a gate. Environments, login method and data rules are asked once and saved to `.claude/qa-tester-policy.json` (no secrets). Bundles `source-reconciler`, `test-case-designer`, `browser-test-executor`, and `test-report-writer`. Ships `/qa-tester:run`, `/qa-tester:plan`, and `/qa-tester:setup`. Auto-installs `issuekit` and `acceptance-test-generator`; `bug-reporter` is optional. |

`postmortem-generator`, `issue-triager`, `sprint-status-reporter`, `story-drafter`, `acceptance-test-generator`, `bug-reporter`, `ticket-summarizer`, and `qa-tester` declare `issuekit` as a dependency; Claude Code auto-installs it when you install any of them. Install `issuekit` directly only if you want the shared verb surface for some other purpose. `qa-tester` also auto-installs `acceptance-test-generator`, whose `acceptance-analyzer` skill it reuses. `testid-injector` has no dependencies.

### Naming convention

Every plugin is named for the tool it is — an actor noun ending in `-er` or `-or`. Each one's primary entry point is `:run`; secondary commands keep descriptive names (`:audit`, `:draft`, `:coverage`, `:plan`, `:setup`, `:pulse`, `:progress-delta`, `:investigate-and-refine`).

The same rule governs bundled skills, with one carve-out: skills that *do* work take actor nouns (`postmortem-writer`, `delta-analyzer`, `fix-proposer`), while skills that *are* a reference or adapter layer keep descriptive nouns — `tracker-adapter`, `element-catalog`, `prose-style`. `issuekit` is exempt for that same reason: it's a library, not an actor.

## Configure your MCPs

Plug-and-play in this suite = **`issuekit` + a verb-plugin + your own MCPs.** No plugin bundles a `.mcp.json`; you bring whatever you have.

### Tracker MCP

At least one tracker MCP is required by every plugin except these:
- `testid-injector`, which needs no MCP at all;
- `acceptance-test-generator`, which can also read a pasted or file-based story;
- `qa-tester`, which can also test a GitHub PR with no tracker.

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

### Optional MCPs and tools the agents use opportunistically

| MCP or tool | Used by | Behavior when missing |
|---|---|---|
| Slack or Teams | `postmortem-generator`, `issue-triager` (chat search, escalation post); `ticket-summarizer` (send the summary) | Chat search skips silently; posts fall back to an inline summary |
| Confluence or Azure Wiki | `postmortem-generator`, `issue-triager` (runbook and design-doc search) | Doc search skips silently |
| Datadog | `postmortem-generator`, `issue-triager` (log search) | Log step skips silently |
| Browser: [chrome-devtools MCP](https://github.com/ChromeDevTools/chrome-devtools-mcp) or Claude in Chrome | `qa-tester` (test execution) | Drafts the plan and a manual checklist; never reports a pass |
| `gh` CLI, authenticated | `qa-tester` (read GitHub PRs) | GitHub PRs are read from the URL only, without files or review threads |

No output ever mentions a backend that is unavailable.

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

/plugin install postmortem-generator@jt-bikanerwala-marketplace
/plugin install issue-triager@jt-bikanerwala-marketplace
/plugin install sprint-status-reporter@jt-bikanerwala-marketplace
/plugin install story-drafter@jt-bikanerwala-marketplace
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

/plugin install issue-triager@jt-bikanerwala-marketplace
/plugin install postmortem-generator@jt-bikanerwala-marketplace
```

The old `*-setup` wizards are gone. `issuekit` lazy-prompts for any missing policy key at the moment it's needed and offers to persist the answer to `.claude/tracker-policy.json`.

The legacy plugin source still lives in this repo's git history if you need to recover it.

## Roadmap

Additional tracker adapters (GitHub Issues, Linear, Shortcut) are tracked but not committed to. PRs and feature requests welcome.

## Author

[Taha Bikanerwala](https://github.com/TahaBikanerwala)

## License

MIT: see [`LICENSE`](./LICENSE).
