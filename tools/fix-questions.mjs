// مدقق بنك أسئلة التحدي: يصلح الأسئلة المحسوبة (الجواب الصحيح يجب أن يكون بين
// الخيارات)، يوحّد المشتتات داخل كل عائلة (لا «MP3» كإجابة عن اختصار طبي)،
// ويحذف الأسئلة الركيكة بأسماء لاتينية لا مكان لها في لعبة عربية.
import { readFileSync, writeFileSync } from 'node:fs';
import vm from 'node:vm';

const PATH = new URL('../tahaddi/index.html', import.meta.url).pathname;
let src = readFileSync(PATH, 'utf8');

const start = src.indexOf('const Q=[');
const end = src.indexOf('];', start);
if (start < 0 || end < 0) throw new Error('لم أجد مصفوفة Q');
const Q = vm.runInNewContext(src.slice(start + 8, end + 1));
console.log('أسئلة قبل التدقيق:', Q.length);

const shuffled = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0;[a[i], a[j]] = [a[j], a[i]] } return a };
const uniq = a => [...new Set(a)];

// ── 1) الأسئلة المحسوبة: أعد بناء الخيارات حول الجواب الحقيقي ──
const CALC = [
  [/كم سنتيمترً?ا في (\d+) متر/, n => n * 100],
  [/كم مترً?ا في (\d+) كيلومتر/, n => n * 1000],
  [/كم غرامً?ا في (\d+) كيلوغرام/, n => n * 1000],
  [/كم دقيقة في (\d+) ساعة/, n => n * 60],
  [/كم ثانية في (\d+) دقيقة/, n => n * 60],
  [/كم يومً?ا في (\d+) أسبوع/, n => n * 7],
  [/كم ساعة في (\d+) يوم/, n => n * 24],
  [/كم شهرً?ا في (\d+) سنة/, n => n * 12]
];
const R2N = s => { const m = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 }; let t = 0; for (let i = 0; i < s.length; i++) { const v = m[s[i]], nx = m[s[i + 1]] ?? 0; t += v < nx ? -v : v } return t };
const N2R = n => { const T = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]; let o = ''; for (const [v, r] of T) while (n >= v) { o += r; n -= v } return o };

function numDistract(v) {
  const cand = uniq([v * 2, Math.round(v / 2), v + Math.max(1, Math.round(v * .3)), v - Math.max(1, Math.round(v * .25)), v + 7, v * 10]
    .filter(x => x > 0 && x !== v).map(String));
  return shuffled(cand).slice(0, 3);
}

let fixedCalc = 0;
for (const q of Q) {
  if (!q.o || q.tf || q.fill) continue;
  let truth = null;
  for (const [re, f] of CALC) { const m = q.t.match(re); if (m) { truth = String(f(+m[1])); break } }
  const rv = q.t.match(/الروماني ([IVXLCDM]+)/); if (rv) truth = String(R2N(rv[1]));
  const rw = q.t.match(/العدد (\d+) بالأرقام الرومانية/);
  if (rw) {
    const n = +rw[1]; const t = N2R(n);
    const ds = uniq([N2R(n + 1), N2R(n + 4), N2R(Math.max(1, n - 3)), N2R(n + 9)].filter(x => x !== t)).slice(0, 3);
    q.o = shuffled([t, ...ds]); q.c = q.o.indexOf(t); fixedCalc++; continue;
  }
  if (truth === null) continue;
  if (String(q.o[q.c]) !== truth || uniq(q.o).length !== 4) {
    q.o = shuffled([truth, ...numDistract(+truth)]);
    q.c = q.o.indexOf(truth); fixedCalc++;
  }
}

// ── 2) عائلات المشتتات: بدائل من نفس الجنس دائماً ──
const FAMS = [
  /المقصود بالاختصار/, /عنصر يرمز له بالرمز/, /العملات المستخدمة/, /اللغات الرسمية/,
  /صاحب العمل|يرتبط العمل/, /عاصمتها|ما عاصمة/
];
let fixedFam = 0;
for (const fam of FAMS) {
  const members = Q.filter(q => q.o && !q.tf && !q.fill && fam.test(q.t));
  const pool = uniq(members.map(q => String(q.o[q.c])));
  if (pool.length < 7) continue;
  for (const q of members) {
    const correct = String(q.o[q.c]);
    const ds = shuffled(pool.filter(p => p !== correct)).slice(0, 3);
    const before = JSON.stringify(q.o);
    q.o = shuffled([correct, ...ds]); q.c = q.o.indexOf(correct);
    if (JSON.stringify(q.o) !== before) fixedFam++;
  }
}

// ── 3) حذف الركيك: أسماء لاتينية طويلة في نص السؤال أو خياراته ──
const latinOK = s => /^[IVXLCDM]+$/.test(s) || /^[A-Z]{2,8}\d*$/.test(s) || /كم\/س|م\/ث/.test(s);
const hasJunkLatin = s => {
  const runs = String(s).match(/[A-Za-z][A-Za-z .'-]{3,}/g) || [];
  return runs.some(r => !latinOK(r.trim()));
};
const before = Q.length;
const kept = Q.filter(q => {
  if (hasJunkLatin(q.t)) return false;
  if (q.o && q.o.some(o => hasJunkLatin(o))) return false;
  return true;
});

// ── 4) سلامة عامة: خيارات فريدة ومؤشر صحيح ──
let dropped2 = 0;
const final = kept.filter(q => {
  if (!q.o || q.tf || q.fill) return true;
  if (q.c == null || !q.o[q.c]) { dropped2++; return false }
  if (uniq(q.o.map(String)).length !== q.o.length) {
    const correct = String(q.o[q.c]);
    q.o = uniq(q.o.map(String));
    while (q.o.length < 4) q.o.push(correct + ' '.repeat(q.o.length)); // لن يحدث عملياً
    q.c = q.o.indexOf(correct);
    if (q.c < 0) { dropped2++; return false }
  }
  return true;
});

console.log(`إصلاح محسوب: ${fixedCalc} · توحيد مشتتات: ${fixedFam} · حذف لاتيني ركيك: ${before - kept.length} · حذف تالف: ${dropped2}`);
console.log('أسئلة بعد التدقيق:', final.length);
const byNet = {};
for (const q of final) byNet[q.n.split('_')[0]] = (byNet[q.n.split('_')[0]] || 0) + 1;
console.log('التوزيع:', JSON.stringify(byNet));

const ser = final.map(q => JSON.stringify(q)).join(',\n');
src = src.slice(0, start) + 'const Q=[' + ser + ']' + src.slice(end + 1);
writeFileSync(PATH, src);
console.log('كُتب الملف ✔');
