# Gherkin style reference

Canonical Gherkin, with the conventions this plugin holds to. Examples are illustrative; real content comes from the coverage model.

## Keyword order

```
Feature:              # once per file
  <narrative>         # free text: As a / I want / So that

  Background:         # optional, once; Given-only, shared by all scenarios
    Given ...

  Rule: <AC text>     # optional (Gherkin 6); groups scenarios under one criterion
    @tags
    Scenario: ...
      Given ...       # precondition / state
      When ...        # the single trigger
      Then ...        # observable outcome
      And ... / But ...

    Scenario Outline: ...
      When ... <param> ...
      Then ... <result> ...
      Examples:
        | param | result |
        | ...   | ...    |
```

Steps read top-to-bottom as one flow. `And`/`But` continue the previous `Given`/`When`/`Then`. Never lead a step with a bare verb — always a keyword.

## A worked feature

```gherkin
Feature: Redeem a discount code at checkout
  As a shopper
  I want to apply a discount code to my cart
  So that I pay the reduced price

  Background:
    Given a shopper with a cart containing 1 item priced "$100.00"

  Rule: A valid code applies its discount and is reflected in the total

    @smoke @AC-1
    Scenario: A valid percentage code reduces the total
      When the shopper applies the code "SAVE20"
      Then the discount "20%" is shown on the cart
      And the order total is "$80.00"
      And the code "SAVE20" is listed as applied

  Rule: Codes are validated before they apply

    @negative @AC-2
    Scenario Outline: Invalid codes are rejected with a reason
      When the shopper applies the code "<code>"
      Then the code is rejected with the message "<message>"
      And the order total remains "$100.00"

      Examples: format and existence
        | code       | message                          |
        |            | Enter a code                     |
        | save20     | Codes are uppercase              |
        | SAVE-20    | Codes are letters and numbers    |
        | UNKNOWN99  | That code is not recognised      |
        | EXPIRED10  | That code has expired            |

    @boundary @AC-2
    Scenario Outline: Code length is enforced at the boundaries
      When the shopper applies a "<length>"-character code
      Then the code is "<outcome>"

      Examples:
        | length | outcome  |
        | 5      | rejected |
        | 6      | accepted |
        | 10     | accepted |
        | 11     | rejected |

    @edge @AC-3
    Scenario: A second code replaces the first, it does not stack
      Given the shopper has already applied "SAVE20"
      When the shopper applies the code "SAVE30"
      Then only "SAVE30" is listed as applied
      And the order total is "$70.00"
```

Notes on what makes this good:
- Each `Scenario`/`Outline` sits under the `Rule:` (the AC) it verifies and carries an `@AC-n` tag — traceability is visible.
- The valid case asserts three related postconditions of one action (consolidated, not coupled).
- Two invalid dimensions (format/existence, and length) are two outlines, not one muddle — a failure points to the right rule.
- The stacking edge case is standalone because it's a distinct behavior.

## Backgrounds

- `Given`-only. Never put a `When` or `Then` in a `Background` — a background that asserts hides failures across every scenario.
- Only truly shared setup. If three of eight scenarios need it, it's not background; it's a `Given` in those three.
- Keep it short (≤4 steps). A long background usually means the feature is doing too much — consider splitting the file.

## Scenario Outline + Examples

- Every `<placeholder>` in the steps must have a matching column; every column should be used.
- Name `Examples` blocks when a scenario has several (`Examples: valid`, `Examples: invalid`) — it documents intent and lets some rows be tagged/filtered.
- Keep rows to one equivalence class or decision-table rule each. Don't smuggle unrelated cases into the same table.
- Put the *expected result* in the table too (`| input | result |`), so each row is a complete assertion.

## Data tables and doc strings

Data table (structured input or expected set):
```gherkin
When the following line items are in the cart:
  | product   | qty | unit price |
  | Widget    | 2   | $10.00     |
  | Gadget    | 1   | $25.00     |
Then the subtotal is "$45.00"
```

Doc string (multi-line payload):
```gherkin
When the API receives:
  """
  { "email": "a@b.com", "plan": "premium" }
  """
Then the response status is 201
```

## Step phrasing

- Third person, present tense, from the actor's point of view: `When the manager approves the request`.
- Declarative (intent) over imperative (mechanics) unless the mechanic is the behavior.
- One trigger per scenario. Two `When`s is a smell — usually two scenarios, or the first `When` is really a `Given`.
- Quote literal data (`"SAVE20"`, `"$80.00"`) so it's unambiguous and easy for step definitions to capture.
- Be consistent: the same concept uses the same wording every time, so step definitions stay DRY.

## Tag vocabulary

| Tag | Meaning |
|-----|---------|
| `@AC-<n>` | traces the scenario to acceptance criterion n |
| `@smoke` | critical path; a tiny always-run set |
| `@regression` | full-coverage set |
| `@negative` | error/rejection path |
| `@boundary` | boundary-value scenario |
| `@permissions` | authz/role scenario |
| `@security` | input-safety / auth scenario |
| `@i18n` | locale/timezone/encoding scenario |
| `@edge` | rare-but-specified case |
| `@inferred` | behavior implied by the AC, not stated — confirm with author |
| `@manual` | not automatable yet; filter out of automated runs |

Adopt the project's existing tags where `code_refs` reported them, rather than inventing parallel ones.

## Parse checklist

- One `Feature:` per file; narrative is free text below it.
- At most one `Background:`, `Given`-only.
- Keyword order within a scenario: `Given*` → `When` → `Then*`, `And`/`But` continuing the prior keyword.
- `Scenario Outline` has an `Examples:` block; placeholders ↔ columns match exactly.
- Tables are rectangular; `|` delimits every cell including leading/trailing.
- Tags sit on the line above the `Scenario`/`Rule`/`Feature` they annotate.
- File ends with a trailing newline.
