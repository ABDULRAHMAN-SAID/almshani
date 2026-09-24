/**
 * حالات الشاشات المشتركة بين أدوات الفحص: كل حالة اسم وشيفرة تُنفَّذ في الصفحة.
 * يقرؤها zahf (qa-crawl) وفحص الوصول على الهاتف (audit-reach) فلا تفترق القائمتان.
 */
const R=(code)=>code;
module.exports=[
 // ── الترحيب والتعليم ──
 ['welcomeScr',R("Router.reset('welcomeScr')")],
 ['askTut',R("Router.reset('welcomeScr');push('askTut')")],
 ...[0,1,2,3,4].map(i=>[`tutorial-${i}`,R(`Router.reset('welcomeScr');tutStart();T2.i=${i};tDraw()`)]),
 ['tDone',R("Router.reset('welcomeScr');tutStart();tDone()")],
 ['skipAsk',R("Router.reset('welcomeScr');tutStart();push('skipAsk')")],
 // ── العب ──
 ['playScr',R("tab('play')")],
 ['gamesScr',R("tab('play');push('gamesScr')")],
 ['playerCard',R("tab('play');pcOpen('p0123456789ab','نورة',{skin:2,hair:3,hairStyle:1,eyes:0,mouth:2,acc:0,beard:0,bg:1})")],
 ['dmScr',R("tab('play');dmOpen('p0123456789ab','نورة')")],
 ['friendsScr',R("tab('play');push('friendsScr')")],
 ['recScr',R("tab('more');recOpen()")],
 ['authScr',R("Router.reset('authScr')")],
 ['authScr-err',R("Router.reset('authScr');setTimeout(()=>{document.getElementById('auMail').value='لا';auGo()},80)")],
 ['xferScr',R("push('xferScr')")],
 ['xferShow',R("XF.code='K7M3PQR9';XF.exp=Date.now()+600000;push('xferShow')")],
 ['chalScr',R("tab('play');push('chalScr')")],
 ['chalList',R("tab('play');CH.list=[{id:'c1',mine:false,done:false,withName:'نورة',qs:['a'],myScore:null,theirScore:2200,at:Date.now(),won:null,seen:false},{id:'c2',mine:true,done:true,withName:'خالد',qs:['a'],myScore:1900,theirScore:1400,at:Date.now(),won:'me',seen:true}];push('chalScr')")],
 ['recCode',R("tab('more');recOpen();setTimeout(()=>{REC.sent=1;REC.mask='s****d@mail.com';recScr()},200)")],
 ['rmInvite',R("tab('play');RM.code='ABCD';RM.game='uno';RM.host=1;RM.solo=0;push('roomScr','uno');setTimeout(()=>{try{rmInvite()}catch(e){}},300)")],
 ['knBot',R("push('rankedScr');knBot(58)")],
 ['playModesScr',R("push('playModesScr')")],
 ...['carrom','uno','knowledge'].map(g=>[`gameHub-${g}`,R(`push('gameHub','${g}')`)]),
 ...['knowledge','carrom','uno'].map(g=>[`gameRankScr-${g}`,R(`push('gameRankScr','${g}')`)]),
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
 ['rewardScr-chest',R("tab('shop');push('rewardScr',{title:'صندوق المنافس',chest:'rival',list:[{t:'coins',v:240},{t:'skc',k:'ruby',v:4},{t:'gems',v:3}]})")],
 ['rewardScr-sum',R("tab('shop');push('rewardScr',{title:'صندوق المعرفة',list:[{t:'coins',v:120},{t:'skc',k:'blue',v:3}]});setTimeout(()=>revealAll(),150)")],
 // ── الكؤوس والساحات (٦٫٩٣) ──
 ['arenaScr',R("tab('play');S.tro={tr:740,best:760,gate:2,w:31,l:19,claimed:[100,200,300],season:trSeasonKey(),up:2};push('arenaScr')")],
 ['arenaScr-new',R("tab('play');S.tro=null;push('arenaScr')")],
 ['ch12Scr',R("tab('play');S.ch12={act:1,w:4,l:1,claimed:0,best:4,runs:1,free:0};push('ch12Scr')")],
 ['ch12Scr-new',R("tab('play');S.ch12=null;push('ch12Scr')")],
 ['arenaUp',R("tab('play');S.tro={tr:1010,best:1010,gate:3,w:40,l:22,claimed:[],season:trSeasonKey(),up:2};arenaUpFx(3)")],
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
 ['carrom-cancel',R("push('gameHub','carrom');RM.caN=2;soloStart('carrom','mid');await qaWait(700);_ca.sx=200;_ca.sxV=200;_ca.drag={sx:200,sy:361.5,px:200,py:380,dx:0,dy:95,cancel:true};caRender()")],
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
 // ── مافيا ──
 // ── مسابقة الرسم ──
 // ── ألعاب الجلسة: لو خيروك ──
 // ── ضد الكمبيوتر: مافيا وبرا السالفة والرسم ──
 // ── أوراق وحوارات ──
 ['paySheet',R("tab('shop');paySheet('season_pass')")],
 ['confirmSheet',R("tab('more');confirmSheet('حذف الحساب','سيُمحى كل شيء.','احذف',()=>{})")],
 ['toast',R("tab('play');toast('حُفظ الاسم')")],
];
