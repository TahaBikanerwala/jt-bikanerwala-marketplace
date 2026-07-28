# Policy schema

Path: `.claude/tracker-policy.json` (project-root). Optional. When absent, the adapter uses the shipped defaults below and lazy-prompts at the moment a missing key is needed.

## Shape

```json
{
  "states": {
    "investigating": "In Progress",
    "waiting_reply": "Waiting for Reply",
    "backlog": "Backlog"
  },
  "severity_scheme": {
    "sev1": { "due_offset_days": 1,  "escalate_immediately": true },
    "sev2": { "due_offset_days": 3,  "escalate_immediately": true },
    "sev3": { "due_offset_days": 7,  "escalate_immediately": false },
    "sev4": { "due_offset_days": 30, "escalate_immediately": false }
  },
  "severity_label_map": {
    "sev1": ["1 - Critical", "Sev-1", "Critical"],
    "sev2": ["2 - High",     "Sev-2", "High"],
    "sev3": ["3 - Medium",   "Sev-3", "Medium"],
    "sev4": ["4 - Low",      "Sev-4", "Low"]
  },
  "escalation": {
    "channel": null,
    "primary_contact": null,
    "fallback_contact": null
  },
  "skip_labels": ["triaged"],
  "triaged_label": "triaged",
  "output_directory": "./docs/postmortems/",
  "archetype_assignment_after_triage": {
    "Bug":       "unassign",
    "Incident":  "self",
    "Story":     "self",
    "Feature":   "self",
    "Task":      "self",
    "Spike":     "self"
  },
  "state_categories": {
    "done":        ["Done", "Closed", "Resolved"],
    "in_progress": ["Active", "Committed", "In Progress", "Doing", "In Review"],
    "todo":        ["New", "Approved", "To Do", "Open", "Backlog"]
  },
  "blocked_indicators": {
    "labels":       ["blocked", "impediment"],
    "states":       ["Blocked"],
    "board_column": null
  },
  "stale_after_days": 3,
  "points_field_name": null,
  "story_work_item_type": { "azure-devops": "User Story", "jira": "Story" },
  "draft_label": "Draft",
  "priority_label_map": { "P0": "Highest", "P1": "High", "P2": "Medium" },
  "acceptance_criteria_field": null,
  "bug_work_item_type": { "azure-devops": "Bug", "jira": "Bug" },
  "reported_label": "needs-triage",
  "bug_repro_steps_field": "Microsoft.VSTS.TCM.ReproSteps",
  "bug_system_info_field": "Microsoft.VSTS.TCM.SystemInfo"
}
```

All keys are optional. Missing keys fall back to defaults.

## Key reference

### `states` (object)

Maps abstract state names to the vendor-side state or transition name.

- **`investigating`** — the state set when triage begins. Examples: AzDO `"Active"` (Agile process), Jira `"Under Investigation"`, `"In Progress"`.
- **`waiting_reply`** — the state used when the agent needs information from the reporter. Examples: AzDO `"Active"` with `Reason: "Awaiting Customer"`, Jira `"Waiting for Reply"`.
- **`backlog`** — the state used when an issue should not be worked on yet.

The adapter looks the value up on the live state graph:
- **Jira:** calls `getTransitionsForJiraIssue` and finds the transition by name.
- **AzDO:** matches against the issue type's state list from `wit_get_work_item_type`; for `investigating`, the adapter also sets `System.Reason` based on a `Reason: "<value>"` suffix in the state string if present (e.g. `"Active; Reason: Investigating"`).

**Default if unset:** lazy-prompt. The adapter presents the list of valid transitions / states from the live schema and asks the user to pick.

### `severity_scheme` (object)

Maps abstract severity tiers (`sev1`..`sev4`) to SLA semantics.

- **`due_offset_days`** — number of days from today to set as the due date.
- **`escalate_immediately`** — boolean; if true, the verb-plugin pings the escalation channel as soon as severity is determined.

**Default if unset:** the shape above (1/3/7/30 days; sev1 and sev2 escalate). Lazy-prompt only the parts the user wants to override.

### `severity_label_map` (object)

Maps abstract severity tiers to the vendor-side label values. The adapter uses this to project `severity: "sev1"` (abstract) to the vendor's actual option value (`"1 - Critical"` for AzDO Agile, `"Sev-1"` for many Jira projects).

If unset, the adapter uses the default above. If the vendor schema (from `getIssueTypeSchema`) does not contain any of the listed values, it lazy-prompts the user with the schema's enum options.

