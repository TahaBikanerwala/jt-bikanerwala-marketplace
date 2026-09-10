# Browser verification: spec 0001, slice 5.3 (Pulse tag-tile dashboard)

- **Date:** 2026-09-04
- **Mode:** first-pass
- **Branch:** feat/pulse-tag-tile-dashboard
- **Target:** `plugins/sprint-status-reporter/skills/dashboard-composer/references/dashboard-page.html`, opened directly as a `file://` URL. **No live base URL exists** — this is a static Claude Artifact page that only gets a real URL once `/sprint-status-reporter:pulse` runs against a live tracker MCP and publishes it. No tracker MCP has been reachable in any build session (spec §9.1 still open), so this could not be driven against the live Artifact or real tracker data.
- **Provider:** Neither `chrome-devtools-mcp` nor Claude-in-Chrome was available in this session — no `ToolSearch` tool was exposed to load them, and no `tabs_context_mcp` tool was present. Per instructions, degraded to a minimal-footprint fallback rather than a silent skip: a small Node script (`node`'s **native** `WebSocket`/`fetch`, no npm packages installed, no puppeteer) driving the system's already-installed `google-chrome` in headless mode over raw Chrome DevTools Protocol. `window.claude` (the Artifact runtime binding the page depends on) was stubbed via `Page.addScriptToEvaluateOnNewDocument` with two hand-built fixtures matching `dashboard-composer`'s exact documented output schema, so the dynamic tag-tile rendering could be exercised end to end in a real browser rather than only read. All driver scripts and fixtures are in the scratchpad and are not part of the app/repo.

## Cases driven

1. **Case A — no stub** (`window.claude` genuinely absent, as it is on a raw `file://` open): confirms the runtime-missing error path.
2. **Case B — fixture with a resolved delta**: multi-tag ticket, a newly-at-risk ticket, a real label spelled `untagged` colliding with the reserved `Untagged` tile, a `delta.shipped`-shaped closed row, a non-empty new-since callout, a tag with an empty (gated-looking) closed side.
3. **Case C — fixture with `delta` absent** (`delta_available: false`): `metrics.completed`-shaped closed row, no new-since callout, point-in-time note.

Screenshots captured for all three cases (scratchpad `shots/`, referenced below).

## Slice 5.3 Verification block

### Step 3 — User-facing flow

| AC / behavior | Result | Evidence |
|---|---|---|
| Tag tiles render with active/closed counts | PASS (data) / **see HIGH finding** (visual) | `B-with-delta-live-view.png`; counts read `ECW 2 1`, `QA 1 0`, `untagged 0 1`, `Untagged 1 0` — numerically correct, but the tile has **zero visible card styling** (see finding below) |
| Multi-tag ticket (id 101) appears under every one of its tags (5.3.10) | PASS | Two distinct DOM rows confirmed live: `pulse-dashboard-tag-ecw-active-item-101` and `pulse-dashboard-tag-qa-active-item-101` |
| Untagged ticket appears under `Untagged`; real `untagged` label gets its own separate tile (5.3.10, warnings) | PASS | Two distinct testids confirmed live: `pulse-dashboard-tag-untagged-tile` and `pulse-dashboard-tag-untagged-2-tile`; warning banner text rendered verbatim |
| New-since callout shows when a delta is available (5.3.14) | PASS | `pulse-dashboard-new-since-section` present, count `2`, both items listed, heading reads "New since 2026-08-31" |
| No-delta / point-in-time state (5.3.7, 5.1.8) | PASS | Case C: `pulse-dashboard-no-delta-state` note rendered, no new-since section, closed list falls back correctly. `C-no-delta-point-in-time.png` |
| Gated/empty list renders `None.`, not dropped (5.3.8) | PASS | QA tag's closed list (empty in fixture) renders `pulse-dashboard-tag-qa-closed-list` = "None." |
| Ticket rows show id, title, state, assignee, points, blurb (5.3.11) | PASS | Visually confirmed row: "101 Fix login bug — Active, Taha, 3 pts, idle 1d — Login redirect loop fixed." |
| Reason badge + NEW marker on at-risk rows | PASS | `blocked: waiting-on-vendor` badge and `NEW` marker both rendered on ticket 205 |
| "Copy for deck" mirrors tile layout (5.3.12) | PASS | `deck-text` textarea value matches the fed `deck_text` payload exactly, byte for byte |
| Copy control places the deck text on the clipboard | PASS (genuinely exercised) | Real trusted CDP mouse click + `Browser.grantPermissions` (clipboard-write), then `navigator.clipboard.readText()` read back — returned text is character-identical to `deck_text`. Copy status read "Copied to the clipboard." |
| View toggle switches views (mouse) | PASS | Clicking `tab-deck` flips `aria-selected`, hides `panel-live`, shows `panel-deck` |
| View toggle switches views (keyboard, Enter) | PASS | Focused `tab-deck` via `.focus()`, dispatched a real `Enter` keydown/char/keyup — native `<button>` synthesized a click, `aria-selected` flipped and panel revealed |
| Console clean on every case | PASS | Zero console messages, zero exceptions across cases A, B, C |

**Not verifiable in this environment (needs a live tracker + live Artifact publish) — UNVERIFIED, not a failure:**
- AC 5.3.1–5.3.3 (flag parsing, `--range`/`--from`/`--till`/`--status` validation, baseline resolution) — these are agent/command logic, no UI surface; out of this verifier's scope regardless.
- The actual `Artifact` publish/update call and the real hosted-Artifact wrapper chrome around this page.
- Rendering against real (not hand-fed) tracker data shapes beyond what the documented schema covers.

### Step 4 — Accessibility

| Check | Result | Evidence |
|---|---|---|
| Tab order reaches every interactive control | PASS | Real `Tab` key dispatch, full cycle confirmed: `tab-live` → `tab-deck` → `copy-button` → `deck-text` → wraps |
| Focus is visible on each interactive control | PASS | Computed `box-shadow` ring (`0 0 0 3px #fff, 0 0 0 6px #123f8c`, the `:focus-visible` rule) present on every keyboard-focused control (`tab-live`, `tab-deck`, `copy-button`, `deck-text`) |
| 44×44 minimum touch targets preserved | PASS | Measured rects: `tab-live` 126.6×48, `tab-deck` 148.4×48, `copy-button` 183×48 — all ≥ 44×44 |
| ARIA tablist semantics preserved | PASS | `role="tablist"` on the container, `role="tab"` ×2, `role="tabpanel"` ×2, `aria-selected` toggles correctly, `aria-labelledby` correct, `role="status"` on loading/copy-status, `role="alert"` on error-state |
| Text meets baseline contrast at default zoom | PASS | 8 real color pairs sampled from live computed styles and checked against WCAG: body text 16.9:1, muted stamp 6.0:1, selected-tab white-on-blue 9.9:1, item-id accent 9.9:1, at-risk reason badge 7.8:1, count pill 9.9:1, copy button 9.9:1, NEW marker 8.1:1, disabled copy button 15.6:1 — every pair comfortably clears WCAG AA's 4.5:1 (most clear AAA's 7:1 too) |
| Keyboard operability of the tab control | PASS | See "View toggle switches views (keyboard, Enter)" above |

