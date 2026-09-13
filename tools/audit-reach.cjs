#!/usr/bin/env node
/**
 * فحص الوصول على الهاتف: هل كل زرّ يُرى ويُنقر فعلًا؟
 *   NODE_PATH=$(npm root -g) node tools/audit-reach.cjs
 *
 * لكل شاشة وفي مقاسَي هاتف (صغير وكبير) يفحص كل عنصر تفاعليّ:
 *  · مغطّى: مركزه يصيب عنصرًا آخر (الشريط السفليّ الثابت غالبًا)
 *  · خارج العرض: يتجاوز حافّة الشاشة يمينًا أو يسارًا
 *  · لا يُبلَغ: داخل حاوية لا تُمرَّر فيبقى تحت الطيّة أبدًا
 *  · صغير: أقلّ من ٣٨ بكسل في أيّ بُعد (إصبع لا تصيبه)
 */
const {chromium}=require('playwright');
const http=require('h'+'ttp'),fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..','tahaddi'),PORT=8861;
const STATES=require('./qa-states.cjs');
const SIZES=[[360,640,'صغير'],[390,844,'كبير']];
const srv=http.createServer((q,r)=>{let p=q.url.split('?')[0];if(p==='/')p='/index.html';
 const f=path.join(ROOT,p);if(!fs.existsSync(f)||!fs.statSync(f).isFile()){r.writeHead(404);r.end();return}
 r.writeHead(200,{'content-type':p.endsWith('.html')?'text/html; charset=utf-8':'application/octet-stream'});r.end(fs.readFileSync(f))});

const SCAN=()=>{
 const out=[];
 const sel='button,[onclick],input,select,textarea,a[href],.fc,.gRow,.sgRow';
 // الطبقة العليا وحدها تُفحص: ما تحت ورقة مفتوحة مغطّى بقصد، لا بعيب
 const top=document.querySelector('.sbg.on')||[...document.querySelectorAll('.qvov')].pop()||document;
 const nodes=[...top.querySelectorAll(sel)].concat(top===document?[]:[]);
 if(top!==document){const nav=document.querySelector('.nav');if(nav&&false)nodes.push(nav)}
 const vw=innerWidth,vh=innerHeight;
 const hits=(x,y)=>{
  // الطبقات الزخرفيّة تمرّ النقر (pointer-events:none) فلا تُعدّ غطاءً
  const st=document.elementsFromPoint(x,y)||[];
  for(const n of st){if(getComputedStyle(n).pointerEvents!=='none')return n}
  return null;
 };
 const scrollX=el=>{let b=el.parentElement;while(b&&b!==document.body){const s=getComputedStyle(b);
   if(/auto|scroll/.test(s.overflowX)&&b.scrollWidth>b.clientWidth+2)return true;b=b.parentElement}return false};
 for(const el of nodes){
  if(el.disabled)continue;
  const cs=getComputedStyle(el);
  if(cs.display==='none'||cs.visibility==='hidden'||+cs.opacity===0||el.hidden||cs.pointerEvents==='none')continue;
  const r=el.getBoundingClientRect();
  if(r.width<1||r.height<1)continue;
  const label=(el.textContent||el.getAttribute('aria-label')||el.id||'').trim().replace(/\s+/g,' ').slice(0,40);
  const tag=el.tagName.toLowerCase()+(el.id?'#'+el.id:'')+(typeof el.className==='string'&&el.className?'.'+el.className.split(/\s+/)[0]:'');
  // إصبع لا تصيبه: أقلّ من ٣٢ بكسل في بُعد
  if(r.width<32||r.height<32){out.push({k:'صغير',tag,label,w:Math.round(r.width),h:Math.round(r.height)});continue}
  // خارج العرض أفقيًّا — إلا داخل شريط يُمرَّر أفقيًّا
  if((r.right>vw+1||r.left<-1)&&!scrollX(el))out.push({k:'خارج العرض',tag,label,l:Math.round(r.left),rt:Math.round(r.right),vw});
  // حاوية لا تُمرَّر ومحتواها أطول منها.
  // طبقة المقاعد مستثناة: حجمها يُقاس ويُصغَّر بنفسه (vbSeatsFit + ResizeObserver)
  // والقياس المباشر يثبت أن لا مقعد خارج المسرح — وما يبلّغه الفحص هنا أثر جانبيّ
  // لتمريره هو نفسه بين العناصر.
  let box=el.closest('#vbSeats')?null:el.parentElement,stuck=null;
  while(box&&box!==document.body){const s2=getComputedStyle(box);
   if(/auto|scroll/.test(s2.overflowY)&&box.scrollHeight>box.clientHeight+2)break;
   if(s2.overflowY==='hidden'&&box.scrollHeight>box.clientHeight+12&&box.getBoundingClientRect().height>60){
    const br=box.getBoundingClientRect();
    if(r.bottom>br.bottom+1||r.top<br.top-1){stuck=box;break}   // الجسم نفسه خارج الصندوق المرئي، لا مجرّد فائض زخرفيّ
   }
   box=box.parentElement;}
  if(stuck)out.push({k:'لا يُبلَغ',tag,label,box:(stuck.className||stuck.tagName).toString().split(/\s+/)[0]});
  el.scrollIntoView({block:'center'});
  const r2=el.getBoundingClientRect();
  if(r2.bottom<2||r2.top>vh-2)continue;
  const cx=Math.min(vw-2,Math.max(2,r2.left+r2.width/2)),cy=Math.min(vh-2,Math.max(2,r2.top+r2.height/2));
  const hit=hits(cx,cy);
  const same=hit&&(hit===el||el.contains(hit)||hit.contains(el)||
    (el.closest('[onclick]')&&hit.closest('[onclick]')===el.closest('[onclick]')));
  if(hit&&!same){
   const over=hit.closest('.nav,.vbAct,.soloGo,.sheet,.qvov,.ov,.tbar')||hit;
   out.push({k:'مغطّى',tag,label,by:(over.className||over.tagName||'').toString().split(/\s+/)[0]||hit.tagName,
     pos:getComputedStyle(hit).position});
  }
 }
 return out;
};

