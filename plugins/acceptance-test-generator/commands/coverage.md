---
description: Read-only. Analyze a story's acceptance criteria and report the test-coverage plan — every AC decomposed into behaviors with the test-design technique each needs, the equivalence classes and boundaries identified, coverage gaps, risk view, and open questions. Writes nothing; creates nothing.
argument-hint: <story URL or id | path to a spec file | pasted story + AC> (optional)
allowed-tools: Skill, Read, Bash, Grep, AskUserQuestion
---

# /acceptance-test-generator:coverage

Read-only sibling of `/acceptance-test-generator:run`. It shows what a full run *would* cover — the test-design plan for a story's acceptance criteria — without writing a single file or touching the tracker. Use it to size the testing gap, review AC quality, or decide whether the ACs are ready to generate against.

## Examples

```
/acceptance-test-generator:coverage https://dev.azure.com/org/proj/_workitems/edit/1234
/acceptance-test-generator:coverage PROJ-456
/acceptance-test-generator:coverage ./docs/specs/checkout-discount.md
/acceptance-test-generator:coverage
```

Same argument forms as `:run` — a tracker reference, a spec file, pasted text, or empty (the agent asks).

## Behavior

Dispatches to the `acceptance-test-generator` agent in `mode=coverage`:

1. Read the story + acceptance criteria (`issuekit`, tolerant of no tracker).
2. Analyze the ACs into a coverage model (`acceptance-analyzer`, spec-only).
3. Optionally clarify blocking ambiguities and probe the codebase read-only for context and drift.
4. Print a report — no files, no tracker writes, no gate:
   - **Per AC:** the behaviors it decomposes into, the technique each needs, the equivalence classes / boundaries / decision-table rules, and positive/negative/edge counts.
   - **Coverage gaps:** ACs untestable as written, missing negative paths, unaddressed cross-cutting concerns.
   - **Open Questions:** every ambiguity, plus any spec-vs-code drift found.
   - **Risk view:** where the critical path and the risk concentrate.
   - **What a full run would produce:** scenario count and feature-file layout.

Read-only and safe to run anytime. When you're ready to generate, run `/acceptance-test-generator:run`.

## See also

- `/acceptance-test-generator:run` — the full generator: writes `.feature` files and optionally creates tracker Test Cases.