**Not verifiable in this environment:** real assistive-technology (screen reader) announcement behavior, and anything specific to the hosted-Artifact wrapper (out of scope for a static-file check).

## HIGH finding

**`dashboard-composer/references/dashboard-page.html` — `tile()` function — tag tiles render with zero visible card styling (border/background/padding all absent).**

Root cause confirmed by direct computed-style inspection: `tile()` creates the tile as `element("div", "item tile")` — a `<div class="item tile">` — but the CSS that gives `.item` its card look is scoped `li.item { background: var(--sunken)... border: 1px solid var(--hairline); border-radius: 6px; padding: 10px 12px; margin: 0 0 8px; }`, an `li`-tag-qualified selector. Since the tile is a `<div>`, not an `<li>`, none of that styling applies. Confirmed live: `getComputedStyle(tileEl)` returned `background-color: rgba(0,0,0,0)`, `border: 0px none`, `padding: 0px`, `margin: 0px` on every tile in both fixtures (reproduced in both Case B and Case C).

- **Expected** (per context §8a: "the existing single-number `.count` pill badge is the natural basis for a two-number (active/closed) tile badge; extend that pattern rather than introducing a new card/badge style" and the surrounding `.bucket`/`.item` card language): each tag tile in the summary grid should render as a bordered, padded card, matching the same visual language as every other card on the page (ticket rows, tag sections, the new-since banner).
- **Observed**: the tile-grid summary at the top of the live view renders as plain, unstyled text sitting in CSS grid cells with only the grid's 10px gap for separation — no border, no background, no padding. See `B-with-delta-live-view.png` and `C-no-delta-point-in-time.png`: `ECW 2 1  QA 1 0  untagged 0 1  Untagged 1 0` reads as one undifferentiated strip rather than four distinct cards. This directly undercuts the stated purpose of this slice — "a per-area (per-tag) breakdown he can read off directly instead of mentally regrouping a flat list."
- Not a WCAG contrast/keyboard issue (the tiles are non-interactive, and the text itself is still legible and passes contrast) — this is a layout/design-system-conformance defect (design-craft priority 3, layout/responsive), rated **HIGH** because it breaks the primary user-facing purpose of the AC (5.3.9) it implements, on every render, not just under unusual input.
- **Fix shape** (for `slice-builder`, not applied by this verifier): change `tile()`'s `element("div", "item tile")` to create an `<li>` (matching `itemRow()`'s pattern) inside a `<ul>`, or add a dedicated `.tile` CSS rule (not `li.item`-scoped) that supplies the card background/border/padding regardless of tag. Confirm against `.tile-grid`'s existing `display: grid` container either way.

## Summary

