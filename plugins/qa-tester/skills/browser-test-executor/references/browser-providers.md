# Browser providers: action → tool mapping

Both providers are MCP servers whose tools are usually deferred. Load every tool you expect to need in **one** `ToolSearch` call per provider. Prefixes vary by install, so match by suffix.

## chrome-devtools MCP (preferred)

Load: query `chrome-devtools` (or `select:` the full names once known) for `new_page, select_page, list_pages, close_page, navigate_page, take_snapshot, take_screenshot, click, fill, fill_form, type_text, press_key, hover, drag, upload_file, wait_for, handle_dialog, evaluate_script, list_console_messages, get_console_message, list_network_requests, get_network_request, emulate, resize_page, lighthouse_audit, performance_start_trace, performance_stop_trace, screencast_start, screencast_stop`.

| Action | Tool (suffix) | Notes |
|---|---|---|
| open a dedicated tab | `__new_page` | keep its page id; `__select_page` to return to it |
| signed-out or second-user session | `__new_page` with `isolatedContext: "<name>"` | its own cookies and storage. Use it for signed-out deep links, a second role, and two-session conflict cases |
| navigate, reload, back, forward | `__navigate_page` | `type: url \| back \| forward \| reload`. `type: reload` is a real reload. `handleBeforeUnload: accept \| dismiss` answers the browser's unsaved-changes prompt. It defaults to `accept`, which looks the same as no prompt, so guard cases start with `dismiss` (see the executor's guard rule). The resubmit prompt on reloading a form POST result is browser UI that `__handle_dialog` cannot see; the executor never reloads such a page |
| read the page | `__take_snapshot` | accessibility tree with element uids; use uids for interactions |
| click | `__click` | by uid from the latest snapshot; re-snapshot after DOM changes |
| type into one field | `__fill` | |
| fill several fields | `__fill_form` | |
| key presses (Tab, Enter, Escape) | `__press_key` | keyboard-only accessibility checks |
| hover | `__hover` | tooltips, menus |
| upload a file | `__upload_file` | only files the plan provides |
| wait for state | `__wait_for` | wait for expected text |
| native dialogs | `__handle_dialog` | accept or dismiss |
| run JavaScript | `__evaluate_script` | read values and storage key names, remove `disabled` or `maxlength` for client-only security checks; never to fake a pass |
| console | `__list_console_messages`, `__get_console_message` | |
| network | `__list_network_requests`, `__get_network_request` | status codes, headers and response bodies |
| viewport | `__resize_page` or `__emulate` | |
| offline, slow network | `__emulate` with `networkConditions` | `Offline`, `Slow 3G`, `Slow 4G`, ... Each call replaces every emulation setting, so pass the viewport again and clear throttling when the case ends |
| screenshot | `__take_screenshot` | pass a file path under the evidence folder |
| Lighthouse | `__lighthouse_audit` | accessibility, best practices, performance |
| record video | `__screencast_start`, `__screencast_stop` | `screencast_start({ pageId, filePath: ".../evidence/<BUG-n>.mp4" })` writes mp4 directly; stop with the same `pageId`. Load both in the detect `ToolSearch` |
| close tab | `__close_page` | |

## Claude in Chrome

Load in one call: `select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__tabs_create_mcp,mcp__claude-in-chrome__tabs_close_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__computer,mcp__claude-in-chrome__read_page,mcp__claude-in-chrome__find,mcp__claude-in-chrome__form_input,mcp__claude-in-chrome__get_page_text,mcp__claude-in-chrome__read_console_messages,mcp__claude-in-chrome__read_network_requests,mcp__claude-in-chrome__javascript_tool,mcp__claude-in-chrome__resize_window,mcp__claude-in-chrome__gif_creator,mcp__claude-in-chrome__file_upload`.

Call `tabs_context_mcp` first in every session, then create a new tab. Never reuse a tab the user already had open, and never reuse tab ids from a previous session.

| Action | Tool | Notes |
|---|---|---|
| open a dedicated tab | `tabs_create_mcp` | |
| navigate | `navigate` | |
| back, forward | `navigate` with `url: "back"` or `"forward"` | `tabId` is required |
| reload | `javascript_tool` with `location.reload()` | a real reload. Never navigate to the current URL instead: that is a fresh GET, which never resubmits a form and keeps no history state, so refresh cases would pass falsely. When the page was reached by a native form POST, the browser shows a resubmit prompt that cannot be stubbed; the executor checks for this first and never reloads such a page |
| read the page | `read_page`, `get_page_text`, `find` | `find` locates an element by description |
| click, type, keys, scroll, screenshot | `computer` | actions: `left_click`, `type`, `key`, `scroll`, `screenshot` |
| fill form fields | `form_input` | by element ref from `read_page` / `find` |
| run JavaScript | `javascript_tool` | stub `window.confirm`/`alert` before dialog-raising clicks |
| console | `read_console_messages` | use a `pattern` to filter noise |
| network | `read_network_requests` | |
| viewport | `resize_window` | |
| record video | `gif_creator` | `start_recording` → steps → `stop_recording` → `export` with `download: true`, `filename: "<BUG-n>.gif"`, `options: { showWatermark: false }`. GIF only: convert to mp4 with ffmpeg (see `phase=record`) |
| upload a file | `file_upload` | |
| close tab | `tabs_close_mcp` | |

