/* ٦٫٩٦ — اختبار ترحيل حفظ الكؤوس (trMigrate): يُحمَّل قسم الكؤوس من index.html نفسه داخل vm بلا متصفّح.
     node tools/test-tr-migrate.cjs [path/to/tahaddi/index.html]
   يحاكي البناءات القديمة كما كانت في git مباراةً مباراة واستلامًا استلامًا، ويسجّل دفترًا بما أُعطي فعلًا، ثمّ يرحّل ويقارن:
   أ) البناءات التي وصلت اللاعبين فعلًا (الصفحات: 02cadc7 ‏٦٫٩٣، d8061e0 ‏٦٫٩٤، f88d274 ‏٦٫٩٥ — وتطبيق أندرويد غلافٌ يفتحها):
      لا صندوق ولا كتاب مرّتين، ولا يضيع صندوقٌ ولا كتاب (إلّا من استلم جواهر 2,000 في ٦٫٩٣/٦٫٩٤ — لا يُميَّز)، ونوع كلّ
      صندوقٍ جاهز هو ما فاته بعينه، والبوّابة صحيحة، والنتيجة هي نتيجة ترحيل ٦٫٩٦ كما شُحن (v:2) حرفًا بحرف إلّا علامة الكتاب
      2,500 حين لم تُستلَم 2,000، واختيار علامة الصندوق الجاهز حين كان ٦٫٩٦ يعطي العدد نفسه بنوعٍ آخر.
   ب) البناءات التي لم تُنشر قطّ (6bf9a51 بالجدول القديم، و1a9ccb7…ab8f75e بالجدول الجديد بلا ترقيم — معاينةٌ أو تطوير)،
      خالصةً ومختلطة: لكلّ حفظٍ على حدة، لا يزيد العطاء المكرّر ولا الفائت عمّا كان في ٦٫٩٦ كما شُحن (ويُطبع الباقي).
   ج) مرّةً واحدة: v:2 وv:3 لا يُمسّان، وإعادة التشغيل لا تغيّر شيئًا، والحفظ التالف لا يرمي.
   أيّ خرقٍ يُفشل الاختبار (رمز خروج 1). */
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const FILE=process.argv[2]||path.join(__dirname,'..','tahaddi','index.html');
const src=fs.readFileSync(FILE,'utf8');
const a=src.indexOf('const TR_ARENA=['),b=src.indexOf('function trMine(){');
assert(a>0&&b>a,'trophy block not found in '+FILE);
const pick=re=>{const m=src.match(re);assert(m,'not found: '+re);return m[0]};
const fIx=pick(/function trArenaIx\(tr\)\{[^\n]*\}/),fNx=pick(/function trNext\(tr\)\{[^\n]*\}/),fRoad=pick(/function trRoad\(\)\{[\s\S]*?\n\}/);
/* ترحيل ٦٫٩٦ كما شُحن (9ad03cb) حرفيًّا — مرجع المقارنة: ما رحّله على أجهزة اللاعبين قبل هذا الإصلاح */
const SHIPPED=`function trMigrate696(t){
 if(!t||typeof t!=='object'||(t.v|0)>=2)return false;
 const hi=Math.max(t.best|0,t.tr|0),bestIx=trArenaIx(hi),g0=Math.max(0,Math.min(TR_ARENA_V1.length-1,t.gate|0));
 const isNew=g0>0&&g0===trArenaIx(t.best|0)&&g0!==trIxOn(TR_ARENA_V1,t.best|0);
 if(!isNew){
  const map=i=>trArenaIx(TR_ARENA_V1[Math.max(0,Math.min(TR_ARENA_V1.length-1,i|0))]);
  const g=Math.min(bestIx,Math.max(map(g0),trArenaIx(t.tr|0)));
  if(g>map(g0))t.migUp=1;
  t.up=Math.min(g,map(t.up));t.gate=g;
  const c=new Set((Array.isArray(t.claimed)?t.claimed:[]).map(x=>x|0)),hadBook=c.has(2000);
  const OLDC=TR_ARENA_V1.slice(1),NEWC=TR_ARENA.slice(1).concat([TR_ROAD_END]);
  let got=OLDC.filter(x=>c.has(x)).length,marked=NEWC.filter(x=>c.has(x)).length;
  for(let i=NEWC.length-1;i>=0&&marked>got;i--){const x=NEWC[i];if(c.has(x)&&OLDC.indexOf(x)<0){c.delete(x);marked--}}
  for(let i=0;i<NEWC.length&&got>marked;i++){const x=NEWC[i];if(!c.has(x)&&hi>=x){c.add(x);marked++}}
  if(hadBook)c.add(TR_SKBOOK);
  t.claimed=[...c].sort((a,b)=>a-b);
 }
 t.v=2;return true;
}`;
let saves=0;
const ctx={S:{},saveState(){saves++},esc:x=>String(x),ARENAS:Array.from({length:10},(_,i)=>({n:'A'+(i+1)})),
 TL_ITEMS:{sk:[['s1'],['s2'],['s3'],['s4']]},tlArenaOf:()=>0,Date,Math,JSON,Set,Array,Map,Object,Number,isFinite};
