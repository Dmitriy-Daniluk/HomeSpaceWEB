const fs = require('fs');
const path = require('path');

const replacements = [
  ['build/index.js', "export * from './SQLite';", "export * from './SQLite.js';"],
  ['build/index.js', "export * from './SQLite.types';", "export * from './SQLite.types.js';"],
  ['build/SQLite.js', "import './polyfillNextTick';", "import './polyfillNextTick.js';"],
  ['build/SQLite.js', "from '@expo/websql/custom';", "from '@expo/websql/custom/index.js';"],
  ['build/next/hooks.js', "from './SQLiteDatabase';", "from './SQLiteDatabase.js';"],
  ['build/next/index.js', "export * from './SQLiteDatabase';", "export * from './SQLiteDatabase.js';"],
  ['build/next/index.js', "export * from './SQLiteStatement';", "export * from './SQLiteStatement.js';"],
  ['build/next/index.js', "export * from './hooks';", "export * from './hooks.js';"],
  ['build/next/SQLiteDatabase.js', "from './ExpoSQLiteNext';", "from './ExpoSQLiteNext.js';"],
  ['build/next/SQLiteDatabase.js', "from './SQLiteStatement';", "from './SQLiteStatement.js';"],
  ['build/next/SQLiteStatement.js', "from './paramUtils';", "from './paramUtils.js';"],
];

const packageRoot = path.join(__dirname, '..', 'node_modules', 'expo-sqlite');
const expoCliRoot = path.join(__dirname, '..', 'node_modules', '@expo', 'cli');
const rnCliServerApiRoot = path.join(__dirname, '..', 'node_modules', '@react-native-community', 'cli-server-api');
const rnCliToolsRoot = path.join(__dirname, '..', 'node_modules', '@react-native-community', 'cli-tools');
const rnCommunityCliPluginRoot = path.join(__dirname, '..', 'node_modules', '@react-native', 'community-cli-plugin');
const rnGradlePluginRoot = path.join(__dirname, '..', 'node_modules', '@react-native', 'gradle-plugin');

if (!fs.existsSync(packageRoot)) {
  console.log('[patch-expo-sqlite-node23] expo-sqlite is not installed, skipping.');
  process.exit(0);
}

let changedFiles = 0;

function updateFile(file, transform) {
  if (!fs.existsSync(file)) return;

  const before = fs.readFileSync(file, 'utf8');
  const after = transform(before);

  if (after !== before) {
    fs.writeFileSync(file, after);
    changedFiles += 1;
  }
}

for (const [relativeFile, from, to] of replacements) {
  const file = path.join(packageRoot, relativeFile);
  updateFile(file, (content) => content.split(from).join(to));
}

updateFile(path.join(expoCliRoot, 'build', 'src', 'start', 'server', 'metro', 'externals.js'), (content) => {
  const nodePrefixMap = '.map((x)=>x.replace(/^node:/, ""))';
  const filterNeedle = '.filter((x)=>!/^_|^(internal|v8|node-inspect)\\/|\\//.test(x)';

  let next = content;

  while (next.includes(nodePrefixMap + nodePrefixMap)) {
    next = next.split(nodePrefixMap + nodePrefixMap).join(nodePrefixMap);
  }

  if (next.includes(filterNeedle) && !next.includes(nodePrefixMap + filterNeedle)) {
    next = next.replace(filterNeedle, nodePrefixMap + filterNeedle);
  }

  return next;
});

updateFile(path.join(rnCliServerApiRoot, 'build', 'statusPageMiddleware.js'), (content) =>
  content.replace(
    "res.setHeader('X-React-Native-Project-Root', process.cwd());",
    "res.setHeader('X-React-Native-Project-Root', encodeURIComponent(process.cwd()));"
  )
);

updateFile(path.join(rnCliToolsRoot, 'build', 'isPackagerRunning.js'), (content) =>
  content.replace(
    "root: headers.get('X-React-Native-Project-Root') ?? ''",
    "root: decodeURIComponent(headers.get('X-React-Native-Project-Root') ?? '')"
  )
);

updateFile(path.join(rnCommunityCliPluginRoot, 'dist', 'utils', 'isDevServerRunning.js'), (content) =>
  content.replace(
    'statusResponse.headers.get("X-React-Native-Project-Root") === projectRoot',
    'decodeURIComponent(statusResponse.headers.get("X-React-Native-Project-Root") ?? "") === projectRoot'
  )
);

updateFile(path.join(rnGradlePluginRoot, 'build.gradle.kts'), (content) =>
  content.replace(
    'kotlin { jvmToolchain(17) }',
    'kotlin { jvmToolchain(21) }'
  )
);

updateFile(
  path.join(
    rnGradlePluginRoot,
    'src',
    'main',
    'kotlin',
    'com',
    'facebook',
    'react',
    'utils',
    'JdkConfiguratorUtils.kt'
  ),
  (content) => content.split('jvmToolchain(17)').join('jvmToolchain(21)')
);

console.log(`[patch-expo-sqlite-node23] patched files: ${changedFiles}`);
