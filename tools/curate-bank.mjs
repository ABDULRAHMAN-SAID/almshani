// معايرة بنك الأسئلة: فرز الفئات (لا خلط)، صعوبة محسوبة من المحتوى، وتوزيع متدرج على المحطات
// python3-free — node tools/curate-bank.mjs
import fs from 'fs';

const FILE = 'tahaddi/index.html';
const src = fs.readFileSync(FILE, 'utf8');
const a = src.indexOf('const Q=[');
const b = src.indexOf('];', a);
const Q = JSON.parse('[' + src.slice(a + 9, b).trim().replace(/,\s*$/, '') + ']');
console.log('قبل:', Q.length);

/* ═══ 1) قوائم الشهرة ═══ */
const FAMOUS_ELEM = /ذهب|فضة|حديد|نحاس|أكسجين|هيدروجين|كربون|نيتروجين|كالسيوم|صوديوم|بوتاسيوم|كلور|يود|ألومنيوم|ألمنيوم|زئبق|كبريت|فسفور|هيليوم|نيون|زنك|رصاص|قصدير|بلاتين|يورانيوم/;
const FAMOUS_CTRY = /السعودية|الإمارات|قطر|الكويت|عمان|عُمان|البحرين|العراق|سوريا|الأردن|لبنان|فلسطين|اليمن|ليبيا|تونس|الجزائر|المغرب|السودان|مصر|فرنسا|ألمانيا|الولايات المتحدة|أمريكا|بريطانيا|المملكة المتحدة|إيطاليا|إسبانيا|الصين|اليابان|الهند|البرازيل|الأرجنتين|روسيا|تركيا|إيران|باكستان|إندونيسيا|ماليزيا|كندا|أستراليا|هولندا|البرتغال|اليونان|سويسرا|السويد|النرويج|المكسيك|كوريا الجنوبية|بلجيكا|النمسا/;
const MID_CTRY = /بولندا|أوكرانيا|رومانيا|المجر|التشيك|الدنمارك|فنلندا|أيرلندا|كرواتيا|صربيا|تشيلي|كولومبيا|بيرو|فنزويلا|أوروغواي|الإكوادور|نيجيريا|كينيا|إثيوبيا|غانا|السنغال|الكاميرون|جنوب أفريقيا|تايلاند|فيتنام|الفلبين|بنغلاديش|سريلانكا|أفغانستان|كازاخستان|أوزبكستان|نيوزيلندا|كوبا|جامايكا|قبرص|مالطا|آيسلندا|الصومال|جيبوتي|موريتانيا/;
const FAMOUS_SURA = /الفاتحة|البقرة|آل عمران|النساء|المائدة|الأنعام|يس|الكهف|مريم|طه|الرحمن|الواقعة|الملك|يوسف|إبراهيم|محمد|النور|لقمان|السجدة|الدخان|الفتح|الحجرات|ق |القمر|الجمعة|المنافقون|التغابن|الطلاق|التحريم|النبأ|النازعات|عبس|التكوير|الانفطار|المطففين|الانشقاق|البروج|الطارق|الأعلى|الغاشية|الفجر|البلد|الشمس|الليل|الضحى|الشرح|التين|العلق|القدر|البينة|الزلزلة|العاديات|القارعة|التكاثر|العصر|الهمزة|الفيل|قريش|الماعون|الكوثر|الكافرون|النصر|المسد|الإخلاص|الفلق|الناس/;
const SHORT_SURA = /الإخلاص|الكوثر|النصر|العصر|الفلق|الناس|المسد|الفيل|قريش|الماعون|الفاتحة|القدر|الزلزلة|الهمزة|التكاثر|القارعة|العاديات|التين|الشرح|الضحى/;
const FAMOUS_ANIMAL = /أسد|نمر|فهد|فيل|زرافة|جمل|حصان|قط|كلب|دجاج|حمام|بقرة|خروف|ماعز|صقر|نسر|بومة|ذئب|ثعلب|دب|قرد|غزال|أرنب|سلحفاة|تمساح|ثعبان|قرش|دولفين|حوت|بطريق|نعامة|ببغاء|نحلة|فراشة/;

const OBSCURE = /البراسيوديميوم|الغادولينيوم|الثوليوم|الإيتريوم|الروبيديوم|السترونشيوم|البزموت|الأمريسيوم|اللوتيشيوم|الهافنيوم|التنتالوم|الزركونيوم|السيبورغيوم|الدارمشتاتيوم|سانت فنسنت|غرينادين|توفالو|ناورو|كيريباتي|بالاو|ليختنشتاين|سان مارينو|جزر مارشال|إسواتيني|ليسوتو|تيمور|بوتان|بروناي|فانواتو|ساموا|تونغا|غيانا|سورينام|بليز/;

