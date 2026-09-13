#!/usr/bin/env node
/**
 * فحص شامل: يزور كل شاشة وكل مرحلة لعب ويقيس ما لا تراه الاختبارات المنطقية —
 * أخطاء JS، شاشات فارغة، تجاوز عرض الشاشة، نصّ مقصوص، أزرار أصغر من اللمس، نصّ لاتيني،
 * صور مكسورة، غياب زرّ الرجوع، ارتفاع الصفحة — ويلتقط لقطة لكل حالة للمراجعة بالعين.
 *   NODE_PATH=$(npm root -g) node tools/qa-crawl.cjs [outDir]
 */
const {chromium}=require('playwright');
const http=require('http'),fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..','tahaddi');
const OUT=process.argv[2]||path.join(__dirname,'..','.qa');
fs.mkdirSync(OUT,{recursive:true});
const PORT=8930+Math.floor(Math.random()*40);
const srv=http.createServer((q,s)=>{let f=q.url.split('?')[0];if(f==='/')f='/index.html';
 try{const b=fs.readFileSync(path.join(ROOT,f));s.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});s.end(b)}catch(e){s.writeHead(404);s.end('x')}}).listen(PORT);

/* كل حالة: اسم + شيفرة تُنفَّذ في الصفحة بعد إعادة الضبط */
const R=(code)=>code;
const CAPTURES=require('./qa-states.cjs');

