/**
 * موسيقى «تحدّي» — ملفُّ صوتٍ يُشغَّل على مسار الوسائط، لا لحنٌ يُركَّب لحظيًّا.
 *
 *   MUSIC.init({enabled:()=>bool})   من يقرّر التشغيل؟ إعدادات اللاعب
 *   MUSIC.start()  عند أول لمسة (المتصفّح لا يفتح الصوت قبلها)
 *   MUSIC.stop()   ·  MUSIC.duck(on)  يخفض الصوت أثناء اللعب لا يقطعه
 *   MUSIC.scene(name)  ·  MUSIC.playing() · MUSIC.now()
 *
 * لماذا تغيّرت الطريقة (٦٫٣٨):
 * كان اللحن يُركَّب في الهاتف بـWeb Audio — عشرات المذبذبات والمرشّحات
 * وصدىً التفافيّ، كلّها على المعالج نفسه الذي يرسم اللعبة. وصاحب اللعبة
 * يسمع تشوّهًا وانقطاعًا («الصوت مرّات يروح ولازم أتحرّك»)، وستّ محاولاتٍ
 * لتهذيب اللحن — حاجزٌ، وتنظيفُ عقد، وصدىً أقصر، وتوليدٌ مسبق، ورفعُ الباص،
 * وإعادةُ تأليف — لم تُصلحه. فالعلّة في الطريقة لا في النغمات.
 *
 * والملفّ الجاهز يمرّ على مسار الوسائط في النظام: هو الذي يشغّل كل مقطعٍ
 * يسمعه صاحب الهاتف، وقد بُني ليعمل على خيطٍ لا يزاحمه الرسم. وعنصر
 * <audio> يتكفّل بالتكرار والاستئناف، فلا سياق صوتيّ ينام ولا يُستأنف.
 *
 * والموسيقى نفسها تُؤلَّف في tools/build-music.py وتُضغط في
 * tools/encode-music.cjs — لا تُكتب باليد ولا تُقتبس من لعبةٍ أخرى.
 */
var MUSIC=(function(){
 'use strict';
 var W=(typeof window!=='undefined')?window:null;
 var el=null,on=false,ducked=false,cur='menu',ready=false;
 var enabled=function(){return true};
 var VOL=0.42, DUCK=0.13, FADE=900;     // مللي ثانية للدخول والخروج
 var TRACK={menu:'audio/menu.webm'};    // مشهدٌ واحد اليوم، والباب مفتوح لغيره
 var fadeTimer=null;

 function init(o){if(o&&typeof o.enabled==='function')enabled=o.enabled}

 /** يُبنى عند أول طلبٍ لا عند تحميل الصفحة — فلا يُنزَّل لمن أطفأ الموسيقى */
 function build(){
  if(el||!W||!W.document)return el;
  try{
   el=W.document.createElement('audio');
   el.src=TRACK[cur]||TRACK.menu;
   el.loop=true;el.preload='auto';el.volume=0;
   el.setAttribute('playsinline','');
   /* يُلحق بالصفحة لا يُترك طليقًا: عنصرٌ غير مُلحَقٍ يعمل في كروميوم سطح
      المكتب وقد لا يعمل في WebView — والهدف الهاتف لا المكتب. ومخفيٌّ
      بلا أبعاد فلا يزاحم الواجهة ولا يظهر له شريط تحكّم. */
   el.style.cssText='position:absolute;width:0;height:0;opacity:0;pointer-events:none';
   if(W.document.body)W.document.body.appendChild(el);
   else W.document.addEventListener('DOMContentLoaded',function(){
    try{W.document.body.appendChild(el)}catch(e){}
   });
   el.addEventListener('canplaythrough',function(){ready=true});
   /* لو أوقفه النظام (مكالمة، سمّاعة نُزعت) عاد من تلقائه ما دامت مشغّلة */
   el.addEventListener('pause',function(){
    if(on)try{el.play().catch(function(){})}catch(e){}
   });
  }catch(e){el=null}
  return el;
 }

 /** تلاشٍ يدويّ: عنصر الصوت لا يملك منحنياتٍ زمنية، والقفزة تُسمع */
 function fade(to,ms,after){
  if(!el)return;
  if(fadeTimer){W.clearInterval(fadeTimer);fadeTimer=null}
  var from=el.volume,steps=Math.max(1,Math.round(ms/40)),i=0;
  fadeTimer=W.setInterval(function(){
   i++;
   var v=from+(to-from)*(i/steps);
   try{el.volume=Math.max(0,Math.min(1,v))}catch(e){}
   if(i>=steps){W.clearInterval(fadeTimer);fadeTimer=null;if(after)after()}
  },40);
 }
 function level(){return ducked?DUCK:VOL}

 function start(){
  var okNow=false;try{okNow=!!enabled()}catch(e){}
  if(!okNow||on)return false;
  if(!build())return false;
  on=true;
  try{
   el.volume=0;
   var pr=el.play();
   if(pr&&pr.catch)pr.catch(function(){on=false});
  }catch(e){on=false;return false}
  fade(level(),FADE*3);               // يدخل من بعيد لا يقتحم
  return true;
 }
 function stop(){
  if(!on||!el)return;
  on=false;
  fade(0,FADE,function(){try{el.pause()}catch(e){}});
 }
 function duck(v){
  ducked=!!v;
  if(!on||!el)return;
  fade(level(),320);
 }
 /** مشهدٌ بمقطعٍ آخر يُبدَّل بتلاشٍ متقاطع؛ ومشهدٌ بلا مقطع يبقى على الحاليّ */
 function scene(name){
  if(name===cur)return cur;
  var src=TRACK[name];
  cur=name;
  if(!src||!el||!on)return cur;
  fade(0,420,function(){
   try{el.src=src;el.load();var pr=el.play();if(pr&&pr.catch)pr.catch(function(){})}catch(e){}
   fade(level(),620);
  });
  return cur;
 }
 function playing(){return on&&!!el&&!el.paused}
 function now(){return cur}
 function available(){return !!(W&&W.document&&W.document.createElement);}

 /** يتبع إعداد اللاعب: يبدأ إن فُتح ويقف إن أُغلق.
     وهي مدخل اللعبة الوحيد للموسيقى — تُنادى عند الإقلاع وعند كل إشارة
     وعند العودة من الخلفية. وسقوطُها من الواجهة يُسكت الموسيقى كلّها،
     فحارس الغلاف يفحص وجودها بالاسم. */
 function sync(){
  var want=false;try{want=!!enabled()}catch(e){}
  if(want&&!on)return start();
  if(!want&&on)stop();
  /* مشغّلةٌ لكن العنصر متوقّف (أوقفه النظام أو فشل التشغيل التلقائيّ):
     هذه هي «الصوت يروح» — فتُعاد المحاولة عند كل نداء. */
  if(want&&on&&el&&el.paused){try{var pr=el.play();if(pr&&pr.catch)pr.catch(function(){})}catch(e){}}
  return on;
 }

 return {init:init,start:start,stop:stop,duck:duck,sync:sync,scene:scene,
  playing:playing,available:available,now:now};
})();
