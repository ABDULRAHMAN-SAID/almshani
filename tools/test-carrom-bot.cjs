/**
 * اختبار عقل الآليّ في الكيرم: نسبة إدخاله على المحرّك الحقيقيّ، وزمن اختياره.
 *   node tools/test-carrom-bot.cjs [عدد اللوحات]
 * يقرأ caBotPick وأعوانها من المنشور نفسه (tahaddi/index.html) — فما يُختبر هو ما يُشحن.
 */
const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(ROOT,'tahaddi','index.html'),'utf8');
const phys=fs.readFileSync(path.join(ROOT,'src','games','carrom','physics.js'),'utf8');
function fn(name){const m=html.match(new RegExp('\\nfunction '+name+'\\([^)]*\\)\\{[\\s\\S]*?\\n\\}\\n'));if(!m)throw new Error('لم أجد '+name);return m[0]}
function cst(re){const m=html.match(re);if(!m)throw new Error('ثابت مفقود '+re);return m[0]}
const src=[phys,';',
 cst(/const CA_R=400, CA_PR=CarromPhysics\.C\.pieceR, CA_SR=CarromPhysics\.C\.strikerR;/),cst(/const CA_VMAX=\d+;/),cst(/const CA_BASE=CA_R-CA_SR-22;/),
 fn('caBlocked'),fn('caBlockedAt'),fn('caFreeX'),fn('caBotPick'),
 ';({caBotPick,CarromPhysics,CA_R,CA_PR,CA_SR,CA_BASE})'].join('\n');
const {caBotPick,CarromPhysics:PH,CA_R,CA_PR,CA_BASE}=(0,eval)(src);
// ٦٫٥٠: ×١٫٣٤ — الضارب صار أخفّ (١٫٣٢ لا ٢٫٧ كما قيس من الفيديو) فتنقل الضربة إلى القطعة ٧٤٪ ممّا كانت
const DIFF={easy:{noise:0.28,pw:[5.6,9.4],blind:0.45},mid:{noise:0.04,pw:[8.8,12.0],blind:0.15,sim:3},hard:{noise:0.01,pw:[10.4,13.4],blind:0,sim:6}};
const tbl=html.match(/carrom:\{noise:[^}]*\}/g)||[];   // يجب أن يطابق جدول الصعوبة في اللعبة
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function randomBoard(n,rng){const P=[];let g=0;while(P.length<n&&g++<5000){const x=40+rng()*320,y=40+rng()*320;if(P.every(p=>Math.hypot(p.x-x,p.y-y)>=CA_PR*2.2))P.push({x,y,t:P.length===0?'q':(P.length%2?'w':'b')})}return P}
let pass=0,fail=0;const ck=(n,ok,d)=>{ok?(pass++,console.log('  ✓ '+n)):(fail++,console.log('  ✗ FAIL: '+n+(d!==undefined?' → '+d:'')))};
const N=+process.argv[2]||300;
console.log('\n── نسبة الإدخال على لوحاتٍ عشوائيّة ('+N+' لوحة لكلّ مستوى) ──');
const res={};
for(const k of ['easy','mid','hard']){
 const rng=mulberry(4242),P0=DIFF[k];let good=0,foul=0,tMax=0,tSum=0,sim=0;
 for(let i=0;i<N;i++){
  const pcs=randomBoard(1+2*(2+Math.floor(rng()*7)),rng);
  const t0=Date.now();const p=caBotPick(pcs,'w',P0,rng);const dt=Date.now()-t0;tSum+=dt;tMax=Math.max(tMax,dt);if(p.sim)sim++;
  const S=PH.create(pcs.map(q=>({x:q.x,y:q.y,t:q.t})));PH.shoot(S,{x:p.sx,y:CA_BASE,vx:Math.cos(p.ang)*p.pw,vy:Math.sin(p.ang)*p.pw});
  const r=PH.run(S,6000);
  if(r.pot.includes('w')||r.pot.includes('q'))good++;if(r.pot.includes('s'))foul++;
 }
 res[k]={good:good/N,foul:foul/N,tAvg:tSum/N,tMax,sim:sim/N};
 console.log(`  ${k.padEnd(4)} أدخل ${(100*good/N).toFixed(0)}٪ · أسقط الضارب ${(100*foul/N).toFixed(0)}٪ · بالمحاكاة ${(100*sim/N).toFixed(0)}٪ · زمن الاختيار ${(tSum/N).toFixed(0)} مللي (أقصى ${tMax})`);
}
console.log('\n── الأحكام ──');
ck('الصعب يُدخل في ربع اللوحات العشوائيّة على الأقلّ (كان ٣٪)',res.hard.good>=0.25,(100*res.hard.good).toFixed(0)+'٪');
ck('المتوسّط يُدخل أكثر من السهل، والصعب أكثر من المتوسّط',res.easy.good<res.mid.good&&res.mid.good<res.hard.good,JSON.stringify([res.easy.good,res.mid.good,res.hard.good]));
ck('الضارب لا يسقط في أكثر من ٥٪ من ضربات الصعب',res.hard.foul<=0.05,(100*res.hard.foul).toFixed(0)+'٪');
ck('الاختيار لا يجمّد الجهاز: أقصى زمنٍ دون ٣٠٠ مللي ثانية',res.hard.tMax<300,res.hard.tMax+' مللي');
ck('جدول الصعوبة في اللعبة يحمل sim للمتوسّط والصعب',tbl.length===3&&/sim:3/.test(tbl[1])&&/sim:6/.test(tbl[2]),tbl.join(' | '));
console.log('\n── القطعة الواحدة بتصويبٍ دقيق (صعب بلا ضجيج) ──');
{let tot=0,pot=0;const P0={noise:0,pw:[7.0,8.8],blind:0,sim:6};   // ×١٫٣٤ كجدول الصعوبة (٦٫٥٠)
 for(let tx=60;tx<=340;tx+=40)for(let ty=60;ty<=300;ty+=40){const pcs=[{x:tx,y:ty,t:'w'}];const p=caBotPick(pcs,'w',P0,()=>0.5);
  const S=PH.create(pcs.map(q=>({x:q.x,y:q.y,t:q.t})));PH.shoot(S,{x:p.sx,y:CA_BASE,vx:Math.cos(p.ang)*p.pw,vy:Math.sin(p.ang)*p.pw});tot++;if(PH.run(S,6000).pot.includes('w'))pot++}
 ck('قطعةٌ وحيدةٌ أمامه: يُدخلها في ٨٥٪ من المواضع على الأقلّ',pot/tot>=0.85,pot+' / '+tot)}
console.log(fail?`\n✗ ${fail} فحصًا فشل من ${pass+fail}`:`\nعقل الآليّ سليم ✔ (${pass} فحوص)`);
process.exit(fail?1:0);
