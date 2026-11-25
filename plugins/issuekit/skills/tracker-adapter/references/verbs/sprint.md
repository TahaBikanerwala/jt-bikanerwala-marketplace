# Sprint read verbs

Current sprint, sprint lookup, sprint items and team capacity. Types (`Issue`, `UserRef`, `Sprint`, ...) are in `references/verbs.md`.

## `getCurrentSprint(team?: string)`
**Out:** `Sprint | null`
**Implements:** AzDO `work_list_team_iterations` with `timeframe: "current"` (or `work` action `"list_team_iterations"`); Jira `searchJiraIssuesUsingJql` with `sprint in openSprints() AND project = <key>`, then read the sprint custom field on the first result and take the entry whose state is active: `id` (numeric), `name`, `startDate` → `start`, `endDate` → `end`.

## `findSprint(nameOrId: string, team?: string)`
**Out:** `Sprint | null` — the sprint whose `id` or `name` matches, case-insensitively. `null` when nothing matches; never a guess at the nearest name.
**Implements:** see `adapters/<tracker>/sprint.md`.
- AzDO: `work_list_team_iterations` with no `timeframe` (or `work` action `"list_team_iterations"`), matched against each iteration's id, path and name.
- Jira: `searchJiraIssuesUsingJql` with `sprint = "<name>"` (or the bare number for a numeric id) `AND project = <key>`, one result; read the matching entry of the sprint custom field. A sprint with no issues cannot be found this way and resolves to `null`.

Use this to turn a user-supplied sprint name into the `Sprint` that `getSprintItems` and `getTeamCapacity` take. It is the only way to select a non-current sprint.

## `getSprintItems(sprint?: Sprint, team?: string)`
**In:** `sprint` is a `Sprint` object (from `getCurrentSprint` or `findSprint`), never a bare name.
**Out:** `SprintItem[]` — every work item assigned to the iteration, enriched with the fields needed for a status report.
**Implements:** see `adapters/<tracker>/sprint.md`.
- AzDO: `wit_get_work_items_for_iteration` (item ids for the iteration; or `wit_work_item` action `"list_for_iteration"`) → `wit_get_work_items_batch_by_ids` with `expand: "all"` (or `wit_work_item` action `"get_batch"` with an explicit `fields` list — the consolidated action has no expand-all equivalent) for details. `stateCategory` comes from the work-item-type category (`wit_get_work_item_type` → `states[].category`, or `wit_work_item` action `"get_type"`), overridden by `policy.state_categories` when the state is listed there.
- Jira: `searchJiraIssuesUsingJql` with `sprint = <sprint.id>` when a sprint is given, else `sprint in openSprints() AND project = <key>`. `stateCategory` comes from the status's `statusCategory` (`new`/`indeterminate`/`done` → `todo`/`in_progress`/`done`), overridden by `policy.state_categories`.

When `sprint` is omitted the adapter resolves the current sprint first (same logic as `getCurrentSprint(team)`). `points`/`remainingWork` are numbers or `null` when the tracker or item has no value (points-field resolution is documented per-adapter). Unmapped states resolve to `stateCategory: "unknown"`; the caller decides how to bucket them. `description` is a short plain-text snippet of the item's description/body (HTML or markdown stripped, whitespace collapsed, truncated to 500 chars) so the caller can render a brief per-ticket detail without a second fetch; it is `""` when the item has no description.

## `getTeamCapacity(team?: string, sprint?: Sprint)`
**Out:** `Capacity | null`
**Implements:** see `adapters/<tracker>/sprint.md`.
- AzDO: `work_get_team_capacity` (or `work` action `"get_team_capacity"`; per-member capacity + days off) plus `work_get_iteration_capacities` (or `work` action `"get_iteration_capacities"`) for the iteration total. `sprint` defaults to the current iteration when omitted.
- Jira: no capacity concept in the core API — return `null`.

Callers must treat `null` as "capacity unavailable" and omit any capacity output, never error.