/* ═══ 2) إعادة التصنيف للشبكة الصحيحة (نُقل فقط عند الثقة) ═══ */
const netOf = n => n.startsWith('gen') ? 'general' : n.startsWith('ar') ? 'arab'
  : n.startsWith('fb') ? 'football' : n.startsWith('rel') ? 'religion'
  : n.startsWith('an') ? 'animals' : n.startsWith('sci') ? 'science'
  : n.startsWith('geo') ? 'geography' : 'puzzles';

const DYNASTY = /الأدارسة|الأموي|العباسي|الفاطمي|المرابط|الموحد|الأغالب|السلاجق|الغزنوي|الصفوي|الأيوبي|المملوكي|الرستمي|الزيري|الحفصي|المريني|النصري|القرامطة|الطولوني|الإخشيدي|بني الأحمر|الخلافة الراشدة/;
function targetNet(q) {
  const net = netOf(q.n), t = q.t;
  if (/عاصمة/.test(t) && DYNASTY.test(t)) return 'arab';
  if (net !== 'general' && net !== 'arab') return net; // نثق بتصنيف الشبكات المتخصصة
  if (/عنصر|الجدول الدوري|العدد الذري|الكتلة الذرية|نظير|يرمز له بالرمز|الغلاف الخارجي/.test(t)) return 'science';
  if (/كوكب|مجرة|الجاذبية|خلية|ضوء الشمس|الغلاف الجوي|جسم الإنسان|القلب|الدماغ|الرئت|العظام/.test(t)) return 'science';
  if (/عاصمة(?! الدولة الأموية| الدولة العباسية| الخلافة)|نطاق الإنترنت|مفتاح الاتصال|رمز الدولة|في أي قارة|إقليم قاري|منطقة فرعية/.test(t)) return 'geography';
  if (/سورة|ﷺ|القرآن|الصحاب|أركان|الوضوء|الصلوات|رمضان|الزكاة|الحج(?![ا-ي])/.test(t)) return 'religion';
  if (/كأس العالم|الدوري|لكرة القدم|نادي |منتخب/.test(t)) return 'football';
  if (net === 'general' && /معركة|الخلافة|الدولة الأموي|الدولة العباسي|العثماني|فتح الأندلس|حضارة|صلاح الدين|هارون الرشيد/.test(t)) return 'arab';
  return net;
}

