# Angular

Component templates: external `*.component.html` or inline `template:` strings. Tag elements in the template. Static `data-testid` works on native elements; Angular Material components need attribute-selector awareness.

## Native elements

```html
<input type="email" name="email" data-testid="login-email-input" />
<button (click)="submit()" data-testid="login-submit-button">Sign in</button>
<a [routerLink]="['/pricing']" data-testid="nav-pricing-link">Pricing</a>
```

## Native select + options

```html
<select [(ngModel)]="country" data-testid="country-select">
  <option value="in" data-testid="country-option-in">India</option>
</select>
```

## *ngFor loops

Bind the attribute so each row is unique. `editKind=dynamic`.

```html
<option
  *ngFor="let c of countries"
  [value]="c.code"
  [attr.data-testid]="'country-option-' + c.code"
>
  {{ c.label }}
</option>
```

Use `[attr.data-testid]="..."` for bound/dynamic values on native elements (this sets the real DOM attribute). A plain static `data-testid="literal"` is fine for constant values.

**Idempotency:** an element already carrying `[attr.data-testid]="..."` is already tagged. Treat it the same as a literal `data-testid="..."` match and skip it — never add a second, conflicting static attribute alongside a bound one. See the idempotency check in `element-catalog`'s `SKILL.md` ("Do not tag" and "Detection tactic for large scopes").

## Angular Material

| Component | How the test id reaches the DOM |
|---|---|
| **`mat-select`** | `data-testid="country-select"` on the `<mat-select>` element works (it's an attribute on the host). |
| **`mat-option`** | `data-testid="country-option-in"` on each `<mat-option>` works; for `*ngFor` options use `[attr.data-testid]`. |
| **`mat-form-field` / `matInput`** | put `data-testid` on the `<input matInput>` element, not the `mat-form-field` wrapper. |
| **`button mat-button` / `mat-icon-button`** | `data-testid` on the `<button>` works. |
| **`mat-checkbox`, `mat-radio-button`, `mat-slide-toggle`** | `data-testid` on the component host works for selecting the wrapper; to hit the inner input, bind `[attr.data-testid]` on the host (Material forwards host attributes to the wrapper, not the input — note this for strict selectors). |

## Edit mechanics

- For dynamic values use `[attr.data-testid]="expr"`; for constants use `data-testid="literal"`.
- Don't convert an existing static attribute to a binding or vice versa.
- Inline `template:` strings: edit inside the backtick/quote block, preserving the string delimiter.
