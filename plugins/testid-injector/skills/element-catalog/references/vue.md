# Vue (SFC)

`.vue` single-file components. Tag elements inside `<template>`. Vue passes `data-*` attributes through as fallthrough attributes, so a static `data-testid` on most components reaches the root DOM element.

## Native elements

```vue
<input type="email" name="email" data-testid="login-email-input" />
<button @click="submit" data-testid="login-submit-button">Sign in</button>
<a :href="link" data-testid="nav-pricing-link">Pricing</a>
```

## Native select + options

```vue
<select v-model="country" data-testid="country-select">
  <option value="in" data-testid="country-option-in">India</option>
</select>
```

## v-for loops

Bind the attribute so each iteration is unique. `editKind=dynamic`.

```vue
<option
  v-for="c in countries"
  :key="c.code"
  :value="c.code"
  :data-testid="`country-option-${c.code}`"
>
  {{ c.label }}
</option>
```

Note: `:data-testid="..."` (bound) for dynamic values; `data-testid="..."` (static) for literals. Don't mix — a static attribute with an interpolation `data-testid="x-{{c.code}}"` does not work in Vue templates the way it does in text nodes.

**Idempotency:** an element already carrying `:data-testid="..."` or `v-bind:data-testid="..."` is already tagged. Treat it the same as a literal `data-testid="..."` match and skip it — never add a second, conflicting static attribute alongside a bound one. See the idempotency check in `element-catalog`'s `SKILL.md` ("Do not tag" and "Detection tactic for large scopes").

## Component libraries

| Component | Forwarding |
|---|---|
| **Vuetify `v-text-field`, `v-select`, `v-btn`** | `data-testid` falls through to the root. For the inner input on `v-text-field`, there's no clean attribute path in v3 — flag for manual review or tag the wrapper. |
| **Vuetify `v-select` items** | items are data-driven via the `items` prop; per-option test ids need the `item` slot. Flag for manual review with the slot suggestion. |
| **Element Plus `el-select` / `el-option`** | `el-option` is rendered from data; use the default slot to add `data-testid`. `el-input` falls through to the wrapper. |
| **PrimeVue** | most components forward `data-testid` (or expose `pt` passthrough). |

When a component renders options from a data prop, per-option ids require the slot form. Record `editKind=prop-forward` and show the slot edit in the diff, or move to manual review if the slot isn't already used.

## Edit mechanics

- Insert before the tag close.
- Use the bound form `:data-testid` only when the value is an expression; otherwise static.
- Preserve the SFC's attribute order and indentation; multiline tags are common in Vue, keep each attribute on its own line if neighbors are.
