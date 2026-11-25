# UI and browser QA heuristics

What a senior QA walks against each screen, control, state and AC. **Functional** and **Navigation** apply to every run. Every other section applies only when its type is in `test_types`.

Each line is a candidate case or a candidate assertion inside a case. Include a line by default. Skip it only when you can give the reason in one phrase ("no free text on this form"), and record the skip under `skipped`.

## Break it: the questions to ask of everything

Ask each question of every AC, every control rule and every state transition. Every answer that could reveal a defect becomes a case of type `adversarial`. Write it concretely. "Test invalid input" is not a case. "After a successful **Validate**, change one character in the query: **Run** becomes disabled and the old result is cleared or marked stale" is a case.

1. **Twice.** Do it again straight away: double-click, press Enter twice, submit again after success, create the same name twice.
2. **Out of order.** Skip a step, do step 3 before step 2, or trigger an action before its prerequisite (Run before Save, Publish before Validate, Next with the step incomplete).
3. **Change it after it worked.** Once a step has succeeded (validated, saved, tested, previewed, ran, approved), edit an input that step depended on. Everything that relied on it must be invalidated. Buttons it enabled go back to disabled, results and previews are cleared or marked stale, success badges reset, and the user has to repeat the step. Teams miss this case more than any other.
4. **Undo it.** Edit a value and then put the original back. Clear a field and retype it. Select an option and deselect it. Do the dirty flag, the Save button and the validation follow?
5. **Abandon it.** Leave half way: Cancel, Escape, the X, a click outside the dialog, browser Back, refresh, closing the tab. Is the original data intact, and is the next visit clean, with no half-filled form and no leftover error?
6. **Fail, then recover.** Cause an error, fix the input and retry. Does the error clear, does the control re-enable, and does the retry succeed exactly once?
7. **Extremes.** Empty, one, many. Min-1, min, max, max+1. Whitespace only. Very long values. Unicode, emoji, right-to-left text, leading zeros, negatives. Pasted text that contains line breaks.
8. **Get round the guard.** Press Enter in a field while the submit button is disabled. Activate a disabled control from the keyboard. Reach a step by its URL instead of its button. Use another way in (a keyboard shortcut, a context menu, a bulk action) that may skip the check.
9. **Two at once.** Open the same record in two tabs, or as two roles. Change it in one, then act in the other.
10. **What else should change, and what must not.** For each action, list the side effects a user would expect: counts, badges, totals, lists, timestamps, and the same value shown on other pages. Then list what must stay untouched: other fields, other records, other users' views. Assert both.

## Functional (always)

### Control states and invalidation

Model every interactive control on a touched screen: buttons, links, inputs, toggles, menu items, tabs. Note when each one is visible, enabled, read-only, selected or loading, and what changes that. Write each as a rule, for example "**Run** is enabled only when the query is valid and saved". Then test each rule:

- **Starting state.** First load, a new record, and a record loaded from saved data.
- **Both directions.** Each condition that turns it on, and each condition that turns it **back off**. Turn-off triggers include clearing the field, entering an invalid value after a valid one, editing after a successful validate, save, test or run, removing a required selection, or moving to a state where the action no longer applies.
- **Every input path.** Typing, pasting, autofill, keyboard selection, picking from a list, a value loaded from the server, undo.
- **Survives the round trip.** After a reload, after Cancel, after an error, and after the async action finishes, whether it succeeded or failed.
- **Disabled means disabled.** While the control is disabled, clicking it does nothing. When it is the form's default submit button, pressing Enter in a single-line text input of that form does not trigger it either (never a textarea or code editor, where Enter adds a line; and skip the Enter check when another, enabled button is the default submit). The control's own action does not run: none of its requests fire and nothing it would change changes. Tab skips it. If it can still take focus (an `aria-disabled` control), Enter and Space on it do nothing either.
- **In flight.** While an action runs, its trigger is disabled or ignores repeats, and conflicting actions are blocked. Afterward everything re-enables, after a failure as well as after a success. A control that stays disabled after an error is a classic defect.
- **Hidden, disabled or read-only** per role and per state, as the ACs say. A disabled control explains why when the AC asks for that.

### Forms and input

