import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ORCHESTRATOR = 'jtb';
const REQUIRED_ACTION_FIELDS = ['id', 'command', 'label', 'description', 'accepts', 'intents', 'next'];
const REQUIRED_FOLLOW_UP_FIELDS = ['action', 'when', 'subject'];
const VERSION_PARTS = 3;

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const registryPath = join('plugins', ORCHESTRATOR, 'skills', ORCHESTRATOR, 'registry.json');

const readJson = (relativePath) => JSON.parse(readFileSync(join(repoRoot, relativePath), 'utf8'));
const manifestOf = (plugin) => readJson(join('plugins', plugin, '.claude-plugin', 'plugin.json'));
const pluginOf = (command) => command.split(':')[0];

function commandsOf(plugin) {
  const commandsDir = join(repoRoot, 'plugins', plugin, 'commands');
  if (!existsSync(commandsDir)) {
    return [];
  }
  return readdirSync(commandsDir)
    .filter((file) => file.endsWith('.md'))
    .map((file) => `${plugin}:${basename(file, '.md')}`);
}

function findUnlistedOrchestrator(marketplacePlugins) {
  return marketplacePlugins.includes(ORCHESTRATOR)
    ? []
    : [`.claude-plugin/marketplace.json does not list the ${ORCHESTRATOR} plugin.`];
}

function findUnroutedCommands(shippedCommands, actions) {
  const routed = new Set(actions.map((action) => action.command));
  return shippedCommands
    .filter((command) => !routed.has(command))
    .map((command) => `/${command} has no action in the registry. Add one so /${ORCHESTRATOR} can offer it.`);
}

function findDanglingRoutes(shippedCommands, actions) {
  const shipped = new Set(shippedCommands);
  return actions
    .filter((action) => !shipped.has(action.command))
    .map((action) => `Action "${action.id}" points at /${action.command}, which no plugin ships.`);
}

function findMalformedActions(actions, subjectKinds) {
  return actions.flatMap((action) => [
    ...REQUIRED_ACTION_FIELDS
      .filter((field) => action[field] === undefined)
      .map((field) => `Action "${action.id ?? action.command}" is missing "${field}".`),
    ...(action.accepts ?? [])
      .filter((kind) => !subjectKinds.includes(kind))
      .map((kind) => `Action "${action.id}" accepts "${kind}", which is not a subject kind.`),
    ...((action.accepts ?? []).length === 0 ? [`Action "${action.id}" accepts no subject kind.`] : []),
  ]);
}

function findDuplicateIds(actions) {
  const ids = actions.map((action) => action.id);
  return [...new Set(ids.filter((id, position) => ids.indexOf(id) !== position))]
    .map((id) => `Action id "${id}" is used more than once.`);
}

function findBrokenFollowUps(actions) {
  const ids = new Set(actions.map((action) => action.id));
  return actions.flatMap((action) => (action.next ?? []).flatMap((followUp) => [
    ...REQUIRED_FOLLOW_UP_FIELDS
      .filter((field) => followUp[field] === undefined)
      .map((field) => `A follow-up of "${action.id}" is missing "${field}".`),
    ...(ids.has(followUp.action) ? [] : [`Action "${action.id}" offers "${followUp.action}" next, which is not an action.`]),
  ]));
}

const parseVersion = (text) => text.replace(/^\^/, '').split('.').map(Number);

const compareVersions = (left, right) => left.map((part, position) => part - right[position]).find((difference) => difference !== 0) ?? 0;

function caretRangeAllows(range, version) {
  const [floor, actual] = [parseVersion(range), parseVersion(version)];
  const firstSignificant = floor.findIndex((part) => part > 0);
  const lockedLength = firstSignificant === -1 ? VERSION_PARTS : firstSignificant + 1;
  const sameLockedPrefix = floor.slice(0, lockedLength).every((part, position) => part === actual[position]);
  return sameLockedPrefix && compareVersions(actual, floor) >= 0;
}

function findDependencyGaps(dependencies, routedPlugins, marketplacePlugins) {
  const declared = new Map(dependencies.map((dependency) => [dependency.name, dependency.version]));
  const missing = routedPlugins
    .filter((plugin) => !declared.has(plugin))
    .map((plugin) => `plugins/${ORCHESTRATOR}/.claude-plugin/plugin.json does not depend on ${plugin}, so installing ${ORCHESTRATOR} would not install it.`);
  const unknown = [...declared.keys()]
    .filter((plugin) => !marketplacePlugins.includes(plugin))
    .map((plugin) => `${ORCHESTRATOR} depends on ${plugin}, which is not in the marketplace.`);
  const stale = [...declared]
    .filter(([plugin]) => marketplacePlugins.includes(plugin))
    .filter(([plugin, range]) => !caretRangeAllows(range, manifestOf(plugin).version))
    .map(([plugin, range]) => `${ORCHESTRATOR} depends on ${plugin} ${range}, which does not allow its current version ${manifestOf(plugin).version}.`);
  return [...missing, ...unknown, ...stale];
}

function findProblems() {
  const marketplacePlugins = readJson(join('.claude-plugin', 'marketplace.json')).plugins.map((plugin) => plugin.name);
  const { subjects, actions } = readJson(registryPath);
  const shippedCommands = marketplacePlugins.filter((plugin) => plugin !== ORCHESTRATOR).flatMap(commandsOf);
  const routedPlugins = [...new Set(shippedCommands.map(pluginOf))];
  return [
    ...findUnlistedOrchestrator(marketplacePlugins),
    ...findUnroutedCommands(shippedCommands, actions),
    ...findDanglingRoutes(shippedCommands, actions),
    ...findMalformedActions(actions, Object.keys(subjects)),
    ...findDuplicateIds(actions),
    ...findBrokenFollowUps(actions),
    ...findDependencyGaps(manifestOf(ORCHESTRATOR).dependencies ?? [], routedPlugins, marketplacePlugins),
  ];
}

const problems = findProblems();
if (problems.length > 0) {
  console.error(`${registryPath} is out of step with the marketplace:\n${problems.map((problem) => `  - ${problem}`).join('\n')}`);
  process.exit(1);
}
console.log(`${registryPath} routes every command the marketplace ships.`);
