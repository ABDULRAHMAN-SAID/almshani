/** فحص التحكّم: كل زرّ في الواجهة يجب أن يستدعي دالّة موجودة فعلًا.
    الزرّ الذي يستدعي دالّة غير معرّفة لا يفعل شيئًا — والمستخدم يظنّ اللعبة معلّقة. */
const fs=require('fs');
const src=fs.readFileSync(__dirname+'/../tahaddi/index.html','utf8');

// أسماء الدوالّ المعرّفة
const defined=new Set();
for(const m of src.matchAll(/^\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/gm))defined.add(m[1]);
for(const m of src.matchAll(/^\s*(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\([^)]*\)\s*=>|function)/gm))defined.add(m[1]);
for(const m of src.matchAll(/window\.([A-Za-z_$][\w$]*)\s*=/g))defined.add(m[1]);
// كائنات عامّة تُستدعى كـ Obj.method(...)
const objs=new Set();
for(const m of src.matchAll(/^\s*(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*[{[]/gm))objs.add(m[1]);
for(const n of ['Math','JSON','Object','Array','String','Number','Date','console','document','window','history','location','navigator','localStorage'])objs.add(n);

const BUILTIN=new Set(['alert','confirm','prompt','setTimeout','setInterval','clearTimeout','clearInterval',
 'parseInt','parseFloat','isNaN','encodeURIComponent','decodeURIComponent','fetch','requestAnimationFrame','open','print','close','reload','focus','blur','stopPropagation','preventDefault']);

const bad=[],seen=new Set();
// كل onclick/onchange/oninput/onsubmit في القوالب النصّية أو الترميز
const RE=/\bon(click|change|input|submit|keydown|keyup|focus|blur|touchstart|pointerdown)\s*=\s*(["'`])([\s\S]*?)\2/g;
let m,total=0;
while((m=RE.exec(src))){
 const body=m[3];total++;
 // استدعاءات الدوالّ في النصّ
 for(const c of body.matchAll(/(?:^|[^.\w$])([A-Za-z_$][\w$]*)\s*\(/g)){
  const fn=c[1];
  if(BUILTIN.has(fn)||objs.has(fn)||defined.has(fn))continue;
  if(/^(if|for|while|switch|catch|return|typeof|function|new|else|do|try)$/.test(fn))continue;
  if(/\$\{[^}]*$/.test(body.slice(0,c.index)))continue;   // داخل قالب ديناميكي: الاسم يُركَّب وقت التشغيل
  const line=src.slice(0,m.index).split('\n').length;
  const key=fn+'@'+line;
  if(seen.has(key))continue;seen.add(key);
  bad.push({fn,line,snippet:body.slice(0,70).replace(/\s+/g,' ')});
 }
}
console.log('عناصر تحكّم مفحوصة: '+total+' · دوالّ معرّفة: '+defined.size);
if(!bad.length){console.log('✓ كل زرّ يستدعي دالّة موجودة');process.exit(0)}
console.log('\n✗ '+bad.length+' استدعاء لا دالّة له:');
bad.forEach(b=>console.log('  index.html:'+b.line+'  '+b.fn+'()   ← '+b.snippet));
process.exit(1);
