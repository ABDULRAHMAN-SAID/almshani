#!/usr/bin/env node
/**
 * سويت الصيحات: الجملة تُقال فعلًا، والزرّ يعرفها قبل أن يطلبها اللاعب.
 *
 * الصوت صوتُ الجهاز الحقيقيّ (جسر أندرويد أو speechSynthesis) أو لا صوت:
 * نتحقّق أنّ الجملة تذهب إلى المحرّك الصحيح، وأنّ الجهاز الذي بلا صوتٍ عربيّ
 * لا يسمع صفّارةً مركّبة — ذلك الصوت «الغريب» الذي حُذف في ٦٫٦٠.
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

 /* الضحكة: «ههه» لا تُعطى لمحرّك النطق حروفًا فيتهجّاها «هاء هاء» */
 const sp=await page.evaluate(()=>({
  a:VOICE._speakable('ههه قربت أفوز، انتبه لنفسك'),
  b:VOICE._speakable('هههههههه'),
  c:VOICE._speakable('  ما   بخليك '),
  d:VOICE._speakable('انتبه')
 }));
 chk('«ههه» تصير ضحكةً تُنطق',sp.a.startsWith('هاهاها ')&&sp.b==='هاهاها',sp.a+' | '+sp.b);
 chk('الكلمات التي فيها هاء لا تُمسّ',sp.d==='انتبه'&&sp.c==='ما بخليك',sp.d+' | '+sp.c);

 /* بلا صوتٍ حقيقيّ: صمتٌ لا صفّارة — لا AudioContext يُنشأ ولا يُقال شيء */
 const none=await page.evaluate(()=>{
  let made=0;const A=window.AudioContext;
  window.AudioContext=function(){made++;return new A()};
  const ss=Object.getOwnPropertyDescriptor(window,'speechSynthesis');
  Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>[],cancel(){},speak(){made+=100}},configurable:true});
  const r=VOICE.say('ما بخليك، الفوز لي',{seed:3,tone:'brag'});
  const h=VOICE.hasSpeech();
  window.AudioContext=A;
  if(ss)Object.defineProperty(window,'speechSynthesis',ss);else delete window.speechSynthesis;
  return {r,h,made};
 });
 chk('جهاز بلا صوت عربيّ: لا صوت مركَّب غريب',none.r===false&&none.h===false&&none.made===0,JSON.stringify(none));

 /* تطبيق أندرويد: الجسر يأخذ الجملة بطبقة اللاعب */
 const viaApp=await page.evaluate(()=>{
  const got=[];
  window.TahaddiTTS={ready:()=>true,speak:(t,p,r)=>{got.push([t,p,r]);return true},stop(){}};
  const r=VOICE.say('ما بخليك، الفوز لي',{seed:7,tone:'brag'});
  const r2=VOICE.say('ما بخليك، الفوز لي',{seed:7,tone:'brag'});
  const r3=VOICE.say('ما بخليك، الفوز لي',{seed:901,tone:'brag'});
  const h=VOICE.hasSpeech();
  window.TahaddiTTS={ready:()=>false,speak:()=>{got.push('x');return true}};
  const h2=VOICE.hasSpeech();
  delete window.TahaddiTTS;
  return {r,h,h2,got};
 });
 chk('في التطبيق: يُقال بصوت أندرويد الحقيقيّ',viaApp.r==='app'&&viaApp.h&&viaApp.got[0][0]==='ما بخليك، الفوز لي',JSON.stringify(viaApp.got[0]));
 chk('اللاعب نفسه بالطبقة نفسها، ولاعبٌ آخر بطبقة أخرى',viaApp.got[0][1]===viaApp.got[1][1]&&viaApp.got[0][1]!==viaApp.got[2][1],viaApp.got.map(g=>g[1]).join(' / '));
 chk('محرّك أندرويد بلا عربيّ لا يُستعمل',viaApp.h2===false&&viaApp.got.indexOf('x')<0,viaApp.h2);

 /* المتصفّح: صوتٌ عربيّ في speechSynthesis */
 const viaWeb=await page.evaluate(()=>{
  const said=[];
  const ss=Object.getOwnPropertyDescriptor(window,'speechSynthesis');
  const U=window.SpeechSynthesisUtterance;
  window.SpeechSynthesisUtterance=function(t){this.text=t};   // الحقيقيّ يرفض صوتًا مزيّفًا
  Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>[{lang:'en-US'},{lang:'ar-SA',name:'ar'}],cancel(){},speak(u){said.push(u.text+'|'+u.lang)}},configurable:true});
  VOICE.warm();
  const r=VOICE.say('يلا يلا!',{seed:3,tone:'cheer'});
  if(ss)Object.defineProperty(window,'speechSynthesis',ss);else delete window.speechSynthesis;
  window.SpeechSynthesisUtterance=U;
  VOICE.warm();
  return {r,said};
 });
 chk('في المتصفّح: يُقال بالصوت العربيّ',viaWeb.r==='tts'&&viaWeb.said[0]==='يلا يلا!|ar-SA',JSON.stringify(viaWeb));

 /* ٦٫٦١ — ضحكة المالك المسجّلة: الملفّ حقيقيّ ويُحمَّل، والجملة تبدأ به ثم يُقال باقيها */
 const meta=await page.evaluate(()=>new Promise(res=>{const a=new Audio('audio/laugh.webm');
  a.onloadedmetadata=()=>res({ok:1,d:a.duration});a.onerror=()=>res({ok:0});setTimeout(()=>res({ok:0,to:1}),6000)}));
 chk('ملفّ الضحكة موجود ويُقرأ (ثوانٍ لا صمت)',meta.ok&&meta.d>1&&meta.d<10,JSON.stringify(meta));
 const lg=await page.evaluate(async()=>{
  const A=window.Audio, made=[], said=[];
  window.Audio=function(u){const o={src:u,volume:1,paused:false,play(){made.push(u);return Promise.resolve()},pause(){this.paused=true}};made.el=o;return o};
  window.TahaddiTTS={ready:()=>true,speak:(t)=>{said.push(t);return true},stop(){}};
  const r=VOICE.say('ههه قربت أفوز، انتبه لنفسك',{seed:3,tone:'brag'});
  const beforeEnd=said.length;
  made.el.onended();                              // انتهت الضحكة
  const r2=VOICE.say('هههههههه',{seed:3});        // ضحكةٌ وحدها
  const el2=made.el;
  const r3=VOICE.say('ههه قربت أفوز، انتبه لنفسك',{seed:3});   // تقطع الثانية
  el2.onended&&el2.onended();                     // صدى الضحكة المقطوعة: لا يُقال شيء
  const n=said.length;
  window.Audio=A;delete window.TahaddiTTS;VOICE.stop();
  return {r,r2,r3,beforeEnd,said,n,made:made.slice(),rest:VOICE._rest('ههه قربت أفوز، انتبه لنفسك'),plain:VOICE.hasLaugh('انتبه لوجهه')};
 });
 chk('الجملة الضاحكة تبدأ بالتسجيل الحقيقيّ',lg.r==='laugh'&&lg.made[0]==='audio/laugh.webm'&&lg.beforeEnd===0,JSON.stringify(lg));
 chk('وبعد الضحكة يُقال باقيها بصوت الجهاز',lg.said[0]==='قربت أفوز، انتبه لنفسك',lg.said[0]);
 chk('ضحكةٌ وحدها لا يتبعها كلام، والمقطوعة لا تقول كلامها القديم',lg.r2==='laugh'&&lg.r3==='laugh'&&lg.n===1,lg.n);
 chk('«وجهه» ليست ضحكة',lg.plain===false,lg.plain);

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
   faces:p?p.querySelectorAll('.ebi').length:0, emo:EMOTES_ON,
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
 chk('التعابير في اللوحة نفسها متى فُعّلت',panel.emo?panel.faces>=1:panel.faces===0,panel.faces);
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
