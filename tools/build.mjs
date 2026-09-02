#!/usr/bin/env node
/**
 * البناء: يدمج وحدات /src في الملفّ المنشور tahaddi/index.html.
 *
 *   node tools/build.mjs          # يدمج
 *   node tools/build.mjs --check  # يتحقّق أنّ المنشور مطابق للمصدر ولا يكتب
 *
 * كل وحدة لها علامتان في الملفّ المنشور:
 *   /* ⟦src:المسار⟧ *\/ ... /* ⟦/src⟧ *\/
 * فيبقى المنشور ملفًّا واحدًا، ومصدر الحقيقة في /src.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const TARGET = path.join(ROOT, 'tahaddi', 'index.html');

/** الوحدات المدمَجة — يُضاف إليها مع كل استخراج جديد */
const MODULES = ['src/progression/rank.js', 'src/network/net.js', 'src/audio/sfx.js', 'src/ui/icons.js', 'src/economy/catalog.js', 'src/economy/billing.js', 'src/navigation/router.js', 'src/games/carrom/physics.js'];

const check = process.argv.includes('--check');
let html = fs.readFileSync(TARGET, 'utf8');
let changed = 0, missing = [];

for (const rel of MODULES) {
  const code = fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\s+$/, '');
  const open = `/* ⟦src:${rel}⟧ */`;
  const close = `/* ⟦/src⟧ */`;
  const i = html.indexOf(open);
  if (i < 0) { missing.push(rel); continue; }
  const j = html.indexOf(close, i);
  if (j < 0) { missing.push(rel + ' (علامة الإغلاق ناقصة)'); continue; }
  const block = `${open}\n${code}\n${close}`;
  const old = html.slice(i, j + close.length);
  if (old !== block) { html = html.slice(0, i) + block + html.slice(j + close.length); changed++; }
}

if (missing.length) {
  console.error('✗ علامات ناقصة في الملفّ المنشور:\n  ' + missing.join('\n  '));
  process.exit(1);
}
if (check) {
  console.log(changed ? `✗ المنشور متأخّر عن المصدر في ${changed} وحدة — شغّل: node tools/build.mjs`
                      : `✓ المنشور مطابق للمصدر (${MODULES.length} وحدة)`);
  process.exit(changed ? 1 : 0);
}
if (changed) { fs.writeFileSync(TARGET, html); console.log(`✓ دُمجت ${changed} وحدة في المنشور`); }
else console.log(`✓ لا جديد — المنشور مطابق (${MODULES.length} وحدة)`);
