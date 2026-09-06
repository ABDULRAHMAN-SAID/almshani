#!/usr/bin/env node
// شبكة أمان الأخطاء: كل خطأ يُلتقط ويُسجَّل ويُحفظ التقدّم، ويُعرض للاعب مخرجٌ بدل شاشة ميتة.
const {chromium}=require('playwright');const http=require('http'),fs=require('fs'),path=require('path');
const ROOT=require('path').resolve(__dirname,'..','tahaddi');const PORT=9500+Math.floor(Math.random()*90);
const srv=http.createServer((q,s)=>{let f=q.url.split('?')[0];if(f==='/')f='/index.html';try{const b=fs.readFileSync(path.join(ROOT,f));s.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});s.end(b)}catch(e){s.writeHead(404);s.end('x')}}).listen(PORT);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));let ok=0,bad=0;
const chk=(n,c,d)=>{c?(ok++,console.log('  ✓ '+n)):(bad++,console.log('  ✗ '+n+(d!==undefined?'  → '+d:'')))};
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await b.newPage({viewport:{width:390,height:844}});
 await page.goto(`http://localhost:${PORT}/index.html`);
 await page.waitForFunction(()=>typeof Router==='object'&&document.getElementById('app').innerHTML.length>500,null,{timeout:40000});
 await page.evaluate(()=>{S.email='a@b.co';S.tutorial_completed=true;S.tutDone=1;S.name='عبدالرحمن';tab('play')});
 await page.evaluate(()=>{RM.mbN=6;soloStart('mafia','mid')});await sleep(2200);
 // خطأ حقيقي غير ملتقَط في أثناء اللعب
 await page.evaluate(()=>{setTimeout(()=>{throw new Error('انفجار اختبار')},10)});
 // المشهد المجسّم تحت العرض البرمجيّ بطيء، فننتظر بشرط لا بوقت
 await page.waitForFunction(()=>typeof ERR_LOG!=='undefined'&&ERR_LOG.length>0,null,{timeout:15000}).catch(()=>{});
 await page.waitForFunction(()=>!!document.getElementById('errSheet'),null,{timeout:8000}).catch(()=>{});
 const st=await page.evaluate(()=>({sheet:!!document.getElementById('errSheet'),log:(typeof ERR_LOG!=='undefined'?ERR_LOG.length:-1),
   where:(typeof ERR_LOG!=='undefined'&&ERR_LOG.length?ERR_LOG[ERR_LOG.length-1].w:''),
   saved:!!localStorage.getItem('tahaddi_err')}));
 chk('الخطأ التُقط وسُجّل',st.log>0,st.log);
 chk('السجلّ يذكر مكان الخطأ',/mafia/.test(st.where),st.where);
 chk('ظهرت ورقة الإنقاذ بدل شاشة ميتة',st.sheet);
 chk('السجلّ محفوظ فيبقى بعد إعادة الفتح',st.saved);
 // وعد مرفوض لا يُظهر ورقة لكن يُسجَّل
 await page.evaluate(()=>{const e=document.getElementById('errSheet');if(e)e.remove()});
 await sleep(300);
 const before=await page.evaluate(()=>ERR_LOG.length);
 await page.evaluate(()=>{Promise.reject(new Error('اختبار وعد'))});
 await page.waitForFunction(n=>ERR_LOG.length>n,before,{timeout:8000}).catch(()=>{});
 await sleep(400);
 const st2=await page.evaluate(()=>({log:ERR_LOG.length,sheet:!!document.getElementById('errSheet')}));
 chk('الوعد المرفوض يُسجَّل بلا مقاطعة اللعب',st2.log>before&&!st2.sheet,st2.log+'>'+before+' · ورقة='+st2.sheet);
 // الشاشة تُفتح من المزيد
 await page.evaluate(()=>{try{VB.over=true}catch(e){}; Router.reset('home'); push('errLogScr')});
 await sleep(700);
 const st3=await page.evaluate(()=>{const e=document.getElementById('errLogScr');return {open:!!e,txt:e?e.innerText.slice(0,90):''}});
 chk('شاشة سجلّ الأخطاء تُفتح وتعرض ما سُجّل',st3.open&&/سجلّ الأخطاء/.test(st3.txt),st3.txt.replace(/\n/g,' ').slice(0,60));
 await b.close();srv.close();
 console.log('\n'+(bad?'✗ '+bad+' فشل':'شبكة الأخطاء سليمة ✔ ('+ok+' فحوص)'));
 process.exit(bad?1:0);
})().catch(e=>{console.error(e.message);process.exit(2)});
