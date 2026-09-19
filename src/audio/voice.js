/**
 * الصيحات — صوت بشريّ مركَّب داخل اللعبة، بلا ملفّ صوت واحد.
 *
 *   VOICE.init({enabled:()=>bool, speech:()=>bool})
 *   VOICE.say('ههه قربت أفوز انتبه', {seed:7, tone:'brag'})
 *   VOICE.hasSpeech()   هل في الجهاز صوت عربيّ حقيقيّ؟
 *   VOICE.stop()
 *
 * لماذا مركَّب ولا ملفّات: اللعبة ملفّ واحد يُحمَّل كاملًا، وتسجيل عشرات الجمل
 * بصوت بشريّ يعني ميجابايتات تُنزَّل مرّة واحدة وتُحمَل أبدًا. وصوت النظام
 * (speechSynthesis) لا يوجد على كلّ هاتف: هواتف كثيرة بلا محرّك نطق عربيّ،
 * والمتصفّحات الصامتة تعيد قائمة أصوات فارغة. فلو اتّكأنا عليه وحده لسكتت
 * اللعبة عند نصف اللاعبين.
 *
 * فالأساس هنا تركيب صوتيّ بالصيغ الرنينيّة (formants): نبضة حنجرة (sawtooth)
 * تمرّ في ثلاثة مرشّحات نطاقيّة مضبوطة على رنين الحركات العربية، تُفتح وتُغلق
 * مقطعًا مقطعًا بإيقاع الجملة نفسها. النتيجة صوت «يتكلّم» لا يُفهم حرفه لكن
 * تُفهم نبرته — وهي الطريقة نفسها التي تتكلّم بها شخصيات الألعاب منذ عقود.
 * ولكلّ لاعب بذرة تثبّت طبقة صوته، فلا يتشابه صوتان في الغرفة.
 *
 * وإن وُجد صوت عربيّ حقيقيّ في الجهاز استُعمل بدله: أفضل ما يتوفّر، لا أقلّه.
 *
 * لا DOM هنا إلا window. لا يرمي أبدًا.
 */
