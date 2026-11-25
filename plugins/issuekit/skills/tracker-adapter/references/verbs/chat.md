# Chat verbs (ungated)

Types are in `references/verbs.md`.


Chat delivery is a separate concern from tracker reads/writes: it never touches the
tracker, so it never goes through the diff-and-confirm gate. Whether to ask the user
before sending is the calling verb-plugin's own responsibility (`ticket-summarizer`'s
Phase 4 always asks first, for example; `issue-triager`'s severity escalation does
not, since it is a configured, unconditional notification).

`chat`'s value (`slack`, `teams`, or `none`) comes from `references/detection.md`,
same as always; these two verbs only fire when `chat != none`.

```
ChatUserRef  = opaque   // returned by resolveChatUser; valid only as a sendMessage target
ChatTarget   = { kind: "user", ref: ChatUserRef } | { kind: "channel", value: string }
```

`ChatUserRef` is a **chat-platform** identity (a Slack or Teams user id), distinct
from `resolveUser`'s tracker `UserRef`. Never pass one where the other is expected: a
`ChatUserRef` is not valid for `assign`/`mention`/`comment`, and a tracker `UserRef` is
not valid as a `sendMessage` target.

## `resolveChatUser(query: { email?: string, name?: string })`
**Out:** `ChatUserRef | null` — `null` when no match is found. The caller treats a
miss as "unavailable," never as an error; see `adapters/<chat>/tools.md` for what
"no match" looks like per platform.
**Implements:** Slack `slack_search_users` (query by email, name as fallback); Teams:
see `adapters/teams/tools.md` — a live directory-search tool is not consistently
exposed across Microsoft 365/Graph MCP registrations, so this frequently resolves to
`null` there even for a real user.

## `sendMessage(target: ChatTarget, body: string)`
**Out:** `{ sent: true } | { sent: false, reason: string }`. A failure (no
send-capable tool detected for the resolved `chat` backend, target not found,
permission denied) is returned in-band, never thrown and never retried.
**Implements:** Slack `slack_send_message` — `target.kind == "user"` sends a DM to
the resolved user id; `target.kind == "channel"` sends to the given channel id/name.
Teams: see `adapters/teams/tools.md` — no send-capable tool is consistently exposed
in this marketplace's supported Microsoft 365/Graph MCP registrations; when one is
not present in the detected tool surface, return `{ sent: false, reason: "no
send-capable tool found for teams" }` rather than improvising a call against an
unrelated tool.

`body` is sent as markdown, as-is. No HTML/ADF conversion happens here;
`body-format.md` governs tracker bodies only, not chat messages. `@[userRef]` tokens
are **not** projected in chat bodies and would post literally: name people by display
name, or target them with a `ChatUserRef`.

`target.kind == "channel"`'s `value` is the same opaque channel/group reference
`policy.escalation.channel` already documents: a Slack `#channel-name` or channel id,
or a Teams channel/chat id.
