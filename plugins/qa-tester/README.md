# qa-tester

Hand it a ticket or a pull request and it tests the change in a real browser the way a senior QA would. It reads the ticket and its linked PRs, works out what *should* happen from the acceptance criteria, drafts a full edge-case test plan, runs every case, and comes back with evidence, defects, and a Go / Go with risks / No-go verdict. It asks all its questions once, at the end.

## The rules it follows

- **The ticket is the source of truth.** Expected results come from the acceptance criteria, the description, and scope changes a product owner agreed in ticket comments. The PR and the code never define what's correct.
- **Ticket and PR differences are reported, not absorbed.** Missing scope, extra scope, contradicting values, scope changed in code review, and unmerged PRs all appear as discrepancies. The disputed behavior is tested so you can see which version shipped.
- **Everything is executed.** A case that can't run in a browser (an email, a captcha, a third-party payment, a vague AC) is marked `Not testable` with the reason, and the run moves on.
- **Questions wait until the end.** One card with the questions that matter most, and any case your answers unblock is re-run.
- **Minimal test data.** It designs one small shared data set and tests many things on the same records. For example, one order is created, read, edited, moved through its states, and deleted by the last case, so cleanup is close to free. Every created record is prefixed (`qa-<id>-`) and tracked.
- **It asks before deleting test data.** On non-production environments it asks in the end-of-run card whether to delete, keep, or keep only the records tied to defects. On production it deletes automatically when every case passed, and asks when it found a bug. Whatever is kept is listed in the report.
- **Video of every bug, if you want it.** When it finds defects, it asks whether to record them. It then replays each reproduction while recording and saves `evidence/BUG-n.mp4`. When you approve a bug for filing, the video, screenshots and console and network logs are attached to it automatically.
- **It double-checks suspicious failures.** When it tests through Claude in Chrome and a failure looks like it could come from Claude in Chrome itself (a click that missed, typed text the app never registered, a request blocked by one of your extensions), it re-runs that case on chrome-devtools. A real bug fails on both. One that passes on chrome-devtools is listed in the report as a Claude in Chrome artifact and is never filed. Without chrome-devtools connected, the bug is kept and flagged for a manual re-check.
- **No pass without evidence.** It also fails a case on uncaught console errors or unexpected 4xx/5xx responses, even when the page looks right.

## Install

```
/plugin install qa-tester@jt-bikanerwala-marketplace
```

This auto-installs `issuekit` and `acceptance-test-generator` (whose `acceptance-analyzer` provides the formal test design).

