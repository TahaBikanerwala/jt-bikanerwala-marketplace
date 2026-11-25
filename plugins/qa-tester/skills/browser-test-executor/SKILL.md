---
name: browser-test-executor
description: "Runs a qa-tester plan in a real browser (chrome-devtools MCP or Claude in Chrome): preflight, a read-only reconnaissance of the touched screens (phase=recon), every case with console, network and screenshot evidence, defect videos (phase=record) and test-data cleanup (phase=cleanup). Invoked by the qa-tester agent in Phases 0, 4, 4b, 5 and 7."
metadata:
  author: Taha Bikanerwala
---

# Browser Test Executor

Load `references/browser-providers.md` first; it maps every abstract action below to each provider's tools.

## phase=detect

1. One `ToolSearch` per provider, loading the full set listed in `browser-providers.md` in a single call each. `ToolSearch` returns only a handful of matches by default, so pass `max_results: 40` on a keyword query, then `select:` the resolved names for any tool still missing:
   - chrome-devtools: query `chrome-devtools navigate_page take_snapshot` (tool names end in `__navigate_page`, `__take_snapshot`, ...; the prefix varies by install, e.g. `mcp__plugin_anthara_chrome-devtools__` or `mcp__chrome-devtools__`).
   - Claude in Chrome: `select:` the `mcp__claude-in-chrome__*` tools listed in the reference.
