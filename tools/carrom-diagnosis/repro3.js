const CA_R=400, CA_PR=13, CA_SR=16.5, CA_POCK=20;
const CA_FR=0.99575, CA_STOP=0.0375;
const fs=require('fs');
eval(fs.readFileSync(__dirname+'/catick.js','utf8'));
function sim(pieces,maxT=6000){
  const S2={pcs:pieces.map(p=>({...p})),pot:[]};
  for(let t=0;t<maxT;t++){ caTick(S2);
    if(!S2.pcs.some(p=>Math.abs(p.vx)+Math.abs(p.vy)>CA_STOP)&&!(S2.drop||[]).some(d=>d.f<1))break; }
  return S2;
}
const P=(x,y,vx,vy,t,r)=>({x,y,vx,vy,t,r});
const near=p=>{let m=1e9;for(const[px,py]of[[0,0],[CA_R,0],[0,CA_R],[CA_R,CA_R]])m=Math.min(m,Math.hypot(p.x-px,p.y-py));return m};
const L='─'.repeat(70);
const RIM=CA_POCK*1.22;

console.log('\n'+L+'\nتجربة ١٠: قطع تستقرّ *داخل* فم الجيب المرسوم وتبقى حيّة على اللوح\n'+L);
let stuck=0,tot=0,ex=[];
for(let a=0;a<360;a+=3)for(const sp of [2,4,6,8]){
  const S=sim([P(200,200,Math.cos(a*Math.PI/180)*sp,Math.sin(a*Math.PI/180)*sp,'w',CA_PR)]);
  tot++;
  for(const p of S.pcs){const d=near(p); if(d<RIM){stuck++;if(ex.length<4)ex.push([a,sp,d.toFixed(2)]);break}}
}
console.log(`قطعة عادية: ${stuck} من ${tot} ضربة انتهت والقطعة مستقرّة داخل الحلقة المرسومة (نصف قطر ${RIM}) دون أن تدخل.`);
ex.forEach(e=>console.log(`   مثال: زاوية ${e[0]}° بسرعة ${e[1]} → استقرّت على بُعد ${e[2]} من مركز الجيب — تبدو داخل الحفرة تمامًا وهي لا تزال في اللعب`));

console.log('\n'+L+'\nتجربة ١١: الضارب — أين يستقرّ عند الزاوية؟\n'+L);
let sMin=1e9,sIn=0,sTot=0;
for(let a=190;a<=260;a+=2)for(const sp of [3,6,9]){
  const S=sim([P(200,200,Math.cos(a*Math.PI/180)*sp,Math.sin(a*Math.PI/180)*sp,'s',CA_SR)]);
  sTot++; const d=near(S.pcs[0]); sMin=Math.min(sMin,d); if(d<RIM)sIn++;
}
console.log(`${sTot} ضربة · أقرب مسافة استقرار = ${sMin.toFixed(2)} · عدد المرات التي استقرّ فيها داخل الحلقة المرسومة = ${sIn}`);
console.log(`الضارب لا يمكن أن يدخل أبدًا (√2·16.5 = ${(Math.SQRT2*16.5).toFixed(2)} > ${CA_POCK}) لكنه يستقرّ داخل الفم المرسوم فيبدو ساقطًا وهو ليس كذلك.`);

console.log('\n'+L+'\nتجربة ١٢: لوح كامل ١٩ قطعة + ضارب — ماذا يحدث فعلًا؟\n'+L);
function deal(){const P2=[],cx=CA_R/2,cy=CA_R/2;P2.push({x:cx,y:cy,t:'q'});
 for(let ring=0;ring<2;ring++){const n=ring?12:6,rad=ring?CA_PR*4.1:CA_PR*2.1;
  for(let i=0;i<n;i++){const a=(i/n)*Math.PI*2+(ring?0.26:0);
   P2.push({x:cx+Math.cos(a)*rad,y:cy+Math.sin(a)*rad,t:(i%2?'w':'b')})}}
 return P2.map(p=>({...p,vx:0,vy:0,r:CA_PR}))}
let pots=0,shots=0,rimStuck=0;
for(let a=200;a<=340;a+=5)for(const sp of [5,7,9.5]){
  const pcs=deal(); pcs.push(P(200,360,Math.cos(a*Math.PI/180)*sp,Math.sin(a*Math.PI/180)*sp,'s',CA_SR));
  const S=sim(pcs); shots++; pots+=S.pot.length;
  rimStuck+=S.pcs.filter(p=>near(p)<RIM).length;
}
console.log(`${shots} ضربة افتتاحية · مجموع القطع الداخلة = ${pots} (${(pots/shots).toFixed(2)} لكل ضربة)`);
console.log(`قطع انتهت الضربة وهي مستقرّة داخل الحلقة المرسومة دون أن تُحتسب = ${rimStuck} (${(rimStuck/shots).toFixed(2)} لكل ضربة)`);
console.log('');
