/**
 * الصيحات — تُقال بصوتٍ بشريّ حقيقيّ من الجهاز، أو لا تُقال.
 *
 *   VOICE.init({enabled:()=>bool})
 *   VOICE.say('ههه قربت أفوز انتبه', {seed:7, tone:'brag'})   → 'laugh' | 'app' | 'tts' | false
 *   VOICE.say(text, {clip:'audio/shouts/n2.webm'})              → 'clip' (تسجيلٌ بصوت المالك)
 *   VOICE.hasSpeech()   هل في الجهاز صوت عربيّ حقيقيّ؟
 *   VOICE.stop()
 *
 * كان هنا (حتى ٦٫٥٩) مركِّبٌ بالصيغ الرنينيّة يقول الجملة «بلا حروف» حين لا يجد
 * الجهاز صوتًا. فسمعه المالك: «صوت ضحكة ما يجي صوت حقيقي، مجرد صوت غريب».
 * وهو محقّ — صفّارةٌ تُشبه الكلام أسوأ من الصمت. فحُذف، وصار الترتيب:
 *
 *  ١) تطبيق أندرويد: جسر TahaddiTTS إلى محرّك النطق في النظام (صوت Google العربيّ).
 *     WebView لا يملك speechSynthesis، فبلا هذا الجسر يسكت التطبيق دائمًا.
 *  ٢) المتصفّح: speechSynthesis إن كان فيه صوت عربيّ.
 *  ٣) لا هذا ولا ذاك: الجملة تظهر مكتوبةً في الفقاعة مع نقرةٍ خفيفة، بلا صوتٍ مزيّف.
 *
 * والضحكة ليست نطقًا: ٦٫٦١ — رفع المالك تسجيل ضحكةٍ حقيقيّة (tahaddi/audio/laugh.webm)،
 * وهي لصيحة الضحك وحدها (٦٫٦٤): جملةٌ فيها كلامٌ يُقال كلامها فقط.
 * والضحكة ملفّ، فتُسمع حتى على جهازٍ بلا صوتٍ عربيّ.
 * ٦٫٦٣ — «ليش حطيت الضحكة نفسها بدل ما تعدّلها؟»: التسجيل الخام ٤٫٥ ثوانٍ بصمتٍ في طرفيه ودفعةٍ حادّة
 * أعلى من الباقي بثلاث مرّات. صارت نسختين محرَّرتين (تنقية، ضاغط، تسوية، تلاشٍ): كاملة ٤٫٢ث للضحكة
 * وحدها (والقصيرة التي كانت تسبق الكلام حُذفت في ٦٫٦٤). ولكلّ لاعبٍ طبقةٌ منها (سرعة ٠٫٩٢–١٫٠٨ بلا حفظ الطبقة)
 * فلا يضحك الخصمان بالصوت نفسه.
 * (وإن تعذّر الملفّ، تُكتب «ههه» للمحرّك «هاهاها» فيضحك بها بدل أن يتهجّاها.)
 *
 * لا DOM هنا إلا window. لا يرمي أبدًا.
 */
