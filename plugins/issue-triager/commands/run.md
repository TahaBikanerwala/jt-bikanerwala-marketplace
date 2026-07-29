---
description: Full end-to-end issue triage. Investigates, digs into the codebase to localize a bug and propose a fix, refines title/description, sets severity/sprint, links related work, applies the triaged label, and posts a summary. All writes pass through a single diff-and-confirm gate.
argument-hint: <issue URL or ID>
allowed-tools: Skill
---

# /issue-triager:run

Entry point for the `issue-triager` agent. Pass the issue's tracker URL or ID as the argument.

## Examples

```
/issue-triager:run https://dev.azure.com/contoso/payments/_workitems/edit/12345
/issue-triager:run https://contoso.atlassian.net/browse/RLI-1234
/issue-triager:run RLI-1234
/issue-triager:run 12345
```

## Behavior

This command is a thin shell. It dispatches to the `issue-triager` agent with the URL/ID as the input. The agent runs the full workflow:

1. Identify the issue and detect archetype via `issuekit:tracker-adapter`.
2. Investigate (Bug/Incident → `issuekit:issue-investigator`; Story/Feature/Task/Spike → `requirements-investigator`).
3. Search Datadog (Bug/Incident only, when `log != none`).
4. **Localize the defect in the codebase** (Bug/Incident only) via `fix-proposer`: search the verbatim error string, find the module that owns the behavior, open the suspect code, check recent churn against the first-seen date.
5. Build the diff-and-confirm batch covering everything the agent intends to write.
6. **Pause at the diff-and-confirm gate.** User confirms or declines.
7. On confirm: post the assessment comment, refine title/description, set severity + due date or sprint + story points, link related work, apply the triaged label, run the final transition, notify the escalation channel if configured.

The diff IS the dry-run. Declining at the gate exits cleanly with no writes.

## The code dig and the proposed fix

Step 4 is the expensive part of this command, and it is where the defect stops being a description and starts being a location. `/bug-reporter:run` deliberately skips it so that filing a bug stays fast, so a freshly reported bug arrives here with no code analysis at all. Run this from the repository the issue is about.

A **Proposed fix (unverified)** reaches the assessment comment only when the agent opened the suspect code and that code explains the reported symptom at `[VERIFIED]` or `[OBSERVED]`. Below that bar you get a suspected area and a where-to-look instead; when nothing in the checkout matches the symptom, neither block appears and the summary says why. Proposals name the file, the symbol, what the code does now, why that produces the symptom, the blast radius, and the check that would confirm it. They never assert root cause and never ship a patch.

The proposal goes in a **comment**, not in the description. The description stays a record of the issue; this triage pass's analysis is attributable and timestamped where it belongs.

## Configuration

Reads `.claude/tracker-policy.json` if present. Lazy-prompts for any missing policy key at the moment it's needed (typically `states.investigating`, `severity_scheme`, `escalation.channel`) and offers to persist the answer.

## See also

- `/issue-triager:investigate-and-refine` — lightweight subset that only investigates and refines title/description. No codebase dig, no field updates, no transitions, no escalation.
- `/bug-reporter:run` — files the bug in the first place, fast, with no investigation. The usual pairing: report it there, triage it here.
