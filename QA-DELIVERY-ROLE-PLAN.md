# QA → Delivery/Requirements Role: Free Tools + AI Skills to Build

## Context

You're a QA on the Rolai team who's been handed product-adjacent responsibilities with no formal training. In your words, the job is three things:

1. **Get requirements** — capture what needs building, clearly enough that the team can act.
2. **Stay updated on team progress** — how much is done, how much remains.
3. **Create status-report presentations** — communicate that progress upward/outward.

Good news: this is **not** the full Product Owner job (you're not owning roadmap, prioritization, or business strategy — don't let anyone quietly hand you that without a title). What you described is closer to a **delivery coordinator + business analyst** blend. All three of your functions map cleanly onto tools and automation you *already have access to* in this environment:

- Your team runs on **Azure DevOps** (git remote `rolaillc/Rolai`, `#<workItemId>` commit convention, azure-pipelines CI).
- This Claude Code setup already has the **Azure DevOps integration wired in** (`.mcp.json`) — Claude can read work items, sprints/iterations, team capacity, backlogs, PRs, pipelines, wiki, and test plans directly.
- Custom **AI skills** are tiny to author: a folder + a `SKILL.md` file. They turn a repeatable chore ("build this week's sprint report") into a one-line command.

This plan is **recommendations only**. It gives you (A) free tools per function, and (B) a set of personal AI skills to build later, with the exact recipe.

---

## Part A — Free tools, mapped to your three functions

### 1. Getting requirements
| Tool | Why | Cost |
|---|---|---|
| **Azure DevOps Boards** (already have) | Where requirements *become* work items (Epics → Features → User Stories → Tasks). This is your system of record — write requirements here, not in scattered docs. | Free (existing license) |
| **Notion** (personal) | Draft/park half-formed requirements, meeting notes, and stakeholder asks before they're ready to become work items. Already reachable from this Claude setup. | Free personal tier |
| **Excalidraw / draw.io** | Sketch flows and screens when words aren't enough for a requirement. | Free |
| **Mermaid** (diagrams-as-code) | Flowcharts/sequence diagrams written as text — render inside Azure Wiki *and* your Marp slides. No separate tool to manage. | Free |

**Key habit:** a good requirement = *title + why (user/business goal) + acceptance criteria + explicitly out-of-scope.* Acceptance criteria are testable statements — which is exactly the QA muscle you already have. This is your unfair advantage in the role.

### 2. Tracking progress (done vs remaining)
Lean on **Azure DevOps built-ins first** — they're free and already populated:

- **Sprint / Iteration Backlog + Taskboard** — live done/doing/todo per sprint.
- **Sprint Burndown** and **Cumulative Flow Diagram** (Analytics widgets) — the "how much remains" charts, auto-generated. Add them to a **Dashboard**.
- **Delivery Plans** — timeline/Gantt view across sprints for the "when will it be done" question.
- **Shared Queries** — save a WIQL query (e.g. "all items in current sprint by state") once, reuse forever. Your AI skills will run these for you.

Supplement:
- **Loom** (free tier) — 5-min async video walkthroughs of status instead of a meeting.

