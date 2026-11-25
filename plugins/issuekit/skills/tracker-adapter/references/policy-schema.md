# Policy schema

Path: `.claude/tracker-policy.json` (project-root). Optional. When absent, the adapter uses the shipped defaults in `policy-defaults.json` and lazy-prompts at the moment a missing key is needed.

## Shape

The shipped defaults live in `policy-defaults.json` next to this file: every key, with
its default value. All keys are optional. Missing keys fall back to those defaults. A
`null` default means "no shipped value": the key is lazy-prompted when a verb first needs
it (`states.*`), or the feature it configures is skipped (`escalation.*`), as each key's
section says.

## Key reference

### `states` (object)

Maps abstract state names to the vendor-side state or transition name.

- **`investigating`** — the state set when triage begins. Examples: AzDO `"Active"` (Agile process), Jira `"Under Investigation"`, `"In Progress"`.
- **`waiting_reply`** — the state used when the agent needs information from the reporter. Examples: AzDO `"Active"` with `Reason: "Awaiting Customer"`, Jira `"Waiting for Reply"`.
- **`backlog`** — the state used when an issue should not be worked on yet.

The adapter looks the value up on the live state graph:
- **Jira:** calls `getTransitionsForJiraIssue` and finds the transition by name.
- **AzDO:** matches against the issue type's state list from `wit_get_work_item_type` (or `wit_work_item` action `"get_type"` on the consolidated tool shape — see `references/detection.md`); for `investigating`, the adapter also sets `System.Reason` based on a `Reason: "<value>"` suffix in the state string if present (e.g. `"Active; Reason: Investigating"`).

**Default if unset:** `null`, which means lazy-prompt. State names differ per process and workflow, so there is no safe shipped value: the adapter presents the list of valid transitions / states from the live schema and asks the user to pick. Typical answers are `"Active"` or `"In Progress"` for `investigating`, `"Waiting for Reply"` for `waiting_reply`, and `"New"` or `"Backlog"` for `backlog`.

### `severity_scheme` (object)

Maps abstract severity tiers (`sev1`..`sev4`) to SLA semantics.

- **`due_offset_days`** — number of days from today to set as the due date.
- **`escalate_immediately`** — boolean; if true, the verb-plugin pings the escalation channel as soon as severity is determined.

**Default if unset:** the value in `policy-defaults.json` (1/3/7/30 days; sev1 and sev2 escalate). Lazy-prompt only the parts the user wants to override.

### `severity_label_map` (object)

Maps abstract severity tiers to the vendor-side label values. The adapter uses this to project `severity: "sev1"` (abstract) to the vendor's actual option value (`"1 - Critical"` for AzDO Agile, `"Sev-1"` for many Jira projects).

If unset, the adapter uses the value in `policy-defaults.json`. If the vendor schema (from `getIssueTypeSchema`) does not contain any of the listed values, it lazy-prompts the user with the schema's enum options.

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

Default: the value in `policy-defaults.json`. Bugs get unassigned (because triage hands off to whoever picks them up). Everything else stays with the triager.

### `state_categories` (object)

Buckets vendor state names into the three report categories used by `getSprintItems` and the `sprint-status-reporter` plugin: `done`, `in_progress`, `todo`. Each value is a case-insensitive list of vendor state names.

Used only by sprint reads. When a state is not listed here, the adapter falls back to the vendor's own category signal (AzDO work-item-type `category`; Jira `statusCategory.key`). A state that matches neither becomes `stateCategory: "unknown"` and the consumer emits a one-line warning naming the unmapped state.

**Default if unset:** the value in `policy-defaults.json` (covers the common Agile/Scrum/Basic AzDO states and the default Jira workflow). Because the vendor-category fallback already handles most states, this key is rarely lazy-prompted; prompt only if a sprint contains an `unknown` state the user must classify.

### `blocked_indicators` (object)

Signals that a sprint item is blocked. Match is OR across the three signals:

- **`labels`** — an item carrying any of these labels/tags is blocked.
- **`states`** — an item in any of these states is blocked.
- **`board_column`** — a board-column name that means blocked. Reserved: `SprintItem` carries no board column today, so it is never evaluated, and a consumer that sees it set warns once.

**Default if unset:** `{ labels: ["blocked", "impediment"], states: ["Blocked"], board_column: null }`.

### `stale_after_days` (number)

An `in_progress` item whose last-updated date is older than this many days is flagged stale (at-risk) in the report. **Default:** `3`.

### `points_field_name` (string)

Jira-only override for the story-points custom-field name. When unset, the Jira adapter auto-discovers the field (`Story Points` → `Story point estimate`). Ignored on AzDO, which uses the standard `Microsoft.VSTS.Scheduling.StoryPoints` field. **Default:** `null` (auto-discover).

