#!/usr/bin/env node
/** جرد المحتوى: الأسئلة والبطاقات والتعبيرات وكلمات ليلة العائلة والمهام — أعداد وتكرارات وعيوب بنيوية.  node tools/qa-content.cjs */
const fs=require('fs'),path=require('path');
const s=fs.readFileSync(path.join(__dirname,'..','tahaddi','index.html'),'utf8');
function arr(name){const i=s.indexOf(`const ${name}=[`);if(i<0)return null;let d=0,j=i+`const ${name}=`.length;for(let k=j;k<s.length;k++){const c=s[k];if(c==='[')d++;else if(c===']'){d--;if(d===0)return s.slice(j,k+1)}}return null}
function obj(name){const i=s.indexOf(`const ${name}={`);if(i<0)return null;let d=0,j=i+`const ${name}=`.length;for(let k=j;k<s.length;k++){const c=s[k];if(c==='{')d++;else if(c==='}'){d--;if(d===0)return s.slice(j,k+1)}}return null}
const out={};
// الأسئلة: JSON صرف
const Q=JSON.parse(arr('Q'));
out.questions=Q.length;
const cat=q=>String(q.n||'').replace(/_\d+$/,'');
const by=(f)=>Q.reduce((m,q)=>{const k=f(q);m[k]=(m[k]||0)+1;return m},{});
out.byCategory=by(cat);out.byDifficulty=by(q=>q.d);
out.byType=by(q=>q.tf?'tf':q.fill?'fill':q.o?('mcq'+q.o.length):'other');
const seen=new Map();Q.forEach(q=>{const k=(q.t||'').replace(/[\s؟?]/g,'');seen.set(k,(seen.get(k)||0)+1)});
out.uniqueTexts=seen.size;out.duplicateTexts=Q.length-seen.size;
out.topTemplates=[...seen.entries()].filter(e=>e[1]>=20).sort((a,b)=>b[1]-a[1]).slice(0,12).map(e=>[e[0].slice(0,50),e[1]]);
// نصيب كل فئة من القوالب المكرّرة (نسبة الأسئلة التي يتكرّر نصّها ≥5 مرّات)
out.templatedShareByCategory=Object.fromEntries(Object.keys(out.byCategory).map(c=>{const qs=Q.filter(q=>cat(q)===c);const t=qs.filter(q=>seen.get((q.t||'').replace(/[\s؟?]/g,''))>=5).length;return [c,Math.round(t/qs.length*100)+'%']}));
out.optionsAllNumeric=Q.filter(q=>q.o&&q.o.every(x=>/^[\d.,٪%\s]+$/.test(String(x)))).length;
out.sampleUnique=Q.filter(q=>seen.get((q.t||'').replace(/[\s؟?]/g,''))===1).slice(0,6).map(q=>q.t.slice(0,60));
out.badCorrectIndex=Q.filter(q=>q.o&&!(q.c>=0&&q.c<q.o.length)).map(q=>q.t.slice(0,40)).slice(0,10);
out.dupOptions=Q.filter(q=>q.o&&new Set(q.o.map(x=>String(x).trim())).size!==q.o.length).map(q=>q.t.slice(0,40)).slice(0,10);
out.longText=Q.filter(q=>(q.t||'').length>110).length;
out.latinInQuestions=Q.filter(q=>/[A-Za-z]{3,}/.test(q.t+' '+(q.o||[]).join(' '))).length;
// البطاقات والتعبيرات
const cards=arr('CARDS');out.cards=cards?(cards.match(/\{id:/g)||[]).length:null;
const em=arr('EMOTES');out.emotes=em?(em.match(/\{k:/g)||[]).length:null;
const pw=obj('PARTY_WORDS');if(pw){const cats=[...pw.matchAll(/'([^']+)':\[([^\]]*)\]/g)];out.partyWords=Object.fromEntries(cats.map(m=>[m[1],(m[2].match(/'/g)||[]).length/2]))}
const mis=arr('MIS');out.missions=mis?(mis.match(/\{k:/g)||[]).length:null;
const evt=arr('EVT_GOALS');out.dailyGoals=evt?(evt.match(/\{/g)||[]).length:null;
const nets=arr('NETS');out.nets=nets?(nets.match(/\{id:/g)||[]).length:null;
const nodes=arr('NODES');out.nodes=nodes?(nodes.match(/\{id:/g)||[]).length:null;
const rivals=arr('RIVALS');out.rivals=rivals?(rivals.match(/\{n:/g)||[]).length:null;
out.htmlBytes=s.length;out.scriptChars=(s.match(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/)||['',''])[1].length;
out.functions=(s.match(/^function [A-Za-z_$][\w$]*\(/gm)||[]).length;
out.screens=(s.match(/^(?:async )?function [A-Za-z_$][\w$]*\([^)]*\)\{[\s\S]{0,400}?go\(`/gm)||[]).length;
out.todoMarks=(s.match(/TODO|FIXME|XXX/g)||[]).length;
console.log(JSON.stringify(out,null,1));
