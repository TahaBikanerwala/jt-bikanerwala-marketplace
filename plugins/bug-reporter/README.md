# bug-reporter

Write a proper **Bug** in your tracker (Azure DevOps or Jira) from a single line, or turn an
ambiguously written bug into one.

Hand it `checkout crashes when you apply a coupon twice` and it searches for duplicates, reads your
codebase to find where the defect lives, asks you only what you alone can answer, and files a complete
report: environment, preconditions, reproduction steps, expected versus actual, frequency, impact and
scope, evidence, regression, workaround, fix verification, and an explicit list of what is still
missing. Hand it a bug URL instead and it does the same thing to an existing item, without losing a
single fact from the original.

When the code supports it, the report includes a **proposed fix** naming the file, the symbol, what the
code does today, why that produces the reported symptom, and the check that would confirm it. When the
code does not support one, there is no proposal. That is the point: no guessing.

Auto-installs [`issuekit`](../issuekit/); bring your own MCPs.

## Install

```
/plugin marketplace add github.com/TahaBikanerwala/jt-bikanerwala-marketplace
/plugin install bug-reporter
```

You also need a tracker MCP (`@azure-devops/mcp` or the Atlassian MCP) registered at the user or
project level. See the [`issuekit` README](../issuekit/README.md#configure-your-mcps) for setup;
`issuekit` matches tools by name **suffix**, so the registration name does not matter.

Run it from the repository the bug is in. The codebase probe reads the current working directory.

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
   similar does not count.
3. **Gather evidence.** In refine mode, `issuekit:issue-investigator` runs its ladder (chat, tracker and
   docs, Datadog, code). In both modes, `fix-proposer` reads your checkout: it searches the verbatim
   error string, locates the module that owns the behavior, opens the suspect code, and checks recent
   churn against the first-seen date.
4. **Clarify (pause).** One card asks what only you can answer, grouped so environment is a single
   question rather than four. Every question has a "Not known" option. Anything you skip becomes a
   **Missing Information** line, never an invented fact.
5. **Write.** `bug-report-writer` produces the title and the report, cleaned with
   `issuekit:prose-style`. Severity is derived from the impact evidence; when the evidence cannot
   support a tier, you are asked rather than guessed at.
6. **File (pause at the gate).** The whole batch appears in the diff-and-confirm gate, then creates the
   Bug or updates title, description, and severity. Declining writes nothing.
7. **Summarize.** The work item, its severity, whether a fix was proposed **or deliberately omitted and
   why**, what is still missing, and where to look next.

## The proposed fix

The rule that makes it worth reading: a proposal is emitted only when the suspect code was actually
opened, with a nameable path and symbol, **and** that code explains the reported symptom at
`[VERIFIED]` or `[OBSERVED]`.

- `[INFERRED]` alone yields a **Suspected Area** and a **Where to Look**, no proposal.
- A path found by search but never read is not enough.
- A defect pattern that usually causes this is not enough.
- Nothing matched means the section does not appear, and the summary says why.

Proposals are titled **Proposed Fix (unverified)**, carry their evidence tag and a confidence level,
name the blast radius and the confirming check, and never assert root cause. They describe the shape of
the change in prose and never ship a patch, because a bug report is not a pull request and a fixer who
reads a suggested diff stops thinking.

## Report format

The created or refined description carries, in this order: Summary, Environment, Preconditions, Steps to
Reproduce, Expected Behavior, Actual Behavior, Frequency and Reproducibility, Impact and Affected Scope,
Evidence, Regression, Workaround, Suspected Area, Proposed Fix (unverified), Where to Look, Missing
Information, Fix Verification, and Open Questions. Sections with nothing behind them are omitted, except
the core ones, which state plainly that the information was not provided.

Severity and priority are written as **fields**, not as body text. On Azure DevOps, Environment routes to
`Microsoft.VSTS.TCM.SystemInfo` and the reproduction sections route to `Microsoft.VSTS.TCM.ReproSteps`,
so the Bug form is populated the way the process template expects; set either policy key to `null` to
fold them into the description instead. Jira gets one description body.

Created bugs are tagged `needs-triage` (configurable) and are left **unassigned and untransitioned**.
Triage is a separate decision: run `/issue-triage:run` next.

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
- `fix-proposer` — reads the checkout to localize the defect and propose a fix, or to establish that it
  cannot. Owns the confidence floor.

Reused from `issuekit`: `tracker-adapter` (detection, verbs, the diff-and-confirm gate),
`issue-investigator` (the refine-mode evidence ladder), and `prose-style`.

## How it relates to the other plugins

| Plugin | Difference |
|---|---|
| [`issue-triage`](../issue-triage/) | Triages an issue that already exists across every archetype: assigns, transitions, sets the severity SLA and due date, links work, labels it triaged. `bug-reporter` writes the bug in the first place and stops short of every triage decision. Its `investigate-and-refine` command refines any archetype; `bug-reporter` refines bugs specifically, and adds Environment, Frequency, Regression, Fix Verification, and the fix proposal. |
| [`draft-stories`](../draft-stories/) | The same intake idea for requirements instead of defects. |
| [`incident-postmortem`](../incident-postmortem/) | For an incident that is already resolved and needs a blameless writeup. |

## Author

[Taha Bikanerwala](https://github.com/TahaBikanerwala)

## License

MIT: see [`LICENSE`](../../LICENSE).
