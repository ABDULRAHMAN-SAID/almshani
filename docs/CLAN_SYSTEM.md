# عقد نظام النادي في «تحدي» — مصدر الحقيقة الوحيد

الملف: `/home/user/almshani/tahaddi/index.html` — ملف واحد، HTML+CSS+JS خام، بلا أطر عمل، RTL، للهواتف.
اقرأ منه قبل الكتابة: السطور 15096-15115 (التنقل)، 20621-20640 (الحالة S وحفظها)، 20245-20560 (نظام النادي القديم)،
13494-13560 و13727-13760 (البطاقات وECON)، 12593+ (الأيقونات ICO)، 18240-18500 (طبقة الغرف RM).

## حقيقة لا تُتجاوز
**لا يوجد خادم.** «Server Authoritative» عندنا = وحدة `CLAN` هي المكان **الوحيد** الذي تتغيّر فيه الحالة،
تتحقق من (الفاعل، الهدف، الصلاحية، المهلة) قبل كل تغيير وتسجّل الإجراء. مصمَّمة لتُرفع كما هي إلى خادم.
في الغرف الحيّة المضيف ينفّذها. **لا تدّعِ وجود خادم ولا دليل أندية عالمي ولا إشعارات هاتف.**
كل ما هو محاكى محليًا يُعلَن للاعب صراحةً بنص في الشاشة.

## طبقة المنصّة (تُكتب مرة، الوحدة ١ تكتبها والبقية تستعملها)
```js
S.uid                       // معرّف اللاعب، يُولَّد في loadState إن غاب
esc(s)                      // تهريب HTML — كل نص لاعب يمرّ به بلا استثناء
SCR                         // سجل الشاشات؛ run_ يقرأ منه ويتعامل مع المفقود بلا انهيار
navBar()                    // يُخفي/يُظهر الشريط السفلي حسب NAV_NOBAR[topScreen]
holdBtn(el,ms,fn)           // ضغط مطوّل بشريط تقدّم داخلي .hdp
pickSheet(t,d,opts,okTxt,fn)// ورقة اختيار سبب (opts=[[key,label],...]) → fn(key)
dur(ms)                     // «٣ ساعات» / «١٢ دقيقة» / «الآن»
ago(ts)                     // «نشط الآن» / «منذ ساعتين» / «منذ ٣ أيام»
clanText(s,max)             // {ok,v} أو {ok:0,err} — قصّ + فلتر ألفاظ + منع روابط + منع تكرار
weekKey()                   // 'w'+Math.floor((Date.now()/864e5+4)/7)   ← الحالية خاطئة، تُستبدل
dayKey()                    // 'd'+Math.floor(Date.now()/864e5)
```
موجود مسبقًا ويُستعمل كما هو: `toast` `confirmSheet` `buyFx` `grantRewards` `face(em,size)` `avatarArt(size)`
`hashStr` `ico(name,size)` `tierOf(S.ranked)` `push(fn,arg)` `back()` `refresh(fn)` `tbar(t,sub)` `saveState()`.
الأصناف: `li lr lb lt ls wb sl note btn btn.g btn.gd rbtn fin pbf pbi rkBadge qvov qvbox scr tbar bk`.
متغيّرات CSS: `--bg --surf --card --elev --bd --tx --tx2 --mut --gold --pur --ok --no --warn --info --gem`.

## الرتب — أربع فقط، **الأصغر أعلى** (يوافق الكود القائم)
```js
const RK_LEAD=0, RK_DEP=1, RK_MOD=2, RK_MEM=3;
const CLAN_RK=[{k:'lead',ar:'القائد',i:'crown',c:'#E8B23A'},
               {k:'dep' ,ar:'نائب القائد',i:'star',c:'#B76CF0'},
               {k:'mod' ,ar:'مشرف',i:'shield',c:'#5AC8F5'},
               {k:'mem' ,ar:'عضو',i:'user',c:'#A6AEC4'}];
CLAN.above(a,b) => a<b            // رتبة أعلى = رقم أصغر
```
القائد وحده يعيد تسمية الرتب (`c.rankNames[4]`) والمستوى الرقمي لا يتغيّر.

## شكل الحالة — `S.clan` (كائن واحد، اللاعب في نادٍ واحد)
```js
S.clan={
 c:{id,tag,n,m,desc,i,col,bg,jt,minTr,minLv,cap,lead,rankNames,perms,pin,ann,
    created,lvC,xpC,wk,goal,pts,leadSeen,leadWarn,dormant,rev,upd,ff},
 mem:{ [uid]:{uid,n,r,since,rAt,rBy,em,cups,lv,pts,ptsAll,donG,donGAll,donR,
              last,mute,muteBy,note,bot,claimedWk,kicks,dayK,dayReq,daySup,dayRcv} },
 jr:[ {id,uid,n,em,cups,lv,msg,at,exp,st,by,byN,atD,why} ],      // طلبات انضمام
 dr:[ {id,uid,n,cid,rar,need,got,fills:[{uid,n,v,at,last}],at,exp,st} ], // طلبات دعم
 chat:[ {id,uid,n,k,tx,at,del,ref} ],                            // k: 'msg'|'sys'|'dr'|'ann'|'chal'
 log:[ {at,by,byN,a,to,toN,d} ],                                 // سجل لا يُحذف يدويًا، سقف 200
 ban:[ {uid,n,at,by,byN,why,r} ],
 ev:null|{id,type,st,start,end,score,ghost},
 cd:{},                                                          // مهل: key→until
 seq:1, tickAt:0
}
S.clanNotif={chat:'all'|'me'|'none',ev:1,goal:1,req:1,role:1,don:1}
```
أسماء نهائية: `mem` `jr` `dr` `ban` `rev` `lvC` `xpC` — ولا مرادفات.
حالات `st`: `'pend'|'ok'|'no'|'exp'|'cancel'` للانضمام، `'open'|'full'|'exp'` للدعم.

