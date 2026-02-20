#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next') continue;
      walk(full, acc);
      continue;
    }
    if (/\.(ts|tsx)$/.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

const root = process.cwd();
const sourceFiles = walk(path.join(root, 'apps/web/src'));
const i18nFile = path.join(root, 'apps/web/src/lib/i18n/index.ts');

const used = new Set();
for (const file of sourceFiles) {
  const text = fs.readFileSync(file, 'utf8');
  const patterns = [
    /\b(?:t|ti|tt)\s*\(\s*(?:[^,\n]+,\s*)?['"]([a-z0-9_.-]+)['"]/g,
    /\bt\s*\(\s*['"]([a-z0-9_.-]+)['"]/g,
    /\btt\s*\(\s*['"]([a-z0-9_.-]+)['"]/g,
    /\bti\s*\(\s*['"]([a-z0-9_.-]+)['"]/g
  ];
  for (const pattern of patterns) {
    let match = pattern.exec(text);
    while (match) {
      used.add(match[1]);
      match = pattern.exec(text);
    }
  }
}

const defined = new Set();
const dictionary = fs.readFileSync(i18nFile, 'utf8');
const defPattern = /'([a-z0-9_.-]+)'\s*:/g;
let defMatch = defPattern.exec(dictionary);
while (defMatch) {
  defined.add(defMatch[1]);
  defMatch = defPattern.exec(dictionary);
}

const missing = [...used].filter((key) => !defined.has(key)).sort();
const ignored = new Set(['en', 'el', 'ru', 'uk', 'hi', 'ar']);
const actionableMissing = missing.filter((key) => !ignored.has(key));
if (actionableMissing.length === 0) {
  console.log('i18n key check passed: no missing keys.');
  process.exit(0);
}

console.error(`i18n key check failed: ${actionableMissing.length} missing key(s).`);
for (const key of actionableMissing) {
  console.error(`- ${key}`);
}
process.exit(1);
