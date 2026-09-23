/**
 * اختبار عقل الآليّ في الكيرم: نسبة إدخاله على المحرّك الحقيقيّ، وزمن اختياره.
 *   node tools/test-carrom-bot.cjs [عدد اللوحات]
 * يقرأ caBotPick وأعوانها من المنشور نفسه (tahaddi/index.html) — فما يُختبر هو ما يُشحن.
 */
const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(ROOT,'tahaddi','index.html'),'utf8');
const phys=fs.readFileSync(path.join(ROOT,'src','games','carrom','physics.js'),'utf8');
function fn(name){const m=html.match(new RegExp('\\nfunction\\*? ?'+name+'\\([^)]*\\)\\{[\\s\\S]*?\\n\\}\\n'));if(!m)throw new Error('لم أجد '+name);return m[0]}
function cst(re){const m=html.match(re);if(!m)throw new Error('ثابت مفقود '+re);return m[0]}
const src=[phys,';',
 cst(/const CA_R=400, CA_PR=CarromPhysics\.C\.pieceR, CA_SR=CarromPhysics\.C\.strikerR;/),cst(/const CA_VMAX=\d+;/),cst(/let CA_BASE=\d+;/),cst(/const CA_XL=\d+, CA_XR=400-\d+;/),
 fn('caBlocked'),fn('caBlockedAt'),fn('caFreeX'),fn('caLegalTargets'),fn('caShotVal'),fn('caCands'),fn('caEase'),fn('caBotThink'),fn('caBotPick'),
 ';({caBotPick,caShotVal,caLegalTargets,CarromPhysics,CA_R,CA_PR,CA_SR,CA_BASE})'].join('\n');
const {caBotPick,caShotVal,caLegalTargets,CarromPhysics:PH,CA_R,CA_PR,CA_SR,CA_BASE}=(0,eval)(src);
// جدول الصعوبة يُقرأ من اللعبة نفسها — فما يُقاس هو ما يُشحن
const DIFF_P=(0,eval)('('+html.match(/const DIFF_P=(\{[\s\S]*?\n\});/)[1]+')');
const LV=['easy','mid','hard','imp'], DIFF={};LV.forEach(k=>DIFF[k]=DIFF_P[k].carrom);
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function randomBoard(n,rng,types){const P=[];let g=0;while(P.length<n&&g++<5000){const x=40+rng()*320,y=40+rng()*320;if(P.every(p=>Math.hypot(p.x-x,p.y-y)>=CA_PR*2.2))P.push({x,y,t:types?types[P.length]:(P.length===0?'q':(P.length%2?'w':'b'))})}return P}
/* يُعاد تشغيل الضربة على اللوح مقلوبًا ١٨٠° — كما في اللعبة: الآليّ يجلس في المقعد المقابل،
   ويُحسب في إطاره ثمّ تُحوَّل ضربته إلى إطار اللوح. فالتقريب العدديّ للتحويل داخلٌ في القياس */
function replay(pcs,p){const S=PH.create(pcs.map(q=>({x:CA_R-q.x,y:CA_R-q.y,t:q.t})));
 PH.shoot(S,{x:CA_R-p.sx,y:CA_R-CA_BASE,vx:-Math.cos(p.ang)*p.pw,vy:-Math.sin(p.ang)*p.pw});return PH.run(S,6000)}
