#!/usr/bin/env node
/**
 * يخبز دروع الرتب العشرة من مشهد Three.js إلى ملصق WebP واحد ويضمّنه في اللعبة.
 *   NODE_PATH=$(npm root -g) node tools/build-rank-emblems.cjs
 * الناتج: art/rank-emblems.webp (+ png للمراجعة) والمتغيّر --ranks في tahaddi/index.html
 */
const {chromium}=require('playwright');
const http=require('http'),fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..');
const PORT=8990+Math.floor(Math.random()*9);
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json'};
const srv=http.createServer((q,s)=>{const f=path.normalize(path.join(ROOT,q.url.split('?')[0]));
 if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){s.writeHead(404);s.end();return}
 s.writeHead(200,{'content-type':MIME[path.extname(f)]||'application/octet-stream'});s.end(fs.readFileSync(f))}).listen(PORT);
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
 const p=await b.newPage({viewport:{width:900,height:900}});
 const logs=[];p.on('console',m=>logs.push(m.text()));p.on('pageerror',e=>logs.push('ERR '+e.message));
 await p.goto(`http://localhost:${PORT}/tools/rank-emblems/scene.html`);
 await p.waitForFunction(()=>window.__OUT||window.__ERR,null,{timeout:180000});
 const out=await p.evaluate(()=>window.__OUT||{err:window.__ERR});
 await b.close();srv.close();
 if(out.err){console.error('✗ المشهد فشل:\n'+out.err+'\n'+logs.join('\n'));process.exit(1)}
 const webp=Buffer.from(out.webp.split(',')[1],'base64'),png=Buffer.from(out.png.split(',')[1],'base64');
 fs.mkdirSync(path.join(ROOT,'art'),{recursive:true});
 fs.writeFileSync(path.join(ROOT,'art','rank-emblems.webp'),webp);
 fs.writeFileSync(path.join(ROOT,'art','rank-emblems.png'),png);
 const P=path.join(ROOT,'tahaddi','index.html');let s=fs.readFileSync(P,'utf8');
 const line=`--ranks:url(${out.webp})`;
 if(/^--ranks:url\([^\n]*\)[;}]$/m.test(s))s=s.replace(/^--ranks:url\([^\n]*\)([;}])$/m,line+'$1');
 else s=s.replace(/^(--logo:url\([^\n]*\))\}$/m,`$1;\n${line}}`);
 if(!s.includes('--ranks:url('))throw new Error('لم أجد مكان --logo لإدراج --ranks');
 fs.writeFileSync(P,s);
 console.log(`✓ ${out.cells} درعًا × ${out.cell}px · webp ${(webp.length/1024).toFixed(0)}KB · png ${(png.length/1024).toFixed(0)}KB · ${out.keys.join(' ')}`);
 if(logs.length)console.log(logs.slice(0,5).join('\n'));
})().catch(e=>{console.error(e);process.exit(1)});
