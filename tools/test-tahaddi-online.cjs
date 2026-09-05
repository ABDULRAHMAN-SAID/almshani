#!/usr/bin/env node
/**
 * أونلاين حقيقي بلا claude.ai: خادم تحدّي + متصفحان مستقلّان.
 *   npm run build:tahaddi && node tools/build.mjs && NODE_PATH=$(npm root -g) node tools/test-tahaddi-online.cjs
 * يثبت: الحساب يُنشأ ويُستعاد، الحفظ يسافر بين الجهازين، غرفة بكود بين متصفحين، مباراة كيرم تبدأ،
 * النتيجة المصنّفة تحتاج تقرير الطرفين، ولوحة الصدارة تُبنى من الخادم.
 */
const {chromium}=require('playwright');
const {spawn}=require('child_process');
const path=require('path'),os=require('os'),fs=require('fs');
const ROOT=path.join(__dirname,'..');
const PORT=8800+Math.floor(Math.random()*150);
const DATA=path.join(os.tmpdir(),'tahaddi-online-'+Date.now()+'.json');
let pass=0,fail=0;
const check=(n,ok,info)=>{if(ok){pass++;console.log('  ✓ '+n)}else{fail++;console.log('  ✗ '+n+(info?'  → '+String(info).slice(0,300):''))}};
const sec=t=>console.log('\n── '+t+' ──');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