let pass=0,fail=0;const ck=(n,ok,d)=>{ok?(pass++,console.log('  ✓ '+n)):(fail++,console.log('  ✗ FAIL: '+n+(d!==undefined?' → '+d:'')))};
const N=+process.argv[2]||200;
console.log('\n── نسبة الإدخال على لوحاتٍ عشوائيّة ('+N+' لوحة لكلّ مستوى) ──');
const res={};
for(const k of LV){
 const rng=mulberry(4242),P0=DIFF[k];let good=0,foul=0,tMax=0,tSum=0,sim=0;
 for(let i=0;i<N;i++){
  const pcs=randomBoard(1+2*(2+Math.floor(rng()*7)),rng);
  const t0=Date.now();const p=caBotPick(pcs,'w',P0,rng,{foeK:2});const dt=Date.now()-t0;tSum+=dt;tMax=Math.max(tMax,dt);if(p.sim)sim++;
  const r=replay(pcs,p);
  if(r.pot.includes('w')||r.pot.includes('q'))good++;if(r.pot.includes('s'))foul++;
 }
 res[k]={good:good/N,foul:foul/N,tAvg:tSum/N,tMax,sim:sim/N};
 console.log(`  ${k.padEnd(4)} أدخل ${(100*good/N).toFixed(0)}٪ · أخطأ ${(100*(1-good/N)).toFixed(0)}٪ · أسقط الضارب ${(100*foul/N).toFixed(0)}٪ · بالمحاكاة ${(100*sim/N).toFixed(0)}٪ · زمن التفكير ${(tSum/N).toFixed(0)} مللي (أقصى ${tMax})`);
}
console.log('\n── الأحكام ──');
ck('الصعب يُدخل في ٨٥٪ من اللوحات العشوائيّة على الأقلّ',res.hard.good>=0.85,(100*res.hard.good).toFixed(0)+'٪');
ck('كلّ مستوى يُدخل أكثر ممّا تحته',res.easy.good<res.mid.good&&res.mid.good<res.hard.good&&res.hard.good<res.imp.good,LV.map(k=>(100*res[k].good).toFixed(0)).join(' < '));
ck('«مستحيل» أقوى من الصعب ٢٠٠٪: أخطاؤه ثلثُ أخطاء الصعب أو أقلّ',(1-res.imp.good)*3<=(1-res.hard.good)+1e-9,((1-res.hard.good)*100).toFixed(1)+'٪ ← '+((1-res.imp.good)*100).toFixed(1)+'٪');
ck('الضارب لا يسقط في أكثر من ٣٪ من ضربات الصعب والمستحيل',res.hard.foul<=0.03&&res.imp.foul<=0.03,[res.hard.foul,res.imp.foul].join(' · '));
ck('التفكير في حدّه: الصعب دون ٢٫٢ ث والمستحيل دون ٣٫٢ ث (ويجري على دفعاتٍ في اللعبة فلا يجمّد)',res.hard.tMax<=2300&&res.imp.tMax<=3300,res.hard.tMax+' · '+res.imp.tMax);
ck('جدول الصعوبة في اللعبة يحمل المستويات الأربعة',LV.every(k=>DIFF[k]&&DIFF[k].pw),Object.keys(DIFF_P).join(','));

console.log('\n── القانون في نهاية اللوح ──');
/* ١) قطعةٌ واحدةٌ له والملكة على اللوح: لا يُدخل قطعته الأخيرة وحدها (تعود إلى المركز) */
for(const k of ['mid','hard','imp']){
 const rng=mulberry(77);let ill=0,qIn=0,n=0;
 for(let i=0;i<60;i++){const nb=2+Math.floor(rng()*5);const pcs=randomBoard(2+nb,rng,['q','w'].concat(Array(nb).fill('b')));if(pcs.length<2+nb)continue;
  const p=caBotPick(pcs,'w',DIFF[k],rng,{foeK:2});const r=replay(pcs,p);n++;
  if(r.pot.includes('w')&&!r.pot.includes('q'))ill++;if(r.pot.includes('q'))qIn++}
 ck(`${k}: آخر قطعةٍ والملكة على اللوح — يصوّب على الملكة ولا يُدخل قطعته قبلها (${ill} من ${n})، والملكة دخلت ${qIn}`,ill<=Math.ceil(n*0.05)&&(k==='mid'||qIn>=n*0.5));
}
/* ٢) الملكة معه تنتظر التغطية: يُدخل قطعةً من لونه */
for(const k of ['hard','imp']){
 const rng=mulberry(91);let cov=0,n=0;
 for(let i=0;i<50;i++){const nw=1+Math.floor(rng()*4),nb=1+Math.floor(rng()*5);const T=Array(nw).fill('w').concat(Array(nb).fill('b'));const pcs=randomBoard(T.length,rng,T);if(pcs.length<T.length)continue;
  const p=caBotPick(pcs,'w',DIFF[k],rng,{qPend:1,foeK:2});const r=replay(pcs,p);n++;if(r.pot.includes('w')&&!r.pot.includes('s'))cov++}
 ck(`${k}: يغطّي الملكة بقطعةٍ من لونه في ${cov} من ${n}`,cov>=n*0.8);
}
/* ٣) بقيت لخصمه قطعةٌ واحدة: لا يُدخلها (يخسر اللوح) */
for(const k of ['hard','imp']){
 const rng=mulberry(123);let lost=0,n=0;
 for(let i=0;i<50;i++){const nw=2+Math.floor(rng()*5);const T=['b'].concat(Array(nw).fill('w'));const pcs=randomBoard(T.length,rng,T);if(pcs.length<T.length)continue;
  const p=caBotPick(pcs,'w',DIFF[k],rng,{foeK:2});const r=replay(pcs,p);n++;if(r.pot.includes('b')&&r.pot.filter(t=>t==='w').length<nw)lost++}
 ck(`${k}: لا يُدخل قطعة خصمه الأخيرة (${lost} من ${n})`,lost<=Math.ceil(n*0.04));
}
ck('caShotVal: القطعة الأخيرة قبل الملكة سالبة، وكسب اللوح وخسارته صحيحان',
 caShotVal(['w'],[{t:'w'},{t:'q'},{t:'b'}],'w',0).v<0&&caShotVal(['q','w'],[{t:'w'},{t:'q'},{t:'b'}],'w',0).end===1&&caShotVal(['b'],[{t:'w'},{t:'w'},{t:'b'}],'w',0).end===-1);
