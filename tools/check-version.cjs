#!/usr/bin/env node
/**
 * يرفض دفعةً غيّرت اللعبة ولم ترفع رقمها.
 *
 * فاحص التحديث في اللعبة يقارن APP_VER بما في version.json على الشبكة.
 * فإن تغيّرت الشيفرة والرقم ثابت، وصل الجديد ولم يُعلن — ولا يدري صاحبه.
 * وهذا ما وقع ثلاث دفعات متتالية، فصار الفحص يمنعه لا الانتباه.
 */
const {execFileSync}=require('child_process');
const RE=/const APP_VER='([^']+)';/;
/* اللعبة ٩٫٨ ميجا وحدّ المخزن الافتراضيّ ميجا واحدة، فبلا maxBuffer يسقط
   الأمر بـENOBUFS — وكان يُبتلع فيتجاوز الحارس نفسه صامتًا: العطل الذي
   وُضع ليمنعه. فلا يُتجاوز إلّا إن غاب الملفّ من النسخة السابقة، ولا شيء غيره. */
const git=a=>execFileSync('git',a,{encoding:'utf8',maxBuffer:256*1024*1024});
const verOf=s=>{const m=s.match(RE);return m?m[1]:null};

let base=process.argv[2]||'HEAD';
let prev;
try{prev=git(['show',base+':tahaddi/index.html'])}
catch(e){
 const msg=String(e&&e.message||e);
 if(/does not exist|unknown revision|not a git repository|exists on disk/i.test(msg)){
  console.log('لا نسخة سابقة للمقارنة — يُتجاوز');process.exit(0);
 }
 console.error('✗ تعذّرت قراءة النسخة السابقة: '+msg.split('\n')[0]);
 process.exit(1);
}

const now=require('fs').readFileSync('tahaddi/index.html','utf8');
const a=verOf(prev),b=verOf(now);
if(!a||!b){console.error('✗ لم يُعثر على APP_VER في إحدى النسختين');process.exit(1)}

// نقارن الشيفرة بعد تحييد سطر الإصدار نفسه
const strip=s=>s.replace(RE,'');
if(strip(prev)===strip(now)){
 console.log('✓ اللعبة لم تتغيّر — لا رفع مطلوب ('+b+')');
 process.exit(0);
}
if(a===b){
 console.error('✗ اللعبة تغيّرت والإصدار ثابت على '+a);
 console.error('  ارفعه:  node tools/bump.cjs');
 console.error('  وإلّا وصل التحديث ولم يُعلن — الفاحص يقارن الرقم لا الشيفرة.');
 process.exit(1);
}
console.log('✓ اللعبة تغيّرت والإصدار رُفع: '+a+' ← '+b);
