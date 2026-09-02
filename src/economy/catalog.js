/**
 * كتالوج المنتجات المدفوعة — قائمة واحدة يقرأها الهاتف (العرض) والخادم (المنح).
 * المعرّفات هي نفسها معرّفات المنتجات في App Store Connect وGoogle Play Console.
 * الأسعار هنا للعرض فقط؛ السعر الفعلي يعرضه المتجر بعملة اللاعب، والمال لا يمرّ بهذا الكود أبدًا.
 * ما يُمنح عند الشراء يقرّره الخادم من هذا الملف لا من الهاتف.
 */
var CATALOG=(function(){
 'use strict';
 var PRODUCTS=[
  {id:'gems_80',     kind:'gems',   usd:0.99,  gems:80,    n:'شرارة', art:'spark',  bonus:0},
  {id:'gems_500',    kind:'gems',   usd:4.99,  gems:500,   n:'قَبَس',  art:'ember',  bonus:0},
  {id:'gems_1200',   kind:'gems',   usd:9.99,  gems:1200,  n:'مشعل',  art:'torch',  bonus:8},
  {id:'gems_2500',   kind:'gems',   usd:19.99, gems:2500,  n:'كنز',   art:'chest',  bonus:15},
  {id:'gems_6500',   kind:'gems',   usd:49.99, gems:6500,  n:'خزنة',  art:'vault',  bonus:22},
  {id:'gems_14000',  kind:'gems',   usd:99.99, gems:14000, n:'قمّة',  art:'summit', bonus:30},
  {id:'bundle_start',kind:'bundle', usd:2.99,  gems:300, coins:3000, wild:'rare', n:'حزمة البداية', d:'300 جوهرة + 3000 عملة + جوكر نادر'},
  {id:'season_pass', kind:'pass',   usd:9.99,  gems:200, pass:true, consumable:false, n:'التذكرة المميزة', d:'تفعيل تذكرة الموسم + 200 جوهرة'}
 ];
 var byId={};
 for(var i=0;i<PRODUCTS.length;i++)byId[PRODUCTS[i].id]=PRODUCTS[i];
 function get(id){return (typeof id==='string'&&Object.prototype.hasOwnProperty.call(byId,id))?byId[id]:null}
 function ofKind(k){return PRODUCTS.filter(function(p){return p.kind===k})}
 /** ما يُمنح فعلًا — أرقام صريحة لا مراجع، ليُحفظ مع الإيصال كما مُنح */
 function grantOf(p){
  if(typeof p==='string')p=get(p);
  if(!p)return null;
  return {gems:p.gems|0,coins:p.coins|0,wild:p.wild||null,pass:!!p.pass};
 }
 return {PRODUCTS:PRODUCTS,get:get,ofKind:ofKind,grantOf:grantOf,ids:PRODUCTS.map(function(p){return p.id})};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=CATALOG;
