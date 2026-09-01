/**
 * طبقة الشبكة — وجه واحد للعبة، وخلفه ثلاثة أوضاع:
 *   server    خادم تحدّي (server/src/tahaddi) عبر WebSocket على /ws — الحقيقة عنده
 *   artifact  داخل claude.ai: الغرف عبر قدرة room، ولا خادم
 *   local     ملفّ محلي أو بلا شبكة — كل شيء على الجهاز
 *
 * لا DOM هنا إلا window/location/WebSocket. اللعبة تسأل NET ولا تعرف الوضع.
 */
var NET=(function(){
 'use strict';
 var st={mode:'local',connected:false,id:null,name:null,peer:null,token:null,url:null,seasonId:null,hasCloud:false,lastError:null};
 var ws=null, ridN=0, waiting={}, topicSubs={}, peerSubs=[], peers=[], myPresence={};
 var listeners={welcome:[],state:[],resultFinal:[]};
 var backoff=1000, wantOpen=false, helloOpts={}, W=(typeof window!=='undefined')?window:null;

 function detect(){
  if(!W)return 'local';
  if(W.claude&&typeof W.claude.use==='function')return 'artifact';
  try{
   if(/^https?:$/.test(W.location.protocol)&&typeof W.WebSocket==='function')return 'server';
  }catch(e){}
  return 'local';
 }
 function wsUrl(){return (W.location.protocol==='https:'?'wss://':'ws://')+W.location.host+'/ws'}
 function fire(k,v){(listeners[k]||[]).forEach(function(f){try{f(v)}catch(e){}})}
 function setState(patch){Object.assign(st,patch);fire('state',state())}
 function state(){return {mode:st.mode,connected:st.connected,id:st.id,name:st.name,peer:st.peer,token:st.token,seasonId:st.seasonId,hasCloud:st.hasCloud,lastError:st.lastError}}
 function on(k,f){if(!listeners[k])listeners[k]=[];listeners[k].push(f);return function(){listeners[k]=listeners[k].filter(function(x){return x!==f})}}

 function send(m){if(ws&&ws.readyState===1){try{ws.send(JSON.stringify(m))}catch(e){}return true}return false}
 function request(m,timeoutMs){
  m.rid='r'+(++ridN);
  return new Promise(function(res,rej){
   if(!send(m)){rej({code:'offline'});return}
   waiting[m.rid]={res:res,rej:rej,tm:setTimeout(function(){delete waiting[m.rid];rej({code:'timeout'})},timeoutMs||8000)};
  });
 }
 function settle(m){
  var w=waiting[m.rid];if(!w)return false;
  clearTimeout(w.tm);delete waiting[m.rid];
  if(m.t==='error')w.rej({code:m.code,message:m.message});else w.res(m);
  return true;
 }
 function onMsg(m){
  if(m.t==='welcome'){
   setState({connected:true,id:m.id,name:m.name,peer:m.peer,token:m.token,seasonId:m.seasonId,hasCloud:!!m.hasCloud,lastError:null});
   backoff=1000;
   if(Object.keys(myPresence).length)send({t:'presence',patch:myPresence});   // بعد إعادة الاتصال يعود حضوري
   settle(m);fire('welcome',m);return;
  }
  if(m.rid&&settle(m))return;
  if(m.t==='peers'){peers=m.list||[];peerSubs.forEach(function(f){try{f(peersView())}catch(e){}});return}
  if(m.t==='msg'){
   var hs=topicSubs[m.topic]||[];
   var msg={topic:m.topic,data:m.data,peer:m.from.peer,by:m.from.by,isMe:m.from.by===st.id,sameTab:m.from.peer===st.peer,kind:'viewer'};
   hs.forEach(function(f){try{f(msg)}catch(e){}});return;
  }
  if(m.t==='resultFinal'){fire('resultFinal',m);return}
  if(m.t==='error'&&!m.rid){st.lastError=m.code}
 }

 /** يفتح الاتصال ويعرّف الحساب. يعيد وعدًا بـ true عند أول ترحيب، و false إن تعذّر */
 /** هل هناك خادم تحدّي على هذا الأصل؟ /health يجيب بلا ضجيج في السجل — فتح WebSocket على مضيف صامت يطبع خطأ في console */
 function probe(){
  if(st.url)return Promise.resolve(true);
  if(typeof W.fetch!=='function')return Promise.resolve(true);
  return W.fetch('/health',{cache:'no-store'}).then(function(r){return r.ok?r.json():null})
   .then(function(j){return !!(j&&j.ok)}).catch(function(){return false});
 }
 function connect(opts){
  helloOpts=opts||helloOpts;
  if(st.mode!=='server')return Promise.resolve(false);
  wantOpen=true;
  return new Promise(function(resolve){
   var done=false, fin=function(v){if(!done){done=true;resolve(v)}};
   probe().then(function(has){
    if(!has){wantOpen=false;setState({mode:'local'});fin(false);return}
    open();
   });
   function open(){
   try{ws=new W.WebSocket(st.url||wsUrl())}catch(e){setState({connected:false,lastError:'ws'});fin(false);return}
   var guard=setTimeout(function(){if(!st.connected){try{ws.close()}catch(e){}fin(false)}},4000);
   ws.onopen=function(){send({t:'hello',token:helloOpts.token||st.token||undefined,name:helloOpts.name||undefined})};
   ws.onmessage=function(ev){var m;try{m=JSON.parse(ev.data)}catch(e){return}
    if(m&&m.t==='welcome'){clearTimeout(guard);onMsg(m);fin(true);return}
    if(m&&typeof m.t==='string')onMsg(m)};
   ws.onclose=function(){
    var was=st.connected;
    setState({connected:false});
    Object.keys(waiting).forEach(function(k){clearTimeout(waiting[k].tm);waiting[k].rej({code:'offline'});delete waiting[k]});
    fin(false);
    if(wantOpen&&was){setTimeout(function(){if(wantOpen)connect()},backoff);backoff=Math.min(15000,backoff*2)}
    else if(wantOpen&&!was){wantOpen=false;setState({mode:'local'})}   // لا خادم هنا أصلًا — محلي
   };
   ws.onerror=function(){};
   }
  });
 }
 function disconnect(){wantOpen=false;if(ws){try{ws.close()}catch(e){}}ws=null;setState({connected:false})}

 /** الإقلاع: يحدّد الوضع ويتصل إن كان هناك خادم. لا يرمي أبدًا */
 function boot(opts){
  st.mode=detect();
  if(st.mode!=='server')return Promise.resolve(state());
  return connect(opts||{}).then(function(){return state()});
 }

 /* ── واجهة الحساب والحفظ والنتائج ── */
 function saveCloud(blob,t){return request({t:'saveCloud',save:{t:t||Date.now(),blob:blob}})}
 function loadCloud(){return request({t:'loadCloud'})}
 function setName(name){return request({t:'setName',name:name})}
 function submitResult(report){return request({t:'submitResult',report:report},12000)}
 function leaderboard(gameId,limit){return request({t:'leaderboard',gameId:gameId,limit:limit||50})}
 function profile(id){return request({t:'profile',id:id})}

 /* ── الغرفة على الخادم — الواجهة نفسها التي تعطيها قدرة room في الأرتيفاكت ── */
 function peersView(){
  return peers.map(function(p){return {peer:p.peer,by:p.by,isMe:p.by===st.id,sameTab:p.peer===st.peer,kind:'viewer',presence:p.presence||{}}});
 }
 function roomCap(){
  return {
   peers:peersView,
   emit:function(topic,data){send({t:'emit',topic:topic,data:data});return Promise.resolve()},
   presence:function(patch){
    Object.keys(patch||{}).forEach(function(k){if(patch[k]==null)delete myPresence[k];else myPresence[k]=patch[k]});
    send({t:'presence',patch:patch||{}});return Promise.resolve();
   },
   on:function(topic,fn,onErr){
    if(!topicSubs[topic])topicSubs[topic]=[];topicSubs[topic].push(fn);
    var offState=on('state',function(s){if(!s.connected&&onErr){try{onErr({code:'unavailable',message:'انقطع الاتصال'})}catch(e){}}});
    return function(){topicSubs[topic]=(topicSubs[topic]||[]).filter(function(x){return x!==fn});offState()};
   },
   onPeers:function(fn){peerSubs.push(fn);return function(){peerSubs=peerSubs.filter(function(x){return x!==fn})}},
   connected:function(){return st.connected}
  };
 }

 return {boot:boot,connect:connect,disconnect:disconnect,state:state,on:on,
  saveCloud:saveCloud,loadCloud:loadCloud,setName:setName,submitResult:submitResult,leaderboard:leaderboard,profile:profile,
  roomCap:roomCap,_onMsg:onMsg,_setMode:function(m){st.mode=m},_setUrl:function(u){st.url=u}};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=NET;
