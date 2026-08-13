# ticket-summarizer

Pulls Azure DevOps or Jira work items and turns each into a concise, plain-language
summary suited for a client-update deck: what was delivered and, only when the ticket
itself says why, why it matters. Each summary targets one to two sentences, extending
to three or four only as a last resort when two are not enough to say it accurately.

Auto-installs [`issuekit`](../issuekit/); bring your own MCPs.

## Install

```
/plugin marketplace add github.com/TahaBikanerwala/jt-bikanerwala-marketplace
/plugin install ticket-summarizer
```

You need at least one tracker MCP configured (`@azure-devops/mcp` or the Atlassian
MCP). See the [root README](../../README.md#configure-your-mcps).

## Usage

```
/ticket-summarizer:run AB#1234 AB#1235
/ticket-summarizer:run --from 2026-07-01 --till 2026-07-31 --status delivered
/ticket-summarizer:run --status active
```

| Input | What happens |
|---|---|
| Ticket ids/urls, pasted | Fetches each directly, no search. |
| `--status active` | Everything in the tracker's "in progress" bucket. No date range needed. |
| `--status delivered` (or `closed`) + `--from`/`--till` | Everything whose resolved/closed date falls in the window. |
| `--from`/`--till`, no `--status` | Everything whose *updated* date falls in the window, any state. |

Every query-mode shape above is scoped to Story, Bug, Epic, and (on Azure DevOps)
Feature types only, always; this keeps a client-facing summary to the units
stakeholders care about, not internal Task-level work, and is not configurable per
run. Pasted ticket ids/urls are exempt: you get back exactly what you named,
regardless of its type. Jira has no standard Feature-equivalent type, so a Jira
query stays at Story/Bug/Epic unless `.claude/tracker-policy.json` sets
`feature_work_item_type.jira`.

`--project <name>` and `--scope <area-path-or-component>` narrow any query-mode
search. `--tags <name>[,<name>...]` narrows the result to items with a matching
label (case-insensitive substring — `--tags ecw` matches `"ECW"`, `"ECW Story"`,
and `"ECW Bug"` alike, never an exact-match comparison; always filtered client-side
after the fetch on both trackers: Azure DevOps' WIQL `CONTAINS` on tags matches
whole tokens, not substrings within a multi-word tag, so it can't be pushed into
the search without silently missing real matches). `--detailed` fetches a richer
field set per item (assignee, exact state, parent) instead of the fast default.

## What it does

1. Detects the active tracker MCP through `issuekit:tracker-adapter`.
2. Resolves the item set: one batched fetch (never one call per item), narrowed by
   default to just the fields this plugin actually uses (`--detailed` widens that).
   Direct fetch for pasted references (any type), or a state-filtered,
   Story/Bug/Epic (plus Feature on Azure DevOps)-only search narrowed to the exact
   date window for a query (the tracker-adapter's search verb only filters by
   created date, so this plugin fetches full items and checks the requested date
   field itself); `--tags` always filters client-side after the fetch, on both
   trackers.
3. Runs every item through `executive-blurb-writer`: one sentence on what changed, a
   second sentence only when the ticket's own text supports a why-it-matters claim,
   and (last resort only) a third or fourth sentence when two genuinely are not
   enough to say it accurately.
4. Prints the summaries as bullets, grouped by status for query-mode runs.
5. Offers to send the same summary to Slack or Teams: yourself by default, or the
   target named with `--to` (a person's email, or a channel/group id or name).
   Always asks first whether to send, and whether to include ticket ids.
6. When `--output <path>` is given, offers to save the same summary to that file
   too, asking before overwriting if the path already exists.

## What it deliberately does not do

- No tracker writes, ever.
- No chat send without asking first, and never to anywhere but yourself unless
  `--to` names the target explicitly.
- No file save without asking first, and never without `--output` naming a path;
  there is no default file destination.
- No generated slide deck or PPTX file. Output is plain markdown bullets; see
  [`sprint-status-reporter`](../sprint-status-reporter/) for an actual Marp/PPTX deck
  instead.
- No invented business value. A ticket that states no rationale gets a one-sentence
  blurb, not a padded one.

## Report format

```
Delivered (2026-07-01 to 2026-07-31)
- [AB#1234] Fixed the checkout page timing out when a coupon is applied twice.
- [AB#1240] Added CSV export for account statements, so account managers can pull client data without a manual request.

Ids in brackets are for your own traceability; strip them before this goes in front of a client.
```

## Configuration

Reads two keys from `.claude/tracker-policy.json`, shared with every other plugin
in this suite:

| Key | Default | Used for |
|---|---|---|
| `state_categories` | Agile/Scrum/Basic + Jira defaults | Translating `active`/`delivered`/`closed` into vendor state names |
| `feature_work_item_type` | `{azure-devops: "Feature"}` (no `jira` entry) | Widening the fixed query-mode type scope beyond Story/Bug/Epic, per tracker |

See [`issuekit`'s policy schema](../issuekit/skills/tracker-adapter/references/policy-schema.md)
for the full shape. Works with zero configuration.

## Bundled skills

- `executive-blurb-writer`: turns a fetched work item into a concise, one-to-two
  sentence client-facing blurb (three or four only as a last resort). Bundled here.
- `issuekit:tracker-adapter`: tracker detection, identity, and the abstract verb
  surface. Reused from `issuekit`.

## Author

[Taha Bikanerwala](https://github.com/TahaBikanerwala)

## License

MIT: see the [repository license](../../LICENSE).