## واجهة السلطة — ثلاث دوال لا غير
```js
CLAN.can(actorUid, action, targetUid)  // بولياني، للواجهة فقط (تعطيل الأزرار). لا تعدّل شيئًا.
CLAN.check(actorUid, action, payload)  // {ok:1} أو {ok:0,code:'...',msg:'نص عربي'} — نقية تمامًا
CLAN.act(actorUid, action, payload)    // تستدعي check ثانيةً ثم تنفّذ ذرّيًا ثم _commit. تعيد {ok,err,...}
CLAN._commit(entry)                    // rev++ · upd · CLAN.log(entry) · saveState() · CLAN.repaint()
CLAN.log(e)                            // يضيف للسجل بسقف 200 مع الاحتفاظ بالأقدم إن كان حرجًا
CLAN.repaint()                         // يعيد رسم شاشة النادي المفتوحة إن تغيّر rev (يقرأ NAV)
CLAN.tick()                            // كسولة بالزمن المنقضي: تصفير الأسبوع/اليوم، انتهاء الطلبات، وراثة القيادة
CLAN.cool(k,ms) / CLAN.coolLeft(k)     // المهل
CLAN.rows(sort)                        // مصفوفة أعضاء للعرض: 'rank'|'pts'|'cups'|'new'|'idle'|'don'
CLAN.r(uid) CLAN.me() CLAN.rankName(r) CLAN.isMem(uid)
CLAN.pts(src,n)                        // نقاط النادي من مصادر اللعب — تُستدعى من مسارات اللعب
```
**قاعدة صلبة:** لا شاشة تكتب في `S.clan` مباشرة. كل تغيير عبر `CLAN.act`. الواجهة تستدعي `CLAN.can` للعرض فقط
وتعتمد على رسالة الخطأ من `act` عند الفشل — لأن الحالة قد تتغيّر بين الرسم والضغط.

## مصفوفة الصلاحيات (أدنى رتبة + قاعدة الهدف + المهلة)
| الإجراء | أدنى رتبة | الهدف | المهلة |
|---|---|---|---|
| `chat` | عضو | نفسه | ٣ ثوانٍ |
| `dr.open` | عضو | نفسه | ٨ ساعات · ٣ يوميًا · ملحمية أسبوعيًا · أسطورية ممنوعة · طلب مفتوح واحد |
| `dr.fill` | عضو | طلب غيره | تبرّع واحد لكل طلب · لا تبرّع لطلبك |
| `claimGoal` | عضو | نفسه | مرة كل أسبوع |
| `leave` | عضو | نفسه | القائد ممنوع إن بقي غيره |
| `invite` `accept` `reject` `clearJr` `deleteMsg` `mute` `unmute` `setNote` `pin` `unpin` | مشرف | أدنى منه فقط | الطرد للمشرف ٢٠ دقيقة |
| `kick` | مشرف | **أدنى منه حرفيًا** | مشرف ٢٠ د · نائب ٥ د · قائد بلا |
| `promote` `demote` | نائب | أدنى منه، درجة واحدة، ولا يبلغ رتبته | ٢٠ د للفاعل · ١٠ د على الهدف |
| `announce` `editIdentity` `editJoin` `startEvent` `ban` `unban` | نائب | — | إعلان ١٢ ساعة للنادي · الهوية ساعة · الاسم ٧ أيام |
| `transferLead` `editPerms` `renameRanks` `disband` | قائد | وريث r≤1 ومضى ٣ أيام ونشِط خلال ٧ | نقل ٢٤ ساعة |
`c.perms` تجاوزات القائد `{action:minRank}` مقيّدة بـ`PERM_MIN`/`PERM_MAX` — لا يُنزل `kick` تحت مشرف ولا يرفع `chat` فوق عضو.

## اقتصاد الدعم (نسخ البطاقة `S.cards.owned[cid].copies`)
```js
CLAN_ECON={
 REQ_NEED:{common:40,rare:20,epic:6}, FILL_STEP:{common:8,rare:4,epic:1},
 REQ_COOL:8*36e5, REQ_DAY_MAX:3, REQ_TTL:8*36e5, REQ_OPEN_CLAN:12,
 RCV_DAY:{common:80,rare:40,epic:8}, DON_SP_DAY:120,
 PAY:{common:{g:5,xp:2,sp:1}, rare:{g:10,xp:4,sp:2}, epic:{g:60,xp:25,sp:12}},
 JOIN_COOL:24*36e5
}
```
الأسطورية لا تُطلب. اللمسة الأخيرة (من يُكمل الطلب) تأخذ ضعف الأجر. لا تراجع عن التبرّع، وتأكيد قبل كل تبرّع.
الطالب لا يستلم النسخ إلا عند اكتمال الطلب (`got>=need`) دفعةً واحدة.