var VOICE=(function(){
 'use strict';
 var W=(typeof window!=='undefined')?window:null;
 var ctx=null, enabled=function(){return true}, speech=function(){return true};
 var voices=null, playing=null;

 function init(o){
  if(o&&typeof o.enabled==='function')enabled=o.enabled;
  if(o&&typeof o.speech==='function')speech=o.speech;
  warm();
 }
 function AC(){return W?(W.AudioContext||W.webkitAudioContext):null}
 function ac(){
  if(ctx)return ctx;
  var A=AC();if(!A)return null;
  try{ctx=new A()}catch(e){ctx=null}
  return ctx;
 }

 /* ── صوت النظام: قائمة الأصوات تصل متأخّرة في بعض المتصفّحات ── */
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
 function hasSpeech(){return !!arVoice()}

 /* ── البذرة: رقم صغير يثبّت طبقة صوت اللاعب فلا تتبدّل بين جملة وأخرى ── */
 function rng(seed){
  var s=(seed|0)||1;
  return function(){s=(s*1103515245+12345)&0x7fffffff;return s/0x7fffffff};
 }

 /* رنين الحركات العربية: (F1,F2,F3) بالهرتز — الفتحة مفتوحة، الكسرة عالية، الضمة مظلمة */
 var VOW={
  a:[700,1220,2600], aa:[730,1090,2440],
  i:[330,2200,3000], ii:[290,2350,3100],
  u:[350,850,2500],  uu:[320,760,2400]
 };
 var VK=['a','aa','i','ii','u','uu'];

 /* الحروف المدّية والحركات تحدّد لون المقطع؛ ما عداها ساكن يبدأ مقطعًا جديدًا */
 function vowelOf(ch){
  if(ch==='ا'||ch==='آ'||ch==='أ'||ch==='إ')return 'aa';
  if(ch==='ي'||ch==='ى'||ch==='ئ')return 'ii';
  if(ch==='و'||ch==='ؤ')return 'uu';
  if(ch==='َ')return 'a';
  if(ch==='ِ')return 'i';
  if(ch==='ُ')return 'u';
  return null;
 }
 /* الحروف الانفجارية تبدأ بطقّة قصيرة، فيُسمع للمقطع مَخرج لا مجرّد نغمة */
 function isStop(ch){return 'بتدطضجقكءأإئؤ'.indexOf(ch)>=0}
 function isHiss(ch){return 'سشصثفحخهز'.indexOf(ch)>=0}

 /**
  * يحوّل الجملة إلى مقاطع: لكلّ مقطع حركة ونوع مَخرج ومكان وقفة.
  * لا يقرأ النصّ قراءة صحيحة — ولا يحتاج: المطلوب إيقاع الجملة لا حروفها.
  */
 function syllables(text,seed){
  var r=rng(seed), out=[], cur=null, i, ch, v;
  var s=String(text||'').replace(/[^؀-ۿ\s]/g,' ');
  for(i=0;i<s.length;i++){
   ch=s[i];
   if(ch===' '){if(cur){cur.gap=1;cur=null}continue}
   v=vowelOf(ch);
   if(v){
    if(cur&&!cur.v)cur.v=v;
    else out.push(cur={v:v,on:'soft',gap:0});
    continue;
   }
   out.push(cur={v:null,on:isStop(ch)?'stop':isHiss(ch)?'hiss':'soft',gap:0});
  }
  /* مقطع بلا حركة يأخذ واحدة من البذرة — فتختلف الجملة نفسها بين لاعبين */
  for(i=0;i<out.length;i++)if(!out[i].v)out[i].v=VK[Math.floor(r()*VK.length)];
  if(out.length>14)out=out.slice(0,14);            // جملة طويلة لا تُقرأ كاملة: تُقتطع فلا تصير هذيانًا
  if(!out.length)out=[{v:'a',on:'soft',gap:0}];
  return out;
 }

 /* نغمة الجملة: الفخر يرتفع، الحزن ينزل، السؤال يصعد في آخره */
 var TONE={
  brag:  {f0:1.12, span: 0.16, rate:1.00, g:1.00},
  tease: {f0:1.06, span: 0.22, rate:1.08, g:0.96},
  cheer: {f0:1.16, span: 0.26, rate:1.06, g:1.00},
  calm:  {f0:1.00, span:-0.06, rate:0.96, g:0.90},
  sad:   {f0:0.90, span:-0.20, rate:0.90, g:0.86}
 };

 function babble(text,opt){
  var c=ac();if(!c)return false;
  if(c.state==='suspended'){try{c.resume().catch(function(){})}catch(e){}}
  var o=opt||{}, seed=(o.seed|0)||3, T=TONE[o.tone]||TONE.brag;
  var r=rng(seed*7919+13);
  var base=(112+r()*54)*T.f0;                       // طبقة اللاعب: من صوت غليظ إلى رفيع
  var ask=/؟|\?/.test(String(text||''));
  var sy=syllables(text,seed), t=c.currentTime+0.02, n=sy.length;

  var master=c.createGain();
  master.gain.value=0.9*(T.g||1);
  master.connect(c.destination);

  for(var k=0;k<n;k++){
   var s=sy[k], p=n>1?k/(n-1):0;
   var f0=base*(1+T.span*p)*(ask&&p>0.72?1.16:1)*(0.97+r()*0.06);
   var dur=(s.on==='stop'?0.085:0.11)*(1/T.rate)*(0.88+r()*0.28);
   emit(c,master,f0,VOW[s.v]||VOW.a,t,dur,s.on,base);
   t+=dur*0.82+(s.gap?0.075:0.012);
  }
  try{master.gain.setValueAtTime(master.gain.value,t);}catch(e){}
  setTimeout(function(){try{master.disconnect()}catch(e){}},Math.ceil((t-c.currentTime+0.4)*1000));
  return true;
 }

 /** مقطع واحد: حنجرة + ثلاثة رنينات + مَخرج، بغلاف يفتح ويغلق */
 function emit(c,out,f0,F,t0,d,on,base){
  var g=c.createGain();
  g.gain.setValueAtTime(0.0001,t0);
  g.gain.exponentialRampToValueAtTime(0.22,t0+(on==='stop'?0.012:0.03));
  g.gain.exponentialRampToValueAtTime(0.0001,t0+d);
  g.connect(out);

  var src=c.createOscillator();
  src.type='sawtooth';
  src.frequency.setValueAtTime(f0,t0);
  src.frequency.linearRampToValueAtTime(f0*(0.97+Math.random()*0.06),t0+d);   // تذبذب خفيف: لا نغمة آلية مستقيمة

  /* ثلاثة مرشّحات نطاقيّة متوازية هي ما يجعل الصوت «حلقًا» لا «صفّارة» */
  var i,amp=[1,0.55,0.22];
  for(i=0;i<3;i++){
   var bp=c.createBiquadFilter();
   bp.type='bandpass';
   bp.frequency.value=F[i];
   bp.Q.value=i===0?7:10;
   var vg=c.createGain();vg.gain.value=amp[i];
   src.connect(bp);bp.connect(vg);vg.connect(g);
  }
  src.start(t0);src.stop(t0+d+0.05);

  if(on==='stop'||on==='hiss'){
   var nb=noiseBuf(c);
   if(nb){
    var ns=c.createBufferSource();ns.buffer=nb;
    var nf=c.createBiquadFilter();nf.type=on==='hiss'?'highpass':'bandpass';
    nf.frequency.value=on==='hiss'?3200:F[1];
    var ng=c.createGain();
    var nd=on==='hiss'?0.055:0.026;
    ng.gain.setValueAtTime(on==='hiss'?0.055:0.085,t0);
    ng.gain.exponentialRampToValueAtTime(0.0001,t0+nd);
    ns.connect(nf);nf.connect(ng);ng.connect(out);
    ns.start(t0);ns.stop(t0+nd+0.02);
   }
  }
  return base;
 }
 var _nb=null;
 function noiseBuf(c){
  if(_nb)return _nb;
  try{
   _nb=c.createBuffer(1,Math.floor(c.sampleRate*0.2),c.sampleRate);
   var d=_nb.getChannelData(0);
   for(var i=0;i<d.length;i++)d[i]=Math.random()*2-1;
  }catch(e){_nb=null}
  return _nb;
 }

 /** ينطق الجملة: صوت النظام العربيّ إن وُجد، وإلّا الصوت المركَّب */
 function say(text,opt){
  var on=false;try{on=!!enabled()}catch(e){}
  if(!on)return false;
  var o=opt||{}, t=String(text||'').trim();
  if(!t)return false;
  var useTTS=false;try{useTTS=!!speech()}catch(e){}
  if(useTTS){
   var v=arVoice(), s=synth();
   if(v&&s){
    try{
     s.cancel();
     var u=new W.SpeechSynthesisUtterance(t);
     u.voice=v;u.lang=v.lang||'ar';
     var T=TONE[o.tone]||TONE.brag;
     var r=rng(((o.seed|0)||3)*31+5);
     u.pitch=Math.max(0.5,Math.min(1.8,T.f0*(0.88+r()*0.4)));
     u.rate=Math.max(0.6,Math.min(1.6,T.rate*1.02));
     u.volume=1;
     playing=u;s.speak(u);
     return 'tts';
    }catch(e){/* صوت النظام رفض: نكمل بالمركَّب */}
   }
  }
  return babble(t,o)?'synth':false;
 }
 function stop(){
  var s=synth();
  if(s){try{s.cancel()}catch(e){}}
  playing=null;
 }
 function unlock(){var c=ac();if(c&&c.state==='suspended'){try{c.resume().catch(function(){})}catch(e){}}}
 function available(){return !!AC()}

 return {init:init,say:say,stop:stop,unlock:unlock,warm:warm,
  hasSpeech:hasSpeech,available:available,
  _syllables:syllables,_babble:babble};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=VOICE;
