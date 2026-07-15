# Azure DevOps — `getSprintItems` and `getTeamCapacity`

Implements the two sprint-read verbs from `references/verbs.md`.

## `getSprintItems(sprint?, team?)`

### Steps

1. **Resolve the iteration.** If `sprint` is given, use its `id` (an AzDO iteration path or GUID). If omitted, call `work_list_team_iterations` with `timeframe: "current"` for `team` (default `defaultTeam` from `whoAmI`) and take the current iteration — same as `getCurrentSprint`.
2. **List the iteration's work items.** Call `wit_get_work_items_for_iteration(project, team, iterationId)`. It returns the item ids in the iteration (the sprint backlog).
3. **Fetch details in a batch.** Call `wit_get_work_items_batch_by_ids` with those ids and `$expand: "all"` (or the fields list below). Batch in chunks of 200 if the iteration is large.
4. **Normalize** each work item into a `SprintItem`.

### Field mapping

| SprintItem field | AzDO source |
|---|---|
| `id` | `System.Id` |
| `url` | `_links.html.href` (or synthesize `<orgUrl>/<project>/_workitems/edit/<id>`) |
| `title` | `System.Title` |
| `type` | `System.WorkItemType` |
| `state` | `System.State` |
| `assignee` | `System.AssignedTo.displayName` (null when unassigned) |
| `points` | `Microsoft.VSTS.Scheduling.StoryPoints` (Bug/PBI/User Story) — null when absent |
| `remainingWork` | `Microsoft.VSTS.Scheduling.RemainingWork` (Task) — null when absent |
| `updated` | `System.ChangedDate` |
| `labels` | `System.Tags` split on `; ` into an array (empty when unset) |
| `description` | `System.Description` → strip HTML tags, decode entities, collapse whitespace, truncate to 500 chars. `""` when the field is absent. |

Request `System.Description` in the `wit_get_work_items_batch_by_ids` field list (it is not
in the default set). Some work-item types (Task, Bug) carry the body in
`Microsoft.VSTS.TCM.ReproSteps` or `System.Description`; prefer `System.Description` and
fall back to repro steps for Bugs when `System.Description` is empty.

### `stateCategory` resolution

1. If `policy.state_categories` lists `state` under `done` / `in_progress` / `todo`, use that (case-insensitive match). This wins.
2. Otherwise derive from the work-item-type category. The item's state maps to one of the vendor categories via `wit_get_work_item_type(process, type).states[].category`:
   - `Completed`, `Resolved` → `done`
   - `InProgress` → `in_progress`
   - `Proposed` → `todo`
   - `Removed` → `done` (terminal; excluded from "remaining" but not "in progress" — the analyst treats `Removed` items as closed-out)
3. If neither resolves the state, set `stateCategory: "unknown"`. Cache the work-item-type category lookup per type per session (don't refetch for every item).

The unit for `points` is story points; `remainingWork` is hours. The analyst keeps them separate.

## `getTeamCapacity(team?, sprint?)`

1. Resolve the iteration as above (`sprint` or current).
2. Call `work_get_team_capacity(project, team, iterationId)` for per-member capacity and days off.
3. Call `work_get_iteration_capacities(project, iterationId)` for the iteration total when available.
4. Normalize to `Capacity`:
   - `totalCapacity` — sum of per-member `activities[].capacityPerDay × working days`, or the iteration-capacities total when the API returns one.
   - `perMember` — `[{ user: teamMember.displayName, capacity: <capacityPerDay summed across activities> }]`.
   - `daysOff` — team days off count from the capacity payload.
   - `committed` — null here; the analyst derives committed points from `getSprintItems` instead.

If the team has no capacity configured for the iteration, the tools return empty arrays. Return a `Capacity` with zeros rather than `null` (capacity *exists* on AzDO, it's just unset) — but if the capacity tools are entirely absent from the MCP surface, return `null`.

## Errors and limits

- If `wit_get_work_items_for_iteration` returns an error (e.g. team/iteration mismatch), surface it verbatim to the caller; do not fall back to a project-wide query.
- The batch fetch caps at 200 ids per call. Chunk and concatenate.
- Empty iteration → return `[]` (not an error). The caller renders a "no items" report.