vm.createContext(ctx);
vm.runInContext(src.slice(a,b)+'\n'+fIx+'\n'+fNx+'\nlet _trRoad=null;\n'+fRoad+'\n'+SHIPPED+
 '\nthis.api={trMigrate,trMigrate696,TR,TR_ARENA,TR_ROAD_END,TR_SKBOOK,trArenaIx,trRoad,trSeasonKey};',ctx);
const {trMigrate,trMigrate696,TR,TR_ARENA,TR_ROAD_END,TR_SKBOOK,trArenaIx,trRoad,trSeasonKey}=ctx.api;
const clone=o=>JSON.parse(JSON.stringify(o));   // JSON: الكائن يعود من عالم vm إلى عالمنا

// ── الطريق الجديد من الملفّ نفسه: صناديقه بأنواعها وكتابه
const R96=clone(trRoad()),C3=R96.filter(m=>m.r.t==='chest'),C3V=C3.map(m=>m.tr),BOOK=R96.filter(m=>m.r.t==='skbook').map(m=>m.tr);
const KR={knowledge:0,rival:1,elite:2,legend:3},kOf=v=>KR[C3.find(m=>m.tr===v).r.k];
const T1=[0,300,600,1000,1400,1800,2300,2800,3400,4000],T2=[0,300,600,1000,1300,1600,2000,2300,2600,3000];
const ixOn=(T,x)=>{let i=0;for(let k=0;k<T.length;k++)if(x>=T[k])i=k;return i};
const kindOld=(T,v)=>{const a=ixOn(T,v);return a>=8?3:a>=5?2:a>=2?1:0};

/* ── البناءات القديمة (من git، trRoad وtrApply في كلّ واحد): الجدول، وما في كلّ علامة — صندوقٌ بنوعه، أو كتاب، أو غيرهما
   02cadc7 ‏٦٫٩٣ وd8061e0 ‏٦٫٩٤: كلّ 100 حتّى 4000، الصناديق عند عتبات الجدول القديم، 2000 جواهر   (نُشرا: 05:40 و05:48)
   f88d274 ‏٦٫٩٥ (قيد العمل): والكتاب عند 2000                                                       (نُشر 07:35 حتّى 21:00)
   6bf9a51 ‏٦٫٩٥: وعلامات 50/150/…/950                                                               (لم يُنشر — فحص الإصدار)
   1a9ccb7…ab8f75e: الجدول الجديد، 50/150/…/950 وكلّ 100 حتّى 4000، 2000 صندوق، 4000 جواهر، بلا ترقيم  (لم يُنشر)
   bc79a4a/ab8f75e: والبوّابة تُثبّت الخاسر على أرضها حتّى في الصفر                                     (لم يُنشر) */
function road(T,fifty,book){const m=new Map();
 if(fifty)for(let v=50;v<1000;v+=100)m.set(v,{t:'x'});
 for(let v=100;v<=4000;v+=100)m.set(v,T.indexOf(v)>0?{t:'chest',k:kindOld(T,v)}:(book&&v===2000)?{t:'skbook'}:{t:'x'});
 return [...m].sort((x,y)=>x[0]-y[0])}
