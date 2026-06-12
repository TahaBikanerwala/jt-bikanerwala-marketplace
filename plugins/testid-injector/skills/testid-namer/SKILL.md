---
name: testid-namer
description: "Turns the naming signals collected from a UI element (id, name, label, aria-label, placeholder, visible text, value, enclosing context) into a stable, human-readable test id. Default scheme is semantic kebab-case with a role suffix; also supports component-scoped (BEM-like) and camelCase. Handles dropdown options, dynamic list templates, deduplication, and length limits. Use when generating data-testid values for elements that lack one."
metadata:
  author: Taha Bikanerwala
tools: Read
---

# Test-ID Namer

Produce one stable id per element. The same element in the same place yields the same id every run — that's what makes the output safe to re-apply and safe for tests to depend on. Detailed transforms and worked examples live in `references/naming-rules.md`; load it when you start generating.

## The shape

```
[<scope>-]<descriptor>-<role>
```

- **scope** (optional, from `policy.scopePrefix`): `none` → omitted; `auto` → the component/file name in kebab (e.g. `login-form`); a literal string → used verbatim.
- **descriptor**: derived from the strongest available signal.
- **role**: a suffix naming what the element is.

Example: `<input type="email" name="email">` inside `LoginForm.tsx` with `scopePrefix: auto` → `login-form-email-input`. With `scopePrefix: none` → `email-input`.

## Descriptor: signal priority

Use the first that yields something meaningful. Full rules in the reference.

1. `id` attribute
2. `name` attribute
3. associated `<label>` text (or `aria-labelledby` target text)
4. `aria-label`
5. `placeholder`
6. visible text content (buttons, links, options, menu items)
7. `value` attribute (radios, options, submit buttons)
8. enclosing context (form name, section heading, nearest landmark) + role only

If nothing semantic exists, name it `<scope>-<role>-<n>` by document position and mark it **low-confidence** so it shows distinctly in the diff. Never emit a hash or a random suffix.

## Role suffixes

| Element | Suffix |
|---|---|
| text-like `input` (text, email, password, number, search, tel, url, date, ...) | `-input` |
| `textarea` | `-textarea` |
| `input[type=checkbox]`, `[role=checkbox]` | `-checkbox` |
| `input[type=radio]`, `[role=radio]` | `-radio` |
| `input[type=file]` | `-file-input` |
| `input[type=range]`, `[role=slider]` | `-slider` |
| `select`, combobox trigger | `-select` |
| `option`, `MenuItem`, `SelectItem`, `mat-option` | `-option` |
| `button`, `input[type=submit/button/reset]`, `[role=button]` | `-button` |
| `a[href]`, `[role=link]` | `-link` |
| `[role=tab]` | `-tab` |
| `[role=menuitem]` | `-menuitem` |
| `[role=switch]`, toggle | `-toggle` |
| `form` | `-form` |

If the descriptor already ends in the role word (e.g. visible text "Submit" on a button → `submit`), don't double it into `submit-button-button`; the reference covers the de-dup of the role word.

## Dropdown options

Options are named relative to their trigger so they read as a set:

```
<trigger-descriptor>-option-<value-or-text>
```

`country-select` → options `country-option-in`, `country-option-us`. Prefer the option's `value` for the leaf; fall back to its visible text. For data-driven options emit a template (see dynamic lists).

## Composite widget parts

A composite widget (date picker, calendar, autocomplete, multi-select, pagination, ...) shares one descriptor across all its parts so they read as a set. Shape:

```
<widget-descriptor>-<part>[-<key>]
```

The widget descriptor comes from the trigger's signals (its `name`/`label`/`aria-label`), the same as any control. The `<part>` token names the piece; the optional `<key>` makes data-driven parts unique. Canonical part tokens:

- Date picker / calendar: `date-input`, `date-toggle`, `calendar`, `prev-month`, `next-month`, `prev-year`, `next-year`, `month-select`, `year-select`, `day-<YYYY-MM-DD>`, `today-button`, `clear-button`, `apply-button`, `cancel-button`. Range: `start-date-input`, `end-date-input`.
- Autocomplete / combobox: `input`, `listbox`, `option-<value>`, `clear-button`, `toggle`.
- Multi-select: `multiselect`, `chip-<value>`, `chip-<value>-remove`, `option-<value>`.
- Time picker: `hour-input`/`hour-select`, `minute-input`, `second-input`, `meridiem-toggle`.
- Pagination: `prev-button`, `next-button`, `page-<n>`, `page-size-select`. Tabs: `tab-<key>`. Rating: `rating-<n>`. OTP: `otp-<index>`. Stepper: `increment-button`, `decrement-button`. Dropzone: `dropzone`, `file-input`, `browse-button`.

Day cells use the ISO date (`booking-day-2026-06-15`) so a test can target an exact day deterministically. Full part inventory and the per-library hooks live in `element-catalog`'s `references/composite-widgets.md`.

## Dynamic lists (.map / v-for / *ngFor)

Emit a template, not a fixed string, keyed off the item per `policy.dynamicListStrategy`:

- `key-field`: `` `country-option-${c.code}` `` using the item's `key`/`id`/`code`/`value`/`slug`.
- `index`: `` `country-option-${i}` `` only when no stable field exists; flag as position-fragile in the diff.

The framework reference shows the exact binding syntax per framework.

## Formatting per scheme

- **semantic-kebab** (default): lowercase, ASCII, words joined by `-`. Strip punctuation, collapse whitespace, transliterate accents (`é`→`e`). `"Sign in"` → `sign-in`.
- **component-scoped**: `Component__descriptor-role` (BEM-like). Scope segment keeps original component casing; descriptor stays kebab. `LoginForm__email-input`.
- **camelCase**: `loginEmailInput`. Same descriptor, camel-joined, role word camel-suffixed.

## Constraints

- Enforce `policy.maxLength` (default 40). When over, drop the lowest-priority words from the middle of the descriptor, keep scope and role. Never truncate mid-word into gibberish.
- **Uniqueness within a file.** Track assigned ids per file. On collision, add a disambiguator from the next signal down (e.g. two "Delete" buttons → `delete-user-button`, `delete-account-button`), or failing that append `-2`, `-3`.
- Stability: derive only from source signals and document position, never from timestamps, randomness, or content hashes.
