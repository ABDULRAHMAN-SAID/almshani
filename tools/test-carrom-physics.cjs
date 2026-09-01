/**
 * اختبارات فيزياء الكيرم — نفس التجارب التي كشفت العطل، معكوسةً الآن.
 *   node tools/test-carrom-physics.cjs
 */
const fs=require('fs'),path=require('path');
const SRC=path.join(__dirname,'..','src','games','carrom','physics.js');
// نحمّل النصّ نفسه الذي يُدمَج في اللعبة — فما يُختبر هو ما يُشحن حرفيًّا
const P=(0,eval)(fs.readFileSync(SRC,'utf8')+';CarromPhysics');
const C=P.C;
let pass=0,fail=0;
const ck=(n,ok,d)=>{ok?(pass++,console.log('  ✓ '+n)):(fail++,console.log('  ✗ FAIL: '+n+(d!==undefined?' → '+d:'')))};
const at=(x,y,vx,vy,t)=>({x,y,vx,vy,t:t||'w'});
const shoot=(pieces)=>{const S=P.create(pieces);return P.run(S)};
const near=p=>{let m=1e9;for(const[px,py]of P.pockets())m=Math.min(m,Math.hypot(p.x-px,p.y-py));return m};

console.log('\n── هندسة اللوح ──');
ck('الجدران مقطوعة عند الجيوب — أربع قطع لا أربعة خطوط ممتدّة',
   P.walls().length===4 && P.walls()[0].ax===C.mouth && P.walls()[0].bx===C.R-C.mouth,
   JSON.stringify(P.walls()[0]));
ck('مركز القطعة يستطيع بلوغ مركز الجيب — لا حدّ قصّ يمنعه',
   C.mouth > C.strikerR*Math.SQRT2 && P.walls()[2].ay===C.mouth);

console.log('\n── التجربة التي كانت تفشل: الضارب ──');
{
 const dir=Math.atan2(-1,-1);let hit=0,tot=0;
 const reach=sp=>sp*sp/(2*C.roll);   // مدى الضربة تحت احتكاك الانزلاق
 const dist=Math.hypot(240,240);
 for(let sp=1;sp<=7;sp+=0.1){
  if(reach(sp)<dist*1.02)continue;           // ضربة أضعف من أن تصل ليست عطلًا
  tot++;
  const r=shoot([at(240,240,Math.cos(dir)*sp,Math.sin(dir)*sp,'s')]);
  if(r.pot.includes('s'))hit++;
 }
 ck('الضارب المصوَّب على قلب الجيب يسقط كلّما بلغته (كان 0 من 88)',hit===tot,hit+' / '+tot);
}
{
 let ever=0,tot=0;
 for(let x=20;x<90;x+=6)for(let y=20;y<90;y+=6)for(let a=180;a<280;a+=20){
  tot++;
  const r=shoot([at(x,y,Math.cos(a*Math.PI/180)*6,Math.sin(a*Math.PI/180)*6,'s')]);
  if(r.pot.includes('s'))ever++;
 }
 ck('خطأ الضارب صار ممكنًا فعلًا — شرط (−1) لم يعد كودًا ميتًا',ever>0,ever+' / '+tot);
}

console.log('\n── هل تُكافأ التسديدة الصحيحة؟ ──');
{
 // قطعة على القطر أمام زاوية، والضارب خلفها على الخطّ نفسه: هذه أوضح تسديدة في الكيرم
 let ok=0,tot=0;
 for(let d=60;d<=200;d+=20)for(const sp of [4,6,8]){
  tot++;
  const px=d/Math.SQRT2, py=d/Math.SQRT2;
  const sx=px+40/Math.SQRT2, sy=py+40/Math.SQRT2;
  const a=Math.atan2(py-sy,px-sx);
  const r=shoot([at(px,py,0,0,'w'),at(sx,sy,Math.cos(a)*sp,Math.sin(a)*sp,'s')]);
  if(r.pot.includes('w'))ok++;
 }
 ck('التسديدة المباشرة على قطعة أمام جيب مفتوح تنجح دائمًا',ok===tot,ok+' / '+tot);
}
{
 // كسرة الافتتاح: المطلوب أن تتبعثر الحزمة ولا تضيع قطعة — لا أن تُسقط شيئًا
 let scattered=0,lost=0,shots=0,pots=0;
 for(let a=262;a<=278;a+=4)for(const sp of [5,6,7]){
  const base=P.deal();
  const pcs=base.map(p=>({...p,vx:0,vy:0}));
  pcs.push(at(200,360,Math.cos(a*Math.PI/180)*sp,Math.sin(a*Math.PI/180)*sp,'s'));
  const r=shoot(pcs);shots++;pots+=r.pot.length;
  const men=r.rest.filter(p=>p.t!=='s');
  if(men.length+r.pot.filter(t=>t!=='s').length!==base.length)lost++;
  // قطعة تحرّكت = لا يوجد في الوضع الابتدائي قطعة قريبة منها
  let moved=0;
  for(const m of men){
   let stayed=false;
   for(const o of base)if(Math.hypot(m.x-o.x,m.y-o.y)<8){stayed=true;break}
   if(!stayed)moved++;
  }
  if(moved>=3)scattered++;
 }
 ck('كسرة الافتتاح تبعثر الحزمة فعلًا',scattered===shots,scattered+' / '+shots);
 ck('ولا تضيع فيها قطعة واحدة بلا جيب',lost===0,lost+' ضاعت · '+(pots/shots).toFixed(2)+' سقطت لكل ضربة');
}