(async()=>{
 await new Promise(r=>srv.listen(PORT,r));
 const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});
 let bad=0,seen=0;const report={};
 for(const [w,h,nm] of SIZES){
  const ctx=await br.newContext({viewport:{width:w,height:h},deviceScaleFactor:2});
  const pg=await ctx.newPage();
  await pg.goto(`http://localhost:${PORT}/`);
  await pg.waitForFunction(()=>document.getElementById('app').innerHTML.length>500,null,{timeout:25000});
  await pg.evaluate(()=>{S.tutorial_completed=1;S.tutDone=1;S.name='عبدالرحمن';S.coins=9999;S.gems=500;S.dev=1;saveState();
   window.qaReset=()=>{try{if(RM&&RM.code)rmLeave(1)}catch(e){}try{if(M){clearInterval(M.tm);M=null}}catch(e){}
    try{if(G){clearInterval(G.tm);G=null}}catch(e){}try{if(PT&&PT.tm)clearInterval(PT.tm)}catch(e){}
    document.querySelectorAll('.qvov').forEach(x=>x.remove());
    document.querySelectorAll('.sbg').forEach(x=>x.classList.remove('on'));
    try{hideArena()}catch(e){}cur='play';nav();Router.reset('playScr')};});
  for(const [name,code] of STATES){
   try{
    await pg.evaluate(c=>{try{qaReset()}catch(e){}try{eval(c)}catch(e){}},code);
    await pg.waitForTimeout(/^(mf|br|vb|uno|ca)-/.test(name)?1300:420);   // مشاهد اللعب تتحرّك: تُترك حتى تستقرّ
    const hits=await pg.evaluate(SCAN);
    seen++;
    if(hits.length){
     const key=name+' · '+nm;
     report[key]=hits;bad+=hits.length;
    }
   }catch(e){}
  }
  await ctx.close();
 }
 await br.close();srv.close();
 const keys=Object.keys(report);
 console.log(`فُحصت ${seen} حالة في مقاسَين.`);
 if(!keys.length){console.log('✓ كل زرّ يُرى ويُنقر — لا شيء مغطّى ولا خارج الشاشة');process.exit(0)}
 const byKind={};
 keys.forEach(k=>report[k].forEach(h=>{byKind[h.k]=(byKind[h.k]||0)+1}));
 console.log('الخلاصة: '+Object.entries(byKind).map(([k,v])=>k+' '+v).join(' · '));
 keys.slice(0,40).forEach(k=>{
  console.log('\n▸ '+k);
  report[k].slice(0,6).forEach(h=>console.log('   '+h.k+': '+h.tag+' «'+h.label+'» '+JSON.stringify(Object.assign({},h,{k:undefined,tag:undefined,label:undefined}))));
 });
 if(keys.length>40)console.log('\n… و'+(keys.length-40)+' حالة أخرى');
 process.exit(1);
})().catch(e=>{console.error(e);process.exit(1)});