- Required fields: empty, whitespace only, leading and trailing whitespace (is it trimmed?).
- Length: min-1, min, max, max+1 (boundary values from the AC). If the AC gives no limit, ask, and try a very long value as an `inferred` check for graceful handling.
- Format: one valid value, plus one value for each distinct invalid class (email, phone, URL, date, numbers with separators, negatives, decimal precision).
- Special characters `< > & " '` and unicode save and display unchanged. So do markup and template text: `<b>qa</b>` shows as those characters, not bold text, and `{{7*7}}` and `${7*7}` stay literal and never show `49`. These run on every free-text field without Security selected, because they execute nothing. In a field that names the record, put the text after the run's prefix (`qa-1234-{{7*7}}`), so the record can still be cleaned up if the case ends before it reverts.
- Server errors: when a save or load fails on the server, the user sees an error they can act on, and the failure is not swallowed with the input lost.
- Paste vs type, autofill, copying a value back out.
- Dependent fields: changing a parent dropdown resets or filters the child, and clears a child value that is no longer valid.
- Cross-field rules: end after start, totals equal the sum of the lines.
- Error messages appear next to the field, are specific, clear once fixed, and focus moves to the first error.
- Submit: disabled while submitting; a double-click creates one record, not two.
- Saved values come back exactly. Re-open the record after saving and after a reload, and every field shows what was saved, with trimming, formatting and precision as the AC says.
- Defaults: default values, default selection, default focus, default sort.

### Lists, search and data volume

- Zero, one, many; the empty-state message and its call to action.
- Pagination boundaries: exactly one page, one page plus one, the last page.
- Sort and filter combined; filters survive a refresh or are cleared as intended.
- Search: no results, special characters, case, partial match.
- New and edited records appear in the list without a manual refresh where the AC implies it, and appear everywhere else the value is shown.

### Dates, numbers, locale

- Timezone: a timestamp near midnight, shown in the user's zone as the AC requires.
- DST change dates, leap day, end of month.
- Currency and number formatting, rounding, negative amounts.

## Navigation (always)

For every screen, route, tab, dialog and wizard step the change adds or touches:

- **Ways in.** Every entry point reaches it: menu, link, button, breadcrumb, search result, redirect, and the direct URL in a fresh tab.
- **Ways out.** Every exit lands where it should: Save, Cancel, Close, the X, Escape, breadcrumb, logo, browser Back.
- **Back and Forward.** After each navigation, and after each in-page change the app puts in history (a tab switch, a filter, a wizard step, a dialog with its own route). Back returns to the previous view with its state and Forward returns again. Nothing is resubmitted, no page is blank or broken, and stale data is never shown as current.
- **Back after a write.** After create, save or delete, Back does not resubmit, does not reopen an editable form for a deleted record, and does not show the old values as if they were current.
- **Refresh.** On the screen and at every step of a multi-step flow, refresh reloads to a valid state. State kept in the URL (tab, filter, page, step) survives. Unsaved input is kept or the user is warned, as the AC says.
- **Deep links.** The screen's URL and a record's URL work in a new tab when signed in. Signed out, they go to login and then return to the same target.
- **Bad URLs.** A record id that does not exist, was deleted or is malformed shows a not-found state. Never a crash, a blank page or someone else's record.
- **Protected URLs.** Signed out, a protected screen's URL goes to login (the deep-link case above). When two or more roles are configured, a role without access that opens the URL directly is refused, never shown the screen. This minimal access check is always on; the full matrix is under Permissions and Security.
- **Unsaved-changes guard.** With unsaved edits, an in-app link, browser Back and refresh each warn or save, as the AC says. Confirming leaves without saving. Cancelling stays, with the edits intact. Back and refresh raise the browser's own prompt and need the provider capability `beforeunload handling`; the in-app link usually shows the app's own dialog and does not. Closing the tab is planned `Not testable (no provider can observe the close prompt)` on every provider, because closing a page through the tools skips the prompt.
- **The URL reflects state.** Where the app routes state (tabs, filters, pagination, the selected record), the URL changes with it, and pasting that URL restores the state.
- **Links are links.** Anything that navigates is a real link (the accessibility tree shows a link with an `href`, so it can be opened in a new tab), goes to the right target, and treats external links as the AC says.
- **Landing after an action.** After login, logout, create, save and delete, the user lands on the page the AC names. When the AC is silent, check that it is a sensible page and mark the oracle `convention`.

