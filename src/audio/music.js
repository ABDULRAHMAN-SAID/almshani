/**
 * موسيقى «تحدّي» — لحن أصليّ مركّب داخل اللعبة بلا ملفّ صوت واحد.
 *
 *   MUSIC.init({enabled:()=>bool})   من يقرّر التشغيل؟ إعدادات اللاعب
 *   MUSIC.start()  عند أول لمسة (المتصفّح لا يفتح الصوت قبلها)
 *   MUSIC.stop()   ·  MUSIC.duck(on)  يخفض الصوت أثناء اللعب لا يقطعه
 *   MUSIC.scene('menu'|'mafia'|'night'|'barra')   يبدّل اللحن بتلاشٍ متقاطع
 *   MUSIC.playing() · MUSIC.now()
 *
 * ثلاثة ألحان أصليّة، كلّها من تأليف اللعبة — لا عيّنات ولا اقتباس من لعبة أخرى:
 *   menu  رِي الصغرى · ٦٤ نبضة · ١٦ مازورة — وتريّات وقيثارة ونفخ نبيل هادئ
 *   mafia لا الصغرى بثانية منخفضة (فريجيّ) · ٥٢ نبضة · ٨ مازورات — طنين منخفض،
 *         نبض قلب، تشيلّو مكتوم، وجرس بعيد. و«night» أشدّ خفوتًا: بلا لحن.
 *   barra حجاز على رِي · ٧٢ نبضة · ٨ مازورات — عود ينقر، ناي يتموّج، ودفّ خفيف
 * كلّها موجات مركّبة تمرّ بمرشّح ثم بصدى مولَّد من ضجيج متلاشٍ.
 * لا DOM هنا إلا window. لا يرمي أبدًا.
 */