### `escalation` (object)

- **`channel`** — opaque string the verb-plugin passes to the chat adapter's `sendMessage`. For Slack: a channel ID or `#name`. For Teams: a channel or chat ID.
- **`primary_contact`** — `{name, email}` of the on-call human. The adapter resolves to `UserRef` on demand via `resolveUser({email})`.
- **`fallback_contact`** — same shape as `primary_contact`.

**Default if unset:** the verb-plugin skips the escalation step and logs a one-time note.

### `skip_labels` (string[])

When an issue carries any of these labels, the triage agent declines to re-process it. Default: `["triaged"]`.

### `triaged_label` (string)

The label the triage agent appends after a successful run. Default: `"triaged"`.

### `output_directory` (string)

Where postmortems get saved when the user accepts the save prompt. Default: `"./docs/postmortems/"`.

### `archetype_assignment_after_triage` (object)

After triage finishes, who should be assigned to the issue. Per-archetype:
- `"self"` — the running user (the human who ran the agent).
- `"unassign"` — clear the assignee.
- `"keep"` — leave the assignee unchanged.

Default: shape above. Bugs get unassigned (because triage hands off to whoever picks them up). Everything else stays with the triager.

### `state_categories` (object)

Buckets vendor state names into the three report categories used by `getSprintItems` and the `sprint-status-report` plugin: `done`, `in_progress`, `todo`. Each value is a case-insensitive list of vendor state names.

Used only by sprint reads. When a state is not listed here, the adapter falls back to the vendor's own category signal (AzDO work-item-type `category`; Jira `statusCategory.key`). A state that matches neither becomes `stateCategory: "unknown"` and the consumer emits a one-line warning naming the unmapped state.

**Default if unset:** the shape above (covers the common Agile/Scrum/Basic AzDO states and the default Jira workflow). Because the vendor-category fallback already handles most states, this key is rarely lazy-prompted; prompt only if a sprint contains an `unknown` state the user must classify.

### `blocked_indicators` (object)

Signals that a sprint item is blocked. Match is OR across the three signals:

- **`labels`** — an item carrying any of these labels/tags is blocked.
- **`states`** — an item in any of these states is blocked.
- **`board_column`** — a board-column name that means blocked. Honored only where the tracker exposes board columns to the MCP; ignored otherwise.

**Default if unset:** `{ labels: ["blocked", "impediment"], states: ["Blocked"], board_column: null }`.

### `stale_after_days` (number)

An `in_progress` item whose last-updated date is older than this many days is flagged stale (at-risk) in the report. **Default:** `3`.

### `points_field_name` (string)

Jira-only override for the story-points custom-field name. When unset, the Jira adapter auto-discovers the field (`Story Points` → `Story point estimate`). Ignored on AzDO, which uses the standard `Microsoft.VSTS.Scheduling.StoryPoints` field. **Default:** `null` (auto-discover).

### `story_work_item_type` (object)

Used by `createIssue` (the `draft-stories` plugin) to choose which work-item type new stories are created as, per tracker. Keys are tracker names; values are the vendor type name.

- **`azure-devops`** — depends on the process template: `"User Story"` (Agile), `"Product Backlog Item"` (Scrum), `"Issue"` (Basic).
- **`jira`** — usually `"Story"`.

**Default if unset:** `{ "azure-devops": "User Story", "jira": "Story" }`. If the value is not a valid type on the project (checked against `getIssueTypeSchema`), the adapter lazy-prompts with the live type list.

### `draft_label` (string)

The tag/label applied to work items created by `draft-stories`, so they land in the team's draft queue for refinement. **Default:** `"Draft"`.

### `priority_label_map` (object)

Jira-only. Maps the abstract priority tiers (`P0`/`P1`/`P2`) to the vendor priority names for `createIssue`. AzDO ignores this — it writes the numeric `Microsoft.VSTS.Common.Priority` field (`P0 → 1`, `P1 → 2`, `P2 → 3`). **Default:** `{ "P0": "Highest", "P1": "High", "P2": "Medium" }`.

### `acceptance_criteria_field` (string)

Jira-only override naming a custom field that holds acceptance criteria. When unset, `createIssue` folds acceptance criteria into the description body under an `## Acceptance Criteria` heading (Jira has no standard AC field). AzDO always uses the standard `Microsoft.VSTS.Common.AcceptanceCriteria` field and ignores this key. **Default:** `null` (fold into description).

### `bug_work_item_type` (object)

