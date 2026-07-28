# Deck template

The canonical structure `deck-composer` emits. Placeholders in `{{ }}` are filled from the
metrics model. Slide separators are `---` alone on a line. This is a worked example; adapt
the values, keep the shape.

## Front matter + slides

````markdown
---
marp: true
theme: default
paginate: true
---

# {{ sprint.name }}

**{{ sprint.start }} → {{ sprint.end }}**
Team: {{ team }} · Generated {{ today }}

---

## Summary

```mermaid
pie showData
    title Work items by state
    "Done" : {{ totals.by_bucket.done.count }}
    "In Progress" : {{ totals.by_bucket.in_progress.count }}
    "To Do" : {{ totals.by_bucket.todo.count }}
```

**{{ progress.pct_by_count }}% complete**{{ " ({{ progress.pct_by_points }}% by points)" when basis==points }}
· {{ progress.remaining_count }} items remaining{{ " ({{ progress.remaining_points }} pts)" when basis==points }}
· {{ at_risk|length }} at risk

---

## Completed this sprint

{{ for item in completed }}- **#{{ item.id }} {{ item.title }}** ({{ item.assignee }}{{ ", {{ item.points }} pts" when points }}). {{ item.blurb }}
{{ endfor }}

---

## In progress

{{ for item in in_progress }}- **#{{ item.id }} {{ item.title }}** ({{ item.assignee }}{{ ", {{ item.points }} pts" when points }}). {{ item.blurb }} _(idle {{ item.days_since_update }}d)_
{{ endfor }}

---

## Blocked / at risk

{{ for item in at_risk }}- **#{{ item.id }} {{ item.title }}** ({{ item.assignee }}). {{ item.blurb }} _({{ item.reason }})_
{{ endfor }}

<!-- when at_risk is empty, replace the list with: -->
Nothing blocked or stale. 🎉

---

## Up next

{{ for item in up_next }}- **#{{ item.id }} {{ item.title }}** ({{ item.assignee }}{{ ", {{ item.points }} pts" when points }}). {{ item.blurb }}
{{ endfor }}

---

<!-- Capacity slide: render ONLY when metrics.capacity_summary != null -->
## Capacity

{{ capacity_summary.note }}

| Member | Capacity |
|---|---|
{{ for m in capacity_summary.per_member }}| {{ m.user }} | {{ m.capacity }} |
{{ endfor }}
````

## Rules recap

- Item lines: `- **#<id> <title>** (<owner>[, <pts> pts]). <blurb>`. Drop empty parenthetical
  parts; drop the `. <blurb>` when blurb is `""`. In progress appends `_(idle <n>d)_`;
  at-risk appends `_(<reason>)_`.
- Unassigned owner: write `unassigned` inside the parenthetical rather than leaving it blank.
- Long lists (> ~8 items): paginate onto `<Section> (cont.)` slides until all items show.
  Do not truncate Completed / In progress / Up next. Only Blocked/at-risk truncates
  (`- _+N more at risk_`) since it's a call to action, not an archive.
- Pie chart: omit any bucket with count 0 from the `pie` block, but keep it in the headline.
- Empty sprint: emit only the title slide and one Summary slide reading
  `No work items in this sprint.`; skip every list slide and the capacity slide.

## Export (run by the agent, not this skill)

```
npx @marp-team/marp-cli "<path>" --pptx    # or --pdf
```
