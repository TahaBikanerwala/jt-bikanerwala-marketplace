---
name: source-reconciler
description: "Gathers everything a tester needs about a change and decides what the truth is. Resolves a ticket (Azure DevOps, Jira), a pull request (Azure DevOps, GitHub), or pasted text; follows links both ways until the set stops growing (ticket to linked PRs, PR to referenced tickets, ticket to parent and related items); normalizes the acceptance criteria into AC-1..n including product-owner amendments made in comments; and lists every discrepancy between the ticket and the PR, with the ticket as source of truth. Also derives risk areas from the PR's changed files, used only to aim regression testing. Invoked by the qa-tester agent in Phases 1 and 2."
metadata:
  author: Taha Bikanerwala
---

# Source Reconciler

Two jobs: collect every source about the change (Phase 1), then decide what the expected behavior is and where the sources disagree (Phase 2). The ticket defines expected behavior. The PR shows what someone built and why; it is evidence, never specification.

## Phase 1: Resolve and gather

### Resolve the argument

Strip a `--env <name>` token first; the agent handles it. Then classify each remaining reference:

| Shape | Kind | Read with |
|---|---|---|
| `dev.azure.com/.../_workitems/edit/<n>`, `visualstudio.com/...`, `AB#<n>`, a bare number when `tracker == azure-devops` | AzDO ticket | `getIssue`, `getIssueComments` |
| Atlassian host `/browse/<KEY-n>`, a bare `KEY-n` | Jira ticket | `getIssue`, `getIssueComments` |
| `dev.azure.com/.../_git/<repo>/pullrequest/<n>` | AzDO PR | `getPullRequest` |
| `github.com/<owner>/<repo>/pull/<n>`, or `#<n>` when the current repo's `origin` is on GitHub | GitHub PR | `gh` CLI (below) |
| anything else | pasted text | used as-is |

If a bare number is ambiguous (both AzDO tracker and a GitHub remote), treat it as a ticket when `tracker == azure-devops`; `#<n>` always means a GitHub PR.

### Read a ticket

- `getIssue(id)`: title, description, type, state, parent, labels, `customFields` (the AzDO AcceptanceCriteria field lives here; on Jira look for an "Acceptance Criteria" heading in the body or a custom field named like it).
- `getIssueComments(id)`: every comment, oldest first. These matter: product owners often amend scope in comments.
- `linkedPullRequests(id)`: the PRs for this ticket.
- The parent (feature or epic) with `getIssue`, read for context only: business goal, constraints, non-functional requirements. A parent's AC does not become this ticket's AC.
- Related or child items named in the ticket's links, `title` and `body` only, to spot dependencies (a blocker not done yet makes some cases `Blocked`).
- Attachment and image names, and any linked design URLs (Figma, etc.). You cannot assume you can open them; list them so the report can say what was not checked.

### Read a pull request

**Azure DevOps:** `getPullRequest(ref)` returns body, branches, state, merge commit, files, review threads, and `workItemRefs`.

**GitHub:** run, from the repo root,

```
gh pr view <n|url> --json number,url,title,body,state,isDraft,author,headRefName,baseRefName,mergedAt,mergeCommit,files,commits,comments,reviews,closingIssuesReferences
```

If `gh` is missing or unauthenticated, say so once and fall back to the PR URL alone (no files, no threads). Never ask the user to authenticate mid-run; record it as an end-of-run note.

**Ticket references inside a PR.** Collect from, in order: `workItemRefs` (AzDO), `closingIssuesReferences` (GitHub), and regex matches in title, body, branch name and commit messages: `AB#\d+`, `\b[A-Z][A-Z0-9]+-\d+\b` (Jira keys; ignore matches like `UTF-8`, `ISO-8601`, `SHA-256`, `HTTP-2` and anything not resolvable by `getIssue`), and work-item URLs.

### Follow links until stable

Start from the input, then alternate: for each new ticket, fetch its PRs; for each new PR, fetch its tickets. Stop when no new item appears, or after three rounds, or at ten items total (report the cap if hit). Mark each item `primary` (the input, or the single ticket the input PR references) or `related`.

