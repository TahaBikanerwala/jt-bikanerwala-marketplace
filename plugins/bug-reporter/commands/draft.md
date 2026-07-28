---
description: Read-only. Print the complete bug report the agent would file, including the codebase-grounded fix proposal and the list of missing information, without creating or updating anything in the tracker.
argument-hint: <one-line symptom | bug URL or id | path to a report file> (optional)
allowed-tools: Skill
---

# /bug-reporter:draft

Read-only sibling of `/bug-reporter:run`. It produces the same bug report and prints it. No work item
is created, no field is updated, no label is applied. Use it to review the report before it lands in
the tracker, to check whether the codebase actually supports a fix proposal, or to see what
information is still missing from a vague report.

## Examples

```
/bug-reporter:draft Checkout crashes when a coupon code is applied twice
/bug-reporter:draft PROJ-456
/bug-reporter:draft ./notes/support-escalation.md
/bug-reporter:draft
```

Same argument forms as `:run`. A tracker reference still reads the existing Bug and shows the refined
version; it just never writes it back.

## Behavior

Dispatches to the `bug-reporter` agent in `mode=draft`:

1. Bootstrap the tracker (tolerates no tracker in create mode: the report still renders) and ingest
   the input.
2. Search for duplicates and related bugs, when a tracker is available.
3. Gather evidence: `issuekit:issue-investigator` in refine mode, then `fix-proposer` over the local
   checkout.
4. **Pause** on the clarification card, same as `:run`. Skipping still routes gaps to Missing
   Information.
5. Print, with no gate and no writes:
   - the proposed **title** and the full **report body**, section by section;
   - the **severity** the agent would set and the evidence behind it;
   - the **Proposed Fix** with its confidence and evidence tags, or a one-line note naming why no
     proposal was made;
   - **Missing Information** and **Open Questions** still outstanding;
   - any **duplicate** candidates it found;
   - on Azure DevOps, which sections would route to Repro Steps and System Info.

Safe to run anytime. When the report looks right, run `/bug-reporter:run` to file it.

## See also

- `/bug-reporter:run` — the same report, created or updated in the tracker behind the diff gate.
- `/acceptance-test-generator:coverage` — the read-only sibling pattern applied to test design.
