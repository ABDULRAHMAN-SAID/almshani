// إعادة إنتاج عددية لعطل جيب الكيرم — تشغّل caTick الحقيقي المستخرج من tahaddi/index.html
const CA_R=400, CA_PR=13, CA_SR=16.5, CA_POCK=20;
const CA_FR=0.99575, CA_STOP=0.0375;
const fs=require('fs');
eval(fs.readFileSync(__dirname+'/catick.js','utf8'));

function sim(pieces,maxT=4000){
  const S2={pcs:pieces.map(p=>({...p})),pot:[]};
  let t=0;
  for(;t<maxT;t++){
    caTick(S2);
    const moving=S2.pcs.some(p=>Math.abs(p.vx)+Math.abs(p.vy)>CA_STOP);
    const falling=(S2.drop||[]).some(d=>d.f<1);
    if(!moving&&!falling)break;
  }
  return {pot:S2.pot,rest:S2.pcs,ticks:t};
}
const P=(x,y,vx,vy,t,r)=>({x,y,vx,vy,t,r});
const d0=p=>Math.hypot(p.x,p.y);
const line='─'.repeat(68);

console.log('\n'+line+'\nهندسة الجيب مقابل هندسة الجدار\n'+line);
console.log('CA_POCK (نصف قطر الالتقاط)      =',CA_POCK);
for(const [nm,r] of [['قطعة عادية CA_PR',CA_PR],['الضارب CA_SR',CA_SR]]){
  const closest=Math.hypot(r,r);
  console.log(`${nm} r=${r}  →  أقرب مسافة ممكنة لمركز الجيب بعد قصّ الجدارين = √2·r = ${closest.toFixed(2)}` +
    `  →  ${closest<CA_POCK?'نافذة التقاط = '+(CA_POCK-closest).toFixed(2)+' وحدة فقط':'مستحيل الالتقاط إطلاقًا'}`);
}

console.log('\n'+line+'\nتجربة ١: الضارب مصوَّب مباشرة على الجيب (٠،٠) من زوايا وسرعات مختلفة\n'+line);
let sPot=0,sAll=0;
for(const sp of [2,4,6,8,9.7]) for(const ang of [180,190,200,215,225,235,250,260,270]){
  const a=ang*Math.PI/180, st=P(240,240,Math.cos(a)*sp,Math.sin(a)*sp,'s',CA_SR);
  // ارمِ الضارب من نقطة على خط يمرّ بمركز الجيب تمامًا
  const dir=Math.atan2(0-240,0-240);
  const st2=P(240,240,Math.cos(dir)*sp,Math.sin(dir)*sp,'s',CA_SR);
  const R=sim([st2]); sAll++; if(R.pot.includes('s'))sPot++;
}
{
  let hits=0,tries=0,minD=1e9;
  for(let sp=1;sp<=9.7;sp+=0.1){
    const dir=Math.atan2(-1,-1);
    const R=sim([P(240,240,Math.cos(dir)*sp,Math.sin(dir)*sp,'s',CA_SR)]);
    tries++; if(R.pot.includes('s'))hits++;
    if(R.rest[0])minD=Math.min(minD,d0(R.rest[0]));
  }
  console.log(`ضربة مصوَّبة على مركز الجيب تمامًا، ${tries} سرعة مختلفة (١ → ٩٫٧ = أقصى قوة ممكنة)`);
  console.log(`عدد المرات التي دخل فيها الضارب الجيب: ${hits} / ${tries}`);
  console.log(`أقرب مسافة وصلها مركز الضارب من مركز الجيب: ${minD.toFixed(2)}  (مطلوب < ${CA_POCK})`);
}

console.log('\n'+line+'\nتجربة ٢: قطعة عادية ملقاة فوق فم الجيب المرسوم ثم تُدفع نحوه\n'+line);
// الفم المرسوم: بئر نصف قطره CA_POCK، وحافة caRims حتى 1.22·CA_POCK
for(const start of [30,26,24,22]){
  const c=start/Math.SQRT2;
  const dir=Math.atan2(-1,-1);
  const R=sim([P(c,c,Math.cos(dir)*1.2,Math.sin(dir)*1.2,'w',CA_PR)]);
  const rest=R.rest[0];
  console.log(`مركز القطعة على بُعد ${start} من مركز الجيب (الحافة المرسومة عند ${(CA_POCK*1.22).toFixed(1)}) → `+
    (R.pot.length?'دخلت ✅':`لم تدخل ❌ — استقرّت على بُعد ${d0(rest).toFixed(2)}`));
}

console.log('\n'+line+'\nتجربة ٣: قطعة تنزلق بمحاذاة الحافة ولا تقصد الجيب أصلًا\n'+line);
for(const sp of [3,5,8]){
  const R=sim([P(300,CA_PR,-sp,0,'w',CA_PR)]);
  console.log(`تسير على الخط y=${CA_PR} (ملاصقة للحافة) بسرعة ${sp} → `+
    (R.pot.length?'ابتلعها الجيب ✅?!  — رغم أنها لم تدخل الفم بصريًا':'لم تدخل'));
}

console.log('\n'+line+'\nتجربة ٤: مسح شامل — أي زاوية اقتراب تُدخل قطعة عادية؟\n'+line);
{
  let ok=0,no=0;
  for(let ang=181;ang<270;ang+=1){
    const a=ang*Math.PI/180;
    const R=sim([P(200,200,Math.cos(a)*5,Math.sin(a)*5,'w',CA_PR)]);
    if(R.pot.length)ok++;else no++;
  }
  console.log(`من نقطة (200,200) بسرعة ٥ عبر ٨٩ زاوية نحو الرُبع الذي فيه الجيب: دخلت ${ok} · لم تدخل ${no}`);
}

console.log('\n'+line+'\nتجربة ٥: هل يمكن للسرعة أن تقفز فوق الجيب (tunnelling)؟\n'+line);
{
  const maxDrag=Math.hypot(95,95), k=0.0725;
  console.log(`أقصى سحب ممكن = √(95²+95²) = ${maxDrag.toFixed(2)} px ·  k=${k}  →  أقصى سرعة = ${(maxDrag*k).toFixed(2)} وحدة/إطار`);
  console.log(`قطر منطقة الالتقاط = 2·CA_POCK = ${2*CA_POCK} وحدة  →  ${(maxDrag*k)<2*CA_POCK?'لا يوجد tunnelling: السرعة القصوى أقلّ من القطر':'يوجد tunnelling'}`);
}
console.log('');
