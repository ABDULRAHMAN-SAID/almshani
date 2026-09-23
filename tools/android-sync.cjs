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
 * ٣) يكتب TAHADDI_HOME في مورد نصّي يقرؤه الغلاف: عنوان اللعبة على الويب. فإن ضُبط
 *    حمّل التطبيقُ أحدثَ لعبةٍ من الشبكة.
 * ٤) وحين يُضبط، لا تُحزَم اللعبة مرّتين: نسخة الحزمة كانت ٥٫٥ من ٩٫٢ ميجا —
 *    نصف التنزيل لملفٍّ لا يُفتح إلّا حين تنقطع الشبكة. فتُستبدل بصفحة اعتذار
 *    صغيرة، ويصير التطبيق ملفًّا يُنزَّل على شبكةٍ ضعيفة دون أن ينقطع.
 *    وTAHADDI_FULL=1 يُرجع النسخة الكاملة لمن أرادها.
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

/* عنوان اللعبة على الويب — https وحدها، وبلا محارف تكسر ملفّ الموارد.
   والتحقّق هنا لا في جافا: خطأٌ في البناء أوضح من تطبيقٍ يفتح على بياض. */
const HOME=(process.env.TAHADDI_HOME||'').trim();
if(HOME&&!/^https:\/\/[^\s"'<>&]+$/.test(HOME))
 throw new Error('TAHADDI_HOME لا بدّ أن يكون عنوان https بلا محارف خاصّة: '+HOME);
fs.writeFileSync(path.join(ROOT,'app-android','app','src','main','res','values','tahaddi-home.xml'),
 `<?xml version="1.0" encoding="utf-8"?>\n`+
 `<!-- مولَّد من tools/android-sync.cjs — لا يُحرَّر يدويًّا -->\n`+
 `<resources>\n <string name="tahaddi_home">${HOME}</string>\n</resources>\n`);

/* نصف الحزمة كان نسخةً ثانية من اللعبة لا تُفتح إلّا بلا شبكة. فحين يكون لها بيتٌ
   على الويب تُترك صفحةٌ تقول ذلك بوضوح، لا صفحةٌ بيضاء ولا لعبةٌ مكرّرة. */
if(HOME&&process.env.TAHADDI_FULL!=='1'){
 fs.writeFileSync(path.join(ASSETS,'index.html'),
`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>تحدي — عالم المعرفة</title><style>
html,body{margin:0;height:100%;background:#080B14;color:#F2F4F8;
 font-family:system-ui,-apple-system,'Segoe UI',Tahoma,sans-serif;-webkit-text-size-adjust:100%}
.w{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;
 gap:18px;padding:32px;text-align:center;box-sizing:border-box}
h1{margin:0;font-size:26px;font-weight:900;color:#E8B23A;letter-spacing:.5px}
p{margin:0;font-size:15px;line-height:1.7;color:#9AA3B8;max-width:320px}
button{margin-top:6px;padding:14px 34px;font:inherit;font-weight:900;font-size:16px;
 color:#1A1408;background:#E8B23A;border:0;border-radius:14px;cursor:pointer}
</style></head><body><div class="w">
<h1>تحدّي</h1>
<p>اللعبة تحتاج اتصالًا بالإنترنت. تأكّد من الشبكة ثم أعد المحاولة.</p>
<button onclick="location.href='${HOME}'">أعد المحاولة</button>
</div></body></html>\n`);
}

let n=0,bytes=0;
(function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){
 const p=path.join(d,e.name); if(e.isDirectory())walk(p); else {n++;bytes+=fs.statSync(p).size}}})(ASSETS);
console.log(`✓ أصول التطبيق جاهزة — ${n} ملفًّا · ${(bytes/1048576).toFixed(1)}م · الإصدار ${name} (${code}) · اللعبة على الويب: ${HOME||'(الحزمة وحدها)'}`);
