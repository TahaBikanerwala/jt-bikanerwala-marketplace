---
name: test-report-writer
description: "Writes qa-tester's test plan (phase=plan), report (phase=report), tracker comment (phase=comment) and per-defect bug text (phase=bug) from the run state. Invoked by the qa-tester agent in Phases 3, 6 and 8."
metadata:
  author: Taha Bikanerwala
---

# Test Report Writer

Templates are in `references/report-template.md`. Load it first. Files go under `<output_dir>/<run_id>/`; create the folder if needed. Never write a credential, token, cookie or personal data into any artifact.

## phase=plan

Write `test-plan.md` from the plan template: the test scope, sources, ACs with origins, discrepancies, the feature model (screens and routes, control rules, states), the shared data set table, the cases (grouped by priority, each with category, oracle, steps and expected), charters, cleanup plan, the AC coverage table, the screen by test type grid, what was considered and skipped, and design-time questions. If the file exists from an earlier run, write `test-plan-<yyyymmdd-hhmm>.md` instead of overwriting it, and return the path you wrote.

The Reconnaissance section follows the `recon` key in the calling context, and `recon=off` always takes precedence. With `recon=off`, it says recon did not or will not run and gives the reason the agent passes: plan mode, no browser, `recon_minutes` is 0, or "stopped before recon (<where>)". So the plan was not checked against the live screens. With `recon=planned`, it says recon runs after preflight and this section is updated then.

`rewrite=true` rewrites the file the agent passes as `plan_path` in place. After reconnaissance (no `recon=off`), mark each case added after recon with `(added after recon)` in its heading, and fill the Reconnaissance section with what recon actually did: screens visited, controls found, cases added (or "none"), screens not reached, and anything a click created. With `rewrite=true, recon=off` (the run stopped before recon), change only the Reconnaissance section, to the not-run text with the reason.

## phase=report

Write `test-report.md` from the report template (same no-overwrite rule), and return the path you wrote. Every later rewrite (after a re-run, recording or cleanup) rewrites the file the agent passes as `report_path`, never a file found by name, so an earlier run's report is never touched.

**Verdict.**
- `Not run`: no case was executed (`provider == none`). Never `Go`. The Results by case table doubles as the manual checklist.
- `No-go`: any open S1 defect, or any S2 defect on a P1 case, or any P1 case `Blocked` with no workaround.
- `Go with risks`: open S2 or S3 defects not covered by No-go; or any P1/P2 case `Not testable`, `Blocked`, `Skipped` or `Pass (flaky ...)`; or `deployment: unverified`; or open `contradicts-ac` discrepancies; or any defect whose `cross_check` says it was not cross-checked (name that in the reasoning sentence, since the defect may be a Claude in Chrome artifact); or a `provider_artifacts` entry on a P1 case.
- `Go`: every P1 and P2 case passed, apart from the planned limits below, and none of the above.

**Planned limits do not count against the verdict.** A case the plan already set to `Skipped (mutation guard)` or `Not testable` at design time, whose oracle is `convention`, is a limit of this environment, login method or provider, not a risk the run found. Leave it out of both the `Go with risks` and the `Go` rules, and list it under Not covered with its reason. Without this, choosing Security on a read-only environment or with a browser-session login could never reach `Go`. Planned skips of `ac` or `implied` cases still count, because an untested acceptance criterion is a real risk.

A case that failed only on Claude in Chrome and passed on chrome-devtools counts as `Pass` in the counts, and is also listed under Claude in Chrome artifacts.

The verdict rules use severity whatever the oracle. A defect whose oracle is `convention` says so in its Oracle line, so a reader can see the ticket never stated that behavior. The Coverage by test type table lists every type in `test_types`. Not covered names every type that was not selected for this run.

One sentence of reasoning goes with the verdict. Then run `issuekit:prose-style` over the summary and the defect and discrepancy prose (not the tables). Return the inline summary for the agent to print: verdict line, counts, one line per defect, discrepancy count, the number of Claude in Chrome artifacts that passed on chrome-devtools, test data still in place, report path.

When the agent re-runs cases after the end-of-run answers, rewrite the same report file and add a short "Re-tested after clarification" section listing what changed.

When the agent calls again after recording or cleanup, rewrite the same file in place: update each defect's Video line and the Test data section (cleanup line and every ledger status).

## phase=comment

Render the tracker comment from the comment template: verdict, the test types covered, counts, defects (with their bug links; the agent files bugs before it asks for the comment), discrepancies needing a decision, not-testable items, environment and build, and the report path. Keep it under about 40 lines; it points to the report for detail. Markdown only; issuekit converts it for the tracker.

## phase=bug

Render one defect as a single self-contained text block for `bug-reporter:run`, using the bug template. It must answer everything bug-reporter asks for so its clarification card is skipped: summary, environment (URL, build, browser, viewport, role), preconditions, numbered steps, expected (quoting the AC and naming the ticket; for an `implied` or `convention` oracle, say the ticket does not state it and name the AC it follows from or the convention), actual, frequency (`reproduced n of n`), impact, evidence paths, regression status if known, workaround if one was found, and a fix-verification line (the case id to re-run). Omit anything you do not know; do not write placeholders.

When the defect carries a `cross_check` result, add it to the bug text as `Verified on: Claude in Chrome and chrome-devtools`, or as the caveat when the check could not run.

Add the **Attachments** line listing, by file name, every file the agent will attach once the bug is created: the defect's `.mp4` recording when one exists, then its screenshots, then its console and network files. This line is how the bug-reporter gate shows the reporter what will be attached. Omit the line when `attach_evidence` is false or there are no files.
