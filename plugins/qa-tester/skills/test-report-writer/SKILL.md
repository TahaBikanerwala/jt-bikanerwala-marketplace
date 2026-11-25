---
name: test-report-writer
description: "Writes qa-tester's test plan (phase=plan), report (phase=report), tracker comment (phase=comment) and per-defect bug text (phase=bug) from the run state. Invoked by the qa-tester agent in Phases 3, 6 and 8."
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
- `Not run`: no case was executed (`provider == none`). Never `Go`. The Results by case table doubles as the manual checklist.
- `No-go`: any open S1 defect, or any S2 defect on a P1 case, or any P1 case `Blocked` with no workaround.
- `Go with risks`: open S2 or S3 defects not covered by No-go; or any P1/P2 case `Not testable`, `Blocked`, `Skipped` or `Pass (flaky ...)`; or `deployment: unverified`; or open `contradicts-ac` discrepancies; or any defect whose `cross_check` says it was not cross-checked (name that in the reasoning sentence, since the defect may be a Claude in Chrome artifact); or a `provider_artifacts` entry on a P1 case.
- `Go`: every P1 and P2 case passed and none of the above.

A case that failed only on Claude in Chrome and passed on chrome-devtools counts as `Pass` in the counts, and is also listed under Claude in Chrome artifacts.

One sentence of reasoning goes with the verdict. Then run `issuekit:prose-style` over the summary and the defect and discrepancy prose (not the tables). Return the inline summary for the agent to print: verdict line, counts, one line per defect, discrepancy count, the number of Claude in Chrome artifacts that passed on chrome-devtools, test data still in place, report path.

When the agent re-runs cases after the end-of-run answers, rewrite the same report file and add a short "Re-tested after clarification" section listing what changed.

When the agent calls again after recording or cleanup, rewrite the same file in place: update each defect's Video line and the Test data section (cleanup line and every ledger status).

## phase=comment

Render the tracker comment from the comment template: verdict, counts, defects (with their bug links; the agent files bugs before it asks for the comment), discrepancies needing a decision, not-testable items, environment and build, and the report path. Keep it under about 40 lines; it points to the report for detail. Markdown only; issuekit converts it for the tracker.

## phase=bug

Render one defect as a single self-contained text block for `bug-reporter:run`, using the bug template. It must answer everything bug-reporter asks for so its clarification card is skipped: summary, environment (URL, build, browser, viewport, role), preconditions, numbered steps, expected (quoting the AC and naming the ticket), actual, frequency (`reproduced n of n`), impact, evidence paths, regression status if known, workaround if one was found, and a fix-verification line (the case id to re-run). Omit anything you do not know; do not write placeholders.

When the defect carries a `cross_check` result, add it to the bug text as `Verified on: Claude in Chrome and chrome-devtools`, or as the caveat when the check could not run.

Add the **Attachments** line listing, by file name, every file the agent will attach once the bug is created: the defect's `.mp4` recording when one exists, then its screenshots, then its console and network files. This line is how the bug-reporter gate shows the reporter what will be attached. Omit the line when `attach_evidence` is false or there are no files.
