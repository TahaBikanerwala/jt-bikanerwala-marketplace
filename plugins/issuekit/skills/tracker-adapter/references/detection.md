# Detection rules

Run this at session start. Output is a 4-tuple of `(tracker, chat, doc, log)`. Cache for the session.

## Pattern table

Match against the full tool name (everything after the `mcp__` prefix family). Patterns use `*` as a wildcard. Match on **suffix**, not on the full prefix — the prefix varies based on which MCP plugin the user installed, and matching by suffix tolerates that variance.

| Pattern | Category | Adapter value |
|---|---|---|
| `*__getJiraIssue` | tracker | `jira` |
| `*__editJiraIssue` | tracker | `jira` (confirms write surface) |
| `*__wit_get_work_item` | tracker | `azure-devops` (classic tool shape) |
| `*__wit_update_work_item` | tracker | `azure-devops` (classic tool shape; confirms write surface) |
| `*__wit_work_item` | tracker | `azure-devops` (consolidated tool shape) |
| `*__wit_work_item_write` | tracker | `azure-devops` (consolidated tool shape; confirms write surface) |
| `*__slack_search_public` | chat | `slack` |
| `*__slack_search_public_and_private` | chat | `slack` |
| `*__teams_search_messages` | chat | `teams` |
| `*__searchConfluenceUsingCql` | doc | `confluence` |
| `*__search_wiki` | doc | `azure-wiki` |
| `*__wiki_search` | doc | `azure-wiki` |
| `*__search_datadog_logs` | log | `datadog` |

If a category has no match, set the value to `none`. The verb-plugin handles graceful degradation (e.g. skipping the Slack-search step when `chat == none`).

## Multi-tracker tiebreak

When both a Jira pattern (`*__getJiraIssue`) and an AzDO pattern (`*__wit_get_work_item` or `*__wit_work_item`, whichever shape matched) match, the session has access to two trackers. Resolve as follows when the verb-plugin needs to act on a specific issue:

1. **URL inference.** If the issue reference contains:
   - `dev.azure.com` or `*.visualstudio.com` → `tracker=azure-devops`
   - `*.atlassian.net` → `tracker=jira`
2. **Key shape inference** (when only a bare key is provided, no URL):
   - Matches `^[A-Z][A-Z0-9_]+-\d+$` (e.g. `PROJ-123`, `RLI-42`) → `tracker=jira`
   - Pure numeric (`12345`) with no URL → ambiguous; fall through.
3. **One-time ask.** When still ambiguous, call `AskUserQuestion` with options "azure-devops" / "jira". Cache for the session only — do not persist to `.claude/tracker-policy.json`. The next session may have a different intent.

## Single-tracker case

If only one of the two tracker patterns matches, that tracker is the resolved value. No further check needed. URLs that point at the other tracker should still be accepted — the verb-plugin can return an error explaining the missing MCP, but detection does not change.

## MCP prefix drift

User-supplied MCPs surface tools under different prefixes depending on how the server is registered, and the same prefix conventions show up on either tool-name shape:
- `mcp__azure_devops__wit_get_work_item` (classic shape)
- `mcp__ado__wit_work_item` (consolidated shape — this is the shape the official
  Microsoft Azure DevOps MCP server ships under its default `ado` registration name)
- `mcp__plugin_<user-supplied-name>__wit_get_work_item` or
  `mcp__plugin_<user-supplied-name>__wit_work_item`, depending on which server the
  user installed under that name

Suffix matching (`*__wit_get_work_item` or `*__wit_work_item`) tolerates every prefix
variant for detecting *that* the azure-devops tracker is present, regardless of
shape. Do not hardcode the prefix when checking availability, and do not assume the
`ado` name always means consolidated shape or the `azure_devops` name always means
classic shape — a user can register either server under either name. Resolve shape
by signature-tool presence (below), never by prefix name.

### Resolving which prefix to call

A session can have more than one AzDO-flavored MCP registered at once (e.g. a locally-registered `azure-devops` server plus an org-wide `ado` server pointed at a different project). Detection must resolve to exactly one literal prefix and use it for every verb call for the rest of the session — never mix prefixes mid-session, since that can silently talk to two different AzDO organizations.

Resolve by checking in this order and taking the first one whose tools are present in the current tool list:
1. `mcp__azure_devops__*`
2. `mcp__ado__*`
3. `mcp__plugin_<name>__*` (first match in tool-list order)

Cache the winning literal prefix alongside `tracker=azure-devops`. If a later verb call needs a tool the winning prefix doesn't expose (a partial install), fall through this same order to find a prefix that does expose it, complete the call, and keep the original prefix as the default for everything else — do not fail the verb just because the primary prefix is missing one tool.

### Resolving which tool-name shape to call

Independently of which literal prefix wins, an AzDO-flavored MCP server exposes its
work-item and work-tracking tools in one of two shapes. The prefix says *who
registered the server*; the shape says *what its tools are named*, and the two vary
independently — do not assume a prefix implies a shape.

- **Classic shape** — one tool per operation: `wit_get_work_item`,
  `wit_update_work_item`, `wit_create_work_item`, `wit_query_by_wiql`,
  `wit_list_work_item_comments`, `wit_add_work_item_comment`,
  `work_list_team_iterations`, and the rest of the granular names in
  `adapters/azure-devops/tools.md`'s Classic column.
- **Consolidated shape** — a handful of multi-purpose tools dispatched by an
  `action` argument: `wit_work_item` (`action: get|get_batch|list_comments|my|
  list_revisions|list_for_iteration|get_type`), `wit_work_item_write` (`action:
  create|update|update_batch|add_child`), `wit_work_item_comment_write` (`action:
  add|update`), `wit_query` (`action: get|get_results|wiql`), `work` (`action:
  list_iterations|list_team_iterations|get_team_settings|get_team_capacity|
  get_iteration_capacities`), and the rest of the granular names in
  `adapters/azure-devops/tools.md`'s Consolidated column. This is the shape the
  official Microsoft Azure DevOps MCP server (commonly registered under the `ado`
  name) ships as of 2026.

For the winning prefix from the step above, resolve the shape by checking which
signature tool it exposes, checking classic first:

1. `<prefix>__wit_get_work_item` present → `shape=classic`.
2. Else `<prefix>__wit_work_item` present → `shape=consolidated`.
3. Neither present → the prefix matched on a different tracker signal only (rare);
   treat as `shape=unknown` and let the first verb call that needs a shape-specific
   tool surface the error rather than guessing.

Cache `shape` alongside the winning prefix and reuse it for every verb call this
session — never probe per-call, and never mix shapes mid-session even if a second
AzDO-flavored MCP with a different shape is also registered. If the winning prefix
falls through to a different prefix for one missing tool (see above), re-resolve the
shape for that fallback prefix before building the call; a fallback prefix is not
guaranteed to share the primary prefix's shape.

## Announcement format

After detection completes, the agent prints one line at the start of the session:

```
tracker=azure-devops chat=teams doc=azure-wiki log=datadog
```

Use literal `none` for missing categories. This line is visible in the trace and serves as the verification anchor for the dry-run tests.

## Session refresh

Detection runs **once per session**. If the user enables a new MCP mid-conversation, the change does not take effect until the next session. Do not silently re-detect — the caching saves repeated tool-introspection cost and keeps verb behavior consistent through the run.