Used by `createIssue` (the `bug-reporter` plugin) to choose which work-item type a filed bug is created as, per tracker. Keys are tracker names; values are the vendor type name.

- **`azure-devops`** — `"Bug"` in the Agile, Scrum, and CMMI templates; `"Issue"` in Basic (which has no Bug type).
- **`jira`** — usually `"Bug"`.

**Default if unset:** `{ "azure-devops": "Bug", "jira": "Bug" }`. If the value is not a valid type on the project (checked against `getIssueTypeSchema`), the adapter lazy-prompts with the live type list.

### `reported_label` (string)

The tag/label applied to a bug filed or refined by `bug-reporter`, marking it as reported but not yet triaged. Pairs with `skip_labels` and `triaged_label`: a bug carrying `reported_label` is waiting for `/issue-triage:run`. Set to `null` to apply no label. **Default:** `"needs-triage"`.

### `bug_repro_steps_field` (string)

Azure DevOps only. The field reproduction detail is written to on a Bug: preconditions, steps, expected behavior, actual behavior, and frequency. The Agile and CMMI Bug forms surface `Microsoft.VSTS.TCM.ReproSteps` as the main body, so writing that content into `System.Description` leaves the form looking empty.

Set to `null` to fold those sections into the description body instead. Ignored on Jira, which has no equivalent field; the adapter warns once and folds. **Default:** `"Microsoft.VSTS.TCM.ReproSteps"`.

### `bug_system_info_field` (string)

Azure DevOps only. The field environment detail is written to on a Bug (environment, versions, browser and OS, device, tenant, region). Set to `null` to fold it into the description body instead. Ignored on Jira. **Default:** `"Microsoft.VSTS.TCM.SystemInfo"`.

## Lazy-prompt question text

When a missing key is encountered, ask via `AskUserQuestion` using these question templates:

| Missing key | Question | Options |
|---|---|---|
| `states.investigating` | "Which state means 'investigation is underway' on this tracker?" | live list from schema |
| `states.waiting_reply` | "Which state means 'waiting on reporter for more info'?" | live list from schema |
| `severity_scheme.<tier>` | "How many days should sev-<n> have until due date, and does it escalate immediately?" | numeric + yes/no |
| `severity_label_map.<tier>` | "Which vendor label corresponds to sev-<n>?" | schema enum |
| `escalation.channel` | "Which chat channel should receive escalations? (Leave blank to skip.)" | free text or skip |
| `escalation.primary_contact` | "Email of the primary on-call contact? (Leave blank to skip.)" | email or skip |
| `triaged_label` | "What label should mark an issue as triaged?" | free text, default "triaged" |
| `state_categories.<bucket>` | "The sprint has a state '<state>' I couldn't classify. Is it Done, In Progress, or To Do?" | Done / In Progress / To Do |
| `stale_after_days` | "After how many days with no update should an in-progress item be flagged at-risk?" | numeric, default 3 |
| `points_field_name` | "Which Jira field holds story points? (Leave blank to auto-detect.)" | free text or skip |
| `bug_work_item_type` | "Which work-item type should filed bugs be created as?" | live type list from schema |
| `reported_label` | "What label should mark a bug as reported but not yet triaged? (Leave blank for none.)" | free text, default "needs-triage" |

After every answer, offer:

> Save this to `.claude/tracker-policy.json` so I don't ask again? (yes/no)

On yes, write the file (creating it if absent) with the new key merged in. On no, keep the answer in session memory only.

## Schema validation

When the file exists, validate it on load:

- Reject extra top-level keys with a one-line warning (`Unknown policy key '<key>' in tracker-policy.json. Ignored.`).
- Reject malformed `severity_scheme` entries with a fallback to the default for that tier and a one-line warning.
- Reject malformed `archetype_assignment_after_triage` values with a fallback to `"keep"` and a one-line warning.

Do not abort on validation errors. The user can fix the file or accept the fallbacks.

## Migration from legacy configs

The verb-plugins read these legacy paths forward for the session if they exist and no `tracker-policy.json` is present:

- `.claude/azure-incident-postmortem.config.json`
- `.claude/azure-issue-triage.config.json`
- `.claude/jira-issue-triage.config.json`
- `.claude/jira-bug-triage.config.json`

They print one warning per session pointing at the legacy file path. To stop the warning, translate the values into `.claude/tracker-policy.json` (the shape above) and delete the legacy file. Lazy prompts will offer to persist any missing keys after that.
