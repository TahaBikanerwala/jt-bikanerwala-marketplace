# Azure DevOps — tool allowlist

The adapter calls the tools below. Suffix-match against the available tool surface; prefix varies by which MCP is installed.

Two tool-name shapes exist for the same underlying AzDO capability, and a session
has exactly one of them, resolved once at detection time (see
`references/detection.md` § Resolving which tool-name shape to call): **Classic**
(one tool per operation) and **Consolidated** (a handful of multi-purpose tools
dispatched by an `action` argument — this is the shape the official Microsoft Azure
DevOps MCP server, commonly registered as `ado`, ships). Every table below lists
both; build the call for whichever `shape` detection resolved, never both, and never
switch shapes mid-session.

## Read tools

| Verb | Classic tool (suffix) | Consolidated tool (suffix) | Notes |
|---|---|---|---|
| `whoAmI` | `__core_list_projects`, `__wit_my_work_items` | `__core_list_projects`, `__wit_work_item` (`action: "my"`) | run both to confirm reachability and resolve identity |
| `getIssue` | `__wit_get_work_item` | `__wit_work_item` (`action: "get"`, `id`) | call with `expand: "all"`, or with `fields` (see below) when the caller narrowed the request; the consolidated tool rejects combining `fields` with `expand` on the same call, same as classic |
| `getIssuesBatch` | `__wit_get_work_items_batch_by_ids` | `__wit_work_item` (`action: "get_batch"`, `ids`) | all ids in one call; same `fields` narrowing as `getIssue` |
| `getIssueComments` | `__wit_list_work_item_comments` | `__wit_work_item` (`action: "list_comments"`, `workItemId`) | separate fetch even when `expand: "all"` was used |
| `getIssueHistory` | derived from `__wit_get_work_item` revisions | `__wit_work_item` (`action: "list_revisions"`, `workItemId`) | consolidated tool exposes revisions as its own action instead of an `expand` value |
| `searchIssues` | `__wit_query_by_wiql` | `__wit_query` (`action: "wiql"`, `wiql`) | adapter builds the WIQL — see `search.md` |
| `getIssueTypeSchema` | `__wit_get_work_item_type` | `__wit_work_item` (`action: "get_type"`, `workItemType`) | for severity option enums and required fields |
| `linkedPullRequests` | `__repo_list_pull_requests_by_repo_or_project`, plus walk `relations[]` from `__wit_get_work_item` | `__repo_pull_request` (`action: "list"`), plus walk `relations[]` from `__wit_work_item` (`action: "get"`) | combine both sources |
| `getCurrentSprint` | `__work_list_team_iterations` | `__work` (`action: "list_team_iterations"`) | `timeframe: "current"` on both |
| `getSprintItems` | `__wit_get_work_items_for_iteration`, `__wit_get_work_items_batch_by_ids`, `__wit_get_work_item_type` | `__wit_work_item` (`action: "list_for_iteration"`), `__wit_work_item` (`action: "get_batch"`), `__wit_work_item` (`action: "get_type"`) | iteration ids → batch details; type lookup for `stateCategory`. See `sprint.md` |
| `getTeamCapacity` | `__work_get_team_capacity`, `__work_get_iteration_capacities` | `__work` (`action: "get_team_capacity"`), `__work` (`action: "get_iteration_capacities"`) | returns zeros when unset; `null` only if the tools are absent |
| `resolveUser` | `__core_get_identity_ids` | `__core_get_identity_ids` | same tool name in both shapes; best-effort, returns the AzDO descriptor |

## Write tools

