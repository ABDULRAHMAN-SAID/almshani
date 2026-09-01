/* ═══════════════════════════════════════════════════════════════════
   فيزياء الكيرم — وحدة خالصة
   ───────────────────────────────────────────────────────────────────
   رياضيات فقط: لا DOM ولا رسم ولا حالة عامّة ولا عشوائية.
   تُختبر في Node وحدها، وتُدمج في الملفّ المنشور عند البناء.

   النموذج:
   • مستوى ثنائي الأبعاد واحد، كل القطع فيه، لا طبقات ولا ارتفاع.
   • الزاوية مقطوعة بوتر مائل ٤٥° كما في اللوح الحقيقي: الحاجزان ينتهيان
     على بُعد MOUTH من الزاوية، وبينهما فتحة الجيب. والجيب وراء الوتر.
     (الحاجزان لو انتهيا على دائرة الجيب لضاقت الفتحة عن الضارب نفسه —
      وهذا ما يفسّر لماذا كان الضارب لا يسقط أبدًا في النسخة القديمة.)
   • الجيب مِجَسّ على الوتر: تُلتقط القطعة إن **عبر مركزها** الوتر خلال
     هذا الإطار — لا إن استقرّ موضعها النهائي خلفه.
   • طرفا الحاجزين كبسولتان مستديرتان، وهما فكّا الجيب اللذان ترتدّ عنهما
     القطعة إن «لعقت الحافة» ولم تدخل.
   • خطوات فرعية: لا تتجاوز الإزاحة الواحدة MAX_STEP، فلا قفز فوق جيب
     ولا اختراق قطعة مهما زادت القوّة.
   • المخرجات أحداث: السقوط والاصطدام يُبلَّغ عنهما، والرسم شأن غيرها.
   ═══════════════════════════════════════════════════════════════════ */

