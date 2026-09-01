# -*- coding: utf-8 -*-
import json, io, os
SP='/tmp/claude-0/-home-user-almshani/97965b3e-e6ba-53ce-b040-7f738db54c4c/scratchpad/'

CSS = r'''
:root{--bg:#0B1020;--pn:#131A2E;--ln:#2A3552;--tx:#F2EEE4;--tx2:#9AA6C4;--gold:#E8B23A;--rd:#E24B4A}
*{box-sizing:border-box}
body{margin:0;background:radial-gradient(1200px 600px at 50% -10%,#1B2440,#080C18 70%);
 color:var(--tx);font:15px/1.7 system-ui,"Segoe UI",Tahoma,sans-serif;
 min-height:100vh;padding:20px 14px 46px}
.wrap{max-width:640px;margin:0 auto}
h1{font-size:21px;font-weight:900;margin:2px 0 4px;letter-spacing:.2px}
h1 span{color:var(--gold)}
.sub{color:var(--tx2);font-size:13px;margin:0 0 18px}
.card{background:linear-gradient(180deg,#151D33,#101729);border:1px solid var(--ln);
 border-radius:18px;padding:16px;margin-bottom:14px;box-shadow:0 10px 30px rgba(0,0,0,.35)}
.drop{border:2px dashed #3C4A70;border-radius:16px;padding:26px 14px;text-align:center;
 cursor:pointer;transition:.18s;display:block}
.drop:hover,.drop.on{border-color:var(--gold);background:#E8B23A0F}
.drop .ic{font-size:38px;line-height:1}
.drop b{display:block;font-size:16px;margin-top:8px;color:var(--gold)}
.drop small{color:var(--tx2);display:block;margin-top:4px}
input[type=file]{display:none}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:11px;margin-top:14px}
.th{position:relative;border-radius:13px;overflow:hidden;border:1px solid var(--ln);background:#0A0E1A}
.th img{width:100%;display:block;aspect-ratio:1;object-fit:cover}
.th .no{position:absolute;top:6px;inset-inline-end:6px;width:28px;height:28px;border-radius:50%;
 border:none;background:rgba(10,12,20,.82);color:var(--rd);font:900 15px system-ui;cursor:pointer}
.th .nm{position:absolute;inset-inline:0;bottom:0;background:linear-gradient(0deg,#000C,#0000);
 font-size:10px;padding:14px 7px 5px;color:#DCE3F5;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
textarea{width:100%;background:#0C1120;border:1px solid var(--ln);border-radius:12px;color:var(--tx);
 font:14px/1.6 system-ui;padding:11px;resize:vertical;min-height:78px}
.btn{display:block;width:100%;margin-top:11px;padding:13px;border-radius:14px;border:1px solid #E8B23A66;
 background:linear-gradient(180deg,#3A2C18,#241A0E);color:var(--gold);font:900 15px system-ui;cursor:pointer}
.btn:disabled{opacity:.5;cursor:default}
.st{margin-top:11px;font-size:13px;font-weight:700;text-align:center;min-height:20px}
.st.ok{color:#4ED08A}.st.er{color:var(--rd)}.st.wk{color:var(--tx2)}
.hint{color:var(--tx2);font-size:12.5px;margin-top:10px}
.empty{color:var(--tx2);text-align:center;padding:18px 0;font-size:13px}
'''

