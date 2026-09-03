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
const CAPTURES=[
 // ── الترحيب والتعليم ──
 ['welcomeScr',R("Router.reset('welcomeScr')")],
 ['askTut',R("Router.reset('welcomeScr');push('askTut')")],
 ...[0,1,2,3,4].map(i=>[`tutorial-${i}`,R(`Router.reset('welcomeScr');tutStart();T2.i=${i};tDraw()`)]),
 ['tDone',R("Router.reset('welcomeScr');tutStart();tDone()")],
 ['skipAsk',R("Router.reset('welcomeScr');tutStart();push('skipAsk')")],
 // ── العب ──
 ['playScr',R("tab('play')")],
 ['playModesScr',R("push('playModesScr')")],
 ['partyScr',R("push('partyScr')")],
 ...['carrom','uno','mafia','draw','barra'].map(g=>[`gameHub-${g}`,R(`push('gameHub','${g}')`)]),
 ...['knowledge','carrom','uno','mafia','drawing','outsider'].map(g=>[`gameRankScr-${g}`,R(`push('gameRankScr','${g}')`)]),
 ['rankGuideScr-placed',R("const p=rankOf('carrom');p.placed=true;p.tier=5;p.div=1;p.rp=40;push('rankGuideScr','carrom')")],
 ['rankGuideScr-unplaced',R("rankOf('knowledge').placed=false;push('rankGuideScr','knowledge')")],
 ['rankedScr-unplaced',R("rankOf('knowledge').placed=false;push('rankedScr')")],
 ['rankedScr-placed',R("const p=rankOf('knowledge');p.placed=true;p.tier=4;p.div=2;p.rp=64;push('rankedScr')")],
 ['evtScr',R("push('evtScr')")],['seasonScr',R("push('seasonScr')")],['misScr',R("push('misScr')")],['achScr',R("push('achScr')")],
 ['storeScr',R("push('storeScr')")],['lbScr',R("push('lbScr')")],['quickScr',R("push('quickScr')")],['netsScr',R("push('netsScr')")],
 ...['general','arab','football','religion','animals','science','geography','puzzles'].map(n=>[`mapScr-${n}`,R(`push('netsScr');push('mapScr','${n}')`)]),
 ['mapScr-unknown',R("push('netsScr');push('mapScr','nope')")],
 ['home',R("Router.reset('home')")],
 // ── المزيد ──
 ['moreScr',R("tab('more')")],['setScr',R("tab('more');push('setScr')")],
 ['setSection-account',R("tab('more');push('setScr');push('setSection','account')")],
 ['setSection-game',R("tab('more');push('setScr');push('setSection','game')")],
 ['setSection-sound',R("tab('more');push('setScr');push('setSection','sound')")],
 ['setSection-all',R("tab('more');push('setScr');const ks=SETS.map(s=>s.k);window.__setKeys=ks;push('setSection',ks[ks.length-1])")],
 ['avScr',R("tab('more');push('avScr')")],['renameAsk',R("tab('more');push('renameAsk')")],['delAsk',R("tab('more');push('delAsk')")],
 ['profScr',R("tab('more');push('profScr')")],['profileView-rival',R("push('profileView',rivalProfile('سالم',{mmrHint:1400}))")],
 // ── البطاقات ──
 ['cardsScr',R("tab('cards')")],
 ...['read','learn','watch','try'].map(t=>[`cardDetail-${t}`,R(`tab('cards');cdTab='${t}';push('cardDetail',+Object.keys(S.cards.owned)[0])`)]),
 ['cardLevels',R("tab('cards');push('cardLevels',+Object.keys(S.cards.owned)[0])")],
 ['levelDetail',R("tab('cards');push('levelDetail',{id:+Object.keys(S.cards.owned)[0],lv:3})")],
 ['deckScr',R("tab('cards');push('deckScr')")],
 ...[0,2,4].map(i=>[`drawLesson-${i}`,R(`tab('cards');_lsn=${i};push('drawLesson')`)]),
 ['tryCard',R("tab('cards');push('tryCard',+Object.keys(S.cards.owned)[0])")],
 // ── المتجر ──
 ['shopScr',R("tab('shop')")],
 ['chestScr-all',R("tab('shop');const ks=Object.keys(ECON.chests);window.__chestKeys=ks;push('chestScr',ks[0])")],
 ['chestScr-2',R("tab('shop');push('chestScr',Object.keys(ECON.chests)[1])")],
 ['chestScr-last',R("tab('shop');const ks=Object.keys(ECON.chests);push('chestScr',ks[ks.length-1])")],
 ['oddsScr',R("tab('shop');push('oddsScr',Object.keys(ECON.chests)[0])")],
 ['rewardScr',R("tab('shop');push('rewardScr',{title:'صندوق المعرفة',list:[{t:'coins',v:120},{t:'frag',id:CARDS[0].id,v:3},{t:'gems',v:5}]})")],
 ['rewardScr-empty',R("tab('shop');push('rewardScr',{title:'مكافآت',list:[]})")],
 ['wildScr',R("tab('shop');push('wildScr')")],['evoShopScr',R("tab('shop');push('evoShopScr')")],
 ...['all','own','locked','fav','deck'].map(t=>[`emoteScr-${t}`,R(`tab('more');emTab='${t}';push('emoteScr')`)]),
 ['colScr',R("tab('more');push('colScr')")],
 // ── النادي ──
 ['clSearchScr-noclan',R("S.clan=null;tab('clubs')")],
 ['clCreateScr',R("S.clan=null;tab('clubs');push('clCreateScr')")],
 ['clubHome',R("qaClan();tab('clubs')")],
 ...['clMembersScr','clInfoScr','clChatScr','clDonorsScr','clSupportScr','clRequestSupportScr','clRequestsScr','clAdminLogScr','clAchScr','clSettingsScr','clEditIdentityScr','clEditJoinScr','clEditPermsScr','clRanksScr','clMyNotifScr','clBannedScr','clTransferScr','clSearchScr','clEventsScr','clMoreScr']
  .map(n=>[n,R(`qaClan();tab('clubs');push('${n}')`)]),
 ['clMemberScr',R("qaClan();tab('clubs');push('clMemberScr',Object.keys(S.clan.mem).find(u=>u!==S.uid))")],
 // ── الغرف والبحث (بلا ناقل: شاشات البديل) ──
 ['mmScr-nocap',R("push('gameHub','uno');push('mmScr',{g:'uno',mode:'casual'})")],
 ['roomScr-nocap',R("push('gameHub','carrom');push('roomScr','carrom')")],
 ['soloScr-carrom',R("push('gameHub','carrom');push('soloScr','carrom')")],
 ['soloScr-uno',R("push('gameHub','uno');push('soloScr','uno')")],
 // ── مباريات الكمبيوتر ──
 ['carrom-2p',R("push('gameHub','carrom');RM.caN=2;soloStart('carrom','mid');await qaWait(500)")],
 ['carrom-shot',R("push('gameHub','carrom');RM.caN=2;soloStart('carrom','mid');await qaWait(400);caPlay({x:200,y:360,vx:-1.5,vy:-6});await qaWait(350)")],
 ['carrom-aim',R("push('gameHub','carrom');RM.caN=2;soloStart('carrom','mid');await qaWait(700);_ca.sx=200;_ca.sxV=200;_ca.drag={sx:200,sy:361.5,px:200,py:380,dx:40,dy:70,cancel:false};caRender()")],
 ['carrom-back',R("push('gameHub','carrom');RM.caN=2;soloStart('carrom','mid');await qaWait(700);_ca.sx=200;_ca.sxV=200;_ca.drag={sx:200,sy:361.5,px:200,py:380,dx:20,dy:-40,cancel:false,back:true};caRender()")],
 ['carrom-cancel',R("push('gameHub','carrom');RM.caN=2;soloStart('carrom','mid');await qaWait(700);_ca.sx=200;_ca.sxV=200;_ca.drag={sx:200,sy:361.5,px:200,py:380,dx:10,dy:-60,cancel:true};caRender()")],
 ['carrom-4p',R("push('gameHub','carrom');RM.caN=4;soloStart('carrom','hard');await qaWait(500)")],
 ['uno-deal',R("push('gameHub','uno');RM.bots=1;soloStart('uno','mid');await qaWait(900)")],
 ['uno-lot',R("push('gameHub','uno');RM.bots=3;soloStart('uno','hard');await qaWait(5400)")],
 ['uno-2p',R("push('gameHub','uno');RM.bots=1;soloStart('uno','mid');await qaWait(600);unoIntroSkip()")],
 ['uno-4p',R("push('gameHub','uno');RM.bots=3;soloStart('uno','hard');await qaWait(600);unoIntroSkip()")],
 ['uno-call',R("push('gameHub','uno');RM.bots=1;soloStart('uno','mid');await qaWait(600);unoIntroSkip();await qaWait(200);RM.uno.call={p:RM.me,said:false};roomDraw()")],
 ['uno-catch',R("push('gameHub','uno');RM.bots=1;soloStart('uno','mid');await qaWait(600);unoIntroSkip();await qaWait(200);RM.uno.call={p:'bot0',said:false};roomDraw()")],
 ['uno-tip',R("push('gameHub','uno');RM.bots=1;soloStart('uno','mid');await qaWait(600);unoIntroSkip();unoHint(0)")],
 ['room-leave-confirm',R("push('gameHub','carrom');RM.caN=2;soloStart('carrom','mid');await qaWait(400);back()")],
 // ── مباراة المعرفة ──
 ['matchIntro',R("push('rankedScr');matchIntro()")],
 ['match-quick',R("push('rankedScr');startRanked()")],
 ...['odd','timeline','belongs','link','story','reveal','map','match','estimate','twostage','bell','chain','auction','duel','reverse'].map(k=>[`match-${k}`,R(`push('rankedScr');startRanked();M.rounds=['${k}','quick'];M.i=0;mRound()`)]),
 ['match-menu',R("push('rankedScr');startRanked();toggleMenu()")],
 ['match-quitAsk',R("push('rankedScr');startRanked();quitMatch()")],
 ['mResult-win',R("push('rankedScr');const res=resolveMatch({gameId:'knowledge',mode:'ranked',matchId:'qa'+Date.now(),result:{won:true},opponents:[{mmr:1000}]});M={log:[{ok:1},{ok:1},{ok:0},{ok:1}],rival:RIVALS[0],me:3,opp:1};Router.enter('mResult',[res,true,120,40,3],{replace:true});mResult(res,true,120,40,3)")],
 ['mResult-loss',R("push('rankedScr');const res=resolveMatch({gameId:'knowledge',mode:'ranked',matchId:'qb'+Date.now(),result:{won:false},opponents:[{mmr:1000}]});M={log:[{ok:0},{ok:1},{ok:0},{ok:0}],rival:RIVALS[1],me:1,opp:3};Router.enter('mResult',[res,false,30,10,0],{replace:true});mResult(res,false,30,10,0)")],
 // ── جولة الأسئلة القديمة ──
 ['quiz-draw',R("push('quickScr');vsScr()")],
 ['quiz-answered',R("push('quickScr');vsScr();ansr('0')")],
 ['quiz-done',R("push('quickScr');vsScr();G.i=G.qs.length-1;G.pts=1200;G.ok=7;done()")],
 ['quiz-exit-confirm',R("push('quickScr');vsScr();back()")],
 // ── ليلة العائلة: برا السالفة ──
 ['barraSetup',R("push('partyScr');ptWay='pass';ptOpen('barra')")],
 ['barra-deal-hidden',R("push('partyScr');ptWay='pass';ptOpen('barra');barraStart()")],
 ['barra-deal-word',R("push('partyScr');ptWay='pass';ptOpen('barra');barraStart();PT.spy=99;PT.shown=true;barraDeal()")],
 ['barra-deal-spy',R("push('partyScr');ptWay='pass';ptOpen('barra');barraStart();PT.spy=0;PT.shown=true;barraDeal()")],
 ['barra-talk',R("push('partyScr');ptWay='pass';ptOpen('barra');barraStart();barraTalk()")],
 ['barra-vote',R("push('partyScr');ptWay='pass';ptOpen('barra');barraStart();barraVote()")],
 ['barra-end',R("push('partyScr');ptWay='pass';ptOpen('barra');barraStart();barraEnd(PT.spy)")],
 ['party-exit-confirm',R("push('partyScr');ptWay='pass';ptOpen('barra');barraStart();back()")],
 // ── مافيا ──
 ['mafiaSetup',R("push('partyScr');ptWay='pass';ptOpen('mafia')")],
 ['mafia-deal-hidden',R("push('partyScr');ptWay='pass';ptOpen('mafia');mafiaStart()")],
 ['mafia-deal-role',R("push('partyScr');ptWay='pass';ptOpen('mafia');mafiaStart();PT.shown=true;mafiaDeal()")],
 ['mafia-gate',R("push('partyScr');ptWay='pass';ptOpen('mafia');mafiaStart();PT.idx=PT.n;mafiaDeal()")],
 ['mafia-pick',R("push('partyScr');ptWay='pass';ptOpen('mafia');mafiaStart();mafPick('من تغتالون الليلة؟','mafKill')")],
 ['mafia-check',R("push('partyScr');ptWay='pass';ptOpen('mafia');mafiaStart();mafCheck(0)")],
 ['mafia-morning',R("push('partyScr');ptWay='pass';ptOpen('mafia');mafiaStart();PT.victim=1;PT.saved=2;mafiaMorning()")],
 ['mafia-lynch',R("push('partyScr');ptWay='pass';ptOpen('mafia');mafiaStart();PT.roles=['شعب','شعب','مافيا','طبيب','محقق','شعب'];mafLynch(0)")],
 ['mafia-end',R("push('partyScr');ptWay='pass';ptOpen('mafia');mafiaStart();PT.alive=PT.alive.filter(i=>PT.roles[i]!=='مافيا');mafWinCheck()")],
 // ── مسابقة الرسم ──
 ['drawSetup',R("push('partyScr');ptWay='pass';ptOpen('draw')")],
 ['draw-pass',R("push('partyScr');ptWay='pass';ptOpen('draw');drawStart()")],
 ['draw-board',R("push('partyScr');ptWay='pass';ptOpen('draw');drawStart();drawBoard()")],
 ['draw-vote',R("push('partyScr');ptWay='pass';ptOpen('draw');drawStart();PT.imgs=[qaImg('#E24B4A'),qaImg('#2ECC71'),qaImg('#378ADD')];PT.idx=PT.n;drawVote()")],
 ['draw-end',R("push('partyScr');ptWay='pass';ptOpen('draw');drawStart();PT.imgs=[qaImg('#E24B4A'),qaImg('#2ECC71'),qaImg('#378ADD')];PT.votes=[2,1,0];drawEnd()")],
 // ── ضد الكمبيوتر: مافيا وبرا السالفة والرسم ──
 ...['mafia','barra','draw'].map(g=>[`soloScr-${g}`,R(`push('gameHub','${g}');push('soloScr','${g}')`)]),
 ['mf-intro',R("window.__vbFast=1;RM.mbN=6;soloStart('mafia','mid')")],
 ['mf-night',R("window.__vbFast=1;RM.mbN=6;soloStart('mafia','mid');VB.roles[0]='مافيا';VB.roles[1]='شعب';mfNight()")],
 ['mf-talk',R("window.__vbFast=1;RM.mbN=6;soloStart('mafia','mid');VB.roles[0]='شعب';VB.roles[1]='محقق';VB.roles[2]='مافيا';VB.know[2]=true;mfTalk()")],
 ['mf-vote',R("window.__vbFast=1;RM.mbN=6;soloStart('mafia','mid');VB.roles[0]='شعب';mfVote()")],
 ['mf-end',R("window.__vbFast=1;RM.mbN=6;soloStart('mafia','mid');VB.roles[0]='شعب';mfEnd('city')")],
 ['br-round',R("window.__vbFast=1;RM.bbN=5;RM.bbCat='أماكن';soloStart('barra','mid');VB.spy=1;brRound()")],
 ['br-ask',R("window.__vbFast=1;RM.bbN=5;RM.bbCat='مهن';soloStart('barra','mid');VB.spy=2;VB.round=2;brAsk()")],
 ['br-final',R("window.__vbFast=1;RM.bbN=5;RM.bbCat='حيوانات';soloStart('barra','mid');VB.spy=1;VB.cast=[{who:0,t:1},{who:1,t:3},{who:2,t:1},{who:3,t:1},{who:4,t:2}];VB.accused=1;brFinal('caught')")],
 ['db-round',R("soloStart('draw','mid');VB.t0=performance.now()-6000")],
 ['db-end',R("soloStart('draw','mid');VB.res=[{w:'بيت',pts:88},{w:'شمس',pts:61},{w:'قطة',pts:0},{w:'سمكة',pts:74},{w:'قلب',pts:40},{w:'ساعة',pts:92}];VB.total=355;VB.i=6;dbEnd()")],
 // ── أوراق وحوارات ──
 ['paySheet',R("tab('shop');paySheet('season_pass')")],
 ['confirmSheet',R("tab('more');confirmSheet('حذف الحساب','سيُمحى كل شيء.','احذف',()=>{})")],
 ['toast',R("tab('play');toast('حُفظ الاسم')")],
];

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
   const tiny=[...app.querySelectorAll('button,[onclick],a,.fc,.nvi')].filter(el=>vis(el)&&!el.closest('[onclick] [onclick]')).filter(el=>{const r=el.getBoundingClientRect();return r.width<34||r.height<34}).map(el=>{const r=el.getBoundingClientRect();return `${(el.innerText||el.className||el.tagName).toString().trim().slice(0,16)}(${Math.round(r.width)}×${Math.round(r.height)})`});
   const ALLOW=new Set(['Google','Play','App','Store','I','II','III','iOS','Android','MMR','SOLO']);
   const latin=[...new Set((document.body.innerText.match(/[A-Za-z][A-Za-z']{2,}/g)||[]).filter(w=>!ALLOW.has(w)))].slice(0,8);
   const imgs=[...app.querySelectorAll('img')].filter(i=>i.complete&&i.naturalWidth===0).length;
   const txt=app.innerText.replace(/\s+/g,' ').trim();
   return {textLen:txt.length,overflowX:document.documentElement.scrollWidth>vw+1,pageH:document.documentElement.scrollHeight,
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
 const bad=rows.filter(r=>r.fail||r.errs.length||r.errorBox||r.textLen<40||r.overflowX);
 console.log(`\nتمّ: ${rows.length} حالة · مشاكل صريحة: ${bad.length} · أداء: ${JSON.stringify(perf)}`);
 bad.forEach(r=>console.log(`  ✗ ${r.name}: ${r.fail||''} ${r.errs.join(' | ')} ${r.errorBox?'errorBox':''} ${r.textLen<40?'blank':''} ${r.overflowX?'overflowX':''}`));
})().catch(e=>{console.error(e);process.exit(1)});
