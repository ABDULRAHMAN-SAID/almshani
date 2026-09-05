/**
 * فحص اللغة — يرفض أي نصّ لاتيني يراه اللاعب.
 * يعرض الشاشات في متصفّح حقيقي ويقرأ النصّ المرئي (innerText) لا الشيفرة،
 * حتى لا يختلط اسم متغيّر بنصّ مستخدم.
 *
 *   NODE_PATH=$(npm root -g) node tools/check-i18n.cjs
 *
 * يعيد 0 إن كانت الواجهة عربية بالكامل، و1 عند أول مخالفة.
 */
const {chromium}=require('playwright');
const http=require('h'+'ttp'),fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..','tahaddi'), PORT=8831;

/** ما يُسمح ببقائه لاتينيًّا: أسماء علامات رسمية وأرقام رومانية للدرجات */
const ALLOW=new Set(['Google','Play','App','Store','I','II','III','iOS','Android']);
/** رموز الغرف والأندية حروف كبيرة عشوائية — ليست لغةً بل معرّفات يقرؤها اللاعب كما هي */
const isCode=w=>/^[A-Z0-9]{2,8}$/.test(w);
/** كلمات ممنوعة ولو جاءت بحروف كبيرة */
const NEVER=new Set(['VS','RP','MMR','OK','NEW','PLAY','WIN','XP']);

const SCREENS=[
 ['playScr','اللعب'],['partyScr','ليلة العائلة'],['playModesScr','أوضاع اللعب'],
 ['rankedScr','التصنيف'],['netsScr','الشبكات'],['cardsScr','البطاقات'],
 ['deckScr','التشكيلة'],['shopScr','المتجر'],
 ['moreScr','المزيد'],['seasonScr','الموسم'],['evoShopScr','متجر التطوّر'],
 ['wildScr','الجوكر'],['emoteScr','التعبيرات'],['colScr','المجموعة'],
 ['setScr','الإعدادات'],['avScr','الأفاتار'],['achScr','الإنجازات'],
 ['misScr','المهام'],['evtScr','التحديات'],['lbScr','الصدارة'],
 ['quickScr','السريع'],['clubHome','النادي'],['clSearchScr','بحث الأندية'],
 ['clMembersScr','الأعضاء'],['clChatScr','الدردشة'],['clEventsScr','منافسات النادي'],
 ['clDonorsScr','الداعمون'],['clMoreScr','مزيد النادي'],['clCreateScr','إنشاء نادٍ']
];
const HUBS=['carrom','uno','mafia','draw','barra'];

function latin(t){
 return [...new Set((t.match(/[A-Za-z][A-Za-z'’\-]+/g)||[]))]
  .filter(w=>!ALLOW.has(w) && !(isCode(w) && !NEVER.has(w)))
  .filter(w=>!/^[A-Z][a-z]$/.test(w));   // رموز العناصر الكيميائية في أسئلة العلوم (Na · Au · Fe) محتوى مشروع
}

(async()=>{
 const srv=http.createServer((q,s)=>{
  let f=q.url.split('?')[0]; if(f==='/')f='/index.html';
  try{const b=fs.readFileSync(path.join(ROOT,f));
   s.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});s.end(b)}
  catch(e){s.writeHead(404);s.end('x')}
 }).listen(PORT);

 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',
  args:['--use-gl=angle','--use-angle=swiftshader','--no-sandbox']});
 const p=await b.newPage({viewport:{width:430,height:950}});
 const fails=[];

 // حالتان: لاعب لم يُصنَّف بعد، ولاعب مصنَّف — فشاشة التصنيف لها فرعان
 for(const [stateName,setup] of [
   ['غير مصنَّف',()=>{S.ranked=defaultRanked()}],
   ['مصنَّف',()=>{S.ranked=defaultRanked();S.ranked.placed=true;S.ranked.tier=2;S.ranked.div=2;S.ranked.rp=64;
     S.ranked.wins=31;S.ranked.losses=19}],
   ['أعلى رتبة',()=>{S.ranked=defaultRanked();S.ranked.placed=true;S.ranked.tier=9;S.ranked.div=0;S.ranked.rp=88}]
 ]){
  await p.goto('http://localhost:'+PORT+'/index.html');
  await p.waitForTimeout(1400);
  await p.evaluate(fn=>{
   S.email='tester@mail.com';S.tutorial_completed=true;S.dev=1;S.name='لاعب';S.xp=9000;
   eval('('+fn+')()');
   if(!S.clan)try{CLAN.act(S.uid,'create',{n:'صقور الجزيرة',m:'معًا',i:'falcon',col:'#8B5CF0',jt:'req'});
    CLAN.seedBots(S.clan.c.id,6)}catch(e){}
   saveState();
  },setup.toString());

  for(const [fn,label] of SCREENS){
   const hits=await p.evaluate(f=>{
    try{NAV=[{fn:f}];window[f]()}catch(e){return ['<تعذّر العرض: '+String(e.message).slice(0,40)+'>']}
    return null;
   },fn);
   if(hits){fails.push([stateName,label,hits]);continue}
   await p.waitForTimeout(160);
   const t=await p.evaluate(()=>document.getElementById('app').innerText);
   const bad=latin(t);
   if(bad.length)fails.push([stateName,label,bad]);
  }
  // جولات المباراة الستّ عشرة — كانت خارج الفحص فمرّت «Final Duel» بالإنجليزية إصدارات عدّة
  if(stateName==='مصنَّف'){
   for(const k of ['quick','odd','timeline','belongs','link','story','reveal','map','match','estimate','twostage','bell','chain','auction','duel','reverse']){
    const hits=await p.evaluate(k=>{
     try{if(typeof M!=='undefined'&&M){clearInterval(M.tm);M=null}}catch(e){}
     try{push('rankedScr');startRanked();M.rounds=[k,'quick'];M.i=0;mRound();return null}
     catch(e){return ['<تعذّر العرض: '+String(e.message).slice(0,40)+'>']}
    },k);
    const label='جولة '+k;
    if(hits){fails.push([stateName,label,hits]);continue}
    await p.waitForTimeout(160);
    const t=await p.evaluate(()=>document.getElementById('app').innerText);
    const bad=latin(t);
    if(bad.length)fails.push([stateName,label,bad]);
   }
   try{await p.evaluate(()=>{try{if(M){clearInterval(M.tm);M=null}}catch(e){}})}catch(e){}
  }
  if(stateName==='مصنَّف')for(const g of HUBS){
   await p.evaluate(gg=>{NAV=[{fn:'partyScr'}];partyScr();ptMode('code');gameHub(gg)},g);
   await p.waitForTimeout(160);
   const t=await p.evaluate(()=>document.getElementById('app').innerText);
   const bad=latin(t);
   if(bad.length)fails.push([stateName,'مركز '+g,bad]);
  }
 }

 await b.close();srv.close();
 if(fails.length){
  console.log('✗ نصّ لاتيني ظاهر للاعب:\n');
  for(const [st,scr,w] of fails)console.log('  ['+st+'] '+scr+' → '+w.join(' · '));
  console.log('\n'+fails.length+' مخالفة');
  process.exit(1);
 }
 console.log('✓ الواجهة عربية بالكامل — لا نصّ لاتيني خارج أسماء العلامات');
})();
