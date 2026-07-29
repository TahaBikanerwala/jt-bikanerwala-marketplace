# bug-reporter

Write a proper **Bug** in your tracker (Azure DevOps or Jira) from a single line, or turn an
ambiguously written bug into one.

Hand it `checkout crashes when you apply a coupon twice` and it searches for duplicates, asks you only
what you alone can answer, and files the report: environment, preconditions, reproduction steps,
expected versus actual, frequency, impact and scope, evidence, regression, workaround, fix verification,
and an explicit list of what is still missing. Whatever you did not answer is left out rather than
padded with a not-provided line, so the report is exactly as long as what is actually known. Hand it a
bug URL instead and it does the same thing to an existing item, without losing a single fact from the
original.

**It does not investigate, and that is the feature.** No codebase dig, no chat or log search, no
suspected area, no proposed fix, no theory of the cause. The agent has no `Grep` and no `Bash`, so it
cannot go looking even if it wants to. Filing a bug takes seconds, which is what you want when the
symptom is fresh and you are trying to get it recorded before you lose it.

The code dig lives in [`issue-triager`](../issue-triager/), which localizes the defect, proposes a fix
when the code actually supports one, and posts it as an assessment comment. Report first, triage when
someone picks it up.

Auto-installs [`issuekit`](../issuekit/); bring your own MCPs.

## Install

```
/plugin marketplace add github.com/TahaBikanerwala/jt-bikanerwala-marketplace
/plugin install bug-reporter
```