(async()=>{
 const server=spawn('node',['server/dist/tahaddi.js'],{cwd:ROOT,env:{...process.env,PORT:String(PORT),TAHADDI_DATA_FILE:DATA,TAHADDI_IAP_TEST_SECRET:'t3st-online'},stdio:['ignore','pipe','pipe']});
 const logs=[];server.stdout.on('data',d=>logs.push(String(d)));server.stderr.on('data',d=>logs.push('ERR '+String(d)));
 await sleep(800);
 const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});
 const mk=async label=>{
  const ctx=await browser.newContext({viewport:{width:430,height:900}});
  const page=await ctx.newPage();page._errs=[];
  page.on('pageerror',e=>page._errs.push(label+': '+e.message));
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForFunction(()=>typeof NET==='object'&&typeof Router==='object'&&document.getElementById('app').innerHTML.length>500,null,{timeout:20000});
  await page.evaluate(()=>{S.email='tester@mail.com';S.tutorial_completed=true;S.tutDone=1;S.dev=1;saveState()});
  await page.waitForFunction(()=>NET.state().connected,null,{timeout:8000}).catch(()=>{});
  await page.evaluate(()=>{cur='play';nav();Router.reset('playScr')});
  return page;
 };
 try{
  sec('الحساب والاتصال');
  const A=await mk('A'),B=await mk('B');
  await B.evaluate(()=>{S.name='سلطان';saveState()});   // كل لاعب يختار اسمه بنفسه منذ 5.56
  const sa=await A.evaluate(()=>NET.state()),sb=await B.evaluate(()=>NET.state());
  check('كلا المتصفحين في وضع الخادم ومتصلان بحسابين مختلفين',sa.mode==='server'&&sa.connected&&sb.connected&&sa.id!==sb.id,JSON.stringify([sa,sb]));
  await A.evaluate(()=>{S.name='عبدالرحمن';doRename;});
  await A.evaluate(async()=>{await NET.setName('عبدالرحمن');S.name='عبدالرحمن';S.coins=777;saveState()});
  await sleep(3500);   // الحفظ المحلي ٤٠٠ مللي ثم السحابي بعد ٢٫٥ ث
  const acc=await A.evaluate(()=>S.account);
  check('الحساب محفوظ في حالة اللعبة برمز وهوية',!!acc&&acc.id===sa.id&&acc.token&&acc.token.length===32,JSON.stringify(acc));

  sec('الحفظ السحابي بين جهازين');
  // جهاز جديد بالرمز نفسه = الحساب نفسه والحفظ نفسه
  const ctxC=await browser.newContext({viewport:{width:430,height:900}});
  const C=await ctxC.newPage();C._errs=[];C.on('pageerror',e=>C._errs.push('C: '+e.message));
  await C.goto(`http://localhost:${PORT}/`);
  await C.waitForFunction(()=>typeof NET==='object'&&document.getElementById('app').innerHTML.length>500,null,{timeout:20000});
  await C.evaluate(tok=>{S.email='tester@mail.com';S.tutorial_completed=true;S.account={token:tok};S._savedAt=0;saveState();netBoot()},acc.token);
  await C.waitForFunction(()=>NET.state().connected&&S.coins===777,null,{timeout:8000}).catch(()=>{});
  const cState=await C.evaluate(()=>({id:NET.state().id,coins:S.coins,name:S.name}));
  check('جهاز آخر بالرمز نفسه يستعيد الاسم والعملات من السحابة',cState.id===sa.id&&cState.coins===777&&cState.name==='عبدالرحمن',JSON.stringify(cState));
  await ctxC.close();

  sec('غرفة بكود بين متصفحين حقيقيين');
  await A.evaluate(async()=>{push('gameHub','carrom');push('roomScr','carrom');await new Promise(r=>setTimeout(r,200));await rmCreate()});
  await sleep(300);
  const code=await A.evaluate(()=>RM.code);
  check('المضيف أنشأ غرفة بكود من أربعة رموز',/^[A-Z0-9]{4}$/.test(code||''),code);
  await B.evaluate(async c=>{push('gameHub','carrom');push('roomScr','carrom');await new Promise(r=>setTimeout(r,200));document.getElementById('rmCd').value=c;await rmJoin()},code);
  await sleep(500);
  const rosterA=await A.evaluate(()=>rmRoster().map(p=>p.name+(p.host?'*':''))),rosterB=await B.evaluate(()=>rmRoster().map(p=>p.name+(p.host?'*':'')));
  check('الطرفان يريان بعضهما في الردهة، والمضيف معلَّم',rosterA.length===2&&rosterB.length===2&&rosterA.some(x=>x.endsWith('*')),JSON.stringify([rosterA,rosterB]));
  await A.evaluate(()=>rmStart());await sleep(600);
  const phA=await A.evaluate(()=>RM.phase),phB=await B.evaluate(()=>({ph:RM.phase,pcs:RM.ca&&RM.ca.pcs.length,turn:RM.ca&&RM.ca.turn,me:RM.me}));
  check('بدء المباراة يصل للطرفين: لوح كيرم بـ19 قطعة عند الضيف',phA==='carrom'&&phB.ph==='carrom'&&phB.pcs===19,JSON.stringify([phA,phB]));
  const parts=await A.evaluate(()=>netParticipants());
  check('المشاركون بحسابات الخادم لا بمعرّفات الاتصال',parts.length===2&&parts.includes(sa.id)&&parts.includes(sb.id),JSON.stringify(parts));

  sec('النتيجة المصنّفة: تقرير الطرفين ثم كلمة الخادم');
  // نمثّل نهاية المباراة كما يبثّها المضيف؛ الوضع «مصنّف» يُثبَّت على الطرفين
  await A.evaluate(()=>{RM.mode='ranked'});await B.evaluate(()=>{RM.mode='ranked'});
  const mid='e2e-'+Date.now();
  await A.evaluate(m=>{RM.mid=m;rmSettle({t:'end',by:RM.me})},mid);
  await sleep(400);
  const midA=await A.evaluate(()=>({wins:rankOf('carrom').wins,pl:rankOf('carrom').placementDone}));
  check('الطرف الأول يرى نتيجته محليًا فورًا (تفاؤل) بانتظار الخادم',midA.wins===1&&midA.pl===1,JSON.stringify(midA));
  await B.evaluate(m=>{RM.mid=m;rmSettle({t:'end',by:(RM.players||[]).find(p=>p.peer!==RM.me).peer})},mid);
  await sleep(900);
  const fa=await A.evaluate(()=>rankOf('carrom')),fb=await B.evaluate(()=>rankOf('carrom'));
  check('الخادم اعتمدها: فائز mmr>1000 وخاسر mmr<1000 على الجهازين',fa.mmr>1000&&fa.wins===1&&fb.mmr<1000&&fb.losses===1,JSON.stringify([fa.mmr,fa.wins,fb.mmr,fb.losses]));
  // مباراة متناقضة: كلاهما يدّعي الفوز
  const mid2='e2e2-'+Date.now();
  await A.evaluate(m=>{RM.mid=m;rmSettle({t:'end',by:RM.me})},mid2);
  await B.evaluate(m=>{RM.mid=m;rmSettle({t:'end',by:RM.me})},mid2);
  await sleep(900);
  const ga=await A.evaluate(()=>rankOf('carrom')),gb=await B.evaluate(()=>rankOf('carrom'));
  const toastB=await B.evaluate(()=>document.getElementById('tst').innerText);
  check('فائزان = متناقضة: الخادم يعيد الملفّ الحقيقي ولا يُحتسب شيء',ga.wins===1&&gb.wins===0&&ga.gamesPlayed===1&&gb.gamesPlayed===1,JSON.stringify([ga.wins,gb.wins,ga.gamesPlayed,gb.gamesPlayed]));
  check('اللاعب يُخبَر أنّ المباراة لم تُحتسب',/متناقضة/.test(toastB),toastB);

  sec('لوحة الصدارة من الخادم');
  await A.evaluate(()=>{rmLeave();tab('play');lbGame='carrom';push('lbScr')});
  await A.waitForFunction(()=>document.getElementById('lbBody')&&/لاعبو هذا الخادم/.test(document.getElementById('lbBody').innerText),null,{timeout:6000}).catch(()=>{});
  const lb=await A.evaluate(()=>document.getElementById('lbBody').innerText);
  check('صفّان حقيقيان بأسماء الحسابين وإفصاح عن نطاق الترتيب',/عبدالرحمن/.test(lb)&&/لاعبو هذا الخادم · 2/.test(lb)&&/غير مصنّف/.test(lb),lb.slice(0,200));
  const more=await A.evaluate(()=>{tab('more');return document.getElementById('netLine').innerText});
  check('«المزيد» تقول الحقيقة: متصل بخادم تحدّي وحسابك',/متصل بخادم تحدّي/.test(more)&&more.includes(sa.id),more);

  sec('الشراء');
  const {createHmac}=require('crypto');
  const receipt=(pid,tx)=>createHmac('sha256','t3st-online').update(pid+'.'+tx).digest('hex');
  const web=await A.evaluate(()=>{const st=Billing.status();tab('shop');paySheet('gems_80');const ov=document.querySelector('.qvov');
   const r={st,hasBuy:!!ov.querySelector('#qvy'),txt:ov.innerText};ov.remove();return r});
  check('نسخة الويب بلا جسر متجر: لا زرّ شراء، والورقة تقول إن الشراء داخل تطبيق المتجر',web.st==='no_store'&&!web.hasBuy&&/App Store/.test(web.txt),JSON.stringify(web).slice(0,200));
  const bought=await A.evaluate(async r=>{
   window.TahaddiBilling={platform:'test',finished:[],buy:async pid=>({platform:'test',productId:pid,receipt:r.rc,transactionId:r.tx}),finish(x){this.finished.push(x)}};
   const st=Billing.status();const g0=S.gems;
   const m=await Billing.buy('gems_500');
   return {st,g0,t:m.t,gems:m.grant.gems,dup:m.duplicate,finished:window.TahaddiBilling.finished.length};
  },{rc:receipt('gems_500','tx-online-1'),tx:'tx-online-1'});
  check('مع جسر المتجر: الحالة store، والخادم يتحقّق ويمنح 500 جوهرة، والجسر يُبلَّغ بالإنهاء',bought.st==='store'&&bought.t==='purchased'&&bought.gems===500&&bought.dup===false&&bought.finished===1,JSON.stringify(bought));
  const viaSheet=await A.evaluate(async()=>{const g0=S.gems;paySheet('gems_500');document.querySelector('#qvy').click();
   await new Promise(r=>setTimeout(r,900));return {g0,g1:S.gems,tx:(S.iapTx||[]).slice()}});
  check('الورقة تطبّق المنحة مرّة واحدة لكل إيصال: الإيصال المكرّر لا يضيف جواهر على الجهاز',viaSheet.g1===viaSheet.g0+500&&viaSheet.tx.length===1,JSON.stringify(viaSheet));
  const stolen=await B.evaluate(async r=>{
   window.TahaddiBilling={platform:'test',buy:async pid=>({platform:'test',productId:pid,receipt:r.rc,transactionId:r.tx})};
   try{await Billing.buy('gems_500');return 'granted'}catch(e){return e.code+'|'+Billing.explain(e)}
  },{rc:receipt('gems_500','tx-online-1'),tx:'tx-online-1'});
  check('الإيصال نفسه من حساب آخر يُرفض برسالة عربية واضحة',/^already_used\|/.test(stolen)&&/حساب آخر/.test(stolen),stolen);

  sec('انقطاع الضيف وعودته أثناء أونو');
  await A.evaluate(async()=>{try{rmLeave(1)}catch(e){}push('gameHub','uno');push('roomScr','uno');await new Promise(r=>setTimeout(r,200));await rmCreate()});
  await sleep(300);const code2=await A.evaluate(()=>RM.code);
  await B.evaluate(async c=>{try{rmLeave(1)}catch(e){}push('gameHub','uno');push('roomScr','uno');await new Promise(r=>setTimeout(r,200));document.getElementById('rmCd').value=c;await rmJoin()},code2);
  await sleep(500);await A.evaluate(()=>rmStart());await sleep(900);
  await B.evaluate(()=>{try{unoIntroSkip()}catch(e){}});await A.evaluate(()=>{try{unoIntroSkip()}catch(e){}});await sleep(300);
  const peerB0=await B.evaluate(()=>NET.state().peer),handB0=await B.evaluate(()=>(RM.hand||[]).length);
  await B.evaluate(()=>NET._drop());await sleep(600);
  const cut=await B.evaluate(()=>({c:NET.state().connected,msg:RM.msg}));
  check('السقوط يُرى: غير متصل ورسالة انقطاع في الغرفة',!cut.c&&/انقطع/.test(cut.msg),JSON.stringify(cut));
  await B.waitForFunction(()=>NET.state().connected,null,{timeout:12000}).catch(()=>{});await sleep(1200);
  const back=await B.evaluate(()=>({peer:NET.state().peer,me:RM.me,ph:RM.phase,hand:(RM.hand||[]).length,msg:RM.msg,roster:rmRoster().length,toast:document.body.innerText.includes('عاد الاتصال')}));
  const rosterA2=await A.evaluate(()=>rmRoster().length);
  check('العودة تلقائيًا بالهوية نفسها: المعرّف واليد والدور كما كانت والمضيف ما زال يرى اثنين',
   back.peer===peerB0&&back.me===peerB0&&back.ph==='uno'&&back.hand===handB0&&rosterA2===2&&back.roster===2&&back.msg==='',JSON.stringify({peerB0,handB0,back,rosterA2}));
  check('اللاعب يُعلَم بعودة الاتصال',back.toast);
  check('صفر أخطاء JS في المتصفحين',A._errs.length===0&&B._errs.length===0,(A._errs.concat(B._errs)).slice(0,3).join(' | '));
  const health=await A.evaluate(async p=>{const r=await fetch(`http://localhost:${p}/health`);return r.json()},PORT);
  check('/health: ثلاثة حسابات (الجهاز C أخذ حسابًا مؤقتًا قبل دخوله برمز A) ومتّصلان',health.ok&&health.accounts===3&&health.online>=2&&health.pending===0,JSON.stringify(health));
 }catch(e){fail++;console.log('  ✗ استثناء: '+(e&&e.stack||e));console.log(logs.slice(-5).join(''))}
 await browser.close();server.kill('SIGTERM');try{fs.unlinkSync(DATA)}catch(e){}
 console.log('\n'+(fail?`✗ ${fail} فشل / ${pass} نجح`:`أونلاين حقيقي ✔ (${pass} فحصًا)`));
 process.exit(fail?1:0);
})();
