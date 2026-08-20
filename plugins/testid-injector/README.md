# testid-injector

Adds the `data-testid` attributes your developers forgot. It scans UI source, finds every form control, dropdown, dropdown **option**, link, and interactive element that has no test id, generates a stable semantic id, and writes it in. Every change passes through one diff-and-confirm gate, and it never overwrites an id that already exists.

Built for React/JSX/TSX first. Auto-detects and also handles plain HTML, Vue SFCs, and Angular templates.

## Install

```
/plugin install testid-injector@jt-bikanerwala-marketplace
```

No MCP and no config required. It works on the files in your repo using the built-in editing tools.

## Use

```
@testid-injector add missing test ids to the checkout feature
```

or the slash commands:

```
/testid-injector:audit                   # read-only coverage report, writes nothing
/testid-injector:audit src/features/checkout
/testid-injector:run                     # scan, show the diff, write on confirm
/testid-injector:run src/components/LoginForm.tsx
/testid-injector:run "src/**/*.tsx"
```

Start with `audit` to see the size of the gap and the exact ids it would add. Run the injection when you're ready; it pauses at the diff so nothing lands without your say-so.

## What gets tagged

- **Form controls:** every `input` (except `type=hidden`), `textarea`, `select`, `button`, and the `<form>` itself.
- **Dropdowns and every option:** native `select`/`option` plus component dropdowns (MUI, Ant, react-select, Radix/shadcn, Headless UI, Angular Material, Vuetify, Element Plus). The trigger *and* each option get an id. This is the part most teams miss.
- **Composite widgets, part by part:** date pickers and calendars (trigger input, popup, **every day cell** keyed by ISO date, month/year nav, footer buttons), autocomplete/combobox, multi-select with removable chips, time pickers, range sliders, number steppers, pagination, tabs, accordions, segmented controls, rating, OTP/PIN, file dropzones, color pickers, menus, and phone inputs. It tags the wrapper *and* the parts a test actually clicks, with per-library hooks for MUI X, react-datepicker, react-day-picker, Ant, Angular Material, Flatpickr, and react-select. Native `input[type=date|time|month|week]` is handled as the simple browser-drawn case.
- **Links:** `a[href]` and `role="link"`.
- **Everything else interactive:** elements with click/change/input/keydown handlers, the interactive ARIA roles (`button`, `tab`, `menuitem`, `checkbox`, `radio`, `switch`, `option`, `combobox`, `slider`, ...), `summary`, and custom components whose names signal interactivity.

It skips presentational elements, `input[type=hidden]`, labels/fieldsets, and anything already carrying a test id.

## Naming

Default scheme is semantic kebab-case: a descriptor from the strongest available signal (`id` → `name` → `<label>` → `aria-label` → `placeholder` → visible text → `value` → context) plus a role suffix.

```jsx
<input type="email" name="email" data-testid="login-email-input" />

<select name="country" data-testid="country-select">
  <option value="in" data-testid="country-option-in">India</option>
</select>

<button data-testid="login-submit-button">Sign in</button>
```

Ids are deterministic and idempotent: the same element yields the same id every run, so re-running is safe and your tests can rely on the values.

## Configure (optional)

Drop a `.claude/testid-policy.json` in your project root to override defaults:

```json
{
  "attribute": "data-testid",
  "naming": "semantic-kebab",
  "scopePrefix": "none",
  "include": ["src/**/*.{jsx,tsx,js,ts,html,vue,svelte}"],
  "exclude": ["**/node_modules/**", "**/*.test.*", "**/*.spec.*", "**/*.stories.*", "**/dist/**", "**/build/**"],
  "elements": { "forms": true, "interactive": true, "links": true, "options": true },
  "maxLength": 40,
  "overwriteExisting": false,
  "dynamicListStrategy": "key-field"
}
```

| Key | Default | Notes |
|---|---|---|
| `attribute` | `data-testid` | Use `data-cy`, `data-test`, `data-qa` for other harnesses (Cypress, Playwright, Selenium). |
| `naming` | `semantic-kebab` | Also `component-scoped` (`LoginForm__email-input`) or `camelCase`. |
| `scopePrefix` | `none` | `auto` prefixes the component name; or set a literal string. |
| `overwriteExisting` | `false` | Leave off to stay idempotent. |
| `dynamicListStrategy` | `key-field` | How mapped/looped elements get per-item ids. |

`include`, `exclude`, `elements`, and `maxLength` (shown in the JSON above) round out the schema. The full key list, defaults, and meanings live in the canonical reference: `skills/element-catalog/references/testid-policy-schema.md`.

If no file is present, the agent uses defaults and offers to write one with the choices you made during the run.

## How it works

A thin command dispatches to the `testid-injector` agent, which runs: bootstrap (detect framework + scope) → scan and classify via the `element-catalog` skill → generate ids via the `testid-namer` skill → **diff-and-confirm gate** → apply targeted edits → verify and summarize. Edits insert only the attribute; they never reformat or reorder your code.

Components that don't forward the attribute (some Ant and react-select cases) are reported in a "manual review" list with the exact prop-forwarding edit to make, rather than being silently skipped.

## License

MIT
