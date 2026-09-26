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
 /* ═══ ٧٫٢٠ — «الأصوات ضعيفة سيّئة» ═══
    كانت أصوات الواجهة موجاتٍ عارية بشدّة ٠٫٠٣–٠٫١ (أخفض من أصوات اللوح بـ٢٠–٢٦ dB) تذهب إلى السمّاعة مباشرة.
    صار لها سلسلة صوتٍ حقيقيّة: حافلةٌ رئيسيّة بضاغطٍ يحدّ القمم، وقاعةُ صدى مولَّدة (استجابةٌ نبضيّة ستيريو ١٫٨ث)،
    ونماذج آلات: وترٌ منقور بخوارزميّة كاربلس–سترونغ (عود وقانون)، أجراسٌ بتعديل التردّد، نحاسٌ بثلاثة مناشير متباعدة
    عبر مرشّحٍ يتفتّح، طبلةٌ تيمباني بطبقةٍ تهبط، صنجٌ يتنفّس، وخشبٌ ومعدن للنقرات والعملات.
    تسجيلات اللوح الحقيقيّة تمرّ خارج الضاغط كما هي (RAW) فلا تتغيّر ديناميكيّتها */
 var RV=0;
 function BUS(c){
  if(c.__tb)return c.__tb;
  var master=c.createGain();master.gain.value=0.92;master.connect(c.destination);
  var comp=c.createDynamicsCompressor();comp.threshold.value=-14;comp.knee.value=8;comp.ratio.value=5;comp.attack.value=0.004;comp.release.value=0.18;comp.connect(master);
  var dry=c.createGain();dry.gain.value=1;dry.connect(comp);
  var wet=c.createGain();wet.gain.value=1;
  try{var cv=c.createConvolver(),sr=c.sampleRate,n=Math.floor(sr*1.8),ir=c.createBuffer(2,n,sr);
   for(var ch=0;ch<2;ch++){var d=ir.getChannelData(ch),lp=0,lp2=0;for(var k=0;k<n;k++){var tt=k/sr,w=Math.random()*2-1,on=(tt<0.012?tt/0.012:1);lp=lp*0.93+w*0.07;lp2=lp2*0.93+lp*0.07;   // قاعةٌ داكنة: الجسم الطويل منخفض، واللمعان قصير
     d[k]=on*(lp2*6*Math.exp(-tt/0.5)+lp*1.6*Math.exp(-tt/0.09))}   // ٧٫٢٢: كان جزءٌ من الضجيج أبيضَ خامًا (w) فيُسمَع «تشويشًا» في ذيل كلّ صوت — صار مرشَّحًا
    for(var r=0;r<6;r++){var at=Math.floor(sr*(0.011+r*0.013+ch*0.004));if(at<n)d[at]+=0.5*Math.pow(0.7,r)*(r%2?-1:1)}}
   cv.buffer=ir;var rg=c.createGain();rg.gain.value=0.55;wet.connect(cv);cv.connect(rg);rg.connect(comp)}catch(e){}
  c.__tb={dry:dry,wet:wet,raw:master};return c.__tb;
 }
 function RAW(c){return BUS(c).raw}
 function route(node,c,send){var b=BUS(c);node.connect(b.dry);var sv=send==null?RV:send;if(sv>0){var s=c.createGain();s.gain.value=sv;node.connect(s);s.connect(b.wet)}}
 var KS={};
 /* وترٌ منقور (كاربلس–سترونغ): دفعةُ ضجيجٍ في خطّ تأخيرٍ طوله دورةٌ واحدة، يُعاد متوسّطها فيخمد كالوتر الحقيقيّ */
 function ksBuf(c,f,d,br){var sr=c.sampleRate,key=sr+':'+Math.round(f*10)+':'+d+':'+br;if(KS[key])return KS[key];
  var N=Math.max(2,Math.round(sr/f)),n=Math.floor(sr*d),b=c.createBuffer(1,n,sr),y=b.getChannelData(0),prev=0;
  for(var i=0;i<N&&i<n;i++){var w=Math.random()*2-1;prev=prev*(1-br)+w*br;y[i]=prev}
  var rho=Math.pow(0.001,1/(f*d));for(i=N;i<n;i++)y[i]=rho*0.5*(y[i-N]+y[i-N-1<0?0:i-N-1]);
  var pk=0;for(i=0;i<n;i++)pk=Math.max(pk,Math.abs(y[i]));var fo=Math.floor(sr*0.006);for(i=0;i<n;i++){y[i]/=pk||1;if(i>n-fo)y[i]*=(n-i)/fo}
  KS[key]=b;return b}
 function kpluck(f,t0,g,d,br,body){var c=ac();if(!c)return;var s=c.createBufferSource(),v=c.createGain();s.buffer=ksBuf(c,f,d||0.9,br||0.5);v.gain.value=g;
  /* ٧٫٢٢ — الضبط: طول الخطّ عددٌ صحيح ومرشّح المتوسّط يضيف نصف عيّنة، فكانت النبرة أخفض من المطلوب (−٤٤ سنتًا عند ١١٧٥ هرتز،
     قرابة ربع صوت) فيُسمع اللحن «نشازًا» فوق النحاس والأجراس المضبوطة. التصحيح بسرعة التشغيل: النبرة الفعليّة ÷ المطلوبة */
  var N=Math.max(2,Math.round(c.sampleRate/f));s.playbackRate.value=f*(N+0.5)/c.sampleRate;
  if(body){var pk=c.createBiquadFilter();pk.type='peaking';pk.frequency.value=body;pk.Q.value=1.2;pk.gain.value=5;s.connect(pk);pk.connect(v)}else s.connect(v);route(v,c);s.start(t0)}
 /* جرسٌ بتعديل التردّد: حاملٌ ومعدِّلٌ بنسبة ١ : ٣٫٥ — بريقٌ معدنيّ يخمد ويصفو */
 function bell(f,t0,g,d){var c=ac();if(!c)return;d=d||0.9;var car=c.createOscillator(),mod=c.createOscillator(),mg=c.createGain(),v=c.createGain();
  car.frequency.value=f;mod.frequency.value=f*3.5;mg.gain.setValueAtTime(f*2.4,t0);mg.gain.exponentialRampToValueAtTime(f*0.05,t0+d);mod.connect(mg);mg.connect(car.frequency);
  v.gain.setValueAtTime(0.0001,t0);v.gain.exponentialRampToValueAtTime(g,t0+0.003);v.gain.exponentialRampToValueAtTime(0.0001,t0+d);car.connect(v);route(v,c);
  car.start(t0);mod.start(t0);car.stop(t0+d+0.05);mod.stop(t0+d+0.05)}
 /* نحاس: ثلاثة مناشير متباعدة ±٧ سنت عبر مرشّحٍ يتفتّح ثمّ يدفأ */
 /* ٧٫٢٢ — «الصوت مشوّش»: كان النحاس ثلاثة مناشير خام متباعدة ±٧ سنت (١٢ منشارًا في الفوز) عبر مرشّحٍ يتفتّح إلى ٥٫٢ ك.هرتز —
    خشونةٌ وضربٌ متداخل يملأ الطيف كلّه. صار موجةً نحاسيّة محدودة الجزئيّات (١٥ جزئيًّا يخفت علوّها) بصوتين فقط ±٣ سنت،
    ومرشّحًا يتفتّح إلى ٣ ك.هرتز على الأكثر ثمّ يدفأ */
 var BW=null;function brassWave(c){if(BW&&BW.c===c)return BW.w;var n=16,re=new Float32Array(n),im=new Float32Array(n);
  for(var h=1;h<n;h++)im[h]=Math.pow(h,-1.1)*(h<=4?1:Math.exp(-(h-4)*0.3));BW={c:c,w:c.createPeriodicWave(re,im)};return BW.w}
 function brass(f,t0,d,g){var c=ac();if(!c)return;var lp=c.createBiquadFilter(),v=c.createGain();lp.type='lowpass';lp.Q.value=0.6;
  lp.frequency.setValueAtTime(500,t0);lp.frequency.exponentialRampToValueAtTime(Math.min(3000,f*6),t0+0.06);lp.frequency.exponentialRampToValueAtTime(Math.min(1800,f*3.2),t0+Math.max(0.12,d));
  v.gain.setValueAtTime(0.0001,t0);v.gain.linearRampToValueAtTime(g,t0+0.03);v.gain.setValueAtTime(g*0.85,t0+Math.max(0.05,d-0.08));v.gain.exponentialRampToValueAtTime(0.0001,t0+d+0.28);
  var w=brassWave(c);[-3,3].forEach(function(ct){var o=c.createOscillator();o.setPeriodicWave(w);o.frequency.value=f;o.detune.value=ct;o.connect(lp);o.start(t0);o.stop(t0+d+0.32)});lp.connect(v);route(v,c)}
 function timp(t0,f,g){var c=ac();if(!c)return;var o=c.createOscillator(),v=c.createGain();o.type='sine';o.frequency.setValueAtTime(f*1.25,t0);o.frequency.exponentialRampToValueAtTime(f,t0+0.12);
  v.gain.setValueAtTime(0.0001,t0);v.gain.exponentialRampToValueAtTime(g,t0+0.006);v.gain.exponentialRampToValueAtTime(0.0001,t0+1.1);o.connect(v);route(v,c);o.start(t0);o.stop(t0+1.2);noise(t0,0.09,g*0.5,500)}
 var NB2=null;function nbuf(c){if(NB2&&NB2.sampleRate===c.sampleRate)return NB2;var n=c.sampleRate*2,b=c.createBuffer(1,n,c.sampleRate),d=b.getChannelData(0);for(var i=0;i<n;i++)d[i]=Math.random()*2-1;NB2=b;return b}
 /* ٧٫٢٢ — الصنج كان ضجيجًا أبيض فوق ٦٫٥ ك.هرتز يدوم ثانية: يُسمع «تشويشًا» كالتلفاز. صار لمعانًا معدنيًّا: ستّة جزئيّاتٍ
    غير متناسقة يخمد كلٌّ منها بسرعته (كصنجٍ صغير أو مثلّث)، وتحتها نفَسٌ ضيّقٌ خافت من الضجيج */
 function cymbal(t0,d,g,swell){var c=ac();if(!c)return;var pk=t0+(swell||0.004),v=c.createGain();
  v.gain.setValueAtTime(0.0001,t0);v.gain.exponentialRampToValueAtTime(g,pk);v.gain.exponentialRampToValueAtTime(0.0001,pk+d);route(v,c);
  [[3140,1,1],[4210,0.8,0.8],[5270,0.6,0.65],[6630,0.45,0.5],[7900,0.35,0.4],[9310,0.25,0.3]].forEach(function(q){var o=c.createOscillator(),og=c.createGain();o.frequency.value=q[0];
   og.gain.setValueAtTime(q[1]*0.5,t0);og.gain.exponentialRampToValueAtTime(0.0001,pk+d*q[2]);o.connect(og);og.connect(v);o.start(t0);o.stop(pk+d+0.05)});
  var s=c.createBufferSource(),bp=c.createBiquadFilter(),ng=c.createGain();s.buffer=nbuf(c);bp.type='bandpass';bp.frequency.value=8500;bp.Q.value=1.2;ng.gain.value=0.35;
  s.connect(bp);bp.connect(ng);ng.connect(v);s.start(t0);s.stop(pk+d+0.05)}
 function whoosh(t0,d,g,f0,f1){var c=ac();if(!c)return;var s=c.createBufferSource(),bp=c.createBiquadFilter(),v=c.createGain();s.buffer=nbuf(c);bp.type='bandpass';bp.Q.value=1.4;bp.frequency.setValueAtTime(f0,t0);bp.frequency.exponentialRampToValueAtTime(f1,t0+d);
  v.gain.setValueAtTime(0.0001,t0);v.gain.linearRampToValueAtTime(g,t0+d*0.7);v.gain.exponentialRampToValueAtTime(0.0001,t0+d);s.connect(bp);bp.connect(v);route(v,c);s.start(t0);s.stop(t0+d+0.05)}
 /* معدن: عملةٌ ترنّ — جزئيّاتٌ غير متناسقة تخمد بسرعاتٍ مختلفة */
 function clink(t0,g,k){var c=ac();if(!c)return;k=k||1;[[2380,1,0.22],[3320,0.7,0.16],[5150,0.45,0.1],[7040,0.25,0.06]].forEach(function(q){var o=c.createOscillator(),v=c.createGain();o.frequency.value=q[0]*k;
  v.gain.setValueAtTime(0.0001,t0);v.gain.exponentialRampToValueAtTime(g*q[1],t0+0.002);v.gain.exponentialRampToValueAtTime(0.0001,t0+q[2]);o.connect(v);route(v,c);o.start(t0);o.stop(t0+q[2]+0.02)});noise(t0,0.008,g*0.4,9000)}
 function creak(t0,d,g){var c=ac();if(!c)return;var o=c.createOscillator(),bp=c.createBiquadFilter(),v=c.createGain(),lfo=c.createOscillator(),lg=c.createGain();o.type='sawtooth';o.frequency.value=70;
  lfo.frequency.value=23;lg.gain.value=28;lfo.connect(lg);lg.connect(o.frequency);bp.type='bandpass';bp.Q.value=6;bp.frequency.setValueAtTime(700,t0);bp.frequency.exponentialRampToValueAtTime(1500,t0+d);
  v.gain.setValueAtTime(0.0001,t0);v.gain.linearRampToValueAtTime(g,t0+0.05);v.gain.exponentialRampToValueAtTime(0.0001,t0+d);o.connect(bp);bp.connect(v);route(v,c);o.start(t0);lfo.start(t0);o.stop(t0+d+0.05);lfo.stop(t0+d+0.05)}
 function withRV(x,f){var p=RV;RV=x;try{f()}finally{RV=p}}
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
  o.connect(v);route(v,c);
  o.start(t0);o.stop(t0+d+0.03);
 }
 /* ٦٫٩٧ — نغمةٌ دافئة: مذبذبٌ عبر مرشّحٍ منخفضٍ ليّن، هجومٌ ناعم (٣٠ مللي ثانية) وذيلٌ طويل — لنداءَي الفوز والخسارة */
 function pad(f,t0,d,type,g,rel,cut){
  var c=ac();if(!c)return;
  var o=c.createOscillator(),v=c.createGain(),lp=c.createBiquadFilter();
  o.type=type||'triangle';o.frequency.setValueAtTime(f,t0);
  lp.type='lowpass';lp.frequency.setValueAtTime(cut||2400,t0);lp.Q.value=0.5;
  rel=rel||0.3;g=g||0.1;
  v.gain.setValueAtTime(0.0001,t0);
  v.gain.linearRampToValueAtTime(g,t0+0.03);
  v.gain.setValueAtTime(g,t0+Math.max(0.03,d-rel));
  v.gain.exponentialRampToValueAtTime(0.0001,t0+d);
  o.connect(lp);lp.connect(v);route(v,c);
  o.start(t0);o.stop(t0+d+0.05);
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
  s.connect(f);f.connect(v);route(v,c);
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
  /* ٦٫٤٨ — الأصليّ: حفيف الحركة من التسجيل نفسه، حلقةٌ داخل ملفّ العيّنات (مستواه محفوظٌ فيه).
     ٦٫٦٦: والحلقة وحدها — قبل وصول الملفّ صمتٌ لا حفيفٌ مركَّب («الصوت أبدًا مش مناسب») */
  var rs=SPR.carrom&&SPR.carrom.buf&&SPR.carrom.seg.orig_roll, real=!!(rs&&rs.length);
  if(!real){if(SL)slideStop();return false}
  if(SL&&SL.real!==real){var o=SL;SL=null;o.g.gain.setTargetAtTime(0.0001,now,0.03);setTimeout(function(){try{o.src.stop()}catch(e){}},200)}   // تغيّر النمط أو اكتمل تحميل الملفّ أثناء الحركة: خفوتٌ لا قطع
  if(!SL){
   var src=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();
   if(real){
    src.buffer=SPR.carrom.buf;src.loop=true;
    src.loopStart=rs[0][0];src.loopEnd=rs[0][0]+rs[0][1]-0.002;
    f.type='highpass';f.frequency.value=150;f.Q.value=0.5;   // التسجيل بطيفه كما هو — حراسةٌ من الهدير فقط
   }else{
    src.buffer=slideBuf(c);src.loop=true;
    f.type='bandpass';f.frequency.value=2400;f.Q.value=0.6;   // التسجيل الحقيقيّ: طاقة الانزلاق بين ١٫٤ و٥٫٥ ك.هرتز
   }
   g.gain.value=0.0001;
   src.connect(f);f.connect(g);g.connect(RAW(c));
   try{real?src.start(0,rs[0][0]):src.start()}catch(e){return false}
   SL={src:src,f:f,g:g,real:real};
  }
  if(SL.real){
   /* الحلقة محفوظةٌ بمستوى «كلّ القطع تتحرّك» (−٢٨ dB عن أعلى طقّة) — تخفت كلّما هدأت حتى الصمت، كما في
      التسجيل (من −٣٧ إلى −٥٥ dB ثم لا شيء). ٦٫٦٦: بلا أرضيّة ٠٫١٢ كانت تُبقي الحفيف والقطع شبه ساكنة، وبلا تغيير
      سرعة التشغيل — كانت تغيّر نبرته مع السرعة فيصير صوتًا آخر */
   SL.g.gain.setTargetAtTime(Math.pow(level,1.1),now,0.06);
   return true;
  }
  /* الشدّة: في التسجيل حفيف الحركة أخفض من ضربة الضارب بنحو ٣٠ dB — كان هنا أعلى بعشرة أضعاف */
  var gain=0.006+0.034*Math.pow(level,0.7);
  SL.g.gain.setTargetAtTime(gain,now,0.05);
  SL.f.frequency.setTargetAtTime(1900+1500*level,now,0.08);
  SL.src.playbackRate.setTargetAtTime(0.8+0.45*level,now,0.08);
  return true;
 }
 function slideStop(){if(!SL)return;var s=SL;SL=null;try{s.g.gain.value=0.0001;s.src.stop()}catch(e){}}
 /* ── حفيف تحريك الضارب (٦٫٦٧) ──
    «حتى عند سحب الجيس… هناك صوتٌ جميل»: من التسجيل نفسه (orig_move، −٣٧ dB عن أعلى طقّة). يعلو بسرعة
    الإصبع على الشريط أو في السحب للتصويب، ويسكت حين يقف الإصبع. قبل وصول الملفّ: صمت */
 var MV=null;
 function move(level){
  var on=false;try{on=!!enabled()}catch(e){}
  var c=ctx, rs=SPR.carrom&&SPR.carrom.buf&&SPR.carrom.seg.orig_move;
  if(!on||!c||!rs||!rs.length){if(MV){try{MV.src.stop()}catch(e){}MV=null}return false}
  level=Math.max(0,Math.min(1,+level||0));
  var now=c.currentTime;
  if(level<=0.001){if(MV)MV.g.gain.setTargetAtTime(0.0001,now,0.05);return true}
  if(c.state==='suspended'){try{c.resume().catch(function(){})}catch(e){}}
  if(!MV){
   var src=c.createBufferSource(),g=c.createGain();
   src.buffer=SPR.carrom.buf;src.loop=true;src.loopStart=rs[0][0];src.loopEnd=rs[0][0]+rs[0][1]-0.002;
   g.gain.value=0.0001;src.connect(g);g.connect(RAW(c));
   try{src.start(0,rs[0][0]+Math.random()*(rs[0][1]-0.3))}catch(e){return false}
   MV={src:src,g:g};
  }
  MV.g.gain.setTargetAtTime(Math.pow(level,0.8),now,0.03);
  return true;
 }
 /* ── العيّنات ── */
 var SPR={};                                   // name → {buf, seg:{key:[[offset,dur],…]}}
 /* نمط الطقّات (٦٫٤٥): المفتاح يُبحث عنه أوّلًا باسم النمط ('wood_hit') ثمّ عاريًا */
 var STYLE='orig';
 function style(s){return STYLE}   // ٦٫٦٦: نمطٌ واحد — الأصليّ
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
  var list=s.seg[STYLE+'_'+key]||s.seg[key]||s.seg['real_'+key]||s.seg['wood_'+key];if(!list||!list.length)return false;   // ملفٌّ قديم من عامل خدمةٍ سابق: عيّنةٌ أفضل من تركيب
  var c=ac();if(!c)return false;
  var v=opt&&opt.v!=null?opt.v:8;
  /* أربع صيغٍ للطقّة: الأوليان ضربةُ الضارب (قويّة، عريضة الطيف) والأخريان قطعةٌ بقطعة
     (أخفض وأقصر) — كما في التسجيل الحقيقيّ. السرعة تختار الصنف، والعشوائيّة الصيغة */
  /* من اصطدم؟ المحرّك يعرف (opt.s = الضارب طرفٌ في الاصطدام) — السرعة وحدها كانت تُخطئ:
     معظم ضربات الضارب أبطأ من ٦٫٥ عند التماسّ فتُسمَع طقّة قطعة. السرعة تُبقى احتياطًا. */
  var pool=list, coin=false;
  if(key==='hit'&&list.length>=4&&(STYLE==='real'||STYLE==='orig')){var st=(opt&&opt.s!=null)?!!opt.s:v>=6.5;pool=st?list.slice(0,2):list.slice(2);coin=!st}
  var seg=pool[(Math.random()*pool.length)|0];
  /* الشدّة تتبع السرعة بمنحنىً هادئ: اللمسة تُهمَس والضربة تُقرَع.
     صيغ القطعة بقطعة مخفَّضةٌ في الملفّ أصلًا (−٧٫٥ dB، في real وorig كليهما — build-sfx.py) فمنحناها شبه مستوٍ — وإلّا هبطت ٢٥ dB */
  var g=(coin?0.6+0.4*Math.min(1,v/6.5):Math.max(0.10,Math.min(1,Math.pow(v/9,1.15))))*(opt&&opt.gain!=null?opt.gain:1);
  /* الأصليّ تسجيلٌ حقيقيّ: تفاوتٌ ضئيلٌ في الطبقة يكفي لئلّا يتكرّر حرفيًّا — أكثر منه يغيّر الصوت */
  var rate=STYLE==='orig'?0.98+Math.random()*0.04:0.94+Math.random()*0.10+Math.min(0.06,v/200);
  var src=c.createBufferSource(),vol=c.createGain();
  src.buffer=s.buf;src.playbackRate.value=rate;
  /* النهاية بمنحدرٍ لا بقطع: ترميز Opus يؤخّر المحتوى بضع مللي ثوانٍ عن مواضع JSON،
     فكان آخر العيّنة يُقطع قبل خفوته ويُسمع «طقطقة» — والفجوة بين العيّنات ٣٠ م.ث تتّسع للامتداد */
  var dur=seg[1]+0.004, end=t0+dur/rate;
  vol.gain.setValueAtTime(g*0.9,t0);
  vol.gain.setValueAtTime(g*0.9,Math.max(t0,end-0.006));
  vol.gain.linearRampToValueAtTime(0,end);
  src.connect(vol);vol.connect(RAW(c));
  try{src.start(t0,seg[0],dur)}catch(e){return false}
  return true;
 }

 /* ٧٫٠٤ — «أصوات الضغط مستفزّة ولا تحمل هويّة اللعبة»: خشبٌ ووتر بدل الصفّارة (كانت ٨٨٠ هرتز جيبيّة عارية).
    wood(): طقّة خشبٍ كقطعة كيرم تُوضع على اللوح — جزئيّان بنسبة قضيبٍ خشبيّ (١ : ٢٫٧٦) يخمدان في ٥٠ م.ث، ونفَسٌ قصير.
    pluck(): نقرة وترٍ كالعود — مثلّثٌ عبر مرشّحٍ ينغلق سريعًا (يلمع ثمّ يدفأ) وجيبٌ بثُمانيةٍ تحته. التنقّل صاعد (ري ← لا)،
    والرجوع هابط (لا ← ري). كلّها خافتة (أعلاها ٠٫٠٦) ولا موجة مربّعة */
 function wood(f,t0,g){
  var c=ac();if(!c)return;
  [[f,1,0.05],[f*2.76,0.32,0.024]].forEach(function(q){var o=c.createOscillator(),v=c.createGain();o.type='sine';o.frequency.setValueAtTime(q[0],t0);o.frequency.exponentialRampToValueAtTime(q[0]*0.95,t0+q[2]);
   v.gain.setValueAtTime(0.0001,t0);v.gain.exponentialRampToValueAtTime(g*q[1],t0+0.003);v.gain.exponentialRampToValueAtTime(0.0001,t0+q[2]);o.connect(v);route(v,c);o.start(t0);o.stop(t0+q[2]+0.02)});
  noise(t0,0.01,g*0.3,3800);
 }
 function pluck(f,t0,g,d){
  var c=ac();if(!c)return;d=d||0.32;
  var o=c.createOscillator(),lp=c.createBiquadFilter(),v=c.createGain();
  o.type='triangle';o.frequency.setValueAtTime(f,t0);
  lp.type='lowpass';lp.Q.value=0.7;lp.frequency.setValueAtTime(f*8,t0);lp.frequency.exponentialRampToValueAtTime(f*1.4,t0+d*0.6);
  v.gain.setValueAtTime(0.0001,t0);v.gain.exponentialRampToValueAtTime(g,t0+0.004);v.gain.exponentialRampToValueAtTime(0.0001,t0+d);
  o.connect(lp);lp.connect(v);route(v,c);o.start(t0);o.stop(t0+d+0.03);
  var s2=c.createOscillator(),sv=c.createGain();s2.type='sine';s2.frequency.setValueAtTime(f/2,t0);
  sv.gain.setValueAtTime(0.0001,t0);sv.gain.exponentialRampToValueAtTime(g*0.45,t0+0.006);sv.gain.exponentialRampToValueAtTime(0.0001,t0+d*0.8);
  s2.connect(sv);route(sv,c);s2.start(t0);s2.stop(t0+d);
 }
 /* ٧٫٢٣ — من تسجيلَي كلاش رويال اللذين أرسلهما المالك (قيست لا تُنسخ): نقرات الواجهة فيهما «طَقّةٌ» نغميّة دافئة بين ٤٩٥ و٦٤٥ هرتز
    تخمد في ٣٠–٤٠ م.ث وتتبدّل نبرتها قليلًا كلّ مرّة، ونقرات الاختيار «فقاعةٌ» تصعد نبرتها (٣٠٠ ← ٧٠٠ تقريبًا)، وكلّها أعلى من
    موسيقى الخلفيّة بنحو ١٠ dB فقط. كانت نقراتنا أجراسًا وأوتارًا لامعة (١٫٣–٢٫٣ ك.هرتز) أعلى بكثير — فتُسمع حادّةً رخيصة */
 function bloop(f0,f1,t0,g,d){var c=ac();if(!c)return;d=d||0.07;var o=c.createOscillator(),o2=c.createOscillator(),v=c.createGain(),v2=c.createGain(),lp=c.createBiquadFilter();
  o.type='sine';o.frequency.setValueAtTime(f0,t0);o.frequency.exponentialRampToValueAtTime(f1,t0+d*0.55);
  o2.type='triangle';o2.frequency.setValueAtTime(f0*2,t0);o2.frequency.exponentialRampToValueAtTime(f1*2,t0+d*0.55);
  lp.type='lowpass';lp.frequency.value=2600;lp.Q.value=0.5;
  v.gain.setValueAtTime(0.0001,t0);v.gain.exponentialRampToValueAtTime(g,t0+0.004);v.gain.exponentialRampToValueAtTime(0.0001,t0+d);
  v2.gain.setValueAtTime(0.0001,t0);v2.gain.exponentialRampToValueAtTime(g*0.22,t0+0.004);v2.gain.exponentialRampToValueAtTime(0.0001,t0+d*0.6);
  o.connect(v);o2.connect(v2);v.connect(lp);v2.connect(lp);route(lp,c);o.start(t0);o2.start(t0);o.stop(t0+d+0.03);o2.stop(t0+d+0.03)}
 /* طَقّةٌ نغميّة (ماريمبا خشبيّة): جيبٌ أساسيّ وجزئيّ ×٤ يخمد أسرع، ولمسة هواءٍ قصيرة */
 function tok(f,t0,g,d){var c=ac();if(!c)return;d=d||0.06;[[1,1,d],[3.93,0.18,d*0.35]].forEach(function(q){var o=c.createOscillator(),v=c.createGain();o.frequency.value=f*q[0];
   v.gain.setValueAtTime(0.0001,t0);v.gain.exponentialRampToValueAtTime(g*q[1],t0+0.002);v.gain.exponentialRampToValueAtTime(0.0001,t0+q[2]);o.connect(v);route(v,c);o.start(t0);o.stop(t0+q[2]+0.02)});
  noise(t0,0.006,g*0.12,2200)}
 var D4=293.66,A4=440,D5=587.33,Fs5=739.99,A5=880;
 var LIB={
  /* نقرة الواجهة: خشبٌ دافئ بجسمٍ منخفض — تُسمع ولا تزعج */
  /* نقرة الواجهة: طَقّةٌ دافئة ٥٢٠–٦٢٠ هرتز تتبدّل قليلًا (كلاش رويال) */
  tap:   function(t){tok(540+Math.random()*80,t,0.2,0.055)},
  /* التنقّل: فقاعةٌ تصعد، والرجوع: تهبط */
  nav:   function(t){withRV(0.08,function(){bloop(330,640,t,0.22,0.075)})},
  back:  function(t){withRV(0.08,function(){bloop(560,300,t,0.2,0.075)})},
  /* التأكيد: فقاعةٌ صاعدة ثمّ طَقّتان على خامسة (ري ← لا) — واضحةٌ بلا أجراسٍ حادّة */
  ok:    function(t){withRV(0.14,function(){bloop(420,760,t,0.18,0.07);tok(D5,t+0.06,0.16,0.09);tok(A5,t+0.12,0.13,0.12)})},
  bad:   function(t){withRV(0.18,function(){timp(t,82,0.3);bloop(420,230,t,0.2,0.12);tok(207.65,t+0.1,0.16,0.14)})},
  /* الفوز: طبلةٌ ونحاسٌ بضربتين ثمّ وترٌ ممتدّ، صنجٌ يتنفّس، وقانونٌ يصعد، وأجراسٌ في آخره */
  win:   function(t){withRV(0.26,function(){timp(t,73.4,0.5);
    [[t,0.15],[t+0.19,0.15]].forEach(function(q){[D4,Fs5/2,A4].forEach(function(f){brass(f,q[0],q[1],0.07)})});
    [D4,Fs5/2,A4,D5].forEach(function(f){brass(f,t+0.4,1.05,0.06)});timp(t+0.4,73.4,0.42);cymbal(t+0.4,0.9,0.05,0.03);   // ٧٫٢٢: الطبلة على الأساس (ري) لا على «صول» تحت وتر ري
    [D5,Fs5,A5,1174.7,1480].forEach(function(f,i){kpluck(f,t+0.48+i*0.065,0.22,0.9,0.6)});
    bell(1760,t+0.95,0.11,1.1);bell(2349.3,t+1.08,0.08,1.1)})},
  /* الخسارة: طبلةٌ خافتة وعودٌ يهبط على نهاوند، ووترٌ منخفضٌ دافئ — حزنٌ نبيل لا صفّارة */
  lose:  function(t){withRV(0.32,function(){timp(t,65.4,0.4);[A4,392,349.23,D4].forEach(function(f,i){kpluck(f,t+0.08+i*0.2,0.34,1.0,0.35,250)});
    pad(146.83,t+0.86,1.4,'triangle',0.12,0.9,900);pad(174.61,t+0.86,1.4,'triangle',0.08,0.9,900);pad(220,t+0.86,1.4,'sine',0.06,0.9,1200)})},
  /* أصوات الكيرم: العيّنة أوّلًا، والتركيب احتياطٌ إن لم تُحمَّل بعد */
  /* الإطلاق: نقرة الإصبع تكاد لا تُسمع في الواقع — همسةٌ خافتة، والطقّة الحقيقيّة عند أوّل اصطدام */
  /* الأصليّ: صوت الإطلاق في التسجيل بعلوّ الطقّات نفسها — يُشغَّل بمستواه المسجَّل */
  /* يُفحص وجود المقطع لا اسم النمط فقط: ملف JSON قديمٌ من عامل الخدمة بلا orig_flick يعود إلى الهمسة المركَّبة بمستواها.
     قوّة الإطلاق (٠–٢٠ وحدة/إطار) تُترجم إلى ٣–٩ فتخفت همسة الضربة الرقيقة كما في التسجيل */
  /* ٦٫٦٦ — «الصوت أبدًا مش مناسب»: أصوات الكيرم كلّها من التسجيل (orig_*) — لا بديلٌ مركَّب. قبل وصول الملفّ
     (جزءٌ من الثانية عند فتح اللوح) صمتٌ أصدق من طقّةٍ صناعيّة */
  strike:function(t,o){var sv=o&&o.v!=null?Math.max(3,Math.min(9,o.v*0.6)):9;sample('carrom','flick',t,{v:sv,gain:0.85})},
  pot:   function(t,o){sample('carrom','pot',t,{v:10,gain:0.9})},
  hit:   function(t,o){sample('carrom','hit',t,o)},
  wall:  function(t,o){sample('carrom','wall',t,o)},
  coin:  function(t){withRV(0.12,function(){clink(t,0.26,1);clink(t+0.045,0.18,1.07)})},
  /* عدّاد الثواني: طقّة خشبٍ جافّة كعقرب ساعةٍ قديمة، والساخنة أعلى وأحدّ */
  tick:  function(t){tok(600,t,0.14,0.045)},
  tickHot:function(t){tok(880,t,0.2,0.05);tok(1320,t+0.004,0.06,0.03)},
  timeUp:function(t){withRV(0.25,function(){timp(t,65.4,0.5);brass(146.83,t,0.4,0.09);brass(138.59,t+0.18,0.5,0.08)})},
  /* الصندوق: صريرُ غطاءٍ خشبيّ، ارتطام، هبّةُ ضوء، وأجراسٌ تتفتّح */
  chest: function(t){withRV(0.35,function(){creak(t,0.32,0.16);timp(t+0.3,110,0.42);whoosh(t+0.28,0.55,0.16,500,4200);
   [1174.7,1480,1760,2349].forEach(function(f,i){bell(f,t+0.44+i*0.08,0.16,0.9)});cymbal(t+0.4,0.7,0.045,0.08)})},
  reveal:function(t,o){var r=o&&o.r?o.r|0:0,f=[880,1046.5,1318.5,1760][Math.min(3,r)];withRV(0.28,function(){whoosh(t,0.22,0.1,1200,5000);bell(f,t+0.12,0.24,0.9);kpluck(f,t+0.12,0.22,0.9,0.75);if(r>=2)bell(f*1.5,t+0.2,0.14,1.0)})},
  rare:  function(t){withRV(0.34,function(){timp(t,73.4,0.45);[D5,Fs5,A5,1174.7,1480].forEach(function(f,i){bell(f,t+i*0.07,0.18,1.1);kpluck(f,t+i*0.07,0.16,0.8,0.75)});[D4,Fs5/2,A4].forEach(function(f){brass(f,t+0.36,0.9,0.07)});cymbal(t+0.34,0.85,0.07,0.04)})},
  tally: function(t){tok(560+Math.random()*90,t,0.12,0.045)},
  notif: function(t){withRV(0.2,function(){bloop(500,820,t,0.16,0.07);tok(A5,t+0.07,0.14,0.12);tok(1174.7,t+0.14,0.11,0.16)})},
  trophy:function(t){withRV(0.25,function(){brass(D5,t,0.14,0.08);brass(A5,t+0.12,0.35,0.08);bell(1760,t+0.12,0.14,0.8)})},
  /* ساحةٌ جديدة: موكبٌ نحاسيّ (ري – صول – لا – ري) بطبولٍ وصنجٍ وأجراس */
  arena: function(t){withRV(0.35,function(){var ch=[[D4,Fs5/2,A4],[392,493.88,D5],[A4,554.37,659.25],[D5,Fs5,A5]];ch.forEach(function(c3,i){timp(t+i*0.3,[73.4,98,110,73.4][i],0.45);c3.forEach(function(f){brass(f,t+i*0.3,i===3?1.2:0.24,0.07)})});
   cymbal(t+0.88,1.05,0.09,0.04);[1174.7,1480,1760,2349].forEach(function(f,i){bell(f,t+1.0+i*0.07,0.13,1.1)})})}
 };
 var HAPT={ok:[20],bad:[40,30,40],win:[30,40,30,40,80],lose:[70],strike:15,pot:[15,20,15],hit:[7],chest:[18,30,18],reveal:[10],rare:[20,40,60],arena:[30,40,30,40,80],notif:[12],trophy:[15]};

 /* ٦٫٩٧: المفتاح نفسه مرّتين في ٨٠ مللي ثانية = مرّةٌ واحدة (رنّات الإنجازات الثلاث كانت تُسمع رنّةً واحدةً عالية) —
    إلّا أصوات اللوح الحقيقيّة: الاصطدامات والإدخال والإطلاق تتزامن فعلًا */
 var lastAt={},NODUP={hit:1,wall:1,pot:1,strike:1,tally:1};
 function dup(k){if(NODUP[k])return false;var n=Date.now();if(lastAt[k]&&n-lastAt[k]<80)return true;lastAt[k]=n;return false}
 function play(k,opt,_nd){
  var f=LIB[k];if(!f)return false;
  if(!_nd&&dup(k))return false;
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
 function fx(k,opt){if(dup(k))return false;var a=play(k,opt,1),b=vibe(k);return a||b}
 function available(){return !!AC()}
 function hapticAvailable(){return !!(W&&W.navigator&&typeof W.navigator.vibrate==='function')}

 /* للقياس: يرسم صوتًا في سياقٍ غير متّصل ويعيد العيّنات */
 function render(k,opt,dur){var off=new OfflineAudioContext(2,Math.ceil(44100*(dur||3)),44100),prev=ctx;ctx=off;try{LIB[k](0.02,opt||null)}catch(e){}ctx=prev;return off.startRendering()}
 return {render:render,init:init,unlock:unlock,play:play,haptic:vibe,fx:fx,loadSprite:loadSprite,slide:slide,move:move,style:style,available:available,hapticAvailable:hapticAvailable,
  _names:Object.keys(LIB)};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=SFX;
