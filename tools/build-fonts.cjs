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

/* نطاقات المحارف من ورقة Google Fonts نفسها: المتصفّح لا ينزّل شريحة لا يحتاجها */
/* ٦٫٩٣ — وجهٌ ثانٍ للعرض: El Messiri (SIL OFL) للعناوين والأرقام الكبيرة والأزرار — شريحتان (عربيّة ولاتينيّة للأرقام) ~٤٦ك */
const SUBSETS=[
 {fam:'Cairo',w:'200 1000',f:'cairo-arabic.woff2',r:'U+0600-06FF,U+0750-077F,U+0870-088E,U+0890-0891,U+0897-08E1,U+08E3-08FF,U+200C-200E,U+2010-2011,U+204F,U+2E41,U+FB50-FDFF,U+FE70-FE74,U+FE76-FEFC'},
 {fam:'Cairo',w:'200 1000',f:'cairo-latin.woff2',r:'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD'},
 {fam:'Cairo',w:'200 1000',f:'cairo-latin-ext.woff2',r:'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF'},
 {fam:'El Messiri',w:'700',f:'elmessiri-700-arabic.woff2',r:'U+0600-06FF,U+0750-077F,U+0870-088E,U+0890-0891,U+0897-08E1,U+08E3-08FF,U+200C-200E,U+2010-2011,U+204F,U+2E41,U+FB50-FDFF,U+FE70-FE74,U+FE76-FEFC'},
 {fam:'El Messiri',w:'700',f:'elmessiri-700-latin.woff2',r:'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD'}
];

let css='/* خطّا Cairo وEl Messiri — SIL Open Font License 1.1 — مضمَّنان كي تعمل اللعبة والتطبيق دون اتصال */\n';
let bytes=0;
for(const s of SUBSETS){
 const p=path.join(DIR,s.f);
 if(!fs.existsSync(p))throw new Error('ملفّ الخطّ مفقود: '+p);
 const b64=fs.readFileSync(p).toString('base64');
 bytes+=fs.statSync(p).size;
 css+=`@font-face{font-family:'${s.fam}';font-style:normal;font-weight:${s.w};font-display:swap;`
  +`src:url(data:font/woff2;base64,${b64}) format('woff2');unicode-range:${s.r}}\n`;
}

const html=fs.readFileSync(HTML,'utf8');
const re=/(<style id="fontface">\/\* ⟦fonts⟧ \*\/)[\s\S]*?(\/\* ⟦\/fonts⟧ \*\/<\/style>)/;
if(!re.test(html))throw new Error('لا توجد كتلة ⟦fonts⟧ في index.html');
fs.writeFileSync(HTML,html.replace(re,(_,a,b)=>a+'\n'+css+b));
console.log(`✓ ضُمّنت الخطوط — ${SUBSETS.length} شرائح · ${(bytes/1024).toFixed(0)}ك (${(bytes*4/3/1024).toFixed(0)}ك بعد الترميز)`);
