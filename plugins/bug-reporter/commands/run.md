---
description: Write a complete Bug work item in the tracker from a single line, or refine an ambiguously written existing Bug into one. Searches for duplicates, asks only what the reporter alone can answer, and creates or updates behind a single diff-and-confirm gate. Fast by design: no codebase dig, no investigation.
argument-hint: <one-line symptom | bug URL or id | path to a report file> (optional)
allowed-tools: Skill
---

# /bug-reporter:run

Entry point for the `bug-reporter` agent. Pass the symptom, an existing bug reference, or a file
containing a rough report. Run it bare and the agent asks.

## Examples

```
/bug-reporter:run Checkout crashes when a coupon code is applied twice
/bug-reporter:run https://dev.azure.com/org/proj/_workitems/edit/1234
/bug-reporter:run PROJ-456
/bug-reporter:run ./notes/support-escalation.md
/bug-reporter:run
```

The argument decides the mode:

- **A one-line symptom or pasted text** → **create mode**. The agent builds a full report and
  creates a new Bug.
- **A tracker URL or bare id/key** → **refine mode**. The agent reads the existing Bug, restructures
  it into the same complete shape, and updates it in place. Every fact in the original survives.
- **A file path** → create mode, using the file as the raw input.
- **Empty** → the agent asks for the symptom or a bug reference.

## Behavior

This command is a thin shell. It dispatches to the `bug-reporter` agent in `mode=run`, which:

1. Bootstrap the tracker via `issuekit:tracker-adapter` and ingest the input.
2. Search the tracker for duplicates and related bugs. Bounded: three queries, three candidate reads.
3. **Pause** on one clarification card for what only the reporter can answer (environment, steps,
   expected vs actual, frequency, scope) plus the duplicate question when a candidate turned up.
   Skipping is fine: an unanswered section is left out of the report entirely and listed as
   **Missing Information** instead, never invented and never padded with a not-provided line.
4. Write the report (`bug-report-writer`), cleaned with `issuekit:prose-style`, and resolve severity
   from the impact evidence.
5. **Pause at the diff-and-confirm gate**, then create the Bug (create mode) or update title,
   description and severity (refine mode).
6. Summarize: the work item, its severity, what information is still missing, and the triage handoff.

The diff IS the dry run. Declining at the gate exits cleanly with nothing written.

## It does not investigate

Filing should take seconds. The agent has no `Grep` and no `Bash`, so it cannot read your codebase,
and it does not search chat, docs, or logs either. No suspected area, no proposed fix, no root cause,
no hypothesis of any kind lands in the report. What the reporter observed goes in; what nobody
supplied goes in the Missing Information list.

The code dig moved to `/issue-triager:run`, which localizes the defect with `fix-proposer`, proposes a
fix when the code actually supports one, and posts it as an assessment comment. Report first, triage
when someone picks it up.

## Configuration

Reads `.claude/tracker-policy.json` if present (issuekit's shared policy file). Keys this plugin
uses: `bug_work_item_type`, `reported_label` (default `needs-triage`, `null` to skip),
`bug_repro_steps_field` and `bug_system_info_field` (Azure DevOps field routing),
`severity_label_map`, `priority_label_map`. Missing keys are lazy-prompted at the
moment they are needed, with an offer to persist the answer.

## Boundaries

The agent does not assign, transition, or set a due date. A newly reported bug is left for triage.

## See also

- `/bug-reporter:draft` — same report, printed to the terminal, nothing written anywhere.
- `/issue-triager:run` — triage the reported bug: investigate, localize it in the code, propose a fix,
  set severity SLA, links, labels.
- `/story-drafter:run` — the same idea for requirements instead of defects.
