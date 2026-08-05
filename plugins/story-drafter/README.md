# story-drafter

Turn ambiguous, unclear requirements into INVEST user stories and create them in your tracker (Azure DevOps or Jira) tagged **Draft**, ready for refinement.

Hand it a rough brief, a pile of meeting notes, or a `.vtt` transcript. It brainstorms the requirements topic-by-topic, clarifies the gaps that block story creation, asks which candidate stories you actually want, reads your codebase to answer the questions the code already answers, then writes full stories and creates them — all behind a single diff-and-confirm gate.

Auto-installs [`issuekit`](../issuekit/); bring your own MCPs.

## Install

```
/plugin marketplace add github.com/TahaBikanerwala/jt-bikanerwala-marketplace
/plugin install story-drafter
```

You also need a tracker MCP (`@azure-devops/mcp` or the Atlassian MCP) registered at the user or project level. See the [marketplace README](../../README.md#configure-your-mcps) for setup; `issuekit` matches tools by name **suffix**, so the registration name does not matter.

## Usage

```
/story-drafter:run We need faculty to share an agent's skills with a whole cohort, and IT wants to control who can publish.
/story-drafter:run ./notes/roadmap-sync-2026-07-16.md
/story-drafter:run ./transcripts/meeting.vtt
/story-drafter:run
```

The argument is the raw requirements: pasted text, a path to a notes/transcript file (`.vtt` cue and timestamp lines are ignored), or nothing (you will be asked to paste them).

## What it does

1. **Bootstrap.** Detects the tracker via `issuekit` and resolves your identity + default project.
2. **Brainstorm.** A PM analysis breaks the input into a topic-by-topic requirement map (requirement summary, product connection, priority/timeline signals, open questions, risks, follow-ups).
3. **Clarify (pause).** Asks the questions that *block* story creation in one card, led by a compact digest of the brainstorm. Non-blocking questions become each story's Open Questions.
4. **Select (pause).** Shows a candidate story list (title + one-line `As a… I want… so that…`); you multi-select which to create and add free-form notes. The notes are authoritative.
5. **Probe the code.** For the selected stories, reads your local checkout to self-answer open questions the code already answers (how an area is built, what patterns to follow, whether something already exists), tagged by evidence. Resolved questions fold into the story; the rest stay open.
6. **Write.** Each selected story is written in the fixed template and cleaned with `issuekit:prose-style`.
7. **Create (pause at the gate).** Every story is shown in the diff-and-confirm gate, then created as a **standalone** work item tagged `Draft`. Declining writes nothing.

## Story format

Each created story carries:

- **Description field:** Problem Statement, Background (citing the source input), Description (`As a <role>, I want <capability>, so that <benefit>` + expansion), In Scope / Out of Scope, Definition of Done, Open Questions. Each heading carries a fixed emoji (🧩/🏁/📝/🟢/🔴/🏁/❓) matching the house style already used on Rolai's Azure DevOps stories.
- **Acceptance Criteria field:** Given/When/Then criteria (happy path, error states, edge cases). On Azure DevOps this is the standard `Microsoft.VSTS.Common.AcceptanceCriteria` field; on Jira the criteria fold into the description unless `acceptance_criteria_field` names a custom field.
- **Tag:** `Draft` (configurable via `draft_label`).
- **Priority:** from the story's P0/P1/P2 (AzDO `Microsoft.VSTS.Common.Priority` 1/2/3; Jira via `priority_label_map`).

Stories are standalone — no parent, no related link.

## Configuration

Optional `.claude/tracker-policy.json` (shared with the other tracker plugins; see the [policy schema](../issuekit/skills/tracker-adapter/references/policy-schema.md)):

| Key | Default | Meaning |
|---|---|---|
| `story_work_item_type` | `{ azure-devops: "User Story", jira: "Story" }` | The type new stories are created as, per tracker. |
| `draft_label` | `"Draft"` | The tag every created story carries. |
| `priority_label_map` | `{ P0: Highest, P1: High, P2: Medium }` | Jira only: abstract priority → vendor priority name. |
| `acceptance_criteria_field` | `null` | Jira only: a custom field for acceptance criteria. AzDO ignores it. |

Missing keys are lazy-prompted at the moment they are needed and can be persisted.

## Bundled skills

- `requirements-brainstormer` — turns raw input into a topic-by-topic requirement analysis.
- `story-writer` — writes one INVEST story in the fixed template.
- `codebase-prober` — reads the local checkout to self-answer open questions, evidence-tagged.

## Author

[Taha Bikanerwala](https://github.com/TahaBikanerwala)

## License

MIT: see [`LICENSE`](../../LICENSE).
