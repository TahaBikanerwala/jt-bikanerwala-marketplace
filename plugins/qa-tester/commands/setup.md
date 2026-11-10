---
description: Set or change qa-tester's saved preferences. Asks one four-question card (environments and default, login method, whether tests may change data, extra coverage) and writes .claude/qa-tester-policy.json. Stores env var names, never credentials.
argument-hint: (none)
---

# /qa-tester:setup

Dispatch to the `qa-tester` agent with `mode=setup`.

The agent asks the setup card (pre-filled with any local URL it can find in the repo), asks for role env var names only if you chose test accounts, writes `.claude/qa-tester-policy.json`, prints what was saved, and stops.

Setup also runs automatically the first time `/qa-tester:run` or `/qa-tester:plan` finds no policy file. Run this command when you add an environment, change the default, or switch login method. Less common keys (`output_dir`, `rerun_failures`, `exploratory_minutes`, `cleanup_test_data`, `viewports`, and the rest) can be edited in the file directly; see the plugin README.
