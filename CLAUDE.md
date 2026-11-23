# jt-bikanerwala-marketplace

A Claude Code plugin marketplace. Each plugin lives in `plugins/<name>/` and is listed in
`.claude-plugin/marketplace.json` and in the table in `README.md`.

## Keep `jtb` in step with every plugin change

`jtb` is the orchestrator: `/jtb` routes to every other plugin's commands through
`plugins/jtb/skills/jtb/registry.json`. Whenever you add, rename or remove a plugin or a command,
update `jtb` in the same change:

1. `plugins/jtb/skills/jtb/registry.json`: one action per command the plugin ships, plus `next`
   entries on existing actions where the new command is a natural follow-up. File order is menu order.
2. `plugins/jtb/.claude-plugin/plugin.json`: add the plugin to `dependencies`, keep each version range
   in step with the plugin's current version, and bump the `jtb` version.
3. `plugins/jtb/README.md`: the routing and chain tables.
4. Run `node scripts/check-jtb-registry.mjs`. CI runs the same check on every pull request.

A bump to another plugin's major version (or minor, for a `0.x` plugin) needs its range in `jtb`'s
`dependencies` raised too. The check catches this.

## Conventions

- Plugins are named as actor nouns (`-er`, `-or`) and their primary command is `:run`. `issuekit` (a
  library) and `jtb` (the front door, named for what you type) are the two exceptions.
- A plugin version bump goes in both its `plugin.json` and the `README.md` table.
- Text an agent shows the user or writes to a tracker uses no em dashes and no spaced hyphens as
  separators.