12 of 12 checkable user-facing-flow behaviors verified in-browser (1 HIGH visual defect found among them); 6 of 6 accessibility checks passed. 3 items (flag parsing/baseline resolution, live Artifact publish, real tracker-data shapes) remain UNVERIFIED pending the first real run against a live tracker MCP and a live Artifact publish — consistent with the spec's own "Verification status at build time" notes for slices 5.1 and 5.3, and expected, not a build blocker.

---

## Re-verify: HIGH finding — tag tiles render with zero visible card styling

- **Date:** 2026-09-04
- **Mode:** re-verify
- **Branch:** feat/pulse-tag-tile-dashboard @ `837fdd9`
- **Target / provider:** same as first pass — `dashboard-page.html` opened as a `file://` URL, no live base URL (spec §9.1 still open). Same degraded-fallback provider as the first pass: no `chrome-devtools-mcp` or Claude-in-Chrome tool available in this session either, so re-verification reused the scratchpad's raw-CDP driver (`cdp.js` + `fixtures.js`) against a freshly-launched headless `google-chrome` (the prior session's headless instance had exited between sessions; relaunched on the same debug port with the same fixtures). Note: this Chrome version required `--remote-allow-origins=*` for the native-WebSocket CDP connection to respond at all — without it, `Runtime.evaluate` calls hung indefinitely with no error (a environment-only wrinkle, unrelated to the app).
- **Fix verified:** `.item` CSS selector generalized from `li.item`, plus `.tile { margin: 0; }` reordered after `.item` in source.

### Direct `getComputedStyle` re-inspection (fixture B, all 4 tiles: ECW, QA, untagged, Untagged)

| Property | Before (first-pass) | After (re-verify) |
|---|---|---|
| `background-color` | `rgba(0,0,0,0)` | `rgb(255, 255, 255)` (matches `.item` rows) |
| `border` | `0px none` | `1px solid rgb(211, 217, 224)` (matches `.item` rows) |
| `border-radius` | (none, effectively 0) | `6px` |
| `padding` | `0px` | `10px 12px` |
| `margin` | `0px` (accidentally correct before, for the wrong reason) | `0px` (now correct **because** `.tile { margin: 0 }` deliberately overrides `.item`'s `0 0 8px`, confirmed by source-order + cascade, not accidental) |

All 4 tiles (`pulse-dashboard-tag-ecw-tile`, `-qa-tile`, `-untagged-tile`, `-untagged-2-tile`) returned identical, correct values — confirmed live via `Runtime.evaluate`, not inferred from source reading.

### Regression checks

- **(a) Existing `<li class="item">` rows unaffected:** `pulse-dashboard-tag-ecw-active-item-101` (active list), a generic closed-list `<li>` (`pulse-dashboard-tag-ecw-closed-item-88`), and a new-since `<li>` (`pulse-dashboard-new-since-item-88`) were all re-inspected live. All three are `tag: "LI"`, `className: "item"` (no `.tile`), and render `background: rgb(255,255,255)`, `border: 1px solid rgb(211,217,224)`, `border-radius: 6px`, `padding: 10px 12px`, `margin: 0px 0px 8px` — byte-identical to the first-pass values for this same selector class. The selector widening (`li.item` → `.item`) did not change anything about ticket-row rendering, as expected. **No regression.**
- **(b) Grid spacing — no doubled margin/gap stacking:** measured tile rects confirm exact-gap spacing with no margin contribution: tile 1 `x=20, w=235`; tile 2 `x=265` (`20+235+10=265`, exactly the grid's `10px` gap, tile margin contributes `0`); tile 3 `x=510` (same pattern); tile 4 (row 2) `y=591` where tile 1 `y=527, h=54` → `527+54+10=591`, again exactly the grid gap. **No doubled spacing — confirmed clean.**
- **(c) `.bucket-head` / `.count` / `.count-group` (same-diff cascade-adjacent area):** visually and via computed style, `.bucket-head` is transparently unstyled as designed (it's a label row, not a card), `.count` pills render as expected pill badges (`border-radius: 999px`, colored background per active/closed variant — blue `rgb(18,63,140)` for active, matching the existing count pattern), `.count-group` is `display: flex; gap: 6px` with `margin-left: auto` correctly pushing the pill pair to the tile's right edge. Screenshot (`REVERIFY-tile-grid-scrolled.png`) shows all 4 tiles as well as the ECW/QA/untagged/Untagged ticket-bucket cards below rendering with correct, undisturbed card chrome. **No regression spotted.**
- **Console:** zero console messages, zero exceptions on this re-verify run (fixture B, same as first pass).

### Outcome

**CLOSED** — browser-confirmed via live `getComputedStyle` inspection and screenshot. The tag tiles now render as bordered, padded, background-filled cards matching the rest of the page's card language, satisfying AC 5.3.9's "per-tag breakdown" intent. No regression found on existing `<li class="item">` rows, grid spacing, or the adjacent `.bucket-head`/`.count`/`.count-group` styling.

Screenshots: `REVERIFY-tile-fix-live-view.png` (top-of-page, "New since" section), `REVERIFY-tile-grid-scrolled.png` (tile grid + all four tag-bucket cards, scrolled into view) — scratchpad `shots/`.
