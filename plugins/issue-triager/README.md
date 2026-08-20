# issue-triager

End-to-end issue triage on any supported tracker. Replaces both `azure-issue-triage` and `jira-issue-triage` with a single tracker-agnostic plugin powered by [`issuekit`](../issuekit/).

## Plug-and-play contract

Plug-and-play in this suite = `issuekit` + `issue-triager` + your own MCPs. This plugin ships **no** `.mcp.json` and bundles **no** vendor config.

## Install

```
/plugin install issue-triager@jt-bikanerwala-marketplace
```

`issuekit` is declared as a dependency and Claude Code auto-installs it for you.

You also need at least one tracker MCP:

- **Azure DevOps:** the official `@azure-devops/mcp` from Microsoft.
- **Jira:** the Atlassian remote MCP.

Optional MCPs the agent uses opportunistically:

- A chat MCP for thread search and escalation pings — Slack or Teams.
- A docs MCP for runbooks — Confluence or Azure Wiki.
- The Datadog MCP for log search (Bug and Incident only).

If a backend isn't installed, the agent skips the corresponding step and notes the gap once in the final summary.

## Use

```
@issue-triager <issue URL or ID>
```

or the slash-command shorthands:

```
/issue-triager:run <URL or ID>
/issue-triager:investigate-and-refine <URL or ID>
```

The `:run` form runs the full workflow (investigation → codebase dig → refinement → field updates → assignment → notification). The `:investigate-and-refine` form is a lightweight subset that only investigates and refines the title/description; it skips the codebase dig and does not assign, transition, set severity, or escalate.

Run `:run` from the repository the issue is about: Phase 2b reads the working directory.

## Where this sits next to `bug-reporter`

The two plugins split one job at the point where it gets expensive.

| | `/bug-reporter:run` | `/issue-triager:run` |
|---|---|---|
| Reads your codebase | No. It has no `Grep` and no `Bash`. | Yes. `fix-proposer` at Phase 2b. |
| Searches chat, docs, logs | No | Yes, via `issuekit:issue-investigator` |
| Produces | A complete bug report plus a Missing Information list | Investigation, suspected area, a proposed fix when the code supports one, and every triage field |
| Cost | Seconds | The slow one, by design |

File the bug while the symptom is fresh, then triage it when someone picks it up. A bug that arrives from `bug-reporter` carries no cause analysis at all, which is exactly what Phase 2b is for.

## Diff-and-confirm gate (the dry-run)

Phase 3 of the workflow is a single confirmation gate. Before any write happens, the agent shows you a markdown table of every change about to land:

| # | Verb | Field / target | Before | After |
|---|---|---|---|---|
| 1 | updateFields | title | "Bug" | "VMS: Visitor notifications not sending for scheduled visits" |
| 2 | updateFields | body | (current description, abridged) | (new markdown body, abridged) |
| 3 | transition | state | "New" | "investigating" → "Active" (reason: Investigating) |
| 4 | assign | assignee | unassigned | <running user> |
| 5 | addComment | new comment | — | "Investigation underway. Findings: ..." |
| 6 | addLabel | tags | — | + triaged |

You confirm once. The diff IS the dry-run — decline to abort cleanly.

## Workflow

