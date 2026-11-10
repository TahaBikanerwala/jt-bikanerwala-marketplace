# Templates

Placeholders are in `<angle brackets>`. Drop any section that would be empty, except where noted.

## Test plan (`test-plan.md`)

```markdown
# Test plan: <ticket id> <ticket title>

**Environment:** <env name> (<url>) · **Mutations:** <allowed|guarded> · **Provider:** <provider> · **Drafted:** <date>

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

## Shared test data set
| Ref | What | Created by | Used by | End state | Cleanup |
|---|---|---|---|---|---|
| R1 | Order `qa-<id>-order-A` | TC-03 | TC-03..TC-14 | deleted | deleted by TC-14 |
| E1 | existing: any customer with 2+ orders | existing | TC-01, TC-02 | unchanged | none |

## Test cases
### P1
**TC-01 <title>** · trace <AC-n> · <type> · <technique> · role <role> · <viewport> · data <R1>
- Preconditions: <...>
- Steps:
  1. <...>
- Expected: <...>
- Mutates: <none|reversible|irreversible>

### P2 ... P4
(same shape)

## Exploratory charters
- **EX-1** <mission> · area <area> · data <refs> · look for <...>

## Coverage
| AC | Cases |
|---|---|
| AC-1 | TC-01, TC-04 |

## Open questions (design time)
- <question> (unblocks <cases>)
```

## Test report (`test-report.md`)

```markdown
# Test report: <ticket id> <ticket title>

**Verdict: <Go | Go with risks | No-go>.** <one sentence why>

**Environment:** <env> (<url>) · **Build:** <verified build | unverified: reason> · **Provider:** <provider> · **Run:** <date time>, <duration>

| Pass | Fail | Blocked | Not testable | Skipped | Flaky |
|---|---|---|---|---|---|
| <n> | <n> | <n> | <n> | <n> | <n> |

## Defects
| ID | Severity | Case | AC | Title | Bug |
|---|---|---|---|---|---|
| BUG-1 | S2 | TC-07 | AC-3 | <symptom> | <url or "not filed"> |

### BUG-1 <title>
- Steps: <numbered>
- Expected: <quote AC>
- Actual: <...>
- Frequency: reproduced <n> of <n>
- Evidence: <paths or observations>
- Console / network: <excerpt>
- Caveat: <deployment unverified, if so>

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

## Exploratory findings
- **EX-1** <finding> (<defect id or question>)

## Accessibility, responsive and health
<summary of the NFR cases and any Lighthouse scores; console and network health across the run>

## Test data
| Ref | Identifier | Created in | Cleaned |
|---|---|---|---|
Always include this section. If anything was left behind, say what and why.

## Open questions
- <question> (unblocks <cases>)

## Not covered
<anything in the ACs or NFRs this run did not cover and why: tooling, environment, provider capability>
```

## Tracker comment

```markdown
**QA result: <verdict>** on <env> (<build or "build unverified">), <date>

<pass> passed · <fail> failed · <blocked> blocked · <not testable> not testable · <skipped> skipped

**Defects**
- <severity> <title> (<case>, <AC>) <bug link>

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

Expected: <from the AC>
Actual: <observed>

Frequency: reproduced <n> of <n> attempts.
Impact: <who is affected and how; P1 flow blocked or not; workaround or "no workaround found">
Evidence: <paths>; console: "<error excerpt>"; network: <METHOD URL status>.
Fix verification: re-run qa-tester case <TC-id> from <test-plan path>.
```
