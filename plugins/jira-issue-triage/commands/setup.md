---
description: First-time setup wizard for jira-issue-triage. Walks through configuration questions and writes .claude/jira-issue-triage.config.json.
argument-hint: (no args)
---

# jira-issue-triage Setup Wizard

Walk the user through eight configuration questions and write the result to `.claude/jira-issue-triage.config.json`. Re-runnable: pointing the wizard at an existing config offers to overwrite or keep current.

## Steps

### 1. Check for existing config

Read `.claude/jira-issue-triage.config.json` if it exists. Also check `.claude/jira-bug-triage.config.json` (the legacy path used by the v0.3.0 plugin).

- **New-path config exists:** Read it, show the current contents to the user as pretty-printed JSON, then ask via `AskQuestion`: "Overwrite the existing config?" Options: `Yes, walk through the wizard again`, `No, keep current and exit`. On "No", exit cleanly.
- **Only the legacy file exists:** Read it, show the contents, and tell the user: "The legacy file works for now but the new path `.claude/jira-issue-triage.config.json` is preferred. The wizard will write the new path; you can delete the legacy file once the new one is written." Continue to step 2.
- **Neither exists:** Continue to step 2.

### 2. Auto-discover defaults

Best-effort auto-discovery to suggest defaults. Failures are non-fatal; fall back to the static defaults listed in each question and tell the user the auto-discovery failed.

1. Call `getAccessibleAtlassianResources` to get the cloudId and the list of accessible Atlassian sites.
2. Call `atlassianUserInfo` to get the user's account info.
3. From the user's accessible sites, pick the first site as the suggested default for project key inference. If a single project is detected, suggest its key as the Q1 default; otherwise fall back to "infer".
4. Pre-populate the severity field name auto-discovery order: `Severity Level` -> `Severity` -> `Bug Severity` -> `priority`. The wizard surfaces these as Q2 options.

### 3. Walk through the eight wizard questions

Ask one at a time. Use `AskQuestion` for multiple-choice answers. Use plain free-text prompts for names, emails, labels, and channel names. Confirm each answer before moving to the next question.

#### Q1: Default project key

Free-text prompt:

> Default Jira project key? Type a key like `ENG` or `BUG`, or type `infer` to derive it from each ticket URL.

Default: `infer`. Validate that the answer is either `infer` or a non-empty alphanumeric string (uppercase Jira keys allowed).

#### Q2: Severity field name

Use `AskQuestion`:

> Which Jira field holds the severity for bug tickets?

Options:
- `Severity Level` (recommended default for many Jira instances)
- `Severity`
- `Bug Severity`
- `priority` (use the native Jira priority field as severity)
- `Custom (type the name)`

On "Custom", ask for the field name as free text. Validate the answer is non-empty.

#### Q3: Triaged label

Free-text prompt:

> Label to add to tickets after triage? Default: `triaged`.

Default: `triaged`.

#### Q4: Skip labels

Free-text prompt:

> Comma-separated list of label prefixes that should skip triage entirely (e.g., `applause,external-vendor`). Press Enter for none.

Default: empty list. Parse the answer by splitting on `,` and trimming whitespace; reject any entry containing whitespace inside the value (warn and re-prompt).

#### Q5: Transition names

Three free-text prompts in sequence:

1. > Transition name for "investigating"? Default: `Under Investigation`.
2. > Transition name for "waiting for reply"? Default: `Waiting for Reply`.
3. > Transition name for "backlog"? Default: `Backlog`.

#### Q6: Severity scheme

Use `AskQuestion`:

> Which severity scheme do you want to use?

Options:
- `3-tier (Sev-1, Sev-2, Sev-3) with 7/14/90 day SLAs` (recommended default)
- `5-tier (Sev-1, Sev-1.5, Sev-2, Sev-2.5, Sev-3)`
- `Custom (specify each level)`

On "5-tier", use the static 5-tier scheme: `Sev-1` (3 days, escalate), `Sev-1.5` (5 days, escalate), `Sev-2` (10 days), `Sev-2.5` (30 days), `Sev-3` (90 days).

On "Custom", walk through each level: ask for the level name, the `due_offset_days` integer, and via `AskQuestion` whether `escalate_immediately` is `Yes` or `No`. Loop until the user types `done` for the level name.

#### Q7: Escalation

Three free-text sub-prompts. Each accepts an empty answer (Enter for none).

1. > Slack channel for high-severity escalation pings? (e.g., `#bug-triage`) Press Enter for none.
2. > Primary escalation contact? Format: `Alice Kumar <alice@example.com>`. Press Enter for none.
3. > Fallback escalation contact? Same format. Press Enter for none.

Parse the contact strings into `{ "name": "Alice Kumar", "email": "alice@example.com" }`. If the format does not match, warn and re-prompt.

#### Q8: Save?

Show the assembled config as pretty-printed JSON with sorted top-level keys. Use `AskQuestion`:

> Save this config to `.claude/jira-issue-triage.config.json`?

Options:
- `Yes, write the file`
- `No, discard and exit`
- `Edit a specific question (which one?)`

On `Edit`, ask which question number to revisit, re-prompt that question, and loop back to Q8.

### 4. Write the config file

Use the `Write` tool with `path: ".claude/jira-issue-triage.config.json"`. Pretty-print with two-space indent and sort top-level keys alphabetically for stable diffs. The full schema (with all top-level keys, in alphabetical order):

```json
{
  "escalation": { "slack_channel": null, "primary_contact": null, "fallback_contact": null },
  "non_bug_transitions": { "ready": null },
  "project_key": null,
  "scope_summary_field_name": null,
  "severity_field_name": null,
  "severity_scheme": {
    "Sev-1": { "due_offset_days": 7,  "escalate_immediately": true  },
    "Sev-2": { "due_offset_days": 14, "escalate_immediately": false },
    "Sev-3": { "due_offset_days": 90, "escalate_immediately": false }
  },
  "skip_labels": [],
  "sprint_field_name": null,
  "story_points_field_name": null,
  "transitions": {
    "investigating": "Under Investigation",
    "waiting_reply": "Waiting for Reply",
    "backlog": "Backlog"
  },
  "triaged_label": "triaged"
}
```

The four trailing optional fields (`scope_summary_field_name`, `sprint_field_name`, `story_points_field_name`, `non_bug_transitions.ready`) are NOT asked in this wizard. They default to null/empty in the written config and can be added by editing the file directly. See the plugin README for documentation.

### 5. Confirmation message

Print one line:

> Wrote `.claude/jira-issue-triage.config.json`. You can re-run `/jira-issue-triage:setup` any time to update.

## Notes

- This wizard never modifies Jira. Read-only auto-discovery only.
- If `getAccessibleAtlassianResources` or `atlassianUserInfo` fails, proceed with the static defaults and tell the user the auto-discovery failed.
- The wizard does not validate the entered Jira field names against the live instance. The agent's auto-discovery (in Prerequisites) handles validation at runtime; if a configured field name does not resolve, the agent falls back to its built-in auto-discovery order and warns the user.
