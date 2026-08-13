# Slack — tool allowlist

The adapter calls the tools below for the two chat verbs (`references/verbs.md`'s
"Chat" section). Suffix-match against the available tool surface; prefix varies by
which Slack MCP is installed. This marketplace's default is the claude.ai Slack
connector, `mcp__claude_ai_Slack__*`.

This file covers `resolveChatUser` and `sendMessage` only. Detecting *whether* Slack
is the active chat backend at all (`chat == slack`) is `references/detection.md`'s
job, based on the read-only search tools (`*__slack_search_*`); it does not depend on
anything in this file.

## Tools

| Verb | Tool (suffix) | Notes |
|---|---|---|
| `resolveChatUser` | `__slack_search_users` | query by email first, name as fallback; return `null` on no match rather than erroring |
| `sendMessage` | `__slack_send_message` | `target.kind == "user"` sends a DM to the resolved user id; `target.kind == "channel"` sends to the channel id/name given in `target.value` |

## Tools NOT used

- `__slack_send_message_draft`, `__slack_schedule_message` — out of scope.
  `sendMessage` always sends immediately; it never drafts or schedules. A future verb
  can add these explicitly if a caller needs them, same discipline as every other verb
  in this skill.
- `__slack_create_canvas`, `__slack_update_canvas`, `__slack_create_conversation`,
  `__slack_add_reaction` — out of scope.

## Known prefix variants

- `mcp__claude_ai_Slack__*` (the claude.ai Slack connector)
- `mcp__plugin_<user-installed-name>__*`

Suffix matching tolerates both, same as every tracker adapter.

## Error mapping

- No matching user for `resolveChatUser` → `null`, not an error.
- `sendMessage` target not found, or the caller lacks permission to post there →
  `{ sent: false, reason: "<tool's own error message>" }`. Surface the underlying
  tool's message verbatim; do not paraphrase or guess at the cause.