You also need:
- **A browser MCP.** Either [chrome-devtools MCP](https://github.com/ChromeDevTools/chrome-devtools-mcp) (preferred: console, network, throttling, emulation, Lighthouse) or the Claude in Chrome extension (uses your real Chrome profile, so existing logins work). Without one, the plugin still drafts the plan and a manual checklist, but never reports a pass.
- **A tracker MCP** (Azure DevOps or Jira) to read tickets. Optional when testing a GitHub PR alone.
- **The `gh` CLI**, authenticated, to read GitHub PRs. Azure DevOps PRs are read through the Azure DevOps MCP.
- **Optional: `bug-reporter`** (`/plugin install bug-reporter@jt-bikanerwala-marketplace`) to file defects as Bugs. If it isn't installed, qa-tester tells you and keeps the defects in the report.
- **For mp4 recordings on Claude in Chrome: `ffmpeg`** on your PATH. chrome-devtools MCP records mp4 directly; Claude in Chrome records a GIF that is converted. Without ffmpeg the GIF is kept.
- **For attachments:** if your tracker MCP has no upload tool, a token in an env var. Azure DevOps uses `AZURE_DEVOPS_EXT_PAT` (or your `az` login), and Jira uses `JIRA_EMAIL` and `JIRA_API_TOKEN`. Change the names with `attachment_auth`.

## Use

```
/qa-tester:run PROJ-456                     # ticket; linked PRs are found automatically
/qa-tester:run https://dev.azure.com/org/proj/_workitems/edit/1234 --env staging
/qa-tester:run https://github.com/org/app/pull/321   # PR; referenced tickets are found automatically
/qa-tester:plan PROJ-456                    # draft the plan only, no browser
/qa-tester:setup                            # change saved environments and preferences
```

## First run: four questions, saved

1. **Environments:** `name=url` pairs and a default. It suggests the local URL it finds in your repo. Production-looking hosts are flagged.
2. **Login:** use your logged-in Chrome session, test accounts from environment variables (only the variable names are saved), log in manually at the start of each run, or no login.
3. **Test data:** may tests create, edit or delete data in non-production only, everywhere, or nowhere?
4. **Extra coverage:** mobile and tablet viewports, accessibility checks, Lighthouse, and a role and permission matrix.

Answers go to `.claude/qa-tester-policy.json`. It holds no secrets, so you can commit it for the team.

## What a run does

1. **Gather:** reads the ticket (AC, description, comments, parent, related items) and every linked PR (description, changed files, review threads, merge state), following links both ways.
2. **Reconcile:** normalizes the ACs (`AC-1..n`, including agreed amendments) and lists ticket vs PR discrepancies. It also turns the PR's changed files into risk areas for regression and exploratory testing.
3. **Plan:** formal test design on every AC (equivalence classes, boundaries, decision tables, state transitions, negative paths), then a UI layer covering:
   - validation, navigation, refresh, back, double-submit;
   - session expiry, permissions, data isolation;
   - empty, one and many states, and pagination;
   - dates and locales, slow and offline network;
   - responsive layouts, accessibility, and regression of shared code.

   It writes `docs/qa/<id>/test-plan.md` with the shared data set, every case, exploratory charters and the cleanup plan.
4. **Preflight:** checks the environment is reachable, logs in each role, confirms the PR is in the deployed build (or flags that it couldn't), and checks that the seed data exists.
5. **Execute:** runs every case without stopping. For each case it asserts from the page, checks console and network, captures screenshots on failure, and re-runs failures to separate flakes from real defects. It then runs time-boxed exploratory charters. Test data stays in place until step 7.
6. **Report:** writes `docs/qa/<id>/test-report.md`, which contains:
   - the verdict;
   - an AC → case → result matrix;
   - the defects, with repro steps and evidence;
   - the discrepancies;
   - not-testable cases and what would unblock them;
   - the test data ledger;
   - open questions.
7. **Ask, record, clean up:** one end-of-run card holds the open questions plus two decisions: whether to record the defects, and whether to delete the test data. On production, when every case passed, the data is deleted without asking. It re-runs the cases your answers unblock, records an mp4 of each chosen defect, then cleans up as decided.
8. **Tracker:** posts a results comment on the ticket and files one Bug per defect through `bug-reporter`, linked to the ticket. Each goes through its own diff-and-confirm gate. Once a bug is created, its video, screenshots and logs are attached automatically. The gate lists them first.

## Configure

`.claude/qa-tester-policy.json`. Setup writes `environments`, `default_env`, `auth`, `coverage_extras` and `mutations` (and `browser_provider` when you choose your logged-in Chrome session); the rest are optional.

```json
{
  "environments": {
    "local":   { "url": "http://localhost:5173", "production": false, "allow_mutations": true,  "version_check": null },
    "staging": { "url": "https://staging.example.com", "production": false, "allow_mutations": true, "version_check": "https://staging.example.com/version" },
    "prod":    { "url": "https://example.com", "production": true, "allow_mutations": false, "version_check": null }
  },
  "default_env": "staging",
  "auth": { "method": "env-accounts", "roles": { "admin": { "user_env": "QA_ADMIN_USER", "pass_env": "QA_ADMIN_PASS" } } },
  "coverage_extras": ["responsive", "accessibility"],
  "mutations": "non-production",
  "viewports": { "desktop": "1440x900", "tablet": "768x1024", "mobile": "390x844" },
  "browser_provider": "auto",
  "output_dir": "docs/qa",
  "pause_before_execution": false,
  "rerun_failures": 1,
  "cross_check_provider_artifacts": true,
  "exploratory_minutes": 10,
  "test_data_prefix": "qa-{id}-",
  "cleanup_test_data": "ask",
  "record_failures": "ask",
  "attach_evidence": true,
  "attachment_auth": { "azure_devops": { "pat_env": "AZURE_DEVOPS_EXT_PAT" } },
  "post_results_comment": "ask",
  "file_bugs": "ask"
}
```

| Key | Default | Notes |
|---|---|---|
| `environments` | asked | `production: true` environments never get mutating tests unless `allow_mutations` is set. `version_check` is a URL or CSS selector showing the deployed build. |
| `default_env` | asked | Override per run with `--env <name>`. |
| `auth` | asked | `browser-session`, `env-accounts` (env var **names** per role), `manual`, `none`. |
| `coverage_extras` | `["accessibility"]` | `responsive`, `accessibility`, `lighthouse`, `permissions`. |
| `mutations` | `non-production` | Seeds each environment's `allow_mutations`. |
| `browser_provider` | `auto` | `chrome-devtools` or `claude-in-chrome` to force one. |
| `pause_before_execution` | `false` | `true` adds one approve card between plan and execution. |
| `rerun_failures` | `1` | Re-runs before a failure counts as a defect. |
| `cross_check_provider_artifacts` | `true` | Re-runs suspected Claude in Chrome artifacts on chrome-devtools before filing them. |
| `exploratory_minutes` | `10` | `0` turns the exploratory pass off. |
| `test_data_prefix` | `qa-{id}-` | Every created record starts with this. |
| `cleanup_test_data` | `ask` | `ask`: non-production asks before deleting; production deletes automatically when every case passed cleanly and asks otherwise (any defect, or any blocked, not-testable or flaky case). `never` keeps everything. |
| `record_failures` | `ask` | `always` or `never` to skip the question. Videos go to `evidence/BUG-n.mp4`. |
| `attach_evidence` | `true` | Attaches the video, screenshots and logs to each bug it files. |
| `attachment_auth` | `{}` | Env var **names** for the REST upload fallback: `azure_devops.pat_env`, `jira.email_env`, `jira.token_env`. |
| `post_results_comment` / `file_bugs` | `ask` | `never` turns that write path off. `ask` still gates every write. |

## What's inside

- **Agent:** `qa-tester`, with modes `run`, `plan` and `setup`.
- **Skills:**
  - `source-reconciler`: gathers and cross-links sources, normalizes ACs, and lists discrepancies;
  - `test-case-designer`: the UI heuristics, the minimal shared data set, and executable cases;
  - `browser-test-executor`: provider detection, preflight, execution, evidence, defect recording and cleanup;
  - `test-report-writer`: the plan, report, comment and bug text;
  - `evidence-attacher`: uploads videos, screenshots and logs to filed bugs (Azure DevOps, Jira).
- **Reuses:**
  - `issuekit:tracker-adapter`, including its `getPullRequest` verb;
  - `acceptance-test-generator:acceptance-analyzer`;
  - `issuekit:prose-style`;
  - `bug-reporter:run`, when installed.

## Safety

- It never writes credentials anywhere and never screenshots a filled password field.
- It never mutates data on an environment that doesn't allow it.
- It never bypasses captcha, MFA or rate limits, and never enters real payment or personal data.
- It only deletes records it created and recorded under the run's prefix, and only after you agree (or, on production, when every case passed).
- It never records a login; recordings start after sign-in.
- Attachment tokens are read from env vars and never printed or written.
- Every tracker write passes through a gate.

## See also

- `/acceptance-test-generator:run` writes the same AC analysis out as Gherkin `.feature` files for automation.
- `/bug-reporter:run` files a bug by hand.
- `/testid-injector:run` adds `data-testid`s, which make browser targeting more stable.
