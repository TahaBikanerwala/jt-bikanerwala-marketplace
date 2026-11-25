# Verb contracts

Every verb takes a normalized input and returns a normalized output. The adapter file under `adapters/<tracker>/` implements the actual MCP tool calls.

Markdown bodies are the universal authoring format. The reserved token `@[userRef]` produces a mention; the adapter projects it to AzDO `<a data-vss-mention="...">` or a Jira mention as appropriate.

## Type aliases

```
IssueId       = string                  // "1234" or "PROJ-1234"; vendor-defined
UserRef       = opaque                  // returned by resolveUser; valid for assign/mention/comment
Issue         = {
  id, url, title, body, acceptanceCriteria, type, state, severity, assignee, reporter,
  created, updated, resolved, closed, labels, parent, links, customFields, raw
}
// `acceptanceCriteria` is markdown, or null when the tracker or type has no
// acceptance-criteria field (AzDO: the standard field; Jira: the custom field named by
// `policy.acceptance_criteria_field`, else null, in which case any criteria live in `body`).
// `links` is `[{ id: IssueId, kind: "related" | "duplicate" | "child" | "other" }]`:
// the issue's links to other issues, excluding the parent (which is `parent`) and
// excluding pull requests (which are `linkedPullRequests`). Empty array when none.
// `closed` is distinct from `resolved`: on AzDO some work-item types (e.g. Task)
// can transition straight to a closed-category state without ever populating a
// Resolved-category date, so `resolved` alone can be absent on a genuinely closed
// item. Jira has no equivalent second date; `closed` is always absent there and
// `resolved` already covers it. Callers that need "when did this finish" should
// check `resolved` first and fall back to `closed`, never rely on `resolved` alone.
Revision      = { at, by, field, from, to }
// `field` is the abstract name (`state`, `assignee`, `title`, `points`, `sprint`,
// `labels`, `severity`) when the changed vendor field maps to one; otherwise the
// vendor's own field reference name. One `Revision` per changed field per revision.
Comment       = { at, by, body, url }       // body is markdown
IssueSummary  = { id, url, title, state, type }
PRRef         = { url, title, state, mergedAt }
PullRequest   = {
  url, id, title, body, state, isDraft, author,
  sourceBranch, targetBranch, createdAt, mergedAt, mergeCommit,
  files: [{ path, changeType }],            // add | edit | delete | rename
  threads: [{ by, at, body, status }],      // review comments, oldest-first; status = active | resolved | null
  workItemRefs: IssueId[]                   // work items the PR is linked to on the tracker side
}
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

## Where each verb lives

Read only the file for the verb you are about to call, never all of them.

| File | Verbs |
|---|---|
| `verbs/identity.md` | `whoAmI` (bootstrap; also `defaultProject`/`defaultTeam` resolution) |
| `verbs/issues.md` | `getIssue`, `getIssuesBatch`, `getIssueHistory`, `getIssueComments`, `searchIssues`, `getIssueTypeSchema`, `linkedPullRequests`, `getPullRequest`, `resolveUser`, `mention` |
| `verbs/sprint.md` | `getCurrentSprint`, `findSprint`, `getSprintItems`, `getTeamCapacity` |
| `verbs/writes.md` | `assign`, `transition`, `updateFields`, `createIssue`, `addComment`, `addLabel`, `removeLabel`, `linkIssue`, `linkPullRequest` |
| `verbs/chat.md` | `resolveChatUser`, `sendMessage` |

Every AzDO tool name in the `verbs/` files is the **classic** shape; a session may instead have the
**consolidated** shape resolved (see `adapters/azure-devops/tools.md` and
`references/detection.md` § Resolving which tool-name shape to call), in which case
the adapter dispatches the same verb through that shape's tool and `action`
argument instead. Those files name the classic tool for readability; it is never the
only implementation.

## Error handling

When a verb's underlying tool returns an error:

1. Reads: stop and tell the caller which call failed. Do not fabricate substitutes.
2. Writes: stop the batch on the first failure. Print which verb failed and what was written before it. Do not roll back successful writes — the user inspects the partial state and decides.
3. Chat (`resolveChatUser`, `sendMessage`): never throw. `resolveChatUser` returns `null` on no match; `sendMessage` returns `{ sent: false, reason }` on any failure, including no send-capable tool being present for the detected `chat` backend. The caller reports the reason and does not retry.

## Attachments (outside the verb surface)

There is no attachment verb. One caller uploads files to a work item: `qa-tester`'s
`evidence-attacher`, which attaches a defect's video, screenshots and logs to a bug that
`bug-reporter` has just created. It is a documented exception to "no invented verbs", on
these terms: it only ever targets a bug created in the same run; the files are listed by
name in the bug text, and `bug-reporter` prints that list at its diff-and-confirm gate, so
confirming the bug is the confirmation for its attachments; and it never edits fields,
comments or links. Any other plugin that needs attachments must add a gated verb here
rather than copy that path.

## Detection-time pre-checks

`points_field_name` is Jira-only (AzDO uses the standard `Microsoft.VSTS.Scheduling.StoryPoints` field). If `tracker == azure-devops` and `points_field_name` is set, warn once and ignore it.