const B={
 w93:{id:'w93',T:T1,road:road(T1,false,false),dep:1},  w94:{id:'w94',T:T1,road:road(T1,false,false),dep:1},
 w95:{id:'w95',T:T1,road:road(T1,false,true),dep:1},   w95u:{id:'w95u',T:T1,road:road(T1,true,true),dep:0},
 n95:{id:'n95',T:T2,road:road(T2,true,true),dep:0},    n95b:{id:'n95b',T:T2,road:road(T2,true,true),dep:0,floor0:1}};
assert.strictEqual(new Map(B.n95.road).get(2000).t,'chest');assert.strictEqual(new Map(B.n95.road).get(4000).t,'x');
assert.strictEqual(new Map(B.w95.road).get(2000).t,'skbook');assert.strictEqual(new Map(B.w93.road).get(2000).t,'x');

let seed=20260924;const rnd=()=>{seed=(seed*1103515245+12345)&0x7fffffff;return seed/0x7fffffff};
function fresh(){return {tr:0,best:0,gate:0,w:0,l:0,claimed:[],season:trSeasonKey(),sAt:Date.now(),up:0,L:[]}}
function play(s,b,raw){const T=b.T,before=s.tr,aB=ixOn(T,before),floor=T[s.gate|0]||0;let after=Math.max(0,before+raw),why='';
 if(after<floor||(b.floor0&&raw<0&&after===before&&after===floor)){after=floor;why='gate'}
 s.tr=after;if(after>s.best)s.best=after;const aA=ixOn(T,after);if(aA>(s.gate|0))s.gate=aA;if(raw>0)s.w++;else s.l++;
 if(s.tr>4000&&rnd()<.003)s.tr=4000+Math.floor((s.tr-4000)/2);   // موسمٌ جديد في البناءات القديمة (TR_LEG=4000)
 s.last={d:after-before,raw,tr:after,before,arena:aA,arenaUp:aA>aB?aA:-1,why,won:raw>0}}
function claim(s,b,ok){for(const [v,r] of b.road)if(v<=s.best&&s.claimed.indexOf(v)<0&&(!ok||ok(v,r))){s.claimed.push(v);s.L.push({v,r,b:b.id})}}
function climb(s,b,to){while(s.tr<to)play(s,b,Math.min(30,to-s.tr))}
function saveOf(s){const t=clone(s);delete t.L;return t}

/** ما يستحقّه الحفظ على الطريق الجديد وما أُعطي فعلًا (بالدفتر) وما صار جاهزًا بعد الترحيل */
function judge(s,x){
 const hi=Math.max(s.best|0,s.tr|0),now=new Set(x.claimed.map(v=>v|0));
 const owed=C3V.filter(v=>v<=hi).map(kOf).sort((p,q)=>p-q),opened=s.L.filter(e=>e.r.t==='chest').map(e=>e.r.k);
 const ready=C3V.filter(v=>v<=hi&&!now.has(v)).map(kOf);
 const got=opened.concat(ready).sort((p,q)=>p-q),E=owed.length;
 const books=s.L.filter(e=>e.r.t==='skbook').length,bookReady=BOOK.some(v=>v<=hi&&!now.has(v))?1:0,bookOwed=BOOK.some(v=>v<=hi)?1:0;
 const gems2000=s.L.some(e=>e.v===2000&&e.r.t!=='skbook'&&e.r.t!=='chest');   // ٦٫٩٣/٦٫٩٤: 2000 جواهر — لا يُميَّز من الكتاب
 // صندوقٌ مرّتين = مجموع ما فُتح وما جهز فوق ما يعطيه الطريق الجديد؛ فائت = دونه
 return {hi,E,over:Math.max(0,got.length-E),lost:Math.max(0,E-got.length),
  exact:got.join()===owed.join(),gotK:got.join(''),owedK:owed.join(''),
  bookDbl:Math.max(0,books+bookReady-1),bookLost:bookOwed&&!books&&!bookReady&&!gems2000?1:0,gems2000};
}
let pass=0,fail=0;const log=[];
function T(name,fn){try{fn();pass++}catch(e){fail++;if(log.length<40)log.push('  FAIL '+name+' — '+String(e.message).split('\n')[0])}}
function gateOk(before,x){const hi=Math.max(x.best,x.tr);
 assert.strictEqual(x.tr,before.tr,'tr changed');assert.strictEqual(x.best,before.best,'best changed');
 assert(TR_ARENA[x.gate]<=x.tr,`floor ${TR_ARENA[x.gate]} above trophies ${x.tr}`);assert(x.gate>=trArenaIx(x.tr),'gate below the current arena');
 assert(x.gate<=trArenaIx(hi),'gate above best arena');assert(x.up>=0&&x.up<=x.gate,'up '+x.up+' outside 0..gate '+x.gate)}
