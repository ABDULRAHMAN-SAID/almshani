/**
 * نواة التنقّل — مكدّس واحد لكل شاشات اللعبة.
 *
 * لا DOM هنا. كل ما يلمس الصفحة (الرسم، التمرير، الشريط السفلي، سجل المتصفح)
 * يصل عبر hooks من اللعبة، فتُختبر النواة في Node بلا متصفح.
 *
 * الإطار على المكدّس: {fn, arg, y, ui, flow}
 *   fn    اسم الشاشة في السجلّ            arg   وسيطها
 *   y     موضع التمرير عند مغادرتها        ui    حالة الواجهة (تبويب/فلتر) تبقى معها
 *   flow  تدفّق حيّ يرسم نفسه (مباراة/غرفة/جولة) — دخل بـ enter() لا push()
 *
 * السجلّ: register(fn, {render, bar, leave, dirty, guard, fallback})
 *   render(arg)   ترسم الشاشة. إن غابت حُلّت بالاسم عبر hooks.resolve — لكن لا تُفتح
 *                 شاشة غير مسجّلة أصلًا: السجلّ هو المصدر الوحيد للأسماء.
 *   bar:false     شاشة كاملة بلا شريط سفلي (المالك الوحيد للشريط هو applyBar)
 *   leave(done)   معنى «رجوع» داخل تدفّق حيّ: سؤال قبل الانسحاب لا سحب صامت.
 *                 done() يكمل الرجوع فعلًا إن قرّر التدفّق ذلك.
 *   dirty()       تغييرات غير محفوظة → hooks.confirmLeave قبل المغادرة
 *   guard(arg)    شرط دخول الشاشة؛ إن أخفق فُتح fallback بدلها
 *
 * زرّ الرجوع في أندرويد: مدخل حارس واحد دائم في سجل المتصفح؛ popstate يعني «رجوع»
 * ويمرّ بالقواعد نفسها (dirty ثم leave ثم سحب). في الجذر: تنبيه ثم خروج بضغطة ثانية.
 */
