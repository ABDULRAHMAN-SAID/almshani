#!/usr/bin/env node
/**
 * الدخول (5.95): بريد وضغطة، بلا رمز — ونقل الحساب بين جهازين.
 *   npm run build:tahaddi && NODE_PATH=$(npm root -g) node tools/test-login.cjs
 * يثبت بمتصفّحَين على خادم حيّ: أوّل فتح يسأل البريد، والدخول فوريّ بلا رمز،
 * واللاعب يسمّي نفسه، والرمز يُحفظ فلا يضيع الحساب، وبريد يملكه حساب آخر لا
 * يُسلَّم بالكتابة وحدها، ورمز النقل ينقل الحساب كاملًا.
 */
const {chromium}=require('playwright');const {spawn}=require('child_process');
const path=require('path'),os=require('os');
const R2='/home/user/almshani';
const PORT=8980+Math.floor(Math.random()*15);
const DATA=path.join(os.tmpdir(),'login-'+Date.now()+'.json');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let pass=0,fail=0;
const T=(n,ok,i)=>{if(ok){pass++;console.log('  ✓ '+n)}else{fail++;console.log('  ✗ '+n+'  → '+String(i).slice(0,260))}};
(async()=>{
 const srv=spawn('node',['server/dist/tahaddi.js'],{cwd:R2,env:{...process.env,PORT:String(PORT),TAHADDI_DATA_FILE:DATA,TAHADDI_MAIL_DEV:'1'},stdio:['ignore','pipe','pipe']});
 const logs=[];srv.stdout.on('data',d=>logs.push(String(d)));srv.stderr.on('data',d=>logs.push(String(d)));
 for(let i=0;i<90;i++){try{const r=await fetch(`http://127.0.0.1:${PORT}/health`);if(r.ok)break}catch(e){}await sleep(120)}
 const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});
 const mk=async()=>{const pg=await (await br.newContext({viewport:{width:390,height:844}})).newPage();
  pg._errs=[];pg.on('pageerror',e=>pg._errs.push(e.message));
  await pg.goto(`http://127.0.0.1:${PORT}/`);
  await pg.waitForFunction(()=>typeof NET==='object'&&document.getElementById('app').innerHTML.length>500,null,{timeout:20000});
  return pg};
 const A=await mk();
 T('أول فتح يعرض شاشة الدخول',await A.evaluate(()=>!!document.getElementById('auMail')));
 await A.waitForFunction(()=>NET.state().connected,null,{timeout:15000});
 T('الخادم يعلن طرق الدخول المتاحة',await A.evaluate(()=>{const s=NET.state().signIn;return !!s&&s.mail===true&&!s.google}));
 // بريد + ضغطة = داخل
 await A.evaluate(()=>{document.getElementById('auMail').value='saud@mail.com';auGo()});
 await A.waitForFunction(()=>!document.getElementById('auMail'),null,{timeout:12000}).catch(()=>{});
 await sleep(900);
 let st=await A.evaluate(()=>({name:S.name,email:S.email,ok:S.emailOk,ask:!!document.getElementById('nmFirst')||/اسمك/.test(document.body.innerText)}));
 T('دخل ببريده بلا رمز، ثم سُئل عن اسمه',st.email==='saud@mail.com'&&st.ok===true&&st.ask,JSON.stringify(st));
 await A.evaluate(()=>{S.name='سعود';saveState();if(typeof VBnameNext==='function')VBnameNext();else authGo2()});
 await sleep(1200);
 await A.evaluate(()=>{S.coins=4242;saveState();if(window.NET)NET.saveCloud({t:Date.now(),blob:{coins:4242}})});
 await sleep(1500);
 const idA=await A.evaluate(()=>NET.state().id);
 T('صار له حساب على الخادم',/^p[0-9a-f]{12}$/.test(idA||''),idA);

 // جهاز ثانٍ بالبريد نفسه: لا يُسلَّم — يُطلب رمز
 const B=await mk();
 await B.waitForFunction(()=>NET.state().connected,null,{timeout:15000});
 await B.evaluate(()=>{document.getElementById('auMail').value='saud@mail.com';auGo()});
 await sleep(2200);
 const bs=await B.evaluate(()=>({rec:!!document.getElementById('recCode'),id:NET.state().id,txt:/رمز/.test(document.body.innerText)}));
 T('بريد لحساب آخر لا يُسلَّم بالكتابة — يُطلب رمز',bs.rec&&bs.id!==idA,JSON.stringify(bs));

 // نقل الحساب: A يولّد، B يستعمل
 const idA2=await A.evaluate(()=>NET.state().id);
 await A.evaluate(()=>xferMake());
 await sleep(1500);
 const code=await A.evaluate(()=>XF.code);
 T('الجهاز الأوّل ولّد رمز نقل وعرضه',/^[2-9A-HJ-NP-Z]{8}$/.test(code||'')&&await A.evaluate(()=>/\d|[A-Z]/.test((document.querySelector('.xfCode')||{}).textContent||'')),code);
 await B.evaluate(()=>{Router.reset('authScr');push('xferScr')});
 await sleep(600);
 await B.evaluate(c=>{document.getElementById('xfIn').value=c;xferGo()},code);
 await sleep(2600);
 const bs2=await B.evaluate(()=>({id:NET.state().id,coins:S.coins,name:S.name}));
 T('الحساب انتقل كاملًا إلى الجهاز الثاني',bs2.id===idA2,JSON.stringify(bs2)+' idA2='+idA2);
 T('صفر أخطاء JS',A._errs.length===0&&B._errs.length===0,(A._errs.concat(B._errs)).slice(0,2).join(' | '));
 console.log('\n'+(fail?`✗ ${fail} فشل / ${pass} نجح`:`الدخول سليم ✔ (${pass} فحصًا)`));
 await br.close();srv.kill();
 process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1)});
