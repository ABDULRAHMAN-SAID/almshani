#!/usr/bin/env node
/**
 * مسبار فيزياء الكيرم — أرقامٌ لا انطباعات.
 *
 *   node tools/probe-carrom-physics.cjs
 *
 * الوحدة خالصة فتُشغَّل في Node وحدها. يقيس ما يشتكي منه اللاعب حين يقول
 * «الفيزياء سيّئة» دون أن يستطيع تسميته:
 *   • تقاسم السرعة في اصطدامٍ مباشر: كم يحتفظ الضارب وكم تأخذ القطعة؟
 *     (على لوحٍ حقيقيّ الضارب أثقل ≈٢٫٧ مرّة فيواصل بعد الضربة)
 *   • مسافة التوقّف مقابل سرعة الإطلاق — خطّيةٌ كما في احتكاك كولوم؟
 *   • الارتداد عن الحاجز: نسبة السرعة المتبقّية
 *   • هل يخترق الضارب قطعةً أو يقفز فوق جيبٍ عند أقصى قوّة؟
 *   • كم إطارًا حتى يستقرّ اللوح بعد ضربةٍ قويّة (طول «الانتظار»)
 * يُشغَّل قبل أيّ تعديلٍ وبعده، والفرق هو الحكم.
 */
const fs=require('fs'),path=require('path'),vm=require('vm');
const ROOT=path.join(__dirname,'..');
const src=fs.readFileSync(path.join(ROOT,'src','games','carrom','physics.js'),'utf8');
const ctx={};vm.createContext(ctx);vm.runInContext(src+';this.CarromPhysics=CarromPhysics;',ctx);
const PH=ctx.CarromPhysics,C=PH.C;
const f=(n,d=2)=>Number(n).toFixed(d);

console.log('ثوابت:',JSON.stringify({strikerMass:C.strikerMass,pieceE:C.pieceE,wallE:C.wallE,roll:C.roll,drag:C.drag,maxStep:C.maxStep,maxSub:C.maxSub}));

// ١) اصطدام مباشر: الضارب يضرب قطعة ساكنة في وسط اللوح
{
 const S=PH.create([{x:200,y:200,t:'w'}]);
 PH.shoot(S,{x:200,y:300,vx:0,vy:-8});
 let first=null;
 for(let i=0;i<200&&!first;i++){const ev=PH.step(S);const h=ev.find(e=>e.e==='hit');if(h){first={frame:i,ev:h};}}
 const s=S.pcs.find(p=>p.t==='s'),w=S.pcs.find(p=>p.t==='w');
 const vs=s?Math.hypot(s.vx,s.vy):0,vw=w?Math.hypot(w.vx,w.vy):0;
 // النظريّ لاصطدامٍ مباشر بمعامل e وكتلتين m1 (ضارب) m2=1:
 const m1=C.strikerMass,e=C.pieceE,u=8;
 const v1=(m1-e)/(m1+1)*u, v2=m1*(1+e)/(m1+1)*u;
 console.log(`\n١) اصطدام مباشر (u=${u}): الضارب بعده ${f(vs)} · القطعة ${f(vw)}  — النظريّ ${f(v1)} / ${f(v2)} · نسبة احتفاظ الضارب ${f(vs/u*100,0)}٪`);
 console.log(`   بكتلة ٢٫٧ (الحقيقية) كان سيحتفظ بـ${f((2.7-e)/(3.7)*100,0)}٪ ويعطي القطعة ${f(2.7*(1+e)/3.7*u)}`);
}

// ٢) مسافة التوقّف مقابل السرعة — طول المسار مُجمَّعًا، لأنّ اللوح ٤٠٠ وحدة
//    والضارب يرتدّ عن الحاجز فيخدع قياسُ الإزاحة
{
 const rows=[];
 for(const u of [2,4,6,8,10,12]){
  const S=PH.create([]);PH.shoot(S,{x:200,y:380,vx:0,vy:-u});
  let fr=0,len=0;
  while(!PH.settled(S)&&fr<3000){const s=S.pcs[0];const v=Math.hypot(s.vx,s.vy);len+=v;PH.step(S);fr++}
  rows.push(`u=${u}: ${f(len,0)} وحدة (${f(len/C.R,1)} لوح) في ${fr} إطار`);
 }
 console.log('\n٢) مسافة التوقّف:',rows.join(' · '));
 console.log('   (كولوم: المسافة ∝ u² — فالنسبة بين u=4 وu=8 يجب أن تكون ≈٤)');
}

// ٣) ارتداد عن الحاجز
{
 const S=PH.create([]);PH.shoot(S,{x:200,y:60,vx:0,vy:-6});
 let bounce=null;for(let i=0;i<60&&!bounce;i++){const ev=PH.step(S);if(ev.find(e=>e.e==='wall'))bounce=i}
 const s=S.pcs.find(p=>p.t==='s');
 console.log(`\n٣) حاجز: ارتدّ في الإطار ${bounce} · سرعة بعده ${f(Math.hypot(s.vx,s.vy))} من 6 (wallE=${C.wallE})`);
}

// ٤) اختراق/قفز عند أقصى قوّة: ضارب بسرعة عالية نحو قطعة ثم نحو جيب
{
 let leak=0,tunnel=0;
 for(const u of [14,18,22,26,30]){
  const S=PH.create([{x:200,y:150,t:'b'}]);PH.shoot(S,{x:200,y:380,vx:0,vy:-u});
  let hit=false;for(let i=0;i<80;i++){const ev=PH.step(S);if(ev.find(e=>e.e==='hit'))hit=true}
  if(!hit)tunnel++;
  const S2=PH.create([]);PH.shoot(S2,{x:60,y:340,vx:-u*0.7071,vy:-u*0.7071});
  let pot=false;for(let i=0;i<120;i++){const ev=PH.step(S2);if(ev.find(e=>e.e==='pot'))pot=true}
  const s=S2.pcs.find(p=>p.t==='s');
  if(!pot&&s&&(s.x<0||s.y<0))leak++;
 }
 console.log(`\n٤) عند السرعات 14–30: اختراق قطعة ${tunnel}/5 · تسرّب خارج اللوح ${leak}/5`);
}

// ٥) زمن الاستقرار بعد ضربة الافتتاح
{
 const S=PH.create(PH.deal());PH.shoot(S,{x:200,y:360,vx:0,vy:-14});
 const r=PH.run(S,6000);
 console.log(`\n٥) ضربة افتتاح u=14: استقرّ بعد ${r.frames} إطارًا (${f(r.frames/60,1)} ث) · سقط: ${r.pot.join(',')||'لا شيء'}`);
}