const stat={dep:{n:0,old:0,new:0,gems2000:0,bookFix:0,kindFix:0,up:0,over:0,lost:0,inexact:0,bookDbl:0,bookLost:0},hyp:{n:0},shipped:{over:0,lost:0,bookDbl:0,bookLost:0},now:{over:0,lost:0,bookDbl:0,bookLost:0},better:0,worse:0};
function check(name,s,deployed){
 const before=saveOf(s),x0=clone(before),r=trMigrate(x0),x=clone(x0),h0=clone(before),rh=trMigrate696(h0),h=clone(h0);
 T(name,()=>{
  assert(r==='old'||r==='new','verdict '+r);assert.strictEqual(x.v,3,'v');assert(rh===true);
  const y=clone(x);assert.strictEqual(trMigrate(y),false,'second run must refuse');assert.deepStrictEqual(clone(y),x,'second run changed the save');
  for(const k of ['gate','up','migUp'])assert.strictEqual(x[k],h[k],k+' differs from the shipped 6.96 migration');   // البوّابة كما شُحنت
  if(deployed)gateOk(before,x);
  const J=judge(s,x),H=judge(s,h);
  if(deployed){
   stat.dep.n++;stat.dep[r]=(stat.dep[r]||0)+1;if(J.gems2000)stat.dep.gems2000++;
   stat.dep.over+=J.over;stat.dep.lost+=J.lost;stat.dep.inexact+=J.exact?0:1;stat.dep.bookDbl+=J.bookDbl;stat.dep.bookLost+=J.gems2000?0:J.bookLost;
   assert.strictEqual(r,'old','a save of the deployed builds must read as the old table');
   assert.strictEqual(J.over,0,`chests over-granted ${J.over}`);assert.strictEqual(J.lost,0,`chests lost ${J.lost}`);
   assert(J.exact,'chest kinds: opened+ready '+J.gotK+' ≠ owed '+J.owedK);
   assert.strictEqual(J.bookDbl,0,'book granted twice');if(!J.gems2000)assert.strictEqual(J.bookLost,0,'book lost');
   // النتيجة = نتيجة ٦٫٩٦ كما شُحن، إلّا 2,500 حين لم تُستلَم 2,000، ونوع الصندوق الجاهز (العدد نفسه)
   const strip=o=>{const q=clone(o);delete q.v;q.claimed=q.claimed.map(v=>v|0).filter(v=>v>0&&v!==TR_SKBOOK&&C3V.indexOf(v)<0);return q};
   assert.deepStrictEqual(strip(x),strip(h),'differs from the shipped 6.96 migration');
   const nC=o=>o.claimed.filter(v=>C3V.indexOf(v|0)>=0).length;assert.strictEqual(nC(x),nC(h),'chest markers claimed: count differs from 6.96');
   if(JSON.stringify(x.claimed.filter(v=>C3V.indexOf(v)>=0))!==JSON.stringify(h.claimed.filter(v=>C3V.indexOf(v)>=0))){stat.dep.kindFix++;assert(!H.exact,'kind choice changed although 6.96 was exact')}
   const b96=h.claimed.indexOf(TR_SKBOOK)>=0,bNow=x.claimed.indexOf(TR_SKBOOK)>=0;
   if(b96!==bNow){assert(b96&&!bNow&&before.claimed.indexOf(2000)<0,'book marker differs from 6.96 other than the 2,000-never-claimed case');stat.dep.bookFix++}
   if(x.up<x.gate)stat.dep.up++;
  }else{
   stat.hyp.n++;stat.hyp[r]=(stat.hyp[r]||0)+1;
   const K=['over','lost','bookDbl','bookLost'];for(const k of K){stat.shipped[k]+=H[k];stat.now[k]+=J[k]}
   if(J.lost<H.lost||J.bookLost<H.bookLost)stat.better++;
   const w=K.filter(k=>J[k]>H[k]);if(w.length)stat.worse++;assert(!w.length,w.map(k=>`${k} ${J[k]} > shipped 6.96 ${H[k]}`).join(', '));
  }
 });
}