## UI (when `ui` is selected)

- **Copy.** Every label, button, heading, placeholder, tooltip, message and empty state the ticket quotes appears exactly, with the same spelling, case and punctuation. Other text is checked for typos, truncation and leftovers such as `TODO`, `lorem`, `undefined`, `null`, `NaN`, `[object Object]`, or raw keys like `form.error.required`.
- **Every state renders.** Loading, empty, one, many, error, success, disabled and partial data each look intentional, not like a broken page.
- **Feedback.** Every action gives visible feedback (a spinner, a toast, an inline message). Toasts can be dismissed or go away on their own. Success and error messages say what actually happened.
- **Layout.** Alignment and spacing match sibling screens. Nothing overlaps or is clipped at the default viewport. Long values truncate with the full value still reachable. Nothing jumps when async content arrives, and sticky headers or footers never cover content.
- **Visual states.** Hover, focus, active, selected and disabled each look different. A disabled control looks disabled and an enabled one does not.
- **Consistency.** Controls, icons, terms, and date and number formats match the rest of the app.
- **Design.** When the ticket includes screenshots or a layout spec, compare against them. When it links a design you cannot open, list it under Not covered.

## Accessibility (when `accessibility` is selected)

- Keyboard only through the main flow: every control reachable with Tab in a sensible order and operable with Enter or Space.
- Visible focus indicator.
- Focus lands somewhere sensible after each action: back on the trigger when a dialog closes, on the first invalid field after an error, on the next item or the list after a delete, and on the heading or main region after a route change.
- Names, roles and states: inputs have labels, icon buttons have accessible names, and the accessibility tree exposes disabled, expanded, selected, checked, required and invalid states that match what is shown.
- Errors are tied to their fields. Async results (saved, failed, no results) are announced through a live region or a focus move.
- Dialogs trap focus and close on Escape.
- Contrast on new or changed text and controls.
- At 200% zoom, and in a 320 px wide viewport, content reflows with nothing lost and no horizontal scroll.
- On chrome-devtools, one Lighthouse accessibility audit per changed page. Each failing audit item is a finding.

## Security (when `security` is selected)

Attack-shaped input and tampering run only on records the run created and only where `allow_mutations` is true. Plan these cases as `mutates: reversible` at least, so the mutation guard skips them elsewhere. Lines marked *(ends the session)* sign the user out; plan them under the session-ending rule in the designer's step 8. Never bypass captcha, MFA, rate limits or bot protection. Never browse real users' records. Never put a token, cookie value or secret into evidence: report names and presence, never values.

