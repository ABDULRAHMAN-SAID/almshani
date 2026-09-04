// يصوّر لوحة المسرح المتّجهية (vbSceneSvg في tahaddi/index.html) طبقةً طبقة (far/mid/near) بدقّة 4× وخلفية شفّافة
// إلى المجلد الهدف، ليعالجها tools/paint-scenes.py كلوحة مرسومة. الاستعمال: node tools/render-scenes.cjs <outDir>
const {chromium}=require('playwright');const http=require('http'),fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..','tahaddi');const OUT=process.argv[2]||path.join(__dirname,'..','art','scenes','layers');
fs.mkdirSync(OUT,{recursive:true});
const PORT=8900+Math.floor(Math.random()*9);
const srv=http.createServer((q,s)=>{let f=q.url.split('?')[0];if(f==='/')f='/index.html';try{const b=fs.readFileSync(path.join(ROOT,f));s.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});s.end(b)}catch(e){s.writeHead(404);s.end('x')}}).listen(PORT);
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});
 const app=await b.newPage({viewport:{width:390,height:844}});
 await app.goto(`http://localhost:${PORT}/index.html`);
 await app.waitForFunction(()=>typeof vbSceneSvg==='function',null,{timeout:30000});
 const page=await b.newPage({viewport:{width:400,height:246},deviceScaleFactor:4});
 for(const kind of ['mafia','barra']){
  const svg=await app.evaluate(k=>vbSceneSvg(k,k==='mafia'?424242:777777),kind);
  await page.setContent(`<!doctype html><html><head><link href="https://fonts.googleapis.com/css2?family=Cairo:wght@900&display=swap" rel="stylesheet"><style>html,body{margin:0;background:transparent}svg{display:block}</style></head><body><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 246" width="400" height="246">${svg}</svg></body></html>`,{waitUntil:'load'});
  await page.waitForTimeout(600);
  for(const L of ['far','mid','near']){
   await page.evaluate(l=>{document.querySelectorAll('[data-layer]').forEach(g=>{g.style.display=g.dataset.layer===l?'':'none'})},L);
   await page.screenshot({path:path.join(OUT,`${kind}-${L}.png`),omitBackground:true});
  }
  console.log('✓ طبقات',kind);
 }
 await b.close();srv.close();
})().catch(e=>{console.error(e);process.exit(1)});
