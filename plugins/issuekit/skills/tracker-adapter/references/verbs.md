# Verb contracts

Every verb takes a normalized input and returns a normalized output. The adapter file under `adapters/<tracker>/` implements the actual MCP tool calls.

Markdown bodies are the universal authoring format. The reserved token `@[userRef]` produces a mention; the adapter projects it to AzDO `<a data-vss-mention="...">` or a Jira mention as appropriate.

## Type aliases

```
IssueId       = string                  // "1234" or "PROJ-1234"; vendor-defined
UserRef       = opaque                  // returned by resolveUser; valid for assign/mention/comment
Issue         = {
  id, url, title, body, type, state, severity, assignee, reporter,
  created, updated, resolved, closed, labels, parent, customFields, raw
}
// `closed` is distinct from `resolved`: on AzDO some work-item types (e.g. Task)
// can transition straight to a closed-category state without ever populating a
// Resolved-category date, so `resolved` alone can be absent on a genuinely closed
// item. Jira has no equivalent second date; `closed` is always absent there and
// `resolved` already covers it. Callers that need "when did this finish" should
// check `resolved` first and fall back to `closed`, never rely on `resolved` alone.
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

Every AzDO tool name below is the **classic** shape; a session may instead have the
**consolidated** shape resolved (see `adapters/azure-devops/tools.md` and
`references/detection.md` § Resolving which tool-name shape to call), in which case
the adapter dispatches the same verb through that shape's tool and `action`
argument instead. This file names the classic tool for readability; it is never the
only implementation.

### `whoAmI()`
**In:** none
**Out:** `{ trackerUser: UserRef, defaultProject: string, defaultTeam: string|null, email: string|null }`
**Implements:** AzDO `core_list_projects` + `wit_my_work_items` (or `wit_work_item` action `"my"`); Jira `getAccessibleAtlassianResources` + `atlassianUserInfo`.

`email` is best-effort: Jira's `atlassianUserInfo` returns `emailAddress` directly, so
it is populated there whenever the API exposes one. AzDO's identity lookup returns a
`mail`-equivalent field only when the organization's directory exposes it; `null`
otherwise. A caller that needs to resolve the running user's own **chat** identity
(for example, a default self-DM target) passes this `email` to `resolveChatUser`
below; when `email` is `null`, treat self chat-target resolution as unavailable, the
same as any other `resolveChatUser` miss.

### `getIssue(id: IssueId, fields?: string[])`
**Out:** `Issue` (body in markdown; `customFields` is an opaque map of vendor-specific keys for the caller's use)
**Implements:** AzDO `wit_get_work_item` with `expand: "all"` (or `wit_work_item` action `"get"`); Jira `getJiraIssue` with `responseContentFormat: "markdown"`.

`fields` is optional and additive: omit it and the call is unchanged (full fetch, as
above). When given, it names `Issue` property keys (e.g. `["title", "body",
"labels", "updated", "resolved"]`, never vendor field names) and the adapter fetches
only those, plus `id` and `url` which are always present. AzDO switches from
`expand: "all"` to the tool's `fields` array, mapped through the abstract-to-vendor
table in `adapters/azure-devops/tools.md`; Jira passes a narrower `fields` list to
`getJiraIssue` the same way. Properties outside the requested set come back
`undefined`, not `null` — a caller that narrowed the fetch must not read them. Use
this when a caller only needs a handful of properties across many items; it is the
main lever on payload size, since the default full fetch includes identity objects,
relations, and links most callers never use.

### `getIssuesBatch(ids: IssueId[], fields?: string[])`
**Out:** `Issue[]`, one entry per id that resolved; ids that fail to resolve are
omitted rather than erroring the whole batch. The caller diffs the returned ids
against the requested ones to find failures, the same pattern
`ticket-summarizer`'s `unresolved_refs` already uses for single fetches.
**In:** `fields` behaves exactly as in `getIssue`.
**Implements:**
- AzDO: `wit_work_item`'s `get_batch` action (all ids in one call), `fields` passed
  through the same way as `getIssue`. This is the same tool `getSprintItems` already
  uses for its own batch fetch.
- Jira has no native multi-id detail fetch. Best effort: build a `key in (<ids>)` JQL
  and call `searchJiraIssuesUsingJql` with an explicit `fields` list wide enough to
  populate the requested `Issue` properties in one call. If the search tool cannot
  return the needed fields (older Atlassian MCP versions), fall back to one
  `getIssue` call per id and warn once that Jira batching degraded to sequential
  calls this session.

Prefer this over N calls to `getIssue` whenever the caller already has more than a
couple of ids to fetch (e.g. after `searchIssues`). Round-trip count, not just
per-item payload size, is the dominant cost driver for many-item fetches.

### `getIssueHistory(id: IssueId)`
**Out:** `Revision[]` sorted oldest-first
**Implements:** AzDO derives from the work-item revision payload (`wit_get_work_item` already returns it on the classic shape). The consolidated shape has no revisions-via-expand equivalent; it exposes them only through `wit_work_item` action `"list_revisions"`, a separate call. Jira not currently implemented — return empty array and log a warning.

### `getIssueComments(id: IssueId)`
**Out:** `Comment[]` sorted oldest-first, body in markdown
**Implements:** AzDO `wit_list_work_item_comments` (or `wit_work_item` action `"list_comments"`); Jira inlines the `comment` field on `getJiraIssue`.

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
**Implements:** AzDO `wit_query_by_wiql` (or `wit_query` action `"wiql"`; the adapter builds the WIQL either way); Jira `searchJiraIssuesUsingJql` (the adapter builds the JQL).

`SearchQuery` deliberately has no `tags` parameter. A tag/label filter cannot be
pushed into either tracker's search reliably: AzDO's WIQL `CONTAINS` on
`System.Tags` matches whole tag tokens, not substrings within a multi-word tag (a
tag like `"ECW Bug"` will not match `CONTAINS 'ECW'`, only a standalone `"ECW"` tag
would), and Jira's `labels in (...)` is exact-match only. Callers that need
substring tag matching must always filter client-side against the fetched
`Issue.labels`, on every tracker, unconditionally; there is no fetch-volume
optimization available here that preserves the substring semantic.

### `getIssueTypeSchema(type: string)`
**Out:** `{ fields: FieldSpec[], severityOptions: string[], requiredFields: string[] }`
**Implements:** AzDO `wit_get_work_item_type` (or `wit_work_item` action `"get_type"`); Jira `getJiraIssueTypeMetaWithFields`. Severity auto-discovery (`Severity Level` → `Severity` → `Bug Severity` → `priority`) happens here for Jira.

### `linkedPullRequests(id: IssueId, window?: { from?, to? })`
**Out:** `PRRef[]`
**Implements:** AzDO walks the `relations` array for `ArtifactLink`+`vstfs:///Git/PullRequestId/...` URLs, plus `repo_list_pull_requests_by_repo_or_project` (or `repo_pull_request` action `"list"`) filtered by branch-name mentioning `AB#<id>`; Jira walks `issuelinks` and any "remote links" plus PRs that smart-link to the issue key (queried via the Atlassian dev-status API if exposed, otherwise empty).

