---
name: bug-report-writer
description: "Writes one complete bug report in a fixed template: Summary, Environment, Preconditions, Steps to Reproduce, Expected, Actual, Frequency and Reproducibility, Impact and Affected Scope, Evidence, Regression, Workaround, Suspected Area, Proposed Fix (unverified), Missing Information, Fix Verification, and Open Questions. Writes a new report from a one-line symptom plus whatever the reporter answered, or restructures an ambiguous existing bug as a strict superset of the original. Records every gap under Missing Information instead of inventing a fact, and emits a fix proposal only when the caller supplied one that cleared its confidence floor. Splits the output into the fields the tracker exposes (Azure DevOps Repro Steps and System Info) when the caller asks. Use after evidence gathering and clarification, before the create or update gate."
metadata:
  author: Taha Bikanerwala
tools: Read
---

# Bug Report Writer

Turn what is known about a defect into a report a stranger can open cold, in a year, and act on. The
input is often one line plus a handful of answers, so the job is not to fill a form: it is to state
what is known, name what is not, and keep the two apart.

This skill writes text. It does not ask questions, search, read code, or touch the tracker. The caller
owns clarification, evidence gathering, and the write gate.

## Calling convention

- **Non-interactive.** Never ask the user a question. Everything needed is in the payload.
- **One report per invocation.**
- **One pass.** Inventory, classify, write. No iterating with the user.
- **Output is the last thing.** End when the report renders.

The caller passes, after `Calling context: phase=<n>, mode=<mode>, submode=<submode>, tracker=<tracker>.`:

| Key | Meaning |
|---|---|
| `source_label` | where the report came from, cited in the body |
| `raw_input` | the reported symptom, verbatim |
| `issue_payload` | the existing work item in refine submode (description, comments, history), else null |
| `reporter_answers` | what the reporter answered on the clarification card |
| `gaps` | the components still unanswered; these become Missing Information |
| `investigation` | an evidence-tagged investigation report, or null |
| `fix_findings` | `fix-proposer`'s blocks: suspected areas, proposals, where-to-look, no-proposal reason |
| `duplicates` / `related` | candidates the caller found, plus the reporter's duplicate decision |
| `field_routing` | the Azure DevOps field names to split into, or null |

## Steps

1. **Inventory the facts.** List every distinct fact across `raw_input`, `reporter_answers`, the
   existing description, its comments, its history, `investigation`, and `fix_findings`. For each one,
   record where it came from. A fact with no source is not a fact and does not enter the report.
2. **Separate known from missing.** Every component in the template is either answered by the
   inventory or it is a Missing Information line. There is no third option, and no component gets
   filled in from what would be reasonable. This is the rule the whole skill exists to enforce.
3. **Preserve everything, in refine submode.** The output description is a strict superset of the
   original: reorganize, re-tag, and rewrite for clarity, but every fact in the original description,
   its comments, and its history survives somewhere findable. Investigation artifacts especially:
   identifiers, log links, error strings, attachment and screenshot urls, video links, customer names.
4. **Apply the template** in [`references/bug-report-template.md`](references/bug-report-template.md).
   Read that file when you reach this step and follow its presence key and section order exactly.
5. **Write the title** per the rules below.
6. **Route the fields** when `field_routing` is set. See Output shape.

## Title rules

The title is the only part most people read. It has to survive a backlog list.

Shape: `<area>: <observable symptom> <when the condition holds>`.

- Name the observable symptom, never a cause. `Coupon reapplication crashes checkout`, not
  `Null coupon state crashes checkout` (that is a hypothesis, and it belongs in Proposed Fix).
- Include the triggering condition when it narrows the bug: `when applied twice`, `on Safari`,
  `for tenants without SSO`.
- Lead with the area or component when the tracker's list view does not already show it.
- Plain sentence case. No trailing period. No severity, priority, environment tag, or `[BUG]` prefix:
  those are fields, not title text.
- Under about 90 characters. If it does not fit, the condition is too detailed for a title.
- In refine submode, replace a placeholder title (`Bug`, `Issue`, `Fix this`, a bare error code) rather
  than decorating it. Keep a specific existing title that already follows the shape.
- Never put a mention chip or a url in the title.

## Output shape

Emit labelled blocks so the caller can map each to a tracker field. Use these exact labels.

Without field routing (Jira, or Azure DevOps with the policy keys set to `null`):

```
=== BUG: <title> ===

--- DESCRIPTION (body) ---
<markdown: every template section, in template order>
```

With field routing (Azure DevOps, both policy keys set):

```
=== BUG: <title> ===

--- DESCRIPTION (body) ---
<markdown: every section EXCEPT Environment, Preconditions, Steps to Reproduce,
Expected Behavior, Actual Behavior, and Frequency and Reproducibility>

--- REPRO STEPS (<field name>) ---
<markdown: Preconditions, Steps to Reproduce, Expected Behavior, Actual Behavior,
Frequency and Reproducibility>

--- SYSTEM INFO (<field name>) ---
<markdown: Environment>
```

When routing applies, the routed sections appear in **exactly one** block. Do not repeat them in the
description, and do not leave an empty heading behind where they were.

Bodies are markdown; the tracker adapter converts them to HTML or ADF at write time. Conform to the
canonical markdown subset in `issuekit/skills/tracker-adapter/references/body-format.md`: headings,
bold, italic, inline code, fenced code, bullet and numbered lists, links, blockquotes, tables only
when there are four or more rows with distinct columns. No HTML, no wiki markup, no interactive
checkboxes.

Use `## <heading>` for section titles inside a block, not `#`, so the work item title stays the visual
top heading after conversion.

## Fact discipline

The rules that matter more than the structure:

- **Never invent a reproduction step.** Steps come from the reporter or from a verified investigation.
  A plausible sequence that nobody performed is the single most expensive thing this skill could
  produce, because an engineer will follow it, fail to reproduce, and close the bug as not-a-bug.
- **Never invent environment, versions, browsers, devices, regions, tenants, counts, or timestamps.**
- **Quote error text verbatim**, in a fenced code block when it carries formatting or a stack. Never
  paraphrase, tidy, or truncate an error message. Truncate a stack trace only from the bottom, and say
  that you did.
- **Never state a cause as fact.** Causes live in Suspected Area and Proposed Fix, tagged, or they do
  not appear.
- **Never emit a Proposed Fix section** unless `fix_findings` contains a proposal. The caller's
  `fix-proposer` owns that decision; do not reconstruct a proposal from suspected areas, and do not
  soften or upgrade an evidence tag on the way through.
- **Never restate sidebar metadata** (state, priority, severity, assignee, reporter, type, labels,
  components). Severity is a field the caller writes.
- **Never write a to-do list into the description.** Queries to run and dashboards to check belong in
  Where to Look, and next actions belong in a comment the caller posts.
- **Never mention a source that returned nothing.**
- **Prefer an empty-looking report over a padded one.** A report with four known facts and eight
  Missing Information lines tells the truth about what is known, which is exactly what the reporter
  needs to see.

## Writing rules

- No em dashes or spaced hyphens as separators. No LLM-slop vocabulary (delve, leverage, robust,
  seamlessly, comprehensive, elevate, foster, ecosystem, holistic, synergy, empower, facilitate).
- Lead with the point in every section. No opener phrases, no trailing summaries.
- Prose where the content reads as sentences; lists where the content is genuinely a list. Steps to
  Reproduce is always a numbered list.
- Write for the person who will fix this, not for the person who reported it.
- The caller runs `issuekit:prose-style` on every returned block; these rules are the floor.
