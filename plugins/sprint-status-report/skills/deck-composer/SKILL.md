---
name: deck-composer
description: "Renders a sprint metrics model into a Marp markdown deck (title, summary with a Mermaid pie chart, completed, in-progress, blocked/at-risk, up-next, and an optional capacity slide) and writes it to the configured output directory. Pure rendering, no tracker access. Invoked by the sprint-status-report agent after sprint-analyst."
metadata:
  author: Taha Bikanerwala
tools: Read, Write
---

# Deck Composer

Render the metrics model from `sprint-analyst` into a [Marp](https://marp.app/) markdown
deck and write it to disk. Pure rendering: no tracker access, no computation beyond
formatting. The exact slide contract lives in `references/deck-template.md`.

## Input

```json
{
  "sprint":  { "name", "start", "end" },
  "metrics": <the sprint-analyst metrics model>,
  "today":   "YYYY-MM-DD",
  "output_directory": "<path>"
}
```

`today` is supplied by the caller (skills cannot read the clock). It appears in the footer
and the filename.

## Output

1. Write a Marp markdown file and **return only its path** as the skill result.
2. Filename: `sprint-report-<slug>-<today>.md`, where `<slug>` is `sprint.name`
   lowercased, spaces and punctuation collapsed to single hyphens, trimmed
   (`"Sprint 42 - Payments"` → `sprint-42-payments`).
3. Directory: `output_directory`. Create it if it does not exist (Write creates parent
   dirs). Never overwrite silently: if a file with that exact name exists, append `-2`,
   `-3`, ... to the slug until the name is free, and note the final name in the returned
   path.

## Rendering rules

Follow `references/deck-template.md` exactly for structure. Key rules:

- The file starts with a Marp front-matter block (`marp: true`, `theme: default`,
  `paginate: true`) fenced by `---` on its own lines, then the slides.
- Slides are separated by `---` alone on a line with a blank line on each side.
- The summary slide embeds a Mermaid ` ```mermaid ` `pie` chart of the three bucket counts.
  This keeps the deck self-contained: Marp renders Mermaid natively, so no external
  charting is needed. Omit any bucket whose count is 0 from the pie (a 0-slice renders ugly)
  but keep it in the headline numbers.
- Item lists (Completed, In progress, Up next, Blocked/at-risk) render as **bulleted detail
  lines**, one per item, so each ticket carries a brief description:
  `- **#<id> <title>** (<owner>[, <pts> pts]). <blurb>`
  Omit the `(...)` parenthetical parts that are empty (no owner, no points), and omit the
  trailing `. <blurb>` entirely when `blurb` is `""`. For In progress, append the idle time:
  `... <blurb> _(idle <n>d)_`. For Blocked/at-risk, end with the reason: `... _(<reason>)_`.
  Fit ~8 items per slide. When a section has more, **paginate** rather than truncate: emit
  continuation slides titled `<Section> (cont.)` until every item is shown. The one
  exception is Blocked/at-risk, which should stay short by nature; if it somehow exceeds ~8,
  show the first 8 and add `- _+<n> more at risk_` (at-risk is a call to action, not an
  archive). Never silently drop completed/in-progress/up-next items.
- Percentages come straight from `metrics.progress`; show `pct_by_count` always, and
  `pct_by_points` in parentheses when `metrics.progress.basis == "points"`.
- The Blocked / at-risk slide: if `metrics.at_risk` is empty, render the slide with a single
  line `Nothing blocked or stale. 🎉` (keep the slide; it's reassuring in a readout).
- The Capacity slide is rendered **only when** `metrics.capacity_summary != null`. Omit the
  slide entirely otherwise (do not leave a placeholder).
- Empty sprint (`metrics.totals.count == 0`): render Title + a single Summary slide stating
  no items are in the sprint, and stop. No item slides.

## Writing rules

- Slide text is terse: numbers, IDs, titles. No prose paragraphs, no filler.
- Never use em dashes or spaced hyphens as separators.
- Do not add slides, footnotes, or commentary beyond the template.
- Do not fabricate any value; render only what's in `metrics`.

## Anti-patterns

- Do not embed raw HTML for charts; use the Mermaid fence so it stays portable.
- Do not compute or re-bucket anything; if a number looks off, that's `sprint-analyst`'s
  job, not this skill's. Render faithfully.
- Do not print the deck contents back to the user; return the path. The agent summarizes.
