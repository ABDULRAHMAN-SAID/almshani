#!/usr/bin/env node
/**
 * خادم تحدّي — اختبار حقيقي عبر WebSocket: حسابات، حفظ سحابي، نتائج متحقَّق منها،
 * لوحة صدارة، تتابع غرف، وبقاء البيانات بعد إعادة التشغيل.
 *   npm run build:tahaddi && node tools/test-tahaddi-server.cjs
 */
const {spawn}=require('child_process');
const fs=require('fs'),path=require('path'),os=require('os');
const WebSocket=require('ws');
const ROOT=path.join(__dirname,'..');
const PORT=8700+Math.floor(Math.random()*200);
const DATA=path.join(os.tmpdir(),'tahaddi-test-'+Date.now()+'.json');
let pass=0,fail=0;
const check=(n,ok,info)=>{if(ok){pass++;console.log('  ✓ '+n)}else{fail++;console.log('  ✗ '+n+(info?'  → '+String(info).slice(0,240):''))}};
const sec=t=>console.log('\n── '+t+' ──');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

function startServer(){
 const p=spawn('node',['server/dist/tahaddi.js'],{cwd:ROOT,env:{...process.env,PORT:String(PORT),TAHADDI_DATA_FILE:DATA,TAHADDI_RESULT_WAIT_MS:'1200',TAHADDI_SWEEP_MS:'300',TAHADDI_IAP_TEST_SECRET:'t3st-secret'},stdio:['ignore','pipe','pipe']});
 p.logs=[];p.stdout.on('data',d=>p.logs.push(String(d)));p.stderr.on('data',d=>p.logs.push('ERR '+String(d)));
 return p;
}
/** عميل صغير: طلبات بوعود، وبثّ يُجمع في صناديق */
function client(){
 const ws=new WebSocket(`ws://localhost:${PORT}/ws`);
 const c={ws,rid:0,waiting:{},peers:[],msgs:[],finals:[],welcome:null};
 ws.on('message',raw=>{const m=JSON.parse(String(raw));
  if(m.t==='welcome')c.welcome=m;
  if(m.t==='peers')c.peers=m.list;
  if(m.t==='msg')c.msgs.push(m);
  if(m.t==='resultFinal')c.finals.push(m);
  if(m.rid&&c.waiting[m.rid]){const w=c.waiting[m.rid];delete c.waiting[m.rid];w(m)}});
 c.open=new Promise(r=>ws.on('open',r));
 c.req=m=>new Promise(r=>{m.rid='r'+(++c.rid);c.waiting[m.rid]=r;ws.send(JSON.stringify(m))});
 c.send=m=>ws.send(JSON.stringify(m));
 c.close=()=>new Promise(r=>{ws.on('close',r);ws.close()});
 return c;
}
async function hello(c,token,name){await c.open;return c.req({t:'hello',token,name})}

