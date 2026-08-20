# Policy schema

Path: `.claude/testid-policy.json` (project root). Optional. When absent, the agent uses the shipped defaults below silently and, at the end of the run, offers to write the file with the choices made during that run.

This file is the single source of truth for the shape of `.claude/testid-policy.json`. `agents/testid-injector.md` and `README.md` summarize it and link here; if they ever disagree with this file, this file wins.

## Shape

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

All keys are optional. A present file is merged over the defaults above key by key; missing keys fall back to their default.

## Key reference

### `attribute` (string)

The attribute the agent adds to untagged elements. **Default:** `"data-testid"`. Switch to `"data-test"`, `"data-cy"`, `"data-qa"`, etc. to match other test harnesses (Jest/Testing Library, Cypress, Playwright, Selenium).

### `naming` (string enum)

The id-generation scheme. One of:

- `"semantic-kebab"` (default) — descriptor + role suffix, kebab-case (`login-email-input`).
- `"component-scoped"` — descriptor prefixed with the component name (`LoginForm__email-input`).
- `"camelCase"` — same descriptor, camelCase instead of kebab-case.

### `scopePrefix` (string)

Prefix applied to every generated id. One of:

- `"none"` (default) — no prefix.
- `"auto"` — derive the prefix from the component or file name.
- Any other literal string — used verbatim as the prefix.

### `include` (string[])

Glob patterns for files to scan. **Default:** `["src/**/*.{jsx,tsx,js,ts,html,vue,svelte}"]`. Used in Phase 0 to resolve scope when no explicit file/directory/glob argument is given.

### `exclude` (string[])

Glob patterns for files to skip, applied after `include`. **Default:** `["**/node_modules/**", "**/*.test.*", "**/*.spec.*", "**/*.stories.*", "**/dist/**", "**/build/**"]`.

### `elements` (object of booleans)

Toggles for the element classes defined in `element-catalog`'s `SKILL.md`. **Default:** `{ "forms": true, "interactive": true, "links": true, "options": true }`.

- **`forms`** — form controls (`input`, `textarea`, `select`, `button`, `form`) and composite/complex widgets.
- **`interactive`** — everything else made interactive by a handler, ARIA role, or interactivity-signaling component name.
- **`links`** — `a[href]` and `[role="link"]`.
- **`options`** — dropdown triggers and their options (native `option`/`optgroup` and component-library equivalents).

Setting a class to `false` skips every element in that class during Phase 1 classification.

### `maxLength` (number)

Maximum length of a generated id before truncation. **Default:** `40`.

### `overwriteExisting` (boolean)

When `true`, allows replacing an existing id that doesn't match the configured naming scheme. **Default:** `false`. Leave off to preserve the idempotency guarantee; even when `true`, a replacement still only happens after the user confirms it in the Phase 3 diff.

### `dynamicListStrategy` (string enum)

How mapped/looped elements (`.map`, `v-for`, `*ngFor`) get per-item ids. One of:

- `"key-field"` (default) — derive the id from the item's own id/key (e.g. `country-option-${c.code}`).
- `"index"` — derive the id from the loop index instead.

**Default:** `"key-field"`.

## Notes on idempotency and this schema

`overwriteExisting` is the only policy key that can make the agent touch an element that already carries `attribute`. Detecting "already carries `attribute`" is not a plain string match on the literal form alone — it also matches the framework's bound/dynamic form of the attribute (Vue `:data-testid="expr"` / `v-bind:data-testid="expr"`, Angular `[attr.data-testid]="expr"`). See `element-catalog`'s `SKILL.md` ("Do not tag" and "Detection tactic for large scopes") and the `references/vue.md` / `references/angular.md` idempotency notes.
