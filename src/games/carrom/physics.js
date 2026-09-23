/* ═══════════════════════════════════════════════════════════════════
   فيزياء الكيرم — وحدة خالصة
   ───────────────────────────────────────────────────────────────────
   رياضيات فقط: لا DOM ولا رسم ولا حالة عامّة ولا عشوائية.
   تُختبر في Node وحدها، وتُدمج في الملفّ المنشور عند البناء.

   النموذج:
   • مستوى ثنائي الأبعاد واحد، كل القطع فيه، لا طبقات ولا ارتفاع.
   • ٦٫٧٠ — الجيوب كما في اللعبة المرجعيّة: دائرةٌ كاملة داخل الساحة تمسّ الحاجزين،
     مركزها زاوية مربّع الـ٤٠٠ ونصف قطرها ٢٢، والحاجزان مستقيمان متّصلان على بُعد
     ٢٤٫٥ خارج المربّع (قِيس من الفيديو: بين مراكز الجيوب ٤٥٦ بكسلًا، ونصف قطر الجيب ٢٥،
     وبين الحاجز ومركز الجيب ٢٨). كان الجيب ربعَ دائرةٍ في الزاوية وراء وترٍ مائل، وطرفا
     الحاجزين فكّان يردّان كلّ قطعةٍ تزحف على الحافّة — «أحسّ في غلط في دخول القطع إلى
     الحفرة… في الكيرم الثانية أدخل بكلّ سهولة».
   • تسقط القطعة إن مرّ مركزها في هذا الإطار فوق فم الجيب (دون capR من مركزه) —
     يُختبر على المسار كلّه لا على موضعها الأخير، فلا تقفز قطعةٌ سريعة فوق الجيب.
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
  /* ٦٫٤٩: مقيسان من فيديو المالك بكشف الدوائر (مسافة الجيوب ٤٥٦ بكسلًا = ٤٠٠ وحدة):
     القطعة ١٣٫٥ بكسل ⇒ ١١٫٨ وحدة، والضارب ≈ ١٥٫٤. كانتا ١٣ و١٦٫٥ فبدا اللوح مزدحمًا. */
  pieceR:12,             // نصف قطر القطعة
  strikerR:15.5,         // نصف قطر الضارب
  pocketR:22,            // نصف قطر الجيب (المرسوم) — مقيس من الفيديو
  capR:21,               // يسقط ما صار مركزه فوق الجيب: دون هذا من مركزه
  rail:24.5,             // الحاجز خارج مربّع مراكز الجيوب بهذا القدر
  jawR:0,                // لا فكوك (٦٫٧٠) — يبقى للتوافق مع من يقرؤه
  /* احتكاكان كما في اللوح الحقيقي:
     • هوائي نسبيّ (ضرب) — يخفّف السرعات العالية.
     • احتكاك انزلاق ثابت (طرح) — هو الذي يوقف القطعة وقفةً نظيفة.
     الأول وحده لا يُوقف شيئًا أبدًا: يقارب الصفر ولا يبلغه، فتزحف القطعة
     دقائق بسرعة لا تُرى. */
  /* ٦٫٤٧: مقيسان من تتبّع القطع في فيديوٍ أرسله المالك (٦٠ إطارًا/ث):
     تباطؤ القطعة ≈ ١٩٠ + ٠٫٣٥·v وحدة/ث² — ثابتٌ (كولوم) مع قليلٍ من السحب النسبيّ.
     كان roll=0.026 (٩٣ وحدة/ث²) فتطفو القطع ثلاثة أضعاف ما ينبغي. */
  drag:0.994,            // احتكاك نسبيّ لكل إطار (٠٫٣٥/ث)
  roll:0.053,            // احتكاك انزلاق ثابت لكل إطار (١٩٠ وحدة/ث²)
  stopSpeed:0.05,        // دون هذا تُعدّ ساكنة
  /* ارتداد الجدار: ٠٫٧٢ تقديرٌ قديم. قِيس ٦٫٥٨ من الفيديو المرجعيّ بمطابقة مسار الضارب كلّه (٧٧ إطارًا، ارتدادٌ واحد):
     ٠٫٨٦ بالاحتكاك الحاليّ، و٠٫٧٦ إن تُرك الاحتكاك حرًّا — فوسطهما */
  wallE:0.80,
  /* ٦٫٥٠ — مقيسان من فيديو المالك (ضربة الخصم عند ٤٫٨٣ ث، تتبّع إطارًا إطارًا بـ٦٠ إطارًا/ث):
     الضارب قبل التماسّ ١٦٫٩ وحدة/إطار؛ بعده القطعة ١٤٫٤ في اتّجاه الاصطدام والضارب ٣٫٣٥ فقط.
     حفظ الزخم والارتداد يعطيان: الضارب ≈ ١٫٣ قطعة، والارتداد ≈ ٠٫٧٨.
     كانا ٢٫٧ و٠٫٨٦ — فكانت القطعة تنطلق أسرع بـ٣٥٪ وتذهب قرابة ضعف المسافة، والضارب يشقّ
     الكومة ويمضي. ذاك ما وصفه المالك: «السرعة والفيزياء». */
  pieceE:0.78,           // ارتداد بين القطع
  strikerMass:1.32,      // كتلة الضارب نسبةً إلى القطعة — كما في الفيديو المرجعيّ
  maxStep:3.5,           // أقصى إزاحة لكل خطوة فرعية
  maxSub:12              // سقف الخطوات الفرعية في الإطار
 };

 /** مراكز الجيوب الأربعة — زوايا الساحة تمامًا */
 function pockets(){
  return [[0,0],[C.R,0],[0,C.R],[C.R,C.R]];
 }

 /** نصف قطر الجيب كما يُرسم */
 function visualR(){return C.pocketR}

 /** بُعد مركز القطعة عن فم أقرب جيب — سالب يعني أنّها فوقه */
 function chordDepth(x,y){
  var R=C.R, best=1e9, which=-1;
  var P=pockets();
  for(var i=0;i<4;i++){
   var d=Math.hypot(x-P[i][0],y-P[i][1])-C.capR;
   if(d<best){best=d;which=i}
  }
  return {d:best,pocket:which};
 }

 /** الحاجزان: أربعة مستقيمات متّصلة خارج مربّع مراكز الجيوب */
 function walls(){
  var e=-C.rail, f=C.R+C.rail;
  return [
   {ax:e,ay:e,bx:f,by:e},   // سفلي
   {ax:e,ay:f,bx:f,by:f},   // علوي
   {ax:e,ay:e,bx:e,by:f},   // أيسر
   {ax:f,ay:e,bx:f,by:f}    // أيمن
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

   // ① مركزها مرّ فوق فم جيب = سقوط — على المسار كلّه، فلا تقفز قطعةٌ فوق الجيب مهما أسرعت
   var cross=null;
   for(var q=0;q<4&&!cross;q++)if(segPointDist2(x0,y0,p.x,p.y,P[q][0],P[q][1])<C.capR*C.capR)cross={pocket:q};
   if(cross){
    S.pot.push(p.t);
    // ox/oy/fr: موضع القطعة قبل هذه الخطوة ورقمها — يستعملها العرض ليستوفي إطار الدخول
    //           إلى الجيب فلا تقفز القطعة (٦٫٤٥)؛ لا أثر لها في المحاكاة نفسها
    S.drop.push({t:p.t,r:p.r,x:p.x,y:p.y,
                 ox:(p.px!=null?p.px:x0),oy:(p.py!=null?p.py:y0),fr:S.frame,
                 px:P[cross.pocket][0],py:P[cross.pocket][1],f:0});
    S.events.push({e:'pot',t:p.t,pocket:cross.pocket,speed:Math.hypot(p.vx,p.vy)});
    ps.splice(i,1);
    continue;
   }

   // ② الجدران
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
