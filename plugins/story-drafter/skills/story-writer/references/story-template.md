# Story template

The fixed structure for every story. Sections appear in this order. The first group is the **DESCRIPTION (body)** block; the acceptance criteria are the separate **ACCEPTANCE CRITERIA** block (see the skill's Output shape). Write in markdown; the tracker adapter converts it.

Use `## <emoji> <heading>` for section titles inside the body (not `#`, so the work-item title stays the visual top heading after conversion). The emoji per heading is fixed — match it exactly; it is the house style already in use on Rolai's Azure DevOps tickets (e.g. work item 3491), not decoration to vary per story.

| Heading | Emoji |
|---|---|
| Problem Statement | 🧩 |
| Background | 🏁 |
| Description | 📝 |
| Acceptance Criteria | ✅ |
| In Scope | 🟢 |
| Out of Scope | 🔴 |
| Definition of Done | 🏁 |
| Open Questions | ❓ |

---

## DESCRIPTION (body) block

### 🧩 Problem Statement

Two to three sentences grounded in the input: what problem this solves, who is affected, and the impact of not solving it.

### 🏁 Background

Context that explains why this story exists. Cite the source input (the `source_label` the caller passed, e.g. "From the roadmap-sync notes, 2026-07-16"). Include any product context and any codebase facts the probe confirmed (`[VERIFIED]`/`[OBSERVED]`), stated plainly as facts.

### 📝 Description

> As a **<specific user role>**, I want to **<capability>** so that **<benefit>**.

Then two to four sentences expanding the expected behavior in plain language.

### 🟢 In Scope

- What this story covers (specific capabilities/behaviors).

### 🔴 Out of Scope

- What this story does not cover. Name the adjacent things a reader might assume are included but are not.

### 🏁 Definition of Done

- ☐ Acceptance criteria implemented and tested
- ☐ Unit and integration tests written and passing
- ☐ QA verified on staging
- ☐ No regressions in related areas
- ☐ Product Manager reviewed and approved
- ☐ Ticket updated with test evidence
- ☐ Ready for production

(Adjust the list to the story; keep it a `- ☐ <item>` bullet list — GitHub-style `- [ ]` checkboxes render as literal bracket text on both AzDO and Jira, see `issuekit/skills/tracker-adapter/references/body-format.md`.)

### ❓ Open Questions

| # | Question | Owner | Blocking? |
|---|----------|-------|-----------|
| 1 | <question> | <Engineering / Design / PM / Client> | Yes / No |

Include only questions still open after the brainstorm, the team's answers, and the codebase probe. If a probe finding resolved a question, drop it from this table. If none remain, write `None.` instead of an empty table.

---

## ACCEPTANCE CRITERIA block

Given/When/Then, one bullet per criterion. Cover the happy path, error states, and edge cases. Keep each criterion testable and narrow.

- **Given** <precondition>
  **When** <action>
  **Then** <expected outcome>

- **Given** <precondition>
  **When** <action>
  **Then** <expected outcome>

---

## Worked example (abbreviated)

```
=== STORY: Cohort-wide agent skill sharing | PRIORITY: P1 ===

--- DESCRIPTION (body) ---
## 🧩 Problem Statement
Faculty rebuild the same agent skills for every cohort because there is no way to
share a skill with more than one learner at a time. This wastes prep hours before
each cohort launch and produces inconsistent skills across sections.

## 🏁 Background
From the roadmap-sync notes (2026-07-16): faculty asked to "share a skill with the
whole cohort at once." The probe confirmed skills are currently scoped per-user in
the sharing model (`[VERIFIED]` — sharing records key on a single user id).

## 📝 Description
> As a **faculty member**, I want to **share an agent's skills with an entire cohort
> in one action** so that **every learner in the cohort gets the same skill without
> per-learner setup**.

Selecting a cohort as the share target grants the skill to its current members and to
learners who join later, until the share is revoked.

## 🟢 In Scope
- Sharing a skill to a cohort as a single target.
- New cohort members inheriting active cohort shares.

## 🔴 Out of Scope
- Per-skill version pinning per learner.
- Cross-cohort skill libraries.

## 🏁 Definition of Done
- ☐ Acceptance criteria implemented and tested
- ☐ Unit and integration tests written and passing
- ☐ QA verified on staging
- ☐ No regressions in existing per-user sharing
- ☐ Product Manager reviewed and approved
- ☐ Ready for production

## ❓ Open Questions
| # | Question | Owner | Blocking? |
|---|----------|-------|-----------|
| 1 | Should revoking a cohort share remove the skill from learners who already used it? | PM | No |

--- ACCEPTANCE CRITERIA ---
- **Given** a faculty member owns an agent skill and a cohort
  **When** they share the skill to that cohort
  **Then** every current cohort member can use the skill

- **Given** a skill is shared to a cohort
  **When** a new learner joins the cohort
  **Then** they receive the shared skill automatically

- **Given** a skill is shared to a cohort
  **When** the faculty member revokes the cohort share
  **Then** cohort members can no longer use the skill and the action is confirmed
```
