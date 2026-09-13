#!/usr/bin/env node
/**
 * ألعاب الجلسة على قانونها (5.96):
 *   NODE_PATH=$(npm root -g) node tools/test-session-games.cjs
 * لو خيروك: بطاقة تُسحب مقلوبة وتُقلب، والدور يلفّ، ولكل صنف نقاطه، والرفض بلا نقاط.
 * صراحة: الحدود قبل أوّل سؤال، وزجاجة تدور ولا تعيد الشخص نفسه، والتمرير حقّ يُعدّ ولا يُعاقب.
 */
const {chromium}=require('playwright');const http=require('h'+'ttp'),fs=require('fs'),path=require('path');
const ROOT='/home/user/almshani/tahaddi',PORT=8879;
const srv=http.createServer((q,r)=>{let p=q.url.split('?')[0];if(p==='/')p='/index.html';
 const f=path.join(ROOT,p);if(!fs.existsSync(f)){r.writeHead(404);r.end();return}
 r.writeHead(200,{'content-type':'text/html; charset=utf-8'});r.end(fs.readFileSync(f))});
let pass=0,fail=0;
const T=(n,ok,i)=>{if(ok){pass++;console.log('  ✓ '+n)}else{fail++;console.log('  ✗ '+n+'  → '+String(i).slice(0,220))}};
(async()=>{await new Promise(r=>srv.listen(PORT,r));
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});
 const pg=await (await b.newContext({viewport:{width:390,height:844}})).newPage();
 const errs=[];pg.on('pageerror',e=>errs.push(e.message));
 await pg.goto('http://localhost:'+PORT+'/');
 await pg.waitForFunction(()=>document.getElementById('app').innerHTML.length>500,null,{timeout:20000});
 await pg.evaluate(()=>{S.tutorial_completed=1;S.tutDone=1;S.name='عبدالرحمن';S.namedByMe=1;saveState()});

 // ── لو خيروك: أدوار وبطاقات ونقاط بحسب الصنف
 let r=await pg.evaluate(async()=>{
  push('lkSetup');await new Promise(r=>setTimeout(r,250));
  PT.n=3;PT.rounds=6;lkSetup(1);await new Promise(r=>setTimeout(r,100));
  ptNameSet(0,'سعود');ptNameSet(1,'نورة');ptNameSet(2,'فهد');
  lkStart();await new Promise(r=>setTimeout(r,150));
  const turns=[],kinds=[],backs=[];
  for(let i=0;i<6;i++){
   turns.push(ptName(PT.idx));
   backs.push(!!document.querySelector('.lkBack'));         // الظهر أوّلًا
   PT.kind=['real','fancy','dare','yesno','real','dare'][i];
   PT.card=LK_CARDS[PT.kind][0];PT.flip=0;lkDraw();
   document.querySelector('.lkBack').click();await new Promise(r=>setTimeout(r,60));
   kinds.push({face:!!document.querySelector('.lkCard'),pts:LK_KIND[PT.kind].p});
   lkJudge(i===3?0:1);await new Promise(r=>setTimeout(r,60));
  }
  return {turns,kinds,backs,pts:PT.pts.slice(),end:/الفائز|أعيدوها/.test(document.body.innerText)};
 });
 T('البطاقة تُسحب مقلوبة ثم تُقلب',r.backs.every(Boolean)&&r.kinds.every(k=>k.face),JSON.stringify(r.backs));
 T('الدور يلفّ على اللاعبين بالترتيب',r.turns.join(',')==='سعود,نورة,فهد,سعود,نورة,فهد',r.turns.join(','));
 // سعود: حقيقة٢ + نعم/لا رُفضت٠ = ٢ · نورة: خيال٢ + حقيقة٢ = ٤ · فهد: جرأة٣ + جرأة٣ = ٦
 T('النقاط بحسب صنف البطاقة، والرفض بلا نقاط',JSON.stringify(r.pts)==='[2,4,6]',JSON.stringify(r.pts));
 T('الجلسة تنتهي بلوح فائز',r.end);

 // ── صراحة: حدود ثم زجاجة ثم إجابة أو تمرير
 r=await pg.evaluate(async()=>{
  Router.settle('partyScr');await new Promise(r=>setTimeout(r,200));
  push('srSetup');await new Promise(r=>setTimeout(r,250));
  PT.n=4;PT.rounds=8;srSetup(1);await new Promise(r=>setTimeout(r,100));
  ptNameSet(0,'سعود');ptNameSet(1,'نورة');ptNameSet(2,'فهد');ptNameSet(3,'ريم');
  srLimits();await new Promise(r=>setTimeout(r,150));
  const lim=/يمرّر/.test(document.body.innerText)&&/حدود الجلسة/.test(document.body.innerText);
  srStart();await new Promise(r=>setTimeout(r,120));
  const ring=document.querySelectorAll('.srRing .srNm').length, bottle=!!document.querySelector('.srBottle');
  const picks=[];let same=0;
  for(let i=0;i<8;i++){
   picks.push(PT.idx);
   if(i&&picks[i]===picks[i-1])same++;
   PT.spin=0;srAsk();await new Promise(r=>setTimeout(r,60));
   srDone(i%3?1:0);await new Promise(r=>setTimeout(r,60));
   if(PT.r<PT.rounds){PT.spin=1;/* تخطّي انتظار الدوران */}
  }
  return {lim,ring,bottle,same,ans:PT.ans.slice(),skip:PT.skip.slice(),
   end:/أكثركم صراحةً|جلسة هادئة/.test(document.body.innerText),
   right:/التمرير حقّ/.test(document.body.innerText)};
 });
 T('الحدود تُعرض قبل أوّل سؤال، والتمرير حقّ معلن',r.lim,'');
 T('حلقة الأسماء والزجاجة تُرسَمان',r.ring===4&&r.bottle,JSON.stringify([r.ring,r.bottle]));
 T('الزجاجة لا تعيد الشخص نفسه مرّتين متتاليتين',r.same===0,r.same);
 T('الإجابات تُعدّ والتمرير يُعدّ منفصلًا بلا عقوبة',
   r.ans.reduce((a,b)=>a+b,0)===5&&r.skip.reduce((a,b)=>a+b,0)===3,JSON.stringify([r.ans,r.skip]));
 T('النهاية تقول من صارح أكثر وتؤكّد أنّ التمرير حقّ',r.end&&r.right,JSON.stringify([r.end,r.right]));
 T('صفر أخطاء JS',errs.length===0,errs.slice(0,2).join(' | '));
 console.log('\n'+(fail?`✗ ${fail} فشل / ${pass} نجح`:`ألعاب الجلسة سليمة ✔ (${pass} فحصًا)`));
 await b.close();srv.close();
 process.exit(fail?1:0);
})().catch(e=>{console.error(e.message);process.exit(1)});