var CarromPhysics=(function(){
 'use strict';

 /* ── ثوابت اللوح ──
    نصف قطر الجيب مقاس من صورة اللوح المرجعية: 0.0471 من ضلع الساحة. */
 var C={
  R:400,                 // ضلع ساحة اللعب
  pieceR:13,             // نصف قطر القطعة
  strikerR:16.5,         // نصف قطر الضارب
  mouth:29,              // قطع الحاجز عند الزاوية — عرض الفتحة = mouth·√2
  jawR:2,                // استدارة فكّ الجيب
  /* احتكاكان كما في اللوح الحقيقي:
     • هوائي نسبيّ (ضرب) — يخفّف السرعات العالية.
     • احتكاك انزلاق ثابت (طرح) — هو الذي يوقف القطعة وقفةً نظيفة.
     الأول وحده لا يُوقف شيئًا أبدًا: يقارب الصفر ولا يبلغه، فتزحف القطعة
     دقائق بسرعة لا تُرى. */
  drag:1,                // احتكاك نسبيّ لكل إطار
  roll:0.026,            // احتكاك انزلاق ثابت لكل إطار
  stopSpeed:0.05,        // دون هذا تُعدّ ساكنة
  wallE:0.72,            // ارتداد الجدار
  pieceE:0.86,           // ارتداد بين القطع
  strikerMass:1.5,
  maxStep:3.5,           // أقصى إزاحة لكل خطوة فرعية
  maxSub:12              // سقف الخطوات الفرعية في الإطار
 };

 /** مراكز الجيوب الأربعة — زوايا الساحة تمامًا */
 function pockets(){
  return [[0,0],[C.R,0],[0,C.R],[C.R,C.R]];
 }

 /** نصف قطر الفم كما يجب أن يُرسم — الوتر يبعد mouth/√2 عن الزاوية */
 function visualR(){return C.mouth/Math.SQRT2}

 /** بُعد القطعة عن وتر أقرب زاوية — سالب يعني أنّها عبرت إلى الجيب */
 function chordDepth(x,y){
  var R=C.R, best=1e9, which=-1;
  var uv=[[x,y,0],[R-x,y,1],[x,R-y,2],[R-x,R-y,3]];
  for(var i=0;i<4;i++){
   var d=uv[i][0]+uv[i][1]-C.mouth;
   if(d<best){best=d;which=uv[i][2]}
  }
  return {d:best,pocket:which};
 }

 /** الحاجزان: قطع مستقيمة مقطوعة عند الزوايا — عند الفم فراغ حقيقي */
 function walls(){
  var g=C.mouth, R=C.R;
  return [
   {ax:g,ay:0,  bx:R-g,by:0  },   // سفلي
   {ax:g,ay:R,  bx:R-g,by:R  },   // علوي
   {ax:0,ay:g,  bx:0,  by:R-g},   // أيسر
   {ax:R,ay:g,  bx:R,  by:R-g}    // أيمن
  ];
 }

 /** أقرب نقطة على قطعة مستقيمة إلى نقطة */
 function closestOnSeg(px,py,ax,ay,bx,by){
  var dx=bx-ax, dy=by-ay, L2=dx*dx+dy*dy;
  if(L2===0)return [ax,ay];
  var t=((px-ax)*dx+(py-ay)*dy)/L2;
  t=t<0?0:(t>1?1:t);
  return [ax+t*dx, ay+t*dy];
 }

 /** أصغر مسافة بين قطعة مستقيمة ونقطة — لاختبار عبور مسار القطعة للجيب */
 function segPointDist2(ax,ay,bx,by,px,py){
  var c=closestOnSeg(px,py,ax,ay,bx,by);
  var dx=px-c[0], dy=py-c[1];
  return dx*dx+dy*dy;
 }

 /** لوح ابتدائي: الملكة في القلب وحلقتان حولها — ترتيب ثابت لا عشوائي */
 function deal(){
  var P=[], cx=C.R/2, cy=C.R/2;
  P.push({x:cx,y:cy,t:'q'});
  for(var ring=0;ring<2;ring++){
   var n=ring?12:6, rad=ring?C.pieceR*4.1:C.pieceR*2.1;
   for(var i=0;i<n;i++){
    var a=(i/n)*Math.PI*2+(ring?0.26:0);
    P.push({x:cx+Math.cos(a)*rad, y:cy+Math.sin(a)*rad, t:(i%2?'w':'b')});
   }
  }
  return P;
 }

 /** حالة محاكاة جديدة من مواضع القطع */
 function create(pieces){
  return {
   pcs:(pieces||[]).map(function(p){
    return {x:p.x,y:p.y,vx:p.vx||0,vy:p.vy||0,t:p.t,
            r:(p.r!=null?p.r:(p.t==='s'?C.strikerR:C.pieceR))};
   }),
   pot:[], drop:[], events:[], frame:0
  };
 }

 /** يضيف الضارب بسرعته — نقطة الدخول الوحيدة لبدء ضربة */
 function shoot(S,shot){
  S.pcs.push({x:shot.x,y:shot.y,vx:shot.vx,vy:shot.vy,t:'s',r:C.strikerR});
  return S;
 }

 /* ── خطوة فرعية واحدة ── */
 function substep(S,h){
  var ps=S.pcs, i, j, P=pockets(), W=walls();

  for(i=ps.length-1;i>=0;i--){
   var p=ps[i];
   var x0=p.x, y0=p.y;
   p.x+=p.vx*h; p.y+=p.vy*h;

   // ① عبور الوتر = سقوط. يُختبر على طرفَي المسار لأنّ العمق خطّي عليه،
   //    فلا يمكن أن تقفز قطعة فوق الفم مهما زادت سرعتها.
   var c0=chordDepth(x0,y0), c1=chordDepth(p.x,p.y);
   var cross=(c0.d<0)?c0:((c1.d<0)?c1:null);
   if(cross){
    S.pot.push(p.t);
    S.drop.push({t:p.t,r:p.r,x:p.x,y:p.y,
                 px:P[cross.pocket][0],py:P[cross.pocket][1],f:0});
    S.events.push({e:'pot',t:p.t,pocket:cross.pocket,speed:Math.hypot(p.vx,p.vy)});
    ps.splice(i,1);
    continue;
   }

   // ② الجدران المقطوعة — وطرفاها فكّا الجيب
   for(var w=0;w<W.length;w++){
    var s=W[w];
    var c=closestOnSeg(p.x,p.y,s.ax,s.ay,s.bx,s.by);
    var dx=p.x-c[0], dy=p.y-c[1];
    var d=Math.hypot(dx,dy), min=p.r+C.jawR;
    if(d<min&&d>0){
     var nx=dx/d, ny=dy/d;
     p.x=c[0]+nx*min; p.y=c[1]+ny*min;
     var vn=p.vx*nx+p.vy*ny;
     if(vn<0){
      p.vx-=(1+C.wallE)*vn*nx;
      p.vy-=(1+C.wallE)*vn*ny;
      S.events.push({e:'wall',t:p.t,speed:Math.abs(vn)});
     }
    }
   }
  }

  // ③ اصطدامات مرنة بين القطع
  for(i=0;i<ps.length;i++)for(j=i+1;j<ps.length;j++){
   var a=ps[i], b=ps[j];
   var ddx=b.x-a.x, ddy=b.y-a.y, dd=Math.hypot(ddx,ddy), mn=a.r+b.r;
   if(dd===0){ddx=0.01;dd=0.01}
   if(dd<mn){
    var ux=ddx/dd, uy=ddy/dd, ov=(mn-dd)/2;
    a.x-=ux*ov; a.y-=uy*ov; b.x+=ux*ov; b.y+=uy*ov;
    var rvx=b.vx-a.vx, rvy=b.vy-a.vy, sep=rvx*ux+rvy*uy;
    if(sep<0){
     var ma=a.t==='s'?C.strikerMass:1, mb=b.t==='s'?C.strikerMass:1;
     var imp=-(1+C.pieceE)*sep/(1/ma+1/mb);
     a.vx-=imp*ux/ma; a.vy-=imp*uy/ma;
     b.vx+=imp*ux/mb; b.vy+=imp*uy/mb;
     S.events.push({e:'hit',a:a.t,b:b.t,speed:Math.abs(sep)});
    }
   }
  }
 }

 /**
  * إطار واحد. يقسّمه إلى خطوات فرعية بحيث لا تتجاوز أي إزاحة MAX_STEP،
  * فلا قفز فوق جيب ولا اختراق قطعة مهما زادت القوّة.
  * يعيد أحداث الإطار، والرسم شأن غيره.
  */
 function step(S){
  S.events=[];
  var fast=0;
  for(var i=0;i<S.pcs.length;i++){
   var v=Math.hypot(S.pcs[i].vx,S.pcs[i].vy);
   if(v>fast)fast=v;
  }
  var n=Math.min(C.maxSub, Math.max(1, Math.ceil(fast/C.maxStep)));
  var h=1/n;
  for(var k=0;k<n;k++)substep(S,h);

  // الاحتكاك مرّة واحدة لكل إطار — فلا يتغيّر المدى بتغيّر عدد الخطوات
  for(var j=0;j<S.pcs.length;j++){
   var p=S.pcs[j], v=Math.hypot(p.vx,p.vy);
   if(v===0)continue;
   var nv=v*C.drag-C.roll;                 // نسبيّ ثمّ ثابت
   if(nv<=C.stopSpeed){p.vx=0;p.vy=0;continue}
   p.vx=p.vx/v*nv; p.vy=p.vy/v*nv;
  }
  for(var d=0;d<S.drop.length;d++)
   if(S.drop[d].f<1)S.drop[d].f=Math.min(1,S.drop[d].f+0.021);
  S.frame++;
  return S.events;
 }

 /** هل استقرّ اللوح؟ الحركة والسقوط كلاهما يمنع الاستقرار */
 function settled(S){
  for(var i=0;i<S.pcs.length;i++)
   if(Math.abs(S.pcs[i].vx)+Math.abs(S.pcs[i].vy)>C.stopSpeed)return false;
  for(var d=0;d<S.drop.length;d++)if(S.drop[d].f<1)return false;
  return true;
 }

 /** يشغّل المحاكاة حتى تستقرّ — للاختبار والذكاء الآلي، لا للرسم */
 function run(S,maxFrames){
  var lim=maxFrames||6000, f=0;
  while(f<lim&&!settled(S)){step(S);f++}
  return {frames:f,pot:S.pot.slice(),rest:S.pcs};
 }

 return {C:C,pockets:pockets,walls:walls,visualR:visualR,chordDepth:chordDepth,
         deal:deal,create:create,shoot:shoot,step:step,settled:settled,run:run,
         closestOnSeg:closestOnSeg,segPointDist2:segPointDist2};
})();
