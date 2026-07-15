---
name: element-catalog
description: "Defines which web UI elements should carry a test id, how to recognize them in source, and how to read the signals (id, name, label, aria-label, placeholder, text, value) that name them. Covers form controls, native and component dropdowns plus their options, links, and any element made interactive by a handler or role. Use when scanning UI source to enumerate elements that need a data-testid."
metadata:
  author: Taha Bikanerwala
tools: Read, Grep, Glob
---

# Element Catalog

The single source of truth for *what to tag* and *how to spot it*. The `testid-injector` agent loads this in its scan phase. Framework-specific syntax (how the element actually appears in React vs Vue vs Angular vs HTML) lives in `references/`; load the one(s) matching the detected frameworks. Composite widgets (date pickers, calendars, autocompletes, multi-selects, time pickers, sliders, pagination, ...) are multi-part controls with their own rules in `references/composite-widgets.md`; load it whenever the scan hits one.

## The catalog

Tag an element if it falls into any class below and the matching `policy.elements` toggle is on.

### Form controls (`forms`)

| Element | Notes |
|---|---|
| `input` | Every type **except** `hidden`. Includes `text, email, password, number, search, tel, url, date, time, datetime-local, month, week, color, range, file, checkbox, radio, submit, reset, button`. |
| `textarea` | Always. |
| `select` | The control itself. Each `option`/`optgroup` is tagged under the dropdowns class. |
| `button` | Always, including icon-only buttons (name from `aria-label`). |
| `form` | The `<form>` element. |

### Dropdowns and options (`options`)

This is the class developers most often forget. **Tag both the trigger and every option.**

| Pattern | Trigger | Options |
|---|---|---|
| Native | `select` | each `option`, each `optgroup` (label) |
| MUI | `Select`, `TextField select` | each `MenuItem` |
| Ant Design | `Select` | each `Select.Option` / `Option` |
| react-select | `<Select>` | options are data-driven; tag via the `getOptionAttributes`/`classNamePrefix` note in the React reference |
| Radix / shadcn | `Select`, `SelectTrigger` | each `SelectItem` |
| Headless UI | `Listbox.Button` / `Combobox` | each `Listbox.Option` / `Combobox.Option` |
| Angular Material | `mat-select` | each `mat-option` |
| Vuetify / Element Plus | `v-select` / `el-select` | each `el-option` (or data-driven `items`) |

For data-driven options (a `.map`, `v-for`, `*ngFor`, or an `items`/`options` prop), the option id is a template keyed off the item — see `references/` and `testid-namer`'s dynamic-list rule.

### Composite / complex widgets (`forms` and/or `interactive`)

Multi-part controls where tagging only the wrapper leaves the parts a test clicks unreachable. **Tag the wrapper and every interactive part** (trigger input, popup, each day cell / option / page / chip, nav and footer buttons). Covered widgets: date pickers and calendars, autocomplete/combobox/typeahead, multi-select with chips, time pickers, range sliders, number steppers, pagination, tabs, accordions, segmented controls, rating, OTP/PIN, file dropzones, color pickers, menus, phone inputs. Many parts are data-driven (one node per day/option/page) and key off their value, not an index — that's the dynamic-list rule. Full part lists, library hooks (MUI X, react-datepicker, react-day-picker, Ant, Angular Material, Flatpickr, react-select, ...), and the manual-review fallback live in `references/composite-widgets.md`. **Load it whenever the scan encounters a date/calendar/picker/autocomplete/slider/pagination widget.**

Native `input[type=date|datetime-local|month|week|time]` is *not* composite — the browser draws the calendar and there are no day-cell nodes you control. Tag the `input` and stop.

### Links (`links`)

`a[href]` and `[role="link"]`. Skip `<a>` with no `href` and no handler (it's not interactive).

### Other interactive elements (`interactive`)

Tag an element when **any** of these hold:

- It has an event handler that implies user interaction: `onClick`, `onChange`, `onInput`, `onKeyDown`, `onKeyUp`, `onSubmit`, `onToggle` (React); `(click)`, `(change)`, `(input)`, `(keydown)` (Angular); `@click`, `v-on:click`, `@change`, `@input` (Vue); `onclick`/`onchange` (HTML).
- It carries a `role` in the interactive set: `button, link, tab, menuitem, menuitemcheckbox, menuitemradio, checkbox, radio, switch, option, combobox, slider, spinbutton, searchbox, textbox`.
- It is `summary` (inside `details`), or `details`.
- It is `[contenteditable]`.
- It is a custom component whose name signals interactivity: ends in `Button`, `Link`, `Toggle`, `Switch`, `Dropdown`, `Menu`, `Tab`, `Picker`, `Selector`, `Checkbox`, `Radio`, or `Field`.

## Do not tag

- `input[type=hidden]`.
- Purely presentational elements with no handler and no interactive role (`div`, `span`, `p`, `img`, `svg`, headings) — even inside a form.
- `label`, `fieldset`, `legend` — they describe controls, they aren't the control. (Their text is a *signal* for naming the control they wrap.)
- An element that already has the configured attribute (idempotency — the agent skips it).
- `<option>` inside a `<datalist>` used only for native autocomplete, unless the user asks.

## Reading naming signals

For every element you catalog, collect these so `testid-namer` can name it. Priority order top to bottom; the namer uses the strongest present.

1. **`id`** attribute (often already the most semantic handle).
2. **`name`** attribute (form controls).
3. **Associated `<label>`** text: a `<label for="x">` matching the control's `id`, or a `<label>` wrapping the control. In React also `aria-labelledby` → referenced element's text.
4. **`aria-label`**.
5. **`placeholder`**.
6. **Visible text content** (buttons, links, options, menu items).
7. **`value`** attribute (radios, options, submit buttons).
8. **Enclosing context:** nearest component name, `<form>` name/id, section heading, or `role`-bearing landmark. Used as a prefix or as the whole descriptor when nothing else exists.

Record the component or file name too — `scopePrefix: "auto"` and collision disambiguation use it.

## Detection tactic for large scopes

For a big scan, Grep first to skip files with no UI, then Read only the hits. Useful signatures:

- React/HTML: `<(input|select|textarea|button|form|a|option)\b`, `role=`, `onClick`, `onChange`, `MenuItem`, `SelectItem`, `mat-option`.
- Vue: `<(input|select|textarea|button|el-select|v-select)\b`, `@click`, `v-on:`.
- Angular: `<(input|select|textarea|button|mat-select|mat-option)\b`, `\(click\)`, `\(change\)`.

Then Read each hit file to get accurate element boundaries, attributes, and the surrounding label/text context. Do not rely on Grep alone to place edits — attribute insertion needs the real opening-tag span.
