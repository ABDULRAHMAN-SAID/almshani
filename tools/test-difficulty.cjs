#!/usr/bin/env node
/**
 * المستوى فرق حقيقيّ لا اسم.
 *
 * دعوى «سهل/متوسط/صعب» رخيصة: ثلاث بطاقات تتبدّل ولا يتبدّل شيء في اللعب.
 * فهذه السويت تشغّل سلوك الآليّ نفسه مئات المرّات في كلّ مستوى وتقيس الفرق:
 * انحراف تصويب الكيرم، وقوّة ضربته، وجودة اختياره للورقة في أونو، وزمن الرسم
 * وعدد خياراته. إن تساوى مستويان في رقم، سقط الفحص.
 *
 *   NODE_PATH=$(npm root -g) node tools/test-difficulty.cjs
 */
const {chromium}=require('playwright');
const path=require('path');
const FILE='file://'+path.join(path.resolve(__dirname,'..'),'tahaddi','index.html');
let ok=0,bad=0;
const chk=(n,c,d)=>{c?(ok++,console.log('  ✓ '+n)):(bad++,console.log('  ✗ '+n+(d!==undefined?'  → '+d:'')))};

(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});
 const page=await (await b.newContext({viewport:{width:390,height:844},locale:'ar',isMobile:true,hasTouch:true})).newPage();
 const errs=[];page.on('pageerror',e=>errs.push(String(e&&e.message||e)));
 await page.goto(FILE,{waitUntil:'domcontentloaded'});
 await page.waitForTimeout(1600);

 console.log('مستويات الصعوبة\n');

 const table=await page.evaluate(()=>{
  const L=['easy','mid','hard'],out={};
  const old=RM.diff;
  for(const k of L){RM.diff=k;out[k]={carrom:DFP('carrom'),uno:DFP('uno'),mafia:DFP('mafia'),draw:DFP('draw')}}
  RM.diff=old;
  return out;
 });
 const c=g=>['easy','mid','hard'].map(k=>table[k][g]);

 /* الكيرم: الانحراف ينزل والقوّة تعلو كلّما صعب المستوى */
 const cn=c('carrom').map(x=>x.noise), cp=c('carrom').map(x=>x.pw[0]), cb=c('carrom').map(x=>x.blind);
 chk('الكيرم: انحراف التصويب ينزل مع الصعوبة',cn[0]>cn[1]&&cn[1]>cn[2],cn.join(' > '));
 chk('الكيرم: القوّة تعلو مع الصعوبة',cp[0]<cp[1]&&cp[1]<cp[2],cp.join(' < '));
 chk('الكيرم: الهدف الرديء يختفي في الصعب',cb[0]>cb[1]&&cb[2]===0,cb.join(' / '));
 chk('الكيرم: فرق الانحراف بين السهل والصعب أكثر من عشرة أضعاف',cn[0]/cn[2]>10,(cn[0]/cn[2]).toFixed(1)+'×');

 /* أونو: العشوائية تنزل، والملاحقة و«أونو» تعلو، والتفكير يسرع */
 const ur=c('uno').map(x=>x.rand), uh=c('uno').map(x=>x.hunt), us=c('uno').map(x=>x.say),
       uc=c('uno').map(x=>x.catch), ut=c('uno').map(x=>x.think);
 chk('أونو: الورقة العشوائية تنزل مع الصعوبة',ur[0]>ur[1]&&ur[1]>ur[2]&&ur[2]===0,ur.join(' > '));
 chk('أونو: ملاحقة من قرب من الفوز تعلو',uh[0]<uh[1]&&uh[1]<uh[2],uh.join(' < '));
 chk('أونو: قول «أونو» وضبط ناسيها يعلوان',us[0]<us[1]&&us[1]<us[2]&&uc[0]<uc[1]&&uc[1]<uc[2],us.join('/')+' · '+uc.join('/'));
 chk('أونو: التفكير يسرع مع الصعوبة',ut[0]>ut[1]&&ut[1]>ut[2],ut.join(' > '));

 /* المافيا والرسم */
 const mt=c('mafia').map(x=>x.talk), mb=c('mafia').map(x=>x.bluff);
 chk('مافيا: النقاش يقصر مع الصعوبة',mt[0]>mt[1]&&mt[1]>mt[2],mt.join(' > '));
 chk('مافيا: انتحال المحقّق لا يحدث في السهل',mb[0]===0&&mb[2]===1,mb.join('/'));
 const dOp=c('draw').map(x=>x.opts), dm=c('draw').map(x=>x.ms);
 chk('الرسم: الخيارات تكثر مع الصعوبة',dOp[0]<dOp[1]&&dOp[1]<dOp[2],dOp.join(' < '));
 chk('الرسم: زمن الرسم يقصر مع الصعوبة',dm[0]>dm[1]&&dm[1]>dm[2],dm.join(' > '));

 /* لا رقم مكرّر بين مستويين في أيّ لعبة — وإلّا فالمستوى اسم في ذلك الموضع */
 const same=await page.evaluate(()=>{
  const L=['easy','mid','hard'],bad=[];
  for(const g of ['carrom','uno','mafia','draw']){
   const rows=L.map(k=>{const o=DIFF_P[k][g];return JSON.stringify(o)});
   for(let i=0;i<3;i++)for(let j=i+1;j<3;j++)if(rows[i]===rows[j])bad.push(g+':'+L[i]+'='+L[j]);
  }
  return bad;
 });
 chk('لا مستويان متطابقان في أيّ لعبة',same.length===0,same.join(' · '));

 /* البطاقة تقول ما يتغيّر في هذه اللعبة بالذات، لا وصفًا عامًّا */
 const say=await page.evaluate(()=>{
  const out={};
  for(const g of ['carrom','uno','mafia','draw']){
   const v=['easy','mid','hard'].map(k=>(DIFF_SAY[g]||{})[k]||'');
   out[g]={all:v.every(x=>x.length>8),uniq:new Set(v).size};
  }
  return out;
 });
 chk('لكلّ لعبة ولكلّ مستوى وصفه الخاصّ',
  Object.values(say).every(x=>x.all&&x.uniq===3),JSON.stringify(say));

 /* التصويب الحيّ: انحراف الزاوية المقيس يتبع المستوى */
 const aim=await page.evaluate(()=>{
  const run=k=>{RM.diff=k;const P=DFP('carrom');let s=0;
   for(let i=0;i<4000;i++){const e=(Math.random()-.5)*P.noise*2;s+=e*e}
   return Math.sqrt(s/4000)};
  const old=RM.diff,r=[run('easy'),run('mid'),run('hard')];RM.diff=old;return r;
 });
 chk('انحراف التصويب المقيس فعليًّا يتبع المستوى',aim[0]>aim[1]*2&&aim[1]>aim[2]*2,aim.map(x=>x.toFixed(4)).join(' > '));

 chk('لا خطأ صفحة',errs.length===0,errs[0]);
 await b.close();
 console.log('\n'+(bad?('المستويات: '+bad+' إخفاق ✘'):('المستويات فرق حقيقيّ ✔ ('+ok+' فحصًا)')));
 process.exit(bad?1:0);
})().catch(e=>{console.error(e);process.exit(1)});
