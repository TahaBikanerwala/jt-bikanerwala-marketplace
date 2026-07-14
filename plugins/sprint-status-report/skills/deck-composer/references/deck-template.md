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

| ID | Title | Pts | Owner |
|---|---|---|---|
{{ for item in completed }}| {{ item.id }} | {{ item.title }} | {{ item.points or "—" }} | {{ item.assignee or "—" }} |
{{ endfor }}

---

## In progress

| ID | Title | Pts | Owner | Idle |
|---|---|---|---|---|
{{ for item in in_progress }}| {{ item.id }} | {{ item.title }} | {{ item.points or "—" }} | {{ item.assignee or "—" }} | {{ item.days_since_update }}d |
{{ endfor }}

---

## Blocked / at risk

| ID | Title | Owner | Why |
|---|---|---|---|
{{ for item in at_risk }}| {{ item.id }} | {{ item.title }} | {{ item.assignee or "—" }} | {{ item.reason }} |
{{ endfor }}

<!-- when at_risk is empty, replace the table with: -->
Nothing blocked or stale. 🎉

---

## Up next

| ID | Title | Pts | Owner |
|---|---|---|---|
{{ for item in up_next }}| {{ item.id }} | {{ item.title }} | {{ item.points or "—" }} | {{ item.assignee or "—" }} |
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

- Long lists (> ~10 rows): keep the first rows, then a final row `| … | +N more | | |`.
- Pie chart: omit any bucket with count 0 from the `pie` block, but keep it in the headline.
- `—` is the em-dash-free placeholder for a missing value; it is data, not a separator, so
  it's allowed here. (The "no em dash separator" rule is about prose punctuation.)
- Empty sprint: emit only the title slide and one Summary slide reading
  `No work items in this sprint.`; skip every list slide and the capacity slide.

## Export (run by the agent, not this skill)

```
npx @marp-team/marp-cli "<path>" --pptx    # or --pdf
```
