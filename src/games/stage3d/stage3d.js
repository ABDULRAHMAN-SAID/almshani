/* ═══ المجلس المجسّم (5.52): غرفة وشخصيات ثلاثية الأبعاد لمسرح مافيا/برا السالفة ضد الكمبيوتر — WebGL عبر Three.js.
   يُركَّب داخل #vbStage تحت طبقة المقاعد: الأسماء والشارات والبطاقات تبقى عناصر DOM وتُسقَط من مواضع الرؤوس في المشهد،
   والضغط على الشخصية نفسها يعمل كالضغط على مقعدها. إن غاب WebGL (أو في الاختبارات السريعة) يبقى المشهد المرسوم ثنائيّ الأبعاد. ═══ */
const VB3={on:false,tex:{}};
const VB3_FEMALE=new Set(['نورة','أثير','لين','دانة','جود','ليان']);
const VB3_COL={thobe:['#F6F2E8','#EDE4D0','#E9EAEE','#DDD6C6'],shayla:['#26365F','#1F5B5B','#4B2A5C','#6E1F2E','#2E4A3B'],cushion:['#1F5B3C','#1E2F63','#7A2230','#5A3A14','#2B4C6E']};
/** هل يُتاح المشهد المجسّم؟ لا في الاختبارات السريعة إلا بطلب صريح (__vb3d) ولا عند تعطيله (__vbNo3d) */
function vb3dOk(){return typeof THREE!=='undefined'&&!window.__vbNo3d&&!(window.__vbFast&&!window.__vb3d)}
/** مخزن الأشكال: الشكل نفسه (نوعه ومقاساته) يُبنى مرّة ويُشارَك — كان بناء المجلس يستغرق ثوانيَ ويحجز الشاشة */
const VB3_GEO={};
function vb3dG(kind,...a){const k=kind+'|'+a.join(',');let g=VB3_GEO[k];if(!g){g=new THREE[kind+'Geometry'](...a);g.userData.shared=1;VB3_GEO[k]=g}return g}
function vb3dMat(col,o){o=o||{};
 const phys=o.sheen!=null||o.clear!=null||o.spec!=null;
 const m=phys?new THREE.MeshPhysicalMaterial({color:new THREE.Color(col),roughness:o.rough!=null?o.rough:.85,metalness:o.metal||0,
   sheen:o.sheen||0,sheenRoughness:o.sheenR!=null?o.sheenR:.6,sheenColor:new THREE.Color(o.sheenC||'#FFFFFF'),
   clearcoat:o.clear||0,clearcoatRoughness:o.clearR!=null?o.clearR:.2,specularIntensity:o.spec!=null?o.spec:1})
  :new THREE.MeshStandardMaterial({color:new THREE.Color(col),roughness:o.rough!=null?o.rough:.85,metalness:o.metal||0});
 if(o.bump){m.bumpMap=o.bump;m.bumpScale=o.bumpS!=null?o.bumpS:.3}
if(o.map)m.map=o.map;if(o.emis){m.emissive=new THREE.Color(o.emis);m.emissiveIntensity=o.ei!=null?o.ei:1}
 if(o.tr){m.transparent=true;m.opacity=o.op!=null?o.op:1}if(o.side)m.side=o.side;if(o.at)m.alphaTest=o.at;return m}
function vb3dMesh(geo,mat,x,y,z,o){const m=new THREE.Mesh(geo,mat);m.position.set(x||0,y||0,z||0);m.castShadow=!(o&&o.noCast);m.receiveShadow=!!(o&&o.recv);
 if(o&&o.rot)m.rotation.set(o.rot[0],o.rot[1],o.rot[2]);if(o&&o.sc)m.scale.set(o.sc[0],o.sc[1],o.sc[2]);return m}
/** كبسولة بين نقطتين (طرف/ساق/سلسلة) */
function vb3dLimb(a,b,r,mat){const len=Math.max(.01,a.distanceTo(b)-r*1.2);const m=new THREE.Mesh(new THREE.CapsuleGeometry(r,len,4,10),mat);m.castShadow=true;m.userData.len=len;vb3dAim(m,a,b);return m}
function vb3dAim(m,a,b){m.position.copy(a).add(b).multiplyScalar(.5);const d=new THREE.Vector3().subVectors(b,a).normalize();m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d)}
/* ── قوام: نسيج من قماش الكانفس (لا صور خارجية) ── */
function vb3dTex(key,w,h,draw,rep,linear){
 if(VB3.tex[key])return VB3.tex[key];
 const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');draw(g,w,h);
 const t=new THREE.CanvasTexture(c);if(!linear)t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;
 if(rep){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rep[0],rep[1])}
 VB3.tex[key]=t;return t;
}
function vb3dNoise(g,w,h,n,a){g.globalAlpha=a;for(let i=0;i<n;i++){g.fillStyle=Math.random()<.5?'#000':'#fff';g.fillRect(Math.random()*w,Math.random()*h,2,1)}g.globalAlpha=1}
function vb3dTexCarpet(){return vb3dTex('carpet',1024,1024,(g,w,h)=>{
 g.fillStyle='#6E1F27';g.fillRect(0,0,w,h);
 g.strokeStyle='rgba(255,220,150,.15)';g.lineWidth=2;
 for(let y=0;y<h;y+=64)for(let x=0;x<w;x+=64){g.beginPath();g.moveTo(x+32,y+6);g.lineTo(x+58,y+32);g.lineTo(x+32,y+58);g.lineTo(x+6,y+32);g.closePath();g.stroke();g.fillStyle='rgba(255,220,150,.09)';g.beginPath();g.arc(x+32,y+32,5,0,7);g.fill()}
 const band=(ins,wd,col)=>{g.lineWidth=wd;g.strokeStyle=col;g.strokeRect(ins,ins,w-2*ins,h-2*ins)};
 band(30,14,'#E8C77A');band(60,34,'#3B1117');band(92,6,'#E8C77A');band(110,3,'rgba(232,199,122,.5)');
 g.fillStyle='#E8C77A';for(let i=0;i<w;i+=48){[[i+24,60],[i+24,h-60],[60,i+24],[w-60,i+24]].forEach(([x,y])=>{g.beginPath();g.moveTo(x,y-9);g.lineTo(x+9,y);g.lineTo(x,y+9);g.lineTo(x-9,y);g.closePath();g.fill()})}
 g.save();g.translate(w/2,h/2);g.strokeStyle='#E8C77A';g.lineWidth=5;g.beginPath();g.ellipse(0,0,250,250,0,0,7);g.stroke();g.fillStyle='#8A2A33';g.beginPath();g.ellipse(0,0,240,240,0,0,7);g.fill();
 g.fillStyle='rgba(232,199,122,.9)';for(let k=0;k<16;k++){const a=k/16*Math.PI*2;g.beginPath();g.moveTo(Math.cos(a)*160,Math.sin(a)*160);g.lineTo(Math.cos(a+.2)*225,Math.sin(a+.2)*225);g.lineTo(Math.cos(a+.39)*160,Math.sin(a+.39)*160);g.closePath();g.fill()}
 g.fillStyle='#3B1117';g.beginPath();g.ellipse(0,0,130,130,0,0,7);g.fill();g.strokeStyle='#E8C77A';g.lineWidth=3;g.stroke();
 g.fillStyle='#E8C77A';g.beginPath();g.moveTo(0,-60);g.lineTo(48,0);g.lineTo(0,60);g.lineTo(-48,0);g.closePath();g.fill();g.restore();
 vb3dNoise(g,w,h,5000,.07)})}
function vb3dTexSadu(){return vb3dTex('sadu',128,128,(g,w,h)=>{
 g.fillStyle='#7A2230';g.fillRect(0,0,w,h);
 const rows=[['#141414',10,8],['#F1E2BC',22,4],['#1F5B3C',30,10],['#F1E2BC',44,3],['#141414',52,8],['#C9921E',66,5],['#141414',76,8],['#F1E2BC',88,4],['#1F5B3C',96,10],['#F1E2BC',110,3]];
 rows.forEach(([c,y,hh])=>{g.fillStyle=c;g.fillRect(0,y,w,hh)});
 g.strokeStyle='#F1E2BC';g.lineWidth=2;g.beginPath();for(let x=0;x<=w;x+=8)g.lineTo(x,(x/8)%2?116:122);g.stroke();
 g.beginPath();for(let x=0;x<=w;x+=8)g.lineTo(x,(x/8)%2?34:40);g.stroke()},[3,1])}
function vb3dTexWood(){return vb3dTex('wood',256,256,(g,w,h)=>{
 g.fillStyle='#5A3418';g.fillRect(0,0,w,h);
 for(let i=0;i<60;i++){g.strokeStyle=`rgba(${20+Math.random()*30},${10+Math.random()*14},${4},${.25+Math.random()*.3})`;g.lineWidth=1+Math.random()*2;g.beginPath();const y=Math.random()*h;g.moveTo(0,y);for(let x=0;x<=w;x+=32)g.lineTo(x,y+Math.sin(x/40+i)*4);g.stroke()}
 g.strokeStyle='rgba(255,200,140,.12)';g.lineWidth=1;for(let i=0;i<30;i++){const y=Math.random()*h;g.beginPath();g.moveTo(0,y);g.lineTo(w,y+Math.random()*6-3);g.stroke()}},[2,2])}
function vb3dTexPlaster(){return vb3dTex('plaster',512,512,(g,w,h)=>{
 g.fillStyle='#E4D3B1';g.fillRect(0,0,w,h);vb3dNoise(g,w,h,9000,.06);
 g.strokeStyle='rgba(120,80,40,.10)';g.lineWidth=1.2;for(let y=0;y<h;y+=32){g.beginPath();g.moveTo(0,y);g.lineTo(w,y);g.stroke()}
 g.strokeStyle='rgba(255,255,255,.35)';g.lineWidth=1;for(let y=1;y<h;y+=32){g.beginPath();g.moveTo(0,y);g.lineTo(w,y);g.stroke()}},[3,1.5])}
function vb3dTexLattice(){return vb3dTex('lattice',256,256,(g,w,h)=>{
 g.clearRect(0,0,w,h);g.strokeStyle='#2A170A';g.lineWidth=11;g.lineCap='round';
 for(let k=-h;k<w+h;k+=32){g.beginPath();g.moveTo(k,0);g.lineTo(k+h,h);g.stroke();g.beginPath();g.moveTo(k+h,0);g.lineTo(k,h);g.stroke()}
 g.strokeStyle='#C08A3E';g.lineWidth=2;for(let k=-h;k<w+h;k+=32){g.beginPath();g.moveTo(k,0);g.lineTo(k+h,h);g.stroke();g.beginPath();g.moveTo(k+h,0);g.lineTo(k,h);g.stroke()}},[1.4,2.2])}
