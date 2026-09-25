#!/usr/bin/env node
/**
 * يضمّن خطّ Cairo داخل اللعبة بدل تحميله من Google Fonts.
 *
 * لماذا: التطبيق على الهاتف يجب أن يعرض الخطّ الصحيح من أوّل فتح وبلا إنترنت،
 * ولأنّ اللعبة ملفّ واحد فلا مكان لملفّ خطّ بجانبها. الخطّ نسخة متغيّرة (٢٠٠–١٠٠٠)
 * في ثلاث شرائح (عربية، لاتينية، لاتينية موسّعة) فمجموعها ~٨٠ كيلوبايت.
 *
 * يكتب الكتلة بين ⟦fonts⟧ و⟦/fonts⟧ في tahaddi/index.html — أعد تشغيله بعد تحديث الملفّات:
 *   node tools/build-fonts.cjs
 * الترخيص: SIL Open Font License 1.1 — نصّه في tahaddi/fonts/OFL.txt.
 */
const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..');
const DIR=path.join(ROOT,'tahaddi','fonts');
const HTML=path.join(ROOT,'tahaddi','index.html');

/* ٦٫٩٦ — عدسة الطباعة (قياسٌ على ١٥ شاشة و١٢ خطًّا): El Messiri كان يرسم أرقام اللعبة كلّها بنمطٍ رفيعٍ شبه «تايمز» وبلا أرقامٍ
   متساوية العرض فيهتزّ العدّ المتحرّك، ووزنه 700 فقط. البديل: Baloo Bhaijaan 2 للعناوين والأرقام (700–800، أرقامٌ جدوليّة عبر tnum،
   أقرب خطٍّ مفتوح الترخيص لطابع كلاش رويال) وCairo للنصّ (400–900 بلا ميل). كلاهما شريحةٌ واحدة مقتطعة بـ pyftsubset
   (لاتينيّة أساسيّة + « » · × + العربيّة وأشكالها + علامات الترقيم العامّة + € −) — ٩٣ك بدل ١٢٧ك. */
const SUBSETS=[
 {fam:'Cairo',w:'400 900',f:'cairo-400-900.woff2'},
 {fam:'Baloo Bhaijaan 2',w:'700 800',f:'baloobhaijaan2-700-800.woff2'},
 /* ٧٫١٦ — «الكتابة كبيرة ومرعبة وسيّئة»: العناوين والأزرار والأسماء بخطّ El Messiri (فاخرٌ مقروء، بحروفٍ عربيّة فقط عبر unicode-range)
    والأرقام واللاتينيّة تسقط إلى Cairo بأرقامٍ متساوية العرض — فلا يعود عيب ٦٫٩٦ (أرقامٌ رفيعة يهتزّ عدّها) */
 {fam:'Tahaddi Messiri',w:'400 700',f:'elmessiri-ar-400-700.woff2',r:'U+0600-06FF,U+0750-077F,U+08A0-08FF,U+FB50-FDFF,U+FE70-FEFF,U+200C-200F'}
];

let css='/* خطوط Cairo وBaloo Bhaijaan 2 وEl Messiri — SIL Open Font License 1.1 — مضمَّنة كي تعمل اللعبة والتطبيق دون اتصال */\n';
let bytes=0;
for(const s of SUBSETS){
 const p=path.join(DIR,s.f);
 if(!fs.existsSync(p))throw new Error('ملفّ الخطّ مفقود: '+p);
 const b64=fs.readFileSync(p).toString('base64');
 bytes+=fs.statSync(p).size;
 css+=`@font-face{font-family:'${s.fam}';font-style:normal;font-weight:${s.w};font-display:swap;`
  +`src:url(data:font/woff2;base64,${b64}) format('woff2')${s.r?';unicode-range:'+s.r:''}}\n`;
}

const html=fs.readFileSync(HTML,'utf8');
const re=/(<style id="fontface">\/\* ⟦fonts⟧ \*\/)[\s\S]*?(\/\* ⟦\/fonts⟧ \*\/<\/style>)/;
if(!re.test(html))throw new Error('لا توجد كتلة ⟦fonts⟧ في index.html');
fs.writeFileSync(HTML,html.replace(re,(_,a,b)=>a+'\n'+css+b));
console.log(`✓ ضُمّنت الخطوط — ${SUBSETS.length} شرائح · ${(bytes/1024).toFixed(0)}ك (${(bytes*4/3/1024).toFixed(0)}ك بعد الترميز)`);
