---
name: browser-test-executor
description: "Runs a qa-tester test plan in a real browser. Detects the provider (chrome-devtools MCP preferred for console, network, emulation and Lighthouse; Claude in Chrome when the user's logged-in session is wanted or devtools is absent), preflights the environment, login and deployed build, then executes every case in order without pausing: drives the steps, asserts expected results from the page, captures console errors, failed requests and screenshots, re-runs failures to separate flakes, keeps a ledger of every record created, and runs exploratory charters. Assigns Pass, Fail, Blocked, Not testable or Skipped with evidence and severity. After the run, records an mp4 video of each chosen defect's reproduction (phase=record) and deletes the test data once the agent allows it (phase=cleanup). Invoked by the qa-tester agent in Phases 0, 4, 5 and 7."
metadata:
  author: Taha Bikanerwala
---

# Browser Test Executor

Load `references/browser-providers.md` first; it maps every abstract action below to each provider's tools.

## phase=detect

1. One `ToolSearch` per provider, loading the full set listed in `browser-providers.md` in a single call each:
   - chrome-devtools: query `chrome-devtools navigate_page take_snapshot` (tool names end in `__navigate_page`, `__take_snapshot`, ...; the prefix varies by install, e.g. `mcp__plugin_anthara_chrome-devtools__` or `mcp__chrome-devtools__`).
   - Claude in Chrome: `select:` the `mcp__claude-in-chrome__*` tools listed in the reference.