/* ── أ) البناءات المنشورة: جدولٌ منظّم (أعلى كؤوس × نمط استلام × سقوط) ثمّ تاريخٌ عشوائيّ عبر ٦٫٩٣→٦٫٩٤→٦٫٩٥ */
const BESTS=[0,40,150,320,650,990,1050,1250,1300,1350,1399,1400,1450,1550,1599,1600,1650,1750,1800,1850,1950,1999,2000,2050,2250,2300,2350,2450,2500,2550,2600,2650,2750,2800,2850,2950,3000,3100,3399,3400,3500,3950,3999,4000,4050,4100,4600];
function policies(bb,best){const ms=bb.road.map(e=>e[0]).filter(v=>v<=best),ch=ms.filter(v=>bb.road.find(e=>e[0]===v)[1].t==='chest');
 const P=[['all',null],['none',()=>false]];
 for(const p of ms)P.push(['upto'+p,v=>v<=p]);
 for(const c of ch)P.push(['skip'+c,v=>v!==c]);
 for(const c of ms.filter(v=>v>=1200&&v<=2600))P.push(['skipx'+c,v=>v!==c]);
 return P}
for(const bid of ['w93','w95'])for(const best of BESTS)for(const [pn,ok] of policies(B[bid],best))for(const drop of [0,2]){
 if(drop&&best<600)continue;const s=fresh();climb(s,B[bid],best);claim(s,B[bid],ok);for(let i=0;i<drop;i++)play(s,B[bid],-30);
 check(`${bid} best ${best} ${pn}${drop?' fell':''}`,s,true);
 if(pn==='all'&&!drop){const q=fresh();climb(q,B[bid],best);claim(q,B[bid]);const t=saveOf(q);t.up=Math.max(0,t.gate-1);q.up=t.up;check(`${bid} best ${best} all · announcement pending`,q,true)}
}
function randomHistory(seq){const s=fresh();
 for(const bid of seq){const bb=B[bid],n=Math.floor(rnd()*rnd()*260),pw=.5+rnd()*.3,st=['all','all','subset','none','late'][Math.floor(rnd()*5)];
  for(let i=0;i<n;i++){play(s,bb,rnd()<pw?22+Math.floor(rnd()*17):-(22+Math.floor(rnd()*17)));
   if(st==='all'&&rnd()<.3)claim(s,bb);else if(st==='subset'&&rnd()<.2){const q=rnd();claim(s,bb,()=>rnd()<q)}}
  if(st==='late')claim(s,bb);}
 return s}
const DEP_SEQ=[['w93'],['w94'],['w95'],['w93','w94'],['w94','w95'],['w93','w94','w95'],['w93','w95']];
for(let i=0;i<6000;i++){const q=DEP_SEQ[i%DEP_SEQ.length];check('deployed random '+q.join('>')+' #'+i,randomHistory(q),true)}

/* ── ب) بناءاتٌ لم تُنشر (معاينة/تطوير): خالصة ومختلطة — لا شيء أسوأ ممّا فعله ٦٫٩٦ كما شُحن */
const HYP_SEQ=[['w95u'],['n95'],['n95b'],['n95','n95b'],['w95','n95'],['w95u','n95'],['w93','w95','n95','n95b'],['n95','w95'],['n95','w95u'],['w95','n95','w95']];
for(let i=0;i<8000;i++){const q=HYP_SEQ[i%HYP_SEQ.length];check('undeployed random '+q.join('>')+' #'+i,randomHistory(q),false)}
for(const best of BESTS)for(const bid of ['n95','w95u'])for(const [pn,ok] of policies(B[bid],best)){const s=fresh();climb(s,B[bid],best);claim(s,B[bid],ok);check(`${bid} best ${best} ${pn}`,s,false)}

