#!/usr/bin/env node
/**
 * يبني مجلّد النشر www/ من tahaddi/: اللعبة + عامل الخدمة + البيان + الأيقونات، بلا مراجع التطوير.
 * إن ضُبط TAHADDI_SERVER (مثل https://tahaddi.fly.dev) كُتب في <meta name="tahaddi-server">
 * فتتصل اللعبة بالخادم من أي مضيف ثابت (GitHub Pages، Capacitor، TWA).
 *   TAHADDI_SERVER=https://... node tools/build-www.cjs [outDir]
 */
const fs=require('fs'),path=require('path');
const SRC=path.join(__dirname,'..','tahaddi');
const OUT=process.argv[2]||path.join(__dirname,'..','www');
const SERVER=(process.env.TAHADDI_SERVER||'').trim().replace(/\/+$/,'');
fs.rmSync(OUT,{recursive:true,force:true});
fs.mkdirSync(path.join(OUT,'icons'),{recursive:true});
let html=fs.readFileSync(path.join(SRC,'index.html'),'utf8');
const META='<meta name="tahaddi-server" content="">';
if(!html.includes(META))throw new Error('لا يوجد <meta name="tahaddi-server"> في index.html');
if(SERVER){
 if(!/^https?:\/\/[^\s"'<>]+$/.test(SERVER))throw new Error('TAHADDI_SERVER ليس عنوان http(s) صالحًا: '+SERVER);
 html=html.replace(META,`<meta name="tahaddi-server" content="${SERVER}">`);
}
fs.writeFileSync(path.join(OUT,'index.html'),html);
for(const f of ['sw.js','manifest.webmanifest'])fs.copyFileSync(path.join(SRC,f),path.join(OUT,f));
for(const f of fs.readdirSync(path.join(SRC,'icons')))fs.copyFileSync(path.join(SRC,'icons',f),path.join(OUT,'icons',f));
fs.writeFileSync(path.join(OUT,'.nojekyll'),'');
const ver=(html.match(/APP_VER='([^']+)'/)||[])[1];

/* الصفحات القانونية: المتجران يطلبان رابط سياسة خصوصية يعمل قبل النشر.
   النصّ مصدره واحد داخل اللعبة (بين علامتَي ⟦legal⟧) فلا يفترق ما في التطبيق عمّا على الويب. */
const legalSrc=(html.match(/\/\* ⟦legal⟧ \*\/([\s\S]*?)\/\* ⟦\/legal⟧ \*\//)||[])[1];
if(!legalSrc)throw new Error('لا توجد كتلة ⟦legal⟧ في index.html');
const LEGAL=new Function(legalSrc+';return LEGAL')();
const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fill=t=>String(t).split('LEGAL_CONTACT').join(LEGAL.contact).split('LEGAL_LAW').join(LEGAL.law).split('LEGAL_ENTITY').join(LEGAL.entity);
const page=(d,file)=>`<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(d.t)} — تحدّي</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet">
<style>:root{color-scheme:dark}body{margin:0;background:#080B14;color:#F2F4F8;font-family:Cairo,system-ui,sans-serif;
line-height:1.9}main{max-width:720px;margin:0 auto;padding:28px 18px 60px}
h1{font-size:26px;margin:0 0 4px}.up{font-size:12px;color:#8390AD;margin-bottom:24px}
h2{font-size:16px;color:#E8B23A;margin:26px 0 8px}p{font-size:14px;color:#B0B9CE;margin:0 0 8px}
a{color:#E8B23A}footer{margin-top:34px;font-size:12px;color:#8390AD;border-top:1px solid #28324E;padding-top:14px}
nav{font-size:13px;margin-bottom:18px}nav a{margin-left:14px}</style></head><body><main>
<nav><a href="./index.html">اللعبة</a><a href="./privacy.html">الخصوصية</a><a href="./terms.html">الشروط</a><a href="./licenses.html">التراخيص</a></nav>
<h1>${esc(d.t)}</h1><div class="up">لعبة «تحدّي» · آخر تحديث: ${esc(LEGAL.updated)} · الإصدار ${esc(ver||'')}</div>
${d.s.map(x=>`<h2>${esc(fill(x.h))}</h2>`+x.p.map(t=>`<p>${esc(fill(t))}</p>`).join('')).join('')}
<footer>للتواصل: <a href="mailto:${esc(LEGAL.contact)}" dir="ltr">${esc(LEGAL.contact)}</a></footer>
</main></body></html>`;
for(const [k,f] of [['privacy','privacy.html'],['terms','terms.html'],['licenses','licenses.html']])
 fs.writeFileSync(path.join(OUT,f),page(LEGAL[k],f));

console.log(`✓ www/ جاهز — الإصدار ${ver} · الخادم: ${SERVER||'(نفس الأصل أو محلي)'} · الصفحات القانونية: privacy · terms · licenses`);