function vb3dTexSky(kind){return vb3dTex('sky_'+kind,64,512,(g,w,h)=>{
 const gr=g.createLinearGradient(0,0,0,h);
 if(kind==='dusk'){gr.addColorStop(0,'#1B2A66');gr.addColorStop(.45,'#5C3F8A');gr.addColorStop(.7,'#C96A55');gr.addColorStop(1,'#F2B76A')}
 else if(kind==='warm'){gr.addColorStop(0,'#3D2A6B');gr.addColorStop(.5,'#B25C58');gr.addColorStop(1,'#F0B36A')}
 else{gr.addColorStop(0,'#03050F');gr.addColorStop(.55,'#0B1233');gr.addColorStop(1,'#1E2A5E')}
 g.fillStyle=gr;g.fillRect(0,0,w,h)})}
function vb3dTexShemagh(){return vb3dTex('shemagh',128,128,(g,w,h)=>{
 g.fillStyle='#F6F1E8';g.fillRect(0,0,w,h);g.strokeStyle='#B7262C';g.lineWidth=3;
 for(let k=0;k<w;k+=16){g.beginPath();g.moveTo(k,0);g.lineTo(k,h);g.stroke();g.beginPath();g.moveTo(0,k);g.lineTo(w,k);g.stroke()}
 g.fillStyle='#B7262C';for(let y=8;y<h;y+=16)for(let x=8;x<w;x+=16){g.fillRect(x-3,y-3,6,6)}},[3,3])}
function vb3dTexCobble(){return vb3dTex('cobble',512,512,(g,w,h)=>{
 g.fillStyle='#1E2133';g.fillRect(0,0,w,h);
 for(let row=0,y=0;y<h;y+=30,row++)for(let x=(row%2)*22-22;x<w+22;x+=44){const rx=x+Math.random()*4,ry=y+Math.random()*3,rw=38+Math.random()*4,rh=24+Math.random()*3;
  const gr=g.createRadialGradient(rx+rw*.4,ry+rh*.35,2,rx+rw/2,ry+rh/2,rw*.7);gr.addColorStop(0,'#4A5070');gr.addColorStop(1,'#2A2F46');g.fillStyle=gr;
  g.beginPath();g.roundRect?g.roundRect(rx,ry,rw,rh,8):g.rect(rx,ry,rw,rh);g.fill()}
 vb3dNoise(g,w,h,7000,.08)},[6,6])}
function vb3dTexFacade(){return vb3dTex('facade',256,512,(g,w,h)=>{
 g.fillStyle='#2E2A48';g.fillRect(0,0,w,h);vb3dNoise(g,w,h,3000,.08);
 for(let r=0;r<7;r++)for(let c=0;c<3;c++){const x=28+c*76,y=44+r*64,lit=Math.random()<.42;
  g.fillStyle='#1B1830';g.fillRect(x-4,y-4,48,54);g.fillStyle=lit?(Math.random()<.85?'#F6CF7A':'#9FDBFF'):'#141228';g.fillRect(x,y,40,46);
  if(lit){g.fillStyle='rgba(255,255,255,.25)';g.fillRect(x+4,y+4,14,18)}
  g.fillStyle='#3A3558';g.fillRect(x-6,y+46,52,5)}
 g.fillStyle='#3A3558';g.fillRect(0,0,w,14)},[1,1])}
function vb3dTexAo(){return vb3dTex('ao',128,128,(g,w,h)=>{const gr=g.createRadialGradient(64,64,2,64,64,62);gr.addColorStop(0,'rgba(0,0,0,.72)');gr.addColorStop(.45,'rgba(0,0,0,.42)');gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(0,0,w,h)})}
/** بقعة ظلّ تماس تحت الجالس أو الأثاث */
function vb3dAo(sc,x,y,z,r){const T=THREE;const m=new T.Mesh(vb3dG('Plane',r*2,r*2),VB3.aoMat||(VB3.aoMat=new T.MeshBasicMaterial({map:vb3dTexAo(),transparent:true,depthWrite:false,opacity:.85})));
 m.position.set(x,y,z);m.rotation.x=-Math.PI/2;m.renderOrder=-1;sc.add(m);return m}
function vb3dTexGlow(){return vb3dTex('glow',128,128,(g,w,h)=>{const gr=g.createRadialGradient(64,64,2,64,64,64);gr.addColorStop(0,'rgba(255,240,200,1)');gr.addColorStop(.35,'rgba(255,220,150,.45)');gr.addColorStop(1,'rgba(255,200,120,0)');g.fillStyle=gr;g.fillRect(0,0,w,h)})}
/* ── مظهر كل لاعب من أفاتار ملفّه الشخصي: بشرة، شعر وقصّته، عينان، فم، لحية، إكسسوار — الشخصية المجسّمة هي صورته نفسها ── */
function vb3dAvatarOf(i,model){if(i===model.me)return S.av||AV_DEFAULT;if(model.avs&&model.avs[i])return model.avs[i];return avFromSeed(model.names[i]||'لاعب')}
function vb3dLook(i,model){
 const me=i===model.me,nm=model.names[i]||'لاعب',av=vb3dAvatarOf(i,model),f=!me&&VB3_FEMALE.has(nm),h=hashStr(nm+'|3d');
 const id=(k,v)=>((AV[k][v]||AV[k][0]).id);
 return {f,me,host:i===model.host,skin:AV.skin[av.skin]||AV.skin[0],hair:AV.hair[av.hair]||AV.hair[0],hs:f?'none':id('hairStyle',av.hairStyle),eyes:id('eyes',av.eyes),mouth:id('mouth',av.mouth),
  beard:f?'none':id('beard',av.beard),acc:id('acc',av.acc),thobe:f?'#1A1A22':VB3_COL.thobe[h%4],shayla:VB3_COL.shayla[(h>>5)%5],cushion:VB3_COL.cushion[(i+(h>>7))%5]};
}
function vb3dTexIris(){return vb3dTex('iris',64,64,(g,w,h)=>{g.clearRect(0,0,w,h);const gr=g.createRadialGradient(32,32,2,32,32,30);gr.addColorStop(0,'#0C0A10');gr.addColorStop(.4,'#0C0A10');gr.addColorStop(.45,'#7A4A22');gr.addColorStop(.72,'#3B2314');gr.addColorStop(.95,'#24140A');gr.addColorStop(1,'rgba(36,20,10,0)');
 g.fillStyle=gr;g.beginPath();g.arc(32,32,31,0,7);g.fill();g.strokeStyle='rgba(140,90,40,.45)';g.lineWidth=1;for(let k=0;k<26;k++){const a=k/26*Math.PI*2;g.beginPath();g.moveTo(32+Math.cos(a)*14,32+Math.sin(a)*14);g.lineTo(32+Math.cos(a)*29,32+Math.sin(a)*29);g.stroke()}
 g.fillStyle='rgba(255,255,255,.92)';g.beginPath();g.arc(23,23,5.5,0,7);g.fill();g.fillStyle='rgba(255,255,255,.5)';g.beginPath();g.arc(40,42,2.5,0,7);g.fill()})}
function vb3dTexWeave(){return vb3dTex('weave',128,128,(g,w,h)=>{g.fillStyle='#808080';g.fillRect(0,0,w,h);for(let y=0;y<h;y+=4){g.fillStyle=y%8?'#8c8c8c':'#727272';g.fillRect(0,y,w,2)}for(let x=0;x<w;x+=4){g.fillStyle=x%8?'rgba(150,150,150,.5)':'rgba(100,100,100,.5)';g.fillRect(x,0,2,h)}vb3dNoise(g,w,h,2500,.12)},[7,7],true)}
/** طيّات قماش: تموّج نصف قطر المخرطة حول المحيط تحت ارتفاع معيّن */
function vb3dFolds(geo,amp,freq,maxY){const p=geo.attributes.position;for(let k=0;k<p.count;k++){const x=p.getX(k),y=p.getY(k),z=p.getZ(k);if(y>maxY)continue;const r=Math.hypot(x,z);if(r<1e-4)continue;const a=Math.atan2(z,x),f=1+amp*Math.sin(freq*a)*(1-y/maxY);p.setXYZ(k,x*f,y,z*f)}geo.computeVertexNormals();return geo}
/** شخصية جالسة من أفاتار اللاعب: جذع بطيّات، حضن أو ساقان، ذراعان ويدان بأصابع، رأس بجفون وقزحيات وحاجبين وأنف وشفاه،
    شعر بقصّته أو غترة وعقال أو شيلة، لحية، وإكسسوار ملفّه — posture: floor (وسادة) | chair (كرسي) */
