# Identity verb

`whoAmI()`, run once at bootstrap. Types (`Issue`, `UserRef`, `Sprint`, ...) are in `references/verbs.md`.

## `whoAmI()`
**In:** none
**Out:** `{ trackerUser: UserRef, defaultProject: string, defaultTeam: string|null, email: string|null }`
**Implements:** AzDO `core_list_projects` + `wit_my_work_items` (or `wit_work_item` action `"my"`); Jira `getAccessibleAtlassianResources` + `atlassianUserInfo` (identity and site only; `defaultProject` is resolved as described under "Resolving Jira's `defaultProject`" below).

`email` is best-effort: Jira's `atlassianUserInfo` returns `emailAddress` directly, so
it is populated there whenever the API exposes one. AzDO's identity lookup returns a
`mail`-equivalent field only when the organization's directory exposes it; `null`
otherwise. A caller that needs to resolve the running user's own **chat** identity
(for example, a default self-DM target) passes this `email` to `resolveChatUser`
below; when `email` is `null`, treat self chat-target resolution as unavailable, the
same as any other `resolveChatUser` miss.

### Resolving AzDO's `defaultProject` / `defaultTeam`

`core_list_projects` returns every project in the organization, not one default, so
an AzDO org with more than one project (the common case) needs an explicit
resolution rule rather than a bare "call the tool and see". Resolve in this order,
stopping at the first that yields a value, and cache the result for the session
(never re-resolve mid-session):

1. **`policy.default_project` / `policy.default_team`** from `.claude/tracker-policy.json`
   (see `references/policy-schema.md`), when set. The explicit, user-owned override.
2. **The registered AzDO MCP server's own configured default.** Read `.mcp.json` at
   the project root and find the `mcpServers` entry whose `args` invoke
   `@azure-devops/mcp` (the official server), regardless of what key the user
   registered it under (`ado`, `azure-devops`, or anything else — the registration
   name and the env config are independent). If that entry's `env` sets
   `ado_mcp_project` (and/or `ado_mcp_team`), use it. This is the official server's
   own built-in "skip the selection prompt" mechanism — the repo's ADO MCP config is
   the intended fallback here, and skipping this step is what makes the agent
   re-prompt for a project the repo already told it about. Read only those two keys.
   The same `env` block commonly holds a personal access token: never print, quote,
   cache or persist any other `env` value or the file's contents.
3. **Single-project org.** If neither of the above resolved a value, call
   `core_list_projects`. When it returns exactly one project, use it — there is no
   ambiguity to ask about.
4. **Lazy-prompt** (`defaultProject` only). Only when all three above are exhausted:
   `AskUserQuestion` with the live project list from `core_list_projects`, then persist
   the answer to `policy.default_project` per the standard lazy-prompt persistence flow
   (see `policy-schema.md`). Never ask again in the same or a later session once
   persisted.

`defaultTeam` follows the same precedence through steps 1-2 (policy override, then
the AzDO MCP server's `ado_mcp_team` config). It has no step-3 equivalent — a
project can have several teams with no single obvious default — so when steps 1-2
don't resolve it, it stays `null` per its existing `string|null` contract and is never
lazy-prompted. A caller that needs a team for an AzDO sprint read (`getCurrentSprint`,
`findSprint`, `getSprintItems`, `getTeamCapacity`) must check for a `null` team before
calling and stop with a message asking for a team name or `policy.default_team`.

### Resolving Jira's `defaultProject`

`getAccessibleAtlassianResources` returns sites, not projects, so Jira needs its own
rule. Resolve in this order, stopping at the first that yields a value, and cache it:

1. **`policy.default_project`** (the Jira project key), when set.
2. **The project prefix of the issue key the caller is acting on** (`PROJ-123` → `PROJ`).
   This covers every flow that starts from an issue reference.
3. **Lazy-prompt.** `AskUserQuestion` with the project keys from `getVisibleJiraProjects`
   (free text when that tool is absent), then offer to persist to
   `policy.default_project`.

Jira has no team concept in this adapter; `defaultTeam` is always `null` there.
