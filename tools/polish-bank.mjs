// تلميع شامل لكل سؤال في البنك: لا إجابة تفضح نفسها، ولا مشتتات تكشف النمط
// المرور على كل الأسئلة بلا استثناء — node tools/polish-bank.mjs
import fs from 'fs';

const FILE = 'tahaddi/index.html';
const src = fs.readFileSync(FILE, 'utf8');
const a = src.indexOf('const Q=[');
const b = src.indexOf('];', a);
let Q = JSON.parse('[' + src.slice(a + 9, b).trim().replace(/,\s*$/, '') + ']');
console.log('قبل التلميع:', Q.length);

const shuffle = arr => { arr = [...arr]; for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]] } return arr };
const nrm = s => String(s).replace(/^ال/, '').replace(/[ًٌٍَُِّْ]/g, '').replace(/[ةيىا]+$/, '').replace(/\s+/g, '');
const setC = (q, correct, opts) => { q.o = shuffle(opts); q.c = q.o.indexOf(correct); };

let nConv = 0, nLangDel = 0, nCur = 0, nCurDel = 0, nSelfDel = 0, nConv7 = 0;

/* ═══ 1) التحويلات العشرية: المشتتات بنفس الأرقام ومقادير مختلفة ═══ */
const CONV10 = [
  [/كم سنتيمترًا في (\d+) متر/, 100],
  [/كم مليمترًا في (\d+) سنتيمتر/, 10],
  [/كم مليمترًا في (\d+) متر/, 1000],
  [/كم مترًا في (\d+) كيلومتر/, 1000],
  [/كم غرامًا في (\d+) كيلوغرام/, 1000],
  [/كم ملليلترًا في (\d+) لتر/, 1000],
  [/كم مل في (\d+) لتر/, 1000],
];
for (const q of Q) {
  if (!q.o) continue;
  for (const [re, f] of CONV10) {
    const m = q.t.match(re);
    if (!m) continue;
    const n = +m[1], ans = String(n * f);
    // مقادير مجاورة بنفس الأرقام — التخمين بالأصفار لم يعد يعمل
    const cands = [String(n * f / 10), String(n * f * 10), String(n * f / 100), String(n * f * 100), String(n)]
      .filter(x => x !== ans && !x.includes('.') && +x >= 1);
    setC(q, ans, [ans, ...cands.slice(0, 3)]);
    nConv++;
    break;
  }
  // التحويلات غير العشرية (أسبوع/ساعة/دقيقة/يوم): مشتتات بمعاملات مغلوطة شائعة
  const m7 = q.t.match(/كم يومًا في (\d+) أسبوع/);
  const m60 = q.t.match(/كم دقيقة في (\d+) ساعة/) || q.t.match(/كم ثانية في (\d+) دقيقة/);
  const m24 = q.t.match(/كم ساعة في (\d+) يوم/);
  const mm = m7 || m60 || m24;
  if (mm) {
    const f = m7 ? 7 : m60 ? 60 : 24, n = +mm[1], ans = String(n * f);
    const wrong = [...new Set([n * (f - 1), n * (f + 1), n * f + n, n * (f === 7 ? 5 : f === 24 ? 12 : 30)])]
      .map(String).filter(x => x !== ans);
    setC(q, ans, [ans, ...wrong.slice(0, 3)]);
    nConv7++;
  }
}

/* ═══ 2) اللغات: حذف كل سؤال إجابته مشتقة من اسم الدولة ═══ */
Q = Q.filter(q => {
  if (!q.o || !/اللغات الرسمية/.test(q.t)) return true;
  const ans = nrm(q.o[q.c]);
  const country = nrm((q.t.match(/في ([^؟]+)؟/) || ['', ''])[1]);
  const derivable = ans.length >= 3 && (country.includes(ans.slice(0, Math.min(5, ans.length - 1))) ||
    ans.includes(country.slice(0, Math.min(5, country.length))));
  if (derivable) { nLangDel++; return false }
  return true;
});

/* ═══ 3) العملات: السؤال عن فئة العملة — الصفة القُطرية تُنزع من كل الخيارات ═══ */
const CUR_POOL = ['الدينار', 'الريال', 'الجنيه', 'الفرنك', 'البيزو', 'الليرة', 'الكرونة', 'الروبية',
  'الدرهم', 'الشلن', 'الفورنت', 'الزلوتي', 'اليورو', 'الين', 'اليوان', 'الوون', 'الراند', 'البات', 'الروبل', 'الكوانزا'];
const curType = v => {
  const w = String(v).trim().split(/\s+/)[0];
  return w.startsWith('ال') ? w : 'ال' + w;
};
Q = Q.filter(q => {
  if (!q.o || !/العملات الرسمية|إحدى العملات/.test(q.t)) return true;
  const country = (q.t.match(/في ([^؟]+)؟/) || ['', ''])[1].trim();
  const ansType = curType(q.o[q.c]);
  // عملة اسمها هو نسبة البلد نفسها (أفغاني…) لا يمكن إصلاحها — تُحذف
  if (nrm(country).includes(nrm(ansType).slice(0, 4))) { nCurDel++; return false }
  const used = new Set([ansType]);
  const opts = [ansType];
  for (let i = 0; i < q.o.length && opts.length < 4; i++) {
    if (i === q.c) continue;
    const t2 = curType(q.o[i]);
    if (!used.has(t2)) { used.add(t2); opts.push(t2) }
  }
  for (const p of shuffle(CUR_POOL)) { if (opts.length >= 4) break; if (!used.has(p)) { used.add(p); opts.push(p) } }
  q.t = `ما فئة العملة الرسمية المستخدمة في ${country}؟`;
  setC(q, ansType, opts);
  nCur++;
  return true;
});

/* ═══ 4) كاشف عام على كل الأسئلة: الإجابة داخل نص السؤال = حذف ═══ */
const COMPARATIVE = /من فاز|أيهما|أكثر عددًا|ضد |ما نتيجة|أطول|أقصر|أكبر|أصغر|قبل|بعد|ترتيب/;
Q = Q.filter(q => {
  if (!q.o || COMPARATIVE.test(q.t)) return true;
  const r = nrm(q.o[q.c]);
  if (r.length >= 4 && nrm(q.t).includes(r)) { nSelfDel++; return false }
  return true;
});

console.log(`تحويلات عشرية أُصلحت: ${nConv} · تحويلات زمنية: ${nConv7}`);
console.log(`لغات محذوفة (مشتقة): ${nLangDel} · عملات حُوّلت لفئات: ${nCur} · عملات محذوفة: ${nCurDel}`);
console.log(`إجابة داخل السؤال (حُذفت): ${nSelfDel}`);
console.log('بعد التلميع:', Q.length);

/* فحص أخير: لا سؤال متبقٍ إجابته في نصه (خارج المقارنات) ولا خيارات مكررة */
let bad = 0;
for (const q of Q) {
  if (!q.o) continue;
  if (new Set(q.o.map(nrm)).size !== q.o.length) { bad++; console.log('  خيارات مكررة:', q.t.slice(0, 50), q.o) }
  if (!COMPARATIVE.test(q.t)) {
    const r = nrm(q.o[q.c]);
    if (r.length >= 4 && nrm(q.t).includes(r)) { bad++; console.log('  إجابة مكشوفة:', q.t.slice(0, 50)) }
  }
}
if (bad) { console.error('فشل: ' + bad); process.exit(1) }

const body = Q.map(q => JSON.stringify(q)).join(',\n');
fs.writeFileSync(FILE, src.slice(0, a) + 'const Q=[' + body + '\n]' + src.slice(b + 1));
console.log('كُتب ✔');