function vb3dChar(look,posture){
 const T=THREE,g=new T.Group(),mats=[],weave=vb3dTexWeave();
 const M=(c,o)=>{const m=vb3dMat(c,o);m.transparent=true;m.userData.base=m.color.clone();mats.push(m);return m};
 const reg=m=>{m.transparent=true;m.userData.base=m.color.clone();mats.push(m);return m};
 const skin=M(look.skin,{rough:.52,sheen:.5,sheenR:.5,sheenC:'#FF9E86',spec:.5}),cloth=M(look.thobe,{rough:.94,sheen:.35,sheenC:'#FFF6E6',bump:weave,bumpS:.35});
 const hairM=M(look.hair,{rough:.42,metal:.05,sheen:.6,sheenR:.3,sheenC:'#FFE9C8'}),dark=M('#15141C',{rough:.5}),lipM=M('#8A4A3A',{rough:.55}),white=M('#F7F4EC',{rough:.3});
 const eyeM=reg(new T.MeshPhysicalMaterial({color:new T.Color('#F7F4EC'),roughness:.12,clearcoat:1,clearcoatRoughness:.06}));
 const irisM=reg(new T.MeshBasicMaterial({map:vb3dTexIris(),transparent:true}));
 const Z=new T.Vector3(0,0,1);
 // الجذع (ثوب/عباءة) بطيّات، والعنق والياقة وفتحة الصدر بأزرارها
 const prof=[[0.03,0],[0.34,0.02],[0.37,0.16],[0.32,0.46],[0.29,0.66],[0.25,0.74],[0.13,0.78],[0.1,0.86]].map(p=>new T.Vector2(p[0],p[1]));
 const body=new T.Mesh(vb3dFolds(new T.LatheGeometry(prof,44),.013,9,.62),cloth);body.castShadow=true;body.receiveShadow=true;g.add(body);
 g.add(vb3dMesh(vb3dG('Cylinder',.075,.088,.13,24),skin,0,.86,0));
 if(!look.f){g.add(vb3dMesh(vb3dG('Torus',.105,.014,10,30),cloth,0,.855,0,{rot:[Math.PI/2,0,0],noCast:1}));
  g.add(vb3dMesh(vb3dG('Capsule',.007,.2,3,6),M(shade(look.thobe,-22),{rough:.9}),0,.665,.292,{rot:[.2,0,0],noCast:1}));
  [.75,.69].forEach(y=>g.add(vb3dMesh(vb3dG('Sphere',.011,10,8),M('#E9E2D0',{rough:.4}),0,y,.302-(.75-y)*.4,{noCast:1})))}
 if(look.me){const bisht=M('#2A1E16',{rough:.8,sheen:.7,sheenR:.4,sheenC:'#E8C88A',bump:weave,bumpS:.4});const bp=prof.map(v=>new T.Vector2(v.x*1.07+.01,v.y));
  g.add(new T.Mesh(vb3dFolds(new T.LatheGeometry(bp.slice(1,7),44,0.45,Math.PI*2-0.9),.01,11,.62),bisht));
  g.add(vb3dMesh(vb3dG('Torus',.29,.013,10,40),M('#E8B23A',{metal:.95,rough:.18,clear:.4}),0,.66,0,{rot:[Math.PI/2,0,0],noCast:1}))}
 // الحضن على الوسادة، أو فخذان وساقان وحذاءان على الكرسي
 if(posture==='chair'){[-1,1].forEach(s=>{const hip=new T.Vector3(s*.15,.09,.06),knee=new T.Vector3(s*.17,.12,.44),foot=new T.Vector3(s*.17,-.40,.47);
   g.add(vb3dLimb(hip,knee,.095,cloth),vb3dLimb(knee,foot,.075,cloth),vb3dMesh(vb3dG('Capsule',.045,.1,3,6),dark,s*.17,-.45,.5,{rot:[Math.PI/2,0,0]}))})}
 else g.add(vb3dMesh(vb3dG('Sphere',0.43,32,20),cloth,0,0.09,0.13,{sc:[1,.32,.82]}));
 // الذراعان واليدان (راحة وأصابع وإبهام) على الحضن
 const arms={};[-1,1].forEach(s=>{const sh=new T.Vector3(s*.3,.6,.04),el=new T.Vector3(s*.37,.36,.2),hd=new T.Vector3(s*.14,.22,.37);
  const up=vb3dLimb(sh,el,.064,cloth),lo=vb3dLimb(el,hd,.056,cloth);
  const hand=new T.Group();hand.position.copy(hd);hand.quaternion.setFromUnitVectors(Z,new T.Vector3().subVectors(hd,el).normalize());
  hand.add(vb3dMesh(vb3dG('Sphere',.05,18,14),skin,0,0,0,{sc:[1,.55,1.2]}));
  for(let k=0;k<4;k++)hand.add(vb3dMesh(vb3dG('Capsule',.0115,.04,3,10),skin,(k-1.5)*.025,-.004,.068,{rot:[Math.PI/2+.2,0,0]}));
  hand.add(vb3dMesh(vb3dG('Capsule',.012,.034,3,10),skin,-s*.052,.004,.018,{rot:[Math.PI/2-.4,0,s*.8]}));
  const cuff=vb3dLimb(hd.clone().addScaledVector(new T.Vector3().subVectors(el,hd).normalize(),.03),hd.clone().addScaledVector(new T.Vector3().subVectors(el,hd).normalize(),.08),.06,cloth);
  g.add(up,lo,hand,cuff);arms[s<0?'l':'r']={up,lo,hand,sh,el,hd,rest:{el:el.clone(),hd:hd.clone()}}});
 // الرأس: جمجمة وفكّ وأذنان
 const head=new T.Group();head.position.set(0,1.03,.03);g.add(head);
 head.add(vb3dMesh(vb3dG('Sphere',.19,44,30),skin,0,0,0,{sc:[1,1.08,1]}));
 head.add(vb3dMesh(vb3dG('Sphere',.15,32,22),skin,0,-.085,0,{sc:[1,.82,1.02]}));
 const onFace=(x,y,off)=>new T.Vector3(x,y,Math.sqrt(Math.max(0,.0361-x*x-(y/1.08)*(y/1.08)))+(off||0));
 [-1,1].forEach(s=>head.add(vb3dMesh(vb3dG('Sphere',.036,16,12),skin,s*.19,-.005,-.01,{sc:[.55,1,.85],noCast:1})));
 // العينان: مقلة لامعة وقزحية وجفن علوي وسفلي بحسب شكل العينين في الأفاتار
 const ey=look.eyes,eyes=[],big=ey==='wide'?1.22:1;
 [-1,1].forEach(s=>{const eg=new T.Group();eg.position.set(s*.072,.035,.16);head.add(eg);
  eg.add(vb3dMesh(vb3dG('Sphere',.036*big,24,18),eyeM,0,0,0,{noCast:1}));
  eg.add(vb3dMesh(vb3dG('Circle',.021*big,24),irisM,0,0,.0348*big,{noCast:1}));
  const cover=ey==='happy'?2.7:ey==='sharp'?1.15:ey==='wide'?.6:.95;
  const lid=vb3dMesh(vb3dG('Sphere',.0392*big,24,14,0,Math.PI*2,0,cover),skin,0,0,0,{noCast:1});lid.rotation.x=-.12;if(ey==='sharp')lid.rotation.z=-s*.38;eg.add(lid);
  eg.add(vb3dMesh(vb3dG('Sphere',.0392*big,24,10,0,Math.PI*2,Math.PI-.6,.6),skin,0,0,0,{noCast:1}));
  if(ey==='happy'){const cr=vb3dMesh(vb3dG('Torus',.028,.0055,6,16,2.2),M(shade(look.skin,-58),{rough:.6}),0,.004,.034,{noCast:1});cr.rotation.z=Math.PI/2-1.1;eg.add(cr)}
  eyes.push({lid,closed:ey==='happy'})});
 // الحاجبان أنابيب على منحنٍ، والأنف بفتحتيه، وحمرة الخدّين
 const browM=M(look.hs==='bald'?'#3A2B1E':shade(look.hair,-16),{rough:.6});
 [-1,1].forEach(s=>{const y0=ey==='sharp'?.084:ey==='happy'||ey==='wide'?.1:.092,tilt=ey==='sharp'?.028:0;
  const cv=new T.QuadraticBezierCurve3(onFace(s*.03,y0-tilt,.009),onFace(s*.075,y0+.026,.014),onFace(s*.122,y0-.004+tilt*.4,.007));
  head.add(vb3dMesh(new T.TubeGeometry(cv,14,.011,8,false),browM,0,0,0,{noCast:1}))});
 head.add(vb3dMesh(vb3dG('Capsule',.013,.05,3,6),skin,0,-.006,.178,{rot:[.35,0,0],noCast:1}));
 head.add(vb3dMesh(vb3dG('Sphere',.026,8,6),skin,0,-.046,.19,{sc:[1.05,.9,1],noCast:1}));
 const nostM=M(shade(look.skin,-45),{rough:.7});[-1,1].forEach(s=>head.add(vb3dMesh(vb3dG('Sphere',.009,10,8),nostM,s*.017,-.059,.196,{noCast:1})));
 const blushM=reg(new T.MeshBasicMaterial({color:new T.Color('#E86A6A'),transparent:true,opacity:.2,depthWrite:false}));
 [-1,1].forEach(s=>{const b=vb3dMesh(vb3dG('Circle',.032,20),blushM,s*.115,-.046,.152,{noCast:1});b.rotation.y=s*.62;b.scale.y=.6;head.add(b)});
 // الفم بحسب الأفاتار: ابتسامة، ضحكة بأسنان، هادئ، ماكر — وفم يُفتح عند الكلام
 const mouth=new T.Group();mouth.position.set(0,-.1,.176);head.add(mouth);const mo=look.mouth;
 const arc=(r,tube,len,rz,x,y,z,mat)=>{const t=vb3dMesh(vb3dG('Torus',r,tube,10,26,len),mat||lipM,x||0,y||0,z||0,{noCast:1});t.rotation.z=rz;return t};
 if(mo==='smile')mouth.add(arc(.046,.009,2.4,-Math.PI/2-1.2));
 else if(mo==='calm')mouth.add(vb3dMesh(vb3dG('Capsule',.008,.056,3,6),lipM,0,0,0,{rot:[0,0,Math.PI/2],noCast:1}));
 else if(mo==='smirk')mouth.add(arc(.05,.009,2.0,-Math.PI/2-1.0+.32,.008,.004,0));
 else{mouth.add(vb3dMesh(vb3dG('Sphere',.045,20,14),M('#6E2828',{rough:.6}),0,-.008,-.012,{sc:[1.1,.5,.4],noCast:1}));mouth.add(vb3dMesh(vb3dG('Capsule',.011,.05,3,6),white,0,.008,.01,{rot:[0,0,Math.PI/2],noCast:1}));mouth.add(arc(.046,.008,2.4,-Math.PI/2-1.2,0,.014,0))}
 const open=vb3dMesh(vb3dG('Sphere',.03,16,12),M('#4A1E1E',{rough:.7}),0,-.02,-.004,{sc:[1.3,.05,.5],noCast:1});mouth.add(open);
 // اللحية: خدّان وذقن (والفم مكشوف)، خفيفة نصف شفّافة، أو شارب
 const bd=look.beard;
 if(bd==='full'||bd==='short'){const bm=bd==='short'?M(look.hair,{rough:.7,tr:1,op:.7}):hairM;
  head.add(vb3dMesh(vb3dG('Sphere',.2,40,14,Math.PI/2+.5,Math.PI*2-1,Math.PI*.58,Math.PI*.18),bm,0,-.01,.012,{sc:[1.02,1.1,1.02]}));
  head.add(vb3dMesh(vb3dG('Sphere',.2,40,14,0,Math.PI*2,Math.PI*.72,Math.PI*.28),bm,0,-.01,.012,{sc:[1.02,1.16,1.02]}));
  if(bd==='full')head.add(vb3dMesh(vb3dG('Sphere',.11,24,18),bm,0,-.205,.03,{sc:[1.1,.85,1]}))}
 if(bd==='mustache'||bd==='full'){const m=arc(.04,.011,2.3,Math.PI/2-1.15,0,.042,.03,hairM);m.scale.y=.7;mouth.add(m)}
 // الشعر بقصّته (قصير، مموّج، مجعّد، طويل، حليق) — أو الغترة والعقال إن كانت في الأفاتار — أو الشيلة
 const hs=look.hs,ac=look.acc;let hat=false;
 const cap=(th,rx)=>{const c=vb3dMesh(vb3dG('Sphere',.2,40,26,0,Math.PI*2,0,th),hairM,0,.012,-.005,{sc:[1.02,1.06,1.03]});c.rotation.x=rx;head.add(c);return c};
 if(look.f){const sh=M(look.shayla,{rough:.9,sheen:.45,sheenC:'#FFFFFF',bump:weave,bumpS:.25});hat=true;
  const dome=vb3dMesh(vb3dG('Sphere',.212,40,26,0,Math.PI*2,0,1.45),sh,0,.02,-.005,{sc:[1.02,1.05,1.04]});dome.rotation.x=-.5;head.add(dome);
  const dp=[[.212,.02],[.24,-.14],[.29,-.32],[.33,-.5],[.3,-.6]].map(p=>new T.Vector2(p[0],p[1]));head.add(vb3dMesh(new T.LatheGeometry(dp,36,Math.PI*.36,Math.PI*1.28),sh,0,0,-.005));
  const np=[[.13,-.17],[.2,-.3],[.3,-.45],[.32,-.58]].map(p=>new T.Vector2(p[0],p[1]));head.add(vb3dMesh(new T.LatheGeometry(np,36),sh,0,0,0));
 }else if(ac==='shemagh'){const gh=M('#F6F1E8',{map:vb3dTexShemagh(),rough:.9,sheen:.4,sheenC:'#FFFFFF',bump:weave,bumpS:.25});hat=true;
  const dome=vb3dMesh(vb3dG('Sphere',.215,40,26,0,Math.PI*2,0,1.5),gh,0,.02,-.01,{sc:[1.02,1.05,1.05]});dome.rotation.x=-.45;head.add(dome);
  const dp=[[.215,-.02],[.235,-.14],[.255,-.28],[.27,-.42],[.26,-.5]].map(p=>new T.Vector2(p[0],p[1]));head.add(vb3dMesh(new T.LatheGeometry(dp,36,Math.PI*.3,Math.PI*1.4),gh,0,0,-.01));
  const ag=vb3dG('Torus',.2,.02,12,40);head.add(vb3dMesh(ag,dark,0,.13,0,{rot:[Math.PI/2-.1,0,0]}),vb3dMesh(ag,dark,0,.095,.012,{rot:[Math.PI/2-.02,0,0]}));
 }else if(hs==='short')cap(1.5,-.55);
 else if(hs==='wavy'){cap(1.55,-.5);for(let k=0;k<5;k++){const a=-.9+k*.45;const w=vb3dMesh(vb3dG('Torus',.045,.02,10,18,2.6),hairM,Math.sin(a)*.17,.118-Math.abs(a)*.03,Math.cos(a)*.16,{noCast:1});w.rotation.set(-.6+k*.1,a,Math.PI/2);head.add(w)}}
 else if(hs==='curly'){cap(1.6,-.45);let hh=hashStr(look.hair+'c');const rnd=()=>{hh=Math.imul(hh^(hh>>>15),2246822507)>>>0;return (hh%1000)/1000};
  for(let k=0;k<20;k++){const th=.15+rnd()*1.35,ph=rnd()*Math.PI*2;if(th>.95&&Math.abs(((ph-Math.PI/2+Math.PI)%(2*Math.PI))-Math.PI)<.8)continue;
   head.add(vb3dMesh(vb3dG('Sphere',.05,14,10),hairM,-.19*Math.cos(ph)*Math.sin(th),.19*Math.cos(th)*1.06+.02,.19*Math.sin(ph)*Math.sin(th),{noCast:1}))}}
 else if(hs==='long'){cap(1.5,-.55);const lp=[[.2,.04],[.215,-.08],[.225,-.22],[.235,-.38],[.22,-.5]].map(p=>new T.Vector2(p[0],p[1]));head.add(vb3dMesh(new T.LatheGeometry(lp,32,Math.PI*.38,Math.PI*1.24),hairM,0,0,0))}
 // الإكسسوارات: نظارة، نظارة عالِم، تاج، وشاح ذهبي، عصابة
 if(ac==='glasses'||ac==='sci'){const gm=ac==='sci'?M('#5DCAA5',{rough:.35,metal:.3}):M('#1F2230',{rough:.4,metal:.4});const R=ac==='sci'?.052:.048,tb=ac==='sci'?.006:.0045;
  [-1,1].forEach(s=>{head.add(vb3dMesh(vb3dG('Torus',R,tb,10,32),gm,s*.072,.035,.2,{noCast:1}));head.add(vb3dLimb(new T.Vector3(s*.12,.04,.19),new T.Vector3(s*.19,.03,-.01),.004,gm));
   if(ac==='sci')head.add(vb3dMesh(vb3dG('Circle',R-.004,20),reg(new T.MeshBasicMaterial({color:0x5DCAA5,transparent:true,opacity:.22,depthWrite:false})),s*.072,.035,.199,{noCast:1}))});
  head.add(vb3dMesh(vb3dG('Capsule',.0035,.03,3,6),gm,0,.04,.2,{rot:[0,0,Math.PI/2],noCast:1}))}
 if(ac==='crown'){const gold=M('#E8B23A',{metal:.95,rough:.16,clear:.5});gold.side=T.DoubleSide;const cy=hs==='bald'||hat?.16:.19;
  head.add(vb3dMesh(vb3dG('Cylinder',.15,.155,.05,20,1,true),gold,0,cy,-.01,{noCast:1}));
  for(let k=0;k<6;k++){const a=k/6*Math.PI*2;head.add(vb3dMesh(vb3dG('Cone',.022,.07,10),gold,Math.cos(a)*.15,cy+.055,Math.sin(a)*.15-.01));head.add(vb3dMesh(vb3dG('Sphere',.011,10,8),M(k%2?'#5AC8F5':'#E24B4A',{rough:.25}),Math.cos(a)*.15,cy+.02,Math.sin(a)*.15-.01,{noCast:1}))}}
 if(ac==='gold'){const gold=M('#E8B23A',{metal:.95,rough:.16,clear:.5});const pts=[[.25,.72,.1],[.08,.55,.31],[-.2,.34,.28],[-.3,.22,.02],[-.16,.4,-.26],[.1,.62,-.28],[.25,.74,-.06]].map(p=>new T.Vector3(p[0],p[1],p[2]));
  g.add(vb3dMesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts,true),64,.024,8,true),gold,0,0,0,{noCast:1}));g.add(vb3dMesh(vb3dG('Sphere',.026,8,6),M('#E24B4A',{rough:.25}),.05,.56,.32,{noCast:1}))}
 if(ac==='headband'){const hb=M('#C93A34',{rough:.7});const R=hs==='bald'?.196:.212;head.add(vb3dMesh(vb3dG('Torus',R,.02,10,40),hb,0,.078,0,{rot:[Math.PI/2-.12,0,0],noCast:1}));
  [-1,1].forEach(s=>head.add(vb3dMesh(vb3dG('Capsule',.012,.16,2,5),hb,s*.05,-.04,-.2,{rot:[.35,0,s*.3],noCast:1})))}
 g.userData={mats,head,mouth,open,eyes,arms,body,base:g.position.clone(),blinkAt:performance.now()+1500+Math.random()*3000};
 return g;
}
/* ── الغرفتان ── */
function vb3dRoomMajlis(sc){
 const T=THREE,wood=vb3dTexWood();
 const floor=vb3dMesh(vb3dG('Plane',10,10),vb3dMat('#fff',{map:vb3dTexCarpet(),rough:.95}),0,0,0,{rot:[-Math.PI/2,0,0],recv:1,noCast:1});sc.add(floor);
 sc.add(vb3dMesh(vb3dG('Plane',30,30),vb3dMat('#3A2A1C',{rough:1}),0,-.01,0,{rot:[-Math.PI/2,0,0],recv:1,noCast:1}));
 const plaster=vb3dMat('#fff',{map:vb3dTexPlaster(),rough:.95}),wainM=vb3dMat('#5A3418',{map:wood,rough:.8}),brass=vb3dMat('#C9921E',{metal:.95,rough:.2,clear:.35});
 const wall=(w,h,x,y,z,ry)=>{const m=vb3dMesh(vb3dG('Plane',w,h),plaster,x,y,z,{rot:[0,ry,0],recv:1,noCast:1});sc.add(m);return m};
 wall(12,4.2,0,2.1,-3.7,0);wall(12,4.2,-4.6,2.1,0,Math.PI/2);wall(12,4.2,4.6,2.1,0,-Math.PI/2);
 [[0,-3.66,0],[-4.56,0,Math.PI/2],[4.56,0,-Math.PI/2]].forEach(([x,z,ry])=>{sc.add(vb3dMesh(vb3dG('Box',12,.62,.08),wainM,x,.31,z,{rot:[0,ry,0],noCast:1}));sc.add(vb3dMesh(vb3dG('Box',12,.06,.1),brass,x,.65,z,{rot:[0,ry,0],noCast:1}));sc.add(vb3dMesh(vb3dG('Box',12,.08,.1),brass,x,3.2,z,{rot:[0,ry,0],noCast:1}))});
 const skyM=vb3dMat('#fff',{map:vb3dTexSky('warm'),emis:'#FFB070',ei:.35,rough:1}),latM=vb3dMat('#fff',{map:vb3dTexLattice(),tr:1,at:.5,side:T.DoubleSide,rough:.8});
 const arch=(x,z,ry,w,h)=>{const grp=new T.Group();grp.position.set(x,0,z);grp.rotation.y=ry;
  const shp=new T.Shape();shp.moveTo(-w/2,0);shp.lineTo(-w/2,h-w/2);shp.absarc(0,h-w/2,w/2,Math.PI,0,true);shp.lineTo(w/2,0);shp.closePath();
  grp.add(vb3dMesh(new T.ShapeGeometry(shp,24),skyM,0,1.05,.03,{noCast:1}));grp.add(vb3dMesh(new T.ShapeGeometry(shp,24),latM,0,1.05,.06,{noCast:1}));
  const fr=new T.Shape();fr.moveTo(-w/2-.1,-.02);fr.lineTo(-w/2-.1,h-w/2);fr.absarc(0,h-w/2,w/2+.1,Math.PI,0,true);fr.lineTo(w/2+.1,-.02);fr.closePath();
  const hole=new T.Path();hole.moveTo(-w/2,0);hole.lineTo(-w/2,h-w/2);hole.absarc(0,h-w/2,w/2,Math.PI,0,true);hole.lineTo(w/2,0);hole.closePath();fr.holes.push(hole);
  grp.add(vb3dMesh(new T.ExtrudeGeometry(fr,{depth:.08,bevelEnabled:false}),brass,0,1.05,.04,{noCast:1}));sc.add(grp)};
 arch(-2.3,-3.68,0,1.15,1.95);arch(0,-3.68,0,1.4,2.3);arch(2.3,-3.68,0,1.15,1.95);arch(-4.58,-1.2,Math.PI/2,1.0,1.8);arch(4.58,-1.2,-Math.PI/2,1.0,1.8);
 const sadu=vb3dTexSadu();const cush=(x,z,ry,c,w)=>{const grp=new T.Group();grp.position.set(x,0,z);grp.rotation.y=ry;const cm=vb3dMat(c,{rough:.95});
  grp.add(vb3dMesh(vb3dG('Capsule',.2,w-.5,6,20),cm,0,.2,.02,{rot:[0,0,Math.PI/2]}));grp.add(vb3dMesh(vb3dG('Capsule',.17,w-.55,6,20),cm,0,.5,-.2,{rot:[0,0,Math.PI/2]}));
  grp.add(vb3dMesh(vb3dG('Cylinder',.206,.206,.26,28,1,true),vb3dMat('#fff',{map:sadu,rough:.95,side:T.DoubleSide}),0,.2,.02,{rot:[0,0,Math.PI/2],noCast:1}));sc.add(grp)};
 const cc=VB3_COL.cushion;for(let k=0;k<5;k++)cush(-3.3+k*1.65,-3.35,0,cc[k%5],1.4);
 for(let k=0;k<3;k++){cush(-4.25,-1.9+k*1.6,Math.PI/2,cc[(k+2)%5],1.3);cush(4.25,-1.9+k*1.6,-Math.PI/2,cc[(k+3)%5],1.3)}
 // الطاولة: صينية نحاس على قاعدة خشب، ودلّة وفناجين وصحن تمر
 sc.add(vb3dMesh(vb3dG('Cylinder',.6,.66,.3,40),vb3dMat('#5A3418',{map:wood,rough:.8}),0,.15,0));
 sc.add(vb3dMesh(vb3dG('Cylinder',.98,.98,.05,48),brass,0,.335,0));sc.add(vb3dMesh(vb3dG('Torus',.98,.03,10,48),brass,0,.36,0,{rot:[Math.PI/2,0,0],noCast:1}));
 const dp=[[0,0],[.12,.01],[.15,.08],[.11,.2],[.09,.3],[.13,.38],[.06,.44],[.07,.5]].map(p=>new T.Vector2(p[0],p[1]));
 const dal=new T.Group();dal.position.set(.32,.36,-.12);dal.add(vb3dMesh(new T.LatheGeometry(dp,20),brass));dal.add(vb3dMesh(vb3dG('Torus',.08,.02,8,20),brass,-.16,.28,0,{rot:[0,0,Math.PI/2]}));
 dal.add(vb3dMesh(vb3dG('Cone',.035,.3,10),brass,.18,.36,0,{rot:[0,0,-.8]}));sc.add(dal);
 const cupM=vb3dMat('#F4E6C8',{rough:.5});for(let k=0;k<5;k++){const a=k/5*Math.PI*2+.4;sc.add(vb3dMesh(vb3dG('Cylinder',.045,.03,.07,12),cupM,Math.cos(a)*.62,.4,Math.sin(a)*.62))}
 sc.add(vb3dMesh(vb3dG('Cylinder',.22,.24,.03,20),cupM,-.35,.375,.2));const dateM=vb3dMat('#5A2A12',{rough:.6});for(let k=0;k<9;k++)sc.add(vb3dMesh(vb3dG('Sphere',.035,8,6),dateM,-.35+(k%3-1)*.07,.42,.2+(Math.floor(k/3)-1)*.07,{noCast:1}));
 // الفانوس المعلّق فوق الطاولة
 const lan=new T.Group();lan.position.set(0,2.15,0);lan.add(vb3dLimb(new T.Vector3(0,1.7,0),new T.Vector3(0,.3,0),.012,brass));
 lan.add(vb3dMesh(vb3dG('Cone',.2,.16,8),brass,0,.3,0),vb3dMesh(vb3dG('Cylinder',.14,.14,.34,8,1,true),vb3dMat('#FFE2A0',{emis:'#FFC46A',ei:1.6,tr:1,op:.55,side:T.DoubleSide}),0,.05,0,{noCast:1}),vb3dMesh(vb3dG('Cylinder',.17,.15,.05,8),brass,0,-.14,0));
 for(let k=0;k<8;k++){const a=k/8*Math.PI*2;lan.add(vb3dMesh(vb3dG('Box',.012,.34,.012),brass,Math.cos(a)*.14,.05,Math.sin(a)*.14,{noCast:1}))}
 sc.add(lan);
 const glow=new T.Sprite(new T.SpriteMaterial({map:vb3dTexGlow(),color:0xFFD9A0,transparent:true,opacity:.55,blending:T.AdditiveBlending,depthWrite:false}));glow.scale.set(1.6,1.6,1);glow.position.set(0,2.2,0);sc.add(glow);
 // سقف بعوارض خشب وقبّة جصّ
 const ceil=vb3dMat('#E8DCC2',{rough:1,emis:'#8A7550',ei:1.0});ceil.side=T.DoubleSide;   // السقف لا يُقرأ فراغًا أسود حين ترتفع الكاميرا
 sc.add(vb3dMesh(vb3dG('Plane',12,9),ceil,0,3.9,-.5,{rot:[Math.PI/2,0,0],noCast:1}));
 for(let k=-3;k<=3;k++)sc.add(vb3dMesh(vb3dG('Box',9.4,.16,.2),vb3dMat('#6A4426',{map:wood,rough:.8}),0,3.82,-3.2+k*.95,{rot:[0,Math.PI/2,0],noCast:1}));
 sc.add(vb3dMesh(vb3dG('Box',9.4,.2,.26),vb3dMat('#5A3418',{map:wood,rough:.8}),0,3.76,-.5,{rot:[0,Math.PI/2,0],noCast:1}));
 // شمعدانان على الجدارين الجانبيين
 const sconce=(x,z,ry)=>{const g2=new T.Group();g2.position.set(x,1.9,z);g2.rotation.y=ry;
  g2.add(vb3dMesh(vb3dG('Cylinder',.05,.09,.18,12),brass,0,-.16,0,{noCast:1}));
  g2.add(vb3dMesh(vb3dG('Cylinder',.13,.09,.26,10,1,true),vb3dMat('#FFE2A0',{emis:'#FFC46A',ei:1.9,tr:1,op:.6,side:T.DoubleSide}),0,.02,0,{noCast:1}));
  g2.add(vb3dMesh(vb3dG('Torus',.13,.014,8,20),brass,0,.15,0,{rot:[Math.PI/2,0,0],noCast:1}));
  const sp=new T.Sprite(new T.SpriteMaterial({map:vb3dTexGlow(),color:0xFFC98A,transparent:true,opacity:.5,blending:T.AdditiveBlending,depthWrite:false}));sp.scale.set(1.1,1.1,1);g2.add(sp);
  const pl=new T.PointLight(0xFFC080,7,5,1.9);pl.position.set(0,.05,.2);g2.add(pl);sc.add(g2);return pl};
 const sc1=sconce(-4.42,-1.6,Math.PI/2),sc2=sconce(4.42,-1.6,-Math.PI/2);
 // نبتة نخيل صغيرة في الزاوية وقدر فخّار
 const pot=new T.Group();pot.position.set(-3.8,0,-3.0);
 pot.add(vb3dMesh(vb3dG('Cylinder',.24,.18,.34,20),vb3dMat('#8A5A32',{rough:.9}),0,.17,0));
 pot.add(vb3dMesh(vb3dG('Torus',.245,.03,8,20),vb3dMat('#6B4424',{rough:.9}),0,.33,0,{rot:[Math.PI/2,0,0],noCast:1}));
 const leaf=vb3dMat('#2E6B3E',{rough:.75,sheen:.4,sheenC:'#BFEFA0'});
 for(let k=0;k<9;k++){const a=k/9*Math.PI*2,t=.5+((k*7)%5)/9;
  const cv=new T.QuadraticBezierCurve3(new T.Vector3(0,.3,0),new T.Vector3(Math.cos(a)*.25,.72+t*.3,Math.sin(a)*.25),new T.Vector3(Math.cos(a)*.62,.5+t*.3,Math.sin(a)*.62));
  pot.add(vb3dMesh(new T.TubeGeometry(cv,10,.02,6,false),leaf,0,0,0,{noCast:1}));
  const bl=vb3dMesh(vb3dG('Plane',.5,.16),leaf,Math.cos(a)*.44,.62+t*.3,Math.sin(a)*.44,{noCast:1});bl.rotation.set(-.5,-a,.25);bl.material.side=T.DoubleSide;pot.add(bl)}
 sc.add(pot);vb3dAo(sc,-3.8,.006,-3.0,.5);
 // أعمدة ضوء رقيقة من النوافذ المقوّسة
 const shaft=vb3dMat('#FFD9A0',{rough:1});shaft.transparent=true;shaft.opacity=.055;shaft.depthWrite=false;shaft.blending=T.AdditiveBlending;
 [[-2.3,-3.5],[0,-3.5],[2.3,-3.5]].forEach(([x,z])=>{const c=vb3dMesh(vb3dG('Cylinder',.16,1.05,3.4,14,1,true),shaft,x,1.6,z+1.5,{noCast:1});c.rotation.x=.62;sc.add(c)});
 // هدب السجّاد عند الحافّتين
 const fr=vb3dMat('#E8C77A',{rough:.9});for(let k=-24;k<=24;k++){sc.add(vb3dMesh(vb3dG('Capsule',.008,.14,2,5),fr,k*.1,.012,3.55,{rot:[Math.PI/2,0,0],noCast:1}))}
 const L={};L.hemi=new T.HemisphereLight(0xFFE7C6,0x4A2A1A,.95);sc.add(L.hemi);
 L.key=new T.DirectionalLight(0xFFF0D8,2.2);L.key.position.set(2.6,5.5,3.2);L.key.castShadow=true;L.key.shadow.mapSize.set(1536,1536);L.key.shadow.radius=3;
 Object.assign(L.key.shadow.camera,{left:-4,right:4,top:4,bottom:-4,near:.5,far:14});L.key.shadow.bias=-.0004;L.key.shadow.normalBias=.022;sc.add(L.key);
 L.rim=new T.DirectionalLight(0xFFCE96,1.5);L.rim.position.set(-2.2,3.4,-4.2);sc.add(L.rim);   // ضوء حافّة من الخلف يرسم حدود الرؤوس والأكتاف
 L.lamp=new T.PointLight(0xFFC98A,26,11,1.7);L.lamp.position.set(0,2.05,0);sc.add(L.lamp);L.sconce=[sc1,sc2];
 L.fill=new T.DirectionalLight(0xFFE2C4,.45);L.fill.position.set(0,3,7);sc.add(L.fill);
 L.warm=new T.PointLight(0xFFB070,10,10,1.8);L.warm.position.set(0,1.6,-3.2);sc.add(L.warm);
 return {L,glow,day:{hemi:.95,key:2.0,lamp:24,rim:1.5,sconce:7,bg:'#3A2A1C'},night:{hemi:.3,key:.5,lamp:14,rim:.55,sconce:3,bg:'#1A1512'}};
}
function vb3dRoomSquare(sc){
 const T=THREE,wood=vb3dTexWood();
 sc.add(vb3dMesh(vb3dG('Plane',40,40),vb3dMat('#fff',{map:vb3dTexCobble(),rough:.95}),0,0,0,{rot:[-Math.PI/2,0,0],recv:1,noCast:1}));
 const sky=vb3dMesh(vb3dG('Sphere',42,32,16),new T.MeshBasicMaterial({map:vb3dTexSky('dusk'),side:T.BackSide,fog:false}),0,0,0,{noCast:1});sc.add(sky);
 const pts=[];for(let k=0;k<420;k++){const a=Math.random()*Math.PI*2,e=Math.random()*1.2+.15;pts.push(Math.cos(a)*Math.cos(e)*40,Math.sin(e)*40,Math.sin(a)*Math.cos(e)*40)}
 const stars=new T.Points(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(pts,3)),new T.PointsMaterial({color:0xFFFFFF,size:.22,transparent:true,opacity:.7,fog:false}));sc.add(stars);
 const moon=vb3dMesh(vb3dG('Sphere',1.3,20,14),new T.MeshBasicMaterial({color:0xFFF4D6,fog:false}),-15,13,-27,{noCast:1});sc.add(moon);
 const mg=new T.Sprite(new T.SpriteMaterial({map:vb3dTexGlow(),color:0xFFF0C8,transparent:true,opacity:.7,blending:T.AdditiveBlending,depthWrite:false,fog:false}));mg.scale.set(9,9,1);mg.position.copy(moon.position);sc.add(mg);
 const fac=vb3dMat('#fff',{map:vb3dTexFacade(),rough:.95}),par=vb3dMat('#3A3558',{rough:.95});
 const bld=(x,z,w,h,d,ry)=>{const b=vb3dMesh(vb3dG('Box',w,h,d),fac,x,h/2,z,{rot:[0,ry||0,0],noCast:1});b.receiveShadow=true;sc.add(b);sc.add(vb3dMesh(vb3dG('Box',w+.2,.3,d+.2),par,x,h+.1,z,{rot:[0,ry||0,0],noCast:1}))};
 [[-6.5,-6.5,3.2,5,3],[-3.2,-7.5,2.6,4,3],[0,-8,3.4,6,3],[3.2,-7.5,2.6,4.4,3],[6.5,-6.5,3.2,5.4,3],[-8.5,-2,3,4.2,3,Math.PI/2],[8.5,-2,3,4.6,3,-Math.PI/2],[-8.5,3,3,3.6,3,Math.PI/2],[8.5,3,3,3.8,3,-Math.PI/2]].forEach(a=>bld(...a));
 sc.add(vb3dMesh(vb3dG('Cylinder',.5,.6,9,10),par,-1.2,4.5,-14,{noCast:1}),vb3dMesh(vb3dG('Sphere',.7,12,8),par,-1.2,9.3,-14,{noCast:1}),vb3dMesh(vb3dG('Sphere',2.2,16,10,0,Math.PI*2,0,Math.PI/2),par,4,5.5,-14,{noCast:1}),vb3dMesh(vb3dG('Box',6,5.5,4),par,4,2.75,-14,{noCast:1}));
 const palm=(x,z)=>{const grp=new T.Group();grp.position.set(x,0,z);grp.add(vb3dMesh(vb3dG('Cylinder',.09,.14,3.4,8),vb3dMat('#4A3524',{rough:1}),0,1.7,0));
  const fm=vb3dMat('#1F5B3C',{rough:.9,side:T.DoubleSide});for(let k=0;k<7;k++){const a=k/7*Math.PI*2;const f=vb3dMesh(vb3dG('Plane',1.6,.34),fm,Math.cos(a)*.7,3.35,Math.sin(a)*.7,{noCast:1});f.rotation.set(0,-a,-.45);grp.add(f)}sc.add(grp)};
 palm(-4.6,-4.2);palm(4.8,-4);palm(-5.4,2.4);
 const post=(x,z)=>{const grp=new T.Group();grp.position.set(x,0,z);const pm=vb3dMat('#3A3E58',{metal:.4,rough:.6});
  grp.add(vb3dMesh(vb3dG('Cylinder',.06,.09,2.8,8),pm,0,1.4,0),vb3dMesh(vb3dG('Cylinder',.22,.26,.12,8),pm,0,.06,0),vb3dMesh(vb3dG('Box',.3,.38,.3),vb3dMat('#FFE2A0',{emis:'#FFD27A',ei:1.5,tr:1,op:.7}),0,3.0,0,{noCast:1}),vb3dMesh(vb3dG('Cone',.26,.2,4),pm,0,3.28,0,{rot:[0,Math.PI/4,0]}));
  const pl=new T.PointLight(0xFFD08A,18,9,1.8);pl.position.set(0,2.95,0);grp.add(pl);sc.add(grp);return pl};
 const p1=post(-3.4,1.4),p2=post(3.4,1.4);
 // طاولة خشب مستديرة بفانوس وأوراق
 const wm=vb3dMat('#5A3418',{map:wood,rough:.75});
 sc.add(vb3dMesh(vb3dG('Cylinder',1.0,1.0,.08,48),wm,0,.72,0),vb3dMesh(vb3dG('Torus',1.0,.035,10,48),vb3dMat('#3B2412',{rough:.8}),0,.74,0,{rot:[Math.PI/2,0,0],noCast:1}),vb3dMesh(vb3dG('Cylinder',.1,.12,.7,10),wm,0,.35,0),vb3dMesh(vb3dG('Cylinder',.45,.5,.06,20),wm,0,.03,0));
 const brass=vb3dMat('#C9921E',{metal:.95,rough:.2,clear:.35});const lan=new T.Group();lan.position.set(0,.76,0);
 lan.add(vb3dMesh(vb3dG('Cylinder',.13,.15,.04,8),brass,0,.02,0),vb3dMesh(vb3dG('Cylinder',.1,.1,.3,8,1,true),vb3dMat('#FFE2A0',{emis:'#FFC46A',ei:1.8,tr:1,op:.6,side:T.DoubleSide}),0,.19,0,{noCast:1}),vb3dMesh(vb3dG('Cone',.14,.12,8),brass,0,.4,0),vb3dMesh(vb3dG('Torus',.06,.012,6,16),brass,0,.5,0,{noCast:1}));
 for(let k=0;k<6;k++){const a=k/6*Math.PI*2;lan.add(vb3dMesh(vb3dG('Box',.012,.3,.012),brass,Math.cos(a)*.1,.19,Math.sin(a)*.1,{noCast:1}))}sc.add(lan);
 const glow=new T.Sprite(new T.SpriteMaterial({map:vb3dTexGlow(),color:0xFFD9A0,transparent:true,opacity:.6,blending:T.AdditiveBlending,depthWrite:false}));glow.scale.set(1.3,1.3,1);glow.position.set(0,.98,0);sc.add(glow);
 vb3dAo(sc,0,.008,0,1.5);   // ظلّ الطاولة على الحجر
 const paper=vb3dMat('#E9D8B4',{rough:.9});for(let k=0;k<4;k++)sc.add(vb3dMesh(vb3dG('Box',.16,.006,.24),paper,-.45+k*.09,.765+k*.006,.3,{rot:[0,-.3+k*.15,0],noCast:1}));
 sc.add(vb3dMesh(vb3dG('Cylinder',.05,.04,.09,10),vb3dMat('#F4E6C8',{rough:.5}),.55,.8,.25));
 // حبال أضواء معلّقة بين المصابيح
 const bulbM=vb3dMat('#FFE2A0',{emis:'#FFC46A',ei:2.2,rough:.4}),wireM=vb3dMat('#2A2F48',{rough:.9});
 [[-3.4,1.4,3.4,1.4],[-3.4,1.4,-4.6,-4.2],[3.4,1.4,4.8,-4]].forEach(([x1,z1,x2,z2])=>{
  const a=new T.Vector3(x1,2.9,z1),b=new T.Vector3(x2,3.1,z2),m=new T.Vector3((x1+x2)/2,2.2,(z1+z2)/2);
  const cv=new T.QuadraticBezierCurve3(a,m,b);sc.add(vb3dMesh(new T.TubeGeometry(cv,18,.012,5,false),wireM,0,0,0,{noCast:1}));
  for(let k=1;k<8;k++){const pt=cv.getPoint(k/8);sc.add(vb3dMesh(vb3dG('Sphere',.045,10,8),bulbM,pt.x,pt.y-.06,pt.z,{noCast:1}));
   const sp=new T.Sprite(new T.SpriteMaterial({map:vb3dTexGlow(),color:0xFFD9A0,transparent:true,opacity:.42,blending:T.AdditiveBlending,depthWrite:false}));sp.scale.set(.55,.55,1);sp.position.set(pt.x,pt.y-.06,pt.z);sc.add(sp)}});
 // بقع بلاط مبلّل تعكس الضوء
 const wet=new T.MeshPhysicalMaterial({color:new T.Color('#0E1226'),roughness:.12,metalness:.15,clearcoat:1,clearcoatRoughness:.08,transparent:true,opacity:.55});
 [[-1.9,2.4,1.7,1.1],[2.3,2.9,1.3,.9],[-.4,3.6,2.2,1.2]].forEach(([x,z,w,h])=>{const m=vb3dMesh(vb3dG('Plane',w,h),wet,x,.012,z,{rot:[-Math.PI/2,0,0],noCast:1});m.renderOrder=-1;sc.add(m)});
 // ضباب أرضي خفيف
 const mist=vb3dMat('#8FA0D8',{rough:1});mist.transparent=true;mist.opacity=.05;mist.depthWrite=false;mist.blending=T.AdditiveBlending;mist.side=T.DoubleSide;
 for(let k=0;k<3;k++)sc.add(vb3dMesh(vb3dG('Plane',18,1.5),mist,0,.35+k*.3,-4-k*1.5,{noCast:1}));
 sc.fog=new T.FogExp2(0x0B0E22,.05);
 const L={};L.hemi=new T.HemisphereLight(0x8E9AD8,0x241C2A,.8);sc.add(L.hemi);
 L.key=new T.DirectionalLight(0xB9C8FF,1.3);L.key.position.set(-4,7,-2);L.key.castShadow=true;L.key.shadow.mapSize.set(1536,1536);L.key.shadow.radius=3;
 Object.assign(L.key.shadow.camera,{left:-4.5,right:4.5,top:4.5,bottom:-4.5,near:.5,far:16});L.key.shadow.bias=-.0004;L.key.shadow.normalBias=.022;sc.add(L.key);
 L.rim=new T.DirectionalLight(0x9FB4FF,1.2);L.rim.position.set(2.4,3.2,-5);sc.add(L.rim);   // ضوء قمريّ من الخلف يفصل الجالسين عن الليل
 L.lamp=new T.PointLight(0xFFB760,34,10,1.7);L.lamp.position.set(0,1.25,0);sc.add(L.lamp);L.posts=[p1,p2];
 L.fill=new T.DirectionalLight(0xFFD2A8,.7);L.fill.position.set(0,2.6,6);sc.add(L.fill);   // تعبئة دافئة من جهة الكاميرا تُظهر الوجوه ليلًا
 return {L,glow,sky,stars,day:{hemi:.75,key:1.4,lamp:46,post:22,rim:1.05,skyc:'#FFFFFF',starO:.7},night:{hemi:.3,key:.8,lamp:22,post:11,rim:.7,skyc:'#5A6090',starO:1}};
}
/* ── التركيب والتخطيط: نموذج المشهد يصف المقاعد (أسماء، أنا، فارغة، مضيف) وحالاتها — للمسرح ضد الكمبيوتر وللردهة ── */
function vb3dStageModel(kind){const my=VB;return {kind,names:VB.names,me:0,empty:new Set(),host:-1,stage:'vbStage',seats:'#vbSeats .vbSeat',scene:'.vbScene',
 alive:()=>VB===my&&!!document.getElementById('vbStage'),night:()=>!!VB.night,tap:vb3dTap,
 state:i=>{const s=vbSeatState(i);return {dead:!!s.dead,talk:!!s.talk,mark:!!s.mark,pick:!!(VB.pick&&VB.pick.list.includes(i)&&!s.dead),pk:VB.pick&&VB.pick.c||'#E8B23A',
  ready:!!((VB.ready&&VB.ready.has(i))||(i===0&&VB.meReady))&&!VB.voting,sleep:!!VB.night&&!s.dead}}}}