### `getCurrentSprint(team?: string)`
**Out:** `Sprint | null`
**Implements:** AzDO `work_list_team_iterations` with `timeframe: "current"` (or `work` action `"list_team_iterations"`); Jira `searchJiraIssuesUsingJql` with `sprint in openSprints() AND project = <key>` then extract the sprint name from the first result.

### `getSprintItems(sprint?: Sprint, team?: string)`
**Out:** `SprintItem[]` — every work item assigned to the iteration, enriched with the fields needed for a status report.
**Implements:** see `adapters/<tracker>/sprint.md`.
- AzDO: `wit_get_work_items_for_iteration` (item ids for the iteration; or `wit_work_item` action `"list_for_iteration"`) → `wit_get_work_items_batch_by_ids` with `expand: "all"` (or `wit_work_item` action `"get_batch"` with an explicit `fields` list — the consolidated action has no expand-all equivalent) for details. `stateCategory` comes from the work-item-type category (`wit_get_work_item_type` → `states[].category`, or `wit_work_item` action `"get_type"`), overridden by `policy.state_categories` when the state is listed there.
- Jira: `searchJiraIssuesUsingJql` with `sprint = <sprint.id>` when a sprint is given, else `sprint in openSprints() AND project = <key>`. `stateCategory` comes from the status's `statusCategory` (`new`/`indeterminate`/`done` → `todo`/`in_progress`/`done`), overridden by `policy.state_categories`.