/* ═══ 3) درجة صعوبة من المحتوى — كلما زادت زاد العسر ═══ */
const nums = t => (t.match(/\d+/g) || []).map(Number);
function score(q, net) {
  const t = q.t, all = t + ' ' + (q.o || []).join(' ');
  let s = 2.5;
  const ans = String((q.o || [])[q.c] || '');
  if (net === 'science') {
    if (/يرمز له بالرمز/.test(t)) s = FAMOUS_ELEM.test(ans) ? 1.9 : 4.2;
    else if (/ما الرمز الكيميائي/.test(t)) s = FAMOUS_ELEM.test(t) ? 1.9 : 4.2;
    else if (/العدد الذري/.test(t)) s = FAMOUS_ELEM.test(t) ? 3.4 : 4.8;
    else if (/الكتلة الذرية|نظير/.test(t)) s = 5;
    else if (/في أي دورة|الغلاف الخارجي/.test(t)) s = 4.4;
    else s = FAMOUS_ELEM.test(t) ? 2 : 2.6;
  } else if (net === 'geography') {
    const fame = FAMOUS_CTRY.test(t) ? 0 : MID_CTRY.test(t) ? 1 : 2;
    if (/ما عاصمة/.test(t)) s = 1.2 + fame * 1.4;
    else if (/إقليم قاري|منطقة فرعية|في أي قارة/.test(t)) s = 1.4 + fame * .9;
    else if (/اللغات الرسمية/.test(t)) s = 1.9 + fame * .9;
    else if (/العملات الرسمية/.test(t)) s = 2.1 + fame * .95;
    else if (/مفتاح الاتصال/.test(t)) s = 3.9 + fame * .5;
    else if (/رمز الدولة|ISO/.test(t)) s = 3.8 + fame * .5;
    else if (/نطاق الإنترنت/.test(t)) s = 3.6 + fame * .55;
    else s = 2 + fame * .9;
  } else if (net === 'football') {
    const y = (t.match(/\b(19|20)\d\d\b/) || [null])[0];
    let ym = 0;
    if (y) { const yr = +y; ym = yr >= 2010 ? -0.8 : yr >= 1990 ? -0.25 : yr >= 1960 ? 0.5 : 1; }
    const both = (t.match(FAMOUS_CTRY) || []).length;
    if (/ما نتيجة مباراة/.test(t)) s = 3.5 + ym + (both ? -0.2 : 0.5);
    else if (/من فاز في مباراة/.test(t)) s = 2.6 + ym + (both ? -0.3 : 0.5);
    else if (/كم هدفًا|هداف/.test(t)) s = 3 + ym;
    else s = 2.4 + (FAMOUS_CTRY.test(all) ? 0 : 0.6);
  } else if (net === 'religion') {
    if (/ما مجموع عدد آيات/.test(t)) s = 4.6;
    else if (/ما الفرق في عدد الآيات/.test(t)) s = 4.3;
    else if (/كم عدد آيات سورة/.test(t)) s = SHORT_SURA.test(t) ? 1.6 : FAMOUS_SURA.test(t) ? 3 : 4.1;
    else if (/ما اسم السورة رقم (\d+)/.test(t)) { const n2 = +t.match(/رقم (\d+)/)[1]; s = n2 <= 10 || n2 >= 110 ? 2.2 : n2 >= 78 ? 3.2 : 4.3; }
    else if (/ما رقم سورة/.test(t)) s = /الفاتحة|البقرة|الناس|الإخلاص|الفلق/.test(t) ? 1.8 : FAMOUS_SURA.test(t) ? 3.4 : 4.4;
    else if (/أي السور|أي سورة/.test(t)) s = SHORT_SURA.test(t) ? 2.2 : FAMOUS_SURA.test(t) ? 2.8 : 3.8;
    else s = /أركان|الصلوات الخمس|شهر رمضان|أول سورة|كم جزء/.test(t) ? 1.2 : 2.6;
  } else if (net === 'puzzles') {
    const ns = nums(all), mx = Math.max(0, ...ns);
    if (/بقيت معك|أعطيت/.test(t)) s = mx <= 30 ? 1 : 1.6;
    else if (/زوجي أم فردي/.test(t)) s = mx <= 100 ? 1 : 1.5;
    else if (/أيهما أكبر|أيهما أصغر/.test(t)) s = 1.2;
    else if (/متتالية هندسية/.test(t)) s = 4.6;
    else if (/يقبل القسمة/.test(t)) s = 3;
    else if (/ما العدد التالي في النمط/.test(t)) s = /-\d/.test(t) ? 3.3 : 2.7;
    else if (/^إذا كان \d/.test(t)) s = 3.5;               // معامل قبل س
    else if (/إذا كان س/.test(t)) s = /-\s*\d|= *-/.test(String((q.o||[])[q.c]||'')) || /س \+ (\d+) = (\d+)/.test(t) && (+t.match(/س \+ (\d+) = (\d+)/)[2] < +t.match(/س \+ (\d+) = (\d+)/)[1]) ? 3.2 : 2.4;
    else if (/ناتج/.test(t)) {
      if (/×/.test(t)) s = mx <= 12 ? 2.1 : mx <= 40 ? 3 : 3.7;
      else if (/÷/.test(t)) s = mx <= 60 ? 2.3 : 3.4;
      else s = mx <= 20 ? 1.1 : mx <= 100 ? 1.9 : mx <= 1000 ? 2.7 : 3.2;
    } else s = 2.5;
  } else if (net === 'animals') {
    const fame = FAMOUS_ANIMAL.test(t) ? -0.9 : OBSCURE.test(t) ? 1 : 0.3;
    if (/فئة حيوانية|التصنيف المستخدم/.test(t)) s = 2.4 + fame;
    else s = 2.6 + fame;
  } else if (net === 'arab') {
    s = /عام الفيل|الهجرة|فتح مكة|بدر|صلاح الدين|هارون الرشيد|أول الخلفاء/.test(t) ? 1.6
      : DYNASTY.test(t) ? 3.1 : 2.8;
  } else { // general
    if (/ما المقصود بالاختصار|الاختصار الشائع/.test(t))
      s = /ATM|UN\b|SMS|PIN|GPS|USB|TV|CV/.test(t) ? 1.7 : /CSS|HTTP|HTML|GDP|SI|CEO|NASA|WWW/.test(t) ? 2.9 : 3.5;
    else s = 2.4;
  }
  if (OBSCURE.test(t + ' ' + String((q.o || [])[q.c] || ''))) s += 1;
  const oc = (q.o || []).length; if (oc >= 6) s += .3;
  return Math.max(1, Math.min(5.5, s));
}

