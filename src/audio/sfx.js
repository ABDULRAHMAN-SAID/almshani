/**
 * الصوت والاهتزاز — مركّبان داخل اللعبة بلا ملفّات صوت.
 *   SFX.init({enabled:()=>bool, haptic:()=>bool})   من يقرّر التشغيل؟ إعدادات اللاعب
 *   SFX.unlock()      عند أول لمسة — المتصفح لا يفتح الصوت قبلها
 *   SFX.fx('ok')      صوت + اهتزاز معًا      SFX.play(k) / SFX.haptic(k) كلٌّ على حدة
 * الأسماء: tap · ok · bad · win · lose · strike · pot · coin
 * لا DOM هنا إلا window/navigator. لا يرمي أبدًا.
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
 var LIB={
  tap:   function(t){tone(880,t,0.045,'sine',0.07)},
  ok:    function(t){tone(660,t,0.09,'triangle',0.15);tone(990,t+0.08,0.15,'triangle',0.15)},
  bad:   function(t){tone(230,t,0.2,'sawtooth',0.10,150)},
  win:   function(t){[523,659,784,1047].forEach(function(f,i){tone(f,t+i*0.11,0.24,'triangle',0.15)})},
  lose:  function(t){[392,330,262].forEach(function(f,i){tone(f,t+i*0.14,0.26,'sine',0.13)})},
  strike:function(t){noise(t,0.06,0.28,2400);tone(170,t,0.05,'square',0.05)},
  pot:   function(t){tone(520,t,0.09,'sine',0.12,300);noise(t+0.02,0.1,0.14,900)},
  coin:  function(t){tone(1320,t,0.06,'square',0.05);tone(1760,t+0.06,0.13,'square',0.05)}
 };
 var HAPT={ok:[20],bad:[40,30,40],win:[30,40,30,40,80],lose:[70],strike:15,pot:[15,20,15]};

 function play(k){
  var f=LIB[k];if(!f)return false;
  var on=false;try{on=!!enabled()}catch(e){}
  if(!on)return false;
  var c=ac();if(!c)return false;
  if(c.state==='suspended'){try{c.resume().catch(function(){})}catch(e){}}
  try{f(c.currentTime)}catch(e){return false}
  return true;
 }
 function vibe(k){
  var pat=HAPT[k];if(!pat)return false;   // مفتاح بلا نمط (tap/coin) لا يهتزّ أبدًا
  var on=false;try{on=!!haptic()}catch(e){}
  if(!on||!W||!W.navigator||typeof W.navigator.vibrate!=='function')return false;
  try{return !!W.navigator.vibrate(pat)}catch(e){return false}
 }
 function fx(k){var a=play(k),b=vibe(k);return a||b}
 function available(){return !!AC()}
 function hapticAvailable(){return !!(W&&W.navigator&&typeof W.navigator.vibrate==='function')}

 return {init:init,unlock:unlock,play:play,haptic:vibe,fx:fx,available:available,hapticAvailable:hapticAvailable,
  _names:Object.keys(LIB)};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=SFX;
