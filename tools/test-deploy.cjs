#!/usr/bin/env node
/**
 * النشر الحقيقي: هل تُقلع صورة الحاوية فعلًا وتقدّم كلّ ما تعد به؟
 *   npm run build:tahaddi && node tools/test-deploy.cjs
 *
 * لا يوجد عفريت Docker هنا، فالفحص يعيد بناء تخطيط المرحلة الأخيرة من server/Dockerfile
 * حرفيًّا (نفس المسارات، نفس الامتداد، نفس متغيّرات البيئة) ويُقلعه بدلالات node:20 —
 * أي ‎--no-experimental-detect-module‏: الإصدار ٢٠ لا يستنتج صيغة الوحدات من المحتوى.
 * هذا بالضبط ما أخفى عطبًا سابقًا: الخادم كان يعمل هنا (node 22) ولا يُقلع في الحاوية.
 */
const {spawn,spawnSync}=require('child_process');
const fs=require('fs'),os=require('os'),path=require('path');
const ROOT=path.join(__dirname,'..');
const WS=require(path.join(ROOT,'node_modules','ws'));
const PORT=8960+Math.floor(Math.random()*30);
const BOX=fs.mkdtempSync(path.join(os.tmpdir(),'tahaddi-img-'));
let pass=0,fail=0;
const check=(n,ok,info)=>{if(ok){pass++;console.log('  ✓ '+n)}else{fail++;console.log('  ✗ '+n+(info?'  → '+String(info).slice(0,300):''))}};
const sec=t=>console.log('\n── '+t+' ──');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');

const DOCKER=read('server/Dockerfile');
const FLY=read('fly.toml');
const RENDER=read('render.yaml');
const WF=read('.github/workflows/fly-deploy.yml');
// المرحلة الأخيرة فقط: ما قبلها مرحلة بناء تُرمى
const FINAL=DOCKER.slice(DOCKER.lastIndexOf('\nFROM '));
const cmd=(FINAL.match(/CMD\s+\[([^\]]*)\]/)||[])[1]||'';
const entryFile=(cmd.match(/"([^"]*\.m?js)"/)||[])[1]||'';

