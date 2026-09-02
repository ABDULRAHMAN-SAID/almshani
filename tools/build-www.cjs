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
console.log(`✓ www/ جاهز — الإصدار ${ver} · الخادم: ${SERVER||'(نفس الأصل أو محلي)'}`);
