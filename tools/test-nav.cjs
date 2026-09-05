/**
 * اختبار قبول نواة التنقّل في المتصفح — يشغّل اللعبة الحقيقية ويضغط رجوع فعلًا.
 *   NODE_PATH=$(npm root -g) node tools/test-nav.cjs
 */
const {chromium}=require('playwright');
const http=require('h'+'ttp'),fs=require('fs'),path=require('path');
const ROOT='/home/user/almshani/tahaddi';
const srv=http.createServer((q,s)=>{let f=q.url.split('?')[0];if(f==='/')f='/index.html';
 try{const b=fs.readFileSync(path.join(ROOT,f));s.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});s.end(b)}catch(e){s.writeHead(404);s.end('x')}}).listen(8875);
let pass=0,fail=0;
const check=(n,ok,info)=>{if(ok){pass++;console.log('  ✓ '+n)}else{fail++;console.log('  ✗ '+n+(info?'  → '+String(info).slice(0,300):''))}};
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});
 const page=await b.newPage({viewport:{width:430,height:900}});
 const errs=[];page.on('pageerror',e=>errs.push(e.message));
 await page.goto('http://localhost:8875/index.html');await page.waitForTimeout(1500);
 await page.evaluate(()=>{S.email='tester@mail.com';S.tutorial_completed=true;S.tutDone=1;S.dev=1;saveState();cur='play';nav();Router.reset('playScr')});
 await page.waitForTimeout(300);

 // ── أ) السجلّ يغطّي كل دالة ترسم شاشة ──
 const cov=await page.evaluate(()=>{
  // كل دالة فيها go( في المصدر، وأين تقع في السجلّ: شاشة باسمها أو داخل تدفّق حيّ
  const FLOW={mDraw:'match',mResult:'mResult',introDraw:'intro',preMatchOld:null,
   tDraw:'tutorial',tDone:'tutorial',draw:'quiz',done:'quiz',mmDraw:'mmScr',roomDraw:'room',
   barraDeal:'party',barraTalk:'party',barraVote:'party',barraEnd:'party',
   mafiaDeal:'party',mafGate:'party',mafPick:'party',mafCheck:'party',mafiaMorning:'party',mafLynch:'party',mafWinCheck:'party',
   drawPass:'party',drawBoard:'party',drawVote:'party',drawEnd:'party',
   drawAv:'avScr',renderReward:'rewardScr',renameAsk:'renameAsk',
   clanScrFail:'*',clScreen:'*',clGo:'*',clEmptyScr:'*',clErrScr:'*'};
  const names=['drawAv','introDraw','drawLesson','cardsScr','cardDetail','cardLevels','levelDetail','deckScr','tryCard','setScr','setSection','renameAsk','delAsk','shopScr','chestScr','oddsScr','renderReward','wildScr','evoShopScr','emoteScr','colScr','welcomeScr','askTut','skipAsk','tDraw','tDone','rankedScr','preMatchOld','mDraw','mResult','playScr','evtScr','seasonScr','moreScr','playModesScr','mmScr','mmDraw','roomScr','roomDraw','soloScr','partyScr','gameHub','gameRankScr','barraSetup','barraDeal','barraTalk','barraVote','barraEnd','mafiaSetup','mafiaDeal','mafGate','mafPick','mafCheck','mafiaMorning','mafLynch','mafWinCheck','drawSetup','drawPass','drawBoard','drawVote','drawEnd','clanScrFail','clScreen','clGo','clEmptyScr','clErrScr','clChatScr','clRequestSupportScr','clSupportScr','clDonorsScr','clEventsScr','clAchScr','home','netsScr','mapScr','quickScr','draw','done','misScr','achScr','storeScr','lbScr','profileView'];
  const miss=[],dead=[];
  for(const n of names){
   const f=FLOW.hasOwnProperty(n)?FLOW[n]:n;
   if(f===null){dead.push(n);continue}
   if(f==='*')continue;                      // أدوات رسم للنادي لا شاشات
   if(!Router.has(f))miss.push(n+'→'+f);
  }
  return {total:names.length,miss,dead,registered:Router.names().length};
 });
 check(`السجلّ يغطّي ${cov.total} دالة رسم (${cov.registered} اسمًا مسجّلًا) — الشاشات المباشرة باسمها والتدفّقات الحيّة بإطارها`,cov.miss.length===0,JSON.stringify(cov));
 check('الشيفرة الميتة معروفة بالاسم لا مخفيّة: preMatchOld',cov.dead.join()==='preMatchOld');

 // ── ب) كل شاشة قابلة للدفع: تُفتح، ولها زرّ رجوع ≥ ٤٤×٤٤، والرجوع منها يعيدك من حيث جئت ──
 const every=await page.evaluate(async()=>{
  if(!S.clan||!S.clan.c){CLAN.act(S.uid,'create',{n:'فرسان الاختبار',desc:'x',i:'book',col:'#5AC8F5',jt:'open'});CLAN.seedBots(S.clan.c.id,6)}
  const uid=Object.keys(S.clan.mem).find(u=>u!==S.uid);
  const cid=Object.keys(S.cards.owned)[0];
  const ck=Object.keys(ECON.chests)[0];
  const ARG={cardDetail:+cid||cid,cardLevels:+cid||cid,levelDetail:{id:+cid||cid,lv:1},tryCard:+cid||cid,setSection:'account',chestScr:ck,oddsScr:ck,
   rewardScr:{list:[],title:'اختبار'},mapScr:NETS[0].id,gameHub:'carrom',gameRankScr:'carrom',soloScr:'carrom',roomScr:'carrom',
   mmScr:{g:'uno',mode:'casual'},clMemberScr:uid,profileView:myProfile()};
  const skip=new Set(['playScr','moreScr','cardsScr','shopScr','home','netsScr','authScr','welcomeScr','askTut','skipAsk','clubHome','clSearchScr',
   'match','intro','mResult','tutorial','room','party','vsbot','quiz','clTransferScr']);
  const out=[];
  for(const n of Router.names()){
   if(skip.has(n))continue;
   tab('play');
   const arg=ARG[n];
   let err=null;
   try{push(n,arg)}catch(e){err=e.message}
   await new Promise(r=>setTimeout(r,450));    // بعض الشاشات تُرسم بعد مهلة، وحركة الدخول ٣٤٠ مللي
   const depth=Router.depth(), cur=Router.current()&&Router.current().fn;
   const html=document.getElementById('app').innerHTML;
   const bk=document.querySelector('#app .tbar .bk, #app .bk');
   const box=bk?{width:bk.offsetWidth,height:bk.offsetHeight}:null;   // مقاس التخطيط لا المحوَّل بالحركة
   const big=!!box&&box.width>=44&&box.height>=44;
   const blank=html.trim().length<80||html.includes('لم نتمكّن من فتح');
   let backOk=false;
   try{back(true);await new Promise(r=>setTimeout(r,30));backOk=Router.depth()===1&&Router.current().fn==='playScr'}catch(e){}
   document.querySelectorAll('.qvov').forEach(x=>x.remove());
   out.push({n,cur,depth,big,blank,backOk,err,box:box&&[Math.round(box.width),Math.round(box.height)]});
  }
  tab('play');
  return out;
 });
 const bad=every.filter(x=>x.blank||x.err||x.depth!==2);
 const noBk=every.filter(x=>!x.blank&&!x.big);
 const noBack=every.filter(x=>!x.backOk);
 check(`${every.length} شاشة تُفتح بالدفع بلا شاشة بيضاء ولا خطأ`,bad.length===0,JSON.stringify(bad));
 check(`زرّ رجوع ≥ ٤٤×٤٤ في كل شاشة فرعية (${every.length-noBk.length}/${every.length})`,noBk.length===0,JSON.stringify(noBk.map(x=>[x.n,x.box])));
 check('الرجوع من كل واحدة يعيدك إلى الجذر الذي جئت منه',noBack.length===0,JSON.stringify(noBack.map(x=>x.n)));

 // ── ج) عشرون رجوعًا ──
 const twenty=await page.evaluate(async()=>{
  tab('play');push('partyScr');push('gameHub','carrom');push('soloScr','carrom');push('gameRankScr','carrom');
  let threw=null;
  for(let i=0;i<20;i++){try{back(true)}catch(e){threw=e.message}}
  await new Promise(r=>setTimeout(r,50));
  return {threw,depth:Router.depth(),cur:Router.current()&&Router.current().fn,len:document.getElementById('app').innerHTML.length};
 });
 check('عشرون رجوعًا من أي عمق تنتهي بجذر التبويب بلا استثناء ولا شاشة بيضاء',!twenty.threw&&twenty.depth===1&&twenty.cur==='playScr'&&twenty.len>500,JSON.stringify(twenty));

 // ── د) الجذور بعمق واحد في كل التبويبات ──
 const roots=await page.evaluate(()=>['play','cards','shop','more','clubs'].map(k=>{tab(k);return [k,Router.depth(),Router.current().fn]}));
 check('كل تبويب جذره على المكدّس بعمق ١ — لا فرق بين «العب» و«المتجر»',roots.every(r=>r[1]===1),JSON.stringify(roots));

 // ── هـ) استعادة التمرير ──
 const scroll=await page.evaluate(async()=>{
  tab('cards');window.scrollTo(0,0);
  const h=document.documentElement.scrollHeight;
  window.scrollTo(0,420);await new Promise(r=>setTimeout(r,40));
  const y0=window.scrollY;
  push('cardDetail',+Object.keys(S.cards.owned)[0]||Object.keys(S.cards.owned)[0]);
  await new Promise(r=>setTimeout(r,40));
  const yIn=window.scrollY;
  back();await new Promise(r=>setTimeout(r,40));
  return {h,y0,yIn,y1:window.scrollY};
 });
 check('الرجوع من تفاصيل بطاقة يعيدك إلى موضعك في القائمة لا إلى أعلاها',scroll.y0>300&&scroll.yIn<50&&Math.abs(scroll.y1-scroll.y0)<8,JSON.stringify(scroll));

 // ── و) الضغطة المزدوجة ──
 const dbl=await page.evaluate(()=>{tab('play');push('evtScr');push('evtScr');return Router.depth()});
 check('ضغطتان سريعتان على «التحديات» تفتحانها مرّة واحدة',dbl===2,dbl);

 // ── ز) زرّ أندرويد ──
 const droid1=await page.evaluate(()=>{tab('play');push('seasonScr');return {r:history.state&&history.state.r,d:Router.depth()}});
 await page.goBack();await page.waitForTimeout(200);
 const droid2=await page.evaluate(()=>({d:Router.depth(),cur:Router.current().fn,r:history.state&&history.state.r}));
 check('زرّ الرجوع في أندرويد يرجع خطوة واحدة لا يخرج من اللعبة',droid1.r===1&&droid1.d===2&&droid2.d===1&&droid2.cur==='playScr',JSON.stringify({droid1,droid2}));
 await page.goBack();await page.waitForTimeout(250);
 const droid3=await page.evaluate(()=>({alive:typeof Router==='object',d:Router.depth(),cur:Router.current().fn,toast:document.getElementById('tst').innerText.includes('مرّة أخرى')}));
 check('ضغطة رجوع في الجذر تنبّه ولا تخرج من اللعبة — الثانية خلال ثانية ونصف هي التي تخرج',droid3.alive&&droid3.d===1&&droid3.toast,JSON.stringify(droid3));

 // ── ح) مباراة الرانك: إطار حيّ، لا شريط، والرجوع سؤال ──
 const match=await page.evaluate(async()=>{
  tab('play');push('rankedScr');if(!S.ranked.placed){S.ranked.placed=true}
  startRanked();await new Promise(r=>setTimeout(r,80));
  const inMatch=Router.current().fn==='match', bar=getComputedStyle(document.getElementById('nav')).display;
  back();await new Promise(r=>setTimeout(r,40));
  const asked=!!(M&&M.quitAsk)&&document.getElementById('app').innerText.includes('الانسحاب');
  const still=Router.current().fn==='match';
  quitMatch(1);await new Promise(r=>setTimeout(r,60));
  document.querySelectorAll('.qvov').forEach(x=>x.remove());
  return {inMatch,bar,asked,still,after:Router.current().fn,depth:Router.depth(),bar2:getComputedStyle(document.getElementById('nav')).display,M:!!M};
 });
 check('المباراة إطار حيّ يخفي الشريط السفلي',match.inMatch&&match.bar==='none',JSON.stringify(match));
 check('الرجوع داخل المباراة يفتح سؤال الانسحاب ولا يخرج',match.asked&&match.still,JSON.stringify(match));
 check('الانسحاب يهبط على شاشة التصنيف التي بدأت منها ويعيد الشريط',match.after==='rankedScr'&&match.depth===2&&match.bar2==='flex'&&!match.M,JSON.stringify(match));

 // ── ط) الغرفة: تحلّ محلّ شاشة الدخول، والرجوع أثناء اللعب سؤال ──
 const room=await page.evaluate(async()=>{
  tab('play');push('gameHub','carrom');push('soloScr','carrom');
  soloStart('carrom','mid');await new Promise(r=>setTimeout(r,400));
  const fns=Router.stack.map(f=>f.fn).join('>');
  const bar=getComputedStyle(document.getElementById('nav')).display;
  back();await new Promise(r=>setTimeout(r,40));
  const ov=document.querySelector('.qvov');
  const asked=!!ov&&ov.innerText.includes('مغادرة الغرفة');
  if(ov)ov.querySelector('#qvn').click();
  const still=Router.current().fn==='room';
  rmLeave();await new Promise(r=>setTimeout(r,80));
  return {fns,bar,asked,still,after:Router.stack.map(f=>f.fn).join('>'),bar2:getComputedStyle(document.getElementById('nav')).display};
 });
 check('غرفة الكمبيوتر تحلّ محلّ شاشة «مع الكمبيوتر» على المكدّس وتخفي الشريط',room.fns==='playScr>gameHub>room'&&room.bar==='none',JSON.stringify(room));
 check('الرجوع أثناء مباراة كيرم جارية يسأل قبل المغادرة',room.asked&&room.still,JSON.stringify(room));
 check('مغادرة الغرفة تعيدك إلى مركز اللعبة الذي جئت منه',room.after==='playScr>gameHub'&&room.bar2==='flex',JSON.stringify(room));

 // ── ي) ليلة العائلة ──
 const fam=await page.evaluate(async()=>{
  tab('play');push('partyScr');ptWay='pass';ptOpen('barra');
  const setup=Router.stack.map(f=>f.fn).join('>');
  const bk1=!!document.querySelector('#app .tbar .bk');
  barraStart();await new Promise(r=>setTimeout(r,60));
  const live=Router.stack.map(f=>f.fn).join('>'), bar=getComputedStyle(document.getElementById('nav')).display;
  const bk2=!!document.querySelector('#app .tbar .bk');
  back();await new Promise(r=>setTimeout(r,40));
  const ov=document.querySelector('.qvov');const asked=!!ov&&ov.innerText.includes('إنهاء اللعبة');
  if(ov)ov.querySelector('#qvy').click();
  await new Promise(r=>setTimeout(r,60));
  return {setup,bk1,live,bar,bk2,asked,after:Router.stack.map(f=>f.fn).join('>')};
 });
 check('شاشة إعداد «برا السالفة» تُدفع فوق ليلة العائلة ولها رجوع',fam.setup==='playScr>partyScr>barraSetup'&&fam.bk1,JSON.stringify(fam));
 check('اللعبة الحيّة إطار بلا شريط وله زرّ رجوع مرئي',fam.live==='playScr>partyScr>barraSetup>party'&&fam.bar==='none'&&fam.bk2,JSON.stringify(fam));
 check('إنهاء اللعبة بعد السؤال يهبط على ليلة العائلة',fam.asked&&fam.after==='playScr>partyScr',JSON.stringify(fam));

 // ── ك) التعليم: تخطّي ثم «متابعة» يعيدك إلى مكانك في التدريب ──
 const tut=await page.evaluate(async()=>{
  const keep=S.tutorial_completed;S.tutorial_completed=false;
  Router.reset('welcomeScr');const bar0=getComputedStyle(document.getElementById('nav')).display;
  push('askTut');tutStart();await new Promise(r=>setTimeout(r,60));
  const a=Router.stack.map(f=>f.fn).join('>');
  const q0=document.getElementById('app').innerText.includes(TSTEP[0].q);
  back();await new Promise(r=>setTimeout(r,40));
  const b=Router.current().fn;
  back();await new Promise(r=>setTimeout(r,40));
  const c=Router.current().fn, q1=document.getElementById('app').innerText.includes(TSTEP[0].q);
  finishTut();await new Promise(r=>setTimeout(r,40));
  const d=Router.stack.map(f=>f.fn).join('>'), bar1=getComputedStyle(document.getElementById('nav')).display;
  S.tutorial_completed=keep;
  return {bar0,a,q0,b,c,q1,d,bar1};
 });
 check('الترحيب بلا شريط سفلي، والتدريب إطار حيّ',tut.bar0==='none'&&tut.a==='welcomeScr>askTut>tutorial'&&tut.q0,JSON.stringify(tut));
 check('الرجوع في التدريب يفتح «تخطي؟»، و«متابعة» تعيدك إلى السؤال نفسه',tut.b==='skipAsk'&&tut.c==='tutorial'&&tut.q1,JSON.stringify(tut));
 check('إنهاء التدريب يبدأ اللعبة من جذر «العب» بالشريط',tut.d==='playScr'&&tut.bar1==='flex',JSON.stringify(tut));

 // ── ل) البحث عن لاعبين: الرجوع = إلغاء البحث والعودة للمركز ──
 const mm=await page.evaluate(async()=>{
  tab('play');push('gameHub','uno');push('mmScr',{g:'uno',mode:'casual'});await new Promise(r=>setTimeout(r,250));
  const a=Router.stack.map(f=>f.fn).join('>'), bk=!!document.querySelector('#app .tbar .bk');
  back();await new Promise(r=>setTimeout(r,80));
  return {a,bk,after:Router.stack.map(f=>f.fn).join('>'),mm:RM.mm};
 });
 check('شاشة البحث لها زرّ رجوع مرئي، والرجوع يلغي البحث ويعيدك للمركز',mm.a==='playScr>gameHub>mmScr'&&mm.bk&&mm.after==='playScr>gameHub'&&!mm.mm,JSON.stringify(mm));

 // ── م) جولة الأسئلة: زرّ خروج مرئي والرجوع سؤال ──
 const quiz=await page.evaluate(async()=>{
  tab('play');push('quickScr');vsScr();await new Promise(r=>setTimeout(r,80));
  const a=Router.stack.map(f=>f.fn).join('>'), bar=getComputedStyle(document.getElementById('nav')).display;
  const bk=document.querySelector('#app .qtop .bk');const box=bk&&{width:bk.offsetWidth,height:bk.offsetHeight};
  back();await new Promise(r=>setTimeout(r,40));
  const ov=document.querySelector('.qvov');const asked=!!ov&&ov.innerText.includes('إنهاء الجولة');
  if(ov)ov.querySelector('#qvy').click();await new Promise(r=>setTimeout(r,60));
  return {a,bar,big:!!box&&box.width>=44&&box.height>=44,asked,G:!!G,after:Router.stack.map(f=>f.fn).join('>')};
 });
 check('جولة الأسئلة إطار حيّ بلا شريط وبزرّ خروج ≥ ٤٤',quiz.a==='playScr>quickScr>quiz'&&quiz.bar==='none'&&quiz.big,JSON.stringify(quiz));
 check('الخروج من الجولة سؤال، ثم العودة إلى حيث بدأت',quiz.asked&&!quiz.G&&quiz.after==='playScr>quickScr',JSON.stringify(quiz));

 // ── ن) حارس التغييرات غير المحفوظة ──
 const dirty=await page.evaluate(async()=>{
  tab('more');push('renameAsk');document.getElementById('nm').value=S.name+'x';
  back();await new Promise(r=>setTimeout(r,40));
  const ov=document.querySelector('.qvov');const asked=!!ov&&ov.innerText.includes('تغييرات لم تُحفظ');
  const still=Router.current().fn==='renameAsk';
  if(ov)ov.querySelector('#qvy').click();await new Promise(r=>setTimeout(r,40));
  const left=Router.current().fn;
  // محرّر هوية النادي: ورقته الخاصة (حفظ · تجاهل)
  tab('clubs');push('clSettingsScr');push('clEditIdentityScr');clEdSet('n','اسم جديد');
  back();await new Promise(r=>setTimeout(r,40));
  const ov2=document.querySelector('.qvov');const asked2=!!ov2&&ov2.innerText.includes('حفظ');
  const still2=Router.current().fn==='clEditIdentityScr';
  if(ov2)ov2.remove();_clEd=null;back(true);
  return {asked,still,left,asked2,still2};
 });
 check('تعديل الاسم ثم الرجوع يسأل قبل الإهمال',dirty.asked&&dirty.still&&dirty.left==='moreScr',JSON.stringify(dirty));
 check('محرّر هوية النادي يعرض ورقة الحفظ عند الرجوع — من زرّ أندرويد أيضًا',dirty.asked2&&dirty.still2,JSON.stringify(dirty));

 // ── س) اسم غير مسجّل لا يترك شاشة بيضاء ──
 const ghost=await page.evaluate(async()=>{tab('play');let t=null;try{push('nope')}catch(e){t=e.message}await new Promise(r=>setTimeout(r,30));
  return {t,txt:document.getElementById('app').innerText.includes('لم نتمكّن من فتح'),d:Router.depth()}});
 check('شاشة غير مسجّلة: حالة خطأ فيها إعادة محاولة لا شاشة بيضاء ولا استثناء',!ghost.t&&ghost.txt,JSON.stringify(ghost));

 // ── ع) الشريط السفلي مالكه واحد ──
 const barOwn=await page.evaluate(async()=>{tab('clubs');push('clCreateScr');const a=getComputedStyle(document.getElementById('nav')).display;back(true);const b=getComputedStyle(document.getElementById('nav')).display;return {a,b}});
 check('الشريط يختفي في شاشات النادي الكاملة ويعود بالرجوع — من السجلّ لا من الشاشة',barOwn.a==='none'&&barOwn.b==='flex',JSON.stringify(barOwn));
 const src=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
 const direct=(src.match(/\$\('nav'\)\.style\.display/g)||[]).length;
 check('لا كتابة مباشرة على الشريط السفلي خارج النواة (كانت ١٢)',direct===0,direct);
 check('لا شريط علوي بوجهة مكتوبة يدويًا (كانت ١٧)',!/tb\('[^']*',["']/.test(src));

 // ── ف) لا شاشة مسجّلة تُرسم باستدعاء مباشر من زر — الاستدعاء المباشر يتجاوز المكدّس فيختفي زرّ الرجوع ──
 const regNames=await page.evaluate(()=>Router.names());
 const directScr=regNames.filter(n=>new RegExp(`onclick="${n}\\(\\)"|'${n}\\(\\)'`).test(src));
 check('كل شاشة مسجّلة تُفتح بـ push لا باستدعاء مباشر (كانت «مباراة سريعة»)',directScr.length===0,directScr.join());
 const qk=await page.evaluate(async()=>{tab('play');
  const row=[...document.querySelectorAll('#app .plRow')].find(b=>b.innerText.includes('مباراة سريعة'));if(!row)return {row:false};
  row.click();await new Promise(r=>setTimeout(r,450));
  const bk=[...document.querySelectorAll('#app .tbar .bk')].some(e=>e.offsetWidth>=44&&e.offsetHeight>=44);   // شاشة خارجة قد تبقى في الشجرة أثناء الحركة
  const d=Router.depth(),cur=Router.current().fn;
  back(true);await new Promise(r=>setTimeout(r,30));
  return {row:true,d,cur,bk,after:Router.current().fn}});
 check('صف «مباراة سريعة» في تبويب اللعب يفتح الشاشة بزرّ رجوع ويعيدك إلى الجذر',qk.row&&qk.d===2&&qk.cur==='quickScr'&&qk.bk&&qk.after==='playScr',JSON.stringify(qk));

 check('صفر أخطاء JS طوال الاختبار',errs.length===0,errs.slice(0,3).join(' | '));
 console.log('\n'+(fail?`✗ ${fail} فشل / ${pass} نجح`:`قبول التنقّل ✔ (${pass} فحصًا)`));
 await b.close();srv.close();process.exit(fail?1:0);
})();