2. Choose:
   - `browser_provider` set explicitly and available → that one.
   - `auth.method == browser-session` and Claude in Chrome available → Claude in Chrome (it drives the user's real Chrome profile, so existing logins work).
   - chrome-devtools available → chrome-devtools.
   - Claude in Chrome available → Claude in Chrome.
   - Neither → `none`.
3. Return `provider` and the list of capabilities missing on it (Claude in Chrome has no Lighthouse and no network throttling, for example), so the designer and the report can mark those cases `Not testable`.

## phase=preflight

Run in order. Record each result for the report.

1. **Open a dedicated tab.** Never reuse a tab the user has open. chrome-devtools: `new_page`; Claude in Chrome: `tabs_context_mcp` then `tabs_create_mcp`.
2. **Reachability.** Navigate to the environment URL. A timeout, DNS error, 5xx, or a maintenance page is a preflight failure; the agent asks its single Retry / Switch / Stop question.
3. **Login per role**, per `auth.method`:
   - `browser-session`: navigate and confirm you are signed in (a user menu, not a login form).
   - `env-accounts`: read the username and password from the named env vars through the shell **without echoing them** (capture into the fill call only; never print, log, screenshot or write them). Fill the login form and submit. Never take a screenshot while the password field is filled.
   - `manual`: the agent asks the user to log in, then you confirm signed-in state.
   - `none`: skip.
   Multiple roles: log in as the first role now; switch roles during execution in the plan's role groups (log out, log in as the next). If MFA or captcha appears, mark that role's cases `Blocked (MFA/captcha)` and continue with other roles.
4. **Deployed build.** If `version_check` is set, read it (navigate to the URL, or read the selector's text) and compare with the PR's merge commit or source branch head. Match → `deployment: verified`. No match, or no `version_check`, or PR not merged → `deployment: unverified` with the reason. Never stop on this.
5. **Existing data.** For each `data_set` record marked `existing`, confirm it is visible. Missing → the cases that use it become `Blocked (seed data missing: <what>)` unless the plan allows creating it.

## phase=execute

Run the cases in `order`. **Never pause, never ask.** For each case:

1. **Gate checks.**
   - `planned_status` already set (e.g. `Not testable`, `Skipped (mutation guard)`) → record it and move on.
   - `mutates != none` and the environment's `allow_mutations` is false → `Skipped (mutation guard)`.
   - A precondition depends on an earlier case that did not pass, or a record that does not exist → `Blocked (precondition: <which>)`.
2. **Set up.** Switch role or viewport if needed. Clear console and network buffers (or note the current position) so findings are attributable to this case.
3. **Drive the steps** using the provider mapping. Prefer accessibility-tree or snapshot targeting by visible label, role and `data-testid` over coordinates. After each navigation or submit, wait for the page to settle (a visible element or text from the expected state; never a fixed sleep longer than 2 seconds).
4. **Create data** only as the plan says, with the planned prefixed names. Append every created record to `data_ledger` immediately with its identifier (name, id from the URL or page), so cleanup works even if the run dies.
5. **Assert** each `expected` item by reading the page (snapshot text, element state, URL, field value after reload). For data-table cases, run and report each row.
6. **Health.** Read console messages and network requests for this case. Uncaught errors or unexpected 4xx/5xx fail the case even if the UI looked right; expected errors the case provokes on purpose (a 422 on invalid input) do not.
7. **Evidence.** Screenshot on every failure and at the final state of each P1 case, saved to `<output_dir>/<run_id>/evidence/<case-id>[-<row>].png`. On failure also save the console errors and failed request summaries (method, URL, status, short response body with tokens and personal data removed) to `<case-id>-console.txt` / `<case-id>-network.txt`. Do not record video during execution. Videos are made afterward, in `phase=record`, only for the defects the user chooses.
8. **Status.**
   - `Pass`: every expected item observed, health clean.
   - `Fail`: an expected item contradicted, or a health failure.
   - `Blocked`: could not reach the point of assertion for an environmental or dependency reason.
   - `Not testable`: the step needs something the browser run cannot do (email or SMS delivery, a third-party payment, a scheduled job, a captcha, a file the run lacks, a capability the provider lacks), or the AC is too vague to judge the outcome. Always record the reason and the question that would make it testable.
   - `Skipped`: mutation guard, or excluded by the plan.
9. **On Fail:** reload and re-run the case up to `rerun_failures` times from its preconditions, reusing its data where possible. Fails every time → `Fail (reproducible)` and a defect. Passes on a retry → `Pass (flaky: failed n of m)` and a low-severity flakiness note, not a defect. Then decide whether later cases depend on this one; if they do, they will be `Blocked` by the gate check.
10. **Defect record** for each reproducible failure: title (symptom, not cause), environment and build, role, viewport, browser, preconditions, numbered repro steps, expected (quoting the AC), actual, frequency, evidence paths, console and network excerpts, severity, priority, the AC it violates, and the deployment caveat if unverified. Severity: `S1` crash, data loss, security or privacy exposure, or a P1 flow fully blocked with no workaround; `S2` a P1 or P2 AC fails or a workaround is painful; `S3` a P3 case fails or a workaround is easy; `S4` cosmetic. Priority follows severity unless the failing behavior is outside every AC (`extra-in-pr` region), where it drops one level.

Keep going until every case has a status.

**Dialogs.** Before an action that may raise a native `alert`/`confirm`/`beforeunload`, use chrome-devtools `handle_dialog` after the action; on Claude in Chrome, run `javascript_tool` first to stub `window.confirm = () => true` (or `false` for a cancel test) and `window.alert = () => {}`, and note the stub in the case result.

**Session loss.** If a provider call fails because the tab or browser is gone, recreate the tab and log in once. If that fails, every remaining case is `Blocked (browser session lost)`; return results so far.

### Exploratory pass

After the scripted cases, run each charter within the overall `exploratory_minutes` budget, using the shared records. Log each finding as `EX-n` with the same evidence and defect rules. A finding that needs a decision rather than a fix becomes a question.

**No cleanup here.** Leave every record in place and close the tab you opened. The agent decides in its end-of-run card whether to record defects and whether to delete data, then calls `phase=record` and `phase=cleanup`.

**Reopening for record and cleanup.** The agent may wait on the user between execution and these phases, so each of them starts like preflight: open a new dedicated tab, navigate to the environment, and confirm the signed-in state, logging in again per `auth.method` if the session expired. Close that tab at the end of the phase.

## phase=record

Input: the selected defects. Record one video per defect, saved as `<output_dir>/<run_id>/evidence/<BUG-n>.mp4`. Never pause and never ask.

1. **Check the format path once.** On chrome-devtools, `screencast_start` writes `.mp4` directly. On Claude in Chrome, `gif_creator` exports only GIF, so check for ffmpeg (`ffmpeg -version`) before the first defect. Without ffmpeg, still record, keep `<BUG-n>.gif`, and set the note `mp4 conversion skipped: ffmpeg not installed`.
2. **Mutation check.** If replaying a defect's steps would create or change data and the environment's `allow_mutations` is false, do not record it. Note `not recorded: replay would mutate data`. Replays reuse the shared records where they still exist. Any new record goes into `data_ledger` like any other.
3. **Per defect:**
   1. Return to the defect's preconditions without recording: role, viewport, starting page, and the record state it needs.
   2. Start recording (see `references/browser-providers.md`, "Recording"). On Claude in Chrome, take a screenshot right after starting so the first frame shows the starting state.
   3. Replay the numbered repro steps at a readable pace. Wait for each state to settle and pause about one second on the failing state, so a viewer sees the bug.
   4. Stop recording. On Claude in Chrome, take a screenshot right before stopping, then export.
   5. Move the file to `evidence/<BUG-n>.mp4`. On Claude in Chrome, find the exported GIF in the browser's download folder (newest `<BUG-n>*.gif`), move it to `evidence/`, then convert it:
      `ffmpeg -y -i <BUG-n>.gif -movflags faststart -pix_fmt yuv420p -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" <BUG-n>.mp4`
      Delete the GIF after a successful conversion.
   6. If the expected failure did not appear during the replay, keep the video and set the note `did not reproduce on recording replay`.
4. **Never record a credential.** Log in before starting a recording, never during one. If a repro step is the login itself, start recording after the password field is filled and submitted.
5. On a provider error, retry the recording once. If it fails again, note `not recorded: <error>` and move on.

Output: `recordings: [{ bug, path | null, note }]`.

## phase=cleanup

Input: `data_ledger` and the set of refs to keep. The agent only calls this once the user agreed, or on production when every case passed.

Walk `data_ledger` newest first and remove each record that is not in the keep set and was not already deleted by a case, using the plan's cleanup action. Mark each entry `cleaned`, `kept (user choice)`, or `left behind (<why>)`. Never delete a record that is not in the ledger, and never delete anything whose name lacks the run's prefix. Before a delete raises a native confirm, follow the Dialogs rule above.

Close the tab you opened.

## Output

```
preflight: { reachable, roles: [{role, signed_in, note}], deployment: verified|unverified, deployment_note, seed: [...] }
results:   [{ id, status, rows?: [...], actual, evidence: [...], console: [...], network: [...], attempts, note }]
defects:   [{ id: BUG-n, case, title, severity, priority, ac, env, build, role, viewport, browser, preconditions, steps, expected, actual, frequency, evidence, console, network, caveat? }]
data_ledger: [{ ref, kind, identifier, created_in, status: in-place|cleaned|kept (user choice)|left behind, note }]
questions: [{ text, unblocks: [...], kind }]
recordings: [{ bug, path | null, note }]      # phase=record only
```
