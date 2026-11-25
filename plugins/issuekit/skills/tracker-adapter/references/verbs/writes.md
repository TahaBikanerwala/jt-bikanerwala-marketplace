# Write verbs (gated)

Types are in `references/verbs.md`.


Every write call is built into a `{verb, target, before, after}` tuple, batched, and rendered through `references/diff-and-confirm.md`. The user confirms once per batch.

Every AzDO write below names `wit_update_work_item`/`wit_create_work_item`/
`wit_add_work_item_comment`, the classic shape. On the consolidated shape the same
patch/create/comment content goes through `wit_work_item_write` (`action:
"update"`/`"create"`) or `wit_work_item_comment_write` (`action: "add"`) instead —
see `adapters/azure-devops/writes.md` for the exact payload shape per action,
which is not a bare rename for `create` and `addComment` (flat `{name, value}`
fields instead of a JSON Patch document; a Markdown-by-default comment body).

## `assign(id: IssueId, user: UserRef | null)`
**Implements:** AzDO `wit_update_work_item` with `path: "/fields/System.AssignedTo"`; Jira `editJiraIssue` with `fields.assignee.accountId` or `fields.assignee: null`.

## `transition(id: IssueId, abstractStateName: "investigating" | "waiting_reply" | "backlog" | ...)`
**Implements:** Adapter maps the abstract name through policy (`policy.states.investigating` etc.) to either:
- AzDO: `wit_update_work_item` patch on `/fields/System.State` (+ `/fields/System.Reason` when policy specifies one).
- Jira: `getTransitionsForJiraIssue` → look up transition by name → `transitionJiraIssue`.

## `updateFields(id: IssueId, fields: { title?, body?, severity?, dueDate?, sprint?, storyPoints?, customFields? })`
`sprint` is a `Sprint` object: AzDO writes `sprint.id` as the iteration path; Jira writes the numeric `sprint.id`.
**Implements:** AzDO single `wit_update_work_item` with one `op: add` per field, paths drawn from `adapters/azure-devops/writes.md`. Jira one `editJiraIssue` call with `fields` and (separately, when needed) any custom-field side-writes documented in `adapters/jira/writes.md`. Body conversion to HTML / ADF happens here.

## `createIssue(input: { type, title, body, acceptanceCriteria?, labels?, priority?, severity?, project?, customFields? })`
**Out:** `{ id: IssueId, url: string }` — the new work item's vendor id and browser URL.
**In:**
- `type` — work-item type name (AzDO: `User Story`, `Bug`, ...; Jira: `Story`, `Bug`, ...). The caller passes the vendor-appropriate type.
- `title` — plain text.
- `body` — markdown; converted to the tracker body format (HTML / ADF) at write time, same path as `updateFields`.
- `acceptanceCriteria?` — markdown; written to the tracker's acceptance-criteria field when the target type has one (AzDO `Microsoft.VSTS.Common.AcceptanceCriteria`, checked against `getIssueTypeSchema(type).fields`; Jira `policy.acceptance_criteria_field`), otherwise appended to the body under an `## Acceptance Criteria` heading.
- `labels?` — tag/label strings (AzDO tags, Jira labels).
- `priority?` — abstract priority `P0 | P1 | P2`, mapped per adapter.
- `severity?` — abstract severity tier `sev1 | sev2 | sev3 | sev4`, projected through `policy.severity_label_map` exactly as `updateFields` does. Callers that file bugs (the `bug-reporter` plugin) set severity at creation time so the work item lands with a real field value rather than severity described in the body. Ignored by types that have no severity field; the adapter warns once and drops it rather than failing the create.
- `project?` — target project; defaults to `whoAmI().defaultProject`.
- `customFields?` — opaque map of vendor field ref-name → value for anything outside the named set.

**Implements:** AzDO `wit_create_work_item` (one JSON-Patch `op: add` per field). Jira `createJiraIssue`. The new work item is **standalone** — this verb adds no parent or related link. Body / acceptance-criteria conversion happens here.

## `addComment(id: IssueId, body: string)`
**Body is markdown.** Adapter converts.
**Implements:** AzDO `wit_add_work_item_comment` (HTML body); Jira `addCommentToJiraIssue` with `contentFormat: "adf"` and a JSON-stringified ADF document built from the markdown.

## `addLabel(id: IssueId, label: string)` / `removeLabel(id: IssueId, label: string)`
**Implements:** AzDO patches `/fields/System.Tags` (semicolon-delimited; adapter handles the append/remove logic); Jira `editJiraIssue` with `update.labels: [{ add: label }]` or `{ remove: label }`.

## `linkIssue(fromId: IssueId, toId: IssueId, kind: "duplicate-forward" | "related" | "parent")`
**Implements:** AzDO patches `/relations/-` with `rel` resolved through:
- `duplicate-forward` → `System.LinkTypes.Duplicate-Forward`
- `related` → `System.LinkTypes.Related`
- `parent` → `System.LinkTypes.Hierarchy-Reverse`

Jira `createIssueLink` with `link_type` resolved through:
- `duplicate-forward` → `Duplicate`
- `related` → `Relates`
- `parent` → uses `editJiraIssue` `fields.parent` (Jira treats parent as a field, not a link).

## `linkPullRequest(id: IssueId, prUrl: string)`
**Implements:**
- AzDO synthesizes `vstfs:///Git/PullRequestId/<projectId>%2F<repoId>%2F<prId>` from the URL and patches `/relations/-` with `rel: "ArtifactLink"`.
- Jira: no-op. Jira smart-links automatically when the PR description or branch name contains the issue key. The verb returns `linked: false, reason: "auto-link"` so the caller knows.
