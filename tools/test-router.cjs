#!/usr/bin/env node
/**
 * اختبار نواة التنقّل في Node — النصّ نفسه الذي يُحقن في اللعبة.
 *   node tools/test-router.cjs
 */
const fs=require('fs'),path=require('path');
const SRC=path.join(__dirname,'..','src','navigation','router.js');
function load(){return (0,eval)(fs.readFileSync(SRC,'utf8')+';Router')}

let pass=0,fail=0;
const check=(name,ok,info)=>{if(ok){pass++;console.log('  ✓ '+name)}else{fail++;console.log('  ✗ '+name+(info?'  → '+info:''))}};
const sec=t=>console.log('\n── '+t+' ──');

/** بيئة وهمية: صفحة وسجل متصفح */
function world(){
 const R=load();const log=[];const rendered=[];const bars=[];
 let y=0,pending=0,hist=0,t=1000,backs=0,went=0;
 const H={
  resolve:()=>null,
  fail:(fn,e)=>log.push('fail:'+fn),
  scrollY:()=>y, restore:v=>{y=v;log.push('restore:'+v)},
  bar:(show,fn)=>bars.push((show?'+':'-')+fn),
  root:()=>log.push('root'),
  confirmLeave:proceed=>{log.push('confirm');H._proceed=proceed},
  history:{pushState(){hist++},replaceState(){},back(){backs++},go(d){went=d}},
  atRoot:()=>log.push('atRoot'),
  window:{addEventListener(ev,f){H._pop=f}},
  now:()=>t
 };
 R.init(H);
 const scr=n=>R.register(n,{render:a=>rendered.push(n+(a!==undefined?':'+JSON.stringify(a):''))});
 ['root','a','b','c','d'].forEach(scr);
 return {R,H,log,rendered,bars,setY:v=>{y=v},getY:()=>y,tick:ms=>{t+=ms},hist:()=>hist,backs:()=>backs,went:()=>went,
  flush:()=>{while(pending>0){pending--;H._pop()}},pending:()=>pending,fns:()=>R.stack.map(f=>f.fn).join('>')};
}

sec('الدفع والرجوع واستعادة التمرير');
{
 const w=world();const {R}=w;
 R.reset('root');w.setY(0);R.push('a');w.setY(600);R.push('b');
 check('الدفع يرسم ويكدّس',w.fns()==='root>a>b'&&w.rendered.join()==='root,a,b',w.fns());
 R.back();
 check('الرجوع يعيد الشاشة السابقة ويستعيد موضع تمريرها',w.fns()==='root>a'&&w.getY()===600&&w.rendered.pop()==='a',w.log.join());
 w.setY(900);R.push('c');R.back();
 check('كل إطار يحفظ تمريره هو',w.getY()===900);
}

sec('الجذر');
{
 const w=world();const {R}=w;
 R.reset('root');R.back();
 check('الرجوع من الجذر يسلّم للتبويب لا يترك المكدّس فارغًا بلا شيء',w.log.includes('root')&&R.depth()===0);
 const w2=world();w2.R.reset('root');['a','b','c','d','a'].forEach(n=>w2.R.push(n));
 let threw=false;try{for(let i=0;i<20;i++)w2.R.back()}catch(e){threw=true}
 check('عشرون رجوعًا من أي عمق تنتهي بالجذر بلا استثناء',!threw&&w2.R.depth()===0&&w2.log.filter(x=>x==='root').length>=1);
}

sec('الضغطة المزدوجة');
{
 const w=world();const {R}=w;
 R.reset('root');R.push('a');R.push('a');
 check('ضغطتان متتاليتان على الزرّ نفسه = إطار واحد',w.fns()==='root>a');
 w.tick(500);R.push('a');
 check('وبعد نصف ثانية تُقبل من جديد',w.fns()==='root>a>a');
 R.reset('root');R.push('c',1);R.push('c',2);
 check('الشاشة نفسها بوسيط مختلف ليست تكرارًا',w.fns()==='root>c>c');
 R.reset('root');R.push('a');R.back();R.push('a');
 check('الرجوع ثم الدفع نفسه ليس تكرارًا',w.fns()==='root>a');
}

sec('التدفّقات الحيّة');
{
 const w=world();const {R}=w;let left=0;
 R.register('live',{bar:false,leave:done=>{left++}});
 R.reset('root');R.push('a');R.enter('live');
 check('enter يكدّس بلا رسم ويُخفي الشريط',w.fns()==='root>a>live'&&w.rendered.join()==='root,a'&&w.bars.pop()==='-live');
 R.back();
 check('الرجوع داخل تدفّق يسأل التدفّق ولا يسحب',left===1&&w.fns()==='root>a>live');
 R.back(true);
 check('back(true) يسحب فعلًا ويعيد الشريط',w.fns()==='root>a'&&w.bars.pop()==='+a');
 R.enter('live');R.enter('live');
 check('الإطار نفسه مرّتين = مرّة',w.fns()==='root>a>live');
 R.enter('m2',null,{replace:true});
 check('replace يحلّ محلّ إطار التدفّق',w.fns()==='root>a>m2');
}

