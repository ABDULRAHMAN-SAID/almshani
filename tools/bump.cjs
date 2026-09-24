#!/usr/bin/env node
/**
 * يرفع رقم إصدار اللعبة — ولا يُكتب الرقم بيد أحد.
 *
 *   node tools/bump.cjs           يرفع الفرعيّ:  6.28 ← 6.29
 *   node tools/bump.cjs 7.0       يضع رقمًا بعينه
 *
 * لماذا أداة لسطرٍ واحد: كنت أرفعه بأمر استبدالٍ يبحث عن القيمة القديمة،
 * فإن أخطأتُها **فشل بصمت** وبقي الرقم مكانه. وقد وقع: بقي 6.28 ثلاث دفعات
 * ورسائلها تقول 6.29 و6.30 و6.31. وأثره ليس تجميليًّا: فاحص التحديث يقارن
 * ما في اللعبة بما على الشبكة، فإن لم يتغيّر الرقم لم يُعلن تحديثٌ أبدًا —
 * فوصلت الشيفرة الجديدة ولم يَرَ صاحبها شيئًا.
 * فالأداة تقرأ الموجود ثم تكتب، ولا تُعطى القديم أصلًا، وتتحقّق ممّا كتبت.
 */
const fs=require('fs'),path=require('path');
const P=path.join(__dirname,'..','tahaddi','index.html');
const RE=/const APP_VER='([^']+)';/;
const src=fs.readFileSync(P,'utf8');
const m=src.match(RE);
if(!m)throw new Error('لم يُعثر على APP_VER في tahaddi/index.html');
const cur=m[1];
let next=process.argv[2];
if(!next){
 const p=cur.split('.');
 if(p.length<2||!/^\d+$/.test(p[0])||!/^\d+$/.test(p[1]))throw new Error('رقم إصدار غير مفهوم: '+cur);
 next=p[0]+'.'+(Number(p[1])+1);
}
if(!/^\d+\.\d+$/.test(next))throw new Error('صيغة غير صالحة: '+next+' — المطلوب مثل 6.32');
if(next===cur)throw new Error('الرقم نفسه: '+cur+' — الرفع بلا تغيير لا يُعلن تحديثًا');
const out=src.replace(RE,"const APP_VER='"+next+"';");
if(out===src)throw new Error('الاستبدال لم يغيّر شيئًا');
fs.writeFileSync(P,out);
try{require('child_process').execFileSync(process.execPath,[require('path').join(__dirname,'splash-total.cjs')],{stdio:'inherit'})}catch(e){}   // ٦٫٩٥: أرقام شاشة الدخول بعد تغيير الإصدار
const back=fs.readFileSync(P,'utf8').match(RE)[1];
if(back!==next)throw new Error('كُتب '+back+' لا '+next);
console.log('✓ الإصدار '+cur+' ← '+next);
