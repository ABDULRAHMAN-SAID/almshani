const CA_R=400, CA_PR=13, CA_SR=16.5, CA_POCK=20;
const CA_FR=0.99575, CA_STOP=0.0375;
const fs=require('fs');
eval(fs.readFileSync(__dirname+'/catick.js','utf8'));
function sim(pieces,maxT=6000){
  const S2={pcs:pieces.map(p=>({...p})),pot:[]};
  for(let t=0;t<maxT;t++){
    caTick(S2);
    const moving=S2.pcs.some(p=>Math.abs(p.vx)+Math.abs(p.vy)>CA_STOP);
    if(!moving&&!(S2.drop||[]).some(d=>d.f<1))break;
  }
  return S2;
}
const P=(x,y,vx,vy,t,r)=>({x,y,vx,vy,t,r});
const L='─'.repeat(70);

console.log('\n'+L+'\nتجربة ٦: تصويب دقيق ١٠٠٪ على مركز الجيب — قطعة عادية — بسرعات متدرّجة\n'+L);
const dir=Math.atan2(-1,-1);
let rows=[];
for(let sp=1;sp<=9.7;sp+=0.5){
  const S=sim([P(200,200,Math.cos(dir)*sp,Math.sin(dir)*sp,'w',CA_PR)]);
  const r=S.pcs[0];
  rows.push([sp.toFixed(1), S.pot.length?'دخلت':'ارتدّت', r?Math.hypot(r.x,r.y).toFixed(1):'—']);
}
console.log('السرعة  النتيجة  مسافة الاستقرار من مركز الجيب');
rows.forEach(r=>console.log(`  ${r[0].padStart(4)}    ${r[1]}     ${r[2]}`));
const inn=rows.filter(r=>r[1]==='دخلت').length;
console.log(`\nالخلاصة: ${inn} من ${rows.length} سرعة فقط تُدخل قطعة مصوَّبة تصويبًا مثاليًا على قلب الجيب.`);
console.log('كل ضربة "قوية" ودقيقة ترتدّ — لأن الجدار موجود عبر فم الجيب ولا فجوة فيه.');

console.log('\n'+L+'\nتجربة ٧: أين ينتهي المطاف بقطعة تلامس الزاوية؟ (خريطة القصّ)\n'+L);
console.log('الجدران في caTick تُطبَّق على طول الحافة كاملةً بلا انقطاع عند الجيوب:');
console.log("  if(p.x<p.r){p.x=p.r; p.vx=-p.vx*0.72}   ← يسري حتى عند x الموافق للجيب");
console.log(`أثره: مركز أي قطعة محبوس داخل المربع [r , ${CA_R}-r] في المحورين،`);
console.log(`      أي أنه لا يستطيع الاقتراب من مركز الجيب أكثر من √2·r.`);
console.log(`      قطعة: √2·13 = ${(Math.SQRT2*13).toFixed(2)}  ·  ضارب: √2·16.5 = ${(Math.SQRT2*16.5).toFixed(2)}  ·  العتبة: ${CA_POCK}`);

console.log('\n'+L+'\nتجربة ٨: مقاس الفم المرسوم مقابل مقاس الفم الفيزيائي\n'+L);
const span={c:{px:984.1,r:45.5},m:{px:864.2,r:30}};
for(const k of ['c','m']){
  const s=span[k], units=s.r/s.px*CA_R;
  console.log(`${k==='c'?'اللوح الكلاسيكي':'لوح الأربعة'}: نصف قطر الحفرة في صورة المالك = ${units.toFixed(1)} وحدة لوح`);
}
console.log(`البئر الاصطناعي caWell يُرسم بنصف قطر = CA_POCK = ${CA_POCK}`);
console.log(`حلقة caRims الخارجية تُرسم عند 1.22·CA_POCK = ${(CA_POCK*1.22).toFixed(1)}`);
console.log(`عتبة الالتقاط الفعلية للقطعة = ${CA_POCK} من المركز، لكن نافذتها الحقيقية = ${(CA_POCK-Math.SQRT2*13).toFixed(2)} وحدة فقط.`);
console.log(`اللاعب يرى فمًا نصف قطره ${(CA_POCK*1.22).toFixed(1)} ويلعب على فم نافذته ${(CA_POCK-Math.SQRT2*13).toFixed(2)}.`);

let ever=0,tot=0;
for(let x=CA_SR;x<90;x+=6)for(let y=CA_SR;y<90;y+=6)for(let a=0;a<360;a+=20){
  const S=sim([P(x,y,Math.cos(a*Math.PI/180)*6,Math.sin(a*Math.PI/180)*6,'s',CA_SR)],900);
  tot++; if(S.pot.includes('s'))ever++;
}
console.log('\n'+L+'\nتجربة ٩: هل رسالة "الضارب (−1)" قابلة للحدوث أصلًا؟\n'+L);
console.log(`الضارب أُطلق من ${tot} وضع/زاوية داخل رُبع الجيب مباشرةً — عدد مرات دخوله: ${ever}`);
console.log(ever? 'وُجدت حالة' : 'صفر. شرط الخطأ (−1) في caPotMsg كود ميت لا يُنفَّذ أبدًا.');
console.log('');
