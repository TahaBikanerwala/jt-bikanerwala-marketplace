# jtb

One command for the whole marketplace. Hand `/jtb` a ticket, a pull request, pasted notes, or nothing,
and it finds the agents that fit, asks which one you want, runs it, then offers the step that follows.
It keeps going until you say done.

```
/jtb 1234
```

```
What should I do with 1234?
  1. Test it            Runs it in a real browser like a senior QA ...
  2. Triage it          Full triage of any work item type ...
  3. Clean it up        Rewrites the title and description ...
  4. More actions       Write acceptance tests, Draft a test plan, Write the postmortem, ...
```

Say what you want in the same line and the first question is skipped:

```
/jtb 1234 clean it up
```

That runs `/issue-triager:investigate-and-refine 1234`. When it finishes you are asked what next
(`Test it`, `Triage it`, `Done`). Pick `Test it` and `qa-tester` runs; if it files bugs, the next card
offers to triage them. Each step is one card.

Installing `jtb` installs every other plugin in the marketplace, so this one install and this one
command are all you need.

## Install

```
/plugin marketplace add TahaBikanerwala/jt-bikanerwala-marketplace
/plugin install jtb@jt-bikanerwala-marketplace
```

The plugins it routes to still need their MCPs (a tracker MCP for most, a browser for `qa-tester`).
See the [marketplace README](../../README.md#configure-your-mcps).

## Usage

```
/jtb 1234                                  a ticket: asks what to do
/jtb PROJ-456 triage                       a ticket and an intent: runs it
/jtb https://github.com/org/app/pull/321   a pull request
/jtb #321 test it --env staging            flags pass straight through to the agent
/jtb Checkout crashes when a coupon is applied twice
/jtb ./notes/kickoff-transcript.md
/jtb sprint status
/jtb                                       asks what you are working on
```

`/jtb` is the short form of `/jtb:jtb`. Both work; the short form is available as long as no other
command in your setup is also called `jtb`.

## What it routes to

| You hand it | It offers |
|---|---|
| A ticket | Test it, Triage it, Clean it up, Write acceptance tests, Draft a test plan, Write the postmortem, Rewrite as bug report, Summarize for clients, Review AC coverage, Preview a bug report |
| A pull request | Test it, Draft a test plan |
| Pasted text or a document | Write acceptance tests, Report a bug, Draft user stories, Review AC coverage, Preview a bug report |
| A UI source path | Audit test ids, Add missing test ids |
| Nothing | Sprint status deck, Refresh Pulse dashboard, What changed this sprint, Summarize for clients, Audit test ids, Add missing test ids, Set up QA environments |

A card shows at most four options, so longer lists page through `More actions`. You can always type
what you want instead of picking.

## The chains

After each agent finishes, `jtb` offers only the follow-ups that make sense for what just happened:

| After | It offers |
|---|---|
| Clean it up | Test it, Triage it, Write acceptance tests (stories) |
| Test it | Triage the bugs the run filed; Report a bug for defects that were never filed |
| Triage it | Write acceptance tests (stories), Test it (when the change is built), Write the postmortem (incidents) |
| Report a bug | Triage that bug |
| Draft user stories | Write acceptance tests or Triage, for each story created |
| Draft a test plan | Test it |
| Write the postmortem | Draft user stories from its action items |
| Audit test ids | Add missing test ids |

It never offers a step you already ran on the same item or one you declined.

## What it deliberately does not do

- **It does no agent's work.** It never reads the ticket, tests, investigates, or writes a report. It
  invokes the plugin's own command, exactly as if you had typed it.
- **It writes nothing to the tracker.** Every write still passes through the gate of the agent that
  owns it. `jtb` never answers a gate for you.
- **It does not fetch the ticket to guess its type.** It routes on what you handed over and what you
  said. That keeps the first card instant. An action that turns out not to fit the item says so itself.

## How it works

`jtb` is a skill that runs in the main conversation, not a subagent. That is what lets its cards reach
you directly and lets it start one agent after another. Its routing lives in one file,
[`skills/jtb/registry.json`](./skills/jtb/registry.json): every action with the command it invokes, what
it accepts, the words that select it, and what to offer next.

## Adding a new agent

1. Add an action to `registry.json` for each command the new plugin ships: `id`, `command`, `label`
   (five words at most), `description`, `accepts`, `intents`, `next`. Position in the file is position
   in the menu.
2. Add `next` entries on existing actions where the new one is a natural follow-up.
3. Add the plugin to `dependencies` in [`plugin.json`](./.claude-plugin/plugin.json) and bump the `jtb`
   version, or installed copies never see the new route.
4. Run `node scripts/check-jtb-registry.mjs` from the repo root.

That check also runs in CI on every pull request. It fails when a plugin ships a command the registry
does not route, when a route points at a command that no longer exists, when a follow-up names an
unknown action, or when `jtb` does not depend on a routed plugin at a version range that allows its
current version.

Until the registry catches up, `/jtb` still runs a new command when you name it in full, and tells you
it has no route for it yet.

### Trying a change locally

`jtb` loads only when every plugin it depends on is loaded too. `claude --plugin-dir ./plugins/jtb` on
its own silently gives you no `/jtb`. Pass every plugin folder:

```
claude --plugin-dir ./plugins/jtb --plugin-dir ./plugins/issuekit --plugin-dir ./plugins/qa-tester ...
```
