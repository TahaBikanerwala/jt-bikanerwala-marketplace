# Composite / complex widgets

A composite widget is one interactive control made of many DOM parts: a date picker is a trigger input *plus* a popup calendar *plus* a grid of day cells *plus* month-navigation buttons. Tagging only the outer wrapper leaves the parts a test actually clicks (a specific day, the next-month arrow, an autocomplete option) unreachable. **Tag the wrapper and every interactive part.**

These widgets are usually library components. The parts often render in a portal/overlay detached from the trigger in the DOM, and many parts are data-driven (one node per day, per option, per page). Treat the data-driven parts as dynamic lists keyed by their value (the date, the option id, the page number), never by raw index.

When a library renders parts internally and gives no prop to tag them, record the widget under `manual_review` with the documented hook (render prop, slot, `slotProps`, `componentsProps`, `classNamePrefix`), and tag what you *can* reach (the trigger, the wrapper).

## Naming convention for widget parts

All parts share the widget's descriptor as a prefix so they read as a set:

```
<widget-descriptor>-<part>[-<key>]
```

e.g. for a "Start date" picker → `start-date-input`, `start-date-calendar`, `start-date-prev-month`, `start-date-day-2026-06-15`.

---

## Date pickers and calendars

The part that trips teams up most. Parts to tag:

| Part | Suffix | Notes |
|---|---|---|
| Trigger input | `-date-input` | The text field the user types into or that shows the chosen date. |
| Trigger/toggle button (calendar icon) | `-date-toggle` | When the icon is a separate button. |
| Popup container | `-calendar` | The dialog/popover. `role="dialog"` or `role="application"`. |
| Previous / next month | `-prev-month`, `-next-month` | Navigation arrows. |
| Previous / next year | `-prev-year`, `-next-year` | When present. |
| Month / year header or selects | `-month-select`, `-year-select` | Dropdown or clickable header. |
| **Day cell** | `-day-<YYYY-MM-DD>` | **Dynamic, one per rendered day, keyed by the ISO date.** This is the high-value target. |
| Weekday column headers | usually skip | Not interactive. |
| Today / Clear / Apply / Cancel / Now | `-today-button`, `-clear-button`, `-apply-button`, `-cancel-button` | Footer actions. |
| Range: start & end inputs | `-start-date-input`, `-end-date-input` | Two triggers for a range picker. |

Day cells are the dynamic-list case. Emit a template keyed by the date, e.g. React `` data-testid={`booking-day-${format(day, 'yyyy-MM-dd')}`} ``. Falling back to index (`-day-3`) is position-fragile across months; only do it when no date value is reachable, and flag it.

### Library specifics

| Library | How to tag parts |
|---|---|
| **Native `input[type=date\|datetime-local\|month\|week\|time]`** | Already covered by the form-control catalog. The browser renders the calendar; there are no day-cell DOM nodes you control. Just tag the `input`. |
| **MUI `DatePicker` / `DateTimePicker` / `DateRangePicker` (`@mui/x-date-pickers`)** | Trigger: `slotProps={{ textField: { 'data-testid': 'start-date-input' } }}`. Day cells: `slotProps={{ day: { 'data-testid': ... } }}` accepts a function of `(ownerState)` returning props, key by `ownerState.day`. Nav and toolbar: `slotProps.previousIconButton`, `.nextIconButton`, `.actionBar`. Flag as `prop-forward`. |
| **react-datepicker** | Wrapper input: `<DatePicker customInput={...}>` or the `id` prop. Day cells: `renderDayContents={(day, date) => <span data-testid={...}>...}`. Nav: `renderCustomHeader`. Flag the day-cell case for manual review with this hook. |
| **react-day-picker** | Use `components={{ Day: (props) => <button data-testid={`day-${format(props.day.date,'yyyy-MM-dd')}`} {...} /> }}` and `modifiers`/`classNames` for nav. Flag `prop-forward`. |
| **Ant `DatePicker` / `RangePicker`** | Trigger forwards `data-testid` to the wrapper poorly; prefer the `id` prop or a wrapper. Cells: `cellRender`/`dateRender={(current) => <div data-testid={...}>}`. Footer via `renderExtraFooter`. Flag manual review. |
| **Angular Material `mat-datepicker`** | Tag the `<input matInput [matDatepicker]>` directly (`data-testid` works). The calendar panel renders day cells internally with no per-cell input; selecting a day in tests is usually done by `aria-label`. Note this in manual_review: per-day test ids aren't exposed; suggest selecting by the cell's existing `aria-label`. |
| **Vuetify `v-date-picker` / Element Plus `el-date-picker`** | Vuetify exposes the `v-date-picker` host (`data-testid` falls through). Per-day cells need the relevant slot; flag for manual review. |
| **Flatpickr (vanilla / wrappers)** | Renders into `.flatpickr-calendar` in a portal. Day cells get `aria-label` dates. Hook: `onDayCreate(dObj, dStr, fp, dayElem) { dayElem.dataset.testid = ... }`. Flag `prop-forward`. |

