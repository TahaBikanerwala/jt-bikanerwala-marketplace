# Delta template

The canonical structure `delta-narrator` emits. Placeholders in `{{ }}` are filled from the
delta model. Slide separators are `---` alone on a line. This is a worked example; adapt the
values, keep the shape.

## Front matter + slides

````markdown
---
marp: true
theme: default
paginate: true
---

# {{ sprint.name }} · Progress delta

**Changes from {{ window.from }} to {{ window.to }}**
Team: {{ team }} · Generated {{ today }}

<!-- when window.baseline_source == "history", add: -->
_Baseline reconstructed from item history._

---

## Where the sprint moved

```mermaid
pie showData
    title What changed
    "Shipped" : {{ shipped|length }}
    "Started" : {{ started|length }}
    "Added" : {{ added|length }}
    "New risk" : {{ newly_blocked|length + newly_stale|length }}
```

**{{ headline.pct_by_count.from }}% → {{ headline.pct_by_count.to }}% complete**{{ " ({{ headline.pct_by_points.from }}% → {{ headline.pct_by_points.to }}% by points)" when pct_by_points != null }} ({{ headline.pct_by_count.delta|+ }})
· Remaining {{ headline.remaining_count.from }} → {{ headline.remaining_count.to }} items{{ " ({{ headline.remaining_points.from }} → {{ headline.remaining_points.to }} pts)" when remaining_points != null }}
· Scope {{ headline.scope.added|+ }} added, {{ headline.scope.removed }} removed{{ " ({{ headline.scope.net_points|+ }} pts net)" when net_points != null }}

<!-- when every pie slice is 0, drop the chart and render: No movement in this window. -->

---

## What shipped

{{ for item in shipped }}- **#{{ item.id }} {{ item.title }}** ({{ item.assignee }}{{ ", {{ item.points }} pts" when points }}). {{ item.blurb }} _({{ item.from_state }} → {{ item.to_state }})_
{{ endfor }}

<!-- when shipped is empty: Nothing moved to Done in this window. -->

---

## Newly started

{{ for item in started }}- **#{{ item.id }} {{ item.title }}** ({{ item.assignee }}{{ ", {{ item.points }} pts" when points }}). {{ item.blurb }} _({{ item.from_state }} → {{ item.to_state }})_
{{ endfor }}

<!-- when started is empty: Nothing newly started in this window. -->

---

## Scope change

**Added**

{{ for item in added }}- **#{{ item.id }} {{ item.title }}** ({{ item.assignee }}{{ ", {{ item.points }} pts" when points }}). {{ item.blurb }} _(added, {{ item.state }})_
{{ endfor }}

**Removed**

{{ for item in removed }}- **#{{ item.id }} {{ item.title }}** ({{ item.assignee }}). _(was {{ item.last_state }})_
{{ endfor }}

<!-- when added and removed are both empty: No scope change in this window. -->

---

## New risk & regressions

**Newly blocked**

{{ for item in newly_blocked }}- **#{{ item.id }} {{ item.title }}** _({{ item.reason }})_
{{ endfor }}

**Newly stale**

{{ for item in newly_stale }}- **#{{ item.id }} {{ item.title }}** _(stale {{ item.days_since_update }}d)_
{{ endfor }}

**Regressed**

{{ for item in regressed }}- **#{{ item.id }} {{ item.title }}** _({{ item.from_state }} → {{ item.to_state }})_
{{ endfor }}

<!-- when newly_blocked, newly_stale, and regressed are all empty: No new risk in this window. 🎉 -->
````

## Rules recap

- Item lines: `- **#<id> <title>** (<owner>[, <pts> pts]). <blurb>`. Drop empty parenthetical
  parts; drop the `. <blurb>` when blurb is `""`. What-shipped / newly-started append
  `_(<from_state> → <to_state>)_`; added appends `_(added, <state>)_`; regressed appends
  `_(<from_state> → <to_state>)_`.
- Unassigned owner: write `unassigned` inside the parenthetical rather than leaving it blank.
- Deltas: show a signed number for movement (`+7`, `-2`). Use `→` for from/to, never a
  spaced hyphen or em dash.
- Long lists (> ~8 items): paginate onto `<Section> (cont.)` slides until all items show. Do
  not truncate What shipped / Newly started / Added. The risk lists each truncate at 8 with
  `- _+<n> more_`.
- Pie chart: omit any slice with count 0. If every slice is 0, drop the chart and render
  `No movement in this window.` in the headline slide.
- `history` baseline: add `_Baseline reconstructed from item history._` under the title.
- Empty sections render their stated fallback line; keep the slide.

## Export (run by the agent, not this skill)

```
npx @marp-team/marp-cli "<path>" --pptx    # or --pdf
```