/* ── ج) حالاتٌ مفردة */
const mk=(tr,best,gate,up,claimed,extra)=>Object.assign({tr,best,gate,w:10,l:5,claimed:claimed||[],season:trSeasonKey(),sAt:Date.now(),up},extra||{});
const UPTO=(hi,skip)=>{const L=[];for(let t=100;t<=4000;t+=100)if(t<=hi&&!(skip||[]).includes(t))L.push(t);return L};
const ready=x=>{const hi=Math.max(x.best,x.tr),c=new Set(x.claimed);return R96.filter(m=>m.tr<=hi&&!c.has(m.tr)&&(m.r.t==='chest'||m.r.t==='skbook')).map(m=>m.tr+':'+(m.r.k||'book'))};
const one=(name,t,want,fn)=>T(name,()=>{const x=clone(t);const r=trMigrate(x);const y=clone(x);if(want)assert.deepStrictEqual(ready(y),want,'ready '+JSON.stringify(ready(y)));if(fn)fn(y,r)});
T('constants: new table, road chests at the new thresholds + 4000, book at 2500',()=>{
 assert.deepStrictEqual(Array.from(TR_ARENA),T2);assert.strictEqual(TR_ROAD_END,4000);assert.strictEqual(TR_SKBOOK,2500);
 assert.deepStrictEqual(C3V,T2.slice(1).concat([4000]));assert.deepStrictEqual(BOOK,[2500]);
 assert.deepStrictEqual(C3.map(m=>m.r.k),['knowledge','rival','rival','rival','elite','elite','elite','legend','legend','legend'])});
T('fresh save: TR() creates v:3 at 0 and never migrates it',()=>{ctx.S.tro=undefined;saves=0;const t=TR();assert.strictEqual(t.v,3);assert.strictEqual(t.gate,0);
 assert.strictEqual(t.tr,0);assert.deepStrictEqual(Array.from(t.claimed),[]);assert.strictEqual(trMigrate(clone(t)),false);assert.strictEqual(saves,0)});
T('TR() migrates a stored v-less save once and saves once',()=>{ctx.S.tro=mk(2310,2310,6,6,UPTO(2300));saves=0;const t=TR();assert.strictEqual(t.v,3);assert.strictEqual(t.gate,7);
 const n=saves;assert.strictEqual(n,1);TR();TR();assert.strictEqual(saves,n,'no further saves')});
for(const v2 of [mk(1450,1450,4,4,[300,600,1000,1300],{v:2}),mk(2600,2600,8,8,UPTO(2600),{v:2}),mk(4100,4100,9,9,UPTO(4000),{v:2}),mk(0,0,0,0,[],{v:3}),mk(4100,4100,9,9,UPTO(4000),{v:3})])
 T(`already migrated (v:${v2.v}) @${v2.best}: untouched`,()=>{const x=clone(v2);assert.strictEqual(trMigrate(x),false);assert.deepStrictEqual(clone(x),v2)});
T('corrupted save: no throw, gate 0, junk claims dropped',()=>{const x={tr:'abc',best:null,gate:99,up:-3,claimed:['x',null,{},300,'600',-50]};trMigrate(x);
 assert.strictEqual(x.gate,0);assert.strictEqual(x.up,0);assert.deepStrictEqual(Array.from(x.claimed),[300,600])});