---

## Autocomplete / combobox / typeahead

Parts: the text input, the listbox popup, each suggestion option (dynamic), the clear ("×") button, and the dropdown toggle.

| Part | Suffix |
|---|---|
| Input | `-input` |
| Listbox container | `-listbox` |
| Each option | `-option-<value-or-slug>` (dynamic, keyed by option id/value) |
| Clear button | `-clear-button` |
| Dropdown toggle | `-toggle` |

- **MUI `Autocomplete`**: input via `slotProps={{ htmlInput: { 'data-testid': 'city-input' } }}` (or `renderInput`). Options via `renderOption={(props, option) => <li {...props} data-testid={`city-option-${option.id}`}>`. `prop-forward`.
- **react-select**: input via `inputId`. Options via `components={{ Option }}` injecting `data-testid`, or `classNamePrefix` for class hooks. Clear/dropdown via `components`. Flag manual review with these hooks.
- **Headless UI `Combobox`**: `Combobox.Input`, `Combobox.Options`, each `Combobox.Option` all accept `data-testid` directly. Safe.
- **Downshift / cmdk**: you control the render; tag input, menu, and each item directly.

---

## Multi-select with chips/tags

Parts: trigger, each selected chip, each chip's remove button (dynamic, keyed by the value), the dropdown options.

| Part | Suffix |
|---|---|
| Trigger | `-multiselect` |
| Selected chip | `-chip-<value>` (dynamic) |
| Chip remove button | `-chip-<value>-remove` (dynamic) |
| Option | `-option-<value>` (dynamic) |

Tag remove buttons individually — tests frequently need to deselect one specific tag.

---

## Time pickers

Parts: hour, minute, second fields or columns, the AM/PM toggle, and (if a clock UI) the clock numbers. Suffixes: `-hour-input`/`-hour-select`, `-minute-input`, `-second-input`, `-meridiem-toggle`. For column-style pickers, each selectable value is dynamic: `-hour-option-<n>`.

---

## Other complex composites (same wrapper-plus-parts rule)

| Widget | Parts to tag |
|---|---|
| **Range slider** | `-slider`; for two-thumb ranges tag each thumb `-slider-thumb-min` / `-slider-thumb-max`. |
| **Number stepper / spinner** | `-input`, `-increment-button`, `-decrement-button`. |
| **Pagination** | `-prev-button`, `-next-button`, each page `-page-<n>` (dynamic), `-page-size-select`. |
| **Tabs** | each tab `-tab-<key>` (dynamic), each panel optional. |
| **Accordion** | each header toggle `-accordion-<key>-header` (dynamic). |
| **Segmented control / toggle button group** | each segment `-segment-<value>` (dynamic). |
| **Rating** | each star `-rating-<n>` (dynamic 1..max). |
| **OTP / PIN input** | each digit box `-otp-<index>` (dynamic; index is correct here — the boxes are positional). |
| **File dropzone** | the drop area `-dropzone`, the hidden `<input type=file>` `-file-input`, the browse button `-browse-button`. |
| **Color picker** | the input `-color-input`, each preset swatch `-swatch-<hex>` (dynamic). |
| **Menu / dropdown menu / context menu** | the trigger `-menu-trigger`, each item `-menuitem-<key>` (dynamic). |
| **Phone input (with country code)** | the country `-country-select`, the number `-phone-input`. |

---

## Decision rule when a part can't be reached

1. Can you reach the part with a prop / render-prop / slot the library documents? Use it, mark `prop-forward`, show the exact edit in the diff.
2. No documented hook, but the library spreads rest props onto the part? Add the attribute, mark low-confidence.
3. Neither? Tag the wrapper/trigger you *can* reach, and add the widget to `manual_review` naming the unreachable parts and the recommended approach (often: select by the part's existing `aria-label`, or wrap the widget). Never claim a widget is fully covered when only its wrapper was tagged.