ck('caShotVal: قطعة الخصم الأخيرة تخسر اللوح ولو مع خطأ الضارب أو مع قطعته الأخيرة قبل الملكة',
 caShotVal(['b','s'],[{t:'w'},{t:'w'},{t:'b'}],'w',0).end===-1&&caShotVal(['w','b'],[{t:'w'},{t:'q'},{t:'b'}],'w',0).end===-1&&caShotVal(['w','b'],[{t:'w'},{t:'b'}],'w',0).end===1);
/* ٤) قطعته خلف خطّه (لا تُضرب مباشرةً): يرتدّ إليها من الجدار — يُدخلها أو يُخرجها إلى حيث تُضرب، لا يرمي في الفراغ */
for(const k of ['hard','imp']){
 const rng=mulberry(555);let ok=0,lose=0,n=0;
 for(let i=0;i<40;i++){const nb=3+Math.floor(rng()*5);const T=Array(nb).fill('b');const P=randomBoard(nb,rng,T);if(P.length<nb)continue;
  const w={x:60+rng()*280,y:CA_BASE+3+rng()*12,t:'w'};if(P.some(p=>Math.hypot(p.x-w.x,p.y-w.y)<CA_PR*2.2))continue;const pcs=P.concat([w]);
  const touch=(sx,a,pw)=>{const S=PH.create(pcs.map(q=>({x:q.x,y:q.y,t:q.t})));PH.shoot(S,{x:sx,y:CA_BASE,vx:Math.cos(a)*pw,vy:Math.sin(a)*pw});
   let h=0;for(let f=0;f<6000&&!PH.settled(S);f++)for(const ev of PH.step(S))if(ev.e==='hit'&&((ev.a==='s'&&ev.b==='w')||(ev.a==='w'&&ev.b==='s')))h=1;return {h,S}};
  /* هل تُصاب أصلًا؟ مسحٌ يدويّ: ٣١ موضعًا × ٣ قوى نحو صورتها في الجدار المقابل */
  const wl=CA_SR+PH.C.jawR;let can=0;for(let sx=50;sx<=350&&!can;sx+=10)for(const pw of [15,17,19]){const a=Math.atan2(wl-(w.y-wl)/PH.C.wallE-CA_BASE,w.x-sx);if(touch(sx,a,pw).h){can=1;break}}
  const p=caBotPick(pcs,'w',DIFF[k],rng,{foeK:2});const R=touch(p.sx,p.ang,p.pw);
  if(can){n++;if(R.h||R.S.pot.includes('w'))ok++}if(R.S.pot.filter(t=>t==='b').length>=nb)lose++}
 ck(`${k}: قطعته خلف خطّه — حيث تُصاب بالارتداد أصابها في ${ok} من ${n}، وخسر اللوح ${lose}`,ok>=n*0.7&&lose===0);
}
ck('caLegalTargets: الملكة وحدها عند القطعة الأخيرة، ولونه وحده والملكة معه',
 caLegalTargets([{t:'w'},{t:'q'},{t:'b'}],'w',0).every(p=>p.t==='q')&&caLegalTargets([{t:'w'},{t:'w'},{t:'b'}],'w',1).every(p=>p.t==='w'));

console.log('\n── القطعة الواحدة (جدول الصعب بلا خطأ تصويب) ──');
/* ٦٫٥٥: جدول الصعب المشحون نفسه بلا خطأ تصويب — كان نطاق قوّةٍ مصطنعًا (سقفه ١٥ والصعب ٢٢٫٨) فصار يُقصّر
   عن القطع البعيدة أعلى اللوح لمّا نزل خطّ القاعدة إلى منتصف شريطه (٧٫٥ وحدةٍ أبعد) */
{let tot=0,pot=0;const P0=Object.assign({},DIFF.hard,{noise:0});
 for(let tx=60;tx<=340;tx+=40)for(let ty=60;ty<=300;ty+=40){const pcs=[{x:tx,y:ty,t:'w'}];const p=caBotPick(pcs,'w',P0,()=>0.5);
  const S=PH.create(pcs.map(q=>({x:q.x,y:q.y,t:q.t})));PH.shoot(S,{x:p.sx,y:CA_BASE,vx:Math.cos(p.ang)*p.pw,vy:Math.sin(p.ang)*p.pw});tot++;if(PH.run(S,6000).pot.includes('w'))pot++}
 ck('قطعةٌ وحيدةٌ أمامه: يُدخلها في ٩٥٪ من المواضع على الأقلّ',pot/tot>=0.95,pot+' / '+tot)}