(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});
 const page=await b.newPage({viewport:{width:430,height:900},deviceScaleFactor:1});
 let errs=[];page.on('pageerror',e=>errs.push(e.message));
 page.on('console',m=>{if(m.type()==='error'&&!/net::ERR|Failed to load resource/.test(m.text()))errs.push('console: '+m.text().slice(0,160))});
 const t0=Date.now();
 await page.goto(`http://localhost:${PORT}/index.html`);
 await page.waitForFunction(()=>typeof Router==='object'&&document.getElementById('app').innerHTML.length>500,null,{timeout:30000});
 const loadMs=Date.now()-t0;
 await page.evaluate(()=>{
  S.tutorial_completed=true;S.tutDone=1;S.dev=1;S.coins=5000;S.gems=120;S.name='عبدالرحمن';
  const all=rankAll();const set=(g,t,d,rp)=>{const q=all[g];q.placed=true;q.tier=t;q.div=d;q.rp=rp;q.gamesPlayed=20;q.wins=12;q.losses=8;q.seasonBest={tier:t,div:d}};
  set('knowledge',4,2,64);set('carrom',9,0,100);set('uno',2,1,30);set('mafia',7,3,10);set('drawing',5,2,55);
  window.qaWait=ms=>new Promise(r=>setTimeout(r,ms));
  window.qaImg=col=>{const c=document.createElement('canvas');c.width=300;c.height=200;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,300,200);x.strokeStyle=col;x.lineWidth=8;x.beginPath();x.arc(150,100,60,0,6.3);x.stroke();return c.toDataURL('image/png')};
  window.qaClan=()=>{if(!S.clan||!S.clan.c){CLAN.act(S.uid,'create',{n:'فرسان المعرفة',desc:'نادٍ تنافسي للاختبار',i:'book',col:'#5AC8F5',jt:'req'});CLAN.seedBots(S.clan.c.id,12)}};
  window.qaReset=()=>{try{if(RM&&RM.code)rmLeave(1)}catch(e){}try{if(M){clearInterval(M.tm);M=null}}catch(e){}try{if(G){clearInterval(G.tm);G=null}}catch(e){}
   try{if(PT&&PT.tm)clearInterval(PT.tm)}catch(e){}try{clearInterval(_introTm);_intro=null}catch(e){}
   document.querySelectorAll('.qvov').forEach(x=>x.remove());try{hideArena()}catch(e){}cur='play';nav();Router.reset('playScr')};
  window.qaMeasure=()=>{
   const app=document.getElementById('app');const vw=document.documentElement.clientWidth;
   const vis=el=>{const r=el.getBoundingClientRect();const cs=getComputedStyle(el);return r.width>0&&r.height>0&&cs.visibility!=='hidden'&&cs.display!=='none'};
   const all=[...app.querySelectorAll('*')];
   // القصّ يُقاس على مدى النصّ نفسه لا على scrollWidth — فعناصر الزينة المطلقة (لمعان الأزرار) تضخّمه زورًا
   const clipped=all.filter(el=>{if(el.childElementCount)return false;const cs=getComputedStyle(el);
    if(cs.overflow!=='hidden'&&cs.overflowX!=='hidden'&&cs.textOverflow!=='ellipsis')return false;
    const t=(el.textContent||'').trim();if(!t)return false;
    const r=document.createRange();r.selectNodeContents(el);const tr=r.getBoundingClientRect();const er=el.getBoundingClientRect();
    return tr.width>er.width+2||tr.height>er.height+2}).map(el=>(el.textContent||'').trim().slice(0,18));   const off=all.filter(el=>{if(!vis(el))return false;const r=el.getBoundingClientRect();return (r.right>vw+3||r.left<-3)&&r.width<vw*1.5}).map(el=>(el.className||el.tagName).toString().slice(0,24));
   const controls=app.querySelectorAll('button,input,textarea,canvas,select,[onclick]').length;
   const tiny=[...app.querySelectorAll('button,[onclick],a,.fc,.nvi')].filter(el=>vis(el)&&!el.closest('[onclick] [onclick]')).filter(el=>{const r=el.getBoundingClientRect();return r.width<34||r.height<34}).map(el=>{const r=el.getBoundingClientRect();return `${(el.innerText||el.className||el.tagName).toString().trim().slice(0,16)}(${Math.round(r.width)}×${Math.round(r.height)})`});
   const ALLOW=new Set(['Google','Play','App','Store','I','II','III','iOS','Android','MMR','SOLO']);
   const latin=[...new Set((document.body.innerText.match(/[A-Za-z][A-Za-z']{2,}/g)||[]).filter(w=>!ALLOW.has(w)))].slice(0,8);
   const imgs=[...app.querySelectorAll('img')].filter(i=>i.complete&&i.naturalWidth===0).length;
   const txt=app.innerText.replace(/\s+/g,' ').trim();
   return {controls,textLen:txt.length,overflowX:document.documentElement.scrollWidth>vw+1,pageH:document.documentElement.scrollHeight,
    clipped:clipped.slice(0,5),off:off.slice(0,5),tiny:[...new Set(tiny)].slice(0,6),latin,brokenImgs:imgs,
    back:!!app.querySelector('.tbar .bk, .bk'),bar:getComputedStyle(document.getElementById('nav')).display,
    errorBox:/لم نتمكّن من فتح|تعذّر/.test(txt),nodes:app.querySelectorAll('*').length,sample:txt.slice(0,90)};
  };
 });
 const ONLY=process.env.QA_ONLY?new RegExp(process.env.QA_ONLY):null;
 const rows=[];let n=0;
 for(const [name,code] of CAPTURES){
  if(ONLY&&!ONLY.test(name))continue;
  n++;errs=[];
  let fail=null;
  try{await page.evaluate(`(async()=>{qaReset();${code}})()`)}catch(e){fail=e.message.split('\n')[0].slice(0,160)}
  await page.waitForTimeout(name==='tryCard'?900:650);   // الصفحة أثقل بعد تضمين التعبيرات المرسومة
  let m={};try{m=await page.evaluate(()=>qaMeasure())}catch(e){fail=fail||('measure: '+e.message.slice(0,100))}
  const file=`${String(n).padStart(3,'0')}-${name}.png`;
  try{await page.screenshot({path:path.join(OUT,file)})}catch(e){}
  rows.push({n,name,file,fail,errs:errs.slice(0,3),...m});
  process.stdout.write(`${n}/${CAPTURES.length} ${name}${fail?'  ✗ '+fail:''}${errs.length?'  ⚠ '+errs[0].slice(0,80):''}\n`);
 }
 // ── الأداء ──
 await page.evaluate(()=>qaReset());
 const perf=await page.evaluate(async()=>{
  const t=performance.timing;const mem=performance.memory?Math.round(performance.memory.usedJSHeapSize/1048576):null;
  const time=(f)=>{const a=performance.now();f();return +(performance.now()-a).toFixed(1)};
  const r={mem,scriptChars:document.scripts[0]?document.scripts[0].text.length:0};
  r.playScrMs=time(()=>{tab('play')});r.cardsScrMs=time(()=>{tab('cards')});r.cardsNodes=document.getElementById('app').querySelectorAll('*').length;
  r.shopScrMs=time(()=>{tab('shop')});r.clubHomeMs=time(()=>{qaClan();tab('clubs')});
  tab('play');push('gameHub','carrom');RM.caN=2;soloStart('carrom','mid');await new Promise(r=>setTimeout(r,400));
  const dts=[];let last=performance.now();
  await new Promise(res=>{caPlay({x:200,y:360,vx:-1.5,vy:-6});let k=0;const f=()=>{const now=performance.now();dts.push(now-last);last=now;if(++k<90&&_ca.sim)requestAnimationFrame(f);else res()};requestAnimationFrame(f)});
  dts.shift();r.carromFrameAvg=+(dts.reduce((a,b)=>a+b,0)/dts.length).toFixed(1);r.carromFrameMax=+Math.max(...dts).toFixed(1);r.carromFrames=dts.length;
  rmLeave(1);
  return r;
 });
 perf.loadMs=loadMs;perf.htmlBytes=fs.statSync(path.join(ROOT,'index.html')).size;
 fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify({rows,perf},null,1));
 await b.close();srv.close();
 // شاشة تأكيد قصيرة ليست فارغة: الفراغ = لا نصّ ولا أداة تحكّم
 const blank=r=>r.textLen<40&&!(r.controls>0);
 const bad=rows.filter(r=>r.fail||r.errs.length||r.errorBox||blank(r)||r.overflowX);
 console.log(`\nتمّ: ${rows.length} حالة · مشاكل صريحة: ${bad.length} · أداء: ${JSON.stringify(perf)}`);
 bad.forEach(r=>console.log(`  ✗ ${r.name}: ${r.fail||''} ${r.errs.join(' | ')} ${r.errorBox?'errorBox':''} ${blank(r)?'blank':''} ${r.overflowX?'overflowX':''}`));
})().catch(e=>{console.error(e);process.exit(1)});
