# Verb contracts

Every verb takes a normalized input and returns a normalized output. The adapter file under `adapters/<tracker>/` implements the actual MCP tool calls.

Markdown bodies are the universal authoring format. The reserved token `@[userRef]` produces a mention; the adapter projects it to AzDO `<a data-vss-mention="...">` or a Jira mention as appropriate.

## Type aliases

```
IssueId       = string                  // "1234" or "PROJ-1234"; vendor-defined
UserRef       = opaque                  // returned by resolveUser; valid for assign/mention/comment
Issue         = {
  id, url, title, body, type, state, severity, assignee, reporter,
  created, updated, resolved, labels, parent, customFields, raw
}
Revision      = { at, by, field, from, to }
Comment       = { at, by, body, url }       // body is markdown
IssueSummary  = { id, url, title, state, type }
PRRef         = { url, title, state, mergedAt }
Sprint        = { id, name, start, end }    // or null
SprintItem    = {
  id, url, title, type, state, stateCategory,   // stateCategory ∈ {done, in_progress, todo, unknown}
  assignee, points, remainingWork, updated, labels,
  description                                    // plain-text snippet (HTML/markdown stripped, whitespace-collapsed, ≤500 chars); "" when the item has none
}
Capacity      = {
  totalCapacity: number,                        // team capacity across the iteration, in the tracker's unit
  committed: number|null,                       // sum of committed effort/points, when derivable
  perMember: [{ user, capacity }],
  daysOff: number
} // or null when the tracker has no capacity concept
```

## Reads

### `whoAmI()`
**In:** none
**Out:** `{ trackerUser: UserRef, defaultProject: string, defaultTeam: string|null }`
**Implements:** AzDO `core_list_projects` + `wit_my_work_items`; Jira `getAccessibleAtlassianResources` + `atlassianUserInfo`.