var MUSIC=(function(){
 'use strict';
 var W=(typeof window!=='undefined')?window:null;
 var ctx=null,master=null,verb=null,on=false,timer=null,ducked=false;
 var enabled=function(){return true};
 var barAt=0,bar=0;                     // متى تبدأ المازورة التالية، وأيّ مازورة هي
 var BPM=64, BEAT=60/BPM, BAR=BEAT*4;   // إيقاع القائمة — ولكل مشهد إيقاعه في SCENES
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

 /** طنين منخفض متّصل: أساس المافيا — لا لحن، حضور فقط */
 function drone(f,t,d,g){
  var out=bus(0.5),v=ctx.createGain(),lp=ctx.createBiquadFilter();
  lp.type='lowpass';lp.frequency.value=340;lp.Q.value=0.6;
  v.gain.setValueAtTime(0.0001,t);
  v.gain.linearRampToValueAtTime(g,t+d*0.3);
  v.gain.setValueAtTime(g,t+d*0.75);
  v.gain.linearRampToValueAtTime(0.0001,t+d);
  [[0,'sawtooth'],[-11,'sawtooth'],[7,'triangle']].forEach(function(a){
   var o=ctx.createOscillator();o.type=a[1];o.frequency.value=f;o.detune.value=a[0];
   o.connect(v);o.start(t);o.stop(t+d+0.1);
  });
  v.connect(lp);lp.connect(out);
 }
 /** نبض قلب: ضربتان متتاليتان تحت السمع — توتّر المافيا بلا ضجيج */
 function heart(t,g){
  [0,0.26].forEach(function(dt,i){
   var out=bus(0.22),o=ctx.createOscillator(),v=ctx.createGain();
   o.type='sine';
   o.frequency.setValueAtTime(74,t+dt);
   o.frequency.exponentialRampToValueAtTime(38,t+dt+0.2);
   var gg=g*(i?0.62:1);
   v.gain.setValueAtTime(0.0001,t+dt);
   v.gain.exponentialRampToValueAtTime(gg,t+dt+0.012);
   v.gain.exponentialRampToValueAtTime(0.0001,t+dt+0.26);
   o.connect(v);v.connect(out);o.start(t+dt);o.stop(t+dt+0.32);
  });
 }
 /** تشيلّو مكتوم: منشار خلف مرشّح واطئ — جملة المافيا القصيرة */
 function cello(f,t,d,g){
  var out=bus(0.65),o=ctx.createOscillator(),o2=ctx.createOscillator(),v=ctx.createGain(),lp=ctx.createBiquadFilter();
  o.type='sawtooth';o.frequency.value=f;
  o2.type='sawtooth';o2.frequency.value=f;o2.detune.value=-9;
  lp.type='lowpass';lp.Q.value=2.2;
  lp.frequency.setValueAtTime(240,t);
  lp.frequency.linearRampToValueAtTime(880,t+d*0.45);
  lp.frequency.linearRampToValueAtTime(300,t+d);
  v.gain.setValueAtTime(0.0001,t);
  v.gain.linearRampToValueAtTime(g,t+0.22);        // قوس بطيء لا نقرة
  v.gain.setValueAtTime(g,t+d*0.66);
  v.gain.linearRampToValueAtTime(0.0001,t+d);
  o.connect(v);o2.connect(v);v.connect(lp);lp.connect(out);
  o.start(t);o.stop(t+d+0.1);o2.start(t);o2.stop(t+d+0.1);
 }
 /** جرس بعيد: جيبان بنسبة غير صحيحة يخبوان طويلًا — الساعة في ليل المدينة */
 function bell(f,t,g){
  var out=bus(0.9),v=ctx.createGain();
  v.gain.setValueAtTime(0.0001,t);
  v.gain.exponentialRampToValueAtTime(g,t+0.01);
  v.gain.exponentialRampToValueAtTime(0.0001,t+2.4);
  [[1,1],[2.76,0.4],[5.4,0.16]].forEach(function(a){
   var o=ctx.createOscillator(),vv=ctx.createGain();
   o.type='sine';o.frequency.value=f*a[0];vv.gain.value=a[1];
   o.connect(vv);vv.connect(v);o.start(t);o.stop(t+2.5);
  });
  v.connect(out);
 }
 /** عود: نقرة بمثلّث ومنشار خفيف مع انزلاق بسيط في أوّلها — نبرة الوتر المشدود */
 function oud(f,t,d,g){
  var out=bus(0.42),o=ctx.createOscillator(),o2=ctx.createOscillator(),v=ctx.createGain(),lp=ctx.createBiquadFilter();
  o.type='triangle';
  o.frequency.setValueAtTime(f*0.985,t);
  o.frequency.linearRampToValueAtTime(f,t+0.035);   // شدّ الوتر عند النقر
  o2.type='sawtooth';o2.frequency.value=f*2.005;
  lp.type='lowpass';lp.frequency.setValueAtTime(3000,t);
  lp.frequency.exponentialRampToValueAtTime(620,t+d);
  v.gain.setValueAtTime(0.0001,t);
  v.gain.exponentialRampToValueAtTime(g,t+0.008);
  v.gain.exponentialRampToValueAtTime(0.0001,t+d);
  var v2=ctx.createGain();v2.gain.value=0.16;o2.connect(v2);v2.connect(v);
  o.connect(v);v.connect(lp);lp.connect(out);
  o.start(t);o.stop(t+d+0.05);o2.start(t);o2.stop(t+d+0.05);
 }
 /** ناي: جيب يتموّج مع نَفَس خفيف — لحن المجلس */
 function ney(f,t,d,g){
  var out=bus(0.7),o=ctx.createOscillator(),v=ctx.createGain(),lfo=ctx.createOscillator(),lg=ctx.createGain();
  o.type='sine';o.frequency.value=f;
  lfo.type='sine';lfo.frequency.value=5.1;lg.gain.value=f*0.007;   // تموّج خفيف كنَفَس العازف
  lfo.connect(lg);lg.connect(o.frequency);
  v.gain.setValueAtTime(0.0001,t);
  v.gain.linearRampToValueAtTime(g,t+0.16);
  v.gain.setValueAtTime(g,t+d*0.72);
  v.gain.linearRampToValueAtTime(0.0001,t+d);
  var br=ctx.createBufferSource(),bg=ctx.createGain(),bp=ctx.createBiquadFilter();
  if(!nz){nz=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate);var dd=nz.getChannelData(0);
   for(var i=0;i<dd.length;i++)dd[i]=Math.random()*2-1}
  br.buffer=nz;br.loop=true;bp.type='bandpass';bp.frequency.value=f*2.2;bp.Q.value=3;
  bg.gain.value=g*0.10;
  br.connect(bp);bp.connect(bg);bg.connect(v);
  o.connect(v);v.connect(out);
  o.start(t);o.stop(t+d+0.08);br.start(t);br.stop(t+d+0.08);
  lfo.start(t);lfo.stop(t+d+0.08);
 }
 var nz=null;
 /** دفّ: ضربة جلد خفيفة — «دم» عميقة أو «تك» قصيرة */
 function frame(t,g,hi){
  var out=bus(0.3),v=ctx.createGain(),f=ctx.createBiquadFilter();
  if(!nz){nz=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate);var dd=nz.getChannelData(0);
   for(var i=0;i<dd.length;i++)dd[i]=Math.random()*2-1}
  var sN=ctx.createBufferSource();sN.buffer=nz;
  f.type=hi?'highpass':'lowpass';f.frequency.value=hi?2600:520;f.Q.value=hi?0.7:1.4;
  v.gain.setValueAtTime(0.0001,t);
  v.gain.exponentialRampToValueAtTime(g,t+0.006);
  v.gain.exponentialRampToValueAtTime(0.0001,t+(hi?0.07:0.19));
  sN.connect(f);f.connect(v);v.connect(out);
  sN.start(t);sN.stop(t+0.3);
  if(!hi){var o=ctx.createOscillator(),vv=ctx.createGain();
   o.type='sine';o.frequency.setValueAtTime(112,t);o.frequency.exponentialRampToValueAtTime(62,t+0.16);
   vv.gain.setValueAtTime(0.0001,t);vv.gain.exponentialRampToValueAtTime(g*1.1,t+0.008);
   vv.gain.exponentialRampToValueAtTime(0.0001,t+0.2);
   o.connect(vv);vv.connect(out);o.start(t);o.stop(t+0.24)}
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

 /** مازورة القائمة — تُستدعى قبل موعدها بثانيتين */
 function barMenu(i,t,B,BT){
  var half=i%8, second=i>=8;
  var c=CH[half], mel=MEL[half];
  var gp=second?0.052:0.044;                    /* الدورة الثانية أعلى قليلًا */
  c[0].forEach(function(n){pad(hz(n),t,B*0.99,gp)});
  bass(hz(c[1]),t,B*0.9,0.15);
  if(half===0||half===4)drum(t,0.10);
  if(second&&(half===2||half===6))drum(t+BT*2,0.055);
  /* القيثارة: ستّ نقرات في المازورة — الدورة الأولى أخفّ */
  c[2].forEach(function(n,k){
   pluck(hz(n),t+k*(B/6),0.85,second?0.075:0.055);
  });
  /* اللحن يدخل في الدورة الثانية وحدها — البداية هادئة تمامًا */
  if(second)mel.forEach(function(m){
   horn(hz(m[0]),t+m[1]*BT,m[2]*BT,0.062);
  });
 }

 /* ═══ لحن المافيا ═══
    لا الصغرى بثانية منخفضة (Bb): مقام فريجيّ — أشدّ ظلمةً من الصغرى العادية.
    ٥٢ نبضة في الدقيقة، ثمان مازورات (نحو ٣٧ ثانية). لا لحن يُغنّى: طنين يقبض،
    نبض قلب بطيء، وتشيلّو يقول جملتين قصيرتين، وجرس بعيد يدقّ مرّتين في الدورة.
    و«الليل» هو المشهد نفسه بلا تشيلّو وبنصف الشدّة — الصمت جزء من الخوف. */
 var MF_DRONE=['A1','A1','Bb1','Bb1','A1','A1','F1','E1'];
 var MF_CELLO=[               /* [نغمة, بداية بالنبضات, طول] لكل مازورة */
  [],
  [['A3',1,2.4]],
  [['Bb3',0,1.6],['A3',2,1.8]],
  [],
  [['C4',1,2.2]],
  [['Bb3',0,2.6]],
  [['F3',0,3.2]],
  [['E3',0,3.4]]
 ];
 function barMafia(i,t,B,BT,night){
  var k=i%8, g=night?0.55:1;
  drone(hz(MF_DRONE[k]),t,B*1.02,0.075*g);
  drone(hz(MF_DRONE[k].replace(/\d$/,function(d){return +d+1})),t,B*1.02,0.030*g);
  heart(t,0.115*g);                                 /* ضربة القلب أوّل كل مازورة */
  if(!night&&(k===3||k===7))heart(t+BT*2,0.070);
  if(!night)MF_CELLO[k].forEach(function(m){cello(hz(m[0]),t+m[1]*BT,m[2]*BT,0.055)});
  if(k===0)bell(hz('A4'),t+BT*0.5,night?0.020:0.032);
  if(k===4)bell(hz('E4'),t+BT*0.5,night?0.015:0.024);
 }

 /* ═══ لحن برا السالفة ═══
    حجاز على رِي (D Eb F# G A Bb C): المقام الذي يُعرف من نغمتين — مجلس ومساء
    وفضول. ٧٢ نبضة، ثمان مازورات (نحو ٢٧ ثانية). عود ينقر بالدور، ناي يجيبه،
    ودفّ خفيف: «دم» على الواحد و«تك» على الثالث. */
 var BR_BASS=['D2','D2','G2','G2','Bb1','A1','D2','A1'];
 var BR_OUD=[                 /* ستّ نقرات في المازورة */
  ['D4','Eb4','F#4','G4','F#4','Eb4'],
  ['D4','A4','G4','F#4','Eb4','D4'],
  ['G4','Bb4','A4','G4','F#4','G4'],
  ['G4','A4','Bb4','A4','G4','F#4'],
  ['Bb4','A4','G4','F#4','Eb4','D4'],
  ['A4','G4','F#4','Eb4','D4','Eb4'],
  ['D4','F#4','A4','D5','A4','F#4'],
  ['A4','G4','F#4','Eb4','D4','D4']
 ];
 var BR_NEY=[
  [], [['A4',2,1.8]], [], [['Bb4',1,2.4]],
  [['A4',0,2.2]], [['F#4',2,1.6]], [], [['D4',0,3.2]]
 ];
 function barBarra(i,t,B,BT){
  var k=i%8;
  bass(hz(BR_BASS[k]),t,B*0.92,0.11);
  pad(hz(BR_BASS[k].replace(/\d$/,function(d){return +d+2})),t,B*0.98,0.026);
  frame(t,0.085,false);                    /* دم */
  frame(t+BT*2,0.055,true);                /* تك */
  if(k%2===1)frame(t+BT*3.5,0.035,true);
  BR_OUD[k].forEach(function(n,j){oud(hz(n),t+j*(B/6),0.62,0.044)});
  BR_NEY[k].forEach(function(m){ney(hz(m[0]),t+m[1]*BT,m[2]*BT,0.044)});
 }

 /* ═══ المشاهد: لكل واحد إيقاعه وعدد مازوراته وراسمه ═══ */
 var SCENES={
  menu: {bpm:64,bars:16,draw:barMenu},
  mafia:{bpm:52,bars:8, draw:function(i,t,B,BT){barMafia(i,t,B,BT,false)}},
  night:{bpm:52,bars:8, draw:function(i,t,B,BT){barMafia(i,t,B,BT,true)}},
  barra:{bpm:72,bars:8, draw:barBarra}
 };
 var cur='menu';
 function schedule(i,t){
  var sc=SCENES[cur]||SCENES.menu;
  var b=60/sc.bpm*4;
  sc.draw(i%sc.bars,t,b,b/4);
 }

 /** الحارس: يجدول ما يقترب موعده ثم ينام — لا حساب في كل إطار */
 function tick(){
  if(!on||!ctx)return;
  var now=ctx.currentTime,sc=SCENES[cur]||SCENES.menu,b=60/sc.bpm*4;
  while(barAt<now+2.2){
   try{schedule(bar%sc.bars,barAt)}catch(e){}
   barAt+=b;bar++;
  }
 }
 /** تبديل اللحن بتلاشٍ متقاطع: القديم يخبو بينما الجديد يدخل — لا قطع */
 function scene(name){
  if(!SCENES[name]||name===cur)return cur;
  cur=name;bar=0;
  if(!on||!ctx)return cur;
  try{
   var t=ctx.currentTime;
   master.gain.cancelScheduledValues(t);
   master.gain.setValueAtTime(master.gain.value,t);
   master.gain.linearRampToValueAtTime(0.0001,t+0.75);
   master.gain.linearRampToValueAtTime(level(),t+2.6);
   barAt=t+0.85;
   tick();
  }catch(e){}
  return cur;
 }
 function now(){return cur}
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

 return {init:init,start:start,stop:stop,duck:duck,sync:sync,scene:scene,now:now,
  playing:playing,available:available,
  _scenes:Object.keys(SCENES),
  _len:function(k){var sc=SCENES[k||cur]||SCENES.menu;return 60/sc.bpm*4*sc.bars}};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=MUSIC;
