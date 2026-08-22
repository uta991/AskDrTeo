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

console.log('✓ apps/api/.env განახლდა\n');
console.log('Railway → Variables-ში ჩასასვამი:');
for (const [key, value] of secrets) {
  console.log(`  ${key}  (${value.length} სიმბოლო)`);
}
console.log('\nმნიშვნელობები ეკრანზე განზრახ არ იბეჭდება — აიღე secrets.local.env-იდან.');
