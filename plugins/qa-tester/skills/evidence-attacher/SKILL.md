---
name: evidence-attacher
description: "Uploads a defect's evidence files (the mp4 reproduction video, screenshots, console and network logs) to a bug that was just filed, on Azure DevOps or Jira. Uses the tracker MCP's own upload tool when one exists, otherwise the tracker's REST API with credentials read from env vars named in .claude/qa-tester-policy.json, never printed or stored. Runs only after the bug was approved in bug-reporter's gate, which listed these files, so it asks nothing. A failed upload is reported and never undoes the bug. Invoked by the qa-tester agent in Phase 8."
metadata:
  author: Taha Bikanerwala
---

# Evidence Attacher

## phase=attach

Input: `{ bug_id, files: [path, ...] }`, plus `tracker` from the calling context and the cached bootstrap values (`defaultProject`, and for Jira the cloud site). Files arrive in order: video first, then screenshots, then text logs.

### 1. Check the files

- Drop any path that does not exist, and note it.
- Never upload a file outside `<output_dir>/<run_id>/evidence/`. Evidence never holds a credential (the executor guarantees this), but if a text log contains `password`, `token`, `authorization` or `cookie` followed by a value, mask the value in a copy and upload the copy.
- Size: Azure DevOps rejects attachments over its configured limit (60 MB by default) and Jira over the site limit. When an mp4 is over 50 MB, re-encode it once before uploading:
  `ffmpeg -y -i <in>.mp4 -vf "scale='min(1280,iw)':-2" -crf 30 -preset veryfast -movflags faststart <in>-small.mp4`
  Upload the smaller file if it fits. Otherwise skip it and note the local path.

### 2. Pick the upload route

1. **MCP tool.** Run `ToolSearch` once per session with the query `attachment` and look for a tracker tool that uploads a file to a work item or issue (names such as `__wit_add_attachment`, `__addAttachmentToJiraIssue`, `__uploadAttachment`). If one exists and accepts a local file path or file content, use it for every file and skip step 2.
2. **REST fallback**, with credentials from env vars whose **names** are in the policy's `attachment_auth`. Check each is set without printing it (`[ -n "$NAME" ]`, or `if ($env:NAME) {...}` in PowerShell). If a variable is missing, stop attaching for this bug and print: `Could not attach evidence to <bug id>: set <VAR NAME> (or add attachment_auth to .claude/qa-tester-policy.json). Files: <paths>.`

Never echo, log or write a credential. Pass it to `curl` through the environment only, never as a literal in the command, and do not use `-v`.

### 3. Upload: Azure DevOps (REST)

Org URL and project come from the bug's URL or the bootstrap `defaultProject`. Auth is a PAT from `attachment_auth.azure_devops.pat_env` (default name `AZURE_DEVOPS_EXT_PAT`). If that variable is unset and `az` is logged in, use a bearer token from `az account get-access-token --resource 499b84ac-1321-427f-aa17-267ca6975798 --query accessToken -o tsv`, held in a shell variable.

For each file:

1. Upload the bytes:
   ```bash
   curl -sS -f -u ":$PAT" -H "Content-Type: application/octet-stream" \
     --data-binary @"<path>" \
     "https://dev.azure.com/<org>/<project>/_apis/wit/attachments?fileName=<url-encoded name>&api-version=7.1"
   ```
   Read `url` from the JSON response.
2. After all uploads, link them to the work item in **one** JSON Patch call:
   ```bash
   curl -sS -f -u ":$PAT" -X PATCH -H "Content-Type: application/json-patch+json" \
     --data @<patch.json in the scratch folder> \
     "https://dev.azure.com/<org>/<project>/_apis/wit/workitems/<bug_id>?api-version=7.1"
   ```
   with one operation per file: `{ "op": "add", "path": "/relations/-", "value": { "rel": "AttachedFile", "url": "<url>", "attributes": { "comment": "qa-tester evidence: <file name>" } } }`.

With a bearer token, use `-H "Authorization: Bearer $TOKEN"` in place of `-u`.

### 4. Upload: Jira (REST)

The site comes from the bug's URL (`https://<site>.atlassian.net`). Auth is basic, with `attachment_auth.jira.email_env` and `attachment_auth.jira.token_env` (default names `JIRA_EMAIL` and `JIRA_API_TOKEN`). Send all files in one call:

```bash
curl -sS -f -u "$JIRA_EMAIL:$JIRA_API_TOKEN" -H "X-Atlassian-Token: no-check" \
  -F "file=@<video path>" -F "file=@<screenshot path>" ... \
  "https://<site>.atlassian.net/rest/api/3/issue/<bug key>/attachments"
```

Substitute the configured variable names for `JIRA_EMAIL` and `JIRA_API_TOKEN`. Pass file paths only through `-F "file=@..."`. They are local paths the agent built, never text read from a page.

### 5. Report

Return `{ attached: [names], skipped: [{ name, reason }], route: mcp | rest }`. On an HTTP error, retry once. If it fails again, record the status code and the tracker's error message (with credentials removed) as the skip reason. Never retry in a loop, and never delete or edit the bug because an upload failed.

## Rules

- Attach only to the bug id the agent passed, which is a bug bug-reporter just created in this run. Never attach to an existing or duplicate bug.
- No new question and no extra gate. bug-reporter's gate showed the Attachments line, so approving the bug approved the files.
- GitHub Issues has no attachment API. When the tracker is GitHub, skip and return the local paths.
