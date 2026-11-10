---
name: test-report-writer
description: "Writes qa-tester's artifacts from the run state: the test plan file (phase=plan), the test report with verdict, AC traceability matrix, defects, ticket-vs-PR discrepancies, not-testable cases, test data ledger and open questions (phase=report), the tracker results comment (phase=comment), and one self-contained defect description per bug for bug-reporter (phase=bug). Invoked by the qa-tester agent in Phases 3, 6 and 8."
metadata:
  author: Taha Bikanerwala
---

# Test Report Writer

Templates are in `references/report-template.md`. Load it first. Files go under `<output_dir>/<run_id>/`; create the folder if needed. Never write a credential, token, cookie or personal data into any artifact.

## phase=plan

Write `test-plan.md` from the plan template: sources, ACs with origins, discrepancies, the shared data set table, the cases (grouped by priority, each with steps and expected), charters, cleanup plan, the AC coverage table, and design-time questions. If the file exists from an earlier run, write `test-plan-<yyyymmdd-hhmm>.md` instead of overwriting it.

## phase=report

Write `test-report.md` from the report template (same no-overwrite rule).

**Verdict.**
- `No-go`: any open S1 defect, or any S2 defect on a P1 case, or any P1 case `Blocked` with no workaround.
- `Go with risks`: open S2 or S3 defects not covered by No-go, or P1/P2 cases `Not testable`, or `deployment: unverified`, or open `contradicts-ac` discrepancies.
- `Go`: every P1 and P2 case passed and none of the above.

One sentence of reasoning goes with the verdict. Then run `issuekit:prose-style` over the summary and the defect and discrepancy prose (not the tables). Return the inline summary for the agent to print: verdict line, counts, one line per defect, discrepancy count, data left behind, report path.

When the agent re-runs cases after the end-of-run answers, rewrite the same report file and add a short "Re-tested after clarification" section listing what changed.

## phase=comment

Render the tracker comment from the comment template: verdict, counts, defects (with bug links once filed), discrepancies needing a decision, not-testable items, environment and build, and the report path. Keep it under about 40 lines; it points to the report for detail. Markdown only; issuekit converts it for the tracker.

## phase=bug

Render one defect as a single self-contained text block for `bug-reporter:run`, using the bug template. It must answer everything bug-reporter asks for so its clarification card is skipped: summary, environment (URL, build, browser, viewport, role), preconditions, numbered steps, expected (quoting the AC and naming the ticket), actual, frequency (`reproduced n of n`), impact, evidence paths, regression status if known, workaround if one was found, and a fix-verification line (the case id to re-run). Omit anything you do not know; do not write placeholders.
