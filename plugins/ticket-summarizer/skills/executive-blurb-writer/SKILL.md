---
name: executive-blurb-writer
description: "Turns a fetched list of tracker work items into one plain-language, client-facing blurb per item: one sentence stating what was delivered or changed, and a second sentence only when the ticket's own text supports a why-it-matters claim. Extends to three or four sentences only as a last resort, when two genuinely cannot state the change accurately. Pure computation, no tracker access. Invoked by the ticket-summarizer agent."
metadata:
  author: Taha Bikanerwala
tools: Read
---

# Executive Blurb Writer

Turn each fetched work item into a short blurb a client-update deck can use as-is.
Input is already-fetched data; this skill does no tracker access and no I/O.

## Input

```json
{ "issues": [ Issue, ... ] }
```

`Issue = { id, url, title, body, type, state, severity, assignee, reporter, created,
updated, resolved, labels, parent, customFields, raw }` (the `issuekit:tracker-adapter`
type; `body` is markdown and may be empty).

## Output

Return a JSON array, one entry per input item, same order:

```json
[ { "id", "title", "url", "blurb" }, ... ]
```

## Blurb rule

Every `blurb` targets one or two plain sentences, at most ~280 characters total,
written in the register of a status update to a client who has no visibility into the
ticket, the codebase, or internal team vocabulary. Treat one-to-two as the normal
size, not a hard ceiling: extend to three or four sentences only as a last resort (see
below), and even then keep every sentence as short as it can be while still saying
something the client needs. Concise beats complete-sounding; cut words, never
information.

**Sentence 1, always present: what changed.** Condense `title` and `body` into one
sentence stating what was delivered, fixed, or changed. Drop boilerplate headings
("Problem Statement", "Acceptance Criteria", "As a ... I want ..."), internal
component or system names, error codes, and ticket jargon. Restate a bug title as what
got fixed; restate a story or feature title as what got built. When `body` is empty,
derive the sentence from `title` alone.

**Sentence 2, only when the ticket supports it: why it matters.** Write it only when
`body` states a reason, a goal, or a described impact (an acceptance criterion phrased
as a benefit, a stated pain point, an explicit "so that" clause). When the ticket
states no rationale, stop after sentence 1. Do not infer a business benefit from the
ticket's title, type, or your own judgment of what a fix like this probably helps with.

**Sentences 3 and 4, last resort only.** Reach for these only when sentence 1 (and
sentence 2, if it applies) cannot state the change, or why it matters, without leaving
out something the client needs, for example a ticket that bundles several distinct
changes, or a why-it-matters claim that needs one short clarifying clause to stand on
its own. Each added sentence must carry information the earlier ones could not; never
use one to restate, hedge, or pad.

**All sentences, at any length:**

- No ticket ids, vendor state names, story points, or dates. Those are metadata the
  caller renders separately.
- No technical implementation detail that means nothing to a client (function names,
  table names, stack traces, internal service names) unless the ticket's own language
  already frames it in user-facing terms.
- Never use em dashes or spaced hyphens as separators.
- Keep it factual. Never invent scope, impact, or a beneficiary the ticket doesn't
  name.

## Anti-patterns

- Do not pad a one-sentence blurb with a generic, ticket-agnostic filler line ("this
  improves the platform"). Silence on sentence 2 is correct when the ticket gives
  nothing to say.
- Do not default to three or four sentences because a ticket has a lot of detail.
  Compress first; reach for the last resort only when compression would lose
  information the client needs.
- Do not editorialize with confidence the ticket doesn't warrant ("this is a critical
  fix" when the ticket never says so).
- Do not drop an item from the output. Every input item gets exactly one entry, even
  when both title and body are thin (a bare title still yields a one-sentence blurb).
- Do not read the clock, fetch anything, or write files.

## Determinism

Same input, same output. Preserve input order.
