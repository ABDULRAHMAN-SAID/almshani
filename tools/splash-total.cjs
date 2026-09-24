#!/usr/bin/env node
/* ٦٫٩٥ — شاشة الدخول تقيس ما نزل من الملفّ فعلًا، فتحتاج حجمه الكلّيّ وموضع السكربت الرئيسيّ: يُعاد حسابهما بعد كلّ تعديل
   (عرضٌ ثابت من عشرة أرقام حتّى لا يغيّر الحساب الحجم). الوحدة: وحدات UTF-16 كما تعدّها الصفحة (Text.length) — لا بايتات.
   node tools/splash-total.cjs [--check] [path/to/index.html] */
const fs=require('fs'),path=require('path');
const P=process.argv.slice(2).find(a=>/\.html$/.test(a))||path.join(__dirname,'..','tahaddi','index.html');
let s=fs.readFileSync(P,'utf8');
const m=s.match(/data-total="(\d{10})" data-head="(\d{10})"/);
if(!m){console.error('✗ لا توجد علامة شاشة الدخول');process.exit(1)}
const total=s.length,head=s.indexOf('<script id="mainjs">');
if(head<0){console.error('✗ لا يوجد السكربت الرئيسيّ');process.exit(1)}
const cur=[+m[1],+m[2]];const want=[total,head];
if(cur[0]===want[0]&&cur[1]===want[1]){console.log('✓ أرقام شاشة الدخول مضبوطة — '+total+' وحدة');process.exit(0)}
if(process.argv.includes('--check')){console.error('✗ أرقام شاشة الدخول متأخّرة: '+cur.join('/')+' ≠ '+want.join('/')+' — شغّل node tools/splash-total.cjs');process.exit(1)}
s=s.replace(m[0],`data-total="${String(total).padStart(10,'0')}" data-head="${String(head).padStart(10,'0')}"`);
fs.writeFileSync(P,s);console.log('✓ حُدّثت أرقام شاشة الدخول: '+total+' وحدة، السكربت عند '+head+(P.includes('www')?' (نسخة الويب)':''));
