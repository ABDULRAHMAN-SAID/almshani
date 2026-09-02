/**
 * الشراء داخل التطبيق — الهاتف يطلب الشراء عبر المتجر، والمتجر يعطي إيصالًا، والخادم وحده يتحقّق ويمنح.
 *
 * الجسر الأصلي: تطبيق المتجر (Capacitor) يضع كائنًا على window.TahaddiBilling بهذا العقد:
 *   platform: 'ios' | 'android'
 *   buy(productId)  → Promise<{platform, productId, receipt, transactionId}>   (receipt: إيصال App Store أو purchaseToken من Google Play)
 *   finish(r)       اختياري — يُستدعى بعد أن يمنح الخادم (استهلاك المنتج عند Google)
 *   restore()       اختياري — Promise<[{platform, productId, receipt, transactionId}]>
 * بلا هذا الجسر (نسخة الويب) لا يوجد شراء بالمال، وتقول الواجهة ذلك بصراحة.
 * لا DOM هنا إلا window. لا يرمي إلا وعودًا مرفوضة بـ e.code.
 */
var Billing=(function(){
 'use strict';
 var W=(typeof window!=='undefined')?window:null;
 var net=null, catalog=null;
 function init(o){if(o&&o.net)net=o.net;if(o&&o.catalog)catalog=o.catalog}
 function provider(){
  try{var b=W&&W.TahaddiBilling;if(b&&typeof b.buy==='function')return b}catch(e){}
  return null;
 }
 function serverOk(){
  try{var s=net&&net.state();return !!(s&&s.mode==='server'&&s.connected)}catch(e){return false}
 }
 /** 'store' جاهز للشراء · 'no_store' لا جسر متجر (ويب) · 'no_server' لا خادم يتحقّق */
 function status(){
  if(!provider())return 'no_store';
  if(!serverOk())return 'no_server';
  return 'store';
 }
 function err(code,msg){var e=new Error(msg||code);e.code=code;return e}
 function claimOf(b,productId,r){
  return {platform:String(r.platform||b.platform||'unknown'),productId:productId,
   receipt:String(r.receipt),transactionId:r.transactionId!=null?String(r.transactionId):undefined};
 }
 function verifyWithServer(claim){
  return net.purchase(claim).then(function(m){
   if(m&&m.t==='purchased')return m;
   throw err((m&&m.code)||'verify_failed');
  },function(e){throw err((e&&e.code)||'offline')});
 }
 /** يشتري منتجًا: المتجر → إيصال → الخادم يتحقّق ويمنح. يعيد {productId, grant, txId, duplicate} */
 function buy(productId){
  var p=catalog&&catalog.get(productId);
  if(!p)return Promise.reject(err('unknown_product'));
  var b=provider();
  if(!b)return Promise.reject(err('no_provider'));
  if(!serverOk())return Promise.reject(err('offline'));
  return Promise.resolve().then(function(){return b.buy(productId)}).then(function(r){
   if(!r||!r.receipt)throw err('cancelled');
   return verifyWithServer(claimOf(b,productId,r)).then(function(m){
    try{if(typeof b.finish==='function')b.finish(r)}catch(e){}
    return m;
   });
  },function(e){throw (e&&e.code)?e:err('cancelled',e&&e.message)});
 }
 /** يستعيد مشتريات المتجر (غير المستهلكة) ويمرّرها على الخادم — يعيد ما مُنح أو كان ممنوحًا */
 function restore(){
  var b=provider();
  if(!b||typeof b.restore!=='function')return Promise.resolve([]);
  if(!serverOk())return Promise.reject(err('offline'));
  return Promise.resolve().then(function(){return b.restore()}).then(function(list){
   list=Array.isArray(list)?list:[];
   var out=[];
   return list.reduce(function(chain,r){
    return chain.then(function(){
     if(!r||!r.receipt||!r.productId)return;
     return verifyWithServer(claimOf(b,r.productId,r)).then(function(m){out.push(m)},function(){});
    });
   },Promise.resolve()).then(function(){return out});
  });
 }
 var AR={
  cancelled:'ألغيت عملية الشراء — لم يُخصم شيء',
  no_provider:'الشراء بالمال متاح من داخل تطبيق تحدّي على App Store وGoogle Play فقط',
  offline:'لا اتصال بخادم تحدّي — لن يُخصم شيء',
  unknown_product:'منتج غير معروف',
  already_used:'هذا الإيصال استُخدم في حساب آخر من قبل',
  verify_failed:'لم يتحقّق المتجر من الشراء — لم يُمنح شيء',
  iap_unavailable:'الشراء غير مفعّل على هذا الخادم بعد',
  bad_claim:'طلب شراء غير صالح'
 };
 function explain(e){var c=e&&e.code;return AR[c]||('تعذّر الشراء ('+(c||'؟')+')')}
 return {init:init,provider:provider,status:status,buy:buy,restore:restore,explain:explain,_AR:AR};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=Billing;