function vb3dMount(kindOrModel){
 const model=typeof kindOrModel==='string'?vb3dStageModel(kindOrModel):kindOrModel;
 vb3dDispose();
 if(!vb3dOk())return false;
 const st=document.getElementById(model.stage);if(!st)return false;
 const T=THREE;let renderer;
 try{renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'})}catch(e){return false}
 const cv=renderer.domElement;cv.className='vb3d';st.insertBefore(cv,st.firstChild);const vig=document.createElement('div');vig.className='vb3dVig';cv.after(vig);
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
 renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;renderer.outputColorSpace=T.SRGBColorSpace;
 const sc=new T.Scene();const cam=new T.PerspectiveCamera(48,1.2,.1,80);
 const kind=model.kind==='mafia'?'mafia':'majlis',n=model.names.length,Rx=1.72+Math.max(0,n-6)*.1,Rz=1.45,room=kind==='mafia'?vb3dRoomSquare(sc):vb3dRoomMajlis(sc);
 sc.environmentIntensity=kind==='mafia'?.1:.2;
 const envIn=()=>{try{if(!VB3.on||!VB3.sc)return;if(!VB3.envTex){const pm=new T.PMREMGenerator(VB3.renderer);VB3.envTex=pm.fromScene(new T.RoomEnvironment(),.04).texture;pm.dispose()}VB3.sc.environment=VB3.envTex;VB3.dirty=true}catch(e){}};
 if(VB3.envTex)sc.environment=VB3.envTex;else (window.requestIdleCallback||(f=>setTimeout(f,600)))(envIn,{timeout:1500});   // الانعكاسات الناعمة تُحسب بعد أول رسم كي لا تتأخّر الغرفة في الظهور
 sc.background=new T.Color(kind==='mafia'?'#0B0E22':room.day.bg);
 const chars=[];const seatH=kind==='mafia'?.5:.15;
 for(let i=0;i<n;i++){const a=i===0?Math.PI/2:Math.PI+((i-1)/Math.max(1,n-2))*Math.PI,x=i===0?0:Math.cos(a)*Rx,z=i===0?Rz+.55:Math.sin(a)*Rz,empty=model.empty.has(i);
  const seat=new T.Group();seat.position.set(x,0,z);seat.rotation.y=Math.atan2(-x,-z);sc.add(seat);
  if(kind==='mafia'){const cm=vb3dMat('#4A2C16',{map:vb3dTexWood(),rough:.75});
   seat.add(vb3dMesh(vb3dG('Cylinder',.3,.3,.06,36),cm,0,.47,0),vb3dMesh(vb3dG('Torus',.3,.02,10,36),cm,0,.47,0,{rot:[Math.PI/2,0,0],noCast:1}));
   [-1,1].forEach(sx=>seat.add(vb3dMesh(vb3dG('Capsule',.022,.52,3,6),cm,sx*.23,.78,-.25)));
   [.62,.76,.9].forEach(y=>seat.add(vb3dMesh(vb3dG('Capsule',.014,.42,2,6),cm,0,y,-.25,{rot:[0,0,Math.PI/2],noCast:1})));
   [[-.22,-.2],[.22,-.2],[-.22,.2],[.22,.2]].forEach(([lx,lz])=>seat.add(vb3dMesh(vb3dG('Capsule',.024,.42,3,6),cm,lx,.23,lz)))}
  else{const cc=empty?VB3_COL.cushion[i%5]:vb3dLook(i,model).cushion;seat.add(vb3dMesh(vb3dG('Sphere',.5,36,22),vb3dMat(cc,{rough:.95}),0,.03,0,{sc:[1,.34,1]}));
   seat.add(vb3dMesh(vb3dG('Cylinder',.48,.48,.1,36,1,true),vb3dMat('#fff',{map:vb3dTexSadu(),rough:.95,side:T.DoubleSide}),0,.06,0,{noCast:1}))}
  vb3dAo(seat,0,.006,.05,.62);   // ظلّ التماس تحت الجالس
  const ringM=new T.MeshBasicMaterial({color:0xE8B23A,transparent:true,opacity:0,depthWrite:false});const ring=vb3dMesh(vb3dG('Ring',.5,.62,28),ringM,0,.012,0,{rot:[-Math.PI/2,0,0],noCast:1});seat.add(ring);
  let ch=null,hit=null;
  if(!empty){ch=vb3dChar(vb3dLook(i,model),kind==='mafia'?'chair':'floor');ch.position.y=seatH;seat.add(ch);
   hit=vb3dMesh(vb3dG('Capsule',.42,.9,2,6),new T.MeshBasicMaterial({visible:false}),0,seatH+.55,.05,{noCast:1});hit.userData.seat=i;seat.add(hit)}
  chars.push({i,seat,ch,ring,ringM,hit,empty,u:ch?ch.userData:null,st:{},v:{talk:0,dead:0,sleep:0,pick:0,mark:0,point:0,ready:0,yaw:0},pt:null,ptT:0,headY:seatH+.99});
 }
 const spot=new T.SpotLight(0xFFE0A8,0,9,.55,.6,1.5);spot.position.set(0,3.4,.4);spot.target.position.set(0,.8,0);sc.add(spot,spot.target);
 const camY=2.85+Math.max(0,n-8)*.14,camZ=Rz+2.85+Math.max(0,n-8)*.3;cam.position.set(0,camY,camZ);cam.lookAt(0,.45,-.45);
 const ray=new T.Raycaster(),ptr=new T.Vector2();
 cv.addEventListener('pointerdown',e=>{if(!VB3.on)return;const r=cv.getBoundingClientRect();ptr.set(((e.clientX-r.left)/r.width)*2-1,-((e.clientY-r.top)/r.height)*2+1);ray.setFromCamera(ptr,cam);
  const hits=ray.intersectObjects(VB3.chars.filter(c=>c.hit).map(c=>c.hit),false);if(hits.length){const i=hits[0].object.userData.seat;VB3.tapAt=Date.now();VB3.model.tap(i)}});
 VB3.on=true;Object.assign(VB3,{model,kind,renderer,cv,sc,cam,room,chars,spot,n,camY,last:0,t0:performance.now(),lightK:model.night()?0:1,lobby:!!model.lobby,
  rm:!!(window.matchMedia&&matchMedia('(prefers-reduced-motion:reduce)').matches)});
 vb3dResize();
 if(window.ResizeObserver){VB3.ro=new ResizeObserver(()=>vb3dResize());VB3.ro.observe(st)}
 const s=document.querySelector(model.scene);if(s)s.classList.add('is3d');
 vb3dSync();
 VB3.comp=null;
 if(!window.__vbNoFx&&!(navigator.hardwareConcurrency&&navigator.hardwareConcurrency<=3)){
  try{const comp=new T.EffectComposer(renderer);comp.addPass(new T.RenderPass(sc,cam));
   comp.addPass(new T.OutputPass());
   const bl=new T.UnrealBloomPass(new T.Vector2(VB3.w||360,VB3.h||300),kind==='mafia'?.3:.22,.4,.97);   // التوهّج بعد التدرّج اللوني وعلى أشدّ المواضع سطوعًا فقط (الفوانيس والمصابيح)
   comp.addPass(bl);
   const sm=new T.SMAAPass();comp.addPass(sm);VB3.comp=comp;VB3.bloom=bl;vb3dResize()}catch(e){VB3.comp=null}
 }
 VB3.raf=requestAnimationFrame(vb3dLoop);
 return true;
}
/** ردهة الغرفة: المجلس نفسه بمن دخل، ومقاعد فارغة لمن لم يدخل بعد، وتاج للمضيف — يُعاد استخدام القماش إن لم يتغيّر المجلس */
function vb3dMountLobby(seats,game){
 if(!vb3dOk())return false;
 const st=document.getElementById('rmStage');if(!st)return false;
 const names=seats.map(p=>p?p.name:''),avs=seats.map(p=>p&&p.av||null),sig=game+'|'+names.join('|')+'|'+seats.map(p=>p&&p.host?1:0).join('')+'|'+seats.map(p=>p&&p.me?1:0).join('')+'|'+JSON.stringify(avs);
 if(VB3.on&&VB3.lobby&&VB3.sig===sig&&VB3.cv){st.insertBefore(VB3.cv,st.firstChild);const vg=VB3.cv.nextSibling;if(!vg||vg.className!=='vb3dVig'){const d=document.createElement('div');d.className='vb3dVig';VB3.cv.after(d)}const s=st.closest('.rmRing');if(s)s.classList.add('is3d');VB3.anch=null;vb3dResize();return true}
 const model={kind:game==='mafia'?'mafia':'majlis',names,avs,me:seats.findIndex(p=>p&&p.me),host:seats.findIndex(p=>p&&p.host),empty:new Set(seats.map((p,i)=>p?-1:i).filter(i=>i>=0)),
  stage:'rmStage',seats:'.rmRing .rmSeat',scene:'.rmRing',lobby:true,alive:()=>!!document.getElementById('rmStage'),night:()=>false,state:i=>({}),tap:i=>{}};
 const ok=vb3dMount(model);if(ok)VB3.sig=sig;return ok;
}
function vb3dTap(i){if(!VB)return;const st=vbSeatState(i);if(VB.pick&&VB.pick.list.includes(i)&&!st.dead){const f=window[VB.pick.cb];if(typeof f==='function')return f(i)}vbPlayerSheet(i)}
function vb3dResize(){
 if(!VB3.on)return;const st=document.getElementById(VB3.model.stage);if(!st)return;
 const w=st.clientWidth||360,h=st.clientHeight||300;VB3.w=w;VB3.h=h;
 VB3.renderer.setSize(w,h,false);if(VB3.comp){const dpr=VB3.renderer.getPixelRatio();VB3.comp.setSize(w,h);VB3.comp.setPixelRatio&&VB3.comp.setPixelRatio(dpr)}VB3.cam.aspect=w/h;VB3.cam.updateProjectionMatrix();
 VB3.anch=null;vb3dLayout();
}
/** موضع رأس كل مقعد على المسرح بالنسبة المئوية (لمواضع عناصر المقاعد والبطاقات الطائرة) */
function vb3dAnchors(){
 if(VB3.anch)return VB3.anch;const v=new THREE.Vector3();
 VB3.anch=VB3.chars.map(c=>{if(c.u)c.u.head.getWorldPosition(v);else{v.set(0,c.headY,.03);c.seat.localToWorld(v)}v.y+=.04;v.project(VB3.cam);return {x:(v.x*.5+.5)*100,y:(-v.y*.5+.5)*100}});
 return VB3.anch;
}
function vb3dSeatPct(i){if(!VB3.on||VB3.lobby||!VB3.chars[i])return null;return vb3dAnchors()[i]}
/** يضع عناصر المقاعد (DOM) فوق رؤوس الشخصيات */
function vb3dLayout(){
 if(!VB3.on)return;const a=vb3dAnchors();
 document.querySelectorAll(VB3.model.seats).forEach(el=>{const i=+el.dataset.seat;if(!a[i])return;el.style.left=a[i].x.toFixed(1)+'%';el.style.top=a[i].y.toFixed(1)+'%'});
}
/** فقاعة كلام فوق رأس المتكلّم لثوانٍ — فقاعة آليّ واحدة في كل مرّة (فقاعتك تبقى) */
function vb3dBubble(i,text){
 if(!VB3.on||VB3.lobby||text==null)return;const st=document.getElementById(VB3.model.stage),a=vb3dAnchors()[i];if(!st||!a)return;
 st.querySelectorAll('.vb3dBub').forEach(o=>{if(i!==0||+o.dataset.seat===0)o.remove()});
 const el=document.createElement('div');el.className='vb3dBub'+(i===0?' me':'');el.dataset.seat=String(i);el.textContent=String(text).length>70?String(text).slice(0,68)+'…':String(text);
 const w=VB3.w||st.clientWidth,hh=VB3.h||st.clientHeight;el.style.left=Math.min(w-82,Math.max(82,a.x/100*w)).toFixed(0)+'px';st.appendChild(el);
 const bh=el.offsetHeight||40;el.style.top=Math.max(4,Math.min(hh-bh-4,a.y/100*hh-(i===0?22:30)-bh)).toFixed(0)+'px';
 clearTimeout(el._t);el._t=setTimeout(()=>{el.classList.add('out');setTimeout(()=>el.remove(),350)},3600);
}
/** إشارة باليد نحو لاعب (اتهام أو تصويت) */
function vb3dPoint(i,t){if(!VB3.on||i==null||t==null||i===t||!VB3.chars[i]||!VB3.chars[t]||!VB3.chars[i].u)return;const c=VB3.chars[i];c.pt=t;c.ptT=performance.now()+1900}
function vb3dNight(on){}
/** يقرأ حالة المقاعد من اللعبة (ميت/يتكلم/مختار/معلَّم/ليل/جاهز) — يُستدعى مع كل vbSeats() */
function vb3dSync(){if(!VB3.on)return;VB3.chars.forEach(c=>{c.st=VB3.model.state(c.i)||{}})}
function vb3dLoop(now){
 if(!VB3.on)return;VB3.raf=requestAnimationFrame(vb3dLoop);
 if(!VB3.cv.isConnected||!VB3.model.alive()){vb3dDispose();return}
 if(document.hidden||now-VB3.last<33)return;
 const dt=Math.min(.1,(now-VB3.last)/1000||.033);VB3.last=now;const t=(now-VB3.t0)/1000,calm=VB3.rm?0:1;
 const T=THREE,tmp=VB3._t1||(VB3._t1=new T.Vector3()),tmp2=VB3._t2||(VB3._t2=new T.Vector3());const lerp=(a,b,k)=>a+(b-a)*Math.min(1,k);
 const talker=VB3.chars.find(c=>c.st.talk&&c.u);
 VB3.chars.forEach(c=>{const s=c.st,v=c.v,u=c.u;
  v.pick=lerp(v.pick,s.pick?1:0,dt*6);v.mark=lerp(v.mark,s.mark?1:0,dt*4);
  const pk=c.empty?.28+.12*Math.sin(t*2+c.i):Math.max(v.pick,v.mark);
  if(pk>.01){c.ringM.color.set(v.mark>v.pick?'#E24B4A':(s.pk||'#E8B23A'));c.ringM.opacity=c.empty?pk:pk*(.55+.4*Math.sin(t*5));c.ring.scale.setScalar(c.empty?1:1+.06*Math.sin(t*5))}else c.ringM.opacity=0;
  if(!u)return;
  v.talk=lerp(v.talk,s.talk?1:0,dt*8);v.dead=lerp(v.dead,s.dead?1:0,dt*2.2);v.sleep=lerp(v.sleep,s.sleep?1:0,dt*3);v.ready=lerp(v.ready,s.ready?1:0,dt*5);
  u.body.scale.y=1+Math.sin(t*1.7+c.i)*.012*(1-v.dead)*calm;
  c.ch.rotation.x=v.dead*.32;c.ch.position.y=(VB3.kind==='mafia'?.5:.15)-v.dead*.05;
  let yaw=0;if(talker&&talker!==c&&!s.dead&&!s.sleep){talker.u.head.getWorldPosition(tmp);c.seat.worldToLocal(tmp);yaw=Math.max(-.7,Math.min(.7,Math.atan2(tmp.x,tmp.z)))}
  if(c.pt!=null&&now<c.ptT&&VB3.chars[c.pt]){VB3.chars[c.pt].seat.getWorldPosition(tmp);c.seat.worldToLocal(tmp);yaw=Math.max(-.9,Math.min(.9,Math.atan2(tmp.x,tmp.z)))}
  v.yaw=lerp(v.yaw,yaw,dt*5);u.head.rotation.y=v.yaw;
  u.head.rotation.x=v.sleep*.38+v.dead*.55+Math.sin(t*6.5)*.045*v.talk+Math.sin(t*.9+c.i*2)*.015*(1-v.sleep-v.dead)*calm;
  u.head.rotation.z=Math.sin(t*.7+c.i)*.02*(1-v.sleep)*calm;
  u.open.scale.y=.05+Math.max(0,Math.sin(t*15+c.i))*.9*v.talk;u.mouth.position.y=-.1-.012*v.talk;
  let blink=0;if(now>u.blinkAt){const k=(now-u.blinkAt)/170;if(k<1)blink=Math.sin(k*Math.PI);else u.blinkAt=now+2200+Math.random()*4200}
  const shut=Math.min(1,Math.max(v.sleep,v.dead)*1+blink);u.eyes.forEach(e=>{if(!e.closed)e.lid.scale.y=1+1.5*shut});
  const r=u.arms.r;let el=r.rest.el,hd=r.rest.hd;
  if(c.pt!=null&&now<c.ptT&&VB3.chars[c.pt]){VB3.chars[c.pt].seat.getWorldPosition(tmp);tmp.y+=c.headY;c.ch.worldToLocal(tmp);tmp2.subVectors(tmp,r.sh).normalize();el=r.sh.clone().addScaledVector(tmp2,.33);hd=el.clone().addScaledVector(tmp2,.3);v.point=lerp(v.point,1,dt*7)}
  else if(v.ready>.02&&!s.dead){el=new T.Vector3(r.sh.x+.16,r.sh.y+.2,r.sh.z+.08);hd=new T.Vector3(r.sh.x+.14,r.sh.y+.52,r.sh.z+.1);v.point=lerp(v.point,v.ready,dt*6)}
  else{v.point=lerp(v.point,0,dt*5);if(c.pt!=null&&now>=c.ptT)c.pt=null}
  if(v.point>.01||c._armMoved){const e2=r.rest.el.clone().lerp(el,v.point),h2=r.rest.hd.clone().lerp(hd,v.point);vb3dAim(r.up,r.sh,e2);vb3dAim(r.lo,e2,h2);r.hand.position.copy(h2);r.hand.quaternion.setFromUnitVectors(VB3._z||(VB3._z=new T.Vector3(0,0,1)),tmp2.subVectors(h2,e2).normalize());c._armMoved=v.point>.01}
  const g=v.dead;if(g>.001||c._grey){u.mats.forEach(m=>{const b=m.userData.base;const l=(b.r+b.g+b.b)/3;m.color.setRGB(b.r+(l-b.r)*g*.9,b.g+(l-b.g)*g*.9,b.b+(l-b.b)*g*.9);m.opacity=1-g*.5});c._grey=g>.001}
 });
 const R=VB3.room,L=R.L,night=VB3.model.night();VB3.lightK=lerp(VB3.lightK,night?0:1,dt*2.2);const k=VB3.lightK,mix=(a,b)=>b+(a-b)*k;
 L.hemi.intensity=mix(R.day.hemi,R.night.hemi);L.key.intensity=mix(R.day.key,R.night.key);L.lamp.intensity=mix(R.day.lamp,R.night.lamp);
 if(L.rim)L.rim.intensity=mix(R.day.rim,R.night.rim);
 if(L.sconce)L.sconce.forEach(p=>p.intensity=mix(R.day.sconce,R.night.sconce));
 if(L.posts)L.posts.forEach(p=>p.intensity=mix(R.day.post,R.night.post));
 if(R.sky){R.sky.material.color.set(R.night.skyc).lerp(VB3._c||(VB3._c=new T.Color()).set(R.day.skyc),k);R.stars.material.opacity=mix(R.day.starO,R.night.starO)}
 else{VB3.sc.background.set(R.night.bg).lerp((VB3._c||(VB3._c=new T.Color())).set(R.day.bg),k);if(L.warm)L.warm.intensity=mix(10,2)}
 R.glow.material.opacity=mix(.55,.35)+Math.sin(t*3)*.05*calm;
 const sp=VB3.spot;if(talker&&!night){talker.u.head.getWorldPosition(tmp);sp.target.position.lerp(tmp,Math.min(1,dt*6));sp.intensity=lerp(sp.intensity,22,dt*4)}else sp.intensity=lerp(sp.intensity,0,dt*4);
 if(!VB3.camLock){VB3.cam.position.x=Math.sin(t*.23)*.035*calm;VB3.cam.position.y=VB3.camY+Math.sin(t*.31)*.02*calm;VB3.cam.lookAt(0,.45,-.45)}
 if(VB3.comp)VB3.comp.render();else VB3.renderer.render(VB3.sc,VB3.cam);
}
function vb3dDispose(){
 if(!VB3.on)return;VB3.on=false;VB3.lobby=false;VB3.sig=null;
 try{if(VB3.comp&&VB3.comp.dispose)VB3.comp.dispose()}catch(e){}VB3.comp=null;VB3.bloom=null;

 if(VB3.raf)cancelAnimationFrame(VB3.raf);VB3.raf=null;if(VB3.ro){try{VB3.ro.disconnect()}catch(e){}VB3.ro=null}
 try{const keep=Object.values(VB3.tex);VB3.sc.traverse(o=>{if(o.geometry&&!o.geometry.userData.shared)o.geometry.dispose();if(o.material){const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>{if(m.map&&!keep.includes(m.map))m.map.dispose();m.dispose()})}});VB3.renderer.dispose()}catch(e){}
 if(VB3.cv&&VB3.cv.parentNode)VB3.cv.remove();
 const s=VB3.model&&document.querySelector(VB3.model.scene);if(s)s.classList.remove('is3d');
 VB3.sc=VB3.cam=VB3.renderer=VB3.cv=VB3.model=null;VB3.chars=[];VB3.anch=null;
}
