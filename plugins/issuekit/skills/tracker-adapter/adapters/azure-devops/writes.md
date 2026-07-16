# Azure DevOps — write payloads

Every write verb maps to `wit_update_work_item` with a JSON Patch document, except `addComment` which uses `wit_add_work_item_comment`.

## JSON Patch shape

```json
[
  { "op": "add", "path": "/fields/<reference-name>", "value": <new-value> },
  ...
]
```

Multiple operations in a single document are atomic. The adapter batches related writes into one call when possible.

## `assign(id, userRef | null)`

```json
[
  { "op": "add", "path": "/fields/System.AssignedTo", "value": "<descriptor>" }
]
```

Unassign by writing the empty string `""` (not `null`). Some AzDO MCP servers reject `null`.

## `transition(id, abstractStateName)`

Look up `policy.states.<abstractStateName>` to get the vendor-side state. If the policy value includes a reason (e.g. `"Active; Reason: Investigating"`), patch both `System.State` and `System.Reason`:

```json
[
  { "op": "add", "path": "/fields/System.State",  "value": "Active" },
  { "op": "add", "path": "/fields/System.Reason", "value": "Investigating" }
]
```

If the policy value is bare (e.g. `"Active"`), patch only `System.State`.

## `updateFields(id, { title?, body?, severity?, dueDate?, sprint?, storyPoints?, customFields? })`

Build one patch document with one operation per supplied field. Field-name mapping:

| Input field | AzDO path | Value transform |
|---|---|---|
| `title` | `/fields/System.Title` | as-is (plain text) |
| `body` | `/fields/System.Description` | convert markdown → HTML via `body-format.md` |
| `severity` | `/fields/Microsoft.VSTS.Common.Severity` | project `severity_label_map[<abstractTier>]` |
| `dueDate` | `/fields/Microsoft.VSTS.Scheduling.DueDate` | ISO-8601 string |
| `sprint` | `/fields/System.IterationPath` | the sprint's iteration path (e.g. `"MyProject\\Sprint 42"`) |
| `storyPoints` | `/fields/Microsoft.VSTS.Scheduling.StoryPoints` | numeric |
| `customFields[<refName>]` | `/fields/<refName>` | as-is |

## `createIssue({ type, title, body, acceptanceCriteria?, labels?, priority?, project?, customFields? })`

Call `wit_create_work_item` with the work-item `type` and a JSON-Patch document — one `op: add` per supplied field. The type goes in the tool's own `workItemType` argument, not in the patch; the patch carries only `/fields/*`:

| Input field | AzDO path | Value transform |
|---|---|---|
| `title` | `/fields/System.Title` | as-is (plain text) |
| `body` | `/fields/System.Description` | convert markdown → HTML via `body-format.md` |
| `acceptanceCriteria` | `/fields/Microsoft.VSTS.Common.AcceptanceCriteria` | convert markdown → HTML via `body-format.md` |
| `labels` | `/fields/System.Tags` | join with `; ` (semicolon-delimited string) |
| `priority` | `/fields/Microsoft.VSTS.Common.Priority` | `P0 → 1`, `P1 → 2`, `P2 → 3` |
| `customFields[<refName>]` | `/fields/<refName>` | as-is |

Target the caller's `project` (default `whoAmI().defaultProject`). Add **no** `/relations/-` entry — created items are standalone (no parent, no related link). On success, read `id` and the browser URL (`_links.html.href`) from the response and return `{ id, url }`.

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

## `addComment(id, body)`

```
wit_add_work_item_comment(workItemId: <id>, text: <html>)
```

Body is markdown; convert to safe HTML using the rules in `body-format.md` before the call.

## `addLabel(id, label)`

AzDO stores tags as a semicolon-delimited string on `System.Tags`. Read the current value, split on `; `, append, dedupe, re-join, patch:

```json
[
  { "op": "add", "path": "/fields/System.Tags", "value": "<existing>; <label>" }
]
```

`removeLabel` is the same flow with the matching token removed.

## `linkIssue(fromId, toId, kind)`

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

Kind map:

| `kind` | `rel` |
|---|---|
| `duplicate-forward` | `System.LinkTypes.Duplicate-Forward` |
| `related` | `System.LinkTypes.Related` |
| `parent` | `System.LinkTypes.Hierarchy-Reverse` |

## `linkPullRequest(id, prUrl)`

Parse the PR URL to extract `projectId`, `repoId`, `prId`. The MCP exposes `repo_get_pull_request_by_id` if the IDs are unknown; call it to resolve. Then synthesize the artifact-link URL and patch:

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

- **400 on patch:** usually a missing required field or an invalid state transition. Surface the error verbatim; do not retry.
- **403 on patch:** the running user lacks permission. Surface the error and the user's identity descriptor.
- **404 on patch:** the work item ID is wrong or in a different project. Confirm with `getIssue` before retrying.

Never retry a write call after a failure. Re-enter the diff-and-confirm gate.
