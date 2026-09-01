/**
 * نواة التصنيف — مشتركة بين العميل والخادم.
 *
 * لا DOM ولا حالة عامّة: كل دالّة تأخذ ملفّ التصنيف وتعيده معدَّلًا.
 * الخادم يشغّل هذه الوحدة نفسها ليحسب النقاط، فلا يوجد «حساب على العميل»
 * مختلف عن «حساب على الخادم» — نصّ واحد في المكانين.
 *
 * المبدأ: مهارة الكيرم ليست مهارة المعرفة. لكل لعبة ملفّ تصنيف خاصّ بها،
 * ولكلٍّ نموذج حساب يناسب طبيعتها، والموسم واحد يجمعها كلّها.
 */
var RankCore=(function(){
 'use strict';
 var TIERS=[
  {k:'bronze',n:'Bronze',ar:'برونزي',c:'#CD7F32',div:3,t:15,opt:[4,4]},
  {k:'silver',n:'Silver',ar:'فضي',c:'#C0C8D4',div:3,t:14,opt:[4,5]},
  {k:'gold',n:'Gold',ar:'ذهبي',c:'#E8B23A',div:3,t:13,opt:[5,5]},
  {k:'platinum',n:'Platinum',ar:'بلاتيني',c:'#5DCAA5',div:3,t:12,opt:[5,5]},
  {k:'diamond',n:'Diamond',ar:'ماسي',c:'#5AC8F5',div:3,t:11,opt:[5,6]},
  {k:'master',n:'Master',ar:'محترف',c:'#B76CF0',div:3,t:11,opt:[6,6]},
  {k:'grandmaster',n:'Grandmaster',ar:'نخبة',c:'#8B3FD9',div:3,t:10,opt:[6,6]},
  {k:'champion',n:'Champion',ar:'بطل',c:'#E24B4A',div:3,t:9,opt:[6,6]},
  {k:'mythic',n:'Mythic',ar:'أسطوري',c:'#FF6B9D',div:3,t:9,opt:[6,6]},
  {k:'legend',n:'Legend',ar:'قمة الأساطير',c:'#FFD700',div:0,t:8,opt:[6,6]}
 ];
 var RP_PER_DIV=100;
 /** موسم واحد عالمي، ورتبة مستقلّة لكل لعبة داخله */
 var SEASON_ID=4;
 /** معرّفات الألعاب إنجليزية — لا يُستخدم الاسم العربي مفتاحًا للتخزين */
 var GAMES=['knowledge','carrom','uno','mafia','drawing','outsider'];
 /** تعريف كل لعبة — scoreModel يحدّد كيف تتحوّل نتيجة المباراة إلى نقاط تصنيف */
 var GAME_DEFS=[
  {id:'knowledge',ar:'عالم المعرفة',icon:'bulb',rmKey:null,
   desc:'سبع جولات بأنماط متغيّرة — أسرع وأدقّ يفوز.',
   scoreModel:'winLoss',   ranked:1,casual:1,room:0,bot:0,pass:0,minP:2,maxP:2,status:'live'},
  {id:'carrom',   ar:'كيرم',        icon:'ball',rmKey:'carrom',
   desc:'صوّب وأسقط قطعك قبل خصمك.',
   scoreModel:'winLoss',   ranked:1,casual:1,room:1,bot:1,pass:0,minP:2,maxP:4,status:'live'},
  {id:'uno',      ar:'أونو',        icon:'cards',rmKey:'uno',
   desc:'تخلّص من بطاقاتك قبل الجميع.',
   scoreModel:'placement', ranked:1,casual:1,room:1,bot:1,pass:0,minP:2,maxP:4,status:'live'},
  {id:'mafia',    ar:'مافيا',       icon:'user',rmKey:'mafia',
   desc:'مدينة نائمة ومافيا تصطاد — التطبيق هو الراوي.',
   scoreModel:'teamResult',ranked:1,casual:1,room:1,bot:0,pass:1,minP:5,maxP:12,status:'live'},
  {id:'drawing',  ar:'مسابقة الرسم',icon:'palette',rmKey:'draw',
   desc:'كلمة واحدة والكلّ يرسم — صوّتوا لأفضل لوحة.',
   scoreModel:'placement', ranked:1,casual:1,room:1,bot:0,pass:1,minP:3,maxP:10,status:'live'},
  {id:'outsider', ar:'برا السالفة', icon:'bulb',rmKey:'barra',
   desc:'الكلّ يعرف الكلمة إلا واحدًا — اكشفوه بالأسئلة.',
   scoreModel:'roundsAggregate',ranked:1,casual:1,room:1,bot:0,pass:1,minP:3,maxP:8,status:'live'}
 ];
 function gameDef(id){for(var i=0;i<GAME_DEFS.length;i++)if(GAME_DEFS[i].id===id)return GAME_DEFS[i];return null}

 function newRankProfile(gameId){
  return {gameId:gameId,seasonId:SEASON_ID,
   placed:false,placementDone:0,placementWins:0,
   tier:0,div:3,rp:0,mmr:1000,protect:0,
   seasonBest:{tier:0,div:3},
   wins:0,losses:0,gamesPlayed:0,winStreak:0,bestStreak:0,
   masteryXp:0,lastPlayedAt:0,seen:[]};
 }
 function tierOf(p){return TIERS[Math.min(p.tier|0,TIERS.length-1)]}
 /** اسم الرتبة كما يراه اللاعب: عربي بأرقام رومانية — سياسة واحدة في المشروع كلّه */
 function rankName(p){
  var t=tierOf(p);
  return t.div===0 ? t.ar : t.ar+' '+['','I','II','III'][p.div];
 }
 /** الإتقان يعكس الوقت والإنجاز، والرتبة تعكس المهارة — لا يُخلطان */
 function masteryLevel(xp){return Math.max(1,Math.floor(Math.sqrt((xp||0)/40))+1)}
 /** الشكل الذي تصفه المواصفة — للواجهة والتوثيق، لا للتخزين */
 function rankView(p){
  return {gameId:p.gameId,seasonId:p.seasonId,
   visibleTier:p.tier,division:p.div,rankPoints:p.rp,hiddenMMR:p.mmr,
   peakTier:p.seasonBest.tier,peakDivision:p.seasonBest.div,
   wins:p.wins,losses:p.losses,gamesPlayed:p.gamesPlayed,winStreak:p.winStreak,
   placementMatchesRemaining:Math.max(0,5-p.placementDone),
   masteryLevel:masteryLevel(p.masteryXp),unranked:!p.placed};
 }

 /* ═══ الأوضاع: من يمنح نقاط تصنيف ومن لا يمنح ═══
    قاعدة ثابتة لا استثناء لها: الغرف الخاصة والكمبيوتر والعادي والتمرير
    لا تمنح نقاط تصنيف إطلاقًا، حتى لا يصنع أحد حسابين ويجمع رتبة. */
 var MODES_ALL=['ranked','casual','room','bot','pass','training'];
 function grantsRP(mode){return mode==='ranked'}
 var MASTERY_XP={ranked:12,casual:7,room:5,pass:5,bot:3,training:2};

 /* ═══ نماذج الحساب — لكل لعبة ما يناسبها ═══ */
 function scoreWinLoss(res){return {won:!!res.won,strength:res.won?1:0}}
 function scorePlacement(res){
  var n=Math.max(2,res.total|0),p=Math.min(n,Math.max(1,res.place|0));
  var norm=(n-p)/(n-1);
  return {won:p===1,strength:norm};
 }
 function scoreTeam(res){
  var s=res.teamWon?1:0;
  if(res.left)s-=0.5; else if(res.completed)s+=0.05;
  return {won:!!res.teamWon&&!res.left,strength:Math.max(0,Math.min(1,s))};
 }
 function scoreRounds(res){
  var n=Math.max(1,res.rounds|0),w=Math.max(0,Math.min(n,res.roundsWon|0));
  var r=w/n;
  return {won:r>0.5,strength:r};
 }
 var SCORE_MODELS={winLoss:scoreWinLoss,placement:scorePlacement,teamResult:scoreTeam,roundsAggregate:scoreRounds};

 function mmrDelta(myMmr,oppMmr,won){
  var exp=1/(1+Math.pow(10,(oppMmr-myMmr)/400));
  return Math.round(32*((won?1:0)-exp));
 }
 /** نقاط التصنيف من قوّة النتيجة وفرق المهارة — مدى واحد لكل الألعاب */
 function rpFromStrength(strength,myMmr,oppMmr){
  var base=Math.round(-20+strength*44);
  var diff=(oppMmr-myMmr)/150;
  var adj=Math.round(Math.max(-1,Math.min(1,diff))*(base>=0?4:-4));
  return Math.max(-28,Math.min(30,base+adj));
 }

 /**
  * النقطة الوحيدة التي تمنح أو تخصم نقاط تصنيف — على العميل والخادم سواء.
  *   resolve(profile, {gameId, mode, matchId, result, opponents}, now)
  * result يتبع scoreModel اللعبة:
  *   winLoss {won} · placement {place,total} · teamResult {teamWon,completed,left} · roundsAggregate {roundsWon,rounds}
  */
 function resolve(p,o,now){
  o=o||{};
  var def=gameDef(o.gameId);
  var out={applied:false,rp:0,mmr:0,promoted:false,demoted:false,
   protected:false,placement:false,mastery:0,oldName:'',newName:'',reason:''};
  if(!def){out.reason='لعبة غير معروفة';return out}
  if(def.status!=='live'){out.reason='اللعبة غير متاحة الآن';return out}
  if(!p){out.reason='لا ملفّ تصنيف';return out}
  var mode=MODES_ALL.indexOf(o.mode)>=0?o.mode:'casual';

  // النتيجة الواحدة لا تُحتسب مرّتين مهما تكرّر بثّها
  var mid=o.matchId?String(o.matchId):null;
  if(mid){
   if(!p.seen)p.seen=[];
   if(p.seen.indexOf(mid)>=0){out.reason='نتيجة مكرّرة';return out}
   p.seen.push(mid);
   if(p.seen.length>24)p.seen.splice(0,p.seen.length-24);
  }

  var model=SCORE_MODELS[def.scoreModel]||scoreWinLoss;
  var sc=model(o.result||{});
  p.gamesPlayed++;
  p.lastPlayedAt=(typeof now==='number')?now:Date.now();
  p.masteryXp+=(MASTERY_XP[mode]||3);
  out.mastery=MASTERY_XP[mode]||3;
  out.applied=true;

  if(!grantsRP(mode)){out.reason='وضع لا يمنح نقاط تصنيف';return out}

  var opps=(o.opponents||[]).map(function(x){return (x&&typeof x.mmr==='number')?x.mmr:1000});
  var oppMmr=opps.length?Math.round(opps.reduce(function(a,b){return a+b},0)/opps.length):1000;

  out.oldName=rankName(p);
  if(sc.won)p.wins++;else p.losses++;
  p.winStreak=sc.won?p.winStreak+1:0;
  if(p.winStreak>p.bestStreak)p.bestStreak=p.winStreak;

  var dm=mmrDelta(p.mmr,oppMmr,sc.won?1:0);
  p.mmr+=dm;out.mmr=dm;

  // مباريات تحديد المستوى — لا نقاط قبل أن تُعرف رتبتك
  if(!p.placed){
   p.placementDone++;if(sc.won)p.placementWins++;
   out.placement=true;
   if(p.placementDone>=5){
    p.placed=true;
    var w=p.placementWins;
    if(w>=5){p.tier=2;p.div=2}
    else if(w===4){p.tier=2;p.div=3}
    else if(w===3){p.tier=1;p.div=1}
    else if(w===2){p.tier=1;p.div=3}
    else if(w===1){p.tier=0;p.div=1}
    else {p.tier=0;p.div=3}
    p.rp=0;p.protect=1;
    p.seasonBest={tier:p.tier,div:p.div};
   }
   out.newName=rankName(p);
   out.rpGain=out.rp;out.oldLabel=out.oldName;out.newLabel=out.newName;
   return out;
  }

  var d=rpFromStrength(sc.strength,p.mmr,oppMmr);
  out.rp=d;p.rp+=d;

  while(p.rp>=RP_PER_DIV){
   if(p.tier>=TIERS.length-1){p.rp=RP_PER_DIV;break}
   p.rp-=RP_PER_DIV;
   if(p.div>1)p.div--;
   else{p.tier++;p.div=tierOf(p).div===0?0:3}
   out.promoted=true;p.protect=1;
  }
  while(p.rp<0){
   if(p.protect>0){p.protect--;p.rp=0;out.protected=true;break}
   if(p.tier===0&&p.div===3){p.rp=0;break}
   p.rp+=RP_PER_DIV;
   if(p.div<3&&tierOf(p).div!==0)p.div++;
   else{p.tier--;p.div=1}
   out.demoted=true;
  }
  var cur=p.tier*10+(4-p.div),best=p.seasonBest.tier*10+(4-p.seasonBest.div);
  if(cur>best)p.seasonBest={tier:p.tier,div:p.div};
  out.newName=rankName(p);
  out.rpGain=out.rp;out.oldLabel=out.oldName;out.newLabel=out.newName;
  return out;
 }

 /** إعادة ضبط ليّنة عند بداية موسم: نزول درجتين لا هبوط إلى برونزي */
 function softReset(p,newSeasonId){
  if(!p.placed){p.seasonId=newSeasonId;return p}
  for(var i=0;i<2;i++){
   if(p.div<3&&tierOf(p).div!==0)p.div++;
   else if(p.tier>0){p.tier--;p.div=1}
  }
  p.rp=0;p.protect=1;p.winStreak=0;
  p.seasonBest={tier:p.tier,div:p.div};
  p.seasonId=newSeasonId;
  p.seen=[];
  return p;
 }

 /** رقم واحد لترتيب لوحة الصدارة: الرتبة ثم الدرجة ثم النقاط — غير المصنَّف آخر القائمة */
 function score(p){
  if(!p||!p.placed)return -1;
  var divPos=tierOf(p).div===0?3:(3-p.div);
  return (p.tier*3+divPos)*RP_PER_DIV+p.rp;
 }

 /** ملفّ من مصدر غير موثوق (قرص/شبكة) → ملفّ سليم الأنواع. الحقول المجهولة تسقط. */
 function sanitizeProfile(src,gameId){
  var p=newRankProfile(gameId);
  if(!src||typeof src!=='object')return p;
  var num=function(k,lo,hi){var v=src[k];if(typeof v==='number'&&isFinite(v))p[k]=Math.max(lo,Math.min(hi,Math.round(v)))};
  p.placed=!!src.placed;
  num('placementDone',0,5);num('placementWins',0,5);
  num('tier',0,TIERS.length-1);num('div',0,3);num('rp',0,RP_PER_DIV);num('mmr',100,5000);num('protect',0,3);
  num('wins',0,1e6);num('losses',0,1e6);num('gamesPlayed',0,1e6);num('winStreak',0,1e6);num('bestStreak',0,1e6);
  num('masteryXp',0,1e7);num('lastPlayedAt',0,4102444800000);
  if(typeof src.seasonId==='number')p.seasonId=src.seasonId|0;
  if(src.seasonBest&&typeof src.seasonBest.tier==='number')
   p.seasonBest={tier:Math.max(0,Math.min(TIERS.length-1,src.seasonBest.tier|0)),div:Math.max(0,Math.min(3,src.seasonBest.div|0))};
  if(Array.isArray(src.seen))p.seen=src.seen.slice(-24).map(String);
  if(tierOf(p).div===0)p.div=0; else if(p.div===0)p.div=3;
  return p;
 }

 return {TIERS:TIERS,RP_PER_DIV:RP_PER_DIV,SEASON_ID:SEASON_ID,GAMES:GAMES,GAME_DEFS:GAME_DEFS,
  MODES_ALL:MODES_ALL,MASTERY_XP:MASTERY_XP,SCORE_MODELS:SCORE_MODELS,
  gameDef:gameDef,newRankProfile:newRankProfile,tierOf:tierOf,rankName:rankName,rankView:rankView,
  masteryLevel:masteryLevel,grantsRP:grantsRP,mmrDelta:mmrDelta,rpFromStrength:rpFromStrength,
  resolve:resolve,softReset:softReset,score:score,sanitizeProfile:sanitizeProfile};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=RankCore;