You also need a tracker MCP (`@azure-devops/mcp` or the Atlassian MCP) registered at the user or
project level. See the [marketplace README](../../README.md#configure-your-mcps) for setup;
`issuekit` matches tools by name **suffix**, so the registration name does not matter.

Run it from anywhere. Nothing here reads your working directory except a report file you pass in.

## Usage

```
/bug-reporter:run Checkout crashes when a coupon code is applied twice
/bug-reporter:run https://dev.azure.com/org/proj/_workitems/edit/1234
/bug-reporter:run PROJ-456
/bug-reporter:run ./notes/support-escalation.md
/bug-reporter:run
```

The argument picks the mode:

| Argument | Mode | Result |
|---|---|---|
| A one-line symptom, or pasted text | create | a new Bug work item |
| A tracker URL, or a bare id/key | refine | the existing Bug, restructured in place |
| A file path | create | a new Bug, using the file as the raw input |
| Nothing | asks | you are prompted for a symptom or a reference |

`/bug-reporter:draft` takes the same arguments and prints the whole report without writing anything.

## What it does

1. **Bootstrap.** Detects the tracker via `issuekit` and resolves your identity and default project.
2. **Search for duplicates.** Queries the tracker with the verbatim error string and the symptom, then
   opens the top candidates to confirm before calling anything a duplicate. A title that merely looks
   similar does not count. Bounded at three queries and three candidate reads: it is the one search the
   agent runs, and it survives because filing the same bug twice is the failure a fast intake path
   would otherwise make more likely.
3. **Clarify (pause).** One card asks what only you can answer, grouped so environment is a single
   question rather than four. Every question has a "Not known" option. Anything you skip drops that
   section from the report and becomes a **Missing Information** line, never an invented fact and never
   a not-provided placeholder. One card, once: the agent does not come back for a second round.
4. **Write.** `bug-report-writer` produces the title and the report, cleaned with
   `issuekit:prose-style`. Severity is derived from the impact evidence; when the evidence cannot
   support a tier, you are asked rather than guessed at.
5. **File (pause at the gate).** The whole batch appears in the diff-and-confirm gate, then creates the
   Bug or updates title, description, and severity. Declining writes nothing.
6. **Summarize.** The work item, its severity, what is still missing, and the triage handoff line.

## What it deliberately does not do

| Not here | Where it lives |
|---|---|
| Read your codebase to localize the defect | `/issue-triager:run` (Phase 2b, `fix-proposer`) |
| Propose a fix, name a suspected area, or state a cause | `/issue-triager:run`, as an assessment comment |
| Search chat, docs, or Datadog | `/issue-triager:run` (`issuekit:issue-investigator`) |
| Assign, transition, set a due date, or apply `triaged` | `/issue-triager:run` |

The agent's tool list is `Skill`, `Read`, and `AskUserQuestion`. No `Grep`, no `Bash`: the boundary is
structural, not a promise it might drift away from. `Read` exists for a report file you hand it.

This is a deliberate reversal. Earlier versions of this plugin ran the full evidence ladder plus a
codebase dig before writing a word, which made a one-line bug report cost minutes and a large pile of
tokens for analysis that triage would redo anyway.

## Report format

The created or refined description carries, in this order: Summary, Environment, Preconditions, Steps to
Reproduce, Expected Behavior, Actual Behavior, Frequency and Reproducibility, Impact and Affected Scope,
Evidence, Regression, Workaround, Missing Information, Fix Verification, and Open Questions.

**A section you did not answer is not in the report.** No `Not provided by the reporter.`, no `Unknown`,
no `TBD`, no empty heading, and nothing marking where it would have been. The question goes to the
**Missing Information** list instead, which is the single place gaps live: the reporter reads it to know
what to add, and the fixer reads it to know what is not established. A one-line bug report produces a
short report that looks short, which is the right signal to whoever opens it.

Three sections always appear, and none of them can come up empty. Summary and Actual Behavior restate
the report itself. Fix Verification is derived from the defect rather than supplied by you, so even a
thin report yields the check that the reported symptom no longer happens.

An explicit "no" is an answer, not a gap. Say there is no workaround and the report says `None known.`,
because that sentence is what severity depends on. Stay silent and the section is simply absent. The two
are different and the report keeps them apart.

On Azure DevOps the same rule reaches the fields: no environment details means no System Info block and
no write to that field at all, rather than a field holding a placeholder.

There is no analysis section, by design. Nothing here has read the code, so a cause in this report would
be a guess wearing a report's authority. If you offered a theory when you reported it, the report quotes
it as your words rather than adopting it as a finding.

Severity and priority are written as **fields**, not as body text. On Azure DevOps, Environment routes to
`Microsoft.VSTS.TCM.SystemInfo` and the reproduction sections route to `Microsoft.VSTS.TCM.ReproSteps`,
so the Bug form is populated the way the process template expects; set either policy key to `null` to
fold them into the description instead. Jira gets one description body.

Created bugs are tagged `needs-triage` (configurable) and are left **unassigned and untransitioned**.
Triage is a separate decision: run `/issue-triager:run` next.

## Configuration

Optional `.claude/tracker-policy.json`, shared with the other tracker plugins (see the
[policy schema](../issuekit/skills/tracker-adapter/references/policy-schema.md)):

| Key | Default | Meaning |
|---|---|---|
| `bug_work_item_type` | `{ azure-devops: "Bug", jira: "Bug" }` | The type new bugs are created as, per tracker. |
| `reported_label` | `"needs-triage"` | Tag applied to reported bugs. `null` skips it. |
| `bug_repro_steps_field` | `"Microsoft.VSTS.TCM.ReproSteps"` | AzDO only: field the reproduction sections write to. `null` folds them into the description. |
| `bug_system_info_field` | `"Microsoft.VSTS.TCM.SystemInfo"` | AzDO only: field Environment writes to. `null` folds it into the description. |
| `severity_scheme` | `sev1..sev4` | Tier semantics severity is resolved against. |
| `severity_label_map` | `sev1: ["1 - Critical", ...]` | Abstract tier to the vendor's label. |
| `priority_label_map` | `{ P0: Highest, P1: High, P2: Medium }` | Jira only: abstract priority to vendor priority name. |

Missing keys are lazy-prompted at the moment they are needed and can be persisted.

## Bundled skills

- `bug-report-writer` — writes the title and the full report in the fixed template, splitting into the
  tracker's fields when asked. Refine mode output is a strict superset of the original.

Reused from `issuekit`: `tracker-adapter` (detection, verbs, the diff-and-confirm gate) and
`prose-style`.

`fix-proposer` shipped here through v0.1.1. It now lives in
[`issue-triager`](../issue-triager/skills/fix-proposer/), which is where the codebase dig belongs.

## How it relates to the other plugins

| Plugin | Difference |
|---|---|
| [`issue-triager`](../issue-triager/) | The other half of this workflow. It triages an issue that already exists across every archetype: investigates, digs into the codebase to localize a bug and propose a fix, assigns, transitions, sets the severity SLA and due date, links work, labels it triaged. `bug-reporter` writes the bug in the first place, fast, and stops short of every triage decision. Its `investigate-and-refine` command refines any archetype; `bug-reporter` refines bugs specifically, and adds Environment, Frequency, Regression, and Fix Verification. |
| [`story-drafter`](../story-drafter/) | The same intake idea for requirements instead of defects. |
| [`postmortem-generator`](../postmortem-generator/) | For an incident that is already resolved and needs a blameless writeup. |

## Author

[Taha Bikanerwala](https://github.com/TahaBikanerwala)

## License

MIT: see [`LICENSE`](../../LICENSE).
