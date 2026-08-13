# Azure DevOps — write payloads

Every write verb maps to one write tool, resolved by the tool-name shape detection
cached for the session (see `references/detection.md` § Resolving which tool-name
shape to call):

- **Classic shape:** `wit_update_work_item` with a raw JSON Patch array, except
  `createIssue` (`wit_create_work_item`) and `addComment`
  (`wit_add_work_item_comment`).
- **Consolidated shape:** `wit_work_item_write` with an `action` argument
  (`create` | `update`), except `addComment` (`wit_work_item_comment_write`,
  `action: "add"`). There is no separate consolidated create tool — `createIssue`
  is `wit_work_item_write` with `action: "create"`.

The consolidated tool's payload shapes are genuinely different from a bare JSON
Patch array, not just a rename — read each section below before assuming the two
are interchangeable.

## Patch shape

Classic — a bare JSON Patch array, passed directly as the tool's own top-level input:

```json
[
  { "op": "add", "path": "/fields/<reference-name>", "value": <new-value> },
  ...
]
```

Consolidated — the same `{op, path, value}` triples, but wrapped under `updates` in
a call that also carries the target `id`; `op` defaults to `"add"` when omitted:

```
wit_work_item_write(
  action: "update",
  id: <id>,
  updates: [
    { "path": "/fields/<reference-name>", "value": <new-value> },
    ...
  ]
)
```

Multiple operations in a single call are atomic on both shapes. The adapter batches
related writes into one call when possible.

## `assign(id, userRef | null)`

Classic:

```json
[
  { "op": "add", "path": "/fields/System.AssignedTo", "value": "<descriptor>" }
]
```

Consolidated:

```
wit_work_item_write(action: "update", id: <id>, updates: [
  { "path": "/fields/System.AssignedTo", "value": "<descriptor>" }
])
```

Unassign by writing the empty string `""` (not `null`). Some AzDO MCP servers reject `null`.

## `transition(id, abstractStateName)`

Look up `policy.states.<abstractStateName>` to get the vendor-side state. If the policy value includes a reason (e.g. `"Active; Reason: Investigating"`), patch both `System.State` and `System.Reason`:

Classic:

```json
[
  { "op": "add", "path": "/fields/System.State",  "value": "Active" },
  { "op": "add", "path": "/fields/System.Reason", "value": "Investigating" }
]
```

Consolidated: the same two entries as `updates` in one `wit_work_item_write(action:
"update", id: <id>, updates: [...])` call.

If the policy value is bare (e.g. `"Active"`), patch only `System.State`.

## `updateFields(id, { title?, body?, severity?, dueDate?, sprint?, storyPoints?, customFields? })`

Build one operation per supplied field — a JSON Patch array on classic, an `updates`
array on consolidated; the field-name mapping and value transforms are identical on
both:

| Input field | AzDO path | Value transform |
|---|---|---|
| `title` | `/fields/System.Title` | as-is (plain text) |
| `body` | `/fields/System.Description` | convert markdown → HTML via `body-format.md` |
| `severity` | `/fields/Microsoft.VSTS.Common.Severity` | project `severity_label_map[<abstractTier>]` |
| `dueDate` | `/fields/Microsoft.VSTS.Scheduling.DueDate` | ISO-8601 string |
| `sprint` | `/fields/System.IterationPath` | the sprint's iteration path (e.g. `"MyProject\\Sprint 42"`) |
| `storyPoints` | `/fields/Microsoft.VSTS.Scheduling.StoryPoints` | numeric |
| `customFields[<refName>]` | `/fields/<refName>` | as-is |

`updates` entries have no per-entry format flag (unlike consolidated `create`'s
`fields`, below) — convert `body` to HTML before calling either shape's update tool.

## `createIssue({ type, title, body, acceptanceCriteria?, labels?, priority?, severity?, project?, customFields? })`

**Classic:** call `wit_create_work_item` with the work-item `type` and a JSON-Patch
document — one `op: add` per supplied field. The type goes in the tool's own
`workItemType` argument, not in the patch; the patch carries only `/fields/*`:

```
wit_create_work_item(
  project: "<project>",
  workItemType: "<type>",
  fields: [
    { "op": "add", "path": "/fields/System.Title", "value": "<title>" },
    { "op": "add", "path": "/fields/System.Description", "value": "<html>" },
    { "op": "add", "path": "/fields/Microsoft.VSTS.Common.AcceptanceCriteria", "value": "<html>" },
    { "op": "add", "path": "/fields/System.Tags", "value": "Draft" },
    { "op": "add", "path": "/fields/Microsoft.VSTS.Common.Priority", "value": 2 }
  ]
)
```

**Consolidated:** call `wit_work_item_write(action: "create", workItemType, project)`
with a `fields` array of flat `{name, value, format?}` entries — `name` is the bare
AzDO field reference name, not a `/fields/...` patch path, and there is no `op`:

```
wit_work_item_write(
  action: "create",
  project: "<project>",
  workItemType: "<type>",
  fields: [
    { "name": "System.Title", "value": "<title>" },
    { "name": "System.Description", "value": "<html or markdown>", "format": "Html" },
    { "name": "Microsoft.VSTS.Common.AcceptanceCriteria", "value": "<html or markdown>", "format": "Html" },
    { "name": "System.Tags", "value": "Draft" },
    { "name": "Microsoft.VSTS.Common.Priority", "value": 2 }
  ]
)
```