2. Choose:
   - `browser_provider` set explicitly and available → that one.
   - `auth.method == browser-session` and Claude in Chrome available → Claude in Chrome (it drives the user's real Chrome profile, so existing logins work).
   - chrome-devtools available → chrome-devtools.
   - Claude in Chrome available → Claude in Chrome.
   - Neither → `none`.
3. Return `provider` and the list of capabilities missing on it (Claude in Chrome has no Lighthouse and no network throttling, for example, and no isolated session unless chrome-devtools is also connected to run those cases), so the designer and the report can mark those cases `Not testable`.
4. Return `cross_check_provider`: `chrome-devtools` when the chosen provider is Claude in Chrome and chrome-devtools also loaded, else `none`. Execution uses it to re-check failures that may be caused by Claude in Chrome itself.

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

## phase=recon

Look at the real screens before executing, so the plan covers the controls, routes and states that actually exist. Input: the plan's `model.screens` and the risk areas' routes. Use the preflight tab. Time box: `recon_minutes`. Never pause and never ask.

**Read-only.** Never type into a field, and never submit, save, delete, run, send, approve or publish. Click only what navigates or discloses: links, tabs, menus, accordions, and buttons that open a dialog or a form (New, Add, Edit). Close whatever you open with Cancel or Escape. If you cannot tell what a button does, do not click it.

For each screen you can reach this way:

1. Navigate, wait for the page to settle, and take a snapshot (the accessibility tree). Record the URL and the title.
2. List every interactive control with its role, accessible name and state: disabled, read-only, required, checked, expanded, selected, invalid. Record the visible headings, labels, placeholders, helper text, empty-state text and messages.
3. Note the in-page navigation: tabs and whether they change the URL, links and their targets, dialogs and drawers, breadcrumbs.
4. Note console errors and failed requests on load. They become findings during execution; recon passes no verdict.

List a screen that needs a record the run has not created yet under `not_reached`, with what it needs. Return to the environment's start page when done.

## phase=execute

Run the cases in `order`. **Never pause, never ask.** Optional input `only: [case ids]` (the agent's scoped re-run after the end-of-run answers): run just those cases, skip the exploratory pass, and start like preflight (new tab, signed-in check). For each case:

1. **Gate checks.**
   - `planned_status` already set (e.g. `Not testable`, `Skipped (mutation guard)`) → record it and move on.
   - `mutates != none` and the environment's `allow_mutations` is false → `Skipped (mutation guard)`.
   - A precondition depends on an earlier case that did not pass, or a record that does not exist → `Blocked (precondition: <which>)`.
2. **Set up.** Switch role or viewport if needed. Clear console and network buffers (or note the current position) so findings are attributable to this case.
3. **Drive the steps** using the provider mapping. Prefer accessibility-tree or snapshot targeting by visible label, role and `data-testid` over coordinates. After each navigation or submit, wait for the page to settle (a visible element or text from the expected state; never a fixed sleep longer than 2 seconds). Browser Back, Forward and refresh use the provider's history actions, not the app's own back links, unless the step names the app's link. Signed-out deep links run in an isolated session (see `references/browser-providers.md`).
4. **Create data** only as the plan says, with the planned prefixed names. Append every created record to `data_ledger` immediately with its identifier (name, id from the URL or page) and status `in-place`, so cleanup works even if the run dies. When a case deletes a ledger record, set that entry's status to `deleted by case (<TC-id>)`.
5. **Assert** each `expected` and `must_not_change` item by reading the page (snapshot text, element state, URL, field value after reload). For data-table cases, run and report each row.
   - **Control state** comes from the accessibility tree (disabled, expanded, checked, selected), never from colour or appearance. Re-snapshot after every input change, because the state you are testing changes with it.
   - **Disabled means disabled.** Note the network position, activate the control by click, by Enter or Space on the focused control, and by Enter in a form field. Then confirm no request fired and nothing on the page changed.
   - **Navigation cases** assert the URL as well as the content.
   - **Script execution (security cases).** Before the step that renders the payload, install a flag: `window.__qaXss = false; window.alert = window.confirm = window.prompt = () => { window.__qaXss = true; }`. On chrome-devtools, pass it as `initScript` on the navigation so it runs before page scripts. On Claude in Chrome, run it with `javascript_tool` after each navigation and note that execution during page load can be missed. After the page renders, read `window.__qaXss`. `true`, or an injected element present in the DOM, is an S1 defect.
   - **Secrets.** When a case reads storage, cookies or responses, report key and field names only, never their values.
6. **Health.** Read console messages and network requests for this case. Uncaught errors or unexpected 4xx/5xx fail the case even if the UI looked right; expected errors the case provokes on purpose (a 422 on invalid input) do not.
   **Look beyond the expected result.** While driving a case, watch for anything wrong that the case does not assert: a control in the wrong state, a stale value, clipped or overlapping text, wrong copy, a flash of an error, an unexplained slow step. Log each as an exploratory finding `EX-n` with evidence, under the same defect rules. Do not fail the current case for it.
7. **Evidence.** Screenshot on every failure and at the final state of each P1 case, saved to `<output_dir>/<run_id>/evidence/<case-id>[-<row>].png`. On failure also save the console errors and failed request summaries (method, URL, status, short response body with tokens and personal data removed) to `<case-id>-console.txt` / `<case-id>-network.txt`. Do not record video during execution. Videos are made afterward, in `phase=record`, only for the defects the user chooses.
8. **Status.**
   - `Pass`: every expected item observed, health clean.
   - `Fail`: an expected item contradicted, or a health failure.
   - `Blocked`: could not reach the point of assertion for an environmental or dependency reason.
   - `Not testable`: the step needs something the browser run cannot do (email or SMS delivery, a third-party payment, a scheduled job, a captcha, a file the run lacks, a capability the provider lacks), or the AC is too vague to judge the outcome. Always record the reason and the question that would make it testable.
   - `Skipped`: mutation guard, or excluded by the plan.
9. **On Fail:** reload and re-run the case up to `rerun_failures` times from its preconditions, reusing its data where possible. Fails every time → `Fail (reproducible)` and a defect. Passes on a retry → `Pass (flaky: failed n of m)` and a low-severity flakiness note, not a defect. Then decide whether later cases depend on this one; if they do, they will be `Blocked` by the gate check.
   **Cross-check on chrome-devtools.** This applies when `provider == claude-in-chrome`, the case failed reproducibly, the policy's `cross_check_provider_artifacts` is true, and the failure shows at least one sign of a Claude in Chrome artifact. The signs are listed in `references/browser-providers.md`, "Claude in Chrome artifacts". A failure with no such sign (a 5xx from the server, a wrong value the app itself rendered, an uncaught app exception) is a defect as it stands, and is not cross-checked.
   1. If `cross_check_provider == none`, keep the defect and add the caveat `possible Claude in Chrome artifact (<sign>); not cross-checked, chrome-devtools MCP not connected`. Add a question for the end-of-run card asking for a manual re-check, with the case id.
   2. Otherwise, open a new chrome-devtools page and sign in per `auth.method`. chrome-devtools runs its own browser profile, so with `browser-session` the user's Chrome login is not there. If you cannot sign in without asking, treat the cross-check as not possible: keep the defect with the caveat `possible Claude in Chrome artifact (<sign>); cross-check blocked: chrome-devtools not signed in`.
   3. Replay the case from its preconditions on chrome-devtools, using uid-based clicks and `fill`, never coordinates. Reuse the same records, and add any new record to `data_ledger`. Capture the same evidence, with a `-devtools` suffix on the file names.
   4. **Fails on chrome-devtools too:** it is a real defect. Set `cross_check: confirmed on chrome-devtools` on the defect and keep the devtools evidence; it is usually the cleaner evidence.
   5. **Passes on chrome-devtools** (every expected item observed, health clean): it is not a defect. Status `Pass (chrome-devtools; failed only on Claude in Chrome)`. Record the sign and the Claude in Chrome evidence under `provider_artifacts`, so the report can show it without filing a bug.
   6. **Fails differently on chrome-devtools:** keep the devtools failure as the defect, and set `cross_check: fails differently on chrome-devtools (<the Claude in Chrome difference>)`.
   Close the devtools page and return to the Claude in Chrome tab. Cross-checks never pause the run and never ask.
10. **Defect record** for each reproducible failure: title (symptom, not cause), environment and build, role, viewport, browser, preconditions, numbered repro steps, expected (quoting the AC, or naming the implied AC or the convention), actual, frequency, evidence paths, console and network excerpts, severity, priority, the AC it violates, the case's `category` and `oracle`, the deployment caveat if unverified, and the `cross_check` result when one ran or was skipped. Severity: `S1` crash, data loss, security or privacy exposure (script execution, another user's data shown, a server that accepts what the UI forbids), or a P1 flow fully blocked with no workaround; `S2` a P1 or P2 AC fails, an action runs in a state where it should be disabled, or a workaround is painful; `S3` a P3 case fails or a workaround is easy; `S4` cosmetic. Priority follows severity, but drops one level when the failing behavior is outside every AC (`extra-in-pr` region) or the case's oracle is `convention`. A `convention` defect also adds a question for the end-of-run card: "Is <behavior> intended?".

Keep going until every case has a status.

**Dialogs.** Before an action that may raise a native `alert`/`confirm`/`beforeunload`, use chrome-devtools `handle_dialog` after the action; on Claude in Chrome, run `javascript_tool` first to stub `window.confirm = () => true` (or `false` for a cancel test) and `window.alert = () => {}`, and note the stub in the case result.

**Session loss.** If a provider call fails because the tab or browser is gone, recreate the tab and log in once. If that fails, every remaining case is `Blocked (browser session lost)`; return results so far.

### Exploratory pass

After the scripted cases, run each charter within the overall `exploratory_minutes` budget, using the shared records. Log each finding as `EX-n` with the same evidence and defect rules. A finding that needs a decision rather than a fix becomes a question.

**No cleanup here.** Leave every record in place and close the tab you opened. The agent decides in its end-of-run card whether to record defects and whether to delete data, then calls `phase=record` and `phase=cleanup`.

**Reopening for a scoped re-run, record and cleanup.** The agent may wait on the user between execution and these phases, so each of them starts like preflight: open a new dedicated tab, navigate to the environment, and confirm the signed-in state, logging in again per `auth.method` if the session expired. Close that tab at the end of the phase.

## phase=record

Input: the selected defects. Record one video per defect, saved as `<output_dir>/<run_id>/evidence/<BUG-n>.mp4`. Never pause and never ask.

**Pick the recorder.** When a defect was confirmed on chrome-devtools by a cross-check, record it there (native mp4, and no Claude in Chrome artifacts in the video). Otherwise record on `provider`.

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

Walk `data_ledger` newest first and remove each `in-place` record that is not in the keep set (an entry marked `deleted by case` is already gone), using the plan's cleanup action. Mark each entry `cleaned`, `kept (user choice)`, or `left behind (<why>)`. Never delete a record that is not in the ledger, and never delete anything whose name lacks the run's prefix. Before a delete raises a native confirm, follow the Dialogs rule above.

Close the tab you opened.

## Output

```
preflight: { reachable, roles: [{role, signed_in, note}], deployment: verified|unverified, deployment_note, seed: [...] }
recon:     { screens: [{ url, title, controls: [{ role, name, state }], text: [...], navigation: [...] }], not_reached: [...], console: [...], minutes }   # phase=recon only
results:   [{ id, status, rows?: [...], actual, evidence: [...], console: [...], network: [...], attempts, note }]
defects:   [{ id: BUG-n, case, title, severity, priority, ac, category, oracle, env, build, role, viewport, browser, preconditions, steps, expected, actual, frequency, evidence, console, network, caveat?, cross_check? }]
provider_artifacts: [{ case, sign, claude_in_chrome_evidence, devtools_result }]
data_ledger: [{ ref, kind, identifier, created_in, status: in-place|deleted by case (<TC-id>)|cleaned|kept (user choice)|left behind, note }]
missing_capabilities: [...]                   # phase=detect only
questions: [{ text, unblocks: [...], kind }]
recordings: [{ bug, path | null, note }]      # phase=record only
```
