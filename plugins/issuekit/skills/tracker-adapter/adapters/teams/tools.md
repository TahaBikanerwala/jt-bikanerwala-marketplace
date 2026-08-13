# Teams — tool allowlist

The adapter calls the tools below for the two chat verbs (`references/verbs.md`'s
"Chat" section). Suffix-match against the available tool surface; prefix varies by
which Microsoft 365/Graph MCP is installed.

This file covers `resolveChatUser` and `sendMessage` only. Detecting *whether* Teams
is the active chat backend at all (`chat == teams`) is `references/detection.md`'s
job, based on the read-only search tool (`*__teams_search_messages`); it does not
depend on anything in this file.

## Tools

| Verb | Tool (suffix) | Notes |
|---|---|---|
| `resolveChatUser` | best-effort, via whatever user-directory search tool the connected Microsoft 365/Graph MCP exposes | not consistently present; return `null` when absent or when it finds no match |
| `sendMessage` | none currently allowlisted | the Microsoft 365/Graph MCP registrations this marketplace supports expose read tools (`__teams_list_chats`, `__chat_message_search`, and similar) but no send-capable tool. Return `{ sent: false, reason: "no send-capable tool found for teams" }`. |

## Do not improvise

When no send-capable tool is present, do not call an unrelated Microsoft 365 tool
(mail, calendar, SharePoint) as a substitute for sending a chat message, and do not
silently drop the send. Return the `sent: false` failure above so the caller (see
`ticket-summarizer`'s Phase 4, for example) can report it plainly to the user. This
is the same "no invented verbs" discipline `SKILL.md`'s Constraints section applies
to every other verb.

## If a real send tool becomes available

If a future Teams/Graph MCP registration exposes an actual send-message tool, add its
suffix to the table above and update `sendMessage`'s implementation note in
`references/verbs.md` — do not call it ad hoc from a verb-plugin prompt first.

## Known prefix variants

- `mcp__claude_ai_Microsoft_365__*`
- `mcp__plugin_<user-installed-name>__*`
