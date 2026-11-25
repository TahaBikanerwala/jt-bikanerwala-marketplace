# Issue and pull request read verbs

Reads on single issues, search, type schema, pull requests and users. Types (`Issue`, `UserRef`, `Sprint`, ...) are in `references/verbs.md`.

## `getIssue(id: IssueId, fields?: string[])`
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

## `getIssuesBatch(ids: IssueId[], fields?: string[])`
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

## `getIssueHistory(id: IssueId)`
**Out:** `Revision[]` sorted oldest-first
**Implements:** AzDO derives from the work-item revision payload (`wit_get_work_item` already returns it on the classic shape). The consolidated shape has no revisions-via-expand equivalent; it exposes them only through `wit_work_item` action `"list_revisions"`, a separate call. Jira not currently implemented — return empty array and log a warning.

## `getIssueComments(id: IssueId)`
**Out:** `Comment[]` sorted oldest-first, body in markdown
**Implements:** AzDO `wit_list_work_item_comments` (or `wit_work_item` action `"list_comments"`); Jira inlines the `comment` field on `getJiraIssue`.

## `searchIssues(query: SearchQuery)`
```
SearchQuery = {
  keywords?: string,
  project?: string,
  scope?: string,            // AzDO area path; Jira component or label
  types?: string[],
  states?: string[],         // exact state names to include; no negation syntax
  excludeStates?: string[],  // exact state names to exclude (e.g. policy.state_categories.done)
  dateWindow?: { from?: ISO, to?: ISO },
  limit?: number             // default 25
}
```
**Out:** `IssueSummary[]`
**Implements:** AzDO `wit_query_by_wiql` (or `wit_query` action `"wiql"`; the adapter builds the WIQL either way); Jira `searchJiraIssuesUsingJql` (the adapter builds the JQL).

`states` and `excludeStates` take literal state names. A `!`-prefixed value is not a
negation; it matches a state literally named that and returns nothing. To search
"everything not closed", pass `excludeStates` with the tracker's closed state names
(`policy.state_categories.done` is the usual source).

`SearchQuery` deliberately has no `tags` parameter. A tag/label filter cannot be
pushed into either tracker's search reliably: AzDO's WIQL `CONTAINS` on
`System.Tags` matches whole tag tokens, not substrings within a multi-word tag (a
tag like `"ECW Bug"` will not match `CONTAINS 'ECW'`, only a standalone `"ECW"` tag
would), and Jira's `labels in (...)` is exact-match only. Callers that need
substring tag matching must always filter client-side against the fetched
`Issue.labels`, on every tracker, unconditionally; there is no fetch-volume
optimization available here that preserves the substring semantic.

## `getIssueTypeSchema(type: string)`
**In:** a work-item type name, never a project. There is no verb that lists a project's
types: a type is "not valid on the project" when this call errors or returns no fields.
**Out:** `{ fields: FieldSpec[], severityOptions: string[], requiredFields: string[] }`
**Implements:** AzDO `wit_get_work_item_type` (or `wit_work_item` action `"get_type"`); Jira `getJiraIssueTypeMetaWithFields`. Severity auto-discovery (`Severity Level` → `Severity` → `Bug Severity` → `priority`) happens here for Jira.

## `linkedPullRequests(id: IssueId, window?: { from?, to? })`
**Out:** `PRRef[]`
**Implements:** AzDO walks the `relations` array for `ArtifactLink`+`vstfs:///Git/PullRequestId/...` URLs, plus `repo_list_pull_requests_by_repo_or_project` (or `repo_pull_request` action `"list"`) filtered by branch-name mentioning `AB#<id>`; Jira walks `issuelinks` and any "remote links" plus PRs that smart-link to the issue key (queried via the Atlassian dev-status API if exposed, otherwise empty).

## `getPullRequest(ref: string)`
**In:** a PR URL, or `<repo>!<prId>` / a bare PR id when the repo is unambiguous in `defaultProject`.
**Out:** `PullRequest | null`
**Implements:**
- AzDO: fetch the PR (`repo_get_pull_request_by_id`, or `repo_pull_request` action `"get"`) with work-item refs included, then its changed files (`repo_list_pull_request_changes` / action `"list_changes"` against the latest iteration) and its review threads (`repo_list_pull_request_threads` / action `"list_threads"`). Skip system-generated threads (vote and policy updates) so `threads` carries human review comments only.
- Jira: returns `null`. Jira hosts no pull requests. Callers holding a GitHub or Bitbucket PR read it with that host's own CLI or MCP, then use the `workItemRefs` they parse from it with `getIssue`.

Read-only, ungated. Returns `null` (never throws) when the PR cannot be resolved, so a caller can fall back to another source. Pairs with `linkedPullRequests`: that verb goes ticket → PRs, this one goes PR → details plus the tickets it references.

## `resolveUser(query: { email?: string, name?: string })`
**Out:** `UserRef` (opaque)
**Implements:** AzDO `core_get_identity_ids` or descriptor lookup; Jira `lookupJiraAccountId`. Caches per session.

## `mention(userRef: UserRef)`
**Out:** `string` — the inline mention token to embed in a markdown body
**Implements:** AzDO returns `<a href="#" data-vss-mention="version:2.0,<unique-name>">@Display Name</a>`; Jira returns a Jira mention token. The body-format converter is responsible for keeping these intact through the markdown subset.