(async()=>{
 let server=startServer();await sleep(700);
 try{
  sec('الحساب');
  const A=client(),B=client();
  const wa=await hello(A,undefined,'عبدالرحمن'),wb=await hello(B,undefined,'x');
  check('ترحيب برمز وهوية ثابتة وستّ رتب',wa.t==='welcome'&&wa.token.length===32&&/^p[0-9a-f]+$/.test(wa.id)&&Object.keys(wa.ranks).length===6,JSON.stringify(wa).slice(0,200));
  check('الاسم يُنظَّف: القصير يُستبدل باسم افتراضي',wb.name.startsWith('لاعب-'),wb.name);
  const A2=client();const wa2=await hello(A2,wa.token);
  check('الرمز نفسه = الحساب نفسه من جهاز آخر',wa2.id===wa.id&&wa2.name==='عبدالرحمن');
  await A2.close();
  const ns=await A.req({t:'setName',name:'  عبد<script>الرحمن  '});
  check('تغيير الاسم يُنظَّف من الوسوم',ns.t==='nameSet'&&ns.name==='عبدالرحمن');

  sec('الحفظ السحابي');
  const sv=await A.req({t:'saveCloud',save:{t:123,blob:{coins:500,name:'x',gameRanks:{carrom:{tier:9,rp:100}},ranked:{tier:9}}}});
  const ld=await A.req({t:'loadCloud'});
  check('الحفظ يعود كما أُرسل — إلا الرتب فلا تُؤخذ من الهاتف أبدًا',sv.t==='cloudSaved'&&ld.save.t===123&&ld.save.blob.coins===500&&!ld.save.blob.gameRanks&&!ld.save.blob.ranked&&ld.ranks.carrom.tier===0,JSON.stringify(ld).slice(0,200));
  const big=await A.req({t:'saveCloud',save:{t:1,blob:{x:'a'.repeat(300*1024)}}});
  check('حفظ أكبر من 256 كيلوبايت يُرفض',big.t==='error'&&big.code==='save_too_big');
  const ldB=await B.req({t:'loadCloud'});
  check('حساب بلا حفظ يعود بـnull',ldB.save===null);

  sec('النتائج المصنّفة — تقارير الطرفين');
  const rep=(c,w,mid,won)=>c.req({t:'submitResult',report:{matchId:mid,gameId:'carrom',mode:'ranked',result:{won},participants:[wa.id,wb.id]}});
  const r1=await rep(A,wa,'m1',true);
  check('التقرير الأول ينتظر الطرف الآخر',r1.status==='pending',JSON.stringify(r1));
  const r2=await rep(B,wb,'m1',false);
  await sleep(50);
  check('اتّفاق الطرفين يُطبَّق: فائز يكسب MMR وخاسر يخسره',r2.status==='applied'&&r2.profile.mmr<1000&&r2.profile.losses===1&&r2.delta&&r2.delta.applied,JSON.stringify(r2).slice(0,200));
  check('الطرف الأول يُبلَّغ بالنتيجة النهائية',A.finals.length===1&&A.finals[0].status==='applied'&&A.finals[0].profile.mmr>1000&&A.finals[0].profile.wins===1,JSON.stringify(A.finals));
  const dup=await rep(A,wa,'m1',true);
  check('المعرّف نفسه لا يُحتسب مرّتين',dup.status==='ignored');
  const d1=await rep(A,wa,'m2',true);const d2=await rep(B,wb,'m2',true);await sleep(50);
  check('فائزان في مباراة واحدة = تقارير متناقضة: لا نقاط لأحد',d2.status==='disputed'&&d2.profile.wins===0&&A.finals[1].status==='disputed',JSON.stringify(d2).slice(0,160));
  const d3=await rep(A,wa,'m2',true);
  check('المباراة المتنازَع عليها تُختم فلا تُقدَّم من جديد',d3.status==='ignored');
  const solo=await A.req({t:'submitResult',report:{matchId:'s1',gameId:'carrom',mode:'bot',result:{won:true},participants:[wa.id]}});
  check('مباراة الكمبيوتر: إتقان فورًا بلا نقاط',solo.status==='applied'&&solo.profile.masteryXp>0&&solo.profile.wins===1);
  const fake=await A.req({t:'submitResult',report:{matchId:'f1',gameId:'carrom',mode:'ranked',result:{won:true},participants:[wa.id,'pdeadbeef']}});
  check('مشارك وهمي يُرفض',fake.t==='error'&&fake.code==='bad_participants');
  const cheat=await A.req({t:'submitResult',report:{matchId:'c1',gameId:'carrom',mode:'ranked',result:{won:true,mmr:9999},participants:[wa.id,wb.id]}});
  check('MMR في التقرير يُتجاهل — الخصم يُقرأ من الخادم',cheat.status==='pending');
  await sleep(1800);
  check('انتهاء مهلة الطرف الغائب: لا نقاط وإبلاغ «ناقصة»',A.finals.some(f=>f.matchId==='c1'&&f.status==='incomplete'),JSON.stringify(A.finals.map(f=>[f.matchId,f.status])));
  // أونو: ترتيب مكرّر
  const u1=await A.req({t:'submitResult',report:{matchId:'u1',gameId:'uno',mode:'ranked',result:{place:1,total:2},participants:[wa.id,wb.id]}});
  const u2=await B.req({t:'submitResult',report:{matchId:'u1',gameId:'uno',mode:'ranked',result:{place:1,total:2},participants:[wa.id,wb.id]}});
  check('أونو: مركزان أوّلان = متناقض',u2.status==='disputed');
  const u3=await A.req({t:'submitResult',report:{matchId:'u2',gameId:'uno',mode:'ranked',result:{place:1,total:2},participants:[wa.id,wb.id]}});
  const u4=await B.req({t:'submitResult',report:{matchId:'u2',gameId:'uno',mode:'ranked',result:{place:2,total:2},participants:[wa.id,wb.id]}});
  check('أونو: ترتيب سليم يُطبَّق',u4.status==='applied'&&u4.profile.losses===1);

  sec('لوحة الصدارة');
  const lb=await A.req({t:'leaderboard',gameId:'carrom',limit:10});
  check('صفوف حقيقية من الخادم وترتيبي فيها',lb.t==='leaderboard'&&lb.rows.length===2&&lb.me&&lb.me.rank===1&&lb.rows[0].id===wa.id,JSON.stringify(lb).slice(0,200));
  const lbx=await A.req({t:'leaderboard',gameId:'nope'});
  check('لعبة مجهولة تُرفض',lbx.t==='error');

  sec('الغرف: حضور وبثّ');
  A.send({t:'presence',patch:{pc:'ABCD',nm:'عبدالرحمن',hs:1}});await sleep(80);
  check('حضوري يصل للجميع مع هوية الحساب',B.peers.some(p=>p.by===wa.id&&p.presence.pc==='ABCD'&&p.presence.hs===1),JSON.stringify(B.peers));
  A.send({t:'presence',patch:{hs:null}});await sleep(80);
  check('null يحذف الحقل',B.peers.find(p=>p.by===wa.id).presence.hs===undefined);
  B.send({t:'emit',topic:'party',data:{c:'ABCD',t:'start'}});await sleep(80);
  check('البثّ يصل للكلّ والمرسل يسمع نفسه',A.msgs.length===1&&A.msgs[0].from.by===wb.id&&B.msgs.length===1&&B.msgs[0].data.t==='start');
  B.send({t:'emit',topic:'Bad:topic',data:{}});await sleep(50);
  check('موضوع مخالف للصيغة يُرفض',A.msgs.length===1);
  await B.close();await sleep(80);
  check('المغادرة تُحدّث الحضور',!A.peers.some(p=>p.by===wb.id));

  sec('البقاء بعد إعادة التشغيل');
  await A.close();
  server.kill('SIGTERM');await sleep(400);
  server=startServer();await sleep(700);
  const A3=client();const wa3=await hello(A3,wa.token);
  const ld3=await A3.req({t:'loadCloud'});
  check('الرمز والرتبة والحفظ كلّها باقية بعد إعادة التشغيل',wa3.id===wa.id&&wa3.ranks.carrom.mmr>1000&&wa3.ranks.carrom.wins===1&&ld3.save&&ld3.save.blob.coins===500,JSON.stringify([wa3.id,wa3.ranks.carrom.mmr,wa3.ranks.carrom.wins]));
  const bad=client();const wbad=await hello(bad,'not-a-real-token');
  check('رمز مجهول = حساب جديد لا سرقة حساب',wbad.id!==wa.id);
  await A3.close();await bad.close();

  sec('الشراء — الخادم يتحقّق ويمنح ويمنع إعادة الاستخدام');
  {   // كتلة مستقلّة كي لا تتعارض الأسماء مع أقسام الاختبار الأخرى
  const {createHmac}=require('crypto');
  const receipt=(pid,tx)=>createHmac('sha256','t3st-secret').update(pid+'.'+tx).digest('hex');
  const P=client();const wp=await hello(P,wa.token);
  const Q=client();await hello(Q,undefined,'خصم');
  const ok1=await P.req({t:'purchase',claim:{platform:'test',productId:'gems_80',receipt:receipt('gems_80','tx1'),transactionId:'tx1'}});
  check('إيصال صالح → منحة من الكتالوج (80 جوهرة) بمعرّف عملية',ok1.t==='purchased'&&ok1.grant.gems===80&&ok1.grant.coins===0&&ok1.txId==='test:tx1'&&ok1.duplicate===false,JSON.stringify(ok1));
  const pdup=await P.req({t:'purchase',claim:{platform:'test',productId:'gems_80',receipt:receipt('gems_80','tx1'),transactionId:'tx1'}});
  check('الإيصال نفسه من الحساب نفسه → duplicate:true بلا منح جديد',pdup.t==='purchased'&&pdup.duplicate===true&&pdup.txId==='test:tx1');
  const stolen=await Q.req({t:'purchase',claim:{platform:'test',productId:'gems_80',receipt:receipt('gems_80','tx1'),transactionId:'tx1'}});
  check('الإيصال نفسه من حساب آخر → already_used',stolen.t==='error'&&stolen.code==='already_used',JSON.stringify(stolen));
  const pforged=await P.req({t:'purchase',claim:{platform:'test',productId:'gems_14000',receipt:'0'.repeat(64),transactionId:'tx9'}});
  check('إيصال مزوّر → verify_failed ولا شيء يُمنح',pforged.t==='error'&&pforged.code==='verify_failed');
  const cheat=await P.req({t:'purchase',claim:{platform:'test',productId:'gems_14000',receipt:receipt('gems_80','tx2'),transactionId:'tx2'}});
  check('إيصال منتج رخيص على منتج غالٍ → مرفوض (المنتج جزء من التوقيع)',cheat.t==='error'&&cheat.code==='verify_failed');
  const unk=await P.req({t:'purchase',claim:{platform:'test',productId:'gems_999',receipt:receipt('gems_999','tx3'),transactionId:'tx3'}});
  check('منتج خارج الكتالوج → unknown_product',unk.t==='error'&&unk.code==='unknown_product');
  const ios=await P.req({t:'purchase',claim:{platform:'ios',productId:'gems_80',receipt:'abc',transactionId:'t'}});
  check('App Store بلا سرّ مضبوط → iap_unavailable لا منح على الثقة',ios.t==='error'&&ios.code==='iap_unavailable',JSON.stringify(ios));
  const badc=await P.req({t:'purchase',claim:{platform:'steam',productId:'gems_80',receipt:'x'}});
  check('منصّة مجهولة → bad_claim',badc.t==='error'&&badc.code==='bad_claim');
  const ppass=await P.req({t:'purchase',claim:{platform:'test',productId:'season_pass',receipt:receipt('season_pass','tx4'),transactionId:'tx4'}});
  check('التذكرة: منحة مركّبة (تذكرة + 200 جوهرة)',ppass.t==='purchased'&&ppass.grant.pass===true&&ppass.grant.gems===200);
  const plist=await P.req({t:'purchases'});
  check('قائمة مشتريات الحساب: اثنان، ولا يرى الخصم شيئًا',plist.t==='purchaseList'&&plist.list.length===2&&(await Q.req({t:'purchases'})).list.length===0,JSON.stringify(plist).slice(0,200));
  const hs=await new Promise(r=>require('http').get(`http://localhost:${PORT}/health`,res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>r(JSON.parse(d)))}));
  check('/health يفصح عمّا هو مفعّل: test فقط، ولا ios ولا android، وعدد المشتريات',hs.iap&&hs.iap.test===true&&hs.iap.ios===false&&hs.iap.android===false&&hs.purchases===2,JSON.stringify(hs));
  await P.close();await Q.close();
  server.kill('SIGTERM');await sleep(400);server=startServer();await sleep(700);
  const P2=client();await hello(P2,wa.token);
  const dup2=await P2.req({t:'purchase',claim:{platform:'test',productId:'gems_80',receipt:receipt('gems_80','tx1'),transactionId:'tx1'}});
  check('الإيصالات المستهلكة باقية بعد إعادة التشغيل — لا تُصرف مرّتين',dup2.t==='purchased'&&dup2.duplicate===true);
  await P2.close();
  }
 }catch(e){fail++;console.log('  ✗ استثناء: '+(e&&e.stack||e))}
 server.kill('SIGTERM');
 try{fs.unlinkSync(DATA)}catch(e){}
 console.log('\n'+(fail?`✗ ${fail} فحصًا فشل من ${pass+fail}`:`خادم تحدّي سليم ✔ (${pass} فحصًا)`));
 process.exit(fail?1:0);
})();
