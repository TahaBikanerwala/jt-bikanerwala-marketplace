# Rendering a scenario to a tracker Test Case

When the agent opts to create Test Case work items, each Gherkin scenario is rendered to a `createIssue` payload for the issuekit adapter. Everything below travels through the adapter's abstract verb surface — no MCP tool name is used here. The adapter converts markdown bodies and writes `customFields` verbatim.

## Mapping model

One `createIssue` per scenario (default `scenario_granularity: per-scenario-work-item`), or one per feature (`per-feature-work-item`). For a `Scenario Outline`, create one Test Case; the `Examples` rows become the parameter set inside the steps.

Common fields for every tracker:

- `type` = `test_case_work_item_type[<tracker>]` (default `Test Case` on Azure DevOps, `Test` on Jira).
- `title` = the scenario name (per-feature: the Feature name).
- `body` (markdown) = the full Gherkin scenario in a fenced ```gherkin block, preceded by a one-line trace: `Covers <source_label> — AC-<n>`.
- `acceptanceCriteria` (markdown) = the text of the source AC(s) this scenario verifies.
- `labels` = `[test_label]` (default `acceptance-test`).
- `project` = `target_project`.

Then a `linkIssue(newId, storyId, "related")` per created Test Case when `link_to_story` and the story came from the tracker. `related` is the portable link kind the verb surface exposes; note in the run summary that it stands in for a semantic "Tests / Tested-By" link (a future issuekit verb could make that precise).

## Azure DevOps — populate the Steps grid

A `Test Case` work item stores its runnable steps in `Microsoft.VSTS.TCM.Steps`, an XML field. Putting the Gherkin only in the description gives you prose, not a runnable case in Test Plans. Render the steps too and pass them via `customFields`:

```
customFields: {
  "Microsoft.VSTS.TCM.Steps": "<steps id=\"0\" last=\"N\">...</steps>"
}
```

### Steps XML shape

Each step is `<step type="ActionStep">` with two `<parameterizedString>` cells: index 0 = **Action**, index 1 = **Expected Result**. Cell content is HTML-escaped.

```xml
<steps id="0" last="3">
  <step id="2" type="ActionStep">
    <parameterizedString isformatted="true">&lt;DIV&gt;Given a shopper with a cart containing 1 item priced "$100.00"&lt;/DIV&gt;</parameterizedString>
    <parameterizedString isformatted="true">&lt;DIV&gt;&lt;/DIV&gt;</parameterizedString>
  </step>
  <step id="3" type="ActionStep">
    <parameterizedString isformatted="true">&lt;DIV&gt;When the shopper applies the code "SAVE20"&lt;/DIV&gt;</parameterizedString>
    <parameterizedString isformatted="true">&lt;DIV&gt;&lt;/DIV&gt;</parameterizedString>
  </step>
  <step id="4" type="ActionStep">
    <parameterizedString isformatted="true">&lt;DIV&gt;Verify the discount and total&lt;/DIV&gt;</parameterizedString>
    <parameterizedString isformatted="true">&lt;DIV&gt;Discount "20%" shown; total "$80.00"; "SAVE20" listed as applied&lt;/DIV&gt;</parameterizedString>
  </step>
</steps>
```

### Gherkin → steps rule

- `step id` values start at 2 and increment (1 is reserved by the tool); `last` = the final id used. `id="0"` on the root is fixed.
- **`Given`** → an Action step; Expected Result empty (setup, nothing to assert yet). Multiple `Given/And` may each be their own action step or be joined into one setup step — prefer one step per `Given` line for clarity.
- **`When`** → an Action step; Expected Result empty (the trigger).
- **`Then` (+ its `And`/`But`)** → fold into the *preceding* `When` step's Expected Result, or emit a dedicated "Verify" action step whose Expected Result lists every `Then`/`And` assertion. One `Then`-group = one expected-result cell so the tester sees all postconditions of the action together.
- Escape `<`, `>`, `&`, `"` in cell text. Wrap each cell's content in `<DIV>…</DIV>`.

### Scenario Outline on ADO

Two options — pick per project maturity:
- **Simple (default):** flatten each `Examples` row into its own trailing verification note, or create the Test Case with the outline in the description and a representative row in the steps. Keep the full table in the `body`.
- **Parameterised:** ADO supports shared/parameter data via `Microsoft.VSTS.TCM.LocalDataSource` (an XML dataset) with `@param` tokens in step cells. Use only when the team already runs parameterised Test Cases; otherwise the simple form is less brittle. Document which you used in the run summary.

## Jira — description-based

Core Jira has no native Test Case work item; test management comes from apps (Xray, Zephyr). Without one of those MCPs, the adapter creates the configured `type` (`Test` when Xray/Zephyr define it, else fall back to a type valid on the project) and folds the Gherkin into the description:

- `body` carries the fenced Gherkin scenario plus the `Covers … AC-n` trace line.
- `acceptanceCriteria` folds under an "Acceptance Criteria" heading (no standard Jira AC field).
- When Xray is present and exposes a Cucumber/Gherkin field via `customFields`, put the scenario there so Xray recognises it as a Cucumber test; otherwise the description is the source of truth.
- Link back to the story with `linkIssue(newId, storyId, "related")`.

`test_case_work_item_type["jira"]` is validated by this plugin before Phase 6 ever calls `createIssue`: call `issuekit:tracker-adapter`'s `getIssueTypeSchema` for `target_project`, and if the configured type isn't in the live list it returns, lazy-prompt the author (via `AskUserQuestion`) with that list before building the write. See `agents/acceptance-test-generator.md`'s Configuration section.

## Diff-and-confirm rendering

The batch is a list of `createIssue` (and trailing `linkIssue`) tuples. In the gate table:
- `before` = `(new)`; `After` = the Test Case type + scenario title, e.g. `"Redeem code — valid percentage" (Test Case, tags: acceptance-test)`.
- Abridge the fenced Gherkin `body` the way the gate abridges any long field. The Steps XML is machinery — summarise it as `+ N runnable steps` rather than dumping the XML into the table.
- Each `linkIssue` row: `→ AB#<story> (Related)`.

Nothing is created before the user confirms the gate.
