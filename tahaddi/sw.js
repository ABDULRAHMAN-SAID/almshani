/* عامل خدمة تحدّي — يجعل اللعبة تعمل دون اتصال وتُثبَّت على الشاشة الرئيسية.
   الإصدار يأتي من ?v=APP_VER عند التسجيل: كل إصدار جديد = عامل جديد = مخزن جديد،
   والمخازن القديمة تُمحى عند التفعيل. الخادم (/health و/ws) لا يُخزَّن أبدًا. */
const V=new URL(self.location.href).searchParams.get('v')||'dev';
const CACHE='tahaddi-'+V;
const SHELL=['./','./index.html','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png','./icons/maskable-512.png','./icons/apple-touch-180.png'];

self.addEventListener('install',e=>{
 e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
 e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE&&k!==CACHE+'-fonts').map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
 const req=e.request;
 if(req.method!=='GET')return;
 const url=new URL(req.url);
 // خطّ Cairo من Google Fonts: يُخزَّن كما هو (استجابة مبهمة) كي لا يسقط الخطّ دون اتصال
 if(/^fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)){
  e.respondWith(caches.open(CACHE+'-fonts').then(async c=>{
   const hit=await c.match(req);if(hit)return hit;
   try{const r=await fetch(req);if(r&&(r.ok||r.type==='opaque'))c.put(req,r.clone());return r}
   catch(err){return new Response('',{status:504})}
  }));
  return;
 }
 if(url.origin!==self.location.origin)return;                 // الخادم البعيد وغيره: شأن المتصفح
 if(/\/(health|ws)$/.test(url.pathname))return;               // حالة الخادم لا تُخزَّن
 // الهيكل: من المخزن فورًا، ثم تحديث صامت من الشبكة للإطلاقة التالية
 e.respondWith(caches.open(CACHE).then(async c=>{
  const hit=await c.match(req,{ignoreSearch:req.mode==='navigate'});
  const net=fetch(req).then(r=>{if(r&&r.ok)c.put(req,r.clone());return r}).catch(()=>null);
  if(hit){net.catch(()=>{});return hit}
  const r=await net;
  if(r)return r;
  if(req.mode==='navigate'){const idx=await c.match('./index.html');if(idx)return idx}
  return new Response('',{status:504,statusText:'offline'});
 }));
});
