/**
 * أيقونات تحدّي — مجموعة مرسومة يدويًا بأسلوب واحد: أشكال مملوءة بتدرّجات ذهب ومعدن وجواهر،
 * إضاءة من أعلى اليسار، حافة داكنة رقيقة، ولمعة زجاجية. لا خطوط رفيعة ولا رموز لوحة مفاتيح.
 * التدرّجات مشتركة في <defs> واحدة تُحقَن في الصفحة مرّة (ICO2.defs)، وكل أيقونة مربّع 24×24.
 *   ICO2.get(name)     → علامات SVG الداخلية (بلا <svg>) أو null
 *   ICO2.defs          → <svg> بالتعاريف المشتركة
 *   ICO2.names         → كل الأسماء
 */
var ICO2=(function(){
 'use strict';
 var GR={
  gold:['#FFF4C4','#F3C24C','#A86F10'], silver:['#FFFFFF','#C3CBD8','#6C7789'], bronze:['#F5C9A3','#C8813F','#7A431A'],
  purple:['#EBD4FF','#A96CF5','#5A2AA6'], red:['#FFB1AB','#E5443D','#8C1A16'], green:['#BFF5C9','#3BC96E','#167A3C'],
  blue:['#C4E2FF','#4F9DF3','#1E4B9C'], orange:['#FFE7A8','#F7A12C','#B5481C'], wood:['#E2B27A','#A6642C','#5C3111'],
  steel:['#E3E9F2','#8894A7','#3B4557'], teal:['#BFF3EC','#2FB7A6','#0F5F58'], white:['#FFFFFF','#E4E9F1','#B8C1D0'],
  paper:['#FFF7E1','#E8D6A8','#B79A62'], navy:['#4A5A8C','#232C4E','#0E1327'], black:['#5B5F6E','#2A2D38','#0C0E14']
 };
 var RIM={gold:'#6B4508',silver:'#3A4252',bronze:'#5A2E10',purple:'#3A1970',red:'#6E1512',green:'#0E4D28',blue:'#123A73',
  orange:'#8A3112',wood:'#3E200C',steel:'#252C38',teal:'#0B4F4A',white:'#8C96A8',paper:'#8A6C3A',navy:'#070A16',black:'#000'};
 var defs='<svg width="0" height="0" style="position:absolute;width:0;height:0" aria-hidden="true"><defs>'+
  Object.keys(GR).map(function(k){var c=GR[k];return '<linearGradient id="tg-'+k+'" x1="0" y1="0" x2=".35" y2="1"><stop offset="0" stop-color="'+c[0]+'"/><stop offset=".48" stop-color="'+c[1]+'"/><stop offset="1" stop-color="'+c[2]+'"/></linearGradient>'+
   '<radialGradient id="tr-'+k+'" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="'+c[0]+'"/><stop offset=".55" stop-color="'+c[1]+'"/><stop offset="1" stop-color="'+c[2]+'"/></radialGradient>'}).join('')+
  '</defs></svg>';
 var g=function(k){return 'url(#tg-'+k+')'}, r=function(k){return 'url(#tr-'+k+')'};
 var gl=function(x,y,rx,ry,o,rot){return '<ellipse cx="'+x+'" cy="'+y+'" rx="'+rx+'" ry="'+ry+'" fill="#fff" opacity="'+(o==null?.34:o)+'"'+(rot?' transform="rotate('+rot+' '+x+' '+y+')"':'')+'/>'};
 var P=function(d,k,extra){return '<path d="'+d+'" fill="'+g(k)+'" stroke="'+RIM[k]+'" stroke-width=".7" stroke-linejoin="round"'+(extra||'')+'/>'};
 var PR=function(d,k,extra){return '<path d="'+d+'" fill="'+r(k)+'" stroke="'+RIM[k]+'" stroke-width=".7" stroke-linejoin="round"'+(extra||'')+'/>'};
 var C=function(x,y,rad,k){return '<circle cx="'+x+'" cy="'+y+'" r="'+rad+'" fill="'+r(k)+'" stroke="'+RIM[k]+'" stroke-width=".7"/>'};
 var W=function(d,extra){return '<path d="'+d+'" fill="#fff"'+(extra||'')+'/>'};
 var badge=function(k,inner){return C(12,12,10.4,k)+'<circle cx="12" cy="12" r="8.5" fill="none" stroke="#fff" stroke-width=".8" opacity=".26"/>'+gl(9,7.2,4.8,2.8,.36)+inner};
 var star=function(cx,cy,R,rr,n){n=n||5;var p=[];for(var i=0;i<n*2;i++){var a=-Math.PI/2+i*Math.PI/n,q=i%2?rr:R;p.push((cx+Math.cos(a)*q).toFixed(2)+','+(cy+Math.sin(a)*q).toFixed(2))}return p.join(' ')};
 var sh=function(d,k){return '<path d="'+d+'" fill="'+RIM[k]+'" opacity=".35" transform="translate(0 .9)"/>'};
 var I={};

 /* ── عملات وموارد ── */
 I.coin='<circle cx="12" cy="12.8" r="9.6" fill="#5A3706"/>'+C(12,11.8,9.6,'gold')+
  '<circle cx="12" cy="11.8" r="6.9" fill="none" stroke="#7A4E0A" stroke-width=".9" opacity=".75"/>'+
  '<circle cx="12" cy="11.8" r="6.2" fill="'+r('gold')+'"/>'+
  '<polygon points="'+star(12,11.9,4.3,2)+'" fill="#7A4E0A" opacity=".85"/><polygon points="'+star(12,11.6,3.3,1.55)+'" fill="#FFF0BE"/>'+gl(8.6,7.4,4.6,2.6,.42);
 I.gem='<polygon points="12,2.5 20.5,8 20.5,15.5 12,21.5 3.5,15.5 3.5,8" fill="'+g('purple')+'" stroke="'+RIM.purple+'" stroke-width=".7" stroke-linejoin="round"/>'+
  '<polygon points="12,2.5 20.5,8 12,9.8 3.5,8" fill="#EBD4FF" opacity=".85"/><polygon points="3.5,8 12,9.8 12,21.5 3.5,15.5" fill="#7A45CF" opacity=".8"/>'+
  '<polygon points="20.5,8 12,9.8 12,21.5 20.5,15.5" fill="#4B2090" opacity=".85"/><polygon points="12,9.8 15.6,12.4 12,17 8.4,12.4" fill="#C9A3FF" opacity=".55"/>'+gl(9.4,6.2,2.6,1.2,.7,-25);
 I.shard='<polygon points="12,2 17,9 15,22 9,22 7,9" fill="'+g('teal')+'" stroke="'+RIM.teal+'" stroke-width=".7" stroke-linejoin="round"/>'+
  '<polygon points="12,2 17,9 12,11" fill="#DFFAF5" opacity=".8"/><polygon points="7,9 12,11 9,22" fill="#0E6B62" opacity=".8"/>'+gl(10.6,6,1.2,3,.6,-15);
 I.energy=P('M13.5 2 L5.5 13.5 H11 L9.5 22 L18.5 9.5 H13 Z','orange')+'<path d="M13 3.6 L7.6 12" stroke="#FFF3C9" stroke-width="1" opacity=".75" fill="none" stroke-linecap="round"/>';
 I.heart=PR('M12 21 C6 16 2.5 12.8 2.5 8.6 C2.5 5.8 4.7 3.8 7.3 3.8 C9.3 3.8 11 5 12 6.5 C13 5 14.7 3.8 16.7 3.8 C19.3 3.8 21.5 5.8 21.5 8.6 C21.5 12.8 18 16 12 21 Z','red')+gl(8.2,7.6,2.6,1.6,.5,-30);
 I.broken=PR('M12 21 C6 16 2.5 12.8 2.5 8.6 C2.5 5.8 4.7 3.8 7.3 3.8 C9.3 3.8 11 5 12 6.5 C13 5 14.7 3.8 16.7 3.8 C19.3 3.8 21.5 5.8 21.5 8.6 C21.5 12.8 18 16 12 21 Z','steel')+
  '<path d="M12.4 6.5 L10.6 10.5 L13.4 13 L11 16.6 L12.8 20.5" fill="none" stroke="#1B2030" stroke-width="1.3" stroke-linejoin="round" stroke-linecap="round"/>'+gl(8.2,7.6,2.6,1.6,.45,-30);
 I.star=P('M'+star(12,12.4,10.2,4.6).replace(/ /g,' L'),'gold')+'<polygon points="'+star(12,12.4,7.2,3.2)+'" fill="#FFE9A8" opacity=".7"/>'+gl(9.6,8.4,2.4,1.4,.55,-30);
 I.starOut='<polygon points="'+star(12,12.4,10.2,4.6)+'" fill="none" stroke="'+g('gold')+'" stroke-width="2" stroke-linejoin="round"/>';
 I.sparkle=P('M12 2 L14.2 9.8 L22 12 L14.2 14.2 L12 22 L9.8 14.2 L2 12 L9.8 9.8 Z','white')+'<path d="M12 6 L12.9 11.1 L18 12 L12.9 12.9 L12 18 L11.1 12.9 L6 12 L11.1 11.1 Z" fill="#FFF7D6"/>';

 /* ── إنجاز ── */
 I.trophy=P('M7 3 H17 V9.5 C17 12.8 14.8 15 12 15 C9.2 15 7 12.8 7 9.5 Z','gold')+
  P('M7 5 H3.8 C3.8 8.5 5.4 10.6 7.6 11.2','gold')+P('M17 5 H20.2 C20.2 8.5 18.6 10.6 16.4 11.2','gold')+
  P('M10.6 15 H13.4 V17.4 H10.6 Z','gold')+P('M7.5 17.4 H16.5 L17.6 21 H6.4 Z','wood')+'<rect x="6.4" y="19.6" width="11.2" height="1.4" fill="#3E200C" opacity=".5"/>'+gl(9.6,6.2,1.7,3,.5);
 I.medal='<path d="M8.5 2 H12 L9.6 11 H6.2 Z" fill="'+g('red')+'" stroke="'+RIM.red+'" stroke-width=".6"/><path d="M15.5 2 H12 L14.4 11 H17.8 Z" fill="'+g('blue')+'" stroke="'+RIM.blue+'" stroke-width=".6"/>'+
  '<circle cx="12" cy="15.3" r="7.2" fill="#5A3706"/>'+C(12,14.6,7.2,'gold')+'<circle cx="12" cy="14.6" r="5" fill="none" stroke="#7A4E0A" stroke-width=".8" opacity=".7"/>'+
  '<polygon points="'+star(12,14.7,3.7,1.7)+'" fill="#7A4E0A" opacity=".85"/><polygon points="'+star(12,14.4,2.8,1.3)+'" fill="#FFF0BE"/>'+gl(9.6,11.4,2.8,1.6,.45);
 I.crown=P('M3 18 L3.6 7.6 L8.2 12 L12 4.6 L15.8 12 L20.4 7.6 L21 18 Z','gold')+'<rect x="3" y="17" width="18" height="3.6" rx=".8" fill="'+g('gold')+'" stroke="'+RIM.gold+'" stroke-width=".7"/>'+
  '<circle cx="7" cy="18.8" r="1" fill="#E5443D"/><circle cx="12" cy="18.8" r="1.1" fill="#3BC96E"/><circle cx="17" cy="18.8" r="1" fill="#4F9DF3"/>'+
  '<circle cx="3.6" cy="7.4" r="1.3" fill="#FFE9A8" stroke="'+RIM.gold+'" stroke-width=".5"/><circle cx="12" cy="4.4" r="1.4" fill="#FFE9A8" stroke="'+RIM.gold+'" stroke-width=".5"/><circle cx="20.4" cy="7.4" r="1.3" fill="#FFE9A8" stroke="'+RIM.gold+'" stroke-width=".5"/>'+gl(8.4,12.6,3,1.4,.4,-20);
 I.ticket=P('M3 8 C4.4 8 5.5 6.9 5.5 5.5 H18.5 C18.5 6.9 19.6 8 21 8 V16 C19.6 16 18.5 17.1 18.5 18.5 H5.5 C5.5 17.1 4.4 16 3 16 Z','gold')+
  '<path d="M8 8 V16" stroke="#7A4E0A" stroke-width=".8" stroke-dasharray="1.2 1.2" opacity=".8"/><polygon points="'+star(14.2,12.1,3.3,1.5)+'" fill="#7A4E0A" opacity=".85"/><polygon points="'+star(14.2,11.8,2.5,1.15)+'" fill="#FFF0BE"/>'+gl(9,8.6,3.6,1.4,.4,-10);
 I.chest='<rect x="3" y="9" width="18" height="11.5" rx="1.4" fill="'+g('wood')+'" stroke="'+RIM.wood+'" stroke-width=".7"/><path d="M3 10.5 C3 6.6 5.6 4 12 4 C18.4 4 21 6.6 21 10.5 Z" fill="'+g('wood')+'" stroke="'+RIM.wood+'" stroke-width=".7"/>'+
  '<rect x="2.6" y="9.6" width="18.8" height="2.2" fill="'+g('gold')+'" stroke="'+RIM.gold+'" stroke-width=".5"/><rect x="6.5" y="4.6" width="2" height="15.6" fill="'+g('gold')+'" opacity=".9"/><rect x="15.5" y="4.6" width="2" height="15.6" fill="'+g('gold')+'" opacity=".9"/>'+
  '<rect x="10.2" y="10" width="3.6" height="4.4" rx=".8" fill="'+g('gold')+'" stroke="'+RIM.gold+'" stroke-width=".5"/><circle cx="12" cy="12" r=".7" fill="#4A2D06"/>'+gl(8,6.4,2.6,1,.3,-15);
 I.gift='<rect x="3.5" y="10" width="17" height="10.5" rx="1.2" fill="'+g('red')+'" stroke="'+RIM.red+'" stroke-width=".7"/><rect x="2.8" y="6.8" width="18.4" height="3.8" rx=".9" fill="'+g('red')+'" stroke="'+RIM.red+'" stroke-width=".7"/>'+
  '<rect x="10.4" y="6.8" width="3.2" height="13.7" fill="'+g('gold')+'" stroke="'+RIM.gold+'" stroke-width=".5"/>'+
  P('M12 6.8 C9.2 6.8 6.6 5.6 7.4 3.8 C8.2 2.4 10.8 3.4 12 6.8 C13.2 3.4 15.8 2.4 16.6 3.8 C17.4 5.6 14.8 6.8 12 6.8 Z','gold')+gl(7,8.4,2.2,.9,.4);
 I.shop=P('M3 9.5 L4.8 4 H19.2 L21 9.5 Z','red')+'<path d="M3 9.5 H21 C21 11.4 19.6 12.6 18 12.6 C16.6 12.6 15.4 11.7 15 10.4 C14.6 11.7 13.4 12.6 12 12.6 C10.6 12.6 9.4 11.7 9 10.4 C8.6 11.7 7.4 12.6 6 12.6 C4.4 12.6 3 11.4 3 9.5 Z" fill="'+g('white')+'" stroke="'+RIM.white+'" stroke-width=".6"/>'+
  '<rect x="4.5" y="12.4" width="15" height="8.4" fill="'+g('paper')+'" stroke="'+RIM.paper+'" stroke-width=".7"/><rect x="10.2" y="14.6" width="3.6" height="6.2" fill="'+g('wood')+'" stroke="'+RIM.wood+'" stroke-width=".5"/><rect x="6" y="14.6" width="3" height="2.8" fill="#4F9DF3" opacity=".8"/><rect x="15" y="14.6" width="3" height="2.8" fill="#4F9DF3" opacity=".8"/>';

 /* ── بطاقات ── */
 var card=function(x,y,w,h,rot,k){return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="1.2" fill="'+g(k)+'" stroke="'+RIM[k]+'" stroke-width=".7" transform="rotate('+rot+' '+(x+w/2)+' '+(y+h/2)+')"/>'};
 I.cards=card(4,5,9,13,-16,'blue')+card(7.5,4.5,9,13,-4,'purple')+card(11,5,9,13,10,'white')+'<path d="M15.5 9.4 c-.9-1 -2.6-.4 -2.6 .9 c0 1.2 2.6 3.1 2.6 3.1 s2.6-1.9 2.6-3.1 c0-1.3 -1.7-1.9 -2.6-.9 Z" fill="#E5443D" transform="rotate(10 15.5 11)"/>';
 I.deck=card(5.5,7,13,14,0,'blue')+card(5.5,5,13,14,0,'purple')+card(5.5,3,13,14,0,'white')+'<circle cx="12" cy="10" r="3" fill="none" stroke="#4F9DF3" stroke-width="1.2"/>';
 I.wild='<rect x="5" y="3" width="14" height="18" rx="1.6" fill="#1B2030" stroke="#0C0E14" stroke-width=".7"/><circle cx="12" cy="12" r="5.6" fill="#E5443D"/><path d="M12 6.4 A5.6 5.6 0 0 1 17.6 12 H12 Z" fill="#F7A12C"/><path d="M12 12 H17.6 A5.6 5.6 0 0 1 12 17.6 Z" fill="#3BC96E"/><path d="M12 12 V17.6 A5.6 5.6 0 0 1 6.4 12 Z" fill="#4F9DF3"/><circle cx="12" cy="12" r="5.6" fill="none" stroke="#fff" stroke-width=".9"/>'+gl(9,6.6,2,1,.35,-20);
 I.album='<rect x="3.5" y="4" width="17" height="16" rx="1.6" fill="'+g('wood')+'" stroke="'+RIM.wood+'" stroke-width=".7"/><rect x="6" y="6.5" width="12" height="9" rx=".6" fill="'+g('white')+'"/><circle cx="9" cy="9.6" r="1.3" fill="#F7A12C"/><path d="M6.5 15 L10.5 11 L13 13.5 L15 12 L17.5 15 Z" fill="#3BC96E"/><rect x="6" y="16.6" width="8" height="1.2" rx=".6" fill="#3E200C" opacity=".5"/>';

 /* ── مواضع وخرائط ── */
 I.map=P('M3 5.5 L9 3.5 L15 5.5 L21 3.5 V18.5 L15 20.5 L9 18.5 L3 20.5 Z','paper')+'<path d="M9 3.5 V18.5 M15 5.5 V20.5" stroke="'+RIM.paper+'" stroke-width=".7" opacity=".6"/>'+
  '<path d="M5.5 15.5 C8 11 10 14 12 10.5 C13.4 8 16 9.5 18.5 7" fill="none" stroke="#E5443D" stroke-width="1.2" stroke-dasharray="1.8 1.2" stroke-linecap="round"/><circle cx="18.5" cy="7" r="1.5" fill="#E5443D" stroke="#6E1512" stroke-width=".5"/>';
 I.globe=C(12,12,9.6,'blue')+'<path d="M7 6.2 C9 7.4 8.4 9.6 10.4 10.4 C12.6 11.2 11.2 13.8 13.4 14.6 C15.2 15.2 14.8 17.4 13.2 18.6 C10.4 17.8 6.8 15.4 5.4 11.6 C5.4 9.4 5.8 7.6 7 6.2 Z" fill="#3BC96E" opacity=".95"/><path d="M15.4 4.4 C17.4 5.4 19 7.4 19.6 9.8 C18.2 10.4 16.4 9.6 16 8 C15.6 6.6 14.6 5.6 15.4 4.4 Z" fill="#3BC96E" opacity=".95"/>'+gl(8.6,7.4,3.6,2,.4,-25);
 I.web='<path d="M12 4.5 L19 9 L16.5 17.5 H7.5 L5 9 Z" fill="none" stroke="'+g('blue')+'" stroke-width="1.6"/>'+C(12,4.5,2.6,'blue')+C(19,9,2.6,'blue')+C(16.5,17.5,2.6,'blue')+C(7.5,17.5,2.6,'blue')+C(5,9,2.6,'blue')+C(12,11.8,3.2,'gold');
 I.target=C(12,12,10,'white')+'<circle cx="12" cy="12" r="7.4" fill="#E5443D"/><circle cx="12" cy="12" r="4.8" fill="#FFFFFF"/><circle cx="12" cy="12" r="2.3" fill="#E5443D"/>'+gl(8.6,7.6,3.4,2,.45,-25);
 I.flag=P('M6.5 3.5 H19.5 L16.8 8 L19.5 12.5 H6.5 Z','red')+'<rect x="4.8" y="2.5" width="2" height="19" rx=".8" fill="'+g('gold')+'" stroke="'+RIM.gold+'" stroke-width=".5"/><circle cx="5.8" cy="2.8" r="1.2" fill="'+r('gold')+'" stroke="'+RIM.gold+'" stroke-width=".5"/>'+gl(10,5.6,2.6,.9,.35);
 I.door=P('M5 21 V5 C5 3.9 5.9 3 7 3 H17 C18.1 3 19 3.9 19 5 V21 Z','wood')+'<path d="M7.5 21 V5.5 H16.5 V21" fill="none" stroke="'+RIM.wood+'" stroke-width=".7" opacity=".6"/><rect x="3.5" y="20.2" width="17" height="1.6" rx=".6" fill="'+g('steel')+'"/><circle cx="14.8" cy="12.6" r="1.2" fill="'+r('gold')+'" stroke="'+RIM.gold+'" stroke-width=".5"/>'+gl(9.6,7.4,1.6,2.4,.25);
 I.pillar=P('M6 5.5 H18 V8 H16.5 V18 H18 V21 H6 V18 H7.5 V8 H6 Z','white')+'<path d="M9.5 8 V18 M12 8 V18 M14.5 8 V18" stroke="#8C96A8" stroke-width=".8" opacity=".6"/><rect x="5" y="3.5" width="14" height="2.4" rx=".6" fill="'+g('gold')+'" stroke="'+RIM.gold+'" stroke-width=".5"/>';
 I.mosque=P('M4 21 V13 C4 9 7.5 7 12 7 C16.5 7 20 9 20 13 V21 Z','teal')+'<rect x="2.6" y="20" width="18.8" height="1.6" fill="'+g('gold')+'"/><rect x="10.4" y="14" width="3.2" height="7" rx="1.6" fill="'+g('gold')+'"/><path d="M12 3 V7" stroke="'+g('gold')+'" stroke-width="1.6" stroke-linecap="round"/><circle cx="12" cy="3" r="1.1" fill="'+r('gold')+'"/><rect x="1.2" y="9" width="2.2" height="12" fill="'+g('white')+'" stroke="'+RIM.white+'" stroke-width=".5"/><rect x="20.6" y="9" width="2.2" height="12" fill="'+g('white')+'" stroke="'+RIM.white+'" stroke-width=".5"/>'+gl(8.6,9.6,2.6,1.2,.35,-20);

 /* ── أشخاص ── */
 var avatar=function(x,y,s,k){return '<circle cx="'+x+'" cy="'+(y-s*.32)+'" r="'+(s*.42)+'" fill="'+r(k)+'" stroke="'+RIM[k]+'" stroke-width=".6"/><path d="M'+(x-s)+' '+(y+s)+' C'+(x-s)+' '+(y+s*.1)+' '+(x-s*.5)+' '+(y+s*.05)+' '+x+' '+(y+s*.05)+' C'+(x+s*.5)+' '+(y+s*.05)+' '+(x+s)+' '+(y+s*.1)+' '+(x+s)+' '+(y+s)+' Z" fill="'+g(k)+'" stroke="'+RIM[k]+'" stroke-width=".6"/>'};
 I.user=badge('gold','<circle cx="12" cy="9.4" r="3.4" fill="#fff"/><path d="M5.6 19.2 C5.6 14.6 8.6 13.6 12 13.6 C15.4 13.6 18.4 14.6 18.4 19.2 C16.6 20.8 14.4 21.5 12 21.5 C9.6 21.5 7.4 20.8 5.6 19.2 Z" fill="#fff"/>');
 I.group=avatar(6.2,15.2,4.6,'green')+avatar(17.8,15.2,4.6,'blue')+avatar(12,15.4,5.6,'gold');
 I.robot='<rect x="4.5" y="6.5" width="15" height="13" rx="3" fill="'+g('steel')+'" stroke="'+RIM.steel+'" stroke-width=".7"/><rect x="11" y="2.5" width="2" height="4" rx="1" fill="'+g('steel')+'"/><circle cx="12" cy="2.6" r="1.3" fill="#E5443D"/><rect x="7" y="10" width="10" height="5.2" rx="1.4" fill="#0E1327"/><circle cx="9.6" cy="12.6" r="1.4" fill="#4F9DF3"/><circle cx="14.4" cy="12.6" r="1.4" fill="#4F9DF3"/><rect x="8.5" y="16.6" width="7" height="1.4" rx=".7" fill="#0E1327" opacity=".6"/><rect x="2.5" y="10" width="2" height="5" rx="1" fill="'+g('steel')+'"/><rect x="19.5" y="10" width="2" height="5" rx="1" fill="'+g('steel')+'"/>'+gl(8.4,8.6,2.4,.9,.35,-10);

 /* ── الأدوات والحالات ── */
 I.check=badge('green','<path d="M7.2 12.3 L10.6 15.6 L17 8.8" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>');
 I.cross=badge('red','<path d="M8.4 8.4 L15.6 15.6 M15.6 8.4 L8.4 15.6" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>');
 I.info=badge('blue','<circle cx="12" cy="7.6" r="1.5" fill="#fff"/><rect x="10.6" y="10.2" width="2.8" height="7.6" rx="1.2" fill="#fff"/>');
 I.plus=badge('green','<path d="M12 7.2 V16.8 M7.2 12 H16.8" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>');
 I.up=badge('gold','<path d="M12 16.6 V7.6 M7.8 11.6 L12 7.4 L16.2 11.6" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>');
 I.down=badge('gold','<path d="M12 7.4 V16.4 M7.8 12.4 L12 16.6 L16.2 12.4" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>');
 I.back=badge('gold','<path d="M7.6 12 H16.4 M11.6 7.8 L7.4 12 L11.6 16.2" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>');
 I.next=badge('gold','<path d="M16.4 12 H7.6 M12.4 7.8 L16.6 12 L12.4 16.2" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>');
 I.export=badge('blue','<path d="M12 15 V6.6 M8.4 9.8 L12 6.2 L15.6 9.8" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 14.5 V17.4 H17 V14.5" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>');
 I.reset=badge('gold','<path d="M16.6 9.4 A5.2 5.2 0 1 0 17.2 13.6" fill="none" stroke="#fff" stroke-width="2.3" stroke-linecap="round"/><path d="M17.2 6.4 V10 H13.6" fill="none" stroke="#fff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>');
 I.play=badge('gold','<path d="M9.4 7.4 L17 12 L9.4 16.6 Z" fill="#fff"/>');
 I.pause=badge('gold','<rect x="8.2" y="7.4" width="2.8" height="9.2" rx="1" fill="#fff"/><rect x="13" y="7.4" width="2.8" height="9.2" rx="1" fill="#fff"/>');
 I.menu=badge('gold','<path d="M7.4 9 H16.6 M7.4 12 H16.6 M7.4 15 H16.6" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>');
 I.list=badge('blue','<circle cx="8" cy="9" r="1.2" fill="#fff"/><circle cx="8" cy="12" r="1.2" fill="#fff"/><circle cx="8" cy="15" r="1.2" fill="#fff"/><path d="M10.8 9 H16.4 M10.8 12 H16.4 M10.8 15 H16.4" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>');
 I.x2=badge('purple','<text x="12" y="15.6" text-anchor="middle" font-family="Cairo,system-ui" font-weight="900" font-size="9.5" fill="#fff" direction="ltr" unicode-bidi="bidi-override">×2</text>');
 I.counter='<rect x="2.5" y="7" width="19" height="10" rx="2" fill="'+g('steel')+'" stroke="'+RIM.steel+'" stroke-width=".7"/><rect x="4.4" y="8.8" width="4.4" height="6.4" rx=".7" fill="#0E1327"/><rect x="9.8" y="8.8" width="4.4" height="6.4" rx=".7" fill="#0E1327"/><rect x="15.2" y="8.8" width="4.4" height="6.4" rx=".7" fill="#0E1327"/><text x="6.6" y="13.9" text-anchor="middle" font-family="system-ui" font-weight="900" font-size="5.6" fill="#FFE9A8">0</text><text x="12" y="13.9" text-anchor="middle" font-family="system-ui" font-weight="900" font-size="5.6" fill="#FFE9A8">0</text><text x="17.4" y="13.9" text-anchor="middle" font-family="system-ui" font-weight="900" font-size="5.6" fill="#FFE9A8">3</text>';
 I.timer=P('M6 3 H18 V5.2 C18 8 15.4 9.6 13.4 12 C15.4 14.4 18 16 18 18.8 V21 H6 V18.8 C6 16 8.6 14.4 10.6 12 C8.6 9.6 6 8 6 5.2 Z','gold')+
  '<path d="M8.2 5.6 H15.8 C15.8 7.6 13.8 9.2 12 10.8 C10.2 9.2 8.2 7.6 8.2 5.6 Z" fill="#F7A12C" opacity=".9"/><path d="M9 19.4 H15 C15 17.6 13.4 16.4 12 15.2 C10.6 16.4 9 17.6 9 19.4 Z" fill="#F7A12C" opacity=".9"/>'+gl(8.6,5.4,1.2,1.8,.4,-15);
 I.lock='<path d="M7.5 11 V8.2 C7.5 5.4 9.5 3.3 12 3.3 C14.5 3.3 16.5 5.4 16.5 8.2 V11" fill="none" stroke="'+g('steel')+'" stroke-width="2.6"/><path d="M7.5 11 V8.2 C7.5 5.4 9.5 3.3 12 3.3 C14.5 3.3 16.5 5.4 16.5 8.2 V11" fill="none" stroke="'+RIM.steel+'" stroke-width=".6" opacity=".5"/>'+
  '<rect x="4.5" y="10.5" width="15" height="10.5" rx="2.2" fill="'+g('gold')+'" stroke="'+RIM.gold+'" stroke-width=".7"/><circle cx="12" cy="15" r="1.8" fill="#5A3706"/><rect x="11.2" y="15.6" width="1.6" height="3" rx=".6" fill="#5A3706"/>'+gl(8.2,12.6,2.6,1,.35,-10);
 I.shield=P('M12 2.5 L20.5 5.5 V11.5 C20.5 16.6 17 20.2 12 22 C7 20.2 3.5 16.6 3.5 11.5 V5.5 Z','gold')+P('M12 4.8 L18.6 7.1 V11.6 C18.6 15.6 15.9 18.5 12 20 C8.1 18.5 5.4 15.6 5.4 11.6 V7.1 Z','steel')+
  '<path d="M12 4.8 V20 C8.1 18.5 5.4 15.6 5.4 11.6 V7.1 Z" fill="#fff" opacity=".12"/><polygon points="'+star(12,12,3.6,1.6)+'" fill="'+g('gold')+'" stroke="'+RIM.gold+'" stroke-width=".4"/>'+gl(8.8,7.6,2.2,1.2,.4,-30);
 I.flame=PR('M12 2.5 C13 6 17.5 8.5 17.5 13.4 C17.5 17.4 15 21 12 21 C9 21 6.5 17.4 6.5 13.4 C6.5 10.6 8 9.2 8.6 7.6 C9.6 9.6 10.4 10 11 9.6 C11.4 8 11 5.2 12 2.5 Z','orange')+'<path d="M12 11.6 C13.4 13.4 15 14.4 15 16.6 C15 18.6 13.6 20 12 20 C10.4 20 9 18.6 9 16.6 C9 14.8 10.6 13.8 11.2 12.6 C11.6 13.4 12 13.2 12 11.6 Z" fill="#FFE07A"/>';
 I.bulb=PR('M12 2.5 C8 2.5 5.5 5.4 5.5 8.8 C5.5 11.6 7.4 12.8 8.4 15 H15.6 C16.6 12.8 18.5 11.6 18.5 8.8 C18.5 5.4 16 2.5 12 2.5 Z','orange')+'<rect x="8.6" y="15.2" width="6.8" height="2.4" rx=".8" fill="'+g('steel')+'" stroke="'+RIM.steel+'" stroke-width=".5"/><rect x="9.4" y="18" width="5.2" height="2" rx=".8" fill="'+g('steel')+'" stroke="'+RIM.steel+'" stroke-width=".5"/><path d="M10.4 15 L11 11.4 M13.6 15 L13 11.4" stroke="#B5481C" stroke-width=".8" stroke-linecap="round"/>'+gl(9.2,6.2,2,2.6,.5,-20);
 I.gear=P('M12 2.6 L13.9 4.4 L16.4 3.6 L17.4 6 L20 6.6 L19.6 9.2 L21.5 11 L19.6 12.8 L20 15.4 L17.4 16 L16.4 18.4 L13.9 17.6 L12 19.4 L10.1 17.6 L7.6 18.4 L6.6 16 L4 15.4 L4.4 12.8 L2.5 11 L4.4 9.2 L4 6.6 L6.6 6 L7.6 3.6 L10.1 4.4 Z','steel')+'<circle cx="12" cy="11" r="3.6" fill="#0E1327"/><circle cx="12" cy="11" r="2.2" fill="'+g('gold')+'"/>'+gl(9,6.6,2,1.1,.35,-25);
 I.search='<rect x="13.2" y="13.6" width="3.4" height="9" rx="1.4" fill="'+g('steel')+'" stroke="'+RIM.steel+'" stroke-width=".6" transform="rotate(-45 14.9 18.1)"/><circle cx="9.8" cy="9.8" r="7.2" fill="'+g('gold')+'" stroke="'+RIM.gold+'" stroke-width=".7"/><circle cx="9.8" cy="9.8" r="5.2" fill="'+r('blue')+'"/>'+gl(7.6,7.4,2.2,1.3,.55,-35);
 I.save='<rect x="3.5" y="3.5" width="17" height="17" rx="1.8" fill="'+g('blue')+'" stroke="'+RIM.blue+'" stroke-width=".7"/><rect x="7" y="3.8" width="9.5" height="5.6" rx=".6" fill="'+g('white')+'"/><rect x="13.2" y="4.6" width="1.8" height="3.8" rx=".4" fill="#1E4B9C"/><rect x="6.5" y="13" width="11" height="7.5" rx=".8" fill="#0E1327" opacity=".55"/>'+gl(6.6,11.2,1.4,2.6,.25);
 I.trash='<rect x="6" y="7" width="12" height="14" rx="1.6" fill="'+g('steel')+'" stroke="'+RIM.steel+'" stroke-width=".7"/><rect x="4.4" y="5" width="15.2" height="2.4" rx=".8" fill="'+g('steel')+'" stroke="'+RIM.steel+'" stroke-width=".6"/><rect x="9.6" y="3.2" width="4.8" height="2" rx=".8" fill="'+g('steel')+'"/><path d="M9.4 10 V18 M12 10 V18 M14.6 10 V18" stroke="#252C38" stroke-width="1" opacity=".6"/>';
 I.scissors=C(7.5,17,3.2,'red')+C(16.5,17,3.2,'red')+'<path d="M9.4 14.6 L18 3.6 M14.6 14.6 L6 3.6" stroke="'+g('steel')+'" stroke-width="2.4" stroke-linecap="round"/><circle cx="12" cy="11.2" r="1.1" fill="'+r('gold')+'"/>';
 I.hammer='<path d="M5.5 20 L14.2 11.3" stroke="'+RIM.wood+'" stroke-width="4.2" stroke-linecap="round"/><path d="M5.5 20 L14.2 11.3" stroke="'+g('wood')+'" stroke-width="3" stroke-linecap="round"/><rect x="12.4" y="4.2" width="9.2" height="5.6" rx="1.3" fill="'+g('steel')+'" stroke="'+RIM.steel+'" stroke-width=".7" transform="rotate(45 17 7)"/><rect x="2.5" y="19.4" width="10" height="2.2" rx=".8" fill="'+g('wood')+'" stroke="'+RIM.wood+'" stroke-width=".5"/>'+gl(15.2,5.4,1.6,.8,.4,45);
 I.scale=P('M11 3.5 H13 V19 H11 Z','gold')+'<rect x="6" y="19" width="12" height="2.4" rx=".8" fill="'+g('gold')+'" stroke="'+RIM.gold+'" stroke-width=".5"/><path d="M4 6.5 H20" stroke="'+g('gold')+'" stroke-width="1.6" stroke-linecap="round"/>'+
  '<path d="M4 6.5 L1.8 12.4 M4 6.5 L6.2 12.4 M20 6.5 L17.8 12.4 M20 6.5 L22.2 12.4" stroke="#B37A14" stroke-width=".7"/><path d="M1 12.4 H7 A3 3 0 0 1 1 12.4 Z" fill="'+g('gold')+'" stroke="'+RIM.gold+'" stroke-width=".5"/><path d="M17 12.4 H23 A3 3 0 0 1 17 12.4 Z" fill="'+g('gold')+'" stroke="'+RIM.gold+'" stroke-width=".5"/><circle cx="12" cy="6.5" r="1.4" fill="'+r('gold')+'" stroke="'+RIM.gold+'" stroke-width=".5"/>';
 I.swords='<path d="M5 4 L16.5 15.5" stroke="'+g('steel')+'" stroke-width="2.6" stroke-linecap="round"/><path d="M19 4 L7.5 15.5" stroke="'+g('steel')+'" stroke-width="2.6" stroke-linecap="round"/><path d="M5 4 L16.5 15.5 M19 4 L7.5 15.5" stroke="#fff" stroke-width=".7" opacity=".6" stroke-linecap="round"/>'+
  '<path d="M14.6 13.6 L17.4 16.4 M9.4 13.6 L6.6 16.4" stroke="'+g('gold')+'" stroke-width="2.2" stroke-linecap="round"/><path d="M17.4 16.4 L20 19 M6.6 16.4 L4 19" stroke="'+g('wood')+'" stroke-width="2.6" stroke-linecap="round"/><circle cx="20.2" cy="19.2" r="1.4" fill="'+r('gold')+'"/><circle cx="3.8" cy="19.2" r="1.4" fill="'+r('gold')+'"/>';
 I.bell=PR('M12 3 C8.2 3 6 6 6 9.8 V14 L4 17 H20 L18 14 V9.8 C18 6 15.8 3 12 3 Z','gold')+'<path d="M9.4 18.2 A2.6 2.6 0 0 0 14.6 18.2 Z" fill="'+g('gold')+'" stroke="'+RIM.gold+'" stroke-width=".6"/><rect x="11.2" y="1.6" width="1.6" height="2" rx=".6" fill="'+g('gold')+'"/>'+gl(9.4,6.6,1.6,2.4,.45,-15);
 I.sound='<path d="M4 9.5 H7.5 L12 5.5 V18.5 L7.5 14.5 H4 Z" fill="'+g('steel')+'" stroke="'+RIM.steel+'" stroke-width=".7" stroke-linejoin="round"/><path d="M15 9 A4.5 4.5 0 0 1 15 15 M17.8 6.5 A8 8 0 0 1 17.8 17.5" fill="none" stroke="'+g('gold')+'" stroke-width="2" stroke-linecap="round"/>';
 I.mute='<path d="M4 9.5 H7.5 L12 5.5 V18.5 L7.5 14.5 H4 Z" fill="'+g('steel')+'" stroke="'+RIM.steel+'" stroke-width=".7" stroke-linejoin="round"/><path d="M15 9.4 L20.4 14.8 M20.4 9.4 L15 14.8" stroke="'+g('red')+'" stroke-width="2.3" stroke-linecap="round"/>';
 I.scroll=P('M6 4.5 H19 C20.2 4.5 21 5.3 21 6.5 V7.5 H8 V17.5 C8 19 6.8 20 5.5 20 C4.2 20 3 19 3 17.5 V6.5 C3 5.4 3.9 4.5 5 4.5 Z','paper')+'<path d="M8 7.5 H21 V17.5 C21 19 19.8 20 18.5 20 H5.5" fill="'+g('paper')+'" stroke="'+RIM.paper+'" stroke-width=".7"/><path d="M10.5 10.5 H18 M10.5 13 H18 M10.5 15.5 H15.5" stroke="#8A6C3A" stroke-width=".9" stroke-linecap="round" opacity=".7"/>';
 I.book=P('M4 4 H18 C19.1 4 20 4.9 20 6 V20 H6 C4.9 20 4 19.1 4 18 Z','red')+'<path d="M6 20 C4.9 20 4 19.1 4 18 C4 16.9 4.9 16 6 16 H20 V20 Z" fill="'+g('paper')+'" stroke="'+RIM.paper+'" stroke-width=".6"/><rect x="4" y="4" width="2.8" height="12" fill="'+RIM.red+'" opacity=".5"/><polygon points="'+star(13.4,10,2.6,1.1)+'" fill="'+g('gold')+'"/>'+gl(9.6,7,2,1,.3,-15);
 I.cap='<path d="M6.5 11.3 V15.6 C6.5 17.6 9 19 12 19 C15 19 17.5 17.6 17.5 15.6 V11.3 L12 14 Z" fill="'+g('navy')+'" stroke="'+RIM.navy+'" stroke-width=".7"/>'+P('M12 5.6 L22 10.6 L12 15.6 L2 10.6 Z','navy')+P('M12 4 L22 9 L12 14 L2 9 Z','navy')+'<path d="M12 4 L22 9 L12 14 L2 9 Z" fill="#fff" opacity=".12"/><path d="M20 9.6 V15" stroke="'+g('gold')+'" stroke-width="1.4" stroke-linecap="round"/><circle cx="20" cy="15.6" r="1.3" fill="'+r('gold')+'"/>'+gl(9,8,2.8,1,.3,-15);
 I.dice='<rect x="3.5" y="3.5" width="17" height="17" rx="3.4" fill="'+g('white')+'" stroke="'+RIM.white+'" stroke-width=".7"/><circle cx="8" cy="8" r="1.7" fill="#0E1327"/><circle cx="16" cy="8" r="1.7" fill="#0E1327"/><circle cx="12" cy="12" r="1.7" fill="#E5443D"/><circle cx="8" cy="16" r="1.7" fill="#0E1327"/><circle cx="16" cy="16" r="1.7" fill="#0E1327"/>';
 I.ball='<circle cx="12" cy="12.8" r="9.4" fill="#2A1A08" opacity=".5"/><circle cx="12" cy="12" r="9.4" fill="'+r('white')+'" stroke="'+RIM.white+'" stroke-width=".8"/><circle cx="12" cy="12" r="6.2" fill="none" stroke="#B8C1D0" stroke-width=".8"/>'+gl(8.8,8.2,3.2,2,.6,-30);
 I.orb=C(12,12,9.4,'purple')+'<circle cx="12" cy="12" r="6" fill="'+r('purple')+'" opacity=".9"/><circle cx="12" cy="12" r="9.4" fill="none" stroke="#EBD4FF" stroke-width=".8" opacity=".5"/>'+gl(8.6,7.6,3.6,2.2,.55,-25);
 I.puzzle=P('M4 6 H9 C8.4 4 9.4 2.5 11 2.5 C12.6 2.5 13.6 4 13 6 H18 V11 C20 10.4 21.5 11.4 21.5 13 C21.5 14.6 20 15.6 18 15 V20 H13 C13.6 22 12.6 23.5 11 23.5 C9.4 23.5 8.4 22 9 20 H4 V15 C6 15.6 7.5 14.6 7.5 13 C7.5 11.4 6 10.4 4 11 Z','purple')+gl(8.2,8.4,2.6,1.2,.35,-20);
 I.paw=C(12,15.4,5.2,'wood')+C(5.6,10.6,2.4,'wood')+C(9.2,6.2,2.4,'wood')+C(14.8,6.2,2.4,'wood')+C(18.4,10.6,2.4,'wood');
 I.flask=P('M9.5 3 H14.5 V9.5 L20 18.5 C20.8 19.8 20 21 18.6 21 H5.4 C4 21 3.2 19.8 4 18.5 L9.5 9.5 Z','white')+'<path d="M7.2 15 H16.8 L19.2 19.2 H4.8 Z" fill="'+g('teal')+'"/><rect x="8.6" y="2.4" width="6.8" height="1.6" rx=".8" fill="'+g('steel')+'"/><circle cx="10" cy="17.2" r=".9" fill="#DFFAF5"/><circle cx="14" cy="18.2" r=".7" fill="#DFFAF5"/>';
 I.palette=P('M12 3 C6.5 3 2.5 6.8 2.5 11.6 C2.5 16.2 6.2 19 9.4 19 C10.8 19 11.4 18.2 11.4 17.2 C11.4 15.8 10.6 15.4 10.6 14.4 C10.6 13.4 11.4 12.6 12.6 12.6 H15.2 C18.6 12.6 21.5 10.4 21.5 7.8 C21.5 5 17.6 3 12 3 Z','wood')+'<circle cx="7" cy="9.4" r="1.7" fill="#E5443D"/><circle cx="10.6" cy="6.4" r="1.7" fill="#F7A12C"/><circle cx="15.6" cy="6.2" r="1.7" fill="#3BC96E"/><circle cx="18.6" cy="9" r="1.7" fill="#4F9DF3"/>'+gl(6.8,14.6,2,1,.3,-30);
 I.chart='<rect x="3" y="19" width="18" height="2" rx=".7" fill="'+g('steel')+'"/><rect x="4.5" y="12" width="4" height="7" rx=".8" fill="'+g('blue')+'" stroke="'+RIM.blue+'" stroke-width=".6"/><rect x="10" y="7" width="4" height="12" rx=".8" fill="'+g('gold')+'" stroke="'+RIM.gold+'" stroke-width=".6"/><rect x="15.5" y="3.5" width="4" height="15.5" rx=".8" fill="'+g('green')+'" stroke="'+RIM.green+'" stroke-width=".6"/>';

 var names=Object.keys(I);
 return {get:function(n){return I[n]||null},defs:defs,names:names,GR:GR};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=ICO2;