| Verb | Classic tool (suffix) | Consolidated tool (suffix) | Notes |
|---|---|---|---|
| `createIssue` | `__wit_create_work_item` | `__wit_work_item_write` (`action: "create"`, `workItemType`) | new work item; no `/relations/-`. Payload shape differs by tool — see `writes.md` |
| `assign` | `__wit_update_work_item` | `__wit_work_item_write` (`action: "update"`, `id`) | System.AssignedTo |
| `transition` | `__wit_update_work_item` | `__wit_work_item_write` (`action: "update"`, `id`) | System.State (and optionally System.Reason) |
| `updateFields` | `__wit_update_work_item` | `__wit_work_item_write` (`action: "update"`, `id`) | one operation per field |
| `addComment` | `__wit_add_work_item_comment` | `__wit_work_item_comment_write` (`action: "add"`, `workItemId`, `text`) | body format; see `writes.md` |
| `addLabel` / `removeLabel` | `__wit_update_work_item` | `__wit_work_item_write` (`action: "update"`, `id`) | System.Tags (semicolon-delimited string) |
| `linkIssue` | `__wit_update_work_item` | `__wit_work_item_write` (`action: "update"`, `id`) | `/relations/-` with `rel` from the kind map |
| `linkPullRequest` | `__wit_update_work_item` | `__wit_work_item_write` (`action: "update"`, `id`) | `/relations/-` with `rel: "ArtifactLink"` + `vstfs://` URL |

The consolidated write tool always takes a single `id`; it has no per-verb variant.
`writes.md` documents the payload shape for each action in detail — the consolidated
tool's `create` action takes flat `{name, value}` field entries, not a JSON Patch
document, which is a real shape difference from the classic tool, not just a rename.

## Abstract field names → AzDO fields

Used when a caller passes `fields` to `getIssue` or `getIssuesBatch`. `id` and `url`
come from the response envelope, not the `fields` array, and are always present
regardless of what was requested.

| Abstract `Issue` property | AzDO field reference name |
|---|---|
| `title` | `System.Title` |
| `body` | `System.Description` |
| `type` | `System.WorkItemType` |
| `state` | `System.State` |
| `assignee` | `System.AssignedTo` |
| `reporter` | `System.CreatedBy` |
| `created` | `System.CreatedDate` |
| `updated` | `System.ChangedDate` |
| `resolved` | `Microsoft.VSTS.Common.ResolvedDate` |
| `closed` | `Microsoft.VSTS.Common.ClosedDate` |
| `labels` | `System.Tags` |
| `parent` | derived from `relations[]` (`System.LinkTypes.Hierarchy-Reverse`), not a plain field |

`severity` and `customFields` have no fixed mapping (severity's field name varies by
process template; `customFields` is a catch-all). Requesting either falls back to a
full fetch for that call rather than a partial one.

`Microsoft.VSTS.Common.ResolvedDate` is populated when a work item passes through a
Resolved-category state. Some work-item types (commonly Task, on process templates
where its workflow has no Resolved state) transition directly from an in-progress
state to Closed and never populate it, even though `Microsoft.VSTS.Common.ClosedDate`
is set. A caller filtering "delivered/closed" items by `resolved` alone will silently
drop these; check `closed` too.

## Known prefix variants

The same tool surfaces under different prefixes depending on how the user registered the MCP server. Treat all of these as the same tool; the adapter matches on the suffix.

- `mcp__azure_devops__*`
- `mcp__ado__*`
- `mcp__plugin_<user-installed-name>__*`

Never hardcode the prefix in a verb-plugin prompt. The dispatcher resolves it once at detection time (see `references/detection.md` § Resolving which prefix to call — `azure_devops` preferred, `ado` as fallback, then any other registered name) and reuses that same literal prefix for every verb call in the session. If the resolved prefix doesn't expose a specific tool a verb needs, the dispatcher falls back to the next prefix in that order for that one call so the action still completes, instead of failing the verb.

Prefix and tool-name shape (Classic vs Consolidated, above) are resolved
separately and vary independently — a prefix match says nothing about which
column's tool names to use. See `references/detection.md` § Resolving which
tool-name shape to call for how the dispatcher picks the shape, cached alongside
the winning prefix.

## Optional tools (used when present)

These tools are not part of the verb surface but are called opportunistically by the verb-plugins when present:

- `__search_wiki` — used by the issue-investigator skill when `doc == azure-wiki`.
- `__teams_search_messages`, `__teams_read_thread` — used when `chat == teams`.

## Tools NOT used

The adapter does **not** call the following, even though they exist in the AzDO MCP surface:

- `__pipelines_*` — out of scope.
- `__advsec_*` — out of scope.

If a future verb needs one of these, add it explicitly to the verbs list, not as an inline tool call.