console.log('\n── لا سقوط بلا فم ──');
{
 // ضربة الحافة إلى الزاوية تسديدة مشروعة في الكيرم — يجب أن تنجح
 let railed=0;
 for(const sp of [4,5.5,7]){
  const r=shoot([at(300,C.pieceR+0.5,-sp,0)]);
  if(r.pot.length)railed++;
 }
 ck('ضربة الحافة إلى الزاوية تُسقط القطعة — تسديدة مشروعة',railed===3,railed+' / 3');
}
{
 // قطعة لا يكفي مداها لبلوغ أي فم لا تسقط أبدًا
 let ghost=0,tot=0;
 for(let a=0;a<360;a+=10){
  tot++;
  const r=shoot([at(200,200,Math.cos(a*Math.PI/180)*0.35,Math.sin(a*Math.PI/180)*0.35)]);
  if(r.pot.length)ghost++;
 }
 ck('قطعة لا يبلغ مداها أي فم لا تسقط أبدًا',ghost===0,ghost+' / '+tot);
}

console.log('\n── لا اختراق مهما زادت القوّة ──');
{
 let missed=0,tot=0;
 for(let sp=10;sp<=80;sp+=5){
  tot++;
  const dir=Math.atan2(-1,-1);
  const r=shoot([at(240,240,Math.cos(dir)*sp,Math.sin(dir)*sp,'s')]);
  if(!r.pot.includes('s'))missed++;
 }
 ck('سرعة حتى 80 وحدة/إطار لا تقفز فوق الجيب',missed===0,missed+' من '+tot+' أخطأت');
}
{
 let out=0;
 for(let a=0;a<360;a+=7){
  const r=shoot([at(200,200,Math.cos(a*Math.PI/180)*60,Math.sin(a*Math.PI/180)*60)]);
  for(const p of r.rest)
   if(p.x<-1||p.y<-1||p.x>C.R+1||p.y>C.R+1)out++;
 }
 ck('لا قطعة تخرج من اللوح ولا تختفي بلا جيب',out===0,out+' خرجت');
}

console.log('\n── سلوك يمكن للاعب أن يتوقّعه ──');
{
 const cone=sp=>{
  let lo=null,hi=null;
  for(let e=-40;e<=40;e+=0.5){
   const a=(225+e)*Math.PI/180;
   const r=shoot([at(200,200,Math.cos(a)*sp,Math.sin(a)*sp)]);
   if(r.pot.length){if(lo===null)lo=e;hi=e}
  }
  return lo===null?0:(hi-lo);
 };
 // سرعات تبلغ الزاوية فعلًا: المدى v²/2roll يجب أن يتجاوز 283
 const c3=cone(4.5),c5=cone(5.5),c9=cone(7);
 ck('مخروط القبول موجود عند كل سرعة تبلغ الجيب (كان ±0.5°)',c3>2&&c5>2&&c9>2,
    `4.5→${c3}° · 5.5→${c5}° · 7→${c9}°`);
 // ما يشعر به اللاعب حقًّا: التصويب الصحيح لا يخيب أبدًا مهما كانت القوّة.
 // (المخروط الواسع عند القوّة العالية على لوح خالٍ ارتدادات حقيقية لا خلل.)
 let direct=0,dt=0;
 for(const sp of [4.5,5,5.5,6,6.5,7])for(const e of [-1,-0.5,0,0.5,1]){
  dt++;
  const a=(225+e)*Math.PI/180;
  if(shoot([at(200,200,Math.cos(a)*sp,Math.sin(a)*sp)]).pot.length)direct++;
 }
 ck('التصويب المباشر (±1°) ينجح عند كل قوّة تبلغ الجيب',direct===dt,direct+' / '+dt);
}
{
 const far=(d)=>{
  let n=0;
  for(let e=-20;e<=20;e+=1){
   const a=(225+e)*Math.PI/180;
   const r=shoot([at(d,d,Math.cos(a)*7,Math.sin(a)*7)]);
   if(r.pot.length)n++;
  }
  return n;
 };
 const nearN=far(120), farN=far(300);
 ck('كلّما بعُدت القطعة ضاق هامش الخطأ',nearN>=farN,`قريب ${nearN} · بعيد ${farN}`);
}

console.log('\n── الحتمية ──');
{
 const one=()=>{const s=P.create(P.deal().map(p=>({...p,vx:0,vy:0})));
  P.shoot(s,{x:200,y:360,vx:-2.4,vy:-8.1});return P.run(s)};
 const a=one(),b=one();
 ck('نفس المدخلات تعطي نفس المخرجات بالضبط',
    JSON.stringify(a.rest)===JSON.stringify(b.rest)&&a.frames===b.frames);
}

console.log('\n── الأحداث منفصلة عن الرسم ──');
{
 const s=P.create([at(240,240,-6,-6,'s')]);
 let ev=[],f=0;
 while(!P.settled(s)&&f<3000){ev=ev.concat(P.step(s));f++}
 const kinds=[...new Set(ev.map(e=>e.e))];
 ck('المحرّك يبلّغ بالأحداث ولا يرسم شيئًا',
    kinds.includes('pot')&&typeof P.step==='function'&&
    !/document|canvas|getElementById/.test(fs.readFileSync(SRC,'utf8')),
    kinds.join(','));
}

console.log('\n'+(fail?fail+' فحص فاشل ✗':'فيزياء الكيرم سليمة ✔ ('+pass+' فحصًا)'));
process.exit(fail?1:0);
