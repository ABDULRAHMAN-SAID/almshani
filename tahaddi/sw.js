/* عامل خدمة تحدّي — يجعل اللعبة تعمل دون اتصال وتُثبَّت على الشاشة الرئيسية.
   الإصدار يأتي من ?v=APP_VER عند التسجيل: كل إصدار جديد = عامل جديد = مخزن جديد،
   والمخازن القديمة تُمحى عند التفعيل. الخادم (/health و/ws) لا يُخزَّن أبدًا.

   الصفحة من الشبكة أوّلًا، وما عداها من المخزن:
   اللعبة كلّها صفحةٌ واحدة، فخدمتُها من المخزن أوّلًا تعني أنّ كل تحديثٍ
   يتأخّر إطلاقةً كاملة — يُنزَّل في الخلفية ولا يُرى إلا في الفتحة التالية.
   فصارت الصفحة تُطلب من الشبكة، وإن تأخّرت أو انقطعت رجعت من المخزن: من كان
   متّصلًا رأى الجديد الآن، ومن انقطع لعب كما كان. والأيقونات والخطوط والساحات
   لا تتغيّر بتغيّر الإصدار، فتبقى من المخزن فورًا. */
const V=new URL(self.location.href).searchParams.get('v')||'dev';
const CACHE='tahaddi-'+V;
const SHELL=['./','./index.html','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png','./icons/maskable-512.png','./icons/apple-touch-180.png'];
const NET_MS=6000;                     // بعدها نلعب بالمخزن بدل أن ننتظر شبكةً ميّتة

self.addEventListener('install',e=>{
/* ٦٫٦٦: اللوح مرسومٌ داخل اللعبة — لا صورة لوحٍ ولا يدٍ تُخزَّن. أصوات الكيرم والضحكة تُخزَّن مسبقًا فتعمل بلا شبكة */
 e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL).then(()=>c.addAll(['./audio/carrom.json?v='+V,'./audio/carrom.webm?v='+V,'./audio/laugh.webm']).catch(()=>{}))).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
 e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});

/** طلبٌ لا ينتظر أكثر من مهلة — شبكةٌ بطيئة أسوأ من مخزنٍ قديم عند الإقلاع */
function netIn(req,ms){
 const ac=new AbortController();
 const t=setTimeout(()=>ac.abort(),ms);
 return fetch(req,{signal:ac.signal,cache:'no-store'}).finally(()=>clearTimeout(t));
}

self.addEventListener('fetch',e=>{
 const req=e.request;
 if(req.method!=='GET')return;
 const url=new URL(req.url);
 if(url.origin!==self.location.origin)return;                 // الخادم البعيد وغيره: شأن المتصفح
 if(/\/(health|ws)$/.test(url.pathname))return;               // حالة الخادم لا تُخزَّن
 if(/\/version\.json$/.test(url.pathname))return;             // فحص التحديث يسأل الشبكة لا المخزن

 const doc=req.mode==='navigate'||/(^|\/)(index\.html)?$/.test(url.pathname);
 if(doc){
  // الشبكة أوّلًا: نسخةٌ قديمة من الصفحة = تحديثٌ لا يصل
  /* ٦٫٩٨ — «لا أرى التعديلات»: الصفحة ٩ ميجا، وعلى شبكة الجوّال لا تصل في ٦ ثوانٍ، فكان التنزيل يُلغى
     وتُخدم النسخة القديمة من المخزن — في كلّ فتحة، وحتى بعد ضغط «تحديث جاهز». الآن لا يُلغى التنزيل أبدًا:
     إن تأخّر خُدم المخزن مؤقّتًا وأكمل التنزيل في الخلفية وحُفظ، فالفتحة التالية جديدة؛ وطلب التحديث الصريح
     (?v=… من شريط «تحديث جاهز») ينتظر الشبكة حتى تصل. */
  const explicit=url.searchParams.has('v');
  const c0=caches.open(CACHE);
  const net=fetch(req,{cache:'no-store'}).then(r=>{
   if(r&&r.ok){const cp=r.clone();c0.then(c=>c.put('./index.html',cp)).catch(()=>{})}
   return r}).catch(()=>null);
  e.waitUntil(net);                                            // يكمل التنزيل ولو خُدم المخزن
  e.respondWith((async()=>{
   const c=await c0;
   const hit=await c.match('./index.html')||await c.match('./');
   if(explicit||!hit){const r=await net;if(r&&r.ok)return r;return hit||r||new Response('',{status:504,statusText:'offline'})}
   const r=await Promise.race([net,new Promise(ok=>setTimeout(()=>ok('slow'),NET_MS))]);
   if(r&&r!=='slow'&&r.ok)return r;
   return hit;
  })());
  return;
 }

 // بقيّة الملفّات: من المخزن فورًا، ثم تحديث صامت من الشبكة للإطلاقة التالية
 e.respondWith(caches.open(CACHE).then(async c=>{
  const hit=await c.match(req);
  const net=fetch(req).then(r=>{if(r&&r.ok)c.put(req,r.clone());return r}).catch(()=>null);
  if(hit){net.catch(()=>{});return hit}
  const r=await net;
  if(r)return r;
  return new Response('',{status:504,statusText:'offline'});
 }));
});
