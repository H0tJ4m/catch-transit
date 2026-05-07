/**
 * Pre-flight check before kicking off an EAS build or running on-device.
 * Verifies that the local checkout has everything it needs:
 *   - All required asset files exist
 *   - Firebase env vars are present (warning only — Tag/HS/Race won't work without them)
 *   - Seed transit JSON parses + has consistent ids
 *   - app.json declares the correct permission strings
 *   - tsc + jest pass
 * Exits non-zero on any HARD failure so CI can gate builds on it.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = resolve(__dirname, '..');

type Check = { name: string; ok: boolean; detail?: string; soft?: boolean };
const results: Check[] = [];

function check(name: string, fn: () => boolean | string, soft = false): void {
  try {
    const result = fn();
    if (result === true) {
      results.push({ name, ok: true });
    } else {
      results.push({ name, ok: false, detail: String(result), soft });
    }
  } catch (e) {
    results.push({
      name,
      ok: false,
      detail: e instanceof Error ? e.message : String(e),
      soft,
    });
  }
}

// 1. Required assets.
for (const f of [
  'assets/icon.png',
  'assets/splash.png',
  'assets/adaptive-icon.png',
  'assets/favicon.png',
]) {
  check(`asset ${f}`, () => existsSync(resolve(ROOT, f)) || `missing — run "pnpm gen:assets"`);
}

// 2. Firebase env (soft — Tag/HS/Race won't run without it but the app boots).
check(
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  () =>
    Boolean(process.env.EXPO_PUBLIC_FIREBASE_API_KEY) ||
    'unset — multiplayer modes will be disabled',
  true,
);
check(
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  () =>
    Boolean(process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID) ||
    'unset — multiplayer modes will be disabled',
  true,
);

// 3. Seed data integrity.
check('stations.json parses + ids unique', () => {
  const raw = JSON.parse(
    readFileSync(resolve(ROOT, 'src/data/stations.json'), 'utf8'),
  ) as Array<{ id: string }>;
  const ids = new Set(raw.map((s) => s.id));
  if (ids.size !== raw.length) return 'duplicate station id detected';
  return true;
});

check('lines.json references only known stations', () => {
  const stations = JSON.parse(
    readFileSync(resolve(ROOT, 'src/data/stations.json'), 'utf8'),
  ) as Array<{ id: string }>;
  const lines = JSON.parse(
    readFileSync(resolve(ROOT, 'src/data/lines.json'), 'utf8'),
  ) as Array<{ id: string; stations: string[] }>;
  const known = new Set(stations.map((s) => s.id));
  for (const line of lines) {
    for (const sid of line.stations) {
      if (!known.has(sid)) return `line ${line.id} references unknown station ${sid}`;
    }
  }
  return true;
});

// 4. app.json permission strings present.
check('app.json declares iOS location permission strings', () => {
  const app = JSON.parse(readFileSync(resolve(ROOT, 'app.json'), 'utf8')) as {
    expo: { ios?: { infoPlist?: Record<string, unknown> } };
  };
  const plist = app.expo.ios?.infoPlist ?? {};
  if (!plist['NSLocationWhenInUseUsageDescription'])
    return 'NSLocationWhenInUseUsageDescription missing';
  if (!plist['NSLocationAlwaysAndWhenInUseUsageDescription'])
    return 'NSLocationAlwaysAndWhenInUseUsageDescription missing';
  return true;
});

// 5. typecheck + tests.
check('tsc --noEmit', () => {
  try {
    execSync('pnpm typecheck', { cwd: ROOT, stdio: 'pipe' });
    return true;
  } catch (e) {
    const out = e instanceof Error && 'stdout' in e ? String(e.stdout) : '';
    return out.split('\n').slice(-5).join('\n') || 'tsc failed';
  }
});

check('jest', () => {
  try {
    execSync('pnpm test --silent', { cwd: ROOT, stdio: 'pipe' });
    return true;
  } catch (e) {
    const out = e instanceof Error && 'stdout' in e ? String(e.stdout) : '';
    return out.split('\n').slice(-10).join('\n') || 'jest failed';
  }
});

// Print report.
const pass = results.filter((r) => r.ok).length;
const hardFail = results.filter((r) => !r.ok && !r.soft).length;
const softFail = results.filter((r) => !r.ok && r.soft).length;

for (const r of results) {
  const icon = r.ok ? 'ok ' : r.soft ? '!! ' : 'FAIL';
  console.log(`[${icon}] ${r.name}${r.detail ? ` -- ${r.detail}` : ''}`);
}
console.log(`\n${pass} passed, ${hardFail} failed, ${softFail} warnings`);

if (hardFail > 0) {
  console.error('\nPre-flight FAILED. Fix the failures above before building.');
  process.exit(1);
}
console.log('\nPre-flight ok. You can run `pnpm build:android:preview` next.');