`fields[].format` (`Html` | `Markdown`) is optional per entry on the consolidated
tool and has no documented default — always pass it explicitly for any large-text
field (`body`, `acceptanceCriteria`, the repro/system-info custom fields below)
rather than relying on unspecified behavior. Passing `format: "Html"` after running
`body-format.md`'s markdown → HTML conversion, exactly as classic requires, is
always correct; `format: "Markdown"` (skip conversion) is also valid on the
consolidated tool but is not a valid option on classic, so use `Html` here unless a
verb-plugin has already special-cased the consolidated shape.

Field-name mapping (same on both shapes — only the envelope around `{name/path,
value}` differs):

| Input field | AzDO field / path | Value transform |
|---|---|---|
| `title` | `System.Title` | as-is (plain text) |
| `body` | `System.Description` | convert markdown → HTML via `body-format.md` |
| `acceptanceCriteria` | `Microsoft.VSTS.Common.AcceptanceCriteria` | convert markdown → HTML via `body-format.md` |
| `labels` | `System.Tags` | join with `; ` (semicolon-delimited string) |
| `priority` | `Microsoft.VSTS.Common.Priority` | `P0 → 1`, `P1 → 2`, `P2 → 3` |
| `severity` | `Microsoft.VSTS.Common.Severity` | project `severity_label_map[<abstractTier>]` |
| `customFields[<refName>]` | `<refName>` | as-is |

`Microsoft.VSTS.Common.Severity` exists on `Bug` in the Agile and CMMI templates and on `Impediment` in
Scrum. When the target type has no severity field (`User Story`, `Task`, `Basic/Issue`), drop the
operation, warn once, and let the create proceed. Never fail a create over a severity field.

A `Bug` in the Agile and CMMI templates keeps its reproduction detail in
`Microsoft.VSTS.TCM.ReproSteps` and its environment in `Microsoft.VSTS.TCM.SystemInfo` rather than in
`System.Description`. Callers that file bugs pass those through `customFields` (the `bug-reporter`
plugin resolves the field names from `policy.bug_repro_steps_field` and `policy.bug_system_info_field`);
both take HTML, so convert their markdown the same way as `body`.

Target the caller's `project` (default `whoAmI().defaultProject`) on both shapes.
Add **no** `/relations/-` entry (classic) or relation of any kind (consolidated) —
created items are standalone (no parent, no related link). On success, read `id`
and the browser URL (`_links.html.href`) from the response and return `{ id, url }`.

## `addComment(id, body)`

Classic — the body must already be HTML:

```
wit_add_work_item_comment(workItemId: <id>, text: <html>)
```

Body is markdown; convert to safe HTML using the rules in `body-format.md` before the call.

Consolidated — the tool defaults `format` to `Markdown`, so the raw markdown body
can be passed as-is, skipping the `body-format.md` conversion this verb otherwise
always requires:

```
wit_work_item_comment_write(action: "add", workItemId: <id>, text: <markdown>)
```

To keep both shapes' output byte-identical instead of relying on the shape
difference, convert to HTML and pass `format: "Html"` on the consolidated call too
— either is correct, but do not silently mix (converting for one shape and not the
other across otherwise-identical calls would produce inconsistent comment
rendering between sessions).

## `addLabel(id, label)`

AzDO stores tags as a semicolon-delimited string on `System.Tags`. Read the current value, split on `; `, append, dedupe, re-join, patch:

Classic:

```json
[
  { "op": "add", "path": "/fields/System.Tags", "value": "<existing>; <label>" }
]
```

Consolidated: the same entry as `updates` in a `wit_work_item_write(action: "update",
id: <id>, updates: [...])` call.

`removeLabel` is the same flow with the matching token removed.

## `linkIssue(fromId, toId, kind)`

Classic:

```json
[
  {
    "op": "add",
    "path": "/relations/-",
    "value": {
      "rel": "<rel-name>",
      "url": "https://dev.azure.com/<org>/_apis/wit/workItems/<toId>"
    }
  }
]
```

Consolidated: the same `path`/`value` pair as one entry in `updates`, on
`wit_work_item_write(action: "update", id: <fromId>, updates: [...])`.

Kind map:

| `kind` | `rel` |
|---|---|
| `duplicate-forward` | `System.LinkTypes.Duplicate-Forward` |
| `related` | `System.LinkTypes.Related` |
| `parent` | `System.LinkTypes.Hierarchy-Reverse` |

## `linkPullRequest(id, prUrl)`

Parse the PR URL to extract `projectId`, `repoId`, `prId`. If the IDs are unknown,
resolve them first:

- **Classic:** `repo_get_pull_request_by_id`.
- **Consolidated:** `repo_pull_request(action: "get", pullRequestId, repositoryId,
  project)`.

Then synthesize the artifact-link URL and patch — classic as a bare JSON Patch
array, consolidated as `updates` on `wit_work_item_write(action: "update", id:
<id>, ...)`:

```json
[
  {
    "op": "add",
    "path": "/relations/-",
    "value": {
      "rel": "ArtifactLink",
      "url": "vstfs:///Git/PullRequestId/<projectId>%2F<repoId>%2F<prId>",
      "attributes": { "name": "Pull Request" }
    }
  }
]
```

## Failure modes

- **400 on patch/update:** usually a missing required field or an invalid state transition. Surface the error verbatim; do not retry.
- **403 on patch/update:** the running user lacks permission. Surface the error and the user's identity descriptor.
- **404 on patch/update:** the work item ID is wrong or in a different project. Confirm with `getIssue` before retrying.

These apply the same way on both shapes; the consolidated tool surfaces the same
underlying AzDO REST errors, just through a different tool name.

Never retry a write call after a failure. Re-enter the diff-and-confirm gate.
