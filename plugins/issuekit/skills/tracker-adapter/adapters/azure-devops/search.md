# Azure DevOps — `searchIssues` → WIQL

Build a WIQL query from the normalized `SearchQuery` input. The WIQL text itself is
identical regardless of tool shape (see `references/detection.md` for shape
resolution) — only the call that carries it differs:

- **Classic shape:** `wit_query_by_wiql(wiql: "<wiql>")`.
- **Consolidated shape:** `wit_query(action: "wiql", wiql: "<wiql>", project: "<project>",
  top: <limit>)`. Always pass `top` explicitly — its default is `50`, well under this
  adapter's `limit: 100` default, so an omitted `top` would silently truncate a
  query-mode search. `project` narrows the search server-side in addition to the
  `[System.TeamProject]` conjunct already in the WIQL; passing both is harmless.

## Skeleton

```
SELECT [System.Id], [System.Title], [System.State], [System.WorkItemType]
FROM WorkItems
WHERE [System.TeamProject] = '<project>'
  <conjuncts>
ORDER BY [System.CreatedDate] DESC
```

## Conjunct mapping

| Input field | WIQL fragment |
|---|---|
| `keywords` | `AND ([System.Title] CONTAINS WORDS '<kw>' OR [System.Description] CONTAINS WORDS '<kw>')` — one CONTAINS WORDS clause per token; AND between tokens |
| `project` | `AND [System.TeamProject] = '<project>'` (overrides the default) |
| `scope` (area path) | `AND [System.AreaPath] UNDER '<scope>'` |
| `types` | `AND [System.WorkItemType] IN ('Bug','Issue',...)` |
| `states` | `AND [System.State] IN ('Active','New',...)` |
| `dateWindow.from` | `AND [System.CreatedDate] >= '<iso-date>'` |
| `dateWindow.to` | `AND [System.CreatedDate] <= '<iso-date>'` |
| `limit` | append `ORDER BY [System.CreatedDate] DESC` (WIQL has no row limit; trim client-side after the result returns) |

`SearchQuery` has no `tags` input; do not add a `System.Tags` conjunct here. WIQL's
`CONTAINS` on `System.Tags` matches whole tag tokens, not substrings within a
multi-word tag: a work item tagged `"ECW Bug"` will not match `CONTAINS 'ECW'`, only
a standalone `"ECW"` tag would. This silently drops real matches for exactly the
compound tags real projects use, so tag filtering is never pushed into the search;
it happens entirely client-side against the fetched `Issue.labels` instead.

## Quoting and escaping

- Single quotes in user input → double them: `O'Brien` → `O''Brien`.
- Wildcards in `CONTAINS WORDS` → not supported. Use `CONTAINS` (no `WORDS`) for substring match, but it's much slower; prefer `CONTAINS WORDS` and accept full-token matches.
- Date literals use ISO-8601: `'2026-04-29T00:00:00Z'`. Timezone in the input is honored; default to UTC.

## Common patterns

### Recent issues in an area
```
SELECT [System.Id], [System.Title], [System.State]
FROM WorkItems
WHERE [System.TeamProject] = 'MyProject'
  AND [System.AreaPath] UNDER 'MyProject\Mobile App'
  AND [System.CreatedDate] >= '2026-04-22'
ORDER BY [System.CreatedDate] DESC
```

### Look-alike duplicates
```
SELECT [System.Id], [System.Title], [System.State]
FROM WorkItems
WHERE [System.TeamProject] = 'MyProject'
  AND ([System.Title] CONTAINS WORDS 'notification'
       OR [System.Description] CONTAINS WORDS 'notification')
  AND [System.State] <> 'Closed'
ORDER BY [System.CreatedDate] DESC
```

### Reporter activity check
```
SELECT [System.Id], [System.Title], [System.CreatedDate]
FROM WorkItems
WHERE [System.TeamProject] = 'MyProject'
  AND [System.CreatedBy] = '<descriptor>'
ORDER BY [System.CreatedDate] DESC
```

## Limit handling

WIQL has no row-limit clause; the cap comes from the tool call, not the query text.
- **Classic shape:** the MCP tool returns the first N matches (server-side default ~200).
- **Consolidated shape:** the MCP tool returns at most `top` matches (default `50`
  when omitted — see above), not a larger server-side default.

If the input `limit` is smaller than what came back, trim the result client-side. If
the result is exactly the cap that applied for the resolved shape, append a one-line
warning to the caller: `result truncated at server cap; refine the query`.

## Empty results

Return an empty array. Do not retry with a broadened query — the caller is responsible for deciding whether to broaden.
