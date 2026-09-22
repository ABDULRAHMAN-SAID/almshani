/**
 * الصوت والاهتزاز — مركّبان داخل اللعبة بلا ملفّات صوت.
 *   SFX.init({enabled:()=>bool, haptic:()=>bool})   من يقرّر التشغيل؟ إعدادات اللاعب
 *   SFX.unlock()      عند أول لمسة — المتصفح لا يفتح الصوت قبلها
 *   SFX.fx('ok')      صوت + اهتزاز معًا      SFX.play(k) / SFX.haptic(k) كلٌّ على حدة
 * الأسماء: tap · ok · bad · win · lose · strike · pot · coin · hit · wall
 *   SFX.loadSprite(name,url,seg)   عيّنات مسجَّلة في ملفٍّ واحد تُفكّ مرّةً (٦٫٤١)
 *   SFX.play(k,{v})                v سرعة الاصطدام: تضبط الشدّة والنبرة
 *   SFX.slide(level)               حفيف الانزلاق على الخشب ٠..١ — صفرٌ يُسكته (٦٫٤٣)
 * لا DOM هنا إلا window/navigator. لا يرمي أبدًا.
 *
 * لماذا عيّنات (٦٫٤١): طقّة قطعةٍ خشبيّة على لوحٍ خشبيّ لها رنيناتٌ لا يبلغها
 * مذبذبٌ ومرشّح، وصاحب اللعبة سمع الفرق: «صوت ما صحيح ولا يعطي شعور».
 * فتُؤلَّف في tools/build-sfx.py وتُضغط في ملفٍّ واحد، وتُقتطع عند اللعب
 * بمصدر مخزنٍ رخيص — لا تركيب حيّ، فلا يتكرّر ما وقع للموسيقى.
 */
