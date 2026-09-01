const {chromium}=require('playwright');
const http=require('h'+'ttp'),fs=require('fs'),path=require('path');
const ROOT=require('path').join(__dirname,'..','tahaddi');
const srv=http.createServer((q,s)=>{let f=q.url.split('?')[0];if(f==='/')f='/index.html';
 try{const b=fs.readFileSync(path.join(ROOT,f));s.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});s.end(b)}catch(e){s.writeHead(404);s.end('x')}}).listen(8841);
let pass=0,fail=0;
const ck=(n,ok,d)=>{if(ok){pass++;console.log('  ✓ '+n)}else{fail++;console.log('  ✗ FAIL: '+n+(d?' → '+d:''))}};
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});
 const c=await b.newContext();const p=await c.newPage();
 const errs=[];p.on('pageerror',e=>errs.push(e.message));

 // ١) اكتب حفظًا بالصيغة القديمة: ranked موجودة وgameRanks غير موجودة
 await p.goto('http://localhost:8841/index.html');await p.waitForTimeout(1400);
 const key=await p.evaluate(()=>SAVE_KEY);
 await p.evaluate(k=>{
  const legacy={v:1,t:Date.now(),s:{name:'قديم',xp:4200,coins:900,gems:7,
   tutorial_completed:true,
   ranked:{placed:true,placementDone:5,placementWins:4,tier:3,div:1,rp:55,mmr:1240,
    protect:0,seasonBest:{tier:3,div:1},globalRank:null,wins:40,losses:12}}};
  localStorage.setItem(k,JSON.stringify(legacy));
 },key);

 // ٢) أعد التحميل — يجب أن تُرحَّل تلقائيًّا
 await p.reload();await p.waitForTimeout(1500);
 const after=await p.evaluate(()=>({
  hasGR:!!S.gameRanks, kTier:S.gameRanks&&S.gameRanks.knowledge.tier,
  kDiv:S.gameRanks&&S.gameRanks.knowledge.div, kRp:S.gameRanks&&S.gameRanks.knowledge.rp,
  kMmr:S.gameRanks&&S.gameRanks.knowledge.mmr, kWins:S.gameRanks&&S.gameRanks.knowledge.wins,
  aliasSame:S.ranked===S.gameRanks.knowledge,
  carromUnranked:!S.gameRanks.carrom.placed&&S.gameRanks.carrom.rp===0,
  unoUnranked:!S.gameRanks.uno.placed,
  name:S.name, label:rankName(S.ranked)
 }));
 ck('الحفظ القديم يُرحَّل: رتبة اليوم صارت رتبة المعرفة',
  after.hasGR&&after.kTier===3&&after.kDiv===1&&after.kRp===55&&after.kMmr===1240&&after.kWins===40,
  JSON.stringify(after));
 ck('باقي الألعاب تبدأ «غير مصنّف» لا برونزي', after.carromUnranked&&after.unoUnranked);
 ck('S.ranked ما زالت تشير إلى ملفّ المعرفة نفسه', after.aliasSame);
 ck('بقيّة الحساب لم تُمَسّ', after.name==='قديم');
 ck('اسم الرتبة عربي بعد الترحيل', after.label==='بلاتيني I', after.label);

 // ٣) عدّل تصنيف الكيرم واحفظ
 await p.evaluate(()=>{
  for(let i=0;i<6;i++)resolveMatch({gameId:'carrom',mode:'ranked',matchId:'x'+i,
   result:{won:true},opponents:[{mmr:1100}]});
  saveState();
 });
 await p.waitForTimeout(700);
 const raw=await p.evaluate(k=>localStorage.getItem(k),key);
 const parsed=JSON.parse(raw);
 ck('الحفظ الجديد يحمل gameRanks', !!parsed.s.gameRanks, Object.keys(parsed.s).join(','));
 ck('الحفظ الجديد لا يكرّر ranked', !('ranked' in parsed.s));

 // ٤) أعد التحميل وتأكّد أن تصنيف الكيرم بقي وأن المعرفة لم تتأثّر
 await p.reload();await p.waitForTimeout(1500);
 const back=await p.evaluate(()=>({
  carromPlaced:S.gameRanks.carrom.placed, carromWins:S.gameRanks.carrom.wins,
  carromRp:S.gameRanks.carrom.rp,
  kTier:S.gameRanks.knowledge.tier, kRp:S.gameRanks.knowledge.rp,
  aliasSame:S.ranked===S.gameRanks.knowledge
 }));
 ck('تصنيف الكيرم يبقى بعد إعادة التحميل',
  back.carromPlaced&&back.carromWins===6, JSON.stringify(back));
 ck('تصنيف المعرفة لم يتأثّر بلعب الكيرم', back.kTier===3&&back.kRp===55, JSON.stringify(back));
 ck('الربط يُعاد بعد إعادة التحميل', back.aliasSame);
 ck('صفر أخطاء JS', errs.length===0, errs.join(' | '));

 console.log('\n'+(fail?fail+' فحص فاشل ✗':'الحفظ والترحيل سليمان ✔'));
 await b.close();srv.close();process.exit(fail?1:0);
})();