/* ═══ 4) عقد كل شبكة وأوزان التوزيع ═══ */
const NODESETS = {
  general: [['gen_1', 1], ['gen_2', 2], ['gen_3', 3], ['gen_4', 4], ['gen_5', 4], ['gen_boss', 5]],
  arab: [['ar_1', 1], ['ar_2', 2], ['ar_3', 3], ['ar_4', 4], ['ar_5', 4], ['ar_6', 4], ['ar_boss', 5]],
  football: [['fb_1', 1], ['fb_2', 2], ['fb_3', 3], ['fb_4', 4], ['fb_5', 4], ['fb_6', 4], ['fb_boss', 5]],
  religion: [['rel_1', 1], ['rel_2', 2], ['rel_3', 3], ['rel_4', 4], ['rel_5', 4], ['rel_6', 4], ['rel_boss', 5]],
  animals: [['an_1', 1], ['an_2', 2], ['an_boss', 5]],
  science: [['sci_1', 1], ['sci_2', 2], ['sci_3', 3], ['sci_4', 4], ['sci_5', 4], ['sci_6', 4], ['sci_boss', 5]],
  geography: [['geo_1', 1], ['geo_2', 2], ['geo_3', 3], ['geo_4', 4], ['geo_5', 4], ['geo_boss', 5]],
  puzzles: [['puz_1', 1], ['puz_2', 2], ['puz_3', 3], ['puz_4', 4], ['puz_5', 4], ['puz_6', 4], ['puz_boss', 5]]
};
const W = { 1: 22, 2: 20, 3: 20, 4: 28, 5: 10 }; // أوزان أرحب للسهل — اللعبة تُسلّي لا تُرهِب

/* ═══ 5) التنفيذ ═══ */
const byNet = {};
for (const q of Q) {
  const net = targetNet(q);
  (byNet[net] = byNet[net] || []).push(q);
}
console.log('بعد الفرز:', Object.fromEntries(Object.entries(byNet).map(([k, v]) => [k, v.length])));

for (const [net, qs] of Object.entries(byNet)) {
  const nodes = NODESETS[net];
  const levels = [...new Set(nodes.map(x => x[1]))].sort();
  const wSum = levels.reduce((s2, l) => s2 + W[l], 0);
  qs.forEach(q => q._s = score(q, net));
  qs.sort((x, y) => x._s - y._s);
  // حدود الشرائح التراكمية لكل مستوى
  let start = 0;
  for (const lv of levels) {
    const take = lv === levels[levels.length - 1] ? qs.length - start : Math.round(qs.length * W[lv] / wSum);
    const slice = qs.slice(start, start + take);
    const lvNodes = nodes.filter(x => x[1] === lv).map(x => x[0]);
    slice.forEach((q, i) => { q.n = lvNodes[i % lvNodes.length]; q.d = lv; });
    start += take;
  }
  qs.forEach(q => delete q._s);
}

/* ═══ 6) فحوص السلامة ═══ */
const cnt = {};
Q.forEach(q => cnt[q.n] = (cnt[q.n] || 0) + 1);
const NODE_D = {}; Object.values(NODESETS).flat().forEach(([id, d]) => NODE_D[id] = d);
let bad = 0;
for (const q of Q) if (q.d !== NODE_D[q.n]) bad++;
const starving = Object.entries(cnt).filter(([, c]) => c < 24);
console.log('توزيع العقد:', JSON.stringify(cnt));
console.log('عدم تطابق صعوبة/عقدة:', bad, '· عقد فقيرة (<24):', starving.map(x => x.join(':')).join(' ') || 'لا شيء');
if (bad) { console.error('فشل: صعوبات غير متطابقة'); process.exit(1); }

/* عيّنات للمراجعة البشرية */
for (const id of ['gen_1', 'sci_1', 'geo_1', 'rel_1', 'puz_1', 'fb_1']) {
  const s2 = Q.filter(q => q.n === id).slice(0, 3).map(q => q.t.slice(0, 55));
  console.log(`\n${id} (أسهل):`); s2.forEach(x => console.log('  ·', x));
}
for (const id of ['sci_boss', 'geo_boss', 'rel_boss']) {
  const s2 = Q.filter(q => q.n === id).slice(-2).map(q => q.t.slice(0, 55));
  console.log(`\n${id} (أصعب):`); s2.forEach(x => console.log('  ·', x));
}

/* ═══ 7) الكتابة ═══ */
const body = Q.map(q => JSON.stringify(q)).join(',\n');
fs.writeFileSync(FILE, src.slice(0, a) + 'const Q=[' + body + '\n]' + src.slice(b + 1));
console.log('\nكُتب البنك:', Q.length, '✔');