var Router=(function(){
 'use strict';
 var REG={}, stack=[], H={}, last={fn:null,arg:'',t:0}, sent=0;
 var DOUBLE_MS=450;                       // ضغطتان على الزرّ نفسه أقرب من هذا = واحدة

 function frame(fn,arg,flow){return {fn:fn,arg:arg,y:0,ui:null,flow:!!flow}}
 function top(){return stack.length?stack[stack.length-1]:null}
 function def(fn){return REG[fn]||{}}
 function key(a){try{return JSON.stringify(a===undefined?null:a)}catch(e){return String(a)}}
 function now(){return H.now?H.now():Date.now()}
 function indexOfTop(fn){for(var i=stack.length-1;i>=0;i--)if(stack[i].fn===fn)return i;return -1}

 function init(hooks){
  H=hooks||{};
  if(H.history){
   try{H.history.replaceState({r:0},'')}catch(e){}
   try{H.history.scrollRestoration='manual'}catch(e){}   // التمرير شأننا لا شأن المتصفح
  }
  if(H.window&&H.window.addEventListener)H.window.addEventListener('popstate',onPop);
 }
 function register(fn,d){REG[fn]=Object.assign(REG[fn]||{},d||{});return REG[fn]}
 function has(fn){return Object.prototype.hasOwnProperty.call(REG,fn)}
 function names(){return Object.keys(REG)}

 function resolve(fn){
  if(!has(fn))return null;                // غير مسجّل = غير موجود، ولو كانت له دالة عامة
  var d=REG[fn];
  if(typeof d.render==='function')return d.render;
  return H.resolve?H.resolve(fn):null;
 }
 /** يرسم شاشة بالاسم — بلا مسّ للمكدّس. الخطأ لا يترك شاشة بيضاء بل يبلّغ hooks.fail */
 function render(fn,arg){
  var r=resolve(fn);
  try{
   if(!r)throw new Error('شاشة غير مسجّلة: '+fn);
   r(arg);
  }catch(e){
   if(H.fail)H.fail(fn,e);else throw e;
  }
  applyBar();
 }
 /** المالك الوحيد للشريط السفلي: يُشتقّ من سجلّ الشاشة العليا لا من كل شاشة على حدة */
 function applyBar(){
  var t=top(); if(!t)return;
  if(H.bar)H.bar(def(t.fn).bar!==false,t.fn);
 }
 function saveY(){var t=top();if(t&&H.scrollY)t.y=H.scrollY()}
 function restoreY(f){if(H.restore)H.restore(f.y||0)}

 function guarded(fn,arg){
  var d=def(fn);
  if(d.guard&&!d.guard(arg))return d.fallback||null;
  return fn;
 }
 function push(fn,arg){
  var g=guarded(fn,arg);
  if(g===null)return false;
  if(g!==fn){fn=g;arg=undefined}
  var t=now();
  if(last.fn===fn&&last.arg===key(arg)&&t-last.t<DOUBLE_MS)return false;
  last={fn:fn,arg:key(arg),t:t};
  saveY(); stack.push(frame(fn,arg)); render(fn,arg); arm(); return true;
 }
 /** إطار تدفّق حيّ يرسم نفسه: يُسجَّل بلا رسم. الإطار نفسه مرّتين = مرّة */
 function enter(fn,arg,o){
  o=o||{}; var t=top();
  last.fn=null;
  if(t&&t.fn===fn){t.arg=arg;t.flow=true;applyBar();arm();return}
  saveY();
  if(o.replace&&stack.length)stack.pop();
  stack.push(frame(fn,arg,true)); applyBar(); arm();
 }
 function replace(fn,arg){
  last.fn=null;
  if(stack.length)stack.pop();
  stack.push(frame(fn,arg)); render(fn,arg); arm();
 }
 function reset(fn,arg){
  last.fn=null;
  stack.length=0; stack.push(frame(fn,arg)); render(fn,arg); disarm();
 }
 function clear(){last.fn=null;stack.length=0;disarm()}
 /** سحب صامت بلا رسم — للتدفّق الذي سيرسم ما بعده بنفسه */
 function pop(){stack.pop();applyBar();arm()}
 function back(force){
  var t=top();
  last.fn=null;
  if(t&&!force){
   var d=def(t.fn);
   if(d.dirty&&d.dirty()){
    if(H.confirmLeave){H.confirmLeave(function(){back(true)});return false}
   }
   if(d.leave){d.leave(function(){back(true)});return false}
  }
  if(stack.length>1){
   stack.pop(); var p=top(); restoreY(p); render(p.fn,p.arg); arm(); return true;
  }
  stack.length=0; disarm(); if(H.root)H.root(); return true;
 }
 /** إنهاء تدفّق: انزع إطاره وما فوقه وارسم ما تحته. false إن لم يكن على المكدّس */
 function exit(fn){
  var i=indexOfTop(fn); if(i<0)return false;
  last.fn=null;
  stack.length=i;
  if(!stack.length){disarm();if(H.root)H.root();return true}
  var p=top(); restoreY(p); render(p.fn,p.arg); arm(); return true;
 }
 /** الهبوط على شاشة بعينها بعد تدفّق: ارجع إليها إن كانت تحتك، وإلا حلّ محلّ التدفّق بها */
 function settle(fn,arg){
  last.fn=null;
  var i=indexOfTop(fn);
  if(i>=0){
   stack.length=i+1; var f=top(); if(arg!==undefined)f.arg=arg;
   restoreY(f); render(f.fn,f.arg); arm(); return;
  }
  var t=top(); if(t&&t.flow)stack.pop();
  stack.push(frame(fn,arg)); render(fn,arg); arm();
 }
 /** حالة الواجهة للشاشة الحالية (تبويب/فلتر) — تبقى معها وتعود عند الرجوع */
 function ui(patch){
  var t=top(); if(!t)return {};
  if(!t.ui)t.ui={}; if(patch)Object.assign(t.ui,patch); return t.ui;
 }
 function current(){return top()}
 function depth(){return stack.length}

 /* ── أندرويد ──
  * مدخل حارس واحد يُوضع مرّة ولا يُنزع: كل ضغطة رجوع تستهلكه فنعيده فورًا.
  * لا history.back() من عندنا أبدًا — التراجع غير المتزامن كان يعيد موضع التمرير
  * المحفوظ في سجل المتصفح فيمحو ما استعدناه. في الجذر: ضغطة تنبّه، وثانية خلال
  * EXIT_MS تخرج فعلًا (بالرجوع خطوتين: الحارس ثم صفحة اللعبة). */
 var EXIT_MS=1500, rootPopAt=0;
 function arm(){
  if(!H.history||sent)return;
  try{H.history.pushState({r:1},'');sent=1}catch(e){}
 }
 function disarm(){}
 function onPop(){
  sent=0;
  var t=top(), live=stack.length>1||!!(t&&(t.flow||def(t.fn).leave));
  if(live){
   try{back()}catch(e){if(H.fail)H.fail(t?t.fn:'?',e)}
   arm(); return;
  }
  var n=now();
  if(rootPopAt&&n-rootPopAt<EXIT_MS){try{H.history.go(-1)}catch(e){}return}   // خروج حقيقي
  rootPopAt=n; arm(); if(H.atRoot)H.atRoot();
 }

 return {init:init,register:register,has:has,names:names,def:def,
  push:push,enter:enter,replace:replace,reset:reset,clear:clear,pop:pop,back:back,
  exit:exit,settle:settle,render:render,ui:ui,current:current,depth:depth,
  stack:stack,applyBar:applyBar,arm:arm,
  _onPop:onPop,_state:function(){return {sent:sent}}};
})();
