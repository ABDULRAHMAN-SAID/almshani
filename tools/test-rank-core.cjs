#!/usr/bin/env node
/** نواة التصنيف المشتركة — النصّ نفسه الذي يشغّله العميل والخادم.  node tools/test-rank-core.cjs */
const fs=require('fs'),path=require('path');
const SRC=path.join(__dirname,'..','src','progression','rank.js');
const R=(0,eval)(fs.readFileSync(SRC,'utf8').replace(/if\(typeof module[^\n]*\n?$/,'')+';RankCore');
let pass=0,fail=0;
const check=(n,ok,info)=>{if(ok){pass++;console.log('  ✓ '+n)}else{fail++;console.log('  ✗ '+n+(info?'  → '+info:''))}};
const sec=t=>console.log('\n── '+t+' ──');
const fresh=g=>R.newRankProfile(g||'carrom');
const clone=o=>JSON.parse(JSON.stringify(o));

sec('الشكل');
check('ست ألعاب بتعريف ونموذج حساب',R.GAMES.length===6&&R.GAME_DEFS.every(g=>R.SCORE_MODELS[g.scoreModel]));
check('الملفّ الجديد غير مصنّف وليس برونزيًا',!fresh().placed&&R.rankName(fresh())==='برونزي III'&&R.score(fresh())===-1);
check('قمة الأساطير بلا درجة',R.rankName({tier:9,div:0})==='قمة الأساطير');

sec('الأوضاع');
{
 const p=fresh();const out=R.resolve(p,{gameId:'carrom',mode:'bot',matchId:'m1',result:{won:true}});
 check('الكمبيوتر يمنح إتقانًا لا نقاطًا',out.applied&&out.rp===0&&p.masteryXp===3&&p.wins===0&&!p.placed);
 check('الغرفة والعادي والتمرير كذلك',['room','casual','pass'].every(m=>{const q=fresh();const o=R.resolve(q,{gameId:'uno',mode:m,matchId:'x'+m,result:{place:1,total:2}});return o.applied&&q.wins===0&&q.rp===0}));
}

sec('تحديد المستوى');
{
 const p=fresh();
 for(let i=0;i<5;i++)R.resolve(p,{gameId:'carrom',mode:'ranked',matchId:'p'+i,result:{won:true},opponents:[{mmr:1000}]});
 check('خمسة انتصارات → ذهبي II وحماية',p.placed&&p.tier===2&&p.div===2&&p.protect===1&&p.rp===0);
 const q=fresh();
 for(let i=0;i<5;i++)R.resolve(q,{gameId:'carrom',mode:'ranked',matchId:'q'+i,result:{won:false},opponents:[{mmr:1000}]});
 check('خمس خسائر → برونزي III',q.placed&&q.tier===0&&q.div===3);
 check('MMR تحرّك في الاتجاهين',p.mmr>1000&&q.mmr<1000);
}

sec('النقاط والترقية والهبوط');
{
 const p=fresh();p.placed=true;p.tier=2;p.div=2;p.rp=90;p.protect=0;
 const o=R.resolve(p,{gameId:'carrom',mode:'ranked',matchId:'w1',result:{won:true},opponents:[{mmr:1000}]});
 check('فوز بـ+24 من 90 يرقّي إلى ذهبي I ويمنح حماية',o.promoted&&p.tier===2&&p.div===1&&p.rp===14&&p.protect===1&&o.newName==='ذهبي I',JSON.stringify(o));
 const d=R.resolve(p,{gameId:'carrom',mode:'ranked',matchId:'l1',result:{won:false},opponents:[{mmr:1000}]});
 check('خسارة بعد الترقية: الحماية تمتصّها (rp=0 بلا هبوط)',d.protected&&p.rp===0&&p.div===1&&p.protect===0);
 const d2=R.resolve(p,{gameId:'carrom',mode:'ranked',matchId:'l2',result:{won:false},opponents:[{mmr:1000}]});
 check('الخسارة التالية تهبط درجة',d2.demoted&&p.div===2&&p.rp===80,JSON.stringify({p,d2}));
 const b=fresh();b.placed=true;b.tier=0;b.div=3;b.rp=0;
 R.resolve(b,{gameId:'carrom',mode:'ranked',matchId:'b1',result:{won:false},opponents:[{mmr:1000}]});
 check('برونزي III لا يهبط تحت الصفر',b.tier===0&&b.div===3&&b.rp===0);
 const strong=R.rpFromStrength(1,1000,1300),weak=R.rpFromStrength(1,1300,1000);
 check('الفوز على الأقوى يكسب أكثر',strong>weak);
}

sec('نماذج الحساب');
{
 const u=fresh('uno');u.placed=true;u.tier=1;u.div=2;u.rp=50;
 const first=R.resolve(clone(u),{gameId:'uno',mode:'ranked',matchId:'a',result:{place:1,total:4},opponents:[{mmr:1000}]});
 const last=R.resolve(clone(u),{gameId:'uno',mode:'ranked',matchId:'b',result:{place:4,total:4},opponents:[{mmr:1000}]});
 const mid=R.resolve(clone(u),{gameId:'uno',mode:'ranked',matchId:'c',result:{place:2,total:4},opponents:[{mmr:1000}]});
 check('الترتيب: الأول يكسب، الأخير يخسر، الوسط بينهما',first.rp>0&&last.rp<0&&mid.rp>last.rp&&mid.rp<first.rp,JSON.stringify([first.rp,mid.rp,last.rp]));
 const m=fresh('mafia');m.placed=true;m.tier=1;m.div=2;m.rp=50;
 const left=R.resolve(clone(m),{gameId:'mafia',mode:'ranked',matchId:'d',result:{teamWon:true,left:true},opponents:[]});
 const won=R.resolve(clone(m),{gameId:'mafia',mode:'ranked',matchId:'e',result:{teamWon:true,completed:true},opponents:[]});
 check('المافيا: الانسحاب يضرّ ولو فاز فريقك',left.rp<won.rp);
 const o=fresh('outsider');o.placed=true;o.tier=1;o.div=2;o.rp=50;
 const r=R.resolve(clone(o),{gameId:'outsider',mode:'ranked',matchId:'f',result:{roundsWon:1,rounds:1},opponents:[]});
 check('برا السالفة: جولة واحدة مكسوبة = فوز',r.rp>0);
}

sec('الحتمية والتكرار');
{
 const a=fresh(),b=fresh();
 const oa=R.resolve(a,{gameId:'carrom',mode:'ranked',matchId:'z',result:{won:true},opponents:[{mmr:1100}]},5);
 const ob=R.resolve(b,{gameId:'carrom',mode:'ranked',matchId:'z',result:{won:true},opponents:[{mmr:1100}]},5);
 check('نفس المدخلات = نفس الملفّ بالضبط (الخادم والعميل يتّفقان)',JSON.stringify(a)===JSON.stringify(b)&&JSON.stringify(oa)===JSON.stringify(ob));
 const again=R.resolve(a,{gameId:'carrom',mode:'ranked',matchId:'z',result:{won:true},opponents:[]});
 check('المعرّف نفسه لا يُحتسب مرّتين',!again.applied&&a.gamesPlayed===1);
}

sec('الموسم والتنظيف');
{
 const p=fresh();p.placed=true;p.tier=3;p.div=1;p.rp=70;
 R.softReset(p,5);
 check('إعادة الضبط اللّيّنة: درجتان لأسفل (بلاتيني I → بلاتيني III)، صفر نقاط، حماية',p.tier===3&&p.div===3&&p.rp===0&&p.protect===1&&p.seasonId===5);
 const bad=R.sanitizeProfile({tier:99,div:-4,rp:5000,mmr:'x',wins:1e9,placed:'yes',seen:[1,2,3],seasonBest:{tier:50,div:9}},'carrom');
 check('ملفّ خبيث من القرص/الشبكة يُقصّ إلى الحدود',bad.tier===9&&bad.div===0&&bad.rp===100&&bad.mmr===1000&&bad.wins===1e6&&bad.placed===true&&bad.seasonBest.tier===9);
 check('score يرتّب: مصنّف أعلى > مصنّف أدنى > غير مصنّف',R.score({placed:true,tier:2,div:1,rp:10})>R.score({placed:true,tier:2,div:2,rp:99})&&R.score({placed:true,tier:0,div:3,rp:0})>R.score(fresh()));
}
console.log('\n'+(fail?`✗ ${fail} فحصًا فشل من ${pass+fail}`:`نواة التصنيف سليمة ✔ (${pass} فحصًا)`));
process.exit(fail?1:0);
