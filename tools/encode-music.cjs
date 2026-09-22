#!/usr/bin/env node
/**
 * يضغط موسيقى القائمة من WAV إلى Opus داخل حاوية WebM.
 *
 * لا ffmpeg في هذه البيئة، ومسجّل الوسائط في كروميوم يكفي: يُقرأ الملفّ،
 * ويُشغَّل في سياقٍ صوتيّ إلى وجهة تيّار، ويُسجَّل التيّار opus.
 * والنتيجة عُشر الحجم تقريبًا، وWebView في أندرويد يقرؤها أصلًا.
 *
 *   node tools/encode-music.cjs   → tahaddi/audio/menu.webm
 */
const {chromium}=require('playwright');
const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..');
const SRC=path.join(ROOT,'tahaddi','audio','menu.wav');
const OUT=path.join(ROOT,'tahaddi','audio','menu.webm');
const CHROME='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

(async()=>{
 if(!fs.existsSync(SRC)){console.error('لا ملفّ مصدر — شغّل build-music.py أوّلًا');process.exit(1)}
 const wav=fs.readFileSync(SRC).toString('base64');
 const b=await chromium.launch({executablePath:CHROME,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
 const p=await b.newPage();
 await p.goto('about:blank');
 const b64=await p.evaluate(async(wavB64)=>{
  const bin=atob(wavB64),u=new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);
  const AC=window.AudioContext;
  const ctx=new AC();
  const buf=await ctx.decodeAudioData(u.buffer);
  const dest=ctx.createMediaStreamDestination();
  const src=ctx.createBufferSource();src.buffer=buf;src.connect(dest);
  const mime=['audio/webm;codecs=opus','audio/webm'].find(m=>MediaRecorder.isTypeSupported(m));
  if(!mime)throw new Error('لا صيغة مدعومة');
  const rec=new MediaRecorder(dest.stream,{mimeType:mime,audioBitsPerSecond:96000});
  const chunks=[];rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
  const done=new Promise(r=>rec.onstop=r);
  rec.start();src.start();
  await new Promise(r=>setTimeout(r,(buf.duration*1000)+250));
  rec.stop();await done;
  const blob=new Blob(chunks,{type:mime});
  const ab=await blob.arrayBuffer();
  let s='';const v=new Uint8Array(ab);
  for(let i=0;i<v.length;i++)s+=String.fromCharCode(v[i]);
  return btoa(s);
 },wav);
 await b.close();
 fs.writeFileSync(OUT,Buffer.from(b64,'base64'));
 const a=fs.statSync(SRC).size,z=fs.statSync(OUT).size;
 console.log('✓ tahaddi/audio/menu.webm — '+(z/1024).toFixed(0)+' ك.ب  (من '+(a/1048576).toFixed(2)+' م.ب · '+Math.round((1-z/a)*100)+'٪ أقلّ)');
})().catch(e=>{console.error('✗ '+e.message);process.exit(1)});