### 3. Status-report presentations
- **Marp** (your pick) — write slides in Markdown, export to HTML/PDF/**PPTX**. Free, version-controllable, and an AI skill can *generate the markdown for you*.
  - Install the **"Marp for VS Code"** extension (live preview + one-click export), or the **`@marp-team/marp-cli`** for terminal/PDF/PPTX export.
  - Supports themes, speaker notes, and embedded Mermaid diagrams.
- **Gamma** (freemium) — keep in your back pocket for a fancier AI-generated deck when a leadership readout needs polish beyond Marp's templates.

---

## Part B — AI skills to build (personal, `~/.claude/skills/`)

These live in **`/home/taha/.claude/skills/<name>/SKILL.md`** — private to your machine, no PR needed. Each is a folder with one `SKILL.md`:

```markdown
---
name: skill-name-in-kebab-case
description: One sentence — what it does AND when to trigger it. This is what Claude matches against.
user-invocable: true          # lets you call it as /skill-name
allowed-tools: ...             # optional; omit to allow all
---

# Instructions Claude follows when the skill runs
Step-by-step prose. Reference the Azure DevOps tools to call, the output format, etc.
```

The `description` is the most important line — it's how Claude decides when to fire the skill. Model these on skills you already have (`bee:spec-writer`, `issue-triage`, `jira-ticket-refiner`) — open one to copy the structure.

### Recommended skills, in build order

**1. `sprint-status-report` — the flagship.** *Highest value; build this first.*
- **Does:** Reads the current Azure DevOps iteration, tallies work items by state (Done / In Progress / To Do / Blocked), computes % complete and remaining count, flags stale or blocked items, then emits a **Marp markdown deck** ready to export.
- **Tools it uses:** `work_list_iterations` / `work_list_team_iterations` (find current sprint) → `wit_get_work_items_for_iteration` or a WIQL query via `wit_query_by_wiql` → `wit_get_work_items_batch_by_ids` (details) → optionally `work_get_team_capacity` (capacity vs load).
- **Output:** A `.md` file with `---` slide separators: title slide, summary (donut/numbers), "Completed this sprint," "In progress," "Blocked/at risk," "Up next." You then run Marp to get PPTX/PDF.
- **Why first:** collapses your weekly reporting chore into one command.

**2. `progress-delta` — "what changed since last report."**
- **Does:** Compares work-item states between now and a date you give, so your status update leads with *movement* ("3 stories closed, 1 newly blocked") instead of a static snapshot.
- **Tools:** `wit_list_work_item_revisions` / `wit_query_by_wiql` with `System.ChangedDate` filters.
- **Why:** stakeholders care about the delta, not the whole board.

**3. `requirement-refiner` — turn a rough ask into a clean work item.**
- **Does:** Takes a vague requirement (a Slack message, a sentence from a meeting) and structures it into title + user-goal + **testable acceptance criteria** + out-of-scope + open questions. Optionally creates/updates the Azure DevOps work item.
- **Tools:** `wit_create_work_item` / `wit_update_work_item` (writes — keep a confirm step), `search_workitem` (dedupe against existing).
- **Note:** You already have `bee:spec-writer`, `bee:discover`, and `issuekit:tracker-adapter` installed — try those *before* building this. They may cover it; build a custom one only if you want it Azure-DevOps-specific and lighter.

**4. `release-notes` (optional, later).**
- **Does:** Summarizes merged PRs / completed items in a window into human-readable release notes or a "what shipped" slide.
- **Tools:** `repo_list_pull_requests_by_repo_or_project`, `wit_query_by_wiql`.

### Skills/plugins you already have — use before building
- **`bee:discover`** — PM-style interview that produces a shareable requirements doc. Great for the "get requirements" function.
- **`bee:spec-writer`** — turns discovery into a testable, sliced spec.
- **`issue-triage:triage`** / **`issuekit:tracker-adapter`** — investigate + refine a work item; tracker-agnostic (works with Azure DevOps).
- **`dataviz`** skill — load it whenever a report needs a chart, so your slides look consistent.

---

## Suggested rollout (low-risk, incremental)

1. **Week 1 — tooling:** Install Marp (VS Code extension). Build an Azure DevOps **Dashboard** with a Sprint Burndown + CFD widget. Save one **Shared Query** for "current sprint items." No skills yet — just get the raw views working.
2. **Week 2 — flagship skill:** Author `sprint-status-report`. Iterate on the Marp template until one command gives you a deck you'd actually present.
3. **Week 3 — augment:** Add `progress-delta`. Try `bee:discover` on a real incoming requirement before deciding whether to build `requirement-refiner`.
4. **Ongoing:** Add `release-notes` and a shared Marp theme only if the need is real (YAGNI).

---

## Verification (how to prove each piece works)

- **Marp:** Install the VS Code extension → create a throwaway `test.md` with two `---`-separated slides → confirm live preview renders → export to PDF/PPTX from the command palette. (Or `npx @marp-team/marp-cli test.md --pdf`.)
- **Azure DevOps access from Claude:** Ask Claude *"list the work items in the current sprint"* — it should call the Azure DevOps tools and return real items. If that works, every tracking skill will work.
- **`sprint-status-report` skill:** After authoring it, run `/sprint-status-report`, confirm it produces a `.md` deck whose numbers match your Azure DevOps board, then Marp-export it and eyeball the slides.
- **`requirement-refiner`:** Feed it one messy requirement; confirm the output has title + acceptance criteria + out-of-scope, and that any work-item write happens only after a confirmation prompt.
- **Dashboard/queries:** Open the Azure DevOps dashboard; confirm burndown trends down over the sprint and the shared query returns the expected item set.

---

## Notes / decisions baked in
- **Scope = "Just me":** all skills go in `~/.claude/skills/`, uncommitted. If a teammate loves one later, promote it into the repo's `.claude/skills/` via a PR.
- **Presentations = Marp** (markdown → slides), per your choice. Gamma is the fallback for high-polish decks.
- **Writes are gated:** any skill that *creates/edits* Azure DevOps work items must confirm before writing — reports are read-only and safe to run anytime.