When `sprint` is omitted the adapter resolves the current sprint first (same logic as `getCurrentSprint(team)`). `points`/`remainingWork` are numbers or `null` when the tracker or item has no value (points-field resolution is documented per-adapter). Unmapped states resolve to `stateCategory: "unknown"`; the caller decides how to bucket them. `description` is a short plain-text snippet of the item's description/body (HTML or markdown stripped, whitespace collapsed, truncated to 500 chars) so the caller can render a brief per-ticket detail without a second fetch; it is `""` when the item has no description.

### `getTeamCapacity(team?: string, sprint?: Sprint)`
**Out:** `Capacity | null`
**Implements:** see `adapters/<tracker>/sprint.md`.
- AzDO: `work_get_team_capacity` (or `work` action `"get_team_capacity"`; per-member capacity + days off) plus `work_get_iteration_capacities` (or `work` action `"get_iteration_capacities"`) for the iteration total. `sprint` defaults to the current iteration when omitted.
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

Every AzDO write below names `wit_update_work_item`/`wit_create_work_item`/
`wit_add_work_item_comment`, the classic shape. On the consolidated shape the same
patch/create/comment content goes through `wit_work_item_write` (`action:
"update"`/`"create"`) or `wit_work_item_comment_write` (`action: "add"`) instead —
see `adapters/azure-devops/writes.md` for the exact payload shape per action,
which is not a bare rename for `create` and `addComment` (flat `{name, value}`
fields instead of a JSON Patch document; a Markdown-by-default comment body).

### `assign(id: IssueId, user: UserRef | null)`
**Implements:** AzDO `wit_update_work_item` with `path: "/fields/System.AssignedTo"`; Jira `editJiraIssue` with `fields.assignee.accountId` or `fields.assignee: null`.

### `transition(id: IssueId, abstractStateName: "investigating" | "waiting_reply" | "backlog" | ...)`
**Implements:** Adapter maps the abstract name through policy (`policy.states.investigating` etc.) to either:
- AzDO: `wit_update_work_item` patch on `/fields/System.State` (+ `/fields/System.Reason` when policy specifies one).
- Jira: `getTransitionsForJiraIssue` → look up transition by name → `transitionJiraIssue`.

### `updateFields(id: IssueId, fields: { title?, body?, severity?, dueDate?, sprint?, storyPoints?, customFields? })`
**Implements:** AzDO single `wit_update_work_item` with one `op: add` per field, paths drawn from `adapters/azure-devops/writes.md`. Jira one `editJiraIssue` call with `fields` and (separately, when needed) any custom-field side-writes documented in `adapters/jira/writes.md`. Body conversion to HTML / ADF happens here.

### `createIssue(input: { type, title, body, acceptanceCriteria?, labels?, priority?, severity?, project?, customFields? })`
**Out:** `{ id: IssueId, url: string }` — the new work item's vendor id and browser URL.
**In:**
- `type` — work-item type name (AzDO: `User Story`, `Bug`, ...; Jira: `Story`, `Bug`, ...). The caller passes the vendor-appropriate type.
- `title` — plain text.
- `body` — markdown; converted to the tracker body format (HTML / ADF) at write time, same path as `updateFields`.
- `acceptanceCriteria?` — markdown; written to the tracker's acceptance-criteria field when one exists (AzDO `Microsoft.VSTS.Common.AcceptanceCriteria`), otherwise appended to the body.
- `labels?` — tag/label strings (AzDO tags, Jira labels).
- `priority?` — abstract priority `P0 | P1 | P2`, mapped per adapter.
- `severity?` — abstract severity tier `sev1 | sev2 | sev3 | sev4`, projected through `policy.severity_label_map` exactly as `updateFields` does. Callers that file bugs (the `bug-reporter` plugin) set severity at creation time so the work item lands with a real field value rather than severity described in the body. Ignored by types that have no severity field; the adapter warns once and drops it rather than failing the create.
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

