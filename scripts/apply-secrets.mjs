#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * საიდუმლოების გადატანა `secrets.local.env`-იდან `apps/api/.env`-ში.
 *
 * ტერმინალში მნიშვნელობები არ იბეჭდება — მხოლოდ სახელები და სიგრძე.
 * ასე ლოგში, ეკრანის ჩანაწერსა თუ მიმოწერაში გასაღები არ ხვდება.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(root, 'secrets.local.env');
const target = resolve(root, 'apps/api/.env');

if (!existsSync(source)) {
  console.error('secrets.local.env ვერ მოიძებნა — ჯერ შეავსე ფაილი.');
  process.exit(1);
}

/** `KEY=value` წყვილები, კომენტარებისა და ცარიელი ველების გარეშე. */
function parse(text) {
  const entries = new Map();

  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const index = trimmed.indexOf('=');
    if (index < 1) continue;

    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    if (value) entries.set(key, value);
  }

  return entries;
}

const secrets = parse(readFileSync(source, 'utf8'));

if (!secrets.size) {
  console.log('ცარიელია — შესავსები ველი ვერ ვიპოვე.');
  process.exit(0);
}

let env = existsSync(target) ? readFileSync(target, 'utf8') : '';

for (const [key, value] of secrets) {
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=.*$`, 'm');

  env = pattern.test(env) ? env.replace(pattern, line) : `${env.trimEnd()}\n${line}\n`;
}

writeFileSync(target, env);

syncClientIds(secrets);

console.log('✓ apps/api/.env განახლდა\n');
console.log('Railway → Variables-ში ჩასასვამი:');
for (const [key, value] of secrets) {
  console.log(`  ${key}  (${value.length} სიმბოლო)`);
}
console.log('\nმნიშვნელობები ეკრანზე განზრახ არ იბეჭდება — აიღე secrets.local.env-იდან.');

/**
 * Google-ის client id-ები სამ ადგილას სჭირდება: API ტოკენს ამოწმებს,
 * ვები ღილაკს ხატავს, აპლიკაცია კი შესვლას იწყებს. ხელით სამჯერ
 * ჩაწერა ადრე თუ გვიან ერთგან მოძველებულ მნიშვნელობას დატოვებდა.
 */
function syncClientIds(entries) {
  const webId = entries.get('GOOGLE_WEB_CLIENT_ID') ?? '';
  const iosId = entries.get('GOOGLE_IOS_CLIENT_ID') ?? '';
  const appleId = entries.get('APPLE_SERVICES_ID') ?? '';

  if (!webId && !iosId) return;

  // API — დაშვებული `aud` მნიშვნელობები
  const apiEnv = resolve(root, 'apps/api/.env');
  if (existsSync(apiEnv)) {
    const ids = [webId, iosId].filter(Boolean).join(',');
    let text = readFileSync(apiEnv, 'utf8');
    text = /^GOOGLE_CLIENT_IDS=.*$/m.test(text)
      ? text.replace(/^GOOGLE_CLIENT_IDS=.*$/m, `GOOGLE_CLIENT_IDS=${ids}`)
      : `${text.trimEnd()}\nGOOGLE_CLIENT_IDS=${ids}\n`;
    writeFileSync(apiEnv, text);
  }

  // ვები — ლოკალური გაშვებისთვის
  writeFileSync(
    resolve(root, 'apps/web/.env.local'),
    [
      '# ლოკალური გაშვება — ფაილი .gitignore-შია',
      'API_URL=http://localhost:3000/api/v1',
      `GOOGLE_WEB_CLIENT_ID=${webId}`,
      `APPLE_SERVICES_ID=${appleId}`,
      '',
    ].join('\n'),
  );

  // მობილური — expo-ს კონფიგი
  const appJson = resolve(root, 'apps/mobile/app.json');
  if (existsSync(appJson)) {
    const config = JSON.parse(readFileSync(appJson, 'utf8'));
    config.expo.extra = config.expo.extra ?? {};
    config.expo.extra.googleClientIds = { ios: iosId, android: '', web: webId };
    writeFileSync(appJson, `${JSON.stringify(config, null, 2)}\n`);
  }

  console.log('✓ Google client id-ები გავრცელდა: API, ვები, აპლიკაცია');
}
