# Plain HTML

Static `.html` files and server-rendered templates (the markup portion of EJS, Handlebars, Jinja, ERB, Blade, Razor, etc.). The simplest case: insert the attribute literally into the opening tag.

```html
<!-- before -->
<input type="email" name="email">
<!-- after -->
<input type="email" name="email" data-testid="login-email-input">

<select name="country" data-testid="country-select">
  <option value="in" data-testid="country-option-in">India</option>
  <option value="us" data-testid="country-option-us">United States</option>
</select>

<button type="submit" data-testid="login-submit-button">Sign in</button>
<a href="/pricing" data-testid="nav-pricing-link">Pricing</a>
```

## Template loops

In server templates, options/rows are often generated in a loop. Tag the element inside the loop with a template expression in the host language so each instance is unique.

```html
<!-- Handlebars -->
<option value="{{code}}" data-testid="country-option-{{code}}">{{label}}</option>

<!-- Jinja / Nunjucks -->
<option value="{{ c.code }}" data-testid="country-option-{{ c.code }}">{{ c.label }}</option>

<!-- ERB -->
<option value="<%= c.code %>" data-testid="country-option-<%= c.code %>"><%= c.label %></option>
```

Use the loop variable's stable field (`code`, `id`, `slug`), not the loop index, when one exists.

## Edit mechanics

- Insert before the closing `>` of the opening tag, after the last attribute.
- Match the file's quote style (HTML defaults to double quotes).
- Self-closing void elements (`<input>`, `<br>`) may or may not have a trailing slash; preserve whatever the file uses.
- Don't touch the template-language control statements; only add the attribute to the rendered HTML tag.