(async()=>{
 sec('ملفّ الصورة يَعِد بإقلاع صحيح');
 const declaresEsm=/> *\/app\/package\.json/.test(FINAL)&&/"type" *: *"module"/.test(FINAL);
 check('نقطة الدخول ‎.mjs‏ أو حزمة تعلن type=module — الحزمة المبنيّة ESM',
   entryFile.endsWith('.mjs')||declaresEsm,entryFile);
 check('الملفّ المنسوخ هو نفسه الذي تشغّله CMD',
   entryFile&&FINAL.includes(entryFile),entryFile);
 check('لا سطر RUN يبتلع فشله بـ «|| true» في المرحلة الأخيرة',
   !/\|\|\s*true/.test(FINAL),(FINAL.match(/.*\|\|\s*true.*/)||[])[0]);
 for(const f of ['tahaddi/index.html','tahaddi/sw.js','tahaddi/manifest.webmanifest','tahaddi/icons','privacy.html','terms.html','licenses.html'])
  check('الصورة تنسخ '+f,FINAL.includes(f));
 check('NODE_ENV=production مضبوط في الصورة',/NODE_ENV=production/.test(FINAL));
 sec('لا أسرار ولا محقّق اختباريّ في ملفّات النشر');
 const cfg={'server/Dockerfile':DOCKER,'fly.toml':FLY,'render.yaml':RENDER,'.github/workflows/fly-deploy.yml':WF};
 for(const [n,t] of Object.entries(cfg)){
  check(n+' بلا TAHADDI_IAP_TEST_SECRET',!/TAHADDI_IAP_TEST_SECRET/.test(t));
  check(n+' بلا مفتاح مكتوب',!/(sk-ant-[A-Za-z0-9_-]{8}|re_[A-Za-z0-9]{16}|AIza[A-Za-z0-9_-]{20})/.test(t));
 }
 sec('ملفّات النشر متّفقة على المنفذ والمسارات');
 const port=(FINAL.match(/PORT=(\d+)/)||[])[1];
 const dataFile=(FINAL.match(/TAHADDI_DATA_FILE=(\S+)/)||[])[1]||'';
 check('fly.toml على منفذ الصورة نفسه',FLY.includes(`PORT = "${port}"`)&&FLY.includes(`internal_port = ${port}`),port);
 check('render.yaml على منفذ الصورة نفسه',RENDER.includes(`value: "${port}"`),port);
 check('قرص fly مركّب على مجلّد ملفّ البيانات',FLY.includes('destination = "'+path.dirname(dataFile)+'"'),dataFile);
 check('قرص render مركّب على المجلّد نفسه',RENDER.includes('mountPath: '+path.dirname(dataFile)));
 check('فحص الصحّة /health في fly وrender والصورة',
   FLY.includes('path = "/health"')&&RENDER.includes('healthCheckPath: /health')&&/HEALTHCHECK[\s\S]*\/health/.test(FINAL));
 check('آلة واحدة على الأقل تبقى حيّة — الغرف على WebSocket',
   /min_machines_running\s*=\s*[1-9]/.test(FLY)&&/auto_stop_machines\s*=\s*false/.test(FLY));

 sec('بناء تخطيط الصورة وإقلاعه بدلالات node:20');
 const bundle=path.join(ROOT,'server/dist/tahaddi.js');
 if(!fs.existsSync(bundle)){console.error('ابنِ أولًا: npm run build:tahaddi');process.exit(1)}
 const www=path.join(BOX,'_wwwgen');
 spawnSync('node',[path.join(ROOT,'tools/build-www.cjs'),www],{cwd:ROOT,stdio:'ignore'});
 fs.mkdirSync(path.join(BOX,'app/server/dist'),{recursive:true});
 fs.mkdirSync(path.join(BOX,'app/tahaddi/icons'),{recursive:true});
 fs.mkdirSync(path.join(BOX,'data'),{recursive:true});
 // الحزمة تُنسخ بالاسم الذي تشغّله CMD تمامًا، ومعها إعلان الحزمة إن كان الملفّ يكتبه
 fs.copyFileSync(bundle,path.join(BOX,'app',entryFile));
 if(declaresEsm)fs.writeFileSync(path.join(BOX,'app/package.json'),'{"name":"tahaddi-server","private":true,"type":"module"}\n');
 fs.symlinkSync(path.join(ROOT,'node_modules'),path.join(BOX,'app/node_modules'));
 for(const f of ['index.html','sw.js','manifest.webmanifest'])fs.copyFileSync(path.join(ROOT,'tahaddi',f),path.join(BOX,'app/tahaddi',f));
 for(const f of ['privacy.html','terms.html','licenses.html'])fs.copyFileSync(path.join(www,f),path.join(BOX,'app/tahaddi',f));
 for(const f of fs.readdirSync(path.join(ROOT,'tahaddi/icons')))fs.copyFileSync(path.join(ROOT,'tahaddi/icons',f),path.join(BOX,'app/tahaddi/icons',f));

 const DATA=path.join(BOX,'data/tahaddi.json');
 // node 20 لا يستنتج الصيغة أصلًا؛ الأحدث يستنتجها فنُطفئ الاستنتاج لنقيس ما تقيسه الحاوية
 const N20=Number(process.versions.node.split('.')[0])>=22?['--no-experimental-detect-module']:[];
 const boot=extra=>spawn('node',[...N20,entryFile],{cwd:path.join(BOX,'app'),
   env:{PATH:process.env.PATH,NODE_ENV:'production',PORT:String(PORT),HOST:'127.0.0.1',
        TAHADDI_DIR:path.join(BOX,'app/tahaddi'),TAHADDI_DATA_FILE:DATA,...extra},stdio:['ignore','pipe','pipe']});
 const wait=async srv=>{for(let i=0;i<100;i++){try{const r=await fetch(`http://127.0.0.1:${PORT}/health`);if(r.ok)return true}catch(e){}await sleep(100)}return false};
 const stop=async srv=>{srv.kill();for(let i=0;i<40&&srv.exitCode===null;i++)await sleep(50)};

 let srv=boot({});
 const logs=[];srv.stdout.on('data',d=>logs.push(String(d)));srv.stderr.on('data',d=>logs.push(String(d)));
 const up=await wait(srv);
 check('الخادم يُقلع على node:20 (لا SyntaxError على صيغة الوحدات)',up,logs.join('').slice(0,400));
 if(!up){console.log('\n'+pass+' ناجح · '+fail+' فاشل');fs.rmSync(BOX,{recursive:true,force:true});process.exit(1)}

 sec('ما تقدّمه الصورة عبر HTTP');
 const get=(p,h)=>fetch(`http://127.0.0.1:${PORT}${p}`,{headers:h||{}});
 const h=await (await get('/health')).json();
 check('/health يجيب بإحصاءات',h.ok===true&&typeof h.accounts==='number',JSON.stringify(h));
 check('المحقّق الاختباريّ مطفأ في الإنتاج',h.iap&&h.iap.test===false,JSON.stringify(h.iap));
 const page=await get('/',{'accept-encoding':'identity'});
 const raw=Buffer.from(await page.arrayBuffer());
 check('/ يقدّم اللعبة كاملة',page.status===200&&raw.length>5e6&&/^text\/html/.test(page.headers.get('content-type')),page.status+' '+raw.length);
 const etag=page.headers.get('etag');
 check('للصفحة ETag',!!etag,etag);
 const again=await get('/',{'if-none-match':etag});
 check('زيارة معادة = 304 بلا بايت',again.status===304,again.status);
 await sleep(2500);   // الضغط يُحسب خارج الطلب
 // fetch يفكّ الضغط من نفسه، فالحجم المنقول يُقرأ من الترويسة لا من الجسم
 const brz=await get('/',{'accept-encoding':'br'});await brz.arrayBuffer();
 const brLen=Number(brz.headers.get('content-length')||0);
 check('الصفحة تُرسل مضغوطة بـ brotli وأصغر من نصفها',
   brz.headers.get('content-encoding')==='br'&&brLen>0&&brLen<raw.length/2,
   (brLen/1048576).toFixed(2)+'م.ب مقابل '+(raw.length/1048576).toFixed(2)+' — '+brz.headers.get('content-encoding'));
 const gz=await get('/',{'accept-encoding':'gzip'});await gz.arrayBuffer();
 const gzLen=Number(gz.headers.get('content-length')||0);
 check('وgzip لمن لا يدعم brotli',gz.headers.get('content-encoding')==='gzip'&&gzLen>0&&gzLen<raw.length/2,gzLen);
 for(const [p,ct] of [['/privacy.html','text/html'],['/terms.html','text/html'],['/licenses.html','text/html'],
                      ['/manifest.webmanifest','application/manifest+json'],['/sw.js','text/javascript'],['/icons/icon-192.png','image/png']]){
  const r=await get(p);
  check('يقدّم '+p+' بنوعه الصحيح',r.status===200&&String(r.headers.get('content-type')).startsWith(ct),r.status+' '+r.headers.get('content-type'));
 }
 const bad=await get('/../package.json');
 check('لا خروج من مجلّد اللعبة',bad.status===404,bad.status);
 check('مسار مجهول = 404',(await get('/nope')).status===404);
 check('الذكاء الاصطناعي مطفأ بلا مفتاح ويجيب بذلك',(await (await get('/ai/status')).json()).on===false);

 sec('WebSocket حيّ والحساب يبقى بعد إعادة التشغيل');
 const hello=(token,origin)=>new Promise((res,rej)=>{
  const ws=new WS(`ws://127.0.0.1:${PORT}/ws`,origin?{headers:{origin}}:{});
  const t=setTimeout(()=>{try{ws.close()}catch(e){}rej(new Error('مهلة'))},8000);
  ws.on('error',e=>{clearTimeout(t);rej(e)});
  ws.on('open',()=>ws.send(JSON.stringify({t:'hello',token,name:'مُنشِئ'})));
  ws.on('message',d=>{const m=JSON.parse(String(d));if(m.t==='welcome'){clearTimeout(t);ws.close();res(m)}});
 });
 const w1=await hello();
 check('welcome يحمل هويّة ورمزًا وكود صديق',!!w1.id&&w1.token&&w1.token.length===32&&/^[2-9A-HJ-NP-Z]{6}$/.test(w1.code||''),JSON.stringify({id:w1.id,code:w1.code}));
 await sleep(600);
 await stop(srv);
 check('ملفّ البيانات كُتب على القرص الدائم',fs.existsSync(DATA)&&fs.statSync(DATA).size>0);
 srv=boot({});await wait(srv);
 const w2=await hello(w1.token);
 check('الحساب نفسه يعود بعد إعادة تشغيل الخادم',w2.id===w1.id&&w2.code===w1.code,JSON.stringify({a:w1.id,b:w2.id}));
 await stop(srv);

 sec('قائمة الأصول المسموح لها');
 srv=boot({TAHADDI_ORIGINS:'https://tahaddi.example,capacitor://localhost'});
 await wait(srv);
 let okOrigin=false,badOrigin='لم يُرفض';
 try{const w=await hello(undefined,'https://tahaddi.example');okOrigin=!!w.id}catch(e){okOrigin=false;badOrigin=e.message}
 check('أصل مسموح يتّصل',okOrigin,badOrigin);
 let refused=false;
 try{await hello(undefined,'https://evil.example')}catch(e){refused=/403|Unexpected server response/.test(e.message)}
 check('أصل غريب يُرفض (403)',refused);
 await stop(srv);

 console.log('\n'+pass+' ناجح · '+fail+' فاشل');
 fs.rmSync(BOX,{recursive:true,force:true});
 process.exit(fail?1:0);
})().catch(e=>{console.error(e);try{fs.rmSync(BOX,{recursive:true,force:true})}catch(_){}process.exit(1)});
