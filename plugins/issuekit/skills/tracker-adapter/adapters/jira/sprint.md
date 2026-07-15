# Jira — `getSprintItems` and `getTeamCapacity`

Implements the two sprint-read verbs from `references/verbs.md`.

## `getSprintItems(sprint?, team?)`

### Steps

1. **Build the JQL.**
   - `sprint` given → `sprint = <sprint.id> ORDER BY rank ASC`.
   - `sprint` omitted → `sprint in openSprints() AND project = "<projectKey>" ORDER BY rank ASC`.
   The `team` argument is not a first-class Jira concept; ignore it unless the project maps teams to a component or label (then AND it in). `ORDER BY rank` preserves backlog order so the analyst's "up next" slide is meaningful.
2. **Query.** Call `searchJiraIssuesUsingJql` with the JQL and `maxResults` up to the MCP cap; page via `nextPageToken` when the sprint has more items than one page (see `search.md` limit handling).
3. **Normalize** each issue into a `SprintItem`.

### Field mapping

| SprintItem field | Jira source |
|---|---|
| `id` | `key` (e.g. `RLI-1234`) |
| `url` | `<siteUrl>/browse/<key>` |
| `title` | `fields.summary` |
| `type` | `fields.issuetype.name` |
| `state` | `fields.status.name` |
| `assignee` | `fields.assignee.displayName` (null when unassigned) |
| `points` | the story-points field — see resolution below; null when absent |
| `remainingWork` | `fields.timetracking.remainingEstimateSeconds / 3600` (hours) when present, else null |
| `updated` | `fields.updated` |
| `labels` | `fields.labels` (array; empty when unset) |
| `description` | `fields.description` → render to plain text (strip ADF/markdown markup), collapse whitespace, truncate to 500 chars. `""` when null. |

### Story-points field resolution

Jira story points live in a custom field whose id varies per site. Resolve once per session:

1. If `policy.points_field_name` is set, use the custom field whose name equals it (look up the id via `getJiraIssueTypeMetaWithFields` or the field list).
2. Otherwise auto-discover, same pattern as severity auto-discovery in `getIssueTypeSchema`: match a field named `Story Points`, then `Story point estimate`, then `Story Points estimate` (case-insensitive). Cache the resolved custom-field id for the session.
3. If none is found, `points` is `null` for every item and the analyst falls back to count-based progress. Append a one-line warning: `No story-points field found on this Jira project; progress computed by item count only.`

### `stateCategory` resolution

1. If `policy.state_categories` lists `state` under `done` / `in_progress` / `todo`, use that (case-insensitive). This wins.
2. Otherwise derive from `fields.status.statusCategory.key`:
   - `done` → `done`
   - `indeterminate` → `in_progress`
   - `new` → `todo`
3. If neither resolves, set `stateCategory: "unknown"`.

## `getTeamCapacity(team?, sprint?)`

Jira Software has no capacity concept in the core REST/MCP surface (capacity lives in third-party apps like Tempo, which this adapter does not depend on). **Return `null`.**

The caller must omit any capacity output when this verb returns `null`, never error.

## Errors and limits

- JQL parse errors: surface verbatim with the JQL string, per `search.md`.
- Empty sprint → return `[]`.
- If `sprint in openSprints()` matches more than one open sprint (multiple boards), the result spans all of them; the caller passes an explicit `sprint` to narrow.