T('save with no claimed/up fields',()=>{const x={tr:1450,best:1450,gate:4};trMigrate(x);assert.deepStrictEqual(Array.from(x.claimed),[]);assert.strictEqual(x.up,0);assert.strictEqual(x.gate,4)});
// حالات المراجعة بعينها (ويب ٦٫٩٥ وأندرويد ٦٫٩٥ حفظٌ واحد: الغلاف فتح f88d274)
one('4,100 claimed everything: one legend chest owed → 3000 ready (the shipped 6.96 did the same)',mk(4100,4100,9,9,UPTO(4000)),['3000:legend']);
one('4,600 fell to 4,050, claimed everything: 3000 ready',mk(4050,4600,9,9,UPTO(4000)),['3000:legend']);
one('1,450 claimed ≤1,300 (1400 rival never opened): 1300 rival ready',mk(1450,1450,4,4,UPTO(1300)),['1300:rival']);
one('1,850 claimed ≤1,700 (1800 elite never opened): 1600 elite ready',mk(1850,1850,5,5,UPTO(1700)),['1600:elite']);
one('4,110 claimed <4,000: 3000 and 4000 legend ready',mk(4110,4110,9,9,UPTO(3900)),['3000:legend','4000:legend']);
one('1,470 claimed everything: nothing ready (1400 opened = 1300 on the new road)',mk(1470,1470,4,4,UPTO(1400)),[]);
one('2,310 took the book at 2,000: 2000 elite ready, book collected',mk(2310,2310,6,6,UPTO(2300)),['2000:elite'],x=>{assert.strictEqual(x.gate,7);assert(x.claimed.includes(2500))});
one('2,650 claimed everything: 2000 elite + 2600 legend ready, book collected',mk(2650,2650,6,6,UPTO(2600)),['2000:elite','2600:legend']);
one('2,550 skipped 2,000 but took the 2,500 coins: 2000 elite and the book ready',mk(2550,2550,6,6,UPTO(2500,[2000])),['2000:elite','2500:book']);
one('1,310 gate 3: promoted to arena 5 (gate 4), announced once, 1300 rival ready',mk(1310,1310,3,3,UPTO(1300)),['1300:rival'],x=>{assert.strictEqual(x.gate,4);assert.strictEqual(x.up,3);assert.strictEqual(x.migUp,1)});
one('3,500 gate 8 up 7 (pending): gate 9, up 8 → one announcement left',mk(3500,3600,8,7,UPTO(3400)),null,x=>{assert.strictEqual(x.gate,9);assert.strictEqual(x.up,8)});
one('2,600 nothing claimed: nothing marked',mk(2600,2600,6,6,[]),null,x=>assert.deepStrictEqual(Array.from(x.claimed),[]));
one('new table without a version (gate only it explains) @2,650: claims untouched, book ready (2000 never claimed)',mk(2650,2650,8,8,UPTO(2600,[2000])),['2000:elite','2500:book'],(x,r)=>{assert.strictEqual(r,'new');assert.strictEqual(x.gate,8)});

// ── التقرير
console.log(log.join('\n'));
const D=stat.dep;
console.log(`deployed builds (6.93/6.94/6.95 as served): ${D.n} saves · read as old ${D.old}, new ${D.new} · chests over-granted ${D.over}, lost ${D.lost}, wrong kind ${D.inexact} · book twice ${D.bookDbl}, lost ${D.bookLost} · same as shipped 6.96 except the book marker in ${stat.dep.bookFix} (2,000 never claimed → book ready) and the kind of the ready chest in ${stat.dep.kindFix} (6.96: same count, wrong kind) · 2,000-as-gems (6.93/6.94, book not recoverable) ${stat.dep.gems2000}`);
console.log(`undeployed builds (preview/dev only): ${stat.hyp.n} saves (old ${stat.hyp.old||0}, new ${stat.hyp.new||0}) · shipped 6.96 → this: chests over-granted ${stat.shipped.over}→${stat.now.over}, lost ${stat.shipped.lost}→${stat.now.lost}, book twice ${stat.shipped.bookDbl}→${stat.now.bookDbl}, book lost ${stat.shipped.bookLost}→${stat.now.bookLost} · better in ${stat.better}, worse in ${stat.worse} (must be 0, per save)`);
console.log(`test-tr-migrate: ${pass} passed, ${fail} failed (file ${path.relative(process.cwd(),FILE)||FILE})`);
process.exit(fail?1:0);
