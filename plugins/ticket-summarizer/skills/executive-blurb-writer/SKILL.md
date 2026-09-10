---
name: executive-blurb-writer
description: "Turns a fetched list of tracker work items into one plain-language, client-facing blurb per item: one short sentence stating what was delivered or changed, and a second sentence only when the ticket's own text supports a why-it-matters claim that cannot be folded into the first. Pure computation, no tracker access. Invoked by the ticket-summarizer agent."
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

Every `blurb` targets **one short, plain-language sentence, at most ~160 characters**,
written in the register of a status update to a client who has no visibility into the
ticket, the codebase, or internal team vocabulary. One sentence is the normal case,
not a floor to build up from: most tickets should stop there. Concise beats
complete-sounding; cut words, never information.

**Sentence 1, always present: what changed.** Condense `title` and `body` into one
sentence stating what was delivered, fixed, or changed. Drop boilerplate headings
("Problem Statement", "Acceptance Criteria", "As a ... I want ..."), internal
component or system names, error codes, and ticket jargon. Restate a bug title as what
got fixed; restate a story or feature title as what got built. When `body` is empty,
derive the sentence from `title` alone. When a ticket bundles several distinct
changes, name only the most significant one; do not enumerate the rest.

**Sentence 2, rare, only when the ticket supports it: why it matters.** Add a second
sentence, capping the pair at ~220 characters total, only when both hold: `body`
states a reason, a goal, or a described impact (an acceptance criterion phrased as a
benefit, a stated pain point, an explicit "so that" clause), and that reason cannot be
folded into sentence 1 as a short clause. When the ticket states no rationale, or it
fits inline, stop after sentence 1. Do not infer a business benefit from the ticket's
title, type, or your own judgment of what a fix like this probably helps with.

There is no sentence 3 or 4. A ticket with a lot going on is a signal to compress
harder, not to add length: a client-update line has room for one idea, said plainly.

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
- Do not reach for a second sentence because a ticket has a lot of detail, and never
  write a third. Compress into the one idea that matters most; length is never a
  substitute for editing.
- Do not editorialize with confidence the ticket doesn't warrant ("this is a critical
  fix" when the ticket never says so).
- Do not drop an item from the output. Every input item gets exactly one entry, even
  when both title and body are thin (a bare title still yields a one-sentence blurb).
- Do not read the clock, fetch anything, or write files.

## Determinism

Same input, same output. Preserve input order.
