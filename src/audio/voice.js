/**
 * الصيحات — تُقال بصوتٍ بشريّ حقيقيّ من الجهاز، أو لا تُقال.
 *
 *   VOICE.init({enabled:()=>bool})
 *   VOICE.say('ههه قربت أفوز انتبه', {seed:7, tone:'brag'})   → 'app' | 'tts' | false
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
 * «ههه» يقرؤها محرّك النطق حروفًا («هاء هاء»)، فتُكتب له «هاهاها» فيضحك بها.
 *
 * لا DOM هنا إلا window. لا يرمي أبدًا.
 */
var VOICE=(function(){
 'use strict';
 var W=(typeof window!=='undefined')?window:null;
 var enabled=function(){return true};
 var voices=null, playing=null;

 function init(o){
  if(o&&typeof o.enabled==='function')enabled=o.enabled;
  warm();
 }

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
   .replace(/[هـ]{3,}|ه{2,}/g,'هاهاها')
   .replace(/\s+/g,' ').trim();
 }
 /** طبقة وسرعة ثابتتان للاعب: الاسم نفسه يعطي الصوت نفسه */
 function prosody(o){
  var T=TONE[o.tone]||TONE.brag, r=rng(((o.seed|0)||3)*31+5);
  return {pitch:Math.max(0.6,Math.min(1.6,T.f0*(0.86+r()*0.34))),
          rate:Math.max(0.7,Math.min(1.4,T.rate))};
 }

 /** ينطق الجملة بصوتٍ حقيقيّ إن وُجد، وإلّا يسكت (الفقاعة تكفي) */
 function say(text,opt){
  var on=false;try{on=!!enabled()}catch(e){}
  if(!on)return false;
  var o=opt||{}, t=speakable(text);
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
  var s=synth();
  if(s){try{s.cancel()}catch(e){}}
  var a=app();if(a&&typeof a.stop==='function'){try{a.stop()}catch(e){}}
  playing=null;
 }
 function unlock(){}
 function available(){return hasSpeech()}

 return {init:init,say:say,stop:stop,unlock:unlock,warm:warm,
  hasSpeech:hasSpeech,available:available,_speakable:speakable,_prosody:prosody};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=VOICE;
