/**
 * موسيقى «تحدّي» — لحن أصليّ مركّب داخل اللعبة بلا ملفّ صوت واحد.
 *
 *   MUSIC.init({enabled:()=>bool})   من يقرّر التشغيل؟ إعدادات اللاعب
 *   MUSIC.start()  عند أول لمسة (المتصفّح لا يفتح الصوت قبلها)
 *   MUSIC.stop()   ·  MUSIC.duck(on)  يخفض الصوت أثناء اللعب لا يقطعه
 *   MUSIC.playing()
 *
 * التأليف: رِي الصغرى، ٦٤ نبضة في الدقيقة، ١٦ مازورة تدور بلا فاصل (نحو ٦٠ ثانية).
 * الطبقات: وتريّات ممتدّة · قيثارة تنقر · نفخ ناعم يحمل اللحن · باص جهير · طبل خافت.
 * كلّها موجات مركّبة تمرّ بمرشّح ثم بصدى مولَّد من ضجيج متلاشٍ — لا عيّنات ولا اقتباس.
 * لا DOM هنا إلا window. لا يرمي أبدًا.
 */
var MUSIC=(function(){
 'use strict';
 var W=(typeof window!=='undefined')?window:null;
 var ctx=null,master=null,verb=null,on=false,timer=null,ducked=false;
 var enabled=function(){return true};
 var barAt=0,bar=0;                     // متى تبدأ المازورة التالية، وأيّ مازورة هي
 var BPM=64, BEAT=60/BPM, BAR=BEAT*4;   // نبضة ٠٫٩٣٧٥ ث · مازورة ٣٫٧٥ ث
 var VOL=0.5, DUCK=0.16;                // مستوى هادئ أصلًا، وأهدأ أثناء اللعب

 function init(o){if(o&&typeof o.enabled==='function')enabled=o.enabled}
 function AC(){return W?(W.AudioContext||W.webkitAudioContext):null}

 /* ── نصف نغمة فوق «لا» ٤٤٠ — الأسماء بالنظام العلمي ── */
 var STEP={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
 function hz(n){
  var m=/^([A-G])([b#]?)(-?\d)$/.exec(n);if(!m)return 440;
  var s=STEP[m[1]]+(m[2]==='#'?1:m[2]==='b'?-1:0)+(+m[3]+1)*12;
  return 440*Math.pow(2,(s-69)/12);
 }

 /* ── الصدى: ضجيج متلاشٍ يُصنع مرّة ويُستعمل للجميع — يعطي المكان عمقًا ── */
 function reverb(c){
  var len=Math.floor(c.sampleRate*2.6),b=c.createBuffer(2,len,c.sampleRate);
  for(var ch=0;ch<2;ch++){
   var d=b.getChannelData(ch);
   for(var i=0;i<len;i++){
    var t=i/len;
    d[i]=(Math.random()*2-1)*Math.pow(1-t,2.6)*(1-t*0.35);
   }
  }
  var cv=c.createConvolver();cv.buffer=b;return cv;
 }

 function build(){
  if(ctx)return ctx;
  var A=AC();if(!A)return null;
  try{ctx=new A()}catch(e){ctx=null;return null}
  master=ctx.createGain();master.gain.value=0;          // يدخل بتلاشٍ صاعد
  var wet=ctx.createGain();wet.gain.value=0.34;
  verb=reverb(ctx);
  verb.connect(wet);wet.connect(master);
  master.connect(ctx.destination);
  return ctx;
 }
 /** كل صوت يذهب إلى الجافّ والمبلَّل معًا — نسبة الصدى بحسب الطبقة */
 function bus(send){
  var g=ctx.createGain(),s=ctx.createGain();
  s.gain.value=send==null?0.5:send;
  g.connect(master);g.connect(s);s.connect(verb);
  return g;
 }

 /* ── الآلات ── */
 /** وتريّات: منشاران مُزاحان قليلًا خلف مرشّح يفتح ببطء — نفَس ممتدّ لا نغمة حادّة */
 function pad(f,t,d,g){
  var out=bus(0.75),lp=ctx.createBiquadFilter(),v=ctx.createGain();
  lp.type='lowpass';lp.Q.value=0.7;
  lp.frequency.setValueAtTime(420,t);
  lp.frequency.linearRampToValueAtTime(1150,t+d*0.55);
  lp.frequency.linearRampToValueAtTime(520,t+d);
  v.gain.setValueAtTime(0.0001,t);
  v.gain.linearRampToValueAtTime(g,t+d*0.34);           // دخول بطيء كقوس الكمان
  v.gain.setValueAtTime(g,t+d*0.72);
  v.gain.linearRampToValueAtTime(0.0001,t+d);
  [0,-6,7].forEach(function(cents,i){
   var o=ctx.createOscillator();
   o.type=i===2?'triangle':'sawtooth';
   o.frequency.value=f;o.detune.value=cents;
   o.connect(v);o.start(t);o.stop(t+d+0.1);
  });
  v.connect(lp);lp.connect(out);
 }
 /** قيثارة: مثلّث ينقر ويخبو — حركة اللحن الهادئة تحت الغناء */
 function pluck(f,t,d,g){
  var out=bus(0.55),o=ctx.createOscillator(),o2=ctx.createOscillator(),v=ctx.createGain(),lp=ctx.createBiquadFilter();
  o.type='triangle';o.frequency.value=f;
  o2.type='sine';o2.frequency.value=f*2;
  lp.type='lowpass';lp.frequency.setValueAtTime(2600,t);
  lp.frequency.exponentialRampToValueAtTime(700,t+d);
  v.gain.setValueAtTime(0.0001,t);
  v.gain.exponentialRampToValueAtTime(g,t+0.012);
  v.gain.exponentialRampToValueAtTime(0.0001,t+d);
  var v2=ctx.createGain();v2.gain.value=0.22;o2.connect(v2);v2.connect(v);
  o.connect(v);v.connect(lp);lp.connect(out);
  o.start(t);o.stop(t+d+0.05);o2.start(t);o2.stop(t+d+0.05);
 }
 /** نفخ ناعم يحمل اللحن: منشار مكتوم بمرشّح يفتح مع النَّفَس */
 function horn(f,t,d,g){
  var out=bus(0.6),o=ctx.createOscillator(),o2=ctx.createOscillator(),v=ctx.createGain(),lp=ctx.createBiquadFilter();
  o.type='sawtooth';o.frequency.value=f;
  o2.type='triangle';o2.frequency.value=f;o2.detune.value=5;
  lp.type='lowpass';lp.Q.value=1.1;
  lp.frequency.setValueAtTime(500,t);
  lp.frequency.linearRampToValueAtTime(1700,t+Math.min(0.5,d*0.4));
  lp.frequency.linearRampToValueAtTime(700,t+d);
  v.gain.setValueAtTime(0.0001,t);
  v.gain.linearRampToValueAtTime(g,t+0.14);
  v.gain.setValueAtTime(g,t+d*0.7);
  v.gain.linearRampToValueAtTime(0.0001,t+d);
  o.connect(v);o2.connect(v);v.connect(lp);lp.connect(out);
  o.start(t);o.stop(t+d+0.08);o2.start(t);o2.stop(t+d+0.08);
 }
 /** جهير: جيب نقيّ تحت كل شيء — يُسمع بالصدر لا بالأذن */
 function bass(f,t,d,g){
  var out=bus(0.12),o=ctx.createOscillator(),v=ctx.createGain();
  o.type='sine';o.frequency.value=f;
  v.gain.setValueAtTime(0.0001,t);
  v.gain.linearRampToValueAtTime(g,t+0.06);
  v.gain.setValueAtTime(g,t+d*0.8);
  v.gain.linearRampToValueAtTime(0.0001,t+d);
  o.connect(v);v.connect(out);o.start(t);o.stop(t+d+0.05);
 }
 /** طبل خافت: جيب يهبط سريعًا — نبضة واحدة لا إيقاع صاخب */
 function drum(t,g){
  var out=bus(0.4),o=ctx.createOscillator(),v=ctx.createGain();
  o.type='sine';
  o.frequency.setValueAtTime(96,t);
  o.frequency.exponentialRampToValueAtTime(42,t+0.34);
  v.gain.setValueAtTime(0.0001,t);
  v.gain.exponentialRampToValueAtTime(g,t+0.014);
  v.gain.exponentialRampToValueAtTime(0.0001,t+0.42);
  o.connect(v);v.connect(out);o.start(t);o.stop(t+0.5);
 }

 /* ═══ القطعة ═══
    ١٦ مازورة: أربع جُمَل، الأولى تعرّف اللحن والثانية تجيبه، والثالثة ترتفع
    والرابعة تعود. الوتر يُمدّ مازورة كاملة، والقيثارة تنقر ثمانيات هادئة. */
 var CH=[   /* [نغمات الوتر, جهيره, نغمات القيثارة الستّ] */
  [['D4','F4','A4'],'D2',['D4','A4','D5','F5','D5','A4']],
  [['A3','C4','F4'],'Bb1',['F4','Bb4','D5','F5','D5','Bb4']],
  [['A3','C4','F4'],'F2', ['A4','C5','F5','A5','F5','C5']],
  [['G3','C4','E4'],'C2', ['G4','C5','E5','G5','E5','C5']],
  [['D4','F4','A4'],'D2', ['D4','A4','D5','F5','D5','A4']],
  [['A3','D4','F4'],'Bb1',['F4','Bb4','D5','F5','D5','Bb4']],
  [['G3','Bb3','D4'],'G2',['G4','Bb4','D5','G5','D5','Bb4']],
  [['A3','C#4','E4'],'A1',['A4','C#5','E5','A5','E5','C#5']]
 ];
 /* اللحن: [النغمة, بداية بالنبضات من أوّل المازورة, طولها بالنبضات] — الصمت جزء منه */
 var MEL=[
  [],                                          /* ١ تنفّس: الوتريّات وحدها */
  [['A4',0,3],['F4',3,1]],                     /* ٢ */
  [['A4',0,2],['C5',2,2]],                     /* ٣ */
  [['G4',0,3.5]],                              /* ٤ */
  [['D5',0,2],['C5',2,1],['A4',3,1]],          /* ٥ الجملة تعلو */
  [['F5',0,3.5]],                              /* ٦ */
  [['D5',0,1.5],['C5',1.5,1],['Bb4',2.5,1.5]], /* ٧ */
  [['A4',0,3.5]]                               /* ٨ تستقرّ */
 ];

 /** يجدول مازورة واحدة في وقتها — تُستدعى قبل موعدها بثانيتين */
 function schedule(i,t){
  var half=i%8, second=i>=8;
  var c=CH[half], mel=MEL[half];
  var gp=second?0.052:0.044;                    /* الدورة الثانية أعلى قليلًا */
  c[0].forEach(function(n){pad(hz(n),t,BAR*0.99,gp)});
  bass(hz(c[1]),t,BAR*0.9,0.15);
  if(half===0||half===4)drum(t,0.10);
  if(second&&(half===2||half===6))drum(t+BEAT*2,0.055);
  /* القيثارة: ستّ نقرات في المازورة — الدورة الأولى أخفّ */
  c[2].forEach(function(n,k){
   pluck(hz(n),t+k*(BAR/6),0.85,second?0.075:0.055);
  });
  /* اللحن يدخل في الدورة الثانية وحدها — البداية هادئة تمامًا */
  if(second)mel.forEach(function(m){
   horn(hz(m[0]),t+m[1]*BEAT,m[2]*BEAT,0.062);
  });
 }

 /** الحارس: يجدول ما يقترب موعده ثم ينام — لا حساب في كل إطار */
 function tick(){
  if(!on||!ctx)return;
  var now=ctx.currentTime;
  while(barAt<now+2.2){
   try{schedule(bar%16,barAt)}catch(e){}
   barAt+=BAR;bar++;
  }
 }
 function level(){return ducked?DUCK:VOL}

 function start(){
  var okNow=false;try{okNow=!!enabled()}catch(e){}
  if(!okNow||on)return false;
  var c=build();if(!c)return false;
  if(c.state==='suspended'){try{c.resume().catch(function(){})}catch(e){}}
  on=true;
  barAt=c.currentTime+0.35;bar=0;
  master.gain.cancelScheduledValues(c.currentTime);
  master.gain.setValueAtTime(0.0001,c.currentTime);
  master.gain.linearRampToValueAtTime(level(),c.currentTime+3.2);   // يدخل من بعيد لا يقتحم
  tick();
  timer=W.setInterval(tick,700);
  return true;
 }
 function stop(){
  if(!on)return;
  on=false;
  if(timer){W.clearInterval(timer);timer=null}
  if(!ctx)return;
  var t=ctx.currentTime;
  try{
   master.gain.cancelScheduledValues(t);
   master.gain.setValueAtTime(master.gain.value,t);
   master.gain.linearRampToValueAtTime(0.0001,t+1.1);               // يخرج بتلاشٍ لا بقطع
  }catch(e){}
 }
 /** أثناء اللعب تنخفض ولا تُقطع — فإن خرجتَ عادت كما كانت */
 function duck(v){
  ducked=!!v;
  if(!on||!ctx)return;
  try{
   var t=ctx.currentTime;
   master.gain.cancelScheduledValues(t);
   master.gain.setValueAtTime(master.gain.value,t);
   master.gain.linearRampToValueAtTime(level(),t+0.9);
  }catch(e){}
 }
 /** يتبع الإعداد: يبدأ إن فُتح ويقف إن أُغلق */
 function sync(){
  var want=false;try{want=!!enabled()}catch(e){}
  if(want&&!on)return start();
  if(!want&&on)stop();
  return on;
 }
 function playing(){return on}
 function available(){return !!AC()}

 return {init:init,start:start,stop:stop,duck:duck,sync:sync,playing:playing,available:available,
  _bpm:BPM,_bars:16,_len:BAR*16};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=MUSIC;
