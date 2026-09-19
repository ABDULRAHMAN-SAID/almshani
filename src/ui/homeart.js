/**
 * رسوم الصفحة الرئيسية — لوحات مرسومة بحجم كبير (٤٨–١٤٠ بكسل) لا أيقونات سطريّة.
 * لكلّ لوحة معرّفات تدرّج خاصّة بها (بادئة ha-) فلا تتصادم مع غيرها في الصفحة.
 * الاستعمال: HOME_ART.get('dice') → وسم svg كامل بنسبة عرض ثابتة.
 * هذه رسوم مشهديّة (ظلّ وإضاءة وعمق) — تكمّل أيقونات ICO2 المسطّحة ولا تحلّ محلّها.
 */
var HOME_ART=(function(){
 'use strict';
 var A={};
 /** تدرّج خطّيّ سريع */
 function lg(id,a,b,c,x2,y2){
  return '<linearGradient id="'+id+'" x1="0" y1="0" x2="'+(x2==null?.45:x2)+'" y2="'+(y2==null?1:y2)+'">'+
   '<stop offset="0" stop-color="'+a+'"/><stop offset="'+(c?.5:1)+'" stop-color="'+b+'"/>'+
   (c?'<stop offset="1" stop-color="'+c+'"/>':'')+'</linearGradient>';
 }
 function rg(id,a,b,cx,cy,r){
  return '<radialGradient id="'+id+'" cx="'+(cx||.35)+'" cy="'+(cy||.3)+'" r="'+(r||.9)+'">'+
   '<stop offset="0" stop-color="'+a+'"/><stop offset="1" stop-color="'+b+'"/></radialGradient>';
 }
 /** لمعة زجاجيّة بيضاء */
 function sh(x,y,rx,ry,rot,o){
  return '<ellipse cx="'+x+'" cy="'+y+'" rx="'+rx+'" ry="'+ry+'" fill="#fff" opacity="'+(o==null?.38:o)+
   '" transform="rotate('+(rot||0)+' '+x+' '+y+')"/>';
 }
 /** ظلّ أرضيّ ناعم تحت الجسم */
 function floor(x,y,rx,ry,o){
  return '<ellipse cx="'+x+'" cy="'+y+'" rx="'+rx+'" ry="'+ry+'" fill="#000" opacity="'+(o==null?.28:o)+'"/>';
 }
 /** بريق رباعيّ الأطراف */
 function spark(x,y,s,c,o){
  return '<path d="M'+x+' '+(y-s)+' Q'+(x+s*.22)+' '+(y-s*.22)+' '+(x+s)+' '+y+
   ' Q'+(x+s*.22)+' '+(y+s*.22)+' '+x+' '+(y+s)+' Q'+(x-s*.22)+' '+(y+s*.22)+' '+(x-s)+' '+y+
   ' Q'+(x-s*.22)+' '+(y-s*.22)+' '+x+' '+(y-s)+' Z" fill="'+(c||'#FFE9A8')+'" opacity="'+(o==null?.95:o)+'"/>';
 }
 /** تاج ذهبيّ صغير يوضع فوق جسم */
 function crown(x,y,w){
  var s=w/40;
  return '<g transform="translate('+x+' '+y+') scale('+s+')">'+
   '<path d="M-20 14 L-17 -10 L-8 0 L0 -16 L8 0 L17 -10 L20 14 Z" fill="url(#ha-au)"/>'+
   '<path d="M0 -16 L8 0 L17 -10 L20 14 H0 Z" fill="#B7860F" opacity=".5"/>'+
   '<rect x="-21" y="13" width="42" height="8" rx="3" fill="url(#ha-au)"/>'+
   '<rect x="-21" y="13" width="42" height="3" fill="#FFF3C8" opacity=".6"/>'+
   '<circle cx="-17" cy="-11" r="3.4" fill="#FFF3C8"/><circle cx="0" cy="-17" r="3.8" fill="#FFF3C8"/>'+
   '<circle cx="17" cy="-11" r="3.4" fill="#FFF3C8"/>'+
   '<circle cx="-11" cy="17" r="2.2" fill="#E2584F"/><circle cx="0" cy="17" r="2.4" fill="#35C47A"/>'+
   '<circle cx="11" cy="17" r="2.2" fill="#4A93E8"/>'+
   sh(-9,4,6,3,-24,.3)+'</g>';
 }
 /** التدرّجات المشتركة لكل اللوحات */
 var DEFS='<defs>'+
  lg('ha-au','#FFF0BC','#EFC152','#B7860F')+
  lg('ha-rd','#FF9B8E','#E2584F','#8F2622')+
  lg('ha-pu','#D9BBFF','#9B6CF0','#5A2FAD')+
  lg('ha-bl','#B9DDFF','#4A93E8','#1E579C')+
  lg('ha-gr','#A9F2CB','#35C47A','#12714A')+
  lg('ha-wd','#E8C79B','#AC7742','#5E3A1B')+
  rg('ha-iv','#FFFFFF','#CFD8E6')+
  rg('ha-gl','#FFF6CF','#F2B93A',.36,.3,.95)+
  lg('ha-st','#EAF0FA','#9FADC4','#5B6779')+
  '</defs>';

 function wrap(vb,body,cls){
  return '<svg class="hart'+(cls?' '+cls:'')+'" viewBox="'+vb+'" xmlns="http://www.w3.org/2000/svg" '+
   'preserveAspectRatio="xMidYMid meet" aria-hidden="true">'+DEFS+body+'</svg>';
 }

 /* ── لوحة البطل: نرد متوَّج وبطاقات مروحيّة ── */
 A.dice=wrap('0 0 200 170',
  floor(104,150,58,11,.32)+
  /* بطاقات خلفيّة */
  '<g transform="rotate(-20 44 78)"><rect x="18" y="44" width="52" height="72" rx="9" fill="url(#ha-bl)"/>'+
   '<rect x="24" y="50" width="40" height="60" rx="6" fill="#fff" opacity=".13"/>'+
   '<path d="M44 66 c-6-7 -17-3 -17 6 c0 8 17 21 17 21 s17-13 17-21 c0-9 -11-13 -17-6 Z" fill="#fff" opacity=".55"/></g>'+
  '<g transform="rotate(16 162 76)"><rect x="136" y="42" width="52" height="72" rx="9" fill="url(#ha-gr)"/>'+
   '<rect x="142" y="48" width="40" height="60" rx="6" fill="#fff" opacity=".13"/>'+
   '<path d="M162 64 c-6-7 -17-3 -17 6 c0 8 17 21 17 21 s17-13 17-21 c0-9 -11-13 -17-6 Z" fill="#fff" opacity=".55"/></g>'+
  '<g transform="rotate(28 176 96)"><rect x="150" y="62" width="50" height="70" rx="9" fill="url(#ha-pu)"/>'+
   '<rect x="156" y="68" width="38" height="58" rx="6" fill="#fff" opacity=".13"/></g>'+
  /* النرد */
  '<rect x="58" y="60" width="92" height="92" rx="22" fill="url(#ha-iv)"/>'+
  '<path d="M104 60 h24 a22 22 0 0 1 22 22 v48 a22 22 0 0 1 -22 22 h-24 Z" fill="#AEBACC" opacity=".38"/>'+
  '<circle cx="80" cy="82" r="8" fill="#141B2B"/><circle cx="128" cy="82" r="8" fill="#141B2B"/>'+
  '<circle cx="104" cy="106" r="8" fill="#141B2B"/>'+
  '<circle cx="80" cy="130" r="8" fill="#141B2B"/><circle cx="128" cy="130" r="8" fill="#141B2B"/>'+
  sh(82,76,20,10,-22,.5)+
  crown(113,44,66)+
  spark(38,32,11)+spark(176,34,8)+spark(28,116,7,'#FFF3C8',.8)+spark(186,132,6,'#FFF3C8',.7));

 /* ── لوحة البطل: كأس التصنيف ── */
 A.trophy=wrap('0 0 200 170',
  floor(100,152,52,10,.3)+
  '<path d="M64 34 H136 V82 C136 104 120 120 100 120 C80 120 64 104 64 82 Z" fill="url(#ha-au)"/>'+
  '<path d="M100 34 H136 V82 C136 104 120 120 100 120 Z" fill="#A9760E" opacity=".38"/>'+
  '<path d="M64 44 H40 a6 6 0 0 0 -6 6 v10 c0 20 13 32 30 35" fill="none" stroke="url(#ha-au)" stroke-width="11" stroke-linecap="round"/>'+
  '<path d="M136 44 H160 a6 6 0 0 1 6 6 v10 c0 20 -13 32 -30 35" fill="none" stroke="#B7860F" stroke-width="11" stroke-linecap="round"/>'+
  '<rect x="90" y="118" width="20" height="18" fill="url(#ha-au)"/>'+
  '<path d="M66 136 H134 L142 152 H58 Z" fill="url(#ha-au)"/>'+
  '<rect x="58" y="148" width="84" height="6" rx="3" fill="#8A6212"/>'+
  '<polygon points="100,52 108,72 130,72 112,85 119,106 100,93 81,106 88,85 70,72 92,72" fill="#FFF6CF" opacity=".92"/>'+
  sh(78,52,11,22,-12,.34)+
  spark(38,42,10)+spark(164,54,8)+spark(46,116,6,'#FFF3C8',.75));

 /* ── لوحة البطل: ليلة العائلة ── */
 function guest(x,y,hr,bw,bh,g,dk){
  return '<rect x="'+(x-bw)+'" y="'+y+'" width="'+(2*bw)+'" height="'+bh+'" rx="'+(bw*.92)+'" fill="'+g+'"/>'+
   '<circle cx="'+x+'" cy="'+(y-hr*.72)+'" r="'+hr+'" fill="'+g+'"/>'+
   '<path d="M'+x+' '+(y-hr*1.72)+' a'+hr+' '+hr+' 0 0 1 0 '+(2*hr)+' Z" fill="'+dk+'" opacity=".26"/>'+
   sh(x-hr*.38,y-hr*1.12,hr*.42,hr*.25,-26,.42);
 }
 A.party=wrap('0 0 200 170',
  floor(100,152,62,11,.3)+
  guest(44,96,20,26,56,'url(#ha-gr)','#0E5C3B')+
  guest(156,96,20,26,56,'url(#ha-bl)','#17457C')+
  guest(100,84,27,35,68,'url(#ha-pu)','#4B2596')+
  crown(100,32,58)+
  spark(26,50,10)+spark(176,44,8)+spark(20,122,6,'#FFF3C8',.7)+spark(184,126,6,'#FFF3C8',.7));

 /* ── مصباح المعلومات ── */
 A.bulb=wrap('0 0 120 120',
  '<g stroke="url(#ha-au)" stroke-width="6" stroke-linecap="round" opacity=".85">'+
   '<path d="M60 8 V20"/><path d="M20 24 L29 33"/><path d="M100 24 L91 33"/>'+
   '<path d="M10 62 H23"/><path d="M110 62 H97"/></g>'+
  '<path d="M60 22 C41 22 27 36 27 54 C27 68 36 74 41 86 H79 C84 74 93 68 93 54 C93 36 79 22 60 22 Z" fill="url(#ha-gl)"/>'+
  '<path d="M60 22 C79 22 93 36 93 54 C93 68 84 74 79 86 H60 Z" fill="#D89A18" opacity=".3"/>'+
  '<path d="M48 86 L51 58 M72 86 L69 58 M51 58 H69" fill="none" stroke="#C07F0E" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" opacity=".7"/>'+
  '<rect x="41" y="86" width="38" height="12" rx="4" fill="url(#ha-st)"/>'+
  '<rect x="45" y="100" width="30" height="11" rx="4.5" fill="#7E8AA0"/>'+
  '<rect x="41" y="86" width="38" height="4" rx="2" fill="#fff" opacity=".45"/>'+
  sh(45,40,9,16,-22,.5));

 /* ── قناعا التمثيل ── */
 function mask(x,y,s,fill,dark,happy){
  var g='<g transform="translate('+x+' '+y+') scale('+s+')">'+
   '<path d="M-26 -30 C-10 -36 10 -36 26 -30 C26 6 16 34 0 34 C-16 34 -26 6 -26 -30 Z" fill="'+fill+'"/>'+
   '<path d="M0 -34 C10 -34 18 -32 26 -30 C26 6 16 34 0 34 Z" fill="'+dark+'" opacity=".32"/>';
  g+= happy
   ? '<path d="M-17 -10 q6 -8 12 0" fill="none" stroke="'+dark+'" stroke-width="4" stroke-linecap="round"/>'+
     '<path d="M5 -10 q6 -8 12 0" fill="none" stroke="'+dark+'" stroke-width="4" stroke-linecap="round"/>'+
     '<path d="M-13 8 q13 14 26 0" fill="none" stroke="'+dark+'" stroke-width="4.5" stroke-linecap="round"/>'
   : '<path d="M-17 -6 q6 8 12 0" fill="none" stroke="'+dark+'" stroke-width="4" stroke-linecap="round"/>'+
     '<path d="M5 -6 q6 8 12 0" fill="none" stroke="'+dark+'" stroke-width="4" stroke-linecap="round"/>'+
     '<path d="M-12 16 q12 -13 24 0" fill="none" stroke="'+dark+'" stroke-width="4.5" stroke-linecap="round"/>'+
     '<path d="M-10 2 q0 8 -3 12" fill="none" stroke="#9FD8FF" stroke-width="3" stroke-linecap="round"/>';
  return g+sh(-13,-20,8,5,-24,.34)+'</g>';
 }
 A.masks=wrap('0 0 120 120',
  floor(60,108,40,7,.26)+
  mask(78,62,1.05,'url(#ha-pu)','#4B2596',0)+
  mask(44,58,1.15,'url(#ha-au)','#9A6A0C',1)+
  spark(16,26,8)+spark(106,30,7,'#FFF3C8',.85));

 /* ── منبّه تحدّي الوقت ── */
 A.clock=wrap('0 0 120 120',
  floor(60,110,36,7,.26)+
  '<circle cx="30" cy="26" r="13" fill="url(#ha-rd)"/><circle cx="90" cy="26" r="13" fill="#A6302B"/>'+
  '<path d="M44 96 L34 112" stroke="#8F2622" stroke-width="9" stroke-linecap="round"/>'+
  '<path d="M76 96 L86 112" stroke="#8F2622" stroke-width="9" stroke-linecap="round"/>'+
  '<rect x="54" y="8" width="12" height="12" rx="4" fill="#A6302B"/>'+
  '<circle cx="60" cy="64" r="42" fill="url(#ha-rd)"/>'+
  '<path d="M60 22 a42 42 0 0 1 0 84 Z" fill="#8F2622" opacity=".32"/>'+
  '<circle cx="60" cy="64" r="32" fill="#FFF3E8"/>'+
  '<circle cx="60" cy="64" r="32" fill="none" stroke="#E4C9B8" stroke-width="2"/>'+
  '<g stroke="#8F2622" stroke-width="3" stroke-linecap="round">'+
   '<path d="M60 38 V44"/><path d="M60 84 V90"/><path d="M34 64 H40"/><path d="M80 64 H86"/></g>'+
  '<path d="M60 64 V42" stroke="#33231F" stroke-width="5" stroke-linecap="round"/>'+
  '<path d="M60 64 L78 74" stroke="#33231F" stroke-width="5" stroke-linecap="round"/>'+
  '<circle cx="60" cy="64" r="4.5" fill="#E2584F"/>'+
  sh(40,42,12,7,-30,.5)+spark(104,52,7,'#FFF3C8',.8));

 /* ── بطاقات أونو ── */
 function pcard(x,y,rot,c,dk){
  return '<g transform="rotate('+rot+' '+x+' '+y+')"><rect x="'+(x-21)+'" y="'+(y-30)+'" width="42" height="60" rx="8" fill="'+c+'"/>'+
   '<rect x="'+(x-15)+'" y="'+(y-24)+'" width="30" height="48" rx="5" fill="#fff" opacity=".16"/>'+
   '<path d="M'+x+' '+(y-30)+' h21 v60 h-21 Z" fill="'+dk+'" opacity=".26"/></g>';
 }
 A.cards=wrap('0 0 120 120',
  floor(60,108,38,7,.26)+
  pcard(36,64,-20,'url(#ha-gr)','#12714A')+
  pcard(60,58,-4,'url(#ha-bl)','#1E579C')+
  pcard(84,64,14,'url(#ha-rd)','#8F2622')+
  '<polygon points="84,48 88,58 99,58 90,65 93,76 84,69 75,76 78,65 69,58 80,58" fill="url(#ha-au)" transform="rotate(14 84 62)"/>'+
  spark(18,30,8)+spark(104,28,7,'#FFF3C8',.85));

 /* ── لوح الكيرم ── */
 A.carrom=wrap('0 0 120 120',
  floor(60,108,40,7,.26)+
  '<rect x="14" y="18" width="92" height="92" rx="10" fill="url(#ha-wd)"/>'+
  '<rect x="22" y="26" width="76" height="76" rx="5" fill="#F0DCB4"/>'+
  '<rect x="22" y="26" width="76" height="76" rx="5" fill="none" stroke="#B98C4E" stroke-width="2"/>'+
  '<circle cx="60" cy="64" r="17" fill="none" stroke="#C99A55" stroke-width="2"/>'+
  '<circle cx="30" cy="34" r="6.5" fill="#1A1208"/><circle cx="90" cy="34" r="6.5" fill="#1A1208"/>'+
  '<circle cx="30" cy="94" r="6.5" fill="#1A1208"/><circle cx="90" cy="94" r="6.5" fill="#1A1208"/>'+
  '<circle cx="53" cy="58" r="7.5" fill="#F6ECD6"/><circle cx="53" cy="56.6" r="7.5" fill="#FFFBF0"/>'+
  '<circle cx="68" cy="60" r="7.5" fill="#241A0C"/><circle cx="68" cy="58.6" r="7.5" fill="#3B2C16"/>'+
  '<circle cx="60" cy="72" r="8" fill="#9E2A22"/><circle cx="60" cy="70.6" r="8" fill="#E2584F"/>'+
  sh(60,68,3,1.6,0,.45)+
  sh(38,38,14,8,-28,.3)+spark(106,24,7,'#FFF3C8',.8));

 /* ── لوح المهمّات ── */
 A.clip=wrap('0 0 120 120',
  floor(60,110,34,6,.24)+
  '<rect x="20" y="16" width="80" height="94" rx="11" fill="url(#ha-bl)"/>'+
  '<path d="M60 16 h29 a11 11 0 0 1 11 11 v72 a11 11 0 0 1 -11 11 H60 Z" fill="#17457C" opacity=".3"/>'+
  '<rect x="28" y="28" width="64" height="72" rx="7" fill="#F3F7FE"/>'+
  '<rect x="44" y="8" width="32" height="16" rx="6" fill="#8894AB"/>'+
  '<rect x="44" y="8" width="32" height="6" rx="3" fill="#C4CCDB"/>'+
  '<g stroke="#B6C2D6" stroke-width="5" stroke-linecap="round">'+
   '<path d="M52 48 H82"/><path d="M52 64 H82"/><path d="M52 80 H74"/></g>'+
  '<circle cx="40" cy="48" r="6.5" fill="#35C47A"/>'+
  '<path d="M37 48 l2.4 2.6 4.2 -5" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>'+
  '<circle cx="40" cy="64" r="6.5" fill="#35C47A"/>'+
  '<path d="M37 64 l2.4 2.6 4.2 -5" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>'+
  '<circle cx="40" cy="80" r="6.5" fill="none" stroke="#B6C2D6" stroke-width="3"/>'+
  sh(34,34,10,6,-28,.32));

 /* ── هديّة المكافأة ── */
 A.gift=wrap('0 0 120 120',
  floor(60,108,34,6,.26)+
  '<rect x="20" y="48" width="80" height="58" rx="9" fill="url(#ha-pu)"/>'+
  '<path d="M60 48 h31 a9 9 0 0 1 9 9 v40 a9 9 0 0 1 -9 9 H60 Z" fill="#4B2596" opacity=".3"/>'+
  '<rect x="14" y="34" width="92" height="20" rx="7" fill="#A87BF5"/>'+
  '<path d="M60 34 h39 a7 7 0 0 1 7 7 v6 a7 7 0 0 1 -7 7 H60 Z" fill="#4B2596" opacity=".26"/>'+
  '<rect x="50" y="34" width="20" height="72" fill="url(#ha-au)"/>'+
  '<rect x="50" y="34" width="20" height="72" fill="#fff" opacity=".12"/>'+
  '<path d="M60 34 C46 34 31 28 35 18 C39 10 53 15 60 34 C67 15 81 10 85 18 C89 28 74 34 60 34 Z" fill="url(#ha-au)"/>'+
  '<circle cx="60" cy="32" r="5.5" fill="#FFF3C8"/>'+
  sh(32,44,11,5,-16,.3)+spark(104,26,8)+spark(16,24,6,'#FFF3C8',.8));

 return {get:function(n){return A[n]||''},names:Object.keys(A)};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=HOME_ART;
