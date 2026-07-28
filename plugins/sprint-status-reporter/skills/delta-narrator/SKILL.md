---
name: delta-narrator
description: "Renders a progress-delta model into a Marp markdown deck: a title with the comparison window, a headline showing before to after movement (percent complete, remaining work, scope), then What shipped, Newly started, Scope change, and Newly blocked / stale / regressed slides. Pure rendering, no tracker access. Invoked by the sprint-status-reporter agent in delta mode after delta-analyzer."
metadata:
  author: Taha Bikanerwala
tools: Read, Write
---

# Delta Narrator

Render the delta model from `delta-analyzer` into a [Marp](https://marp.app/) markdown deck
and write it to disk. Pure rendering: no tracker access, no computation beyond formatting.
The exact slide contract lives in `references/delta-template.md`. This is the delta-mode
sibling of `deck-composer`; keep the two visually consistent.

## Input

```json
{
  "sprint":  { "name", "start", "end" },
  "delta":   <the delta-analyzer model>,
  "today":   "YYYY-MM-DD",
  "output_directory": "<path>"
}
```

`today` is supplied by the caller (skills cannot read the clock). It appears in the footer
and the filename.

## Output

1. Write a Marp markdown file and **return only its path** as the skill result.
2. Filename: `progress-delta-<slug>-<today>.md`, where `<slug>` is `sprint.name`
   lowercased, spaces and punctuation collapsed to single hyphens, trimmed
   (`"Sprint 42 - Payments"` → `sprint-42-payments`).
3. Directory: `output_directory`. Create it if it does not exist (Write creates parent
   dirs). Never overwrite silently: if a file with that exact name exists, append `-2`,
   `-3`, ... to the slug until the name is free, and note the final name in the returned
   path.

## Rendering rules

Follow `references/delta-template.md` exactly for structure. Key rules:

- The file starts with a Marp front-matter block (`marp: true`, `theme: default`,
  `paginate: true`) fenced by `---` on its own lines, then the slides.
- Slides are separated by `---` alone on a line with a blank line on each side.
- **Title slide** carries the window: `Changes from {{ window.from }} to {{ window.to }}`.
  When `window.baseline_source == "history"`, add a small note line
  `Baseline reconstructed from item history.`
- **Headline slide** shows movement as `from → to` for percent complete and remaining, plus
  a one-line scope read. Embed a Mermaid ` ```mermaid ` `pie` chart titled
  `What changed` over the counts of shipped / started / added / newly-at-risk (omit any
  slice whose count is 0; if every slice is 0, drop the chart and render
  `No movement in this window.`). Show `pct_by_points` movement in parentheses only when
  `delta.headline.pct_by_points != null`.
- **What shipped** is the headline section: render `delta.shipped` as bulleted detail lines,
  one per item, ordered as delivered value. This is the slide people read first.
- Item lists (What shipped, Newly started, Scope change, regressed) render as **bulleted
  detail lines**, one per item:
  `- **#<id> <title>** (<owner>[, <pts> pts]). <blurb>`
  Omit empty parenthetical parts; omit the trailing `. <blurb>` when `blurb` is `""`. For
  What shipped and Newly started, append the transition: `... _(<from_state> → <to_state>)_`.
  For added items append `... _(added, <state>)_`; for regressed append
  `... _(<from_state> → <to_state>)_`. Fit ~8 items per slide; when a section has more,
  **paginate** onto `<Section> (cont.)` slides until every item shows. Never silently drop
  shipped / started / added items.
- **Scope change slide** lists Added then Removed (removed items show `last_state`). If both
  are empty, render `No scope change in this window.`
- **Newly blocked / stale / regressed slide** groups the three short lists under labeled
  sub-headings. If all three are empty, render a single line `No new risk in this window. 🎉`
  (keep the slide; it is reassuring in a readout). If any single list exceeds ~8, show the
  first 8 and add `- _+<n> more_` (risk is a call to action, not an archive).
- Every number comes straight from `delta`; never recompute or reconcile.

## Writing rules

- Slide text is terse: numbers, IDs, titles. No prose paragraphs, no filler.
- Never use em dashes or spaced hyphens as separators. Use `→` for transitions and movement.
- No LLM vocabulary: delve, leverage, robust, seamlessly, comprehensive, nuanced, elevate,
  foster, paradigm, ecosystem, holistic, innovative, synergy, empower, facilitate.
- Do not add slides, footnotes, or commentary beyond the template.
- Do not fabricate any value; render only what's in `delta`.

## Anti-patterns

- Do not embed raw HTML for charts; use the Mermaid fence so it stays portable.
- Do not compute or re-classify anything; if a number or transition looks off, that is
  `delta-analyzer`'s job, not this skill's. Render faithfully.
- Do not print the deck contents back to the user; return the path. The agent summarizes.
