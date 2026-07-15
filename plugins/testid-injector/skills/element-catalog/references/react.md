# React / JSX / TSX

The primary target. Elements are JSX. Insert the attribute into the opening tag.

## Plain DOM elements

Add the attribute literally. Match the surrounding quote style.

```jsx
// before
<input type="email" name="email" />
// after
<input type="email" name="email" data-testid="login-email-input" />

<button onClick={submit}>Sign in</button>
<button onClick={submit} data-testid="login-submit-button">Sign in</button>

<a href="/pricing">Pricing</a>
<a href="/pricing" data-testid="nav-pricing-link">Pricing</a>
```

`data-*` attributes pass through to the DOM on host elements, so this is always safe on lowercase tags.

## Native select + options

Tag the `select` and every `option`.

```jsx
<select name="country" data-testid="country-select">
  <option value="in" data-testid="country-option-in">India</option>
  <option value="us" data-testid="country-option-us">United States</option>
</select>
```

## Mapped (data-driven) options and lists

Emit a template keyed off the item per `policy.dynamicListStrategy`. `editKind=dynamic`.

```jsx
{countries.map((c) => (
  <option key={c.code} value={c.code} data-testid={`country-option-${c.code}`}>
    {c.label}
  </option>
))}
```

`key-field`: use the field already used as `key`, or `id`/`value`/`code`/`slug`. `index`: fall back to `` `${base}-${index}` `` and note in the diff that index-based ids are position-fragile.

## Custom components — does the prop forward?

A custom component only receives `data-testid` if it spreads or forwards it. Three cases:

1. **Spreads rest props onto a host element** (`function Btn({label, ...rest}) { return <button {...rest}>... }`): adding `data-testid="..."` on the usage works. `editKind=static`.
2. **Known UI library with a documented hook** (below): use that hook. `editKind=prop-forward`.
3. **Doesn't forward** (no `...rest`, no documented prop): adding the attribute does nothing. Move to `manual_review` with the suggested fix (thread the prop through, or tag the nearest host element the component renders).

When unsure, check the component definition if it's in scope; otherwise treat as case 1 but flag it as low-confidence so the user sees it in the diff.

## UI library forwarding cheatsheet

| Component | How the test id reaches the DOM |
|---|---|
| **MUI `TextField`** | `data-testid` on `TextField` lands on the root wrapper. To tag the actual `<input>`, use `inputProps={{ 'data-testid': 'x-input' }}`. Prefer `inputProps` for form controls. |
| **MUI `Select`** | `inputProps={{ 'data-testid': 'x-select' }}` for the native input; `SelectDisplayProps={{ 'data-testid': 'x-select' }}` for the display box. |
| **MUI `MenuItem`** | `data-testid` forwards directly: `<MenuItem value="in" data-testid="country-option-in">`. |
| **MUI `Button`/`IconButton`** | `data-testid` forwards directly. |
| **Ant `Select`** | `data-testid` does not forward to the trigger; tag via a wrapper or `getPopupContainer`. Tag `Select.Option` is not supported directly — use `optionLabelProp`/render. Flag Ant `Select` for manual review unless a wrapper is acceptable. |
| **Ant `Input`/`Button`** | `data-testid` forwards directly. |
| **react-select** | Options are rendered internally. Use `classNamePrefix` for class hooks, or `components={{ Option }}` to inject `data-testid` per option. Trigger: wrap or use `id`. Flag for manual review with this note. |
| **Radix / shadcn `SelectItem`, `SelectTrigger`** | `data-testid` forwards directly (Radix spreads props). Safe. |
| **Headless UI `Listbox.Option`, `Combobox.Option`** | render-prop children; `data-testid` on the `Option` forwards via the rendered element. Safe in most setups. |
| **Chakra UI** | most components forward `data-testid` directly. |

When a library needs a non-attribute form (`inputProps`, `components`), record `editKind=prop-forward` and stage the precise edit; show it verbatim in the diff.

## Spread props on the usage site

If the element already has `{...props}` or `{...rest}`, it may already receive a `data-testid` from the parent. Add the attribute **after** the spread so an explicit value wins, but flag it: the parent might already pass one. `<input {...field} data-testid="x-input" />`.

## Edit mechanics

- Insert the attribute just before the tag close (`>` or `/>`), after the last existing attribute, matching indentation only if the tag is multiline.
- Use double quotes for static string values to match common JSX style unless the file clearly uses single quotes.
- Never reorder existing attributes or reformat the tag.