Phase 3 is the only confirmation gate (Phase 0 has a halt for issue-type mismatches, but that's an early-exit, not a write gate).

| Phase | What happens |
|---|---|
| **0. Identify** | Fetch the issue. Detect archetype (Bug / Incident / Story / Feature / Task / Spike). Skip if it carries any `skip_labels`. |
| **1. Investigate** | Bug or Incident: run `issuekit:issue-investigator` (chat → tracker+docs → Datadog → code). Story/Feature/Task/Spike: run `requirements-investigator` (bundled). |
| **2a. Datadog (Bug/Incident only)** | Build queries from investigation signals; gather error patterns. Skip if `log == none`. |
| **2b. Localize the defect (Bug/Incident only)** | Run `fix-proposer` (bundled) over the local checkout: search the verbatim error string, find the module that owns the behavior, open the suspect code, check recent churn. Produces a suspected area, and a proposed fix when the code clears the confidence floor. Skipped in `investigate-and-refine` mode. |
| **2.5. Gap analysis** | When the investigation has `[UNKNOWN]` items that need reporter input, prepare the follow-up question for Phase 4c. |
| **3. Confirmation gate** | Show the full diff. User confirms or declines. **No writes have happened yet.** |
| **4a / 4b / 4c. Post comment** | Bug/Incident: assessment comment with hypotheses, suspected area, the proposed fix when there is one, and Where To Look. Story/Feature/etc: scope summary. Vague issues: follow-up question pinging the reporter. |
| **5. Refine** | Update title and description using the archetype template. Body markdown goes through the adapter's body-format converter. |
| **6. Severity + dates** | Bug/Incident: severity + due date. Story/Feature/Task/Spike: sprint + story points. |
| **7. Link** | Surface duplicate/related candidates from the investigation. Link PRs that mention the issue ID (AzDO only — Jira auto-links). |
| **8. Label** | Append the `triaged_label`. |
| **9. Final transition** | Bug → unassign + transition to backlog (or `waiting_reply` if a follow-up was posted). Others → keep assigned to self. |
| **10. Notify** | Post a one-line summary to the chat channel if `escalation.channel` is configured. Print inline summary either way. |

Phases 4–9 run only on Phase 3 confirmation. They execute as a batch through the diff-and-confirm gate; on the first failure, the batch stops and surfaces the partial state.

## Archetype taxonomy

| Archetype | AzDO types it matches | Jira types it matches |
|---|---|---|
| Bug | `Bug` | `Bug`, `Defect` |
| Incident | `Issue` (Agile) / `Impediment` (Scrum); with `incident` tag/label | `Incident`, `Outage`, anything tagged `incident` or `Sev-` |
| Story | `User Story` (Agile), `Product Backlog Item` (Scrum), `Requirement` (CMMI); `Feature` when leaf-level (no linked children) | `Story`, `Feature`, `Enhancement`, `New Feature` when leaf-level (no linked children) |
| Feature | `User Story` (Agile), `Product Backlog Item` (Scrum), `Requirement` (CMMI), `Feature` when epic-level (has one or more linked child work items) | `Story`, `Feature`, `Enhancement`, `New Feature` when epic-level (has one or more linked child work items) |
| Task | `Task` | `Task`, `Sub-task`, `Chore`, `Tech Debt` |
| Spike | `Task` with `spike` tag | `Spike`, `Research`, `Investigation` |

## Configuration

Read from `.claude/tracker-policy.json`. The keys this plugin uses:

- `states.investigating`, `states.waiting_reply`, `states.backlog` — abstract state mapping.
- `severity_scheme` — `sev1..sev4` → `{due_offset_days, escalate_immediately}`.
- `severity_label_map` — abstract tier → vendor label candidates.
- `escalation.{channel, primary_contact, fallback_contact}` — chat escalation.
- `skip_labels` — labels that opt an issue out.
- `triaged_label` — label appended after a successful run.
- `archetype_assignment_after_triage` — per-archetype assign-to policy.

When the file is absent, the agent uses defaults and lazy-prompts at the moment it encounters an unset key. Defaults are listed in [`issuekit/skills/tracker-adapter/references/policy-schema.md`](../issuekit/skills/tracker-adapter/references/policy-schema.md).

Legacy config files (`.claude/azure-issue-triage.config.json`, `.claude/jira-issue-triage.config.json`, `.claude/jira-bug-triage.config.json`) are read forward for the session with a one-time warning. To stop the warning, translate the values into `.claude/tracker-policy.json` and delete the legacy file. Lazy prompts persist any missing keys after that.

## Plugin-bundled skills

| Skill | Purpose |
|---|---|
| `issue-refiner` | Re-writes title and description into the archetype-matching template; emits canonical markdown with reserved tokens. |
| `requirements-investigator` | Investigates Story/Feature/Task/Spike issues (chat → tracker → docs → adjacent code areas). Distinct from `issuekit:issue-investigator`, which handles Bug/Incident. |
| `fix-proposer` | Reads the local checkout to localize a Bug or Incident and propose a fix, or to establish that the code does not support one. Owns the confidence floor: a proposal needs the suspect code read and explaining the symptom at `[VERIFIED]` or `[OBSERVED]`, otherwise you get a suspected area and a where-to-look. Never asserts root cause, never writes a patch. |

### The proposed fix

The rule that makes it worth reading: a proposal is emitted only when the suspect code was actually opened, with a nameable path and symbol, **and** that code explains the reported symptom at `[VERIFIED]` or `[OBSERVED]`.

- `[INFERRED]` alone yields a **suspected area** and a **where-to-look**, no proposal.
- A path found by search but never read is not enough.
- A defect pattern that usually causes this is not enough.
- Nothing matched means neither block appears, and the summary says why.

Proposals are titled **Proposed fix (unverified)**, carry their evidence tag and a confidence level, name the blast radius and the confirming check, and never assert root cause. They describe the shape of the change in prose and never ship a patch, because a triage comment is not a pull request and a fixer who reads a suggested diff stops thinking.

The proposal lands in the assessment comment, never in the issue description. The description is the record of the issue; the analysis is this triage pass's, and it stays attributable.

The agent also invokes `issuekit:tracker-adapter` (for every tracker read and write), `issuekit:issue-investigator` (for Bug/Incident investigation), and `issuekit:prose-style` (to clean any prose before write).

`fix-proposer` shipped with `bug-reporter` until v2.1.0. It moved here because reading a codebase is a triage decision, not an intake one, and filing a bug should not wait on it.

## Legacy config import

If your project still has `.claude/azure-issue-triage.config.json` or `.claude/jira-issue-triage.config.json` (or the older `.claude/jira-bug-triage.config.json`) from a previous version of this marketplace, the agent reads it forward for the session with a one-time warning. To stop the warning, translate the values into `.claude/tracker-policy.json` (shape documented in [`issuekit/skills/tracker-adapter/references/policy-schema.md`](../issuekit/skills/tracker-adapter/references/policy-schema.md)) and delete the legacy file. The lazy-prompt path will offer to persist any keys still missing.