## نقاط النادي ومستواه
`CLAN.pts(src,n)`: فوز رانك +١٢ · خسارة +٣ (سقف ٢٠ مباراة/يوم) · إجابة صحيحة +١ (سقف ٦٠/يوم) ·
مهمة يومية +٢٥ · تبرّع = نقاط الدعم نفسها (سقف ٦٠٠/أسبوع) · ترقية بطاقة +٥ (سقف ٥٠/يوم).
كل نقطة موجبة تضيف `xpC` ١:١. `lvC` من `clanXpNeed(l)=Math.round(220*Math.pow(l,2.3)/50)*50` بحد ٢٠.
السعة `cap` مشتقّة من `lvC` وحده: ١→٣٠، ٥→٣٥، ١٠→٤٠، ١٥→٤٥، ٢٠→٥٠. **لا زر لرفع السعة.**
هدف الأسبوع `c.goal = 800 + lvC*80`. صندوق واحد للأسبوع: `grantRewards([{t:'gems',v:40},{t:'coins',v:Math.min(400,m.pts*10)}])`
بشرط `m.pts>=150`.

## الشاشات — عائلة واحدة `cl*Scr` وكلها في `SCR`
`clubHome` (الرئيسية، تبويبات داخلية) · `clMembersScr` · `clMemberScr(uid)` · `clInfoScr` · `clChatScr` ·
`clDonorsScr` · `clSupportScr` · `clRequestSupportScr` · `clRequestsScr` · `clAdminLogScr` · `clAchScr` ·
`clSettingsScr` · `clEditIdentityScr` · `clEditJoinScr` · `clEditPermsScr` · `clRanksScr` · `clMyNotifScr` ·
`clBannedScr` · `clTransferScr` · `clSearchScr` · `clPublicScr(id)` · `clCreateScr` · `clEventsScr` · `clMoreScr`
`NAV_NOBAR={clEditIdentityScr:1,clEditJoinScr:1,clEditPermsScr:1,clTransferScr:1,clCreateScr:1,clSupportScr:1,clRequestSupportScr:1,clRanksScr:1}`

## عقد زر الرجوع — إلزامي وقابل للفحص
1. كل شاشة فرعية تبدأ بـ`tbar(العنوان)` — فيه زر `.bk` يستدعي `back()`، ومنطقة ضغطه ≥44×44.
2. `back()` يعيد للشاشة السابقة **وموضع تمريرها**، لا للرئيسية.
3. زر Back في أندرويد يعمل: `history.pushState` عند كل `push` و`popstate` يستدعي `back()`.
4. تغييرات غير محفوظة ⇒ `confirmSheet('تغييرات لم تُحفظ','...','حفظ',...)` بثلاثة خيارات قبل الرجوع.
5. **لا شاشة بلا صلاحية تُدفَع أصلًا** — البند المقفل يعرض `ico('lock')` و`toast('يتطلب '+CLAN.rankName(r))` ولا يفتح شيئًا.
6. كل اسم/أفتار/صف عضو قابل للضغط ويفتح `clMemberScr(uid)` — بلا استثناء.

## الحالات الثلاث لكل شاشة
`loading` هيكل عظمي · `empty` نص عربي واضح + إجراء · `error` نص + زر «إعادة المحاولة». **لا شاشة سوداء ولا قائمة فارغة.**

## النظام البصري
خلفية `#070B16` · بطاقة `#11192B` · مرتفعة `#18223A` · حدود رمادية زرقاء · البنفسجي `#8B5CF0` للهوية والأزرار.
**الذهبي في خمسة مواضع لا سادس**: شارة القائد · حلقة أفضل داعم · شريحة رتبة النادي · شريط الأسبوع المكتمل وزر صندوقه · وسام الإنجاز.
لا توهّج مبالغ، لا إطار ذهبي على كل بطاقة، لا صبغ صف العضو كاملًا.
RTL: استعمل `inset-inline-start/end` لا `left/right`، والأرقام `toLocaleString('en-US')`.
شارة «آلي» إلزامية بجانب كل عضو محاكى، وشارة «محلي» أو «غرفة حيّة» في رأس النادي.

## أسلوب الكود
- عربي في كل النصوص والتعليقات. تعليقات قليلة تشرح **لماذا** لا ماذا.
- بلا مكتبات. سلاسل قوالب لبناء HTML. `onclick="fnName(...)"` بمعرّفات آمنة فقط (لا نص لاعب داخل onclick).
- كل دالة عامة (تُستدعى من onclick) تُعرَّف على المستوى الأعلى.
- لا تستعمل `Date.now()` داخل حسابات ثابتة تُخزَّن في الحالة بلا داعٍ؛ خزّن الأختام لا النصوص.
