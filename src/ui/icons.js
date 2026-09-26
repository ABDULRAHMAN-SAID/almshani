/**
 * أيقونات تحدّي — لغة واحدة مسطّحة: أشكال هندسيّة بلونين (أساس + عمق) بلا تدرّجات
 * ولا لمعة زجاجيّة ولا حوافّ ثلاثيّة الأبعاد. الشبكة 24×24 بهامش بصريّ 2،
 * وأدنى سماكة 2.2 ليبقى الشكل مقروءًا عند 14 بكسل.
 * ألوان كل عائلة معرّفة مرّة في ICO2.PAL، والتلوين يبدّل لون الذهب بلون آخر.
 *   ICO2.get(name) → علامات SVG الداخلية (بلا svg) أو null
 *   ICO2.defs      → عنصر مخفيّ يحمل مُعرّف الحقن
 *   ICO2.names     → كل الأسماء
 *   ICO2.PAL       → [أساس، عمق] لكل عائلة لون
 */
var ICO2=(function(){
 'use strict';
 var PAL={
  gold:['#E8B23A','#9C6E15'], silver:['#C9D2E0','#7C8799'], bronze:['#CB8543','#855029'],
  purple:['#9B6CF0','#5C31AE'], red:['#E2584F','#9C2C29'], green:['#35C47A','#157747'],
  blue:['#4A93E8','#215DA6'], orange:['#F0972C','#A65811'], wood:['#AC7742','#68411F'],
  steel:['#98A4B9','#586376'], teal:['#2FB9A8','#116D64'], white:['#EDF1F8','#A8B3C6'],
  paper:['#E6DBBE','#A9976D'], navy:['#5568A2','#26305A'], black:['#3B4050','#151822']
 };
 var INK='#0F1523';
 var B=function(k){return PAL[k][0]}, D=function(k){return PAL[k][1]};
 /* عنصر مخفيّ يحمل tg-gold ليبقى شرط الحقن في الصفحة صالحًا */
 var defs='<svg width="0" height="0" style="position:absolute;width:0;height:0" aria-hidden="true">'+
  '<defs><linearGradient id="tg-gold"><stop stop-color="'+PAL.gold[0]+'"/></linearGradient></defs></svg>';

 var PC=function(d,c){return '<path d="'+d+'" fill="'+c+'"/>'};
 var P =function(d,k){return PC(d,B(k))};
 var PD=function(d,k){return PC(d,D(k))};
 var RC=function(x,y,w,h,r,c,t){return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="'+r+'" fill="'+c+'"'+(t?' transform="'+t+'"':'')+'/>'};
 var R =function(x,y,w,h,r,k,t){return RC(x,y,w,h,r,B(k),t)};
 var RD=function(x,y,w,h,r,k,t){return RC(x,y,w,h,r,D(k),t)};
 var CC=function(x,y,r,c){return '<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="'+c+'"/>'};
 var CI=function(x,y,r,k){return CC(x,y,r,B(k))};
 var CD=function(x,y,r,k){return CC(x,y,r,D(k))};
 var OC=function(x,y,r,c,w){return '<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="none" stroke="'+c+'" stroke-width="'+(w||2.2)+'"/>'};
 var S =function(d,c,w,x){return '<path d="'+d+'" fill="none" stroke="'+c+'" stroke-width="'+(w||2.6)+'" stroke-linecap="round" stroke-linejoin="round"'+(x||'')+'/>'};
 var PG=function(pts,c){return '<polygon points="'+pts+'" fill="'+c+'"/>'};
 var TX=function(t,x,y,sz,c){return '<text x="'+x+'" y="'+y+'" text-anchor="middle" font-family="Cairo,system-ui,sans-serif" font-weight="900" font-size="'+sz+'" fill="'+c+'" direction="ltr">'+t+'</text>'};
 var star=function(cx,cy,R0,r0,n){n=n||5;var p=[],i,a,q;for(i=0;i<n*2;i++){a=-Math.PI/2+i*Math.PI/n;q=i%2?r0:R0;p.push((cx+Math.cos(a)*q).toFixed(2)+','+(cy+Math.sin(a)*q).toFixed(2))}return p.join(' ')};
 var poly=function(cx,cy,r,n,rot){var p=[],i,a;for(i=0;i<n;i++){a=-Math.PI/2+(rot||0)+i*2*Math.PI/n;p.push((cx+Math.cos(a)*r).toFixed(2)+','+(cy+Math.sin(a)*r).toFixed(2))}return p.join(' ')};
 var cog=function(cx,cy,ro,ri,n){
  var p=[],i,a,s=Math.PI/n*0.58,e=Math.PI/n*0.30,push=function(ang,rad){p.push((cx+Math.cos(ang)*rad).toFixed(2)+' '+(cy+Math.sin(ang)*rad).toFixed(2))};
  for(i=0;i<n;i++){a=i*2*Math.PI/n;push(a-s,ro);push(a+s,ro);push(a+s+e,ri);push(a+2*Math.PI/n-s-e,ri)}
  return 'M'+p.join(' L')+' Z';
 };
 var I={};

 /* ── عملات وموارد ── */
 I.coin=CI(12,12,9.5,'gold')+OC(12,12,6.6,D('gold'),1.5)+PG(star(12,12,4.2,1.9),D('gold'));
 I.gem=PG('12,2.6 20.4,8 20.4,16 12,21.4 3.6,16 3.6,8',B('purple'))+PG('12,2.6 20.4,8 20.4,16 12,21.4',D('purple'));
 I.shard=PG('12,2.2 16.8,9 14.8,21.8 9.2,21.8 7.2,9',B('teal'))+PG('12,2.2 16.8,9 14.8,21.8 12,21.8',D('teal'));
 I.energy=P('M13.6 1.8 L5.2 13.4 H10.9 L9.4 22.2 L18.8 9.6 H13.1 Z','orange')+PD('M9.4 22.2 L18.8 9.6 H13.1 Z','orange');
 var HEART='M12 20.9 C6.1 16 2.6 12.8 2.6 8.7 C2.6 5.9 4.8 3.9 7.4 3.9 C9.4 3.9 11.1 5.1 12 6.6 C12.9 5.1 14.6 3.9 16.6 3.9 C19.2 3.9 21.4 5.9 21.4 8.7 C21.4 12.8 17.9 16 12 20.9 Z';
 var HEART_R='M12 6.6 C12.9 5.1 14.6 3.9 16.6 3.9 C19.2 3.9 21.4 5.9 21.4 8.7 C21.4 12.8 17.9 16 12 20.9 Z';
 I.heart=PC(HEART,B('red'))+PC(HEART_R,D('red'));
 I.broken=PC(HEART,B('steel'))+PC(HEART_R,D('steel'))+S('M12.4 6.2 L10.3 10.7 L13.5 13.1 L10.9 16.8 L12.7 20.5',INK,1.7);
 I.star=PG(star(12,12.3,10.2,4.5),B('gold'));
 I.starOut='<polygon points="'+star(12,12.3,9.5,4.2)+'" fill="none" stroke="'+B('gold')+'" stroke-width="2.2" stroke-linejoin="round"/>';
 I.sparkle=P('M12 1.6 L14.3 9.7 L22.4 12 L14.3 14.3 L12 22.4 L9.7 14.3 L1.6 12 L9.7 9.7 Z','white')+PC('M12 1.6 L14.3 9.7 L22.4 12 L14.3 14.3 L12 22.4 Z',D('white'));

 /* ── إنجاز ── */
 I.trophy=P('M7.2 2.8 H16.8 V9.6 C16.8 12.9 14.7 15.1 12 15.1 C9.3 15.1 7.2 12.9 7.2 9.6 Z','gold')+
  PD('M12 2.8 H16.8 V9.6 C16.8 12.9 14.7 15.1 12 15.1 Z','gold')+
  S('M7.2 4.6 H3.4 V6.4 C3.4 9.3 5.2 11 7.6 11.3',B('gold'),1.9)+
  S('M16.8 4.6 H20.6 V6.4 C20.6 9.3 18.8 11 16.4 11.3',D('gold'),1.9)+
  R(10.5,14.8,3,2.8,0,'gold')+RD(6.8,17.4,10.4,3.6,1.3,'gold');
 I.medal=PC('M8.6 2 H12 L9.8 10.6 H6.4 Z',B('red'))+PC('M15.4 2 H12 L14.2 10.6 H17.6 Z',D('red'))+
  CI(12,15.4,6.9,'gold')+OC(12,15.4,4.7,D('gold'),1.3)+PG(star(12,15.5,2.9,1.3),D('gold'));
 I.crown=P('M3 18 L3.8 6.8 L8.4 11.6 L12 4.2 L15.6 11.6 L20.2 6.8 L21 18 Z','gold')+
  PD('M12 4.2 L15.6 11.6 L20.2 6.8 L21 18 H12 Z','gold')+R(3,18,18,3.2,1.1,'gold');
 I.ticket=P('M3 6 H21 V9.4 A2.6 2.6 0 0 0 21 14.6 V18 H3 V14.6 A2.6 2.6 0 0 0 3 9.4 Z','gold')+
  S('M8.4 8 V16',D('gold'),1.4,' stroke-dasharray="1.5 1.6"')+PG(star(14.6,12,3.2,1.45),D('gold'));
 I.chest=PC('M3 11 C3 6.8 5.6 4.3 12 4.3 C18.4 4.3 21 6.8 21 11 Z',D('wood'))+R(3,11,18,9.6,1.4,'wood')+
  RC(2.4,9.9,19.2,2.4,0.7,B('gold'))+RC(10.2,11.5,3.6,4.2,1,B('gold'))+CC(12,13.6,0.85,D('gold'));
 I.gift=R(3.6,10.4,16.8,10.2,1.5,'red')+RD(3,6.6,18,4,1.1,'red')+RC(10.3,6.6,3.4,14,0,B('gold'))+
  PC('M12 6.8 C9.3 6.8 6.7 5.7 7.5 3.9 C8.3 2.6 10.8 3.5 12 6.8 C13.2 3.5 15.7 2.6 16.5 3.9 C17.3 5.7 14.7 6.8 12 6.8 Z',B('gold'));
 I.shop=RC(4.2,10.8,15.6,9.8,1.2,B('paper'))+PC('M3 10.8 L4.9 4.4 H19.1 L21 10.8 Z',B('red'))+
  PC('M12 4.4 H19.1 L21 10.8 H12 Z',D('red'))+RC(9.9,13.6,4.2,7,0.9,D('paper'));

 /* ── بطاقات ── */
 var cd=function(x,y,w,h,rot,c){return RC(x,y,w,h,1.7,c,'rotate('+rot+' '+(x+w/2)+' '+(y+h/2)+')')};
 I.cards=cd(3.8,5.4,8.6,13,-17,D('blue'))+cd(7.7,4.8,8.6,13,-4,B('blue'))+cd(11.6,5.4,8.6,13,11,B('white'))+
  '<path d="M15.7 9.6 c-.9-1 -2.5-.4 -2.5 .9 c0 1.2 2.5 3 2.5 3 s2.5-1.8 2.5-3 c0-1.3 -1.6-1.9 -2.5-.9 Z" fill="'+B('red')+'" transform="rotate(11 15.7 11.2)"/>';
 I.deck=cd(3.2,6.4,12.8,14.4,0,D('blue'))+cd(5.4,4.6,12.8,14.4,0,B('blue'))+cd(7.6,2.8,12.8,14.4,0,B('white'))+OC(14,10,3.1,B('blue'),1.7);
 I.wild=RC(5,3,14,18,1.9,'#222A42')+'<rect x="5" y="3" width="14" height="18" rx="1.9" fill="none" stroke="'+B('white')+'" stroke-width="1.3"/>'+
  PC('M12 6.6 A5.4 5.4 0 0 1 17.4 12 H12 Z',B('orange'))+PC('M12 12 H17.4 A5.4 5.4 0 0 1 12 17.4 Z',B('green'))+
  PC('M12 12 V17.4 A5.4 5.4 0 0 1 6.6 12 Z',B('blue'))+PC('M12 12 V6.6 A5.4 5.4 0 0 0 6.6 12 Z',B('red'));
 I.album=R(3.4,4,17.2,16,1.9,'wood')+RC(5.8,6.4,12.4,9.2,0.9,B('white'))+CC(9,9.6,1.4,B('orange'))+
  PC('M6.4 15.6 L10.4 11.4 L13 14 L15.2 12 L18.2 15.6 Z',B('green'))+RD(5.8,16.9,7.6,1.5,0.75,'wood');

 /* ── مواضع وخرائط ── */
 I.map=PC('M3 5.4 L9 3.4 L15 5.4 L21 3.4 V18.6 L15 20.6 L9 18.6 L3 20.6 Z',B('paper'))+
  PC('M9 3.4 L15 5.4 V20.6 L9 18.6 Z',D('paper'))+
  S('M6 15.6 C8.4 11.2 10.2 14 12 10.6 C13.4 8.1 16 9.4 18.4 7.2',B('red'),1.6,' stroke-dasharray="2 1.7"')+CC(18.4,7.2,1.7,B('red'));
 I.globe=CI(12,12,9.5,'blue')+
  PC('M7.2 6.4 C9.1 7.7 8.5 9.9 10.4 10.7 C12.5 11.5 11.2 14 13.3 14.8 C15 15.4 14.6 17.6 13.1 18.8 C10.3 18 6.8 15.5 5.5 11.8 C5.5 9.6 6 7.8 7.2 6.4 Z',B('green'))+
  PC('M15.4 4.4 C17.4 5.4 19 7.4 19.6 9.8 C18.2 10.4 16.4 9.6 16 8 C15.6 6.6 14.6 5.6 15.4 4.4 Z',B('green'))+
  S('M2.9 12 H21.1',D('blue'),1.3);
 I.web=S('M12 4.6 L19 9.2 L16.4 17.4 H7.6 L5 9.2 Z',D('blue'),1.7)+
  CI(12,4.6,2.5,'blue')+CI(19,9.2,2.5,'blue')+CI(16.4,17.4,2.5,'blue')+CI(7.6,17.4,2.5,'blue')+CI(5,9.2,2.5,'blue')+CI(12,11.7,3.1,'gold');
 I.target=CI(12,12,9.6,'white')+CC(12,12,7.1,B('red'))+CC(12,12,4.6,B('white'))+CC(12,12,2.2,B('red'));
 I.flag=PC('M6.6 3.4 H19.4 L16.8 7.9 L19.4 12.4 H6.6 Z',B('red'))+PC('M12 3.4 H19.4 L16.8 7.9 L19.4 12.4 H12 Z',D('red'))+
  RC(4.6,2.4,2,19,0.9,B('gold'));
 I.door=PC('M5 21 V5.2 A2.2 2.2 0 0 1 7.2 3 H16.8 A2.2 2.2 0 0 1 19 5.2 V21 Z',B('wood'))+
  PC('M12 3 H16.8 A2.2 2.2 0 0 1 19 5.2 V21 H12 Z',D('wood'))+
  CC(14.9,12.6,1.25,B('gold'))+RC(3.4,20.1,17.2,1.9,0.8,B('steel'));
 I.pillar=PC('M6.2 5.8 H17.8 V8.4 H16.1 V18 H17.8 V21 H6.2 V18 H7.9 V8.4 H6.2 Z',B('white'))+
  PC('M12 5.8 H17.8 V8.4 H16.1 V18 H17.8 V21 H12 Z',D('white'))+RC(4.9,3.2,14.2,2.6,0.8,B('gold'));
 I.mosque=PC('M4 21 V13.2 C4 9.2 7.5 7 12 7 C16.5 7 20 9.2 20 13.2 V21 Z',B('teal'))+
  PC('M12 7 C16.5 7 20 9.2 20 13.2 V21 H12 Z',D('teal'))+
  RC(2.4,19.6,19.2,2,0.7,B('gold'))+PC('M10.4 21 V16.2 A1.6 1.6 0 0 1 13.6 16.2 V21 Z',B('gold'))+
  S('M12 3.4 V7',B('gold'),1.5)+CC(12,2.9,1.15,B('gold'))+
  RD(1.2,9.6,2.4,11.6,1,'teal')+RD(20.4,9.6,2.4,11.6,1,'teal')+
  CC(2.4,8.6,1.5,B('gold'))+CC(21.6,8.6,1.5,B('gold'));

 /* ── أشخاص ── */
 I.user=CI(12,8.2,4.3,'gold')+PC('M3.6 21.4 C3.6 16.3 7.4 14.1 12 14.1 C16.6 14.1 20.4 16.3 20.4 21.4 Z',D('gold'));
 var per=function(x,y,s,c){return CC(x,y-s*1.02,s*0.66,c)+
  '<path d="M'+(x-s*1.2)+' '+(y+s*1.2)+' C'+(x-s*1.2)+' '+(y-s*0.28)+' '+(x+s*1.2)+' '+(y-s*0.28)+' '+(x+s*1.2)+' '+(y+s*1.2)+' Z" fill="'+c+'"/>'};
 I.group=per(5.4,14.6,2.9,D('blue'))+per(18.6,14.6,2.9,D('green'))+per(12,15.4,3.9,B('gold'));
 I.robot=R(4.4,6.8,15.2,12.8,3.6,'steel')+RC(7.1,10.4,9.8,5.2,1.7,'#111726')+
  RC(8.7,11.8,2.1,2.4,1,B('blue'))+RC(13.2,11.8,2.1,2.4,1,B('blue'))+
  RD(11.1,2.4,1.8,4.6,0.9,'steel')+CC(12,2.4,1.45,B('blue'))+
  RD(2.1,10.2,2.2,4.8,1,'steel')+RD(19.7,10.2,2.2,4.8,1,'steel');

 /* ── علامات ووظائف: رموز عارية بسماكة واحدة ── */
 I.check=S('M4.8 12.6 L9.6 17.4 L19.2 6.8',B('gold'),3);
 I.cross=S('M6.6 6.6 L17.4 17.4 M17.4 6.6 L6.6 17.4',B('red'),3);
 I.info=OC(12,12,9.2,B('gold'),2)+CC(12,7.5,1.4,B('gold'))+RC(10.7,10.4,2.6,7.1,1.3,B('gold'));
 I.plus=S('M12 5.2 V18.8 M5.2 12 H18.8',B('gold'),3);
 I.up=S('M12 19.2 V6.2 M6 12.2 L12 6.2 L18 12.2',B('gold'),2.8);
 I.down=S('M12 4.8 V17.8 M6 11.8 L12 17.8 L18 11.8',B('gold'),2.8);
 I.back=S('M19 12 H5.4 M11.4 5.6 L5 12 L11.4 18.4',B('gold'),2.8);
 I.next=S('M5 12 H18.6 M12.6 5.6 L19 12 L12.6 18.4',B('gold'),2.8);
 I.export=S('M12 15.2 V4.4 M7.6 8.8 L12 4.4 L16.4 8.8',B('gold'),2.6)+S('M4.8 14.4 V19.2 H19.2 V14.4',B('gold'),2.6);
 I.reset=S('M12 3.8 A8.2 8.2 0 1 1 4.9 7.9',B('gold'),2.7)+PG('12,1.1 12,6.5 15.8,3.8',B('gold'));
 I.play=PG('8.4,5.2 19.4,12 8.4,18.8',B('gold'));
 I.pause=R(7.2,5.2,3.7,13.6,1.5,'gold')+R(13.1,5.2,3.7,13.6,1.5,'gold');
 I.menu=S('M4.6 7.2 H19.4 M4.6 12 H19.4 M4.6 16.8 H19.4',B('gold'),2.6);
 I.list=CC(18.6,7.2,1.5,B('gold'))+CC(18.6,12,1.5,B('gold'))+CC(18.6,16.8,1.5,B('gold'))+
  S('M4.8 7.2 H14.6 M4.8 12 H14.6 M4.8 16.8 H14.6',B('blue'),2.2);
 I.x2=TX('×2',12,16.6,12.4,B('purple'));
 I.counter=R(2.6,6.4,18.8,11,2.3,'steel')+RC(4.4,8.2,15.2,7.4,1.4,'#0F1523')+TX('003',12,14.6,6.6,B('gold'));

 /* ── أدوات وحالات ── */
 I.timer=PC('M6 2.8 H18 V5.4 C18 8.4 15.2 9.9 13.2 12 C15.2 14.1 18 15.6 18 18.6 V21.2 H6 V18.6 C6 15.6 8.8 14.1 10.8 12 C8.8 9.9 6 8.4 6 5.4 Z',B('gold'))+
  PC('M8.4 5.6 H15.6 C15.6 7.7 13.7 9.2 12 10.8 C10.3 9.2 8.4 7.7 8.4 5.6 Z',D('gold'))+
  PC('M9.2 19.2 H14.8 C14.8 17.4 13.3 16.2 12 15.1 C10.7 16.2 9.2 17.4 9.2 19.2 Z',D('gold'));
 I.lock=S('M7.6 10.6 V8.2 A4.4 4.4 0 0 1 16.4 8.2 V10.6',D('steel'),2.6)+
  R(4.4,10.3,15.2,10.9,2.5,'gold')+CC(12,14.5,1.85,D('gold'))+RC(11.2,15.1,1.6,3.3,0.8,D('gold'));
 I.shield=PC('M12 2.3 L20.6 5.4 V11.6 C20.6 16.8 17 20.4 12 22.2 C7 20.4 3.4 16.8 3.4 11.6 V5.4 Z',B('gold'))+
  PC('M12 2.3 L20.6 5.4 V11.6 C20.6 16.8 17 20.4 12 22.2 Z',D('gold'))+PG(star(12,11.8,3.9,1.75),'#121828');
 I.flame=PC('M12.4 1.8 C13.6 5.9 17.6 8.6 17.6 13.4 C17.6 17.6 15 21.3 12 21.3 C9 21.3 6.4 17.6 6.4 13.4 C6.4 10.4 8 9 8.8 7.3 C9.7 9.6 10.6 10 11.2 9.5 C11.6 7.6 11.3 4.7 12.4 1.8 Z',B('orange'))+
  PC('M12 11.3 C13.4 13.4 15 14.4 15 16.7 C15 18.9 13.6 20.4 12 20.4 C10.4 20.4 9 18.9 9 16.7 C9 14.8 10.6 13.9 11.2 12.6 C11.6 13.5 12 13.2 12 11.3 Z',B('gold'));
 I.bulb=PC('M12 2.4 C8.1 2.4 5.6 5.4 5.6 8.9 C5.6 11.7 7.5 12.9 8.5 15.2 H15.5 C16.5 12.9 18.4 11.7 18.4 8.9 C18.4 5.4 15.9 2.4 12 2.4 Z',B('gold'))+
  PC('M12 2.4 C15.9 2.4 18.4 5.4 18.4 8.9 C18.4 11.7 16.5 12.9 15.5 15.2 H12 Z',D('gold'))+
  R(8.6,15.4,6.8,2.5,1,'steel')+RD(9.5,18.3,5,2.2,1,'steel');
 I.gear=PC(cog(12,12,10,7.2,8),B('steel'))+CC(12,12,3.7,'#111726')+CC(12,12,2.1,B('gold'));
 I.search=OC(10.6,10.6,6.6,B('gold'),2.6)+S('M15.4 15.4 L20.4 20.4',B('gold'),3);
 I.save=R(3.4,3.4,17.2,17.2,2.5,'blue')+RC(7.2,3.8,9.6,5.9,0.9,B('white'))+RD(13.2,4.6,1.8,4.1,0.5,'blue')+RD(6.6,12.6,10.8,8,1,'blue');
 I.trash=R(6,7.2,12,13.8,1.9,'steel')+RD(4.4,4.7,15.2,2.6,1.1,'steel')+RD(9.6,2.6,4.8,2.3,1,'steel')+
  S('M9.6 10.4 V17.8 M12 10.4 V17.8 M14.4 10.4 V17.8','#111726',1.5);
 I.scissors=S('M9.4 14.4 L18.2 3.4 M14.6 14.4 L5.8 3.4',B('steel'),2.6)+
  OC(7.4,17.6,3.1,B('red'),2.2)+OC(16.6,17.6,3.1,B('red'),2.2)+CC(12,11.4,1.25,B('gold'));
 I.hammer=S('M5.4 20 L13.6 11.8',B('wood'),3.4)+RC(12.4,4.2,9.2,5.6,1.4,B('steel'),'rotate(45 17 7)')+
  RC(11.5,3.6,3.2,6.8,1.1,D('steel'),'rotate(45 13.1 7)')+RD(2.6,18.9,10,2.5,1,'wood');
 I.scale=RC(11,3.4,2,15.8,0.8,B('gold'))+RC(6,19,12,2.6,1,B('gold'))+S('M4.1 6.6 H19.9',B('gold'),1.8)+
  S('M4.1 6.6 V12.4 M19.9 6.6 V12.4',D('gold'),1.1)+
  PC('M0.9 12.2 A3.2 3.2 0 0 1 7.3 12.2 Z',D('gold'))+PC('M16.7 12.2 A3.2 3.2 0 0 1 23.1 12.2 Z',D('gold'))+CC(12,6.6,1.6,B('gold'));
 I.swords=S('M4.8 4 L16.4 15.6',B('steel'),2.9)+S('M19.2 4 L7.6 15.6',D('steel'),2.9)+
  S('M14.6 13.8 L17.4 16.6',B('gold'),2.4)+S('M9.4 13.8 L6.6 16.6',B('gold'),2.4)+
  S('M17.4 16.6 L19.9 19.1',B('wood'),2.9)+S('M6.6 16.6 L4.1 19.1',B('wood'),2.9);
 I.bell=PC('M12 3.2 C8.2 3.2 6.1 6.1 6.1 9.9 V14.2 L4.2 17.2 H19.8 L17.9 14.2 V9.9 C17.9 6.1 15.8 3.2 12 3.2 Z',B('gold'))+
  PC('M12 3.2 C15.8 3.2 17.9 6.1 17.9 9.9 V14.2 L19.8 17.2 H12 Z',D('gold'))+
  PC('M9.4 18.4 A2.6 2.6 0 0 0 14.6 18.4 Z',B('gold'))+RC(11.2,1.3,1.6,2.1,0.7,B('gold'));
 var SPK='M4 9.4 H7.6 L12.2 5.2 V18.8 L7.6 14.6 H4 Z';
 I.sound=PC(SPK,B('steel'))+S('M15.2 9 A4.6 4.6 0 0 1 15.2 15',B('gold'),2.1)+S('M18.1 6.4 A8.2 8.2 0 0 1 18.1 17.6',B('gold'),2.1);
 I.mute=PC(SPK,B('steel'))+S('M15.4 9.6 L20.4 14.6 M20.4 9.6 L15.4 14.6',B('red'),2.4);
 I.scroll=R(3,6.2,18,11.6,1.2,'paper')+RD(2.2,4.3,19.6,2.7,1.35,'paper')+RD(2.2,17,19.6,2.7,1.35,'paper')+
  S('M6.4 9.6 H17.6 M6.4 12 H17.6 M6.4 14.4 H13.8',D('paper'),1.5);
 I.book=R(3.6,3,16.8,18,1.9,'red')+RD(16.4,3,4,18,1.9,'red')+RC(5.8,6,9.4,12,0.9,B('paper'))+PG(star(10.5,12,3.1,1.4),B('red'));
 I.cap=PC('M6.8 10.9 V15.9 C6.8 18 9.1 19.5 12 19.5 C14.9 19.5 17.2 18 17.2 15.9 V10.9 L12 13.5 Z',D('navy'))+
  PC('M12 3.9 L22.4 9.1 L12 14.3 L1.6 9.1 Z',B('blue'))+PC('M12 3.9 L22.4 9.1 L12 14.3 Z',D('blue'))+
  S('M20.2 10 V15.4',B('gold'),1.6)+CC(20.2,16.6,1.6,B('gold'));
 I.dice=R(3.4,3.4,17.2,17.2,3.7,'white')+CC(8,8,1.7,'#111726')+CC(16,8,1.7,'#111726')+CC(12,12,1.7,B('red'))+CC(8,16,1.7,'#111726')+CC(16,16,1.7,'#111726');
 I.ball=(function(){
  var o=CI(12,12,9.5,'white'),i,a,x,y;
  for(i=0;i<5;i++){a=-Math.PI/2+i*2*Math.PI/5;x=12+Math.cos(a)*7.1;y=12+Math.sin(a)*7.1;
   o+=PG(poly(x,y,2.5,5,a+Math.PI/2),'#131A29')}
  o+=PG(poly(12,12,3.7,5,0),'#131A29');return o;
 })();
 I.orb=CI(12,12,9.5,'purple')+PC('M12 2.5 A9.5 9.5 0 0 1 12 21.5 A6.7 9.5 0 0 0 12 2.5 Z',D('purple'))+
  PC('M8.4 5.4 L9.3 8.1 L12 9 L9.3 9.9 L8.4 12.6 L7.5 9.9 L4.8 9 L7.5 8.1 Z',B('white'));
 I.puzzle='<mask id="icoPz"><rect x="0" y="0" width="24" height="24" fill="#fff"/>'+CC(4.4,12,2.8,'#000')+CC(12,19.6,2.8,'#000')+'</mask>'+
  '<g mask="url(#icoPz)">'+R(4.4,4.4,15.2,15.2,2.2,'purple')+CC(12,4.4,2.8,B('purple'))+CC(19.6,12,2.8,B('purple'))+
  PD('M12 4.4 H19.6 V19.6 H12 Z','purple')+CD(19.6,12,2.8,'purple')+'</g>';
 I.paw=CI(12,15.6,5.2,'wood')+CD(5.6,10.6,2.5,'wood')+CD(9.2,6.2,2.5,'wood')+CD(14.8,6.2,2.5,'wood')+CD(18.4,10.6,2.5,'wood');
 I.flask=PC('M9.6 2.8 H14.4 V9.6 L20.1 18.7 A1.9 1.9 0 0 1 18.5 21.4 H5.5 A1.9 1.9 0 0 1 3.9 18.7 Z',B('white'))+
  PC('M7.2 15 H16.8 L19.5 19.3 A1.1 1.1 0 0 1 18.5 21.4 H5.5 A1.1 1.1 0 0 1 4.5 19.3 Z',B('teal'))+
  RC(8.5,2,7,1.9,0.9,D('steel'))+CC(10.2,18.2,0.9,D('teal'))+CC(14.1,19.2,0.7,D('teal'));
 I.palette=PC('M12 2.9 C6.4 2.9 2.6 6.9 2.6 11.6 C2.6 16.3 6.2 19.1 9.4 19.1 C10.8 19.1 11.4 18.3 11.4 17.2 C11.4 15.8 10.6 15.4 10.6 14.4 C10.6 13.4 11.4 12.6 12.6 12.6 H15.2 C18.7 12.6 21.4 10.4 21.4 7.8 C21.4 5 17.6 2.9 12 2.9 Z',B('paper'))+
  CC(7,9.4,1.75,B('red'))+CC(10.6,6.4,1.75,B('orange'))+CC(15.6,6.2,1.75,B('green'))+CC(18.6,9,1.75,B('blue'));
 I.chart=RD(3,18.8,18,2.3,0.9,'steel')+R(4.6,11.8,4,7,1,'blue')+R(10,6.8,4,12,1,'gold')+R(15.4,3.4,4,15.4,1,'green');

 var names=Object.keys(I);
 var GR={};Object.keys(PAL).forEach(function(k){GR[k]=[PAL[k][0],PAL[k][0],PAL[k][1]]});
 return {get:function(n){return I[n]||null},defs:defs,names:names,PAL:PAL,GR:GR};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=ICO2;