/* ── مبارياتٌ كاملة بالقانون (اختياريّ: node tools/test-carrom-bot.cjs N --match لوحات) ──
   حكمٌ يطابق caAct: تكملة الدور، تغطية الملكة، القطعة الأخيرة قبل الملكة، قطعة الخصم الأخيرة، خطأ الضارب */
const mi=process.argv.indexOf('--match');
if(mi>0){
 const NB=+process.argv[mi+1]||10, pairs=(process.argv[mi+2]||'imp:hard,hard:mid').split(',');
 const layout=()=>{const P=[{x:200,y:200,t:'q'}];for(let ring=0;ring<2;ring++){const n=ring?12:6,rad=ring?CA_PR*4.1:CA_PR*2.1;for(let i=0;i<n;i++){const a=(i/n)*Math.PI*2+(ring?0.26:0);P.push({x:200+Math.cos(a)*rad,y:200+Math.sin(a)*rad,t:(i%2?'w':'b')})}}return P};
 const putBack=(P,t)=>{for(let ring=0;ring<10;ring++){const n=ring?ring*6:1,rad=ring*CA_PR*2.2;for(let k=0;k<n;k++){const a=k*2*Math.PI/n+ring*.45,x=200+Math.cos(a)*rad,y=200+Math.sin(a)*rad;if(P.every(p=>Math.hypot(p.x-x,p.y-y)>=CA_PR*2.15)){P.push({x,y,t});return}}}};
 for(const pr of pairs){
  const [A,B]=pr.split(':');const rng=mulberry(2025);const W={[A]:0,[B]:0},V={illegal:0,foeLast:0,qLost:0},shots={[A]:0,[B]:0},turns={[A]:0,[B]:0};
  for(let b=0;b<NB;b++){
   let P=layout();const lv=[b%2?B:A,b%2?A:B],col=['w','b'];let turn=0,qp=-1,shotsB=0,newTurn=1;
   while(shotsB++<200){
    const mine=col[turn],k=lv[turn],foe=col[1-turn];if(newTurn){turns[k]++;newTurn=0}shots[k]++;
    const loc=turn?P.map(p=>({x:CA_R-p.x,y:CA_R-p.y,t:p.t})):P;
    const pk=caBotPick(loc,mine,DIFF[k],rng,{qPend:qp===turn,foeK:2});
    const S=PH.create(P.map(q=>({x:q.x,y:q.y,t:q.t})));
    const sx=turn?CA_R-pk.sx:pk.sx, sy=turn?CA_R-CA_BASE:CA_BASE, sg=turn?-1:1;
    PH.shoot(S,{x:sx,y:sy,vx:sg*Math.cos(pk.ang)*pk.pw,vy:sg*Math.sin(pk.ang)*pk.pw});
    const r=PH.run(S,6000);P=r.rest.filter(p=>p.t!=='s').map(p=>({x:p.x,y:p.y,t:p.t}));
    const foul=r.pot.includes('s'),gotQ=r.pot.includes('q'),gotMine=r.pot.filter(t=>t===mine).length;
    if(foul&&gotMine===0&&P.filter(p=>p.t===mine).length<9)putBack(P,mine);
    if(gotQ){if(!(gotMine&&!foul))qp=turn}else if(qp===turn){if(!(gotMine&&!foul)){qp=-1;putBack(P,'q');V.qLost++}else qp=-1}
    if(gotQ&&gotMine&&!foul)qp=-1;
    const left=t=>P.filter(p=>p.t===t).length, qIn=!P.some(p=>p.t==='q')||qp===turn;
    if(!left(mine)&&qIn){W[k]++;break}
    if(!left(foe)){W[lv[1-turn]]++;V.foeLast++;break}
    if(!left(mine)){putBack(P,mine);V.illegal++;turn=1-turn;newTurn=1;continue}
    if(!((gotMine>0||gotQ)&&!foul)){if(qp===turn){qp=-1;putBack(P,'q');V.qLost++}turn=1-turn;newTurn=1}
   }
  }
  console.log(`  ${A} ضدّ ${B}: ${W[A]}–${W[B]} لوحًا من ${NB} · قطعٌ لكلّ دور ${A} ${(shots[A]/turns[A]).toFixed(2)} ضربة/دور · ${B} ${(shots[B]/turns[B]).toFixed(2)} · مخالفات: آخر قطعةٍ قبل الملكة ${V.illegal}، قطعة الخصم الأخيرة ${V.foeLast}، ملكةٌ لم تُغطَّ ${V.qLost}`);
 }
}
console.log(fail?`\n✗ ${fail} فحصًا فشل من ${pass+fail}`:`\nعقل الآليّ سليم ✔ (${pass} فحوص)`);
process.exit(fail?1:0);
