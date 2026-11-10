# Browser providers: action → tool mapping

Both providers are MCP servers whose tools are usually deferred. Load every tool you expect to need in **one** `ToolSearch` call per provider. Prefixes vary by install, so match by suffix.

## chrome-devtools MCP (preferred)

Load: query `chrome-devtools` (or `select:` the full names once known) for `new_page, select_page, list_pages, close_page, navigate_page, take_snapshot, take_screenshot, click, fill, fill_form, type_text, press_key, hover, drag, upload_file, wait_for, handle_dialog, evaluate_script, list_console_messages, get_console_message, list_network_requests, get_network_request, emulate, resize_page, lighthouse_audit, performance_start_trace, performance_stop_trace`.

| Action | Tool (suffix) | Notes |
|---|---|---|
| open a dedicated tab | `__new_page` | keep its page id; `__select_page` to return to it |
| navigate, reload, back, forward | `__navigate_page` | |
| read the page | `__take_snapshot` | accessibility tree with element uids; use uids for interactions |
| click | `__click` | by uid from the latest snapshot; re-snapshot after DOM changes |
| type into one field | `__fill` | |
| fill several fields | `__fill_form` | |
| key presses (Tab, Enter, Escape) | `__press_key` | keyboard-only accessibility checks |
| hover | `__hover` | tooltips, menus |
| upload a file | `__upload_file` | only files the plan provides |
| wait for state | `__wait_for` | wait for expected text |
| native dialogs | `__handle_dialog` | accept or dismiss |
| run JavaScript | `__evaluate_script` | read values, clear session cookie for expiry tests; never to fake a pass |
| console | `__list_console_messages`, `__get_console_message` | |
| network | `__list_network_requests`, `__get_network_request` | status codes and response bodies |
| viewport | `__resize_page` or `__emulate` | `__emulate` also does network throttling and offline |
| screenshot | `__take_screenshot` | pass a file path under the evidence folder |
| Lighthouse | `__lighthouse_audit` | accessibility, best practices, performance |
| close tab | `__close_page` | |

## Claude in Chrome

Load in one call: `select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__tabs_create_mcp,mcp__claude-in-chrome__tabs_close_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__computer,mcp__claude-in-chrome__read_page,mcp__claude-in-chrome__find,mcp__claude-in-chrome__form_input,mcp__claude-in-chrome__get_page_text,mcp__claude-in-chrome__read_console_messages,mcp__claude-in-chrome__read_network_requests,mcp__claude-in-chrome__javascript_tool,mcp__claude-in-chrome__resize_window,mcp__claude-in-chrome__gif_creator,mcp__claude-in-chrome__file_upload`.

Call `tabs_context_mcp` first in every session, then create a new tab. Never reuse a tab the user already had open, and never reuse tab ids from a previous session.

| Action | Tool | Notes |
|---|---|---|
| open a dedicated tab | `tabs_create_mcp` | |
| navigate | `navigate` | |
| read the page | `read_page`, `get_page_text`, `find` | `find` locates an element by description |
| click, type, keys, scroll, screenshot | `computer` | actions: `left_click`, `type`, `key`, `scroll`, `screenshot` |
| fill form fields | `form_input` | by element ref from `read_page` / `find` |
| run JavaScript | `javascript_tool` | stub `window.confirm`/`alert` before dialog-raising clicks |
| console | `read_console_messages` | use a `pattern` to filter noise |
| network | `read_network_requests` | |
| viewport | `resize_window` | |
| recording | `gif_creator` | long P1 flows; capture extra frames before and after |
| upload a file | `file_upload` | |
| close tab | `tabs_close_mcp` | |

**Evidence files on Claude in Chrome.** `computer` screenshots come back to you as images, not files. Use `gif_creator` (which exports a file) for evidence that must exist on disk, and for everything else record in the case result what the screenshot showed: the exact visible text, element states and URL. The report then lists the evidence as an observation instead of an image path.

**Not available on Claude in Chrome:** Lighthouse, network throttling and offline emulation, performance traces. Cases needing them are `Not testable (provider lacks <capability>)` with the note that chrome-devtools MCP would cover them.

**Never trigger a native dialog without stubbing it first.** A blocking `alert` or `confirm` freezes the extension; if it happens, the remaining cases become `Blocked (browser dialog)` and the report asks the user to dismiss it.

## Rules for both

- Re-read the page after every state-changing action before asserting.
- Never type a credential into anything except the login form, and never screenshot while it is filled.
- If two or three attempts at the same action fail (element not found, click has no effect), stop retrying that case: `Blocked (could not interact with <element>)` with a screenshot, and move on.