### `getIssue(id: IssueId)`
**Out:** `Issue` (body in markdown; `customFields` is an opaque map of vendor-specific keys for the caller's use)
**Implements:** AzDO `wit_get_work_item` with `expand: "all"`; Jira `getJiraIssue` with `responseContentFormat: "markdown"`.

### `getIssueHistory(id: IssueId)`
**Out:** `Revision[]` sorted oldest-first
**Implements:** AzDO derives from the work-item revision payload (`wit_get_work_item` already returns it); Jira not currently implemented — return empty array and log a warning.

### `getIssueComments(id: IssueId)`
**Out:** `Comment[]` sorted oldest-first, body in markdown
**Implements:** AzDO `wit_list_work_item_comments`; Jira inlines the `comment` field on `getJiraIssue`.

### `searchIssues(query: SearchQuery)`
```
SearchQuery = {
  keywords?: string,
  project?: string,
  scope?: string,            // AzDO area path; Jira component or label
  types?: string[],
  states?: string[],
  dateWindow?: { from?: ISO, to?: ISO },
  limit?: number             // default 25
}
```
**Out:** `IssueSummary[]`
**Implements:** AzDO `wit_query_by_wiql` (the adapter builds the WIQL); Jira `searchJiraIssuesUsingJql` (the adapter builds the JQL).

### `getIssueTypeSchema(type: string)`
**Out:** `{ fields: FieldSpec[], severityOptions: string[], requiredFields: string[] }`
**Implements:** AzDO `wit_get_work_item_type`; Jira `getJiraIssueTypeMetaWithFields`. Severity auto-discovery (`Severity Level` → `Severity` → `Bug Severity` → `priority`) happens here for Jira.

### `linkedPullRequests(id: IssueId, window?: { from?, to? })`
**Out:** `PRRef[]`
**Implements:** AzDO walks the `relations` array for `ArtifactLink`+`vstfs:///Git/PullRequestId/...` URLs, plus `repo_list_pull_requests_by_repo_or_project` filtered by branch-name mentioning `AB#<id>`; Jira walks `issuelinks` and any "remote links" plus PRs that smart-link to the issue key (queried via the Atlassian dev-status API if exposed, otherwise empty).

### `getCurrentSprint(team?: string)`
**Out:** `Sprint | null`
**Implements:** AzDO `work_list_team_iterations` with `timeframe: "current"`; Jira `searchJiraIssuesUsingJql` with `sprint in openSprints() AND project = <key>` then extract the sprint name from the first result.

### `getSprintItems(sprint?: Sprint, team?: string)`
**Out:** `SprintItem[]` — every work item assigned to the iteration, enriched with the fields needed for a status report.
**Implements:** see `adapters/<tracker>/sprint.md`.
- AzDO: `work_get_work_items_for_iteration` (item ids for the iteration) → `wit_get_work_items_batch_by_ids` with `expand: "all"` (details). `stateCategory` comes from the work-item-type category (`wit_get_work_item_type` → `states[].category`), overridden by `policy.state_categories` when the state is listed there.
- Jira: `searchJiraIssuesUsingJql` with `sprint = <sprint.id>` when a sprint is given, else `sprint in openSprints() AND project = <key>`. `stateCategory` comes from the status's `statusCategory` (`new`/`indeterminate`/`done` → `todo`/`in_progress`/`done`), overridden by `policy.state_categories`.

When `sprint` is omitted the adapter resolves the current sprint first (same logic as `getCurrentSprint(team)`). `points`/`remainingWork` are numbers or `null` when the tracker or item has no value (points-field resolution is documented per-adapter). Unmapped states resolve to `stateCategory: "unknown"`; the caller decides how to bucket them. `description` is a short plain-text snippet of the item's description/body (HTML or markdown stripped, whitespace collapsed, truncated to 500 chars) so the caller can render a brief per-ticket detail without a second fetch; it is `""` when the item has no description.

### `getTeamCapacity(team?: string, sprint?: Sprint)`
**Out:** `Capacity | null`
**Implements:** see `adapters/<tracker>/sprint.md`.
- AzDO: `work_get_team_capacity` (per-member capacity + days off) plus `work_get_iteration_capacities` for the iteration total. `sprint` defaults to the current iteration when omitted.
- Jira: no capacity concept in the core API — return `null`.

Callers must treat `null` as "capacity unavailable" and omit any capacity output, never error.

### `resolveUser(query: { email?: string, name?: string })`
**Out:** `UserRef` (opaque)
**Implements:** AzDO `core_get_identity_ids` or descriptor lookup; Jira `lookupJiraAccountId`. Caches per session.

### `mention(userRef: UserRef)`
**Out:** `string` — the inline mention token to embed in a markdown body
**Implements:** AzDO returns `<a href="#" data-vss-mention="version:2.0,<unique-name>">@Display Name</a>`; Jira returns a Jira mention token. The body-format converter is responsible for keeping these intact through the markdown subset.

## Writes (gated)

Every write call is built into a `{verb, target, before, after}` tuple, batched, and rendered through `references/diff-and-confirm.md`. The user confirms once per batch.

### `assign(id: IssueId, user: UserRef | null)`
**Implements:** AzDO `wit_update_work_item` with `path: "/fields/System.AssignedTo"`; Jira `editJiraIssue` with `fields.assignee.accountId` or `fields.assignee: null`.

### `transition(id: IssueId, abstractStateName: "investigating" | "waiting_reply" | "backlog" | ...)`
**Implements:** Adapter maps the abstract name through policy (`policy.states.investigating` etc.) to either:
- AzDO: `wit_update_work_item` patch on `/fields/System.State` (+ `/fields/System.Reason` when policy specifies one).
- Jira: `getTransitionsForJiraIssue` → look up transition by name → `transitionJiraIssue`.

### `updateFields(id: IssueId, fields: { title?, body?, severity?, dueDate?, sprint?, storyPoints?, customFields? })`
**Implements:** AzDO single `wit_update_work_item` with one `op: add` per field, paths drawn from `adapters/azure-devops/writes.md`. Jira one `editJiraIssue` call with `fields` and (separately, when needed) any custom-field side-writes documented in `adapters/jira/writes.md`. Body conversion to HTML / ADF happens here.

### `createIssue(input: { type, title, body, acceptanceCriteria?, labels?, priority?, project?, customFields? })`
**Out:** `{ id: IssueId, url: string }` — the new work item's vendor id and browser URL.
**In:**
- `type` — work-item type name (AzDO: `User Story`, `Bug`, ...; Jira: `Story`, `Bug`, ...). The caller passes the vendor-appropriate type.
- `title` — plain text.
- `body` — markdown; converted to the tracker body format (HTML / ADF) at write time, same path as `updateFields`.
- `acceptanceCriteria?` — markdown; written to the tracker's acceptance-criteria field when one exists (AzDO `Microsoft.VSTS.Common.AcceptanceCriteria`), otherwise appended to the body.
- `labels?` — tag/label strings (AzDO tags, Jira labels).
- `priority?` — abstract priority `P0 | P1 | P2`, mapped per adapter.
- `project?` — target project; defaults to `whoAmI().defaultProject`.
- `customFields?` — opaque map of vendor field ref-name → value for anything outside the named set.

**Implements:** AzDO `wit_create_work_item` (one JSON-Patch `op: add` per field). Jira `createJiraIssue`. The new work item is **standalone** — this verb adds no parent or related link. Body / acceptance-criteria conversion happens here.

### `addComment(id: IssueId, body: string)`
**Body is markdown.** Adapter converts.
**Implements:** AzDO `wit_add_work_item_comment` (HTML body); Jira `addCommentToJiraIssue` with `contentFormat: "adf"` and a JSON-stringified ADF document built from the markdown.

### `addLabel(id: IssueId, label: string)` / `removeLabel(id: IssueId, label: string)`
**Implements:** AzDO patches `/fields/System.Tags` (semicolon-delimited; adapter handles the append/remove logic); Jira `editJiraIssue` with `update.labels: [{ add: label }]` or `{ remove: label }`.

### `linkIssue(fromId: IssueId, toId: IssueId, kind: "duplicate-forward" | "related" | "parent")`
**Implements:** AzDO patches `/relations/-` with `rel` resolved through:
- `duplicate-forward` → `System.LinkTypes.Duplicate-Forward`
- `related` → `System.LinkTypes.Related`
- `parent` → `System.LinkTypes.Hierarchy-Reverse`

Jira `createIssueLink` with `link_type` resolved through:
- `duplicate-forward` → `Duplicate`
- `related` → `Relates`
- `parent` → uses `editJiraIssue` `fields.parent` (Jira treats parent as a field, not a link).

### `linkPullRequest(id: IssueId, prUrl: string)`
**Implements:**
- AzDO synthesizes `vstfs:///Git/PullRequestId/<projectId>%2F<repoId>%2F<prId>` from the URL and patches `/relations/-` with `rel: "ArtifactLink"`.
- Jira: no-op. Jira smart-links automatically when the PR description or branch name contains the issue key. The verb returns `linked: false, reason: "auto-link"` so the caller knows.

## Error handling

When a verb's underlying tool returns an error:

1. Reads: stop and tell the caller which call failed. Do not fabricate substitutes.
2. Writes: stop the batch on the first failure. Print which verb failed and what was written before it. Do not roll back successful writes — the user inspects the partial state and decides.

## Detection-time pre-checks

If `tracker == jira` and the policy requests AzDO-specific fields (`area_path_prefix`, `iteration_path_strategy`), warn once and ignore those keys. Same in reverse for `sprint_field_name`, `severity_field_name` when `tracker == azure-devops`.

`points_field_name` is Jira-only (AzDO uses the standard `Microsoft.VSTS.Scheduling.StoryPoints` field). If `tracker == azure-devops` and `points_field_name` is set, warn once and ignore it.
