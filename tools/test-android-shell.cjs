#!/usr/bin/env node
/**
 * سويت غلاف أندرويد: تشغّل اللعبة على الأصل نفسه الذي يستعمله التطبيق
 * (https://appassets.androidplatform.net/assets/) بردّ محلّيّ على كل طلب — تمامًا كما
 * يفعل WebViewAssetLoader — فنتحقّق قبل البناء ممّا لا يظهر إلا داخل التطبيق:
 *   · السياق آمن فـ crypto.subtle موجود، وبدونه يرفض ختم الغرف العمل
 *   · لا خطأ صفحة عند الإقلاع، والشاشة الأولى تُرسم
 *   · الشبكة لا تطارد خادمًا وهميًّا على أصل الحزمة
 *   · لا عامل خدمة يخزّن عشرة ميجابايت ثانيةً على الهاتف
 *   · الموسيقى تُحضَّر مع الفتح بلا لمسة أولى
 *
 *   NODE_PATH=$(npm root -g) node tools/test-android-shell.cjs
 */
const {chromium}=require('playwright');
const fs=require('fs'),path=require('path');
const ROOT=path.resolve(__dirname,'..');
const ASSETS=path.join(ROOT,'app-android','app','src','main','assets');
const ORIGIN='https://appassets.androidplatform.net';
const HOME=ORIGIN+'/assets/index.html?src=app';
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
 '.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml',
 '.webmanifest':'application/manifest+json','.json':'application/json'};

let ok=0,bad=0;
const chk=(n,c,d)=>{c?(ok++,console.log('  ✓ '+n)):(bad++,console.log('  ✗ '+n+(d!==undefined?'  → '+d:'')))};

(async()=>{
 if(!fs.existsSync(path.join(ASSETS,'index.html'))){
  console.error('أصول التطبيق غير مجهّزة — شغّل: node tools/android-sync.cjs');process.exit(1);
 }
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});
 const ctx=await b.newContext({viewport:{width:412,height:915},deviceScaleFactor:2,locale:'ar',isMobile:true,hasTouch:true});

 // كل طلب إلى أصل الحزمة يُقرأ من القرص؛ أيّ طلب آخر يُسجَّل ويُمنع (التطبيق دون خادم مضبوط لا يخرج للشبكة)
 const outside=[];
 await ctx.route('**/*',async route=>{
  const u=new URL(route.request().url());
  if(u.origin!==ORIGIN){outside.push(u.href);return route.abort()}
  const rel=decodeURIComponent(u.pathname.replace(/^\/assets\//,''))||'index.html';
  const file=path.join(ASSETS,rel);
  if(!file.startsWith(ASSETS)||!fs.existsSync(file)||!fs.statSync(file).isFile())return route.fulfill({status:404,body:''});
  route.fulfill({status:200,headers:{'content-type':MIME[path.extname(file)]||'application/octet-stream'},body:fs.readFileSync(file)});
 });

 const errs=[];
 const page=await ctx.newPage();
 page.on('pageerror',e=>errs.push(String(e&&e.message||e)));
 await page.goto(HOME,{waitUntil:'domcontentloaded'});
 await page.waitForTimeout(2500);

 const r=await page.evaluate(()=>({
  origin:location.origin,
  secure:!!window.isSecureContext,
  subtle:!!(window.crypto&&window.crypto.subtle&&typeof window.crypto.subtle.generateKey==='function'),
  ver:(typeof APP_VER!=='undefined')?APP_VER:null,
  mode:(window.NET&&NET.state)?NET.state().mode:null,
  screens:document.querySelectorAll('.scr.on').length,
  painted:(document.body.innerText||'').replace(/\s+/g,'').length,
  music:!!(window.MUSIC&&typeof MUSIC.sync==='function'),
  swCtl:!!(navigator.serviceWorker&&navigator.serviceWorker.controller),
  face:Array.from(document.fonts).filter(f=>f.family==='Cairo'&&f.status==='loaded').length,
  fam:getComputedStyle(document.body).fontFamily,
 }));
 const regs=await page.evaluate(()=>navigator.serviceWorker?navigator.serviceWorker.getRegistrations().then(a=>a.length):0);

 console.log('غلاف أندرويد على '+ORIGIN+'\n');
 chk('الصفحة تقلع بلا خطأ',errs.length===0,errs[0]);
 chk('الأصل هو أصل حزمة التطبيق',r.origin===ORIGIN,r.origin);
 chk('السياق آمن',r.secure===true);
 chk('crypto.subtle متاح — ختم الغرف يعمل',r.subtle===true);
 chk('إصدار اللعبة محمَّل',!!r.ver,r.ver);
 chk('شاشة واحدة ظاهرة',r.screens===1,r.screens);
 chk('الشاشة مرسومة بنصّ حقيقي',r.painted>20,r.painted);
 chk('الشبكة محلّية بلا خادم مضبوط',r.mode==='local',r.mode);
 chk('لا عامل خدمة مسجَّل داخل التطبيق',regs===0&&!r.swCtl,regs);
 chk('الموسيقى مهيّأة مع الفتح',r.music===true);
 chk('خطّ Cairo محمَّل من داخل الحزمة',r.face>0&&/Cairo/.test(r.fam),r.face+' · '+r.fam);
 chk('لا طلب يخرج خارج حزمة التطبيق',outside.length===0,outside[0]);

 await page.screenshot({path:path.join(ROOT,'.qa-android-shell.png')});
 await b.close();
 console.log('\n'+(bad?('غلاف أندرويد: '+bad+' إخفاق ✘'):('غلاف أندرويد سليم ✔ ('+ok+' فحصًا)')));
 process.exit(bad?1:0);
})().catch(e=>{console.error(e);process.exit(1)});