var VOICE=(function(){
 'use strict';
 var W=(typeof window!=='undefined')?window:null;
 var enabled=function(){return true};
 var voices=null, playing=null, laughUrl='', laughEl=null, laughT=0, laughGen=0, rate=1;

 function init(o){
  if(o&&typeof o.enabled==='function')enabled=o.enabled;
  if(o&&o.laugh)laughUrl=String(o.laugh);
  warm();
 }

 /* ── الضحكة المسجّلة ── */
 var LAUGH=/ه{3,}/;
 function hasLaugh(text){return LAUGH.test(String(text||''))}
 /** الجملة بلا ضحكتها: ما يُقال بعد التسجيل */
 function rest(text){return String(text||'').replace(/ه{3,}/g,' ').replace(/^[\s،,.!؟?]+|[\s،,]+$/g,'').replace(/\s+/g,' ').trim()}
 /** يشغّل تسجيلًا (الضحكة، أو صيحةً بصوت صاحبها — ٦٫٦٢)؛ max بالثواني يقصّه (بخفوتٍ سريع) حين يتبعه كلام.
    done بعد انتهائه، وfail إن تعذّر الملفّ (فيُقال النصّ بصوت الجهاز بدله) */
 function laugh(max,done,url,fail){
  url=url||laughUrl;
  if(!url||!W||typeof W.Audio!=='function')return false;
  try{
   stopLaugh();
   var my=laughGen, a=laughEl=new W.Audio(url), fin=false;
   a.volume=1;
   try{a.preservesPitch=false;a.mozPreservesPitch=false;a.webkitPreservesPitch=false;a.playbackRate=rate}catch(e){}
   var end=function(){if(fin)return;fin=true;try{a.pause()}catch(e){}
    if(my!==laughGen)return;                 // قُطعت بضحكةٍ أحدث أو بإيقاف: لا يُقال باقيها القديم
    clearTimeout(laughT);laughEl=null;if(done)done()};
   a.onended=end;
   a.onerror=function(){if(fail&&!fin&&my===laughGen){fin=true;laughEl=null;clearTimeout(laughT);fail()}else end()};
   if(max>0)laughT=setTimeout(function(){
    var k=0,f=setInterval(function(){k++;try{a.volume=Math.max(0,1-k/6)}catch(e){}if(k>=6||fin){clearInterval(f);end()}},30);
   },max*1000);
   var pr=a.play();
   if(pr&&typeof pr.catch==='function')pr.catch(function(){a.onerror()});
   return true;
  }catch(e){return false}
 }
 function stopLaugh(){laughGen++;clearTimeout(laughT);if(laughEl){try{laughEl.pause()}catch(e){}laughEl=null}}

 /* ── جسر التطبيق: MainActivity يضع window.TahaddiTTS ── */
 function app(){try{return W&&W.TahaddiTTS&&typeof W.TahaddiTTS.speak==='function'?W.TahaddiTTS:null}catch(e){return null}}
 function appReady(){var a=app();if(!a)return false;try{return !!a.ready()}catch(e){return false}}

 /* ── صوت المتصفّح: قائمة الأصوات تصل متأخّرة في بعض المتصفّحات ── */
 function synth(){try{return W&&W.speechSynthesis}catch(e){return null}}
 function warm(){
  var s=synth();if(!s)return;
  try{voices=s.getVoices()||[]}catch(e){voices=[]}
  try{if(typeof s.addEventListener==='function')
   s.addEventListener('voiceschanged',function(){try{voices=s.getVoices()||[]}catch(e){}});}catch(e){}
 }
 function arVoice(){
  var s=synth();if(!s)return null;
  if(!voices||!voices.length){try{voices=s.getVoices()||[]}catch(e){voices=[]}}
  for(var i=0;i<voices.length;i++)if(/^ar\b|^ar[-_]/i.test(voices[i].lang||''))return voices[i];
  return null;
 }
 function hasSpeech(){return appReady()||!!arVoice()}

 /* ── البذرة: رقم صغير يثبّت طبقة صوت اللاعب فلا تتبدّل بين جملة وأخرى ── */
 function rng(seed){
  var s=(seed|0)||1;
  return function(){s=(s*1103515245+12345)&0x7fffffff;return s/0x7fffffff};
 }

 /* نغمة الجملة: الفخر يرتفع، الحماس أسرع، الهدوء أبطأ */
 var TONE={
  brag:  {f0:1.06, rate:1.00},
  tease: {f0:1.04, rate:1.06},
  cheer: {f0:1.10, rate:1.06},
  calm:  {f0:1.00, rate:0.96},
  sad:   {f0:0.92, rate:0.92}
 };

 /** ما يُعطى لمحرّك النطق: الضحكة تُكتب بحروف مدّ ليضحك بها لا ليتهجّاها */
 function speakable(text){
  return String(text||'')
   .replace(/ه{3,}/g,'هاهاها')
   .replace(/\s+/g,' ').trim();
 }
 /** طبقة وسرعة ثابتتان للاعب: الاسم نفسه يعطي الصوت نفسه */
 function prosody(o){
  var T=TONE[o.tone]||TONE.brag, r=rng(((o.seed|0)||3)*31+5);
  return {pitch:Math.max(0.6,Math.min(1.6,T.f0*(0.86+r()*0.34))),
          rate:Math.max(0.7,Math.min(1.4,T.rate))};
 }

 /** ينطق الجملة: ضحكتها من التسجيل، وكلامها بصوتٍ حقيقيّ إن وُجد، وإلّا يسكت (الفقاعة تكفي) */
 function say(text,opt){
  var on=false;try{on=!!enabled()}catch(e){}
  if(!on)return false;
  var o=opt||{};
  /* صيحةٌ مسجّلة بصوت صاحبها: التسجيل كاملًا، وإن تعذّر قيل نصّها بصوت الجهاز */
  rate=1;
  if(o.clip&&laugh(0,null,o.clip,function(){speak(text,o)}))return 'clip';
  if(hasLaugh(text)&&laughUrl){
   var r=rest(text);
   rate=0.92+(((o.seed|0)%17)+17)%17/100;   // طبقة اللاعب: ٠٫٩٢–١٫٠٨
   /* ٦٫٦٤ — «ما يجوز تستخدم هذا الصوت لكلماتٍ أخرى»: الضحكة للضحك وحده. جملةٌ فيها كلام تُقال كلامًا
      (بلا ضحكةٍ قبلها)، والضحكة المسجّلة لا تُسمع إلّا في صيحة الضحك */
   if(r)return speak(r,o);
   if(laugh(0,null,null,function(){speak(text,o)}))return 'laugh';   // الملفّ تعذّر: صوت الجهاز بدله (المراجعة)
  }
  return speak(text,o);
 }
 function speak(text,o){
  var t=speakable(text);
  if(!t)return false;
  var p=prosody(o);
  var a=app();
  if(a&&appReady()){
   try{if(a.speak(t,p.pitch,p.rate))return 'app';}catch(e){}
  }
  var v=arVoice(), s=synth();
  if(v&&s){
   try{
    s.cancel();
    var u=new W.SpeechSynthesisUtterance(t);
    u.voice=v;u.lang=v.lang||'ar';
    u.pitch=p.pitch;u.rate=p.rate;u.volume=1;
    playing=u;s.speak(u);
    return 'tts';
   }catch(e){}
  }
  return false;
 }
 function stop(){
  stopLaugh();
  var s=synth();
  if(s){try{s.cancel()}catch(e){}}
  var a=app();if(a&&typeof a.stop==='function'){try{a.stop()}catch(e){}}
  playing=null;
 }
 function unlock(){}
 function available(){return hasSpeech()}

 return {init:init,say:say,stop:stop,unlock:unlock,warm:warm,
  hasSpeech:hasSpeech,available:available,hasLaugh:hasLaugh,_speakable:speakable,_prosody:prosody,_rest:rest};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=VOICE;
