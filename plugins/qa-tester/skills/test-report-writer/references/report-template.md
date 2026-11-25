# Templates

Placeholders are in `<angle brackets>`. Drop any section that would be empty, except where noted.

## Test plan (`test-plan.md`)

```markdown
# Test plan: <ticket id> <ticket title>

**Environment:** <env name> (<url>) · **Mutations:** <allowed|guarded> · **Provider:** <provider> · **Drafted:** <date>

**Test types:** functional, navigation, <chosen types> · **Not selected:** <types>

## Sources
- Ticket <id> (<state>): <url>
- PR <id> (<state>, <merged/open/draft>): <url>
- Context: parent <id> <title>; related <ids>
- Not opened: <design links, attachments>

## Acceptance criteria (source of truth)
| AC | Criterion | Origin |
|---|---|---|
| AC-1 | <text> | AC field |
| AC-2 | <text> | comment by <author>, <date> (supersedes: "<old text>") |

## Ticket vs PR discrepancies
| ID | Class | Ticket says | PR says | Evidence |
|---|---|---|---|---|

## Feature model
**Screens and routes**
| Screen | Route | Ways in | Ways out |
|---|---|---|---|
| Query editor | `/queries/:id/edit` | list row **Edit**, deep link | **Save**, **Cancel**, breadcrumb, browser Back |

**Control rules**
| ID | Control | Rule | Oracle | Cases |
|---|---|---|---|---|
| CR-1 | **Run** | enabled only when the query is valid and saved; disabled again as soon as the query is edited | implied (AC-2) | TC-05, TC-06 |

**States and transitions:** <pristine → dirty → valid → saved → stale (on edit) ...>

## Shared test data set
| Ref | What | Created by | Used by | End state | Cleanup |
|---|---|---|---|---|---|
| R1 | Order `qa-<id>-order-A` | TC-03 | TC-03..TC-14 | deleted | deleted by TC-14 |
| E1 | existing: any customer with 2+ orders | existing | TC-01, TC-02 | unchanged | none |

## Test cases
### P1
**TC-01 <title>** · trace <AC-n, CR-n> · <category> · <type> · <technique> · oracle <ac|implied (AC-n)|convention (<name>)> · role <role> · <viewport> · data <R1>
- Preconditions: <...>
- Steps:
  1. <...>
- Expected: <...>
- Must not change: <..., when set>
- Mutates: <none|reversible|irreversible>

### P2 ... P4
(same shape)

## Exploratory charters
- **EX-1** <mission> · area <area> · data <refs> · look for <...>

## Coverage
| AC | Cases |
|---|---|
| AC-1 | TC-01, TC-04 |

## Coverage by screen and test type
| Screen | Functional | Navigation | <each chosen type> |
|---|---|---|---|
| Query editor | TC-03..TC-09 | TC-10..TC-14 | TC-20 / skipped: <reason> |

## Considered and skipped
- **<category>:** <heuristic> (<reason>); <heuristic> (<reason>)

## Reconnaissance
<after recon: screens visited, controls found, cases added (ids, or "none"), screens not reached, anything a click created. Before recon: "Runs after preflight; this section is updated then." When off: "Not run: <plan mode | no browser | recon_minutes is 0>. The plan was not checked against the live screens.">

## Open questions (design time)
- <question> (unblocks <cases>)
```

## Test report (`test-report.md`)

