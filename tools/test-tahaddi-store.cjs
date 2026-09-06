#!/usr/bin/env node
// سويت الحفظ: توافق الصيغة القديمة · الاستئناف بعد إعادة التشغيل · سطر مقطوع · الكبس · الكلفة الثابتة.
// يحرس أخطر ما في الخادم: أن يفقد لاعبٌ تقدّمه بصمت.
const {execFileSync}=require('child_process');
const fs=require('fs'),os=require('os'),path=require('path');
const ROOT=path.resolve(__dirname,'..');
const TMP=fs.mkdtempSync(path.join(os.tmpdir(),'tahaddi-store-'));
const BUNDLE=path.join(TMP,'svc.cjs'), ENTRY=path.join(TMP,'entry.ts');
fs.writeFileSync(ENTRY,`export * from ${JSON.stringify(path.join(ROOT,'server/src/tahaddi/service'))};
export * from ${JSON.stringify(path.join(ROOT,'server/src/tahaddi/tstore'))};\n`);
execFileSync('npx',['esbuild',ENTRY,'--bundle','--platform=node','--format=cjs','--outfile='+BUNDLE,'--log-level=error'],{cwd:ROOT,stdio:'inherit'});
const {TahaddiService,RecordStore}=require(BUNDLE);

let ok=0,bad=0;
const sec=t=>console.log('\n── '+t+' ──');
const chk=(n,c,d)=>{c?(ok++,console.log('  ✓ '+n)):(bad++,console.log('  ✗ '+n+(d!==undefined?'  → '+d:'')))};
const quiet=()=>{const e=console.error;console.error=()=>{};return()=>{console.error=e}};
const ID=i=>'p'+String(i).padStart(12,'0');
const f=path.join(TMP,'data.json');

sec('توافق الصيغة القديمة');
fs.writeFileSync(f,JSON.stringify({v:1,accounts:[
 {token:'tk1',id:ID(1),name:'عبدالرحمن',createdAt:1,lastSeen:2,save:{t:9,blob:{coins:777}},ranks:{},friends:[ID(2)],reqIn:[],reqOut:[]},
 {token:'tk2',id:ID(2),name:'سلطان',createdAt:1,lastSeen:2,save:null,ranks:{},friends:[ID(1)],reqIn:[],reqOut:[]}
],purchases:[{txId:'x1',id:ID(1),productId:'gems_500',at:5}]}));
let un=quiet(); let svc=new TahaddiService(new RecordStore(f)); un();
chk('ملفّ الإنتاج الحالي يُقرأ كما هو: حسابان',svc.accounts.size===2,svc.accounts.size);
chk('الشراء القديم باقٍ فلا يُصرف مرّتين',svc.purchases.has('x1'));
chk('الحفظ السحابي سليم',svc.accounts.get('tk1').save.blob.coins===777);
chk('قوائم الأصدقاء سليمة',svc.accounts.get('tk1').friends[0]===ID(2));

sec('التحوّل إلى السجلّ الإلحاقيّ');
const a=svc.accounts.get('tk1'); a.name='عبدالرحمن٢'; svc.persist(a); svc.close();
const raw=fs.readFileSync(f,'utf8');
chk('الملفّ صار سجلًّا بترويسة صريحة',raw.startsWith('#tahaddi/log/1')&&raw.includes('"k":"a"'),JSON.stringify(raw.slice(0,20)));
chk('السجلّ ليس كائن JSON واحدًا',!raw.trimStart().startsWith('{'));

sec('الاستئناف بعد إعادة التشغيل');
un=quiet(); svc=new TahaddiService(new RecordStore(f)); un();
chk('الحسابان باقيان',svc.accounts.size===2,svc.accounts.size);
chk('آخر تغيير هو الذي بقي',svc.accounts.get('tk1').name==='عبدالرحمن٢',svc.accounts.get('tk1').name);
chk('الحساب الذي لم يتغيّر لم يُمسّ',svc.accounts.get('tk2').name==='سلطان');
chk('الشراء ما زال محفوظًا',svc.purchases.has('x1'));

sec('انقطاع أثناء الكتابة');
fs.appendFileSync(f,'{"k":"a","i":"tk1","v":{"tok');   // سطر نصفه فقط — انقطاع كهرباء
un=quiet(); svc=new TahaddiService(new RecordStore(f)); un();
chk('السطر المقطوع يُتجاهل ولا يُفقد ما قبله',svc.accounts.size===2&&svc.accounts.get('tk1').name==='عبدالرحمن٢',svc.accounts.size);

sec('الكبس');
const b=svc.accounts.get('tk2');
for(let i=0;i<3000;i++){b.name='س'+i;svc.persist(b)}
svc.close();
const sz=fs.statSync(f).size;
un=quiet(); svc=new TahaddiService(new RecordStore(f)); un();
chk('٣٠٠٠ تغيير لا تُضخّم الملفّ',sz<200000,sz+' بايت');
chk('وآخر قيمة صحيحة بعد الكبس',svc.accounts.get('tk2').name==='س2999',svc.accounts.get('tk2').name);

sec('كلفة الحفظ ثابتة مهما كبر عدد الحسابات');
const cost=[];
for(const n of [1000,20000]){
 const g=path.join(TMP,'p'+n+'.log');
 const s2=new TahaddiService(new RecordStore(g));
 const blob={coins:1,cards:{},stars:{}};
 for(let i=0;i<40;i++)blob.cards['c'+i]={lvl:i%9,n:i};
 for(let i=0;i<50;i++)blob.stars['n'+i]=i%4;
 for(let i=0;i<n;i++)s2.accounts.set('t'+i,{token:'t'+i,id:ID(i),name:'ل'+i,createdAt:1,lastSeen:1,
   save:{t:1,blob:JSON.parse(JSON.stringify(blob))},ranks:{},friends:[],reqIn:[],reqOut:[]});
 const one=s2.accounts.get('t0');
 const t0=process.hrtime.bigint();
 for(let k=0;k<300;k++){one.save.blob.coins=k;s2.persist(one);s2.store.flush()}
 cost.push(Number(process.hrtime.bigint()-t0)/1e6/300);
 s2.close();
}
chk('٢٠ ألف حساب لا تكلّف أكثر من ألف بأضعاف',cost[1]<cost[0]*4,cost[0].toFixed(3)+'ms → '+cost[1].toFixed(3)+'ms');
chk('الحفظ الواحد أقلّ من مللي ثانية',cost[1]<1,cost[1].toFixed(3)+'ms');

try{fs.rmSync(TMP,{recursive:true,force:true})}catch(e){}
console.log('\n'+(bad?'✗ '+bad+' فشل / '+ok+' نجح':'حفظ تحدّي سليم ✔ ('+ok+' فحصًا)'));
process.exit(bad?1:0);
