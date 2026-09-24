// يصوّر ملصقات التعبيرات المتّجهية art/emotes/svg/<key>.svg على خلفيّة اللوحة الكحليّة (#0B1530) بحجمين:
//   art/emotes/render/<key>.png     600×600  (للفحص البصري الدقيق)
//   art/emotes/render/<key>-64.png   64×64   (اختبار القراءة بالحجم الفعلي في شريط التعبيرات)
// الاستعمال: node tools/render-emotes-svg.cjs <key> [<key> ...]   — بلا وسائط: كلّ *.svg في المجلد.
// يفحص أيضًا أنّ الـ SVG صالح XML يعرضه Chromium (يرمي خطأ إن فشل التحليل أو وُجد <image>/<script>/CSS animation).
const {chromium}=require('playwright');const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..');
const SRC=path.join(ROOT,'art','emotes','svg');
const OUT=path.join(ROOT,'art','emotes','render');
fs.mkdirSync(SRC,{recursive:true});fs.mkdirSync(OUT,{recursive:true});
const NAVY='#0B1530';
let keys=process.argv.slice(2).map(k=>k.replace(/\.svg$/,''));
if(!keys.length)keys=fs.readdirSync(SRC).filter(f=>f.endsWith('.svg')).map(f=>f.slice(0,-4)).sort();
if(!keys.length){console.error('لا ملفات svg في',SRC);process.exit(1)}
const page=(svg,size)=>`<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;background:${NAVY};overflow:hidden}svg{display:block;width:${size}px;height:${size}px}</style></head><body>${svg}</body></html>`;
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox','--disable-background-networking','--disable-component-update']});
 const ctx=await b.newContext({viewport:{width:600,height:600},deviceScaleFactor:1});
 // كلّ شيء داخل الملف (inline)؛ أيّ طلب شبكة يعني مرجعًا خارجيًا → يُمنع ويُسجَّل كخطأ في الملصق الحالي
 let external=[];
 await ctx.route('**',r=>{const u=r.request().url();if(/^(data|about|blob):/.test(u))return r.continue();external.push(u);return r.abort()});
 const big=await ctx.newPage();
 const small=await ctx.newPage();await small.setViewportSize({width:64,height:64});
 let failed=0;
 for(const key of keys){
  external=[];
  const file=path.join(SRC,key+'.svg');
  if(!fs.existsSync(file)){console.log('✗',key,'— لا يوجد',file);failed++;continue}
  const svg=fs.readFileSync(file,'utf8');
  const problems=[];
  if(/<image[\s>]/i.test(svg))problems.push('<image>');
  if(/<script[\s>]/i.test(svg))problems.push('<script>');
  if(/@keyframes|animation\s*:|<animate/i.test(svg))problems.push('animation');
  if(/xlink:href\s*=\s*"(https?:)?\/\//i.test(svg)||/\shref\s*=\s*"(https?:)?\/\//i.test(svg))problems.push('external ref');
  if(/<text[\s>]/i.test(svg))problems.push('<text>');
  // فحص XML صارم عبر DOMParser في المتصفح (يكشف الأوسمة غير المغلقة والسمات المكرّرة)
  const parseErr=await big.evaluate(s=>{const d=new DOMParser().parseFromString(s,'image/svg+xml');const e=d.querySelector('parsererror');return e?e.textContent.slice(0,200):''},svg);
  if(parseErr)problems.push('XML: '+parseErr.replace(/\s+/g,' '));
  await big.setContent(page(svg,600),{waitUntil:'load'});
  const bbox=await big.evaluate(()=>{const s=document.querySelector('svg');if(!s)return null;const r=s.getBoundingClientRect();return {w:r.width,h:r.height,vb:s.getAttribute('viewBox')}});
  if(!bbox)problems.push('no <svg>');else if(bbox.vb!=='0 0 512 512')problems.push('viewBox '+bbox.vb);
  await big.screenshot({path:path.join(OUT,key+'.png'),clip:{x:0,y:0,width:600,height:600}});
  await small.setContent(page(svg,64),{waitUntil:'load'});
  await small.screenshot({path:path.join(OUT,key+'-64.png'),clip:{x:0,y:0,width:64,height:64}});
  if(external.length)problems.push('network: '+[...new Set(external)].slice(0,3).join(' '));
  const kb=(Buffer.byteLength(svg,'utf8')/1024).toFixed(1);
  if(problems.length){failed++;console.log('✗',key,`(${kb} KB)`,'—',problems.join(' | '))}
  else console.log('✓',key,`(${kb} KB)`,'→',path.relative(ROOT,path.join(OUT,key+'.png')),'+',key+'-64.png');
 }
 await b.close();
 if(failed)process.exit(2);
})().catch(e=>{console.error(e);process.exit(1)});
