# UI and browser QA heuristics

Checklist a senior QA walks against each AC and each changed page. Apply what the feature makes relevant; skip what it does not. Each line is a candidate case or a candidate assertion inside a case.

## Forms and input

- Required fields: empty, whitespace only, leading and trailing whitespace (is it trimmed?).
- Length: min-1, min, max, max+1 (BVA from the AC; if the AC gives no limit, ask, and try a very long value as an `inferred` check for graceful handling).
- Format: valid and each distinct invalid class (email, phone, URL, date, number with separators, negative, decimal precision).
- Unicode and emoji, right-to-left text, accented characters; does it save and display unchanged?
- Injection-shaped data treated as data safety: `<script>alert(1)</script>`, `' OR 1=1 --`, `{{7*7}}`. Expected: stored and shown as literal text, never executed. Use only on records the run created.
- Paste vs type, autofill, copy of a value back out.
- Dependent fields: changing a parent dropdown resets or filters the child.
- Cross-field rules: end after start, totals equal the sum of lines.
- Error messages: shown next to the field, specific, cleared when fixed, focus moves to the first error.
- Submit button: disabled while submitting; double-click creates one record, not two.

## Navigation and state

- Refresh mid-flow: is unsaved input kept or warned about?
- Back and forward after submit: no duplicate submission, no stale page.
- Deep link straight to the page (and to a record) in a fresh tab.
- Unsaved-changes guard when navigating away.
- Browser zoom 200%: layout still usable.
- Two tabs on the same record: edit in one, observe the other (stale data, conflict handling).

## Session and permissions

- Unauthenticated direct URL: redirected to login, then returned to the original target.
- Role without the permission: the action is hidden or disabled, and direct URL or API access is refused.
- Session expiry mid-form (clear the session cookie via devtools, then submit): graceful re-auth, data not lost silently.
- Data isolation: one user cannot see another tenant's or user's record by changing an id in the URL.

## Lists, search and data volume

- Zero, one, many; the empty state message and call to action.
- Pagination boundaries: exactly a page, a page plus one, last page.
- Sort and filter combined; filters survive refresh or are cleared as intended.
- Search: no results, special characters, case, partial match.
- New and edited records appear in the list without a manual refresh where the AC implies it.

## Dates, numbers, locale

- Timezone: a timestamp near midnight; displayed in the user's zone as the AC requires.
- DST change dates, leap day, end of month.
- Currency and number formatting, rounding, negative amounts.

## Network and resilience

- Slow network (devtools throttling): loading state shown, no double submit.
- Offline or failed request: an error the user can act on, no silent loss, retry works.
- Server error responses are surfaced, not swallowed.

## Health assertions on every case

- No uncaught console errors (warnings are noted, not failures).
- No unexpected 4xx or 5xx in network requests triggered by the case.
- No broken images or missing assets on the page under test.

## Responsive

- No horizontal scroll at each configured viewport.
- Nothing clipped, overlapping, or off-screen; long text wraps or truncates with access to the full value.
- Navigation collapses to a usable menu; dialogs fit the screen.
- Touch targets roughly 44 by 44 pixels.

## Accessibility basics

- Every interactive element reachable and operable by keyboard, in a sensible order.
- Visible focus indicator.
- Inputs have labels; icon buttons have accessible names.
- Errors announced and associated with their fields.
- Dialogs trap focus and close on Escape, returning focus to the trigger.
- Text contrast on new or changed UI.

## Regression around the change

- For each wide-blast-radius risk area, the main flow of every other page that shares the changed code.
- Features adjacent to the changed one in the same page (the other tabs, the other buttons in the same toolbar).