### `story_work_item_type` (object)

Used by `createIssue` (the `story-drafter` plugin) to choose which work-item type new stories are created as, per tracker. Keys are tracker names; values are the vendor type name.

- **`azure-devops`** — depends on the process template: `"User Story"` (Agile), `"Product Backlog Item"` (Scrum), `"Issue"` (Basic).
- **`jira`** — usually `"Story"`.

**Default if unset:** `{ "azure-devops": "User Story", "jira": "Story" }`. The caller validates the value while building its write batch, before the gate: it calls `getIssueTypeSchema(<type>)`, and an error or an empty field list means the type does not exist on the project. It then lazy-prompts for the type name as free text (offering the names listed above) and re-checks the answer the same way. There is no verb that lists a project's types.

### `feature_work_item_type` (object)

Used by `ticket-summarizer` to widen its fixed query-mode type scope beyond Story,
Bug, and Epic, per tracker. Keys are tracker names; values are the vendor type
name; a tracker with no key here is not widened at all.

- **`azure-devops`** — `"Feature"` on every stock process template (Agile, Scrum,
  Basic, CMMI); a standard portfolio-level type sitting between Epic and
  User Story/PBI.
- **`jira`** — no default. Jira's default workflow has no standard equivalent
  team-backlog type between Epic and Story, so `ticket-summarizer` does not widen
  the Jira type scope unless a project explicitly sets this key.

**Default if unset:** `{ "azure-devops": "Feature" }` (no `jira` entry). Set
`feature_work_item_type.jira` explicitly if a project has added a comparable type
and wants it included too. Unlike `story_work_item_type`/`bug_work_item_type`,
this key is not used by any `createIssue` caller — it only widens read-side type
filtering.

### `draft_label` (string)

The tag/label applied to work items created by `story-drafter`, so they land in the team's draft queue for refinement. **Default:** `"Draft"`.

### `priority_label_map` (object)

Jira-only. Maps the abstract priority tiers (`P0`/`P1`/`P2`) to the vendor priority names for `createIssue`. AzDO ignores this — it writes the numeric `Microsoft.VSTS.Common.Priority` field (`P0 → 1`, `P1 → 2`, `P2 → 3`). **Default:** `{ "P0": "Highest", "P1": "High", "P2": "Medium" }`.

### `acceptance_criteria_field` (string)

Jira-only override naming a custom field that holds acceptance criteria. When unset, `createIssue` folds acceptance criteria into the description body under an `## Acceptance Criteria` heading (Jira has no standard AC field), and `Issue.acceptanceCriteria` reads as `null`. AzDO ignores this key: it uses the standard `Microsoft.VSTS.Common.AcceptanceCriteria` field when the target type has it, and folds into the description the same way when it does not. **Default:** `null` (fold into description).

### `bug_work_item_type` (object)

Used by `createIssue` (the `bug-reporter` plugin) to choose which work-item type a filed bug is created as, per tracker. Keys are tracker names; values are the vendor type name.

- **`azure-devops`** — `"Bug"` in the Agile, Scrum, and CMMI templates; `"Issue"` in Basic (which has no Bug type).
- **`jira`** — usually `"Bug"`.

**Default if unset:** `{ "azure-devops": "Bug", "jira": "Bug" }`. Validated the same way as `story_work_item_type`: `getIssueTypeSchema(<type>)` while building the batch, then a free-text lazy-prompt when the type does not exist.

### `reported_label` (string)

The tag/label applied to a bug filed or refined by `bug-reporter`, marking it as reported but not yet triaged. Pairs with `skip_labels` and `triaged_label`: a bug carrying `reported_label` is waiting for `/issue-triager:run`. Set to `null` to apply no label. **Default:** `"needs-triage"`.

### `bug_repro_steps_field` (string)

Azure DevOps only. The field reproduction detail is written to on a Bug: preconditions, steps, expected behavior, actual behavior, and frequency. The Agile and CMMI Bug forms surface `Microsoft.VSTS.TCM.ReproSteps` as the main body, so writing that content into `System.Description` leaves the form looking empty.

Set to `null` to fold those sections into the description body instead. Ignored on Jira, which has no equivalent field; the adapter warns once and folds. **Default:** `"Microsoft.VSTS.TCM.ReproSteps"`.

### `bug_system_info_field` (string)

Azure DevOps only. The field environment detail is written to on a Bug (environment, versions, browser and OS, device, tenant, region). Set to `null` to fold it into the description body instead. Ignored on Jira. **Default:** `"Microsoft.VSTS.TCM.SystemInfo"`.

