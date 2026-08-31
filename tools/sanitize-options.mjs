// منقّح الخيارات الشامل ج2 — منطق لكل عائلة أسئلة:
//  • «ما نتيجة مباراة»: كل الخيارات نتائج بصيغة س-ص مشتقة من النتيجة الحقيقية
//  • «من فاز في مباراة س ضد ص»: الخيارات = الفريقان المذكوران + تعادل فقط
//  • «أي السورتين …»: الخياران = السورتان المذكورتان في السؤال فقط
//  • المتتاليات والأعداد: مشتتات من نفس مقياس الإجابة وإشارتها
//  • كل عائلة قوالب كبيرة: المشتتات من إجابات العائلة نفسها لا من خارجها
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
  .replace(/[ً-ْ«»"'؟?!.،,:]/g, '').replace(/\s+/g, ' ').toLowerCase();
// رقم صرف — الشرطة والنسبة ليستا رقماً (النتائج 4-1 والنسب 50% أنواع مستقلة)
const isNum = s => /\d/.test(String(s)) && /^-?[\d١٢٣٤٥٦٧٨٩٠,.\s]+$/.test(String(s).trim());
const isScore = s => /^\d+\s*[-–]\s*\d+/.test(String(s).trim());
const NUMW = { 'واحد': 1, 'واحده': 1, 'اثنان': 2, 'اثنين': 2, 'ثلاثه': 3, 'ثلاث': 3, 'اربعه': 4, 'اربع': 4,
  'خمسه': 5, 'خمس': 5, 'سته': 6, 'ست': 6, 'سبعه': 7, 'سبع': 7, 'ثمانيه': 8, 'ثماني': 8, 'ثمان': 8,
  'تسعه': 9, 'تسع': 9, 'عشره': 10, 'عشر': 10, 'صفر': 0 };
const numVal = s => {
  const t = nrm(s);
  if (NUMW[t] != null) return NUMW[t];
  if (!isNum(s)) return null;
  const n = parseFloat(String(s).trim().replace(/[^\d.-]/g, ''));
  return isNaN(n) ? null : n;
};
// مشتتات رقمية من نفس المقياس والإشارة — لا قفزات كوكبية
function numDistract(v) {
  v = Math.round(v);
  const m = Math.max(1, Math.round(Math.abs(v) * .15));
  const cand = uniq([v * 2, Math.round(v / 2), v + m, v - m, v + m * 2, v - m * 2, v + 1, v - 1]
    .filter(x => x !== v).map(String));
  return shuffled(cand).slice(0, 3);
}
const stats = { score: 0, winner: 0, surah: 0, seq: 0, numFix: 0, mixSwap: 0, pool: 0, dropped: 0 };
const drop = q => { q._drop = 1; stats.dropped++ };

// ── 1) «ما نتيجة مباراة …»: كل الخيارات نتائج ──
for (const q of Q) {
  if (!q.o || q.tf || q.fill) continue;
  if (!/^ما نتيجة مباراة/.test(q.t)) continue;
  const corr = String(q.o[q.c] ?? '');
  const m = corr.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (!m) { drop(q); continue }
  const a = +m[1], b = +m[2];
  const cands = uniq([
    a !== b ? `${b}-${a}` : `${a + 1}-${b}`,
    `${a + 1}-${b}`, `${a}-${b + 1}`,
    a > 0 ? `${a - 1}-${b}` : `${a + 2}-${b}`,
    b > 0 ? `${a}-${b - 1}` : `${a}-${b + 2}`,
    `${a + 1}-${b + 1}`
  ].filter(x => x !== `${a}-${b}` && x !== corr));
  q.o = shuffled([corr, ...shuffled(cands).slice(0, 3)]);
  q.c = q.o.indexOf(corr);
  stats.score++;
}

// ── 2) «من فاز في مباراة س ضد ص»: الفريقان + تعادل ──
for (const q of Q) {
  if (!q.o || q.tf || q.fill || q._drop) continue;
  if (!/^من فاز في مباراة/.test(q.t)) continue;
  const m = q.t.match(/مباراة\s+(.+?)\s+ضد\s+(.+?)\s+(?:في|بتاريخ|[؟?])/);
  if (!m) continue;                        // صيغة أخرى — تُعالج في ممر العائلات
  const A = m[1].trim(), B = m[2].trim();
  const corr = String(q.o[q.c] ?? '');
  let pick = null;
  if (nrm(corr) === nrm(A)) pick = A;
  else if (nrm(corr) === nrm(B)) pick = B;
  else if (/تعادل/.test(corr)) pick = 'تعادل';
  if (!pick) { drop(q); continue }
  q.o = shuffled([A, B, 'تعادل']);
  q.c = q.o.indexOf(pick);
  stats.winner++;
}

// ── 3) أسئلة السور: أربعة خيارات دائماً، مبنية على بيانات المصحف الحقيقية ──
// (ترتيب المصحف = موقع السورة في القائمة · عدد الآيات بالعدّ الكوفي)
const SURAHS=[['الفاتحة',7],['البقرة',286],['آل عمران',200],['النساء',176],['المائدة',120],['الأنعام',165],['الأعراف',206],['الأنفال',75],['التوبة',129],['يونس',109],['هود',123],['يوسف',111],['الرعد',43],['إبراهيم',52],['الحجر',99],['النحل',128],['الإسراء',111],['الكهف',110],['مريم',98],['طه',135],['الأنبياء',112],['الحج',78],['المؤمنون',118],['النور',64],['الفرقان',77],['الشعراء',227],['النمل',93],['القصص',88],['العنكبوت',69],['الروم',60],['لقمان',34],['السجدة',30],['الأحزاب',73],['سبأ',54],['فاطر',45],['يس',83],['الصافات',182],['ص',88],['الزمر',75],['غافر',85],['فصلت',54],['الشورى',53],['الزخرف',89],['الدخان',59],['الجاثية',37],['الأحقاف',35],['محمد',38],['الفتح',29],['الحجرات',18],['ق',45],['الذاريات',60],['الطور',49],['النجم',62],['القمر',55],['الرحمن',78],['الواقعة',96],['الحديد',29],['المجادلة',22],['الحشر',24],['الممتحنة',13],['الصف',14],['الجمعة',11],['المنافقون',11],['التغابن',18],['الطلاق',12],['التحريم',12],['الملك',30],['القلم',52],['الحاقة',52],['المعارج',44],['نوح',28],['الجن',28],['المزمل',20],['المدثر',56],['القيامة',40],['الإنسان',31],['المرسلات',50],['النبأ',40],['النازعات',46],['عبس',42],['التكوير',29],['الانفطار',19],['المطففين',36],['الانشقاق',25],['البروج',22],['الطارق',17],['الأعلى',19],['الغاشية',26],['الفجر',30],['البلد',20],['الشمس',15],['الليل',21],['الضحى',11],['الشرح',8],['التين',8],['العلق',19],['القدر',5],['البينة',8],['الزلزلة',8],['العاديات',11],['القارعة',11],['التكاثر',8],['العصر',3],['الهمزة',9],['الفيل',5],['قريش',4],['الماعون',7],['الكوثر',3],['النصر',3],['المسد',5],['الإخلاص',4],['الفلق',5],['الناس',6]];
const surByN={};SURAHS.forEach(([n2,a2],i2)=>{surByN[nrm(n2)]={n:n2,a:a2,i:i2}});
for (const q of Q) {
  if (!q.o || q.tf || q.fill || q._drop) continue;
  if (!/^أي السورتين/.test(q.t)) continue;
  const m = q.t.match(/سورة\s+(.+?)\s+(?:أم\s+سورة|سورة)\s+([^؟?]+)/) ||
            q.t.match(/:\s*سورة\s+(.+?)\s+أم\s+سورة\s+([^؟?]+)/);
  if (!m) { drop(q); continue }
  const A = surByN[nrm(m[1])], B = surByN[nrm(m[2])];
  if (!A || !B) { drop(q); continue }
  const more = /أكثر عدد/.test(q.t);
  const order = /تسبق|ترتيب المصحف/.test(q.t);
  if (!more && !order) { drop(q); continue }
  let win, lose;
  if (more) {
    if (A.a === B.a) { drop(q); continue }
    win = A.a > B.a ? A : B; lose = A.a > B.a ? B : A;
  } else {
    win = A.i < B.i ? A : B; lose = A.i < B.i ? B : A;
  }
  const pads = shuffled(SURAHS.map(([n2, a2], i2) => ({ n: n2, a: a2, i: i2 }))
    .filter(x => x.n !== A.n && x.n !== B.n && (more ? x.a < win.a : x.i > win.i))).slice(0, 2);
  if (pads.length < 2) { drop(q); continue }
  q.t = more ? 'أي السور التالية أكثر عددًا في الآيات؟' : 'أي السور التالية تأتي أولًا في ترتيب المصحف؟';
  q.o = shuffled([win.n, lose.n, pads[0].n, pads[1].n]);
  q.c = q.o.indexOf(win.n);
  q.e = more
    ? `سورة ${win.n} آياتها ${win.a} — أكثر من ${lose.n} (${lose.a}) وبقية الخيارات.`
    : `سورة ${win.n} ترتيبها ${win.i + 1} في المصحف — قبل ${lose.n} (${lose.i + 1}) وبقية الخيارات.`;
  stats.surah++;
}

// ── 4) المتتاليات و«العدد التالي»: إعادة بناء إجبارية بمقياس الإجابة ──
for (const q of Q) {
  if (!q.o || q.tf || q.fill || q._drop) continue;
  if (!/^(ما العدد التالي|متتالية)/.test(q.t)) continue;
  const corr = String(q.o[q.c] ?? '');
  const v = parseFloat(corr.replace(/[^\d.-]/g, ''));
  if (isNaN(v)) { drop(q); continue }
  q.o = shuffled(uniq([corr, ...numDistract(v)]));
  if (q.o.length < 4) q.o = uniq([...q.o, String(Math.round(v) + 3), String(Math.round(v) - 3)]).slice(0, 4);
  q.c = q.o.indexOf(corr);
  stats.seq++;
}

// ── 5) الحساب الصريح: تحقق من الناتج ──
const OPS = [
  [/(\d+)\s*\+\s*(\d+)/, (a, b) => a + b],
  [/(\d+)\s*[×xX*]\s*(\d+)/, (a, b) => a * b],
  [/(\d+)\s*[-−]\s*(\d+)/, (a, b) => a - b],
  [/(\d+)\s*[÷/]\s*(\d+)/, (a, b) => b && a % b === 0 ? a / b : null]
];
for (const q of Q) {
  if (!q.o || q.tf || q.fill || q._drop) continue;
  if (!/ناتج|حاصل|يساوي|اجمع|كم يكون/.test(q.t)) continue;
  for (const [re, f] of OPS) {
    const m = q.t.match(re);
    if (!m) continue;
    const truth = f(+m[1], +m[2]);
    if (truth == null) continue;
    const ts = String(truth);
    if (String(q.o[q.c]) !== ts || !q.o.every(isNum) || uniq(q.o.map(String)).length !== q.o.length) {
      q.o = shuffled(uniq([ts, ...numDistract(truth)]));
      q.c = q.o.indexOf(ts);
    }
    break;
  }
}

// ── 6) جنس الخيارات = جنس الإجابة (رقم/نتيجة/نص) ──
const txtPool = {};
for (const q of Q) {
  if (!q.o || q.tf || q.fill || q._drop) continue;
  const corr = String(q.o[q.c] ?? '');
  if (!corr || isNum(corr) || isScore(corr) || corr.split(/\s+/).length > 3) continue;
  const net = String(q.n || '').split('_')[0];
  (txtPool[net] = txtPool[net] || new Set()).add(corr);
}
Object.keys(txtPool).forEach(k => txtPool[k] = [...txtPool[k]]);
for (const q of Q) {
  if (!q.o || q.tf || q.fill || q._drop) continue;
  const corr = String(q.o[q.c] ?? '');
  if (!corr) { drop(q); continue }
  if (isScore(corr)) {
    if (!q.o.every(isScore)) { // احتياط لأي نتيجة خارج عائلة المباريات
      const m = corr.match(/(\d+)\s*[-–]\s*(\d+)/); const a = +m[1], b = +m[2];
      q.o = shuffled(uniq([corr, `${b}-${a + 1}`, `${a + 1}-${b}`, `${a}-${b + 1}`]));
      q.c = q.o.indexOf(corr); stats.score++;
    }
  } else if (isNum(corr)) {
    if (!q.o.every(isNum) || uniq(q.o.map(String)).length !== q.o.length) {
      const v = numVal(corr);
      if (v == null) { drop(q); continue }
      q.o = shuffled(uniq([corr, ...numDistract(v)]));
      if (q.o.length < 4) q.o = uniq([...q.o, String(Math.round(v) + 3), String(Math.max(0, Math.round(v) - 3))]).slice(0, 4);
      q.c = q.o.indexOf(corr);
      stats.numFix++;
    }
  } else {
    const bad = q.o.map((o, i) => ({ o, i })).filter(x => x.i !== q.c && (isNum(x.o) || isScore(x.o)));
    if (bad.length) {
      const net = String(q.n || '').split('_')[0];
      const pool = (txtPool[net] || []).filter(p => p !== corr && !q.o.includes(p));
      if (pool.length < bad.length) { drop(q); continue }
      const repl = shuffled(pool).slice(0, bad.length);
      bad.forEach((x, j) => q.o[x.i] = repl[j]);
      q.c = q.o.indexOf(corr);
      stats.mixSwap++;
    }
  }
}

// ── 7) عائلات القوالب الكبيرة: المشتت من إجابات العائلة نفسها ──
const fam = {};
for (const q of Q) {
  if (!q.o || q.tf || q.fill || q._drop) continue;
  const key = q.t.split(/\s+/).slice(0, 3).join(' ');
  (fam[key] = fam[key] || []).push(q);
}
for (const [key, list] of Object.entries(fam)) {
  if (list.length < 30) continue;
  if (/^(ما نتيجة|من فاز|أي السورتين|أي السور التالية|ما العدد|متتالية)/.test(key)) continue; // عولجت أعلاه
  const pool = uniq(list.map(q => String(q.o[q.c])));
  const poolN = new Set(pool.map(nrm));
  if (pool.length < 8) continue;
  for (const q of list) {
    const corr = String(q.o[q.c]);
    if (isNum(corr) || isScore(corr)) continue;    // الرقمية عولجت في الممر 6
    const qt = ' ' + nrm(q.t) + ' ';
    let changed = false;
    q.o = q.o.map((o, i) => {
      if (i === q.c) return o;
      const on = nrm(o);
      if (poolN.has(on)) return o;                 // من جنس العائلة
      if (on.length >= 2 && qt.includes(' ' + on + ' ')) return o;  // مذكور في السؤال
      const repl = shuffled(pool.filter(p => p !== corr && !q.o.includes(p)))[0];
      if (!repl) return o;
      changed = true;
      return repl;
    });
    q.c = q.o.indexOf(corr);
    if (changed) stats.pool++;
  }
}

// ── 8) سلامة نهائية + فاحص صارم ──
const final = Q.filter(q => {
  if (q._drop) { delete q._drop; return false }
  if (!q.o || q.tf || q.fill) return true;
  if (q.c == null || q.o[q.c] === undefined) { stats.dropped++; return false }
  if (uniq(q.o.map(String)).length !== q.o.length) {
    const corr = String(q.o[q.c]);
    q.o = uniq(q.o.map(String));
    q.c = q.o.indexOf(corr);
    if (q.c < 0 || q.o.length < 2) { stats.dropped++; return false }
  }
  return true;
});
let bad = 0;
const badList = [];
for (const q of final) {
  if (!q.o || q.tf || q.fill) continue;
  const corr = String(q.o[q.c] ?? '');
  if (!corr) { bad++; continue }
  if (isScore(corr) && !q.o.every(isScore)) bad++;
  else if (isNum(corr) && !q.o.every(isNum)) bad++;
  else if (!isNum(corr) && !isScore(corr) && q.o.some((o, i) => i !== q.c && (isNum(o) || isScore(o)))) bad++;
  if (uniq(q.o.map(String)).length !== q.o.length) bad++;
  if (/^من فاز في مباراة\s.+\sضد/.test(q.t) && q.o.length === 3 && !q.o.includes('تعادل')) bad++;
  if (!q.tf && q.o.length < 3) bad++;
  if (/^أي السور التالية/.test(q.t)) {
    if (q.o.length !== 4) bad++;
    const cs = surByN[nrm(corr)];
    if (!cs) bad++;
    else for (const o of q.o) {
      const os = surByN[nrm(o)];
      if (!os) { bad++; break }
      if (o === corr) continue;
      if (/أكثر عدد/.test(q.t) ? os.a >= cs.a : os.i <= cs.i) { bad++; break }
    }
  }
  if (bad > badList.length && badList.length < 15) badList.push(q.t.slice(0, 55) + ' || ' + JSON.stringify(q.o));
}
badList.forEach(x => console.log('✗', x));
console.log(`نتائج مباريات: ${stats.score} · فائز مباراة: ${stats.winner} · سورتان: ${stats.surah} · متتاليات: ${stats.seq}`);
console.log(`رقمية: ${stats.numFix} · مشتت دخيل: ${stats.mixSwap} · من جنس العائلة: ${stats.pool} · محذوف: ${stats.dropped}`);
console.log('أسئلة بعد التنقيح:', final.length, '· مخالفات متبقية:', bad);
if (bad > 0) throw new Error('بقيت مخالفات — لن أكتب الملف');

const ser = final.map(q => JSON.stringify(q)).join(',\n');
src = src.slice(0, start) + 'const Q=[' + ser + ']' + src.slice(end + 1);
writeFileSync(PATH, src);
console.log('كُتب الملف ✔');
