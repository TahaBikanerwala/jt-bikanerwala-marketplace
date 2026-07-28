---
description: Scan UI source for form controls, dropdowns, options, links, and interactive elements missing a data-testid, generate stable semantic kebab-case ids, and write them in. All edits pass through one diff-and-confirm gate.
argument-hint: "[path or glob] (default: project's UI source)"
allowed-tools: Skill, Read, Edit, Grep, Glob, Bash, AskUserQuestion
---

# /testid-injector:run

Entry point for the `testid-injector` agent. Pass a file, directory, or glob to scope the run. With no argument, the agent infers the UI source root from the project layout.

## Examples

```
/testid-injector:run
/testid-injector:run src/components/LoginForm.tsx
/testid-injector:run src/features/checkout
/testid-injector:run "src/**/*.tsx"
```

## Behavior

This command is a thin shell. It dispatches to the `testid-injector` agent in `mode=inject`. The agent runs the full workflow:

1. **Bootstrap.** Detect the framework(s), load `.claude/testid-policy.json` (or defaults), resolve the scope from the argument.
2. **Scan.** Enumerate every form control, dropdown + option, link, and interactive element in scope. Classify each as already-tagged (skip), needs-tag, or manual-review.
3. **Generate.** Produce a stable semantic kebab-case id for each element that needs one, deduped within the file.
4. **Diff-and-confirm gate.** Show the full change set (file → element → generated id). **Pause.** The diff is the dry-run.
5. **On confirm:** apply the edits. **On decline:** exit cleanly with no writes.
6. **Verify + summarize.** Re-scan, report coverage, and flag any elements that need manual prop-forwarding.

## See also

- `/testid-injector:audit` — read-only. Reports coverage and the ids it *would* add, writes nothing.