- **Stored and reflected script.** Put `<script>window.__qaXss='<marker>'</script>`, `<img src=x onerror="window.__qaXss='<marker>'">` and `"><svg onload="window.__qaXss='<marker>'">` into every free-text field, every URL parameter and every search box the page echoes back. `<marker>` is unique per case, field and payload (`TC-12-name-img`), so a hit names its source. In a field that names the record, put the payload after the run's prefix (`qa-1234-<img src=x onerror=...>`), so cleanup can still find and delete the record if the case ends before its revert step. Expected: shown as literal text wherever it renders (list, detail, tooltip, page title, export preview) and never executed. Never use payloads that call `alert`, `confirm` or `prompt`: a real native dialog freezes Claude in Chrome. The executor resets the flag before each render check, then reads it.
- **Injection-shaped data.** `' OR 1=1 --` and `"; --` are stored and shown literally, with no server error and no change in which records are returned. (Template text such as `{{7*7}}` is already in the always-on Forms checks.)
- **Client-only checks.** Use a script to remove `disabled` from a disabled control, or `maxlength` and `required` from a field, then use it. Do the same for a hidden action reached by its URL. Where the control guards ownership or a role's permission (another user's record, an action the role may not take), whether or not the ticket mentions it, or a data rule the ticket names (a stated limit or required field), the server must still refuse: an error is shown, nothing is saved, and the response is a 4xx, not a 5xx. Where the control is only a step in the flow (Run disabled until Validate, Save disabled until something changed), the server accepting the request is a question, not a security defect.
- **Access by URL.** Signed out, every protected URL in scope redirects to login. Signed in as a second role, a record the run created under the first role is refused or not found, never shown. With a single account, try only an id that does not exist, and report anything that leaks.
- **Session** *(ends the session)*. After logout, Back and cached URLs show no protected data, and an action from a page opened before logout fails. Logging out in one tab ends the session in the other tabs.
- **Data exposure.** No password, token or personal data appears in the URL, the page title, the console or an error message. Responses for the screen do not carry sensitive-looking fields the UI never shows (password hashes, tokens, other users' data). Token-looking values in `localStorage` or `sessionStorage` are reported as a finding with a question, not as an exposure, because some auth libraries keep them there by design (report key names only). Error pages show no stack traces, SQL or internal paths.
- **Open redirect** *(ends the session)*. After login or logout, a `returnUrl`, `next` or `redirect` parameter that points off-site is not followed.
- **Uploads,** when the feature takes files: a wrong type, a renamed extension (an `.exe` saved as `.png`), an empty file and an oversized file are each refused with a clear message. Generate these files under the evidence folder and upload nothing else.

## Responsive (when `responsive` is selected)

- Re-run the smoke cases at each configured viewport.
- No horizontal scroll at any configured viewport.
- Nothing clipped, overlapping or off-screen. Long text wraps or truncates with the full value still reachable.
- Navigation collapses to a usable menu, and dialogs fit the screen.
- Touch targets roughly 44 by 44 pixels.

## Performance (when `performance` is selected; `lighthouse` is a legacy name for it)

- On chrome-devtools, one Lighthouse performance audit per changed page, reporting the score and the top three opportunities. A score below 50 is an S3 finding unless the AC sets a threshold.
- The main flow under `Slow 3G` or `Slow 4G` throttling: a loading state appears, nothing can be submitted twice, and the page is usable once it settles.
- Large data, where existing data allows it: a long list paginates or virtualizes and stays responsive.
- Requests: one action does not fetch the same resource twice, and typing in a search box does not fire a request per keystroke.

## Permissions (when `permissions` is selected)

- A role by action matrix from `auth.roles` for every protected action the ACs mention. Allowed roles succeed. For the others the action is hidden or disabled as the AC says, and its direct URL is refused.
- The signed-out case for each protected screen.
- Role switch in the same tab *(ends the session)*: log out, log in as another role, and confirm nothing from the first session shows (cached data, menus, counts).
- With fewer than two roles configured, plan only the signed-out and direct-URL cases and add a question asking for a second test account.

## Resilience (when `resilience` is selected)

- Offline at the moment of a save: a clear error, no silent loss, the input is kept, and the retry works once back online.
- Slow network on the main flow: a loading state, no double submit, and Cancel works if the UI offers it.
- Session ended mid-form *(ends the session)*: log out in another tab of the same session, then submit: a graceful re-login, with the data not lost silently.
- The same record in two tabs: save in one, then save stale data in the other. Expected: the conflict is detected, or last write wins only if the ticket says so. Never silent data loss.

## Health assertions on every case

- No uncaught console errors (warnings are noted, not failures).
- No unexpected 4xx or 5xx in the network requests the case triggered.
- No broken images or missing assets on the page under test.

## Regression around the change

- For each wide-blast-radius risk area, the main flow of every other page that shares the changed code.
- Features next to the changed one on the same page (the other tabs, the other buttons in the same toolbar).

## Commonly missed: check before returning the plan

Confirm a case exists for each line that applies:

- Every control rule tested in both directions, including after a completed step is edited again.
- Every touched screen: Back, Forward, refresh, a deep link signed in and signed out, and a bad id.
- Every write: a reload shows it saved, Back afterwards does not resubmit, and a double-click creates one record.
- Every async action: the control re-enables after a failure, not only after a success.
- Every Cancel: changes are discarded and the original is restored.
- Every error: it clears when fixed, and a retry works.
- Every form: when the disabled control is the form's default submit button, Enter in a single-line field does nothing. Enter submits once it is enabled only when the form is a real `<form>` with a submit button; a panel of inputs with a plain button may ignore Enter by design, so skip that half there.
- Every list the change writes into: the item appears without a manual refresh where the AC implies it.
- Every value: shown the same everywhere it appears.
- Every case without an AC behind its expected result carries the oracle `implied` or `convention`.