var SFX=(function(){
 'use strict';
 var W=(typeof window!=='undefined')?window:null;
 var ctx=null, enabled=function(){return true}, haptic=function(){return true};

 function init(o){
  if(o&&typeof o.enabled==='function')enabled=o.enabled;
  if(o&&typeof o.haptic==='function')haptic=o.haptic;
 }
 function AC(){return W?(W.AudioContext||W.webkitAudioContext):null}
 function ac(){
  if(ctx)return ctx;
  var A=AC();if(!A)return null;
  try{ctx=new A()}catch(e){ctx=null}
  return ctx;
 }
 function unlock(){
  var c=ac();
  if(c&&c.state==='suspended'){try{c.resume().catch(function(){})}catch(e){}}
 }
 /* نغمة واحدة: تردّد، بداية، مدّة، شكل الموجة، شدّة، وانزلاق اختياري إلى تردّد آخر */
 function tone(f,t0,d,type,g,slide){
  var c=ac();if(!c)return;
  var o=c.createOscillator(),v=c.createGain();
  o.type=type||'sine';
  o.frequency.setValueAtTime(f,t0);
  if(slide)o.frequency.exponentialRampToValueAtTime(slide,t0+d);
  v.gain.setValueAtTime(0.0001,t0);
  v.gain.exponentialRampToValueAtTime(g||0.18,t0+0.012);
  v.gain.exponentialRampToValueAtTime(0.0001,t0+d);
  o.connect(v);v.connect(c.destination);
  o.start(t0);o.stop(t0+d+0.03);
 }
 var noiseBuf=null;
 /* ضجيج قصير مرشَّح — لطقّة الضارب وسقوط القطعة */
 function noise(t0,d,g,cut){
  var c=ac();if(!c)return;
  if(!noiseBuf){
   noiseBuf=c.createBuffer(1,c.sampleRate*0.25,c.sampleRate);
   var data=noiseBuf.getChannelData(0);
   for(var i=0;i<data.length;i++)data[i]=Math.random()*2-1;
  }
  var s=c.createBufferSource(),v=c.createGain(),f=c.createBiquadFilter();
  s.buffer=noiseBuf;f.type='lowpass';f.frequency.value=cut||1800;
  v.gain.setValueAtTime(g||0.2,t0);
  v.gain.exponentialRampToValueAtTime(0.0001,t0+d);
  s.connect(f);f.connect(v);v.connect(c.destination);
  s.start(t0);s.stop(t0+d+0.02);
 }
 /* ── زحف الخشب (٦٫٤٣) ──
    حفيفٌ متّصل ما دامت القطع تنزلق: ضجيجٌ ورديٌّ يدور في حلقة عبر مرشّح نطاقيّ،
    شدّته وتردّده يتبعان مجموع السرعات، ويخفت إلى الصفر حين يسكن اللوح.
    عقدةٌ واحدة لا مذبذبات — فلا يتكرّر ما وقع للموسيقى الحيّة. */
 var SL=null, slideB=null;
 function slideBuf(c){
  if(slideB&&slideB.sampleRate===c.sampleRate)return slideB;   // يُولَّد مرّةً لا مع كلّ ضربة
  var n=c.sampleRate*2, b=c.createBuffer(1,n,c.sampleRate), d=b.getChannelData(0);
  var b0=0,b1=0,b2=0;
  for(var i=0;i<n;i++){var w=Math.random()*2-1;b0=0.997*b0+0.029*w;b1=0.985*b1+0.032*w;b2=0.95*b2+0.048*w;d[i]=(b0+b1+b2+w*0.05)*0.6}
  // وصلٌ ناعم بين نهاية الحلقة وبدايتها
  var f=Math.floor(c.sampleRate*0.02);for(var j=0;j<f;j++){var k=j/f;d[j]*=k;d[n-1-j]*=k}
  slideB=b;return b;
 }
 function slide(level){
  var on=false;try{on=!!enabled()}catch(e){}
  var c=ctx;
  if(!on||!c){if(SL)slideStop();return false}
  level=Math.max(0,Math.min(1,+level||0));
  var now=c.currentTime;
  if(level<=0.001){
   if(SL){SL.g.gain.setTargetAtTime(0.0001,now,0.08);var s=SL;SL=null;setTimeout(function(){try{s.src.stop()}catch(e){}},500)}
   return true;
  }
  if(c.state==='suspended'){try{c.resume().catch(function(){})}catch(e){}}
  if(!SL){
   var src=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();
   src.buffer=slideBuf(c);src.loop=true;
   f.type='bandpass';f.frequency.value=900;f.Q.value=0.7;
   g.gain.value=0.0001;
   src.connect(f);f.connect(g);g.connect(c.destination);
   try{src.start()}catch(e){return false}
   SL={src:src,f:f,g:g};
  }
  var gain=0.04+0.30*Math.pow(level,0.7);
  SL.g.gain.setTargetAtTime(gain,now,0.05);
  SL.f.frequency.setTargetAtTime(650+1400*level,now,0.08);
  SL.src.playbackRate.setTargetAtTime(0.8+0.45*level,now,0.08);
  return true;
 }
 function slideStop(){if(!SL)return;var s=SL;SL=null;try{s.g.gain.value=0.0001;s.src.stop()}catch(e){}}
 /* ── العيّنات ── */
 var SPR={};                                   // name → {buf, seg:{key:[[offset,dur],…]}}
 /* نمط الطقّات (٦٫٤٥): المفتاح يُبحث عنه أوّلًا باسم النمط ('wood_hit') ثمّ عاريًا */
 var STYLE='wood';
 function style(s){if(s)STYLE=String(s);return STYLE}
 var loading={};
 function loadSprite(name,url,seg){
  if(SPR[name]||loading[name]||!W||typeof W.fetch!=='function')return;
  loading[name]=1;
  W.fetch(url).then(function(r){return r.ok?r.arrayBuffer():null}).then(function(ab){
   if(!ab)throw 0;
   var c=ac();if(!c)throw 0;
   return new Promise(function(res,rej){
    /* الصيغتان: وعدٌ في المتصفّحات الحديثة، ونداءان في WebView أقدم */
    try{var p=c.decodeAudioData(ab,res,rej);if(p&&p.then)p.then(res,rej)}catch(e){rej(e)}
   });
  }).then(function(buf){SPR[name]={buf:buf,seg:seg||{}}}).catch(function(){}).then(function(){delete loading[name]});
 }
 /** يعزف مقطعًا من عيّنة: يختار صيغةً عشوائيّة، ويضبط الشدّة والنبرة بالسرعة */
 function sample(name,key,t0,opt){
  var s=SPR[name];if(!s||!s.buf)return false;
  var list=s.seg[STYLE+'_'+key]||s.seg[key];if(!list||!list.length)return false;
  var c=ac();if(!c)return false;
  var seg=list[(Math.random()*list.length)|0];
  var v=opt&&opt.v!=null?opt.v:8;
  /* الشدّة تتبع السرعة بمنحنىً هادئ: اللمسة تُهمَس والضربة تُقرَع */
  var g=Math.max(0.10,Math.min(1,Math.pow(v/9,1.15)))*(opt&&opt.gain!=null?opt.gain:1);
  var rate=0.94+Math.random()*0.10+Math.min(0.06,v/200);
  var src=c.createBufferSource(),vol=c.createGain();
  src.buffer=s.buf;src.playbackRate.value=rate;
  /* النهاية بمنحدرٍ لا بقطع: ترميز Opus يؤخّر المحتوى بضع مللي ثوانٍ عن مواضع JSON،
     فكان آخر العيّنة يُقطع قبل خفوته ويُسمع «طقطقة» — والفجوة بين العيّنات ٣٠ م.ث تتّسع للامتداد */
  var dur=seg[1]+0.004, end=t0+dur/rate;
  vol.gain.setValueAtTime(g*0.9,t0);
  vol.gain.setValueAtTime(g*0.9,Math.max(t0,end-0.006));
  vol.gain.linearRampToValueAtTime(0,end);
  src.connect(vol);vol.connect(c.destination);
  try{src.start(t0,seg[0],dur)}catch(e){return false}
  return true;
 }

 var LIB={
  tap:   function(t){tone(880,t,0.045,'sine',0.07)},
  ok:    function(t){tone(660,t,0.09,'triangle',0.15);tone(990,t+0.08,0.15,'triangle',0.15)},
  bad:   function(t){tone(230,t,0.2,'sawtooth',0.10,150)},
  win:   function(t){[523,659,784,1047].forEach(function(f,i){tone(f,t+i*0.11,0.24,'triangle',0.15)})},
  lose:  function(t){[392,330,262].forEach(function(f,i){tone(f,t+i*0.14,0.26,'sine',0.13)})},
  /* أصوات الكيرم: العيّنة أوّلًا، والتركيب احتياطٌ إن لم تُحمَّل بعد */
  /* الإطلاق: نقرة الإصبع تكاد لا تُسمع في الواقع — همسةٌ خافتة، والطقّة الحقيقيّة عند أوّل اصطدام */
  strike:function(t,o){if(!sample('carrom','flick',t,{v:5,gain:0.45}))
           {noise(t,0.025,0.08,3400)}},
  pot:   function(t,o){if(!sample('carrom','pot',t,{v:10}))
           {tone(520,t,0.09,'sine',0.12,300);noise(t+0.02,0.1,0.14,900)}},
  hit:   function(t,o){if(!sample('carrom','hit',t,o))
           {var v=o&&o.v||6;noise(t,0.022,Math.min(0.22,0.03*v),5200);tone(1900,t,0.03,'square',Math.min(0.06,0.008*v),1300)}},
  wall:  function(t,o){if(!sample('carrom','wall',t,o))
           {var v=o&&o.v||6;noise(t,0.05,Math.min(0.2,0.03*v),1400);tone(420,t,0.05,'sine',Math.min(0.08,0.012*v),300)}},
  coin:  function(t){tone(1320,t,0.06,'square',0.05);tone(1760,t+0.06,0.13,'square',0.05)},
  /* 5.88: عدّاد العشر الثواني الأخيرة — «طي» جافّة قصيرة كعقرب ساعة، لا نغمة موسيقيّة */
  tick:  function(t){noise(t,0.018,0.080,5200);tone(1500,t,0.028,'square',0.042,1180)},
  tickHot:function(t){noise(t,0.022,0.115,7000);tone(2050,t,0.034,'square',0.062,1500)},
  timeUp:function(t){tone(300,t,0.34,'triangle',0.16,120);noise(t,0.09,0.10,1200)}
 };
 var HAPT={ok:[20],bad:[40,30,40],win:[30,40,30,40,80],lose:[70],strike:15,pot:[15,20,15],hit:[7]};

 function play(k,opt){
  var f=LIB[k];if(!f)return false;
  var on=false;try{on=!!enabled()}catch(e){}
  if(!on)return false;
  var c=ac();if(!c)return false;
  if(c.state==='suspended'){try{c.resume().catch(function(){})}catch(e){}}
  try{f(c.currentTime,opt||null)}catch(e){return false}
  return true;
 }
 function vibe(k){
  var pat=HAPT[k];if(!pat)return false;   // مفتاح بلا نمط (tap/coin) لا يهتزّ أبدًا
  var on=false;try{on=!!haptic()}catch(e){}
  if(!on||!W||!W.navigator||typeof W.navigator.vibrate!=='function')return false;
  try{return !!W.navigator.vibrate(pat)}catch(e){return false}
 }
 function fx(k,opt){var a=play(k,opt),b=vibe(k);return a||b}
 function available(){return !!AC()}
 function hapticAvailable(){return !!(W&&W.navigator&&typeof W.navigator.vibrate==='function')}

 return {init:init,unlock:unlock,play:play,haptic:vibe,fx:fx,loadSprite:loadSprite,slide:slide,style:style,available:available,hapticAvailable:hapticAvailable,
  _names:Object.keys(LIB)};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=SFX;
