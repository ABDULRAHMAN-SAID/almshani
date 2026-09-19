/**
 * رسوم تحدّي المُجسَّمة — لوحات بعمق حقيقيّ لا أشكال مسطّحة:
 * تدرّج متعدّد المحطّات للجسم، وجه مُضاء ووجه مُظلم، لمعة زجاجيّة ضبابيّة،
 * حافّة مُضاءة رفيعة، ظلّ مُلقى تحت الجسم، ووهج لونيّ خلفه.
 * المرشّحات والتدرّجات مشتركة ببادئة ha- وتتكرّر في كل لوحة بلا ضرر (أوّل تعريف يسود).
 *   HOME_ART.get(name) → وسم svg كامل
 *   HOME_ART.names     → كل الأسماء
 */
var HOME_ART=(function(){
 'use strict';
 var A={};

 /* ── لبنات ── */
 function lg(id,stops,x2,y2){
  return '<linearGradient id="'+id+'" x1="0" y1="0" x2="'+(x2==null?.4:x2)+'" y2="'+(y2==null?1:y2)+'">'+
   stops.map(function(s){return '<stop offset="'+s[0]+'" stop-color="'+s[1]+'"/>'}).join('')+'</linearGradient>';
 }
 function rg(id,stops,cx,cy,r){
  return '<radialGradient id="'+id+'" cx="'+(cx||.34)+'" cy="'+(cy||.28)+'" r="'+(r||.85)+'">'+
   stops.map(function(s){return '<stop offset="'+s[0]+'" stop-color="'+s[1]+'"/>'}).join('')+'</radialGradient>';
 }
 /* لمعة ضبابيّة بيضاء — روح الشكل المُجسَّم */
 function spec(x,y,rx,ry,rot,o,bl){
  return '<ellipse cx="'+x+'" cy="'+y+'" rx="'+rx+'" ry="'+ry+'" fill="#fff" opacity="'+(o==null?.5:o)+
   '" filter="url(#ha-b'+(bl||3)+')" transform="rotate('+(rot||0)+' '+x+' '+y+')"/>';
 }
 /* ظلّ مُلقى تحت الجسم */
 function cast(x,y,rx,ry,o){
  return '<ellipse cx="'+x+'" cy="'+y+'" rx="'+rx+'" ry="'+ry+'" fill="#05070E" opacity="'+(o==null?.55:o)+'" filter="url(#ha-b6)"/>';
 }
 /* وهج لونيّ خلف الجسم */
 function glow(x,y,r,c,o){
  return '<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="'+c+'" opacity="'+(o==null?.3:o)+'" filter="url(#ha-b10)"/>';
 }
 /* حافّة مُضاءة: نسخة من المسار بخطّ فاتح شفّاف */
 function rim(d,c,w,o){
  return '<path d="'+d+'" fill="none" stroke="'+(c||'#fff')+'" stroke-width="'+(w||1.4)+'" opacity="'+(o==null?.45:o)+'" stroke-linejoin="round"/>';
 }
 function P(d,f,x){return '<path d="'+d+'" fill="'+f+'"'+(x||'')+'/>'}
 function R(x,y,w,h,r,f,x2){return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="'+r+'" fill="'+f+'"'+(x2||'')+'/>'}
 function C(x,y,r,f,x2){return '<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="'+f+'"'+(x2||'')+'/>'}
 function PG(p,f,x){return '<polygon points="'+p+'" fill="'+f+'"'+(x||'')+'/>'}
 function S(d,c,w,x){return '<path d="'+d+'" fill="none" stroke="'+c+'" stroke-width="'+w+'" stroke-linecap="round" stroke-linejoin="round"'+(x||'')+'/>'}
 function star(cx,cy,R0,r0,n,rot){n=n||5;var p=[],i,a,q;for(i=0;i<n*2;i++){a=-Math.PI/2+(rot||0)+i*Math.PI/n;q=i%2?r0:R0;
  p.push((cx+Math.cos(a)*q).toFixed(2)+','+(cy+Math.sin(a)*q).toFixed(2))}return p.join(' ')}
 /* بريق رباعيّ ناعم */
 function spk(x,y,s,c,o){
  return '<path d="M'+x+' '+(y-s)+' Q'+(x+s*.2)+' '+(y-s*.2)+' '+(x+s)+' '+y+
   ' Q'+(x+s*.2)+' '+(y+s*.2)+' '+x+' '+(y+s)+' Q'+(x-s*.2)+' '+(y+s*.2)+' '+(x-s)+' '+y+
   ' Q'+(x-s*.2)+' '+(y-s*.2)+' '+x+' '+(y-s)+' Z" fill="'+(c||'#FFF3C8')+'" opacity="'+(o==null?.95:o)+'"/>';
 }
 /* هالة ذهبيّة ناعمة خلف جسم لامع — طبقتان بلا أشعّة حادّة */
 function halo(x,y,r,c){
  return '<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="'+(c||'#FFC94A')+'" opacity=".2" filter="url(#ha-b10)"/>'+
   '<circle cx="'+x+'" cy="'+y+'" r="'+(r*.62)+'" fill="'+(c||'#FFE9A8')+'" opacity=".22" filter="url(#ha-b10)"/>';
 }

 var GOLD=[[0,'#FFF8DC'],[.22,'#FFE08A'],[.5,'#EFB43C'],[.76,'#BE8214'],[1,'#8A5A0C']];
 var DEFS='<defs>'+
  '<filter id="ha-b3" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="3"/></filter>'+
  '<filter id="ha-b6" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="6"/></filter>'+
  '<filter id="ha-b10" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="10"/></filter>'+
  '<filter id="ha-dp" x="-40%" y="-40%" width="190%" height="190%"><feDropShadow dx="0" dy="5" stdDeviation="4.5" flood-color="#04060C" flood-opacity=".6"/></filter>'+
  lg('ha-au',GOLD)+
  lg('ha-au2',[[0,'#FFEFC0'],[.4,'#E8B23A'],[1,'#7E5008']],.9,.6)+
  lg('ha-rd',[[0,'#FFC2B6'],[.24,'#F4796C'],[.58,'#D9453C'],[1,'#7E1C18']])+
  lg('ha-pu',[[0,'#EAD6FF'],[.24,'#B98BFF'],[.58,'#8B4FE8'],[1,'#41197F']])+
  lg('ha-bl',[[0,'#D6ECFF'],[.24,'#8CC2FF'],[.56,'#3F86E0'],[1,'#12386E']])+
  lg('ha-gr',[[0,'#CFFBE2'],[.24,'#73E4AC'],[.56,'#2BB273'],[1,'#0A5236']])+
  lg('ha-wd',[[0,'#F3D9B4'],[.26,'#D2A167'],[.6,'#9C6733'],[1,'#4E2E12']])+
  lg('ha-st',[[0,'#FFFFFF'],[.26,'#DCE4F0'],[.6,'#96A3B8'],[1,'#3F4A5C']])+
  rg('ha-iv',[[0,'#FFFFFF'],[.55,'#F1F4FA'],[1,'#B9C3D4']])+
  rg('ha-gl',[[0,'#FFFBE4'],[.42,'#FFDE85'],[1,'#D9901A']],.36,.3,.95)+
  '</defs>';

 function wrap(vb,body){
  return '<svg class="hart" viewBox="'+vb+'" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" aria-hidden="true">'+DEFS+body+'</svg>';
 }

 /* ═══ تاج ذهبيّ مُجسَّم يوضع فوق جسم ═══ */
 function crown(x,y,w){
  var s=w/40,d='M-20 13 L-17.5 -11 L-8.5 -1 L0 -17 L8.5 -1 L17.5 -11 L20 13 Z';
  return '<g transform="translate('+x+' '+y+') scale('+s+')" filter="url(#ha-dp)">'+
   P(d,'url(#ha-au)')+
   P('M0 -17 L8.5 -1 L17.5 -11 L20 13 H0 Z','#A06F0E',' opacity=".42"')+
   rim('M-20 13 L-17.5 -11 L-8.5 -1 L0 -17','#FFF8DC',1.6,.75)+
   R(-21,12,42,8.5,3,'url(#ha-au2)')+
   R(-20,12.6,40,2.4,1.2,'#FFF6D2',' opacity=".72"')+
   C(-17.5,-12,3.6,'url(#ha-gl)')+C(0,-18,4,'url(#ha-gl)')+C(17.5,-12,3.6,'url(#ha-gl)')+
   C(-11,16.5,2.2,'#E2584F')+C(0,16.5,2.4,'#35C47A')+C(11,16.5,2.2,'#4A93E8')+
   spec(-9,2,6.5,3.4,-24,.34)+'</g>';
 }

 /* ═══ النرد المتوَّج ═══ */
 function pip(x,y,r){
  return C(x,y,r,'#0E1422')+C(x-r*.25,y-r*.28,r*.5,'#2C3550',' opacity=".55"');
 }
 A.dice=wrap('0 0 200 180',
  glow(104,96,62,'#FFD976',.2)+halo(104,96,74)+
  cast(106,156,56,10,.5)+
  '<g transform="rotate(-18 44 80)">'+R(18,44,54,74,10,'url(#ha-bl)')+R(24,50,42,62,7,'#fff',' opacity=".16"')+
   P('M45 68 c-6.5-8 -18-3.4 -18 6.4 c0 8.6 18 22 18 22 s18-13.4 18-22 c0-9.8 -11.5-14.4 -18-6.4 Z','#fff',' opacity=".62"')+
   spec(30,56,13,7,-30,.4)+'</g>'+
  '<g transform="rotate(15 164 78)">'+R(138,44,54,74,10,'url(#ha-gr)')+R(144,50,42,62,7,'#fff',' opacity=".16"')+
   P('M165 68 c-6.5-8 -18-3.4 -18 6.4 c0 8.6 18 22 18 22 s18-13.4 18-22 c0-9.8 -11.5-14.4 -18-6.4 Z','#fff',' opacity=".62"')+
   spec(150,56,13,7,-30,.4)+'</g>'+
  '<g transform="rotate(30 178 100)">'+R(152,64,52,72,10,'url(#ha-pu)')+R(158,70,40,60,7,'#fff',' opacity=".14"')+
   spec(164,76,12,6,-30,.35)+'</g>'+
  '<g filter="url(#ha-dp)">'+
   R(56,58,94,94,24,'url(#ha-iv)')+
   P('M103 58 h23 a24 24 0 0 1 24 24 v46 a24 24 0 0 1 -24 24 h-23 Z','#96A3B8',' opacity=".3"')+
   P('M56 82 a24 24 0 0 1 24 -24 h46 a24 24 0 0 1 24 24 z','#fff',' opacity=".5"')+
   pip(79,81,8.4)+pip(127,81,8.4)+pip(103,105,8.4)+pip(79,129,8.4)+pip(127,129,8.4)+
   spec(80,76,22,11,-24,.62)+
   rim('M56 82 a24 24 0 0 1 24 -24 h23','#fff',2.6,.9)+
  '</g>'+
  crown(112,42,70)+
  spk(34,30,12)+spk(180,36,9)+spk(24,118,8,'#FFF3C8',.8)+spk(190,134,7,'#FFF3C8',.7));

 /* ═══ الكأس ═══ */
 A.trophy=wrap('0 0 200 180',
  glow(100,84,58,'#FFC94A',.24)+halo(100,84,70)+
  cast(100,160,50,9,.5)+
  '<g filter="url(#ha-dp)">'+
   S('M64 46 H38 a7 7 0 0 0 -7 7 v9 c0 21 14 33 33 36','url(#ha-st)',12)+
   S('M136 46 H162 a7 7 0 0 1 7 7 v9 c0 21 -14 33 -33 36','#9A6B0E',12)+
   P('M62 30 H138 V80 C138 104 121 121 100 121 C79 121 62 104 62 80 Z','url(#ha-au)')+
   P('M100 30 H138 V80 C138 104 121 121 100 121 Z','#96670C',' opacity=".38"')+
   rim('M62 30 H138','#FFF8DC',2.4,.85)+
   rim('M62 30 V80 C62 100 74 114 88 118','#FFF0B8',2,.5)+
   PG(star(100,74,25,11),'#FFF9E2',' opacity=".95"')+
   PG(star(100,74,25,11),'none',' stroke="#C08A16" stroke-width="1.4" opacity=".5"')+
   R(88,119,24,19,2,'url(#ha-au2)')+
   P('M64 138 H136 L145 157 H55 Z','url(#ha-au)')+
   P('M100 138 H136 L145 157 H100 Z','#96670C',' opacity=".34"')+
   R(53,154,94,8,4,'url(#ha-au2)')+
   spec(78,50,13,26,-12,.42)+
  '</g>'+
  spk(34,42,11)+spk(168,54,9)+spk(44,120,7,'#FFF3C8',.75)+spk(158,124,6,'#FFF3C8',.7));

 /* ═══ ضيوف ليلة العائلة ═══ */
 function guest(x,y,hr,bw,bh,g,dk){
  return '<g filter="url(#ha-dp)">'+
   R(x-bw,y,2*bw,bh,bw*.92,g)+
   P('M'+x+' '+y+' h'+bw+' a'+(bw*.92)+' '+(bw*.92)+' 0 0 1 0 '+bh+' h-'+bw+' Z',dk,' opacity=".3"')+
   C(x,y-hr*.76,hr,g)+
   P('M'+x+' '+(y-hr*.76-hr)+' a'+hr+' '+hr+' 0 0 1 0 '+(2*hr)+' Z',dk,' opacity=".3"')+
   spec(x-hr*.36,y-hr*1.18,hr*.44,hr*.26,-26,.5)+
   rim('M'+(x-hr*.92)+' '+(y-hr*1.16)+' a'+hr+' '+hr+' 0 0 1 '+(hr*.82)+' -'+(hr*.5),'#fff',1.8,.5)+
  '</g>';
 }
 A.party=wrap('0 0 200 180',
  glow(100,92,64,'#9B6CF0',.26)+
  cast(100,158,60,10,.48)+
  guest(48,100,20,25,56,'url(#ha-gr)','#0A5236')+
  guest(152,100,20,25,56,'url(#ha-bl)','#12386E')+
  guest(100,86,28,36,70,'url(#ha-pu)','#41197F')+
  crown(100,30,60)+
  spk(26,52,10)+spk(178,46,9)+spk(20,126,7,'#FFF3C8',.7)+spk(186,130,7,'#FFF3C8',.7));

 /* ═══ مصباح المعلومات ═══ */
 A.bulb=wrap('0 0 128 128',
  glow(64,52,40,'#FFD05A',.4)+
  '<g stroke="url(#ha-au)" stroke-width="6" stroke-linecap="round" opacity=".9">'+
   '<path d="M64 6 V19"/><path d="M20 22 L30 32"/><path d="M108 22 L98 32"/>'+
   '<path d="M8 64 H22"/><path d="M120 64 H106"/></g>'+
  cast(64,118,24,5,.45)+
  '<g filter="url(#ha-dp)">'+
   P('M64 21 C43 21 28 36 28 55 C28 70 38 77 43 90 H85 C90 77 100 70 100 55 C100 36 85 21 64 21 Z','url(#ha-gl)')+
   P('M64 21 C85 21 100 36 100 55 C100 70 90 77 85 90 H64 Z','#C4820E',' opacity=".26"')+
   rim('M64 21 C43 21 28 36 28 55 C28 66 33 73 38 82','#FFFBE4',2.4,.7)+
   S('M50 90 L54 60 M78 90 L74 60 M54 60 q10 -9 20 0','#B8760A',4.4,' opacity=".6"')+
   R(43,90,42,13,4,'url(#ha-st)')+
   R(43,90,42,4,2,'#fff',' opacity=".6"')+
   R(47,105,34,12,5,'#7D8899')+
   R(47,105,34,4,2,'#C6CEDB',' opacity=".7"')+
   spec(46,42,11,19,-22,.55)+
  '</g>');

 /* ═══ قناعا التمثيل ═══ */
 function mask(x,y,s,fill,dark,happy){
  return '<g transform="translate('+x+' '+y+') scale('+s+')" filter="url(#ha-dp)">'+
   P('M-27 -31 C-11 -38 11 -38 27 -31 C27 6 17 35 0 35 C-17 35 -27 6 -27 -31 Z',fill)+
   P('M0 -35 C11 -35 19 -33 27 -31 C27 6 17 35 0 35 Z',dark,' opacity=".3"')+
   rim('M-27 -31 C-11 -38 11 -38 27 -31','#fff',2,.55)+
   (happy
    ? S('M-18 -10 q6.5 -9 13 0','#8A5C08',4.4)+S('M5 -10 q6.5 -9 13 0','#8A5C08',4.4)+
      P('M-14 7 q14 16 28 0 q-14 8 -28 0 Z','#6A4406')+S('M-14 7 q14 16 28 0','#6A4406',4.6)
    : S('M-18 -6 q6.5 9 13 0','#3A1A6E',4.4)+S('M5 -6 q6.5 9 13 0','#3A1A6E',4.4)+
      S('M-13 17 q13 -14 26 0','#3A1A6E',4.6)+
      S('M-11 2 q1 9 -3 13','#9FD8FF',3.2))+
   spec(-14,-21,9,5.5,-24,.42)+'</g>';
 }
 A.masks=wrap('0 0 128 128',
  glow(64,60,42,'#C79A3A',.26)+
  cast(64,114,40,6,.42)+
  mask(84,66,1.06,'url(#ha-pu)','#41197F',0)+
  mask(46,60,1.18,'url(#ha-au)','#8A5A0C',1)+
  spk(16,26,9)+spk(112,30,8,'#FFF3C8',.85));

 /* ═══ منبّه تحدّي الوقت ═══ */
 A.clock=wrap('0 0 128 128',
  glow(64,64,42,'#E2584F',.24)+
  cast(64,116,34,6,.45)+
  '<g filter="url(#ha-dp)">'+
   C(31,26,14,'url(#ha-rd)')+C(97,26,14,'#A6302B')+
   spec(27,21,6,3.4,-28,.5)+
   S('M46 100 L35 117','#7E1C18',10)+S('M82 100 L93 117','#7E1C18',10)+
   R(57,6,14,13,5,'#B7352F')+
   C(64,66,44,'url(#ha-rd)')+
   P('M64 22 a44 44 0 0 1 0 88 Z','#7E1C18',' opacity=".3"')+
   rim('M64 22 a44 44 0 0 0 -42 31','#FFC2B6',2.6,.6)+
   C(64,66,34,'#FFF6EC')+
   C(64,66,34,'none',' stroke="#D9B7A4" stroke-width="2"')+
   P('M34 58 a34 34 0 0 1 44 -22 a40 40 0 0 0 -44 22 Z','#fff',' opacity=".8"')+
   '<g stroke="#8F2622" stroke-width="3.4" stroke-linecap="round">'+
    '<path d="M64 38 V45"/><path d="M64 87 V94"/><path d="M33 66 H40"/><path d="M88 66 H95"/></g>'+
   S('M64 66 V42','#2A1D1A',5.4)+S('M64 66 L83 77','#2A1D1A',5.4)+
   C(64,66,5,'#E2584F')+C(64,66,2.2,'#7E1C18')+
   spec(42,44,13,8,-30,.5)+
  '</g>'+spk(110,50,8,'#FFF3C8',.8));

 /* ═══ بطاقات أونو ═══ */
 function pcard(x,y,rot,g,dk){
  return '<g transform="rotate('+rot+' '+x+' '+y+')" filter="url(#ha-dp)">'+
   R(x-22,y-31,44,62,8,g)+
   R(x-16,y-25,32,50,5,'#fff',' opacity=".18"')+
   P('M'+x+' '+(y-31)+' h22 v62 h-22 Z',dk,' opacity=".22"')+
   rim('M'+(x-22)+' '+(y-23)+' v-4 a8 8 0 0 1 8 -4 h14','#fff',2,.65)+
   spec(x-11,y-20,10,6,-28,.4)+'</g>';
 }
 A.cards=wrap('0 0 128 128',
  glow(64,62,42,'#FFD976',.22)+halo(64,62,48)+
  cast(64,112,38,6,.45)+
  pcard(36,68,-22,'url(#ha-gr)','#0A5236')+
  pcard(62,60,-4,'url(#ha-bl)','#12386E')+
  pcard(90,68,16,'url(#ha-rd)','#7E1C18')+
  '<g transform="rotate(16 90 64)">'+PG(star(90,64,15,6.6),'url(#ha-au)')+
   PG(star(90,64,15,6.6),'none',' stroke="#B8871E" stroke-width="1.2" opacity=".6"')+'</g>'+
  spk(16,28,9)+spk(112,26,8,'#FFF3C8',.85));

 /* ═══ لوح الكيرم ═══ */
 function disc(x,y,r,top,side,dk){
  return C(x,y+r*.18,r,dk,' opacity=".5"')+C(x,y,r,side)+C(x,y-r*.1,r*.92,top)+
   '<ellipse cx="'+(x-r*.3)+'" cy="'+(y-r*.42)+'" rx="'+(r*.42)+'" ry="'+(r*.24)+'" fill="#fff" opacity=".5" transform="rotate(-26 '+(x-r*.3)+' '+(y-r*.42)+')"/>';
 }
 A.carrom=wrap('0 0 128 128',
  glow(64,64,44,'#D2A167',.2)+
  cast(64,116,42,6,.45)+
  '<g filter="url(#ha-dp)">'+
   R(12,16,104,100,11,'url(#ha-wd)')+
   R(12,16,104,100,11,'none',' stroke="#5E3A1B" stroke-width="2" opacity=".55"')+
   R(20,24,88,84,6,'#F6E6C6')+
   R(20,24,88,84,6,'none',' stroke="#BC9155" stroke-width="2.4"')+
   R(20,24,88,10,6,'#fff',' opacity=".5"')+
   C(64,66,19,'none',' stroke="#CFA463" stroke-width="2.4"')+
   C(64,66,7,'none',' stroke="#CFA463" stroke-width="1.6"')+
   C(29,35,7.4,'#140D05')+C(99,35,7.4,'#140D05')+C(29,97,7.4,'#140D05')+C(99,97,7.4,'#140D05')+
   disc(52,58,8.6,'#FFF7E4','#D9C69E','#6A5334')+
   disc(76,62,8.6,'#3E2E16','#241A0C','#0D0803')+
   disc(64,78,9.2,'#F0776C','#B33127','#5C120E')+
   spec(40,36,16,9,-28,.42)+
  '</g>'+spk(112,22,8,'#FFF3C8',.8));

 /* ═══ لوح المهمّات ═══ */
 A.clip=wrap('0 0 128 128',
  glow(64,64,38,'#4A93E8',.22)+
  cast(64,118,32,5,.42)+
  '<g filter="url(#ha-dp)">'+
   R(20,16,88,100,12,'url(#ha-bl)')+
   P('M64 16 h32 a12 12 0 0 1 12 12 v76 a12 12 0 0 1 -12 12 H64 Z','#12386E',' opacity=".26"')+
   rim('M32 16 h64','#D6ECFF',2.4,.6)+
   R(28,28,72,78,8,'#F7FAFF')+
   R(28,28,72,8,4,'#fff',' opacity=".9"')+
   R(46,7,36,17,6,'url(#ha-st)')+
   R(48,9,32,5,2.5,'#fff',' opacity=".7"')+
   '<g stroke="#C3CEDF" stroke-width="5.4" stroke-linecap="round">'+
    '<path d="M55 48 H88"/><path d="M55 66 H88"/><path d="M55 84 H80"/></g>'+
   C(41,48,7.4,'#2BB273')+S('M37.4 48 l2.8 3 5-5.8','#fff',3)+
   C(41,66,7.4,'#2BB273')+S('M37.4 66 l2.8 3 5-5.8','#fff',3)+
   C(41,84,7.4,'none',' stroke="#C3CEDF" stroke-width="3.2"')+
   spec(36,36,12,7,-28,.4)+
  '</g>');

 /* ═══ هديّة المكافأة ═══ */
 A.gift=wrap('0 0 128 128',
  glow(64,68,40,'#9B6CF0',.26)+
  cast(64,114,34,6,.45)+
  '<g filter="url(#ha-dp)">'+
   R(20,50,88,62,10,'url(#ha-pu)')+
   P('M64 50 h34 a10 10 0 0 1 10 10 v42 a10 10 0 0 1 -10 10 H64 Z','#41197F',' opacity=".28"')+
   R(13,34,102,22,8,'#A87BF5')+
   P('M64 34 h43 a8 8 0 0 1 8 8 v6 a8 8 0 0 1 -8 8 H64 Z','#41197F',' opacity=".24"')+
   R(13,34,102,7,4,'#E5D2FF',' opacity=".6"')+
   R(52,34,24,78,0,'url(#ha-au)')+
   R(54,34,7,78,0,'#FFF6D2',' opacity=".45"')+
   P('M64 34 C48 34 31 27 36 16 C41 7 56 13 64 34 C72 13 87 7 92 16 C97 27 80 34 64 34 Z','url(#ha-au)')+
   C(64,31,6.4,'url(#ha-gl)')+
   spec(34,46,13,6,-16,.36)+
  '</g>'+spk(110,26,9)+spk(16,24,7,'#FFF3C8',.8));

 /* ═══ قفل الغرفة الخاصّة ═══ */
 A.lock=wrap('0 0 128 128',
  glow(64,72,40,'#9B6CF0',.28)+
  cast(64,116,32,6,.45)+
  '<g filter="url(#ha-dp)">'+
   S('M40 58 V42 a24 24 0 0 1 48 0 V58','url(#ha-st)',13)+
   S('M42 56 V42 a22 22 0 0 1 14 -20','#fff',3.4,' opacity=".55"')+
   R(24,56,80,56,15,'url(#ha-pu)')+
   P('M64 56 h25 a15 15 0 0 1 15 15 v26 a15 15 0 0 1 -15 15 H64 Z','#41197F',' opacity=".28"')+
   rim('M24 71 a15 15 0 0 1 15 -15 h50','#EAD6FF',2.6,.65)+
   C(64,80,9,'#2E1259')+C(64,80,6,'#4B1D8C')+
   P('M60.6 84 h6.8 l2 16 h-10.8 Z','#2E1259')+
   spec(40,68,12,7,-26,.44)+
  '</g>'+spk(108,34,8,'#E8D6FF',.75));

 /* ═══ آليّ التدريب ═══ */
 A.robot=wrap('0 0 128 128',
  glow(64,68,40,'#2FC4A8',.28)+
  cast(64,116,32,6,.45)+
  '<g filter="url(#ha-dp)">'+
   S('M64 20 V34','url(#ha-st)',6)+C(64,16,7,'url(#ha-gl)')+
   R(12,58,14,26,7,'url(#ha-st)')+R(102,58,14,26,7,'#6E7A8C')+
   R(22,32,84,74,22,'url(#ha-st)')+
   P('M64 32 h20 a22 22 0 0 1 22 22 v30 a22 22 0 0 1 -22 22 H64 Z','#4A5567',' opacity=".26"')+
   rim('M22 54 a22 22 0 0 1 22 -22 h40','#fff',3,.7)+
   R(32,48,64,34,15,'#101827')+
   R(34,50,60,14,10,'#233049',' opacity=".8"')+
   C(48,65,8,'#2FC4A8')+C(48,65,4.4,'#C9FFF4')+
   C(80,65,8,'#2FC4A8')+C(80,65,4.4,'#C9FFF4')+
   R(52,90,24,7,3.5,'#96A3B8',' opacity=".7"')+
   spec(40,42,14,7,-26,.5)+
  '</g>'+spk(108,32,8,'#C9FFF4',.7));

 return {get:function(n){return A[n]||''},names:Object.keys(A)};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HOME_ART;