RUNTIME = r'''
var TITLE='صور تصميم تحدي';
var CSS=__CSSJSON__;
var ST=(function(){try{return JSON.parse(document.getElementById('st').textContent||'{}')}catch(e){return{}}})();
if(!ST.imgs)ST.imgs=[];
if(typeof ST.note!=='string')ST.note='';
var busy=0;

function esc(s){return String(s).replace(/[&<>"]/g,function(c){
 return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}

function docHTML(st){
 var j=JSON.stringify(st).replace(/</g,'\\u003c');
 return '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">'
  +'<meta name="viewport" content="width=device-width,initial-scale=1">'
  +'<title>'+TITLE+'</title><style>'+CSS+'</style></head><body>'
  +'<script id="st" type="application/json">'+j+'<\/script>'
  +'<div id="app"></div>'
  +'<script>var SRC='+JSON.stringify(SRC).replace(/<\/script/gi,'<\\/script')+';\n'+SRC+'\n<\/script>'
  +'</body></html>';
}

function say(msg,cls){
 var e=document.getElementById('st1');
 if(e){e.textContent=msg||'';e.className='st '+(cls||'wk')}
}

function render(){
 var n=ST.imgs.length;
 document.getElementById('app').innerHTML=
  '<div class="wrap">'
  +'<h1>صور <span>تصميم تحدي</span></h1>'
  +'<p class="sub">ارفع هنا صور الشكل الذي تريده — أقرؤها مباشرة وأطبّقها على اللعبة.</p>'
  +'<div class="card">'
  +'<label class="drop" id="dz"><div class="ic">🖼️</div>'
  +'<b>اختر صورًا من هاتفك</b><small>أو اسحب الصور إلى هنا · PNG أو JPG</small>'
  +'<input type="file" id="fi" accept="image/*" multiple></label>'
  +(n?'<div class="grid">'+ST.imgs.map(function(im,i){
      return '<div class="th"><img src="'+im.d+'" alt="">'
        +'<button class="no" data-i="'+i+'">✕</button>'
        +'<div class="nm">'+esc(im.n||('صورة '+(i+1)))+'</div></div>'}).join('')
    +'</div>':'<div class="empty">لا توجد صور بعد</div>')
  +'<div class="hint">الصور تُصغَّر تلقائيًا قبل الحفظ حتى تبقى الصفحة خفيفة.</div>'
  +'</div>'
  +'<div class="card">'
  +'<div style="font-weight:900;margin-bottom:8px">ملاحظاتك على التصميم</div>'
  +'<textarea id="nt" placeholder="اكتب ما تريده بالضبط… مثلاً: أريد الإطار أعرض، والألوان أغمق">'+esc(ST.note)+'</textarea>'
  +'<button class="btn" id="sv">💾 احفظ الملاحظات</button>'
  +'<div class="st wk" id="st1">'+(n?('محفوظ: '+n+' صورة'):'')+'</div>'
  +'</div></div>';

 document.getElementById('fi').onchange=function(e){pick(e.target.files);e.target.value=''};
 document.getElementById('sv').onclick=function(){ST.note=document.getElementById('nt').value;save()};
 Array.prototype.forEach.call(document.querySelectorAll('.no'),function(b){
  b.onclick=function(){ST.imgs.splice(+b.getAttribute('data-i'),1);render();save()}});
 var dz=document.getElementById('dz');
 ['dragenter','dragover'].forEach(function(t){dz.addEventListener(t,function(e){
  e.preventDefault();dz.classList.add('on')})});
 ['dragleave','drop'].forEach(function(t){dz.addEventListener(t,function(e){
  e.preventDefault();dz.classList.remove('on')})});
 dz.addEventListener('drop',function(e){if(e.dataTransfer&&e.dataTransfer.files)pick(e.dataTransfer.files)});
}

function shrink(file){
 return new Promise(function(res,rej){
  var fr=new FileReader();
  fr.onerror=function(){rej(new Error('read'))};
  fr.onload=function(){
   var im=new Image();
   im.onerror=function(){rej(new Error('decode'))};
   im.onload=function(){
    var M=1500,w=im.width,h=im.height;
    if(w>M||h>M){var k=M/Math.max(w,h);w=Math.round(w*k);h=Math.round(h*k)}
    var c=document.createElement('canvas');c.width=w;c.height=h;
    var x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,w,h);x.drawImage(im,0,0,w,h);
    res(c.toDataURL('image/jpeg',0.86));
   };
   im.src=fr.result;
  };
  fr.readAsDataURL(file);
 });
}

function pick(files){
 if(busy||!files||!files.length)return;
 busy=1;say('يجهّز الصور…','wk');
 var list=Array.prototype.slice.call(files).filter(function(f){return /^image\//.test(f.type)});
 if(!list.length){busy=0;say('اختر ملفات صور فقط','er');return}
 Promise.all(list.map(function(f){
  return shrink(f).then(function(d){return {n:f.name,d:d}},function(){return null})
 })).then(function(out){
  out.forEach(function(o){if(o)ST.imgs.push(o)});
  if(ST.imgs.length>14)ST.imgs=ST.imgs.slice(-14);
  busy=0;render();save();
 });
}

function save(){
 say('يحفظ…','wk');
 if(typeof claude==='undefined'||!claude.use){
  say('هذه معاينة محلية — افتح الرابط من حسابك ليُحفظ','er');return}
 claude.use('artifact').then(function(a){
  if(!a){say('الحفظ غير متاح في هذا العرض — افتح الصفحة من حسابك','er');return}
  return a.publish(docHTML(ST)).then(function(){say('تم الحفظ ✔ — أستطيع قراءتها الآن','ok')});
 }).catch(function(e){
  var c=(e&&e.code)||'';
  if(c==='conflict')say('حُفظت نسخة أحدث — أعد تحميل الصفحة ثم أعد المحاولة','er');
  else say('تعذّر الحفظ'+(c?(' ('+c+')'):''),'er');
 });
}
render();
'''

def build(state):
    j = json.dumps(state, ensure_ascii=False).replace('<', '\\u003c')
    src = RUNTIME.replace('__CSSJSON__', json.dumps(CSS))
    head = ('<title>صور تصميم تحدي</title>\n<style>' + CSS + '</style>\n'
            + '<script id="st" type="application/json">' + j + '</script>\n'
            + '<div id="app"></div>\n'
            + '<script>var SRC=' + json.dumps(src) + ';\n' + src + '\n</script>\n')
    return head

open(SP+'tahaddi-upload.html','w',encoding='utf-8').write(build({"imgs":[],"note":""}))
print('built', os.path.getsize(SP+'tahaddi-upload.html'))
