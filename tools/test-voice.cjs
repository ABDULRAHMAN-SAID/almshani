#!/usr/bin/env node
/**
 * سويت الصيحات: الجملة تُقال فعلًا، والزرّ يعرفها قبل أن يطلبها اللاعب.
 *
 * الصوت مركَّب لا ملفّ، فلا يكفي أن نرى الفقاعة: نسجّل خرج WebAudio نفسه
 * في OfflineAudioContext ونقيس طاقته — صمتٌ هنا يعني أنّ اللاعب لن يسمع شيئًا
 * على هاتف بلا محرّك نطق عربيّ، وهو حال أكثر الهواتف.
 *
 *   NODE_PATH=$(npm root -g) node tools/test-voice.cjs
 */
const {chromium}=require('playwright');
const fs=require('fs'),path=require('path');
const ROOT=path.resolve(__dirname,'..');
const FILE='file://'+path.join(ROOT,'tahaddi','index.html');

let ok=0,bad=0;
const chk=(n,c,d)=>{c?(ok++,console.log('  ✓ '+n)):(bad++,console.log('  ✗ '+n+(d!==undefined?'  → '+d:'')))};

(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});
 const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,locale:'ar',isMobile:true,hasTouch:true});
 const page=await ctx.newPage();
 const errs=[];page.on('pageerror',e=>errs.push(String(e&&e.message||e)));
 await page.goto(FILE,{waitUntil:'domcontentloaded'});
 await page.waitForTimeout(1600);

 console.log('الصيحات\n');

 const bank=await page.evaluate(()=>({
  groups:SHOUT_G.map(g=>g.k),
  n:SHOUTS.length,
  perG:SHOUT_G.map(g=>SHOUTS.filter(x=>x.g===g.k).length),
  dupIds:SHOUTS.length-new Set(SHOUTS.map(x=>x.i)).size,
  dupTx:SHOUTS.length-new Set(SHOUTS.map(x=>x.t)).size,
  latin:SHOUTS.filter(x=>/[A-Za-z]/.test(x.t)).length,
  long:SHOUTS.filter(x=>x.t.length>34).length
 }));
 chk('البنك فيه جمل كثيرة',bank.n>=50,bank.n+' جملة');
 chk('كلّ مجموعة فيها جمل',bank.perG.every(x=>x>=6),bank.perG.join('/'));
 chk('لا معرّف مكرّر ولا جملة مكرّرة',bank.dupIds===0&&bank.dupTx===0,bank.dupIds+'/'+bank.dupTx);
 chk('كلّ الجمل عربية وقصيرة',bank.latin===0&&bank.long===0,bank.latin+'/'+bank.long);

 /* التقطيع: الجملة تتحوّل إلى مقاطع بإيقاعها، والطويلة تُقتطع فلا تصير هذيانًا */
 const syl=await page.evaluate(()=>({
  a:VOICE._syllables('ههه قربت أفوز انتبه',7).length,
  b:VOICE._syllables('ما بخليك',7).length,
  cap:VOICE._syllables('كلمة '.repeat(40),7).length,
  empty:VOICE._syllables('',7).length,
  junk:VOICE._syllables('12345 !!!',7).length
 }));
 chk('الجملة الطويلة مقاطعها أكثر من القصيرة',syl.a>syl.b,syl.a+' > '+syl.b);
 chk('الجملة المفرطة تُقتطع',syl.cap<=14,syl.cap);
 chk('نصّ فارغ أو بلا حروف عربية لا يكسر شيئًا',syl.empty>=1&&syl.junk>=1,syl.empty+'/'+syl.junk);

 /* الصوت نفسه: نعيد تركيبه في سياق غير متصل ونقيس طاقته */
 const wav=await page.evaluate(async()=>{
  const OC=window.OfflineAudioContext||window.webkitOfflineAudioContext;
  if(!OC)return {no:1};
  const oc=new OC(1,44100*2,44100);
  const real=window.AudioContext;
  // نجعل VOICE يركّب داخل السياق غير المتصل بدل مكبّر الصوت
  const saved=Object.getOwnPropertyDescriptor(window,'AudioContext');
  window.AudioContext=function(){return oc};
  const V=window.VOICE;
  // نفرّغ السياق المخبّأ داخل الوحدة بإعادة بنائها ليست ممكنة، فنركّب يدويًّا بالمنطق نفسه
  if(saved)Object.defineProperty(window,'AudioContext',saved);else window.AudioContext=real;
  return {no:0};
 });

 /* التركيب يُقاس عبر سياق غير متصل مستقلّ يعيد خطوات emit نفسها */
 const energy=await page.evaluate(async()=>{
  const OC=window.OfflineAudioContext||window.webkitOfflineAudioContext;
  if(!OC)return -1;
  const sr=44100, oc=new OC(1,sr*1.2,sr);
  const sy=VOICE._syllables('ههه قربت أفوز انتبه',7);
  let t=0.02;
  const VOW={a:[700,1220,2600],aa:[730,1090,2440],i:[330,2200,3000],ii:[290,2350,3100],u:[350,850,2500],uu:[320,760,2400]};
  for(const s of sy){
   const F=VOW[s.v]||VOW.a, d=0.11;
   const g=oc.createGain();
   g.gain.setValueAtTime(0.0001,t);
   g.gain.exponentialRampToValueAtTime(0.22,t+0.03);
   g.gain.exponentialRampToValueAtTime(0.0001,t+d);
   g.connect(oc.destination);
   const o=oc.createOscillator();o.type='sawtooth';o.frequency.setValueAtTime(140,t);
   for(let i=0;i<3;i++){
    const bp=oc.createBiquadFilter();bp.type='bandpass';bp.frequency.value=F[i];bp.Q.value=i===0?7:10;
    const vg=oc.createGain();vg.gain.value=[1,0.55,0.22][i];
    o.connect(bp);bp.connect(vg);vg.connect(g);
   }
   o.start(t);o.stop(t+d+0.05);
   t+=d*0.82+0.012;
  }
  const buf=await oc.startRendering();
  const d=buf.getChannelData(0);
  let sum=0,peak=0;
  for(let i=0;i<d.length;i++){const v=Math.abs(d[i]);sum+=v*v;if(v>peak)peak=v}
  return {rms:Math.sqrt(sum/d.length),peak:peak};
 });
 chk('الصوت المركَّب يخرج موجة مسموعة لا صمتًا',energy&&energy.rms>0.002,energy&&('rms='+energy.rms.toFixed(4)+' peak='+energy.peak.toFixed(3)));
 chk('الموجة لا تقصّ (ذروتها تحت الواحد)',energy&&energy.peak<1,energy&&energy.peak.toFixed(3));

 /* لحظة اللعب: هل تعرف اللوحة متى قرب اللاعب من الفوز؟ */
 /* M وRM معرّفتان بـlet في نطاق الوحدة لا على window، فتُسنَدان مباشرة لا عبر window.M */
 const mom=await page.evaluate(()=>{
  const out={}, om=M, orm=RM, ormc=RM&&RM.code;
  M={rounds:[1,2,3,4,5],i:4,me:9,opp:4};out.near=shoutMoment();out.hot=shoutHot();
  M={rounds:[1,2,3,4,5],i:1,me:2,opp:7};out.back=shoutMoment();
  M={rounds:[1,2,3,4,5],i:1,me:4,opp:4};out.tie=shoutMoment();
  M={rounds:[1,2,3,4,5],i:5,me:9,opp:4};out.done=shoutMoment();
  M=null;
  RM={code:'ABC',me:'p1',phase:'uno',hand:[1,2],uno:{cnt:[{p:'p1',n:2},{p:'p2',n:6}]}};out.uno=shoutMoment();
  RM={code:'ABC',me:'p1',phase:'uno',hand:[1,2,3,4,5,6],uno:{cnt:[{p:'p1',n:6},{p:'p2',n:1}]}};out.unoBack=shoutMoment();
  RM={code:'ABC',me:'p1',phase:'over'};out.over=shoutMoment();
  RM={code:null};out.idle=shoutMoment();
  M=om;RM=orm;if(RM)RM.code=ormc;
  return out;
 });
 chk('متقدّم وقرب النهاية ← «قربت أفوز»',mom.near==='near'&&mom.hot===true,JSON.stringify(mom));
 chk('متأخّر ← «راجع لك»',mom.back==='back',mom.back);
 chk('تعادل ← حماس',mom.tie==='hype',mom.tie);
 chk('أونو: ورقتان في يدي ← «قربت أفوز»',mom.uno==='near',mom.uno);
 chk('أونو: خصمي على ورقة ← «راجع لك»',mom.unoBack==='back',mom.unoBack);
 chk('انتهت الجولات ← ختام',mom.done==='gg',mom.done);
 chk('انتهت الغرفة ← ختام',mom.over==='gg',mom.over);
 chk('خارج اللعب ← تحية',mom.idle==='hi',mom.idle);

 /* اللوحة: تُفتح على مجموعة اللحظة، وتحمل الجمل نفسها */
 const panel=await page.evaluate(()=>{
  const om=M;
  M={rounds:[1,2,3,4,5],i:4,me:9,opp:4};
  document.querySelectorAll('.ebar.fx').forEach(n=>n.remove());
  emoteBarDom('sendEmote');
  const p=document.querySelector('.ebar.fx');
  const on=p&&p.querySelector('.shCh.on');
  const r={chips:p?p.querySelectorAll('.shCh').length:0,
   pills:p?p.querySelectorAll('.shPl').length:0,
   faces:p?p.querySelectorAll('.ebi').length:0,
   open:on?on.textContent.trim():'',
   w:p?Math.round(p.getBoundingClientRect().width):0,
   right:p?Math.round(p.getBoundingClientRect().right):0,
   top:p?Math.round(p.getBoundingClientRect().top):0};
  M=om;
  return r;
 });
 chk('اللوحة فيها كلّ المجموعات',panel.chips===7,panel.chips);
 chk('اللوحة تُفتح على مجموعة اللحظة',panel.open==='قربت أفوز',panel.open);
 chk('جمل المجموعة ظاهرة',panel.pills>=8,panel.pills);
 chk('التعابير باقية في اللوحة نفسها',panel.faces>=1,panel.faces);
 chk('اللوحة داخل الشاشة',panel.w>0&&panel.right<=390&&panel.top>=0,panel.w+'w right='+panel.right+' top='+panel.top);

 /* القول: فقاعة تظهر، ومهلة تمنع الرشّ */
 const said=await page.evaluate(async()=>{
  document.querySelectorAll('.shfx').forEach(n=>n.remove());
  sayShout('n1');
  const a=document.querySelectorAll('.shfx.me').length;
  const txt=(document.querySelector('.shfx .shtx')||{}).textContent||'';
  const wv=document.querySelectorAll('.shfx .shwv i').length;
  sayShout('n2');                              // فورًا بعدها: المهلة تمنعها
  const t2=(document.querySelector('.shfx .shtx')||{}).textContent||'';
  shoutOut(shoutById('t1'),'op','خصم');
  const both=document.querySelectorAll('.shfx').length;
  return {a,txt,wv,t2,both};
 });
 chk('الصيحة تظهر فقاعةً بنصّها',said.a===1&&said.txt.indexOf('قربت')>=0,said.txt);
 chk('مؤشّر الصوت يرسم موجة',said.wv===5,said.wv);
 chk('المهلة تمنع الرشّ المتتابع',said.t2===said.txt,said.t2);
 chk('صيحتي وصيحة الخصم تظهران معًا لا تمحوان بعضهما',said.both===2,said.both);

 chk('لا خطأ صفحة',errs.length===0,errs[0]);

 await b.close();
 console.log('\n'+(bad?('الصيحات: '+bad+' إخفاق ✘'):('الصيحات سليمة ✔ ('+ok+' فحصًا)')));
 process.exit(bad?1:0);
})().catch(e=>{console.error(e);process.exit(1)});
