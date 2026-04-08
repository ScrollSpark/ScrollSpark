/**
 * `npx cap sync` rebuilds ios/App/App/capacitor.config.json packageClassList from npm plugins only.
 * Our local Swift plugins live in the app target, so we merge them in after sync.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const capPath = join(__dirname, '..', 'ios', 'App', 'App', 'capacitor.config.json');

const EXTRA_CLASSES = ['NativeRevenueCatPlugin', 'ScreenEventsPlugin'];

const raw = readFileSync(capPath, 'utf8');
const json = JSON.parse(raw);
const list = Array.isArray(json.packageClassList) ? json.packageClassList : [];
let changed = false;
for (const cls of EXTRA_CLASSES) {
  if (!list.includes(cls)) {
    list.push(cls);
    changed = true;
  }
}
if (changed) {
  json.packageClassList = list;
  writeFileSync(capPath, JSON.stringify(json, null, '\t') + '\n', 'utf8');
  console.log(`append-ios-native-plugins: packageClassList now: ${list.join(', ')}`);
} else {
  console.log('append-ios-native-plugins: all local plugins already present');
}
