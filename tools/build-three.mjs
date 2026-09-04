#!/usr/bin/env node
/**
 * يحزم Three.js (من node_modules) إلى ملفّ واحد بكائن عامّ THREE — يُدمج بعدها في المنشور عبر tools/build.mjs.
 *   node tools/build-three.mjs
 * يحتاج esbuild (npm i -D esbuild أو مسارًا في ESBUILD_BIN).
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const BIN = process.env.ESBUILD_BIN || path.join(ROOT, 'node_modules', '.bin', 'esbuild');
const OUT = path.join(ROOT, 'src', 'vendor', 'three-global.js');
const ver = JSON.parse(fs.readFileSync(path.join(ROOT, 'node_modules', 'three', 'package.json'), 'utf8')).version;
execFileSync(BIN, [path.join(ROOT, 'src', 'games', 'stage3d', 'three-entry.js'), '--bundle', '--minify', '--format=iife', '--global-name=THREE', '--target=es2019', '--legal-comments=none', `--outfile=${OUT}`], { stdio: 'inherit' });
const code = fs.readFileSync(OUT, 'utf8');
fs.writeFileSync(OUT, `/* Three.js r${ver} — MIT © Three.js Authors — حزمة مقتطعة (tools/build-three.mjs) */\n${code}`);
console.log(`✓ src/vendor/three-global.js — ${(fs.statSync(OUT).size / 1024).toFixed(0)} ك.ب (three ${ver})`);