When several PRs map to one ticket, all of them are in scope; note which PRs are merged, open, abandoned or draft. Abandoned PRs are read for context but do not count as "the implementation". When one PR references several tickets, every ticket's ACs are in scope, grouped by ticket.

### Output (Phase 1)

```
sources:
  tickets: [{ id, url, title, type, state, role: primary|related, body, acField, comments: [...], parent: {id,title,body}|null, attachments: [...] }]
  prs:     [{ id, url, host: azure-devops|github, title, body, state, isDraft, sourceBranch, targetBranch, mergedAt, mergeCommit, files: [{path, changeType}], threads: [...], ticketRefs: [...] }]
  links:   [{ from, to, via: tracker-link|workItemRef|closingRef|title|body|branch|commit }]
  notes:   [ "gh not authenticated", "link-follow cap reached", ... ]
```

## Phase 2: Reconcile

### Normalize the acceptance criteria

Build `AC-1..n` per primary ticket (prefix with the ticket id when there is more than one ticket: `1234/AC-2`).

1. Take the AC field (or the AC section of the body) and split it into atomic, testable statements. A Given/When/Then block is one AC; a bulleted list is one AC per bullet; a paragraph with several "must"/"should" clauses is split per clause.
2. If there is no AC field or section, derive informal ACs from the description and tag each `origin: description`. Add a question: "The ticket has no acceptance criteria; I tested against the description. Confirm the intended behavior."
3. Read comments oldest to newest. A comment that changes scope or behavior ("also show X", "we agreed to drop Y", "the limit is now 50") by the product owner, BA, ticket author, or anyone the thread treats as deciding, is an **amendment**: apply it, tag the AC `origin: comment by <author> on <date>`, and keep the superseded text. A comment from anyone else that proposes a change without agreement is not an amendment; it becomes a question.
4. Capture constraints stated outside the AC (roles, limits, formats, copy text, error messages) as `business_rules`.

### Discrepancies (ticket vs PR)

Compare the normalized ACs against the PR title, description, review threads, and changed files. Classify each difference:

| Class | Meaning | Example |
|---|---|---|
| `missing-in-pr` | an AC with no sign of implementation in any PR | AC requires a CSV export; no PR touches export code or mentions it |
| `extra-in-pr` | the PR adds behavior no AC asks for | PR description says "also added bulk delete" |
| `contradicts-ac` | the PR states behavior that conflicts with an AC | AC: max 100 chars; PR description: "limited to 255" |
| `scope-changed-in-review` | a review thread agreed a change the ticket does not reflect | reviewer: "let's skip the email for now"; author: "done" |
| `pr-not-merged` | the implementing PR is open, draft, or abandoned | affects what can be tested on a deployed environment |

Rules:
- The ticket wins. A discrepancy never edits an AC. It is reported, and the AC is tested as written; the test result then shows whether the PR's version or the ticket's version is what shipped.
- File paths support a `missing-in-pr` call only as weak evidence; phrase it as "no change found that obviously implements AC-n" rather than a certainty.
- Each discrepancy carries evidence: the AC text, the PR quote or file, and a link.
- Each `contradicts-ac`, `extra-in-pr` and `scope-changed-in-review` produces a question for the end-of-run card ("AC-3 says 100; PR #789 says 255. Which is intended?").

### Risk areas

From the PR files, list the user-facing areas likely affected: pages, routes, components, API endpoints, shared utilities. Use path and name reading only (open a file only to resolve a route name). Mark shared code (used by several pages) as wider blast radius. These aim regression and exploratory testing; they never define an expected result.

### Output (Phase 2)

```
acceptance_criteria: [{ id: "AC-1", ticket, text, origin: ac-field|description|comment, supersedes?: "...", amendedBy?: "...", testable_hint: "..." }]
business_rules:      [ ... ]
discrepancies:       [{ id: "D-1", class, ac?: "AC-n", ticket_says, pr_says, evidence: [...], question? }]
risk_areas:          [{ area, files: [...], blast_radius: narrow|wide, why }]
questions:           [{ text, unblocks: [...], kind: discrepancy|ac-ambiguity|missing-ac|access }]
```
