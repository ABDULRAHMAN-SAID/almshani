#!/usr/bin/env node
// سويت السعة: كلفة الرسالة يجب أن تكون بحجم الغرفة لا بعدد المتصلين.
// يفشل فورًا إن عاد أحد فأدخل حلقة على كل الجلسات في مسار ساخن.
const {execFileSync}=require('child_process');
const fs=require('fs'),os=require('os'),path=require('path');
const ROOT=path.resolve(__dirname,'..');
const TMP=fs.mkdtempSync(path.join(os.tmpdir(),'tahaddi-scale-'));
const BUNDLE=path.join(TMP,'svc.cjs'), ENTRY=path.join(TMP,'entry.ts');
fs.writeFileSync(ENTRY,`export * from ${JSON.stringify(path.join(ROOT,'server/src/tahaddi/service'))};
export * from ${JSON.stringify(path.join(ROOT,'server/src/tahaddi/tstore'))};\n`);
execFileSync('npx',['esbuild',ENTRY,'--bundle','--platform=node','--format=cjs','--outfile='+BUNDLE,'--log-level=error'],{cwd:ROOT,stdio:'inherit'});
const {TahaddiService,RecordStore}=require(BUNDLE);

let ok=0,bad=0;
const chk=(n,c,d)=>{c?(ok++,console.log('  ✓ '+n)):(bad++,console.log('  ✗ '+n+(d!==undefined?'  → '+d:'')))};
const ROOM=8, SMALL=1000, BIG=50000;

function build(n){
 const svc=new TahaddiService(new RecordStore(path.join(TMP,'s'+n+'.log')));
 const ss=[];
 for(let i=0;i<n;i++){
  const s={peer:'pe'+i,send(){},presence:{pc:'R'+Math.floor(i/ROOM)},
   account:{token:'t'+i,id:'p'+String(i).padStart(12,'0'),name:'ل'+i,createdAt:1,lastSeen:1,save:null,ranks:{},friends:[],reqIn:[],reqOut:[]}};
  svc.sessions.set(s.peer,s); svc.byId.set(s.account.id,s.account);
  const k=svc.key(s); let g=svc.groups.get(k); if(!g)svc.groups.set(k,g=new Set()); g.add(s);
  let b=svc.byAcc.get(s.account.id); if(!b)svc.byAcc.set(s.account.id,b=new Set()); b.add(s);
  ss.push(s);
 }
 return {svc,ss};
}
function ms(fn,rep){const t=process.hrtime.bigint();for(let k=0;k<rep;k++)fn(k);return Number(process.hrtime.bigint()-t)/1e6/rep}

console.log('السعة: كلفة العملية عند '+SMALL+' مقابل '+BIG+' متصلًا\n');
const A=build(SMALL), B=build(BIG);
// كل جلسة في مجموعتها لها حدّ معدّل خاص، والقياس هنا للكلفة الحسابية لا للحدّ
const pA=ms(k=>A.svc.presence(A.ss[k%SMALL],{x:k}),300);
const pB=ms(k=>B.svc.presence(B.ss[k%BIG],{x:k}),300);
const eA=ms(k=>A.svc.emit(A.ss[k%SMALL],'room',{a:k}),300);
const eB=ms(k=>B.svc.emit(B.ss[k%BIG],'room',{a:k}),300);
const fmt=(a,b)=>a.toFixed(4)+'ms → '+b.toFixed(4)+'ms  (×'+(b/a).toFixed(1)+')';

console.log('  presence  '+fmt(pA,pB));
console.log('  emit      '+fmt(eA,eB)+'\n');
chk('presence لا تنمو مع عدد المتصلين (×'+(BIG/SMALL)+' لاعبًا)',pB<pA*5,fmt(pA,pB));
chk('emit لا تنمو مع عدد المتصلين',eB<eA*5,fmt(eA,eB));
chk('presence أقلّ من مللي ثانية عند '+BIG,pB<1,pB.toFixed(4)+'ms');
chk('emit أقلّ من مللي ثانية عند '+BIG,eB<1,eB.toFixed(4)+'ms');

// الخامل لا يُبنى له قائمة بكل من على الخادم
let got=null;
const idle={peer:'idle',send(m){if(m.t==='peers')got=m.list},presence:{},
 account:{token:'ti',id:'p'+'f'.repeat(12),name:'خامل',createdAt:1,lastSeen:1,save:null,ranks:{},friends:[],reqIn:[],reqOut:[]}};
B.svc.sessions.set('idle',idle);
const ik=B.svc.key(idle); let ig=B.svc.groups.get(ik); if(!ig)B.svc.groups.set(ik,ig=new Set()); ig.add(idle);
B.svc.presence(idle,{z:1});
chk('الخامل يُرسَل له نفسه فقط لا قائمة بكل الخادم',Array.isArray(got)&&got.length===1,got&&got.length);

// أهل الغرفة وحدهم يسمعون
let heard=0;
for(const s of B.ss.slice(0,64)) s.send=m=>{if(m.t==='msg')heard++};
B.svc.emit(B.ss[0],'room',{a:1});
chk('رسالة الغرفة تصل '+ROOM+' لاعبين لا أكثر',heard===ROOM,heard);

// حدّ المعدّل يعمل
let limited=0;
const rlS=B.ss[100]; rlS.send=m=>{if(m.t==='error'&&m.code==='rate_limited')limited++};
for(let i=0;i<200;i++) B.svc.handle(rlS,{t:'saveCloud',save:{t:1,blob:{}}});
chk('الإغراق يُصدّ بحدّ المعدّل',limited>150,limited+' من ٢٠٠ رُفضت');

try{fs.rmSync(TMP,{recursive:true,force:true})}catch(e){}
console.log('\n'+(bad?'✗ '+bad+' فشل / '+ok+' نجح':'سعة تحدّي سليمة ✔ ('+ok+' فحصًا)'));
process.exit(bad?1:0);
