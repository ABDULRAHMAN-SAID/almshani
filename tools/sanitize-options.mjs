// منقّح الخيارات الشامل: كل خيار يجب أن يكون من جنس الإجابة الصحيحة،
// وأسئلة «س أم ص» تعرض فقط البدائل المذكورة في نص السؤال نفسه،
// والأسئلة الحسابية يُعاد التحقق من ناتجها.
import { readFileSync, writeFileSync } from 'node:fs';
import vm from 'node:vm';

const PATH = new URL('../tahaddi/index.html', import.meta.url).pathname;
let src = readFileSync(PATH, 'utf8');
const start = src.indexOf('const Q=[');
const end = src.indexOf('];', start);
if (start < 0 || end < 0) throw new Error('لم أجد مصفوفة Q');
const Q = vm.runInNewContext(src.slice(start + 8, end + 1));
console.log('أسئلة قبل التنقيح:', Q.length);

const shuffled = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0;[a[i], a[j]] = [a[j], a[i]] } return a };
const uniq = a => [...new Set(a)];
const nrm = s => String(s || '').trim()
  .replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
  .replace(/[ً-ْ«»"'؟?!.،,]/g, '').replace(/\s+/g, ' ').toLowerCase();
const isNum = s => /\d/.test(String(s)) && /^[\d١٢٣٤٥٦٧٨٩٠,.\s%−-]+$/.test(String(s).trim());
const NUMW = { 'واحد': 1, 'واحده': 1, 'اثنان': 2, 'اثنين': 2, 'ثلاثه': 3, 'ثلاث': 3, 'اربعه': 4, 'اربع': 4,
  'خمسه': 5, 'خمس': 5, 'سته': 6, 'ست': 6, 'سبعه': 7, 'سبع': 7, 'ثمانيه': 8, 'ثماني': 8, 'ثمان': 8,
  'تسعه': 9, 'تسع': 9, 'عشره': 10, 'عشر': 10, 'صفر': 0 };
const numVal = s => {
  const t = nrm(s);
  if (NUMW[t] != null) return NUMW[t];
  if (!isNum(s)) return null;
  const n = parseFloat(String(s).replace(/[^\d.]/g, ''));
  return isNaN(n) ? null : n;
};
function numDistract(v) {
  v = Math.round(v);
  const cand = uniq([v * 2, Math.round(v / 2), v + Math.max(1, Math.round(v * .3)),
    v - Math.max(1, Math.round(v * .25)), v + 7, v + 1, Math.max(0, v - 1), v * 10]
    .filter(x => x >= 0 && x !== v).map(String));
  return shuffled(cand).slice(0, 3);
}

// مجمّع مشتتات نصية لكل شبكة: إجابات صحيحة قصيرة من نفس الفئة
const txtPool = {};
for (const q of Q) {
  if (!q.o || q.tf || q.fill) continue;
  const corr = String(q.o[q.c] ?? '');
  if (!corr || isNum(corr) || corr.split(/\s+/).length > 3) continue;
  const net = String(q.n || '').split('_')[0];
  (txtPool[net] = txtPool[net] || new Set()).add(corr);
}
Object.keys(txtPool).forEach(k => txtPool[k] = [...txtPool[k]]);

let amFixed = 0, amDropped = 0, numRebuilt = 0, mixSwapped = 0, mathFixed = 0, dropped = 0;

// ── 1) الحساب: أعد التحقق من ناتج أي تعبير حسابي صريح ──
const OPS = [
  [/(\d+)\s*\+\s*(\d+)/, (a, b) => a + b],
  [/(\d+)\s*[×xX*]\s*(\d+)/, (a, b) => a * b],
  [/(\d+)\s*[-−]\s*(\d+)/, (a, b) => a - b],
  [/(\d+)\s*[÷/]\s*(\d+)/, (a, b) => b && a % b === 0 ? a / b : null]
];
for (const q of Q) {
  if (!q.o || q.tf || q.fill) continue;
  if (!/ناتج|حاصل|يساوي|اجمع|كم يكون/.test(q.t)) continue;
  for (const [re, f] of OPS) {
    const m = q.t.match(re);
    if (!m) continue;
    const truth = f(+m[1], +m[2]);
    if (truth == null || truth < 0) continue;
    const ts = String(truth);
    if (String(q.o[q.c]) !== ts || !q.o.every(isNum) || uniq(q.o.map(String)).length !== q.o.length) {
      q.o = shuffled([ts, ...numDistract(truth)]);
      q.c = q.o.indexOf(ts);
      mathFixed++;
    }
    break;
  }
}

// ── 2) أسئلة «س أم ص»: الخيارات = البدائل المذكورة في السؤال فقط ──
const inText = (qt, opt) => {
  const on = nrm(opt);
  if (on.length >= 2 && (` ${qt} `).includes(` ${on} `)) return true;
  const nv = numVal(opt);
  if (nv != null) {
    for (const [w, v] of Object.entries(NUMW)) if (v === nv && (` ${qt} `).includes(` ${w} `)) return true;
    if ((` ${qt} `).includes(` ${nv} `)) return true;
  }
  return false;
};
for (const q of Q) {
  if (!q.o || q.tf || q.fill || q._drop) continue;
  if (!/\sأم\s/.test(q.t)) continue;
  const qt = nrm(q.t);
  const cands = q.o.filter(o => inText(qt, o));
  if (cands.length < 2) continue;               // «أم» لغوية لا تعداد بدائل
  const corr = q.o[q.c];
  if (!cands.includes(corr)) { q._drop = 1; amDropped++; continue }
  if (cands.length === q.o.length) continue;    // سليم أصلاً
  q.o = shuffled(uniq(cands));
  q.c = q.o.indexOf(corr);
  amFixed++;
}

// ── 3) جنس الخيارات = جنس الإجابة ──
for (const q of Q) {
  if (!q.o || q.tf || q.fill || q._drop) continue;
  if (/\sأم\s/.test(q.t) && q.o.length < 4) continue;   // قُصّت عمداً في الممر السابق
  const corr = String(q.o[q.c] ?? '');
  if (!corr) { q._drop = 1; dropped++; continue }
  if (isNum(corr)) {
    // إجابة رقمية: كل الخيارات أرقام فريدة
    if (!q.o.every(isNum) || uniq(q.o.map(String)).length !== q.o.length) {
      const v = numVal(corr);
      if (v == null) { q._drop = 1; dropped++; continue }
      q.o = shuffled(uniq([corr, ...numDistract(v)]));
      if (q.o.length < 4) q.o = uniq([...q.o, String(v + 3), String(v + 11), String(Math.max(0, v - 2))]).slice(0, 4);
      q.c = q.o.indexOf(corr);
      numRebuilt++;
    }
  } else {
    // إجابة نصية: أي مشتت رقمي صرف يُستبدل من نفس الشبكة
    const bad = q.o.map((o, i) => ({ o, i })).filter(x => x.i !== q.c && isNum(x.o));
    if (!bad.length) continue;
    const net = String(q.n || '').split('_')[0];
    const pool = (txtPool[net] || []).filter(p => p !== corr && !q.o.includes(p));
    if (pool.length < bad.length) { q._drop = 1; dropped++; continue }
    const repl = shuffled(pool).slice(0, bad.length);
    bad.forEach((x, j) => q.o[x.i] = repl[j]);
    q.c = q.o.indexOf(corr);
    mixSwapped++;
  }
}

// ── 4) سلامة نهائية: خيارات فريدة ومؤشر صحيح ──
const final = Q.filter(q => {
  if (q._drop) { delete q._drop; return false }
  if (!q.o || q.tf || q.fill) return true;
  if (q.c == null || q.o[q.c] === undefined) { dropped++; return false }
  if (uniq(q.o.map(String)).length !== q.o.length) {
    const corr = String(q.o[q.c]);
    q.o = uniq(q.o.map(String));
    q.c = q.o.indexOf(corr);
    if (q.c < 0 || q.o.length < 2) { dropped++; return false }
  }
  return true;
});

// ── 5) فاحص نهائي: صفر مخالفات أو لا نكتب ──
let bad = 0;
for (const q of final) {
  if (!q.o || q.tf || q.fill) continue;
  const corr = String(q.o[q.c] ?? '');
  if (!corr) { bad++; continue }
  if (isNum(corr) && !q.o.every(isNum)) bad++;
  if (!isNum(corr) && q.o.some((o, i) => i !== q.c && isNum(o))) bad++;
  if (uniq(q.o.map(String)).length !== q.o.length) bad++;
}
console.log(`حساب مصحح: ${mathFixed} · «أم» قُصّت: ${amFixed} · «أم» حُذفت: ${amDropped}`);
console.log(`رقمية أعيد بناؤها: ${numRebuilt} · مشتتات دخيلة استُبدلت: ${mixSwapped} · محذوف: ${dropped + amDropped}`);
console.log('أسئلة بعد التنقيح:', final.length, '· مخالفات متبقية:', bad);
if (bad > 0) throw new Error('بقيت مخالفات — لن أكتب الملف');

const ser = final.map(q => JSON.stringify(q)).join(',\n');
src = src.slice(0, start) + 'const Q=[' + ser + ']' + src.slice(end + 1);
writeFileSync(PATH, src);
console.log('كُتب الملف ✔');
