# jt-bikanerwala-marketplace

A Claude Code plugin marketplace by [Taha Bikanerwala](https://github.com/TahaBikanerwala).

## Install

```
/plugin marketplace add github.com/TahaBikanerwala/jt-bikanerwala-marketplace
```

Then install any plugin from the table below:

```
/plugin install <plugin-name>
```

## Available plugins

| Plugin | Version | What it does |
|--------|---------|--------------|
| [`jira-issue-triage`](./plugins/jira-issue-triage/) | 1.3.0 | Subagent that triages Jira issues across all archetypes (Bug, Incident, Feature, Task, Spike): assigns, runs the matching investigation skill, refines the title and description, posts an archetype-appropriate assessment comment, and DMs you a summary. Bundles `issue-investigator` (Bug/Incident), `requirements-investigator` (Feature/Task/Spike), `jira-ticket-refiner` (any archetype), and `prose-style` (writing-rule application on refined output and comments). Ships a `/jira-issue-triage:setup` wizard for first-time configuration. |

## What changed in 1.3.0

UX pass on the 1.2.0 confirmation gate. Three changes you'll notice as you triage tickets:

- **Faster Phase 3.** The confirmation panel now batches its decisions into a single `AskUserQuestion` call instead of 3-5 sequential modals. Today's flows show 2-3 questions side by side (post comment? refine description? plus story-point estimate when configured, or tag approval when a follow-up is proposed; story-points and tag-approval are mutually exclusive). One read, one set of clicks. The schema's 4-question cap leaves headroom for future expansion.
- **One approval per decision, not two.** Phase 5 no longer re-asks "approve the refined description?" after Phase 3's "should I refine?". The cleaned output renders inline as an informational preview, then writes after a configurable pause (default 3 seconds; set `description_preview_pause_seconds` to taste). Users who want a second checkpoint can opt in per run via the "Other" channel on Phase 3 question 2.
- **Per-archetype assignment is yours to set.** New `archetype_assignment_after_triage` config maps each archetype (`Bug`, `Incident`, `Feature`, `Task`, `Spike`) to either `"unassign"` (return to team pool) or `"self"` (keep with the triager). Defaults match 1.2.0. Common overrides:
  - **On-call team for incidents:** `"Incident": "unassign"`. Sev-1 tickets auto-route to whoever's on-call instead of staying with the triager.
  - **Triager owns bug fixes:** `"Bug": "self"`. Use this when bug triage and bug fixing are the same person.

Other refinements in this release: invalid `archetype_assignment_after_triage` values fall back to defaults with a warning instead of breaking the run; the Phase 3 revision loop caps at 3 rounds with an explicit "approve as-is or abort" exit; the agent body now leads with a Working State glossary and a Skill calling-context conventions section so the runtime LLM tracks state as concrete values; the setup wizard's saved JSON now includes the new advanced config keys with their defaults so the file is browsable; and the Phase 5 jira-ticket-refiner invocation uses a `Calling context: skip_preview=true.` prefix to suppress the skill's own gate, removing the third confirmation that previously snuck in.

No migration steps. Existing configs without `archetype_assignment_after_triage` or `description_preview_pause_seconds` get the 1.3.0 defaults applied at runtime: the assignment defaults preserve 1.2.0 behavior (Bug unassigns, others stay), and `description_preview_pause_seconds` defaults to `3` (the pause is new in 1.3.0; 1.2.0 had no equivalent setting).

## What changed in 1.2.0

The Phase 3 confirmation gate splits into separate questions: post the proposed comment? refine the title and description? You can approve one and skip the other; metadata writes (severity, sprint, labels, links) and the final transition + Slack DM still run regardless. Phase 9's assignee behavior also gates on archetype: **Bug** unassigns (returns to the team pool, since bug triage is a routing role); **Incident, Feature, Task, and Spike** stay assigned to you, since the running user is typically the owner who keeps the work. Phase 10's Slack DM messages now state the assignment outcome explicitly.

Internal cleanups: setup wizard now uses the correct `AskUserQuestion` tool name and declares `allowed-tools`; the agent's Phase 0 fetch includes `comment` in the field list instead of relying on a non-existent `expand` parameter; `prose-style` skill frontmatter is normalized to match the other three bundled skills.

No migration steps. Re-install the plugin to pick up the new behavior.

## What changed in 1.1.0

The `prose-style` skill graduates from the Roadmap into the bundled set. The triage workflow now calls a real skill instead of relying on the inline writing-rules fallback at two points: Phase 2.5 styles the assessment/scope comment draft and any reporter follow-up so the user reviews a styled version at the Phase 3 confirmation gate, and Phase 5 styles the refined title and description after `jira-ticket-refiner` runs. AI tells (em dashes, opener phrases, LLM vocabulary, bullet sprawl) get stripped on the way out. The agent body keeps a defensive inline fallback at both invocation points for the rare runtime load failure.

No migration steps. Re-install the plugin to pick up the new bundled skill.

## What changed in 1.0.0

The plugin (formerly `jira-bug-triage`) was renamed and expanded to handle all Jira archetypes, not just Bugs. The agent (formerly `bug-triage-agent`) is now `jira-issue-triage`. A new bundled skill `requirements-investigator` joins the existing two for non-bug archetypes. A `/jira-issue-triage:setup` wizard prompts for configuration on first run, and the agent body has an inline first-run wizard fallback for users who skip the slash command.

Migration: `/plugin uninstall jira-bug-triage` then `/plugin install jira-issue-triage`. The legacy config file path (`.claude/jira-bug-triage.config.json`) keeps working for one minor version (1.x) with a deprecation warning.

## Roadmap

No additional plugins are planned at this time. PRs and feature requests welcome.

## Author

[Taha Bikanerwala](https://github.com/TahaBikanerwala)

## License

MIT: see [`LICENSE`](./LICENSE).