sec('exit و settle');
{
 const w=world();const {R}=w;
 R.reset('root');R.push('a');R.enter('flow');
 check('exit يطرح التدفّق ويرسم ما تحته',R.exit('flow')&&w.fns()==='root>a'&&w.rendered.pop()==='a');
 check('exit لاسم غائب يعيد false ولا يمسّ شيئًا',R.exit('zzz')===false&&w.fns()==='root>a');
 R.enter('flow');R.settle('a');
 check('settle يرجع إلى الشاشة إن كانت تحت التدفّق',w.fns()==='root>a');
 R.enter('flow');R.settle('c');
 check('settle يحلّ محلّ التدفّق إن لم تكن الشاشة تحته',w.fns()==='root>a>c');
 R.settle('d');
 check('settle فوق شاشة عادية يدفع ولا يطرحها',w.fns()==='root>a>c>d');
 w.setY(300);R.push('b');R.settle('root');
 check('settle يستعيد تمرير الشاشة التي هبط عليها',w.fns()==='root'&&w.log.some(x=>x==='restore:0'));
}

sec('حارس التغييرات غير المحفوظة');
{
 const w=world();const {R,H}=w;let dirty=false;
 R.register('edit',{dirty:()=>dirty});
 R.reset('root');R.push('edit');dirty=true;R.back();
 check('المحرّر المتغيّر يسأل قبل المغادرة',w.log.includes('confirm')&&w.fns()==='root>edit');
 H._proceed();
 check('الموافقة تكمل الرجوع',w.fns()==='root');
 dirty=false;R.push('edit');R.back();
 check('بلا تغييرات يرجع مباشرة',w.fns()==='root'&&w.log.filter(x=>x==='confirm').length===1);
}

sec('الحرّاس والسجلّ');
{
 const w=world();const {R}=w;
 R.register('vip',{guard:()=>false,fallback:'a'});
 R.reset('root');R.push('vip');
 check('حارس المسار يحوّل إلى البديل',w.fns()==='root>a');
 R.register('never',{guard:()=>false});
 check('حارس بلا بديل يرفض الدخول',R.push('never')===false&&w.fns()==='root>a');
 R.push('ghost');
 check('اسم غير مسجّل لا يرمي ولا يترك شاشة بيضاء — يبلّغ fail',w.log.includes('fail:ghost'));
 R.register('boom',{render:()=>{throw new Error('x')}});
 let threw=false;try{R.push('boom')}catch(e){threw=true}
 check('انهيار الرسم يُبلَّغ ولا يُسقط اللعبة',!threw&&w.log.includes('fail:boom'));
 check('names() يعدّد السجلّ كلّه',R.names().includes('boom')&&R.has('a')&&!R.has('nope'));
}

sec('حالة الواجهة تبقى مع شاشتها');
{
 const w=world();const {R}=w;
 R.reset('root');R.push('a');R.ui({tab:'x'});R.push('b');R.ui({tab:'y'});R.back();
 check('ui() بعد الرجوع هو ما تركته الشاشة',R.ui().tab==='x');
}

sec('زرّ الرجوع في أندرويد');
{
 const w=world();const {R,H}=w;
 R.reset('root');
 check('في الجذر قبل أي تنقّل لا مدخل حارس',w.hist()===0);
 R.push('a');R.push('b');
 check('مدخل حارس واحد مهما زاد العمق',w.hist()===1&&R._state().sent===1);
 H._pop();
 check('popstate = رجوع، ويُعاد وضع الحارس فورًا',w.fns()==='root>a'&&w.hist()===2);
 H._pop();
 check('الرجوع إلى الجذر يبقي الحارس — لا خروج بضغطة واحدة',w.fns()==='root'&&w.hist()===3&&R._state().sent===1);
 H._pop();
 check('ضغطة في الجذر تنبّه ولا تخرج',w.log.includes('atRoot')&&w.fns()==='root'&&w.went()===0);
 w.tick(200);H._pop();
 check('ضغطة ثانية خلال ثانية ونصف تخرج فعلًا',w.went()===-1);
 R.push('a');R.reset('root');
 check('تبديل التبويب لا يلمس سجل المتصفح — لا history.back() من عندنا أبدًا',w.backs()===0);
 R.register('live',{leave:()=>{w.log.push('leave')}});
 R.reset('root');R.enter('live',null,{replace:true});
 H._pop();
 check('popstate داخل تدفّق حيّ يمرّ بقاعدته لا يخرج من اللعبة',w.log.includes('leave')&&w.fns()==='live');
}

console.log('\n'+(fail?`✗ ${fail} فحصًا فشل من ${pass+fail}`:`نواة التنقّل سليمة ✔ (${pass} فحصًا)`));
process.exit(fail?1:0);