```markdown
# Test report: <ticket id> <ticket title>

**Verdict: <Go | Go with risks | No-go>.** <one sentence why>

**Environment:** <env> (<url>) · **Build:** <verified build | unverified: reason> · **Provider:** <provider> · **Run:** <date time>, <duration>

**Tested:** functional, navigation, <chosen types>

| Pass | Fail | Blocked | Not testable | Skipped | Flaky | Not executed | Claude in Chrome artifacts |
|---|---|---|---|---|---|---|---|
| <n> | <n> | <n> | <n> | <n> | <n> | <n> | <n> |

Drop the last two columns when they are zero. Artifacts are already counted under Pass; the column says how many of those passes held only on chrome-devtools.

## Defects
| ID | Severity | Case | AC | Title | Bug |
|---|---|---|---|---|---|
| BUG-1 | S2 | TC-07 | AC-3 | <symptom> | <url or "not filed"> |

### BUG-1 <title>
- Category: <functional|navigation|ui|...>
- Oracle: <AC-n | implied by AC-n: <why> | convention: <name>, not stated in the ticket>
- Steps: <numbered>
- Expected: <quote AC, or the implied or conventional behavior>
- Actual: <...>
- Frequency: reproduced <n> of <n>
- Evidence: <paths or observations>
- Video: <evidence/BUG-1.mp4 | "not recorded: <reason>"> <"did not reproduce on recording replay", if so>
- Console / network: <excerpt>
- Caveat: <deployment unverified, if so>
- Cross-check: <confirmed on chrome-devtools | fails differently on chrome-devtools (<difference>) | possible Claude in Chrome artifact, not cross-checked: <why>>

## Claude in Chrome artifacts (not filed)
Cases that failed on Claude in Chrome but passed when re-run on chrome-devtools. They are not defects. They are listed so a reviewer can see what was discounted.

| Case | Sign | Claude in Chrome result | chrome-devtools result |
|---|---|---|---|

## Ticket vs PR discrepancies
| ID | Class | Ticket says | PR says | What shipped (tested) |
|---|---|---|---|---|

## Traceability
| AC | Criterion | Cases | Result |
|---|---|---|---|
| AC-1 | <short> | TC-01, TC-04 | Pass |
| AC-3 | <short> | TC-07 | **Fail** (BUG-1) |
| AC-5 | <short> | TC-12 | Not testable |

## Results by case
| Case | Title | Status | Note | Evidence |
|---|---|---|---|---|

## Not testable / blocked
| Case | Reason | What would make it testable |
|---|---|---|

## Exploratory findings and observations
- **EX-1.1** <finding from charter EX-1> (<defect id or question>)
- **OB-1** <something wrong noticed during a scripted case, outside its assertions> (<case id>; <defect id or question>)

## Coverage by test type
| Type | Cases | Pass | Fail | Other |
|---|---|---|---|---|
| Functional | <n> | <n> | <n> | <n> |
| Navigation | <n> | <n> | <n> | <n> |

One row per type in `test_types`. Below the table, a short summary of any Lighthouse scores and of console and network health across the run.

## Test data
**Cleanup:** <deleted after confirmation | deleted automatically (production, every case passed) | kept by choice | kept for defects | pending>

| Ref | Identifier | Created in | Status |
|---|---|---|---|
Always include this section. Status is `in-place` (the report was written before the cleanup decision), `deleted by case (<TC-id>)`, `cleaned`, `kept (user choice)` or `left behind (<why>)`. If anything is still in place, say what and why.

## Open questions
- <question> (unblocks <cases>)

## Not covered
- Test types not selected for this run: <types>
- <anything in the ACs or NFRs this run did not cover and why: tooling, environment, provider capability>
- <screens recon could not reach, and why>
```

## Tracker comment

```markdown
**QA result: <verdict>** on <env> (<build or "build unverified">), <date>

Tested: functional, navigation, <chosen types>

<pass> passed · <fail> failed · <blocked> blocked · <not testable> not testable · <skipped> skipped · <flaky> flaky

**Defects**
- <severity> <title> (<case>, <AC>) <bug link or "not filed"> <"(unconfirmed: possible Claude in Chrome artifact)" when the defect was not cross-checked>

**Discounted**
- <n> failures seen only on Claude in Chrome passed on chrome-devtools and are not defects

**Needs a decision**
- <discrepancy or question, one line each>

**Not tested**
- <case>: <reason>

Full report: `<output_dir>/<run_id>/test-report.md`
```

## Bug text for bug-reporter

```text
<Symptom title in one line>

Found while testing <ticket id> "<ticket title>" (<ticket url>), acceptance criterion <AC-n>: "<AC text>".

Environment: <env name> <url>, build <build or "unverified">, <browser> <version if known>, viewport <WxH>, role <role>.

Preconditions:
- <...>

Steps to reproduce:
1. <...>

Expected: <from the AC; or "not stated in the ticket, implied by <AC-n>: <behavior>"; or "not stated in the ticket, common convention: <behavior>">
Actual: <observed>

Frequency: reproduced <n> of <n> attempts.
Impact: <who is affected and how; P1 flow blocked or not; workaround or "no workaround found">
Evidence: <paths>; console: "<error excerpt>"; network: <METHOD URL status>.
Attachments (added automatically once this bug is created): <the files that exist, by name: BUG-n.mp4 or BUG-n.gif (reproduction video), <case-id>.png, <case-id>-console.txt, <case-id>-network.txt>
Fix verification: re-run qa-tester case <TC-id> from <test-plan path>.
```
