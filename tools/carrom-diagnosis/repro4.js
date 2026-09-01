const CA_R=400, CA_PR=13, CA_SR=16.5, CA_POCK=20;
const CA_FR=0.99575, CA_STOP=0.0375;
const fs=require('fs');
eval(fs.readFileSync(__dirname+'/catick.js','utf8'));
function sim(pcs,maxT=6000){const S2={pcs:pcs.map(p=>({...p})),pot:[]};
 for(let t=0;t<maxT;t++){caTick(S2);
  if(!S2.pcs.some(p=>Math.abs(p.vx)+Math.abs(p.vy)>CA_STOP)&&!(S2.drop||[]).some(d=>d.f<1))break}
 return S2}
const P=(x,y,vx,vy,t,r)=>({x,y,vx,vy,t,r});
const L='─'.repeat(70);
console.log('\n'+L+'\nتجربة ١٣: مخروط القبول — كم درجة خطأ تصويب يحتملها الجيب؟\n'+L);
console.log('قطعة وحيدة عند (200,200)، الجيب في (0,0)، الزاوية المثالية 225°');
for(const sp of [3,5,7,9]){
  let lo=null,hi=null,n=0;
  for(let e=-30;e<=30;e+=0.25){
    const a=(225+e)*Math.PI/180;
    const S=sim([P(200,200,Math.cos(a)*sp,Math.sin(a)*sp,'w',CA_PR)]);
    if(S.pot.length){n++;if(lo===null)lo=e;hi=e}
  }
  console.log(` سرعة ${sp}: نافذة القبول ${lo===null?'لا شيء':`من ${lo}° إلى ${hi}° = ${(hi-lo).toFixed(2)}° فقط`}`);
}
console.log('\nفي الكيرم الحقيقي فمُ الجيب يقبل مخروطًا واسعًا لأنه فتحة حقيقية في السطح،');
console.log('وهنا يقبل شريحة رفيعة لأن الالتقاط يحدث بالصدفة عند احتجاز القطعة في الزاوية.');
console.log('');