**Evidence files on Claude in Chrome.** Take failure screenshots with the `computer` screenshot action's `save_to_disk: true` when the tool offers it, and move the returned path to `evidence/<case-id>.png`. When the tool cannot save to disk, or saving fails, record in the case result what the screenshot showed (the exact visible text, element states and URL); the report then lists that evidence as an observation instead of an image path, and no screenshot is listed for attachment. Use `gif_creator` (which exports a file) for defect videos.

**Not available on Claude in Chrome:** Lighthouse, network throttling and offline emulation, performance traces, an isolated session, and `beforeunload handling` (the browser's own "Leave site?" and resubmit prompts cannot be stubbed and freeze the extension). Cases needing them are `Not testable (provider lacks <capability>)` with the note that chrome-devtools MCP would cover them. When chrome-devtools is connected as `cross_check_provider`, signed-out cases run there in an isolated context, and `guard: browser` cases run there with `handleBeforeUnload` when the run can sign in there (`auth.method` `env-accounts` or `none`). With `auth.method == browser-session`, never log the user's real profile out to fake a signed-out state.

**Never trigger a native dialog without stubbing it first.** A blocking `alert` or `confirm` freezes the extension; if it happens, the remaining cases become `Blocked (browser dialog)` and the report asks the user to dismiss it.

## Claude in Chrome artifacts

Claude in Chrome drives the user's real Chrome through an extension, using screenshots and coordinates. Some failures come from that, not from the app. When a Claude in Chrome failure shows one of these signs, the executor re-runs the case on chrome-devtools before calling it a defect.

| Sign | What it looks like |
|---|---|
| Missed or misplaced click | a `computer` click had no effect, hit a neighbouring element, or landed under a sticky header, overlay, cookie banner or scroll offset |
| Input not registered | a field shows the text but the app did not take it (a submit sees it empty, a validation does not fire). Typical of `form_input` or fast `type` on React, Vue or Angular controlled inputs that need real `input`/`change` events. Also dropped or reordered characters, or autofill and autocomplete overwriting typed values |
| Focus or background tab | timers, animations, `visibilitychange`, focus or blur handlers misbehave because the tab was not focused or the browser window was in the background |
| Dialog stub side effect | the failure follows a step where `window.confirm`/`alert` was stubbed through `javascript_tool` |
| Real profile interference | requests failing with `ERR_BLOCKED_BY_CLIENT` (an ad or privacy extension), a stale cached bundle, leftover cookies or local storage, a different signed-in account, or another extension's injected DOM |
| Observation gap | the assertion failed because the content was outside the screenshot or not yet lazy-loaded, rather than missing from the DOM |
| Viewport mismatch | a layout failure at a size `resize_window` did not set exactly (browser chrome, zoom level, or a minimum window size) |
| Timing | the step ran before the page settled, and the failure goes away with a longer wait |

**Not artifacts** (never cross-checked, they are defects as they stand): server 4xx/5xx responses the app made, uncaught exceptions thrown by app code, wrong values or text the app rendered, and failures that also show in the app's own network responses.

## Recording

| | chrome-devtools | Claude in Chrome |
|---|---|---|
| start | `__screencast_start` with `filePath` ending in `.mp4` | `gif_creator` `start_recording`, then one `computer` screenshot |
| stop | `__screencast_stop` | one `computer` screenshot, `gif_creator` `stop_recording`, then `export` (`download: true`) |
| output | `.mp4`, written where `filePath` says | `.gif` in the browser's download folder; move it and convert with ffmpeg |
| needs | nothing extra | `ffmpeg` on PATH for mp4; without it the GIF is kept and the note says so |

Only one recording at a time per page. Always stop a recording before starting the next defect, including after an error.

## Rules for both

- Re-read the page after every state-changing action before asserting.
- Never type a credential into anything except the login form, and never screenshot while it is filled.
- If two or three attempts at the same action fail (element not found, click has no effect), stop retrying that case: `Blocked (could not interact with <element>)` with a screenshot, and move on.
