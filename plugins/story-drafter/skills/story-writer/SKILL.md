---
name: story-writer
description: "Writes one INVEST user story from a distinct user need, in a fixed template: Problem Statement, Background, Description (As a/I want/so that), Given/When/Then acceptance criteria, In Scope / Out of Scope, Definition of Done, and an Open Questions table. Emits the description-field content and the acceptance-criteria content as separate labelled blocks so the caller can map them to the tracker's Description and Acceptance Criteria fields. Use after the team has selected which stories to create."
metadata:
  author: Taha Bikanerwala
tools: Read
---

# Story Writer

Convert one distinct user need into a clear, well-structured user story with acceptance criteria. One story per need — never bundle multiple needs. Each story must be independently shippable (INVEST).

This skill writes. It does not ask questions, brainstorm, or touch the tracker — the caller owns clarification and the create gate.

## Calling convention

- **Non-interactive.** Never ask the user a question. Everything needed is in the payload.
- **One story per invocation.** The caller invokes the skill once per selected candidate.
- **Output is the last thing.** End when the story renders.

The caller passes, after `Calling context: phase=<n>, tracker=<tracker>.`:

- the **candidate** (title + one-liner);
- the relevant slice of the **brainstorm** analysis;
- **blocking answers** the team gave;
- **extra notes** the team typed — **authoritative**: where they conflict with the brainstorm, the notes win;
- **probe findings** from the codebase (evidence-tagged answers to open questions).

## Steps

1. **Parse the need.** Identify the core user need, the specific user role (builder vs end-user matters: e.g. a Team Admin configuring vs an End User doing the task), and the product area affected.
2. **Fold in the inputs.** Apply blocking answers and extra notes. For each probe finding: a `[VERIFIED]` or `[OBSERVED]` answer becomes a stated fact in Background or an acceptance criterion and is **removed** from Open Questions; an `[INFERRED]` or `[UNKNOWN]` answer stays an Open Question (add a "where to look" note when the probe supplied one).
3. **Write the story** using `references/story-template.md`. Read that file when you reach this step and follow its section list, order, and fixed per-heading emoji exactly.
4. **Set priority** (P0/P1/P2) from the urgency signals in the brainstorm and notes. When there is no signal, default to P2 and record a `(deferrable)` Open Question asking the team to confirm priority.

## Output shape

Emit the story as two clearly labelled fenced blocks so the caller can map each to the right tracker field. Use these exact labels:

```
=== STORY: <short title> | PRIORITY: <P0|P1|P2> ===

--- DESCRIPTION (body) ---
<markdown: Problem Statement, Background, Description, In Scope, Out of Scope, Definition of Done, Open Questions>

--- ACCEPTANCE CRITERIA ---
<markdown: the Given/When/Then criteria only>
```

The **DESCRIPTION** block holds every section except acceptance criteria; the **ACCEPTANCE CRITERIA** block holds only the Given/When/Then list. The caller passes the description block as `body` and the acceptance-criteria block as `acceptanceCriteria` to `createIssue`, uniformly for every tracker; `createIssue` (via issuekit) automatically folds `acceptanceCriteria` into the body on Jira when no custom AC field is configured, so the caller does nothing tracker-specific here. Bodies are markdown; the tracker adapter converts them to HTML/ADF at write time. Do not add a parent or link reference — the story is standalone.

## Writing rules

- No `Story ID` / `Assigned To` / tracker-URL header lines — the tracker assigns the id, the caller sets the tag and project. Start the body at Problem Statement.
- Acceptance criteria must be testable and cover the happy path, error states, and edge cases. Prefer several small criteria over one broad one.
- Ground the story in the product and the source input; cite the source in Background (the caller passes a `source_label`).
- No em dashes or spaced hyphens as separators. No LLM-slop vocabulary (delve, leverage, robust, seamlessly, comprehensive, elevate, foster, ecosystem, holistic, synergy, empower, facilitate).
- Lead with the point in each section. No filler.
- Never present an unverified assumption as a confirmed acceptance criterion.
