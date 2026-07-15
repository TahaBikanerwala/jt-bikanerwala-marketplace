# Naming rules and worked examples

Detailed transforms behind the `testid-namer` skill. Load when generating ids.

## Descriptor extraction, signal by signal

### 1. `id`
Use as-is after kebab normalization. `id="firstName"` → `first-name`. `id="user_email"` → `user-email`. Strip framework-generated suffixes that look like hashes (`id="email-:r3:"` → `email`).

### 2. `name`
Form control `name`. `name="email"` → `email`. `name="address.city"` → `address-city`. `name="items[0].qty"` → `items-qty` (drop array indices from the descriptor; the dynamic-list rule handles per-instance uniqueness).

### 3. Associated label
- `<label for="email">Email address</label>` linked to the control → `email-address`.
- A wrapping `<label>Email <input/></label>` → use the label's text minus the control.
- `aria-labelledby="lbl1"` → read the text of `#lbl1`.
Strip trailing punctuation and helper words: "Email address *" → `email-address`. "Choose a country:" → `country` (drop leading "choose a", "select", "enter", "your" — see stopwords).

### 4. `aria-label`
`aria-label="Close dialog"` → `close-dialog`. Best signal for icon-only buttons.

### 5. `placeholder`
`placeholder="Search products"` → `search-products`. Lower priority than label because placeholders are often sentences.

### 6. Visible text
Buttons, links, options, menu items. `<button>Add to cart</button>` → `add-to-cart`. Take the trimmed text node; ignore nested icon markup. Cap at ~4 words before applying length rules.

### 7. `value`
Radios and options without better signals. `<input type="radio" value="weekly">` → `weekly`. `<input type="submit" value="Save changes">` → `save-changes`.

### 8. Enclosing context only
No element-level signal at all (e.g. a bare `<button><Icon/></button>` with no aria-label and no text). Use the nearest form/section/component name + role + position: `checkout-form-button-2`. Mark **low-confidence**.

## Stopwords dropped from descriptors

Leading filler that adds no selector value: `the, a, an, please, select, choose, enter, your, click, pick, type`. Drop only when leading and when something remains. "Select country" → `country`. "Select all" → `select-all` (here "select" is the meaning, so keep it when dropping would empty or distort the descriptor — judgment call: if the remaining word is a generic quantifier like "all"/"none", keep the verb).

## Role-word de-duplication

If the descriptor's last word equals (or is a synonym of) the role word, don't append a duplicate:

- text "Submit" on a button → `submit-button` (good), not `submit-button-button`.
- text "Sign in" on a button → `sign-in-button` (the role word isn't present, so append).
- a `select` whose label is "Country select" → `country-select`, not `country-select-select`.

## Kebab normalization algorithm

1. Decompose accents, drop diacritics (`Ç`→`c`).
2. Insert separators at camelCase / PascalCase boundaries (`firstName`→`first name`).
3. Replace any run of non-alphanumeric chars with a single space.
4. Trim, lowercase, collapse spaces, join with `-`.
5. Drop leading stopwords (above).
6. Collapse repeated words (`email-email-input` → `email-input`).

## camelCase scheme

Run the kebab algorithm, then camel-join: first word lower, rest capitalized. `email-address-input` → `emailAddressInput`. The role suffix becomes the trailing camel segment.

## component-scoped scheme

`<ComponentName>__<kebab-descriptor>-<role>`. The scope segment is the component name in its original PascalCase; everything after `__` is kebab. `LoginForm__email-input`. Collisions across components can't happen by construction, so within-file dedup still applies only to the descriptor part.

## Length handling (maxLength, default 40)

Measure the full id. If over:
1. Keep scope and role intact.
2. From the descriptor, drop words from the middle keeping the first and last descriptor word (they carry the most meaning).
3. If still over, hard-truncate the descriptor at a word boundary under the limit.
Never cut a kebab segment mid-word into a fragment like `addre`.

## Worked examples

| Source | scopePrefix | Result |
|---|---|---|
| `<input type="email" name="email">` in `LoginForm` | auto | `login-form-email-input` |
| same | none | `email-input` |
| `<label for="pw">Password</label><input id="pw" type="password">` | none | `password-input` |
| `<button aria-label="Close dialog"><X/></button>` | none | `close-dialog-button` |
| `<button>Add to cart</button>` | none | `add-to-cart-button` |
| `<a href="/help">Need help?</a>` | none | `need-help-link` |
| `<select name="country">` + `<option value="in">India</option>` | none | `country-select`, `country-option-in` |
| MUI `<MenuItem value="us">United States</MenuItem>` under `country-select` | none | `country-option-us` |
| `<input type="radio" name="plan" value="weekly">` | none | `plan-weekly-radio` (name + value, since value alone is ambiguous across groups) |
| two `<button>Delete</button>` (user row, account row) | none | `delete-button` then `delete-button-2`, or better `delete-user-button` / `delete-account-button` if row context is readable |
| `{items.map(i => <li><button>Buy {i.name}</button></li>)}` | none | `` `buy-button-${i.id}` `` (dynamic, key-field) |
| icon-only `<button><Icon/></button>`, no label, in checkout | auto | `checkout-button-2` (low-confidence) |
| `<DatePicker name="startDate">` trigger input | none | `start-date-input` |
| its calendar day cell (mapped over the visible month) | none | `` `start-date-day-${format(day,'yyyy-MM-dd')}` `` (dynamic, keyed by ISO date) |
| its next-month arrow | none | `start-date-next-month` |
| MUI `Autocomplete` labelled "City", an option | none | input `city-input`, option `` `city-option-${o.id}` `` |
| multi-select "Tags", a selected chip's remove button | none | `` `tags-chip-${tag.id}-remove` `` (dynamic) |
| pagination page button | none | `` `results-page-${n}` ``; prev `results-prev-button` |
| OTP 6-box input, third box | none | `otp-2` (index is correct — boxes are positional) |