## Chat (ungated)

Chat delivery is a separate concern from tracker reads/writes: it never touches the
tracker, so it never goes through the diff-and-confirm gate. Whether to ask the user
before sending is the calling verb-plugin's own responsibility (`ticket-summarizer`'s
Phase 4 always asks first, for example; `issue-triager`'s severity escalation does
not, since it is a configured, unconditional notification).

`chat`'s value (`slack`, `teams`, or `none`) comes from `references/detection.md`,
same as always; these two verbs only fire when `chat != none`.

```
ChatUserRef  = opaque   // returned by resolveChatUser; valid only as a sendMessage target
ChatTarget   = { kind: "user", ref: ChatUserRef } | { kind: "channel", value: string }
```

`ChatUserRef` is a **chat-platform** identity (a Slack or Teams user id), distinct
from `resolveUser`'s tracker `UserRef`. Never pass one where the other is expected: a
`ChatUserRef` is not valid for `assign`/`mention`/`comment`, and a tracker `UserRef` is
not valid as a `sendMessage` target.

### `resolveChatUser(query: { email?: string, name?: string })`
**Out:** `ChatUserRef | null` — `null` when no match is found. The caller treats a
miss as "unavailable," never as an error; see `adapters/<chat>/tools.md` for what
"no match" looks like per platform.
**Implements:** Slack `slack_search_users` (query by email, name as fallback); Teams:
see `adapters/teams/tools.md` — a live directory-search tool is not consistently
exposed across Microsoft 365/Graph MCP registrations, so this frequently resolves to
`null` there even for a real user.

### `sendMessage(target: ChatTarget, body: string)`
**Out:** `{ sent: true } | { sent: false, reason: string }`. A failure (no
send-capable tool detected for the resolved `chat` backend, target not found,
permission denied) is returned in-band, never thrown and never retried.
**Implements:** Slack `slack_send_message` — `target.kind == "user"` sends a DM to
the resolved user id; `target.kind == "channel"` sends to the given channel id/name.
Teams: see `adapters/teams/tools.md` — no send-capable tool is consistently exposed
in this marketplace's supported Microsoft 365/Graph MCP registrations; when one is
not present in the detected tool surface, return `{ sent: false, reason: "no
send-capable tool found for teams" }` rather than improvising a call against an
unrelated tool.

`body` is sent as markdown, as-is. No HTML/ADF conversion happens here;
`body-format.md` governs tracker bodies only, not chat messages.

`target.kind == "channel"`'s `value` is the same opaque channel/group reference
`policy.escalation.channel` already documents: a Slack `#channel-name` or channel id,
or a Teams channel/chat id.

## Error handling

When a verb's underlying tool returns an error:

1. Reads: stop and tell the caller which call failed. Do not fabricate substitutes.
2. Writes: stop the batch on the first failure. Print which verb failed and what was written before it. Do not roll back successful writes — the user inspects the partial state and decides.
3. Chat (`resolveChatUser`, `sendMessage`): never throw. `resolveChatUser` returns `null` on no match; `sendMessage` returns `{ sent: false, reason }` on any failure, including no send-capable tool being present for the detected `chat` backend. The caller reports the reason and does not retry.

## Detection-time pre-checks

If `tracker == jira` and the policy requests AzDO-specific fields (`area_path_prefix`, `iteration_path_strategy`), warn once and ignore those keys. Same in reverse for `sprint_field_name`, `severity_field_name` when `tracker == azure-devops`.

`points_field_name` is Jira-only (AzDO uses the standard `Microsoft.VSTS.Scheduling.StoryPoints` field). If `tracker == azure-devops` and `points_field_name` is set, warn once and ignore it.