### `default_project` (string)

Overrides `whoAmI()`'s live-lookup resolution of the tracker's default project (see
`references/verbs/identity.md`'s "Resolving AzDO's `defaultProject`/`defaultTeam`" for the
full precedence — this key is checked first, ahead of the AzDO MCP server's own
`ado_mcp_project` config and the single-project auto-resolve). Works on both
trackers: the AzDO project name, or the Jira project key.

**Default if unset:** resolved live per the precedence in `verbs/identity.md`. AzDO: server
config, then single-project auto-resolve, then lazy-prompt. Jira: the project prefix of
the issue key in hand, then lazy-prompt. The lazy-prompt path writes its answer here so
the question is never asked twice.

### `default_team` (string)

Same role as `default_project`, for the team used by sprint/capacity reads
(`getCurrentSprint`, `getSprintItems`, `getTeamCapacity`). AzDO-only in practice —
Jira has no first-class team concept in this adapter (see `adapters/jira/sprint.md`).

**Default if unset:** `ado_mcp_team` from the AzDO MCP server config when present, else
`null`. It is never lazy-prompted (a project can have several teams and no obvious
default); a sprint caller that finds it `null` on AzDO stops and asks for `--team` or
this key.

### Postmortem keys

Read only by `postmortem-generator`.

- **`postmortem_template`** (string) — the document template. Only `"google-sre"` is
  implemented; any other value warns and falls back to it. **Default:** `"google-sre"`.
- **`incident_identifier`** (object) — how an incident is recognized:
  `{ tag: string, work_item_types: string[] }`. **Default:**
  `{ "tag": "incident", "work_item_types": ["Issue", "Bug", "Incident"] }`.
- **`datadog_default_service`** (string) — the service name used to scope log searches
  when the incident does not name one. **Default:** `null` (unscoped).
- **`include_action_items`** (boolean) — include the Action Items section. **Default:** `true`.
- **`include_timeline_evidence_links`** (boolean) — include the Source column in the
  timeline. **Default:** `true`.

## Lazy-prompt question text

When a missing key is encountered, ask via `AskUserQuestion` using these question templates:

| Missing key | Question | Options |
|---|---|---|
| `states.investigating` | "Which state means 'investigation is underway' on this tracker?" | live list from schema |
| `states.waiting_reply` | "Which state means 'waiting on reporter for more info'?" | live list from schema |
| `states.backlog` | "Which state means 'not being worked on yet'?" | live list from schema |
| `severity_scheme.<tier>` | "How many days should sev-<n> have until due date, and does it escalate immediately?" | numeric + yes/no |
| `severity_label_map.<tier>` | "Which vendor label corresponds to sev-<n>?" | schema enum |
| `escalation.channel` | "Which chat channel should receive escalations? (Leave blank to skip.)" | free text or skip |
| `escalation.primary_contact` | "Email of the primary on-call contact? (Leave blank to skip.)" | email or skip |
| `triaged_label` | "What label should mark an issue as triaged?" | free text, default "triaged" |
| `state_categories.<bucket>` | "The sprint has a state '<state>' I couldn't classify. Is it Done, In Progress, or To Do?" | Done / In Progress / To Do |
| `stale_after_days` | "After how many days with no update should an in-progress item be flagged at-risk?" | numeric, default 3 |
| `points_field_name` | "Which Jira field holds story points? (Leave blank to auto-detect.)" | free text or skip |
| `bug_work_item_type` | "'<type>' is not a work-item type on this project. Which type should filed bugs be created as?" | free text; offer `Bug`, `Issue` |
| `story_work_item_type` | "'<type>' is not a work-item type on this project. Which type should new stories be created as?" | free text; offer `User Story`, `Product Backlog Item`, `Issue`, `Story` |
| `reported_label` | "What label should mark a bug as reported but not yet triaged? (Leave blank for none.)" | free text, default "needs-triage" |
| `default_project` | "Which project should this session default to?" | live list from `core_list_projects` (AzDO) or `getVisibleJiraProjects` (Jira; free text when absent) |

After every answer, offer:

> Save this to `.claude/tracker-policy.json` so I don't ask again? (yes/no)

On yes, write the file (creating it if absent) with the new key merged in. On no, keep the answer in session memory only. When the calling agent has no file-write tool, skip the offer and print the JSON fragment for the user to paste into `.claude/tracker-policy.json` instead.

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

They print one warning per session pointing at the legacy file path. To stop the warning, translate the values into `.claude/tracker-policy.json` (same shape as `policy-defaults.json`) and delete the legacy file. Lazy prompts will offer to persist any missing keys after that.
