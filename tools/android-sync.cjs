#!/usr/bin/env node
/**
 * يجهّز مشروع أندرويد للبناء: ينسخ اللعبة إلى أصول التطبيق ويكتب رقم الإصدار.
 *
 *   [TAHADDI_SERVER=https://...] node tools/android-sync.cjs
 *
 * ١) يستدعي tools/build-www.cjs ليخرج إلى app-android/app/src/main/assets — فالتطبيق
 *    والويب يحملان الملفّ نفسه، ولا يوجد مسار بناء ثانٍ يتأخّر عن الأوّل.
 * ٢) يكتب app-android/app/version.properties من APP_VER داخل اللعبة، فلا يُحدَّث رقم
 *    الإصدار في مكانين. الرمز الرقميّ = الرئيسيّ×١٠٠٠ + الفرعيّ (٥٫٩٦ ← ٥٠٩٦) فيبقى تصاعديًّا.
 */
const fs=require('fs'),path=require('path'),{execFileSync}=require('child_process');
const ROOT=path.join(__dirname,'..');
const ASSETS=path.join(ROOT,'app-android','app','src','main','assets');

execFileSync(process.execPath,[path.join(__dirname,'build-www.cjs'),ASSETS],{stdio:'inherit',cwd:ROOT});

const html=fs.readFileSync(path.join(ASSETS,'index.html'),'utf8');
const name=(html.match(/APP_VER='([^']+)'/)||[])[1];
if(!name)throw new Error('لم يُعثر على APP_VER في اللعبة');
const [maj,min]=name.split('.');
const code=Number(maj)*1000+Number(min||0);
if(!Number.isInteger(code)||code<=0)throw new Error('رقم إصدار غير صالح: '+name);
fs.writeFileSync(path.join(ROOT,'app-android','app','version.properties'),
 `# مولَّد من tools/android-sync.cjs — لا يُحرَّر يدويًّا\nversionName=${name}\nversionCode=${code}\n`);

let n=0,bytes=0;
(function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){
 const p=path.join(d,e.name); if(e.isDirectory())walk(p); else {n++;bytes+=fs.statSync(p).size}}})(ASSETS);
console.log(`✓ أصول التطبيق جاهزة — ${n} ملفًّا · ${(bytes/1048576).toFixed(1)}م · الإصدار ${name} (${code})`);
