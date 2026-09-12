# نشر تحدّي — الويب والخادم والمتاجر (v5.93)

اللعبة ملفّ واحد `tahaddi/index.html` يعمل في ثلاثة أوضاع تلقائيًا (`src/network/net.js`):

| الوضع | متى | ما يعمل |
|---|---|---|
| **server** | يوجد خادم تحدّي: نفس الأصل، أو أصل مضبوط في `<meta name="tahaddi-server">` | حساب، حفظ سحابي، رتب يملكها الخادم، نتائج متحقَّق منها، غرف، لوحة صدارة |
| **artifact** | داخل claude.ai | غرف داخل المؤسسة فقط، لا خادم |
| **local** | ملفّ محلي أو لا خادم يجيب على `/health` | كل شيء على الجهاز، بصدق («نسخة محلية») |

الخادم يقدّم اللعبة نفسها من المنفذ ذاته، فأبسط نشر هو **خادم واحد يقدّم الاثنين**. لا تحتاج CORS ولا ضبط meta.

## ١. الخادم (Fly.io أو Render أو أي Docker)

```bash
# محليًا للتجربة
npm run build:tahaddi && npm run start:tahaddi      # http://localhost:8090 يقدّم اللعبة و /ws و /health

# Docker
npm run docker:build && npm run docker:run          # نفس الشيء داخل حاوية، البيانات في volume باسم tahaddi_data
```

**Fly.io** — طريقان، والنتيجة واحدة: `https://<app>.fly.dev` يقدّم اللعبة والخادم معًا.

*أ · من GitHub وحده (لا يلزم تثبيت شيء على جهازك):*

1. افتح حسابًا على fly.io وأضف بطاقة (الطبقة المجانية لا تكفي آلة دائمة).
2. من لوحة Fly: **Tokens → Create token → Organization** (رمز المنظّمة، لأنّ رمز النشر
   المرتبط بتطبيق لا يستطيع إنشاء تطبيق جديد).
3. في المستودع: Settings → Secrets and variables → Actions → **Secrets** → `FLY_API_TOKEN`
   = الرمز. لا يمرّ هذا الرمز في أي محادثة ولا يُكتب في الشيفرة.
4. إن كان اسم `tahaddi` محجوزًا عالميًّا (وهو محتمل) أضف **Variables** → `FLY_APP` باسم فريد.
5. ادفع أيّ تغيير — أو Actions → «نشر الخادم (Fly.io)» → Run workflow. العمل يفحص الصورة
   أوّلًا (`tools/test-deploy.cjs`)، ثم يُنشئ التطبيق والقرص إن لم يكونا، ثم ينشر، ثم يقرأ
   `/health`، ويطبع الرابط الحيّ في ملخّص التشغيل.

*ب · من جهازك:*

```bash
fly auth login
fly launch --no-deploy --copy-config          # يسأل عن الاسم والمنطقة
fly volumes create tahaddi_data --size 1      # قرص للحسابات والنتائج
fly deploy
fly open                                      # https://<app>.fly.dev
```

الكلفة المتوقّعة: آلة `shared-cpu-1x` بـ512 م.ب دائمة (`min_machines_running = 1` لأن الغرف
حيّة على WebSocket ولا تُوقَف الآلة) + قرص 1 ج.ب — نحو خمسة دولارات شهريًّا عند Fly اليوم.

**استعادة الحساب بالبريد** (5.91) تحتاج مزوّد بريد، وإلّا يجيب الخادم `mail_off` بصدق. من
جهازك أو من لوحة Fly، وبأسرار لا تمرّ في شيفرة ولا محادثة:

```bash
fly secrets set TAHADDI_MAIL_URL=https://api.resend.com/emails
fly secrets set TAHADDI_MAIL_KEY=<مفتاحك>
fly secrets set TAHADDI_MAIL_FROM='تحدّي <no-reply@نطاقك>'
```

**Render**: اربط المستودع، اختر Blueprint، وسيقرأ `render.yaml` (خدمة Docker + قرص 1GB على `/data`).

متغيّرات البيئة:

| المتغيّر | الافتراضي | المعنى |
|---|---|---|
| `PORT` / `HOST` | `8090` / `0.0.0.0` | المنفذ والواجهة |
| `TAHADDI_DIR` | `./tahaddi` | مجلّد اللعبة الذي يقدّمه HTTP |
| `TAHADDI_DATA_FILE` | `.data/tahaddi.json` | سجلّ الحالة الإلحاقيّ (ضعه على قرص دائم) |
| `NODE_ENV` | — | اضبطه `production` في الإنتاج: يُبطل محقّق المشتريات الاختباريّ ولو ضُبط سرّه بالخطأ |
| `TAHADDI_ORIGINS` | فارغ = الكل | أصول مسموح لها بفتح WebSocket، مثل `https://<user>.github.io,capacitor://localhost,https://localhost` |
| `TAHADDI_RESULT_WAIT_MS` | `90000` | مهلة انتظار تقارير كل المشاركين قبل اعتماد النتيجة |
| `IOS_BUNDLE_ID` | `com.almshani.tahaddi` | معرّف حزمة iOS — إيصال من تطبيق آخر يُرفض |
| `ANTHROPIC_API_KEY` | فارغ = معطّل | مفتاح واجهة Anthropic لآليي «ضد الكمبيوتر» بالذكاء الاصطناعي (5.43). يُضبط سرًّا فقط: `fly secrets set ANTHROPIC_API_KEY=...` — لا في الشيفرة ولا في المستودع |
| `TAHADDI_AI_MODEL` | `claude-opus-5` | النموذج الذي يحرّك الآليين |
| `TAHADDI_AI_RPM` | `40` | حدّ نداءات `/ai/chat` لكل عنوان IP في الدقيقة |
| `TAHADDI_MAIL_URL` / `_KEY` / `_FROM` | فارغ = معطّل | مزوّد البريد لاستعادة الحساب (5.91). بلا هذه الثلاثة يردّ الخادم `mail_off` ولا يرسل رمزًا |
| `TAHADDI_MAIL_DEV` | — | يطبع رمز التحقّق في سجلّ الخادم — للتطوير وحده، لا يُضبط في الإنتاج |
| `TAHADDI_AI_EFFORT` | `high` | عمق تفكير النموذج قبل كل جواب (`low`/`medium`/`high`/`xhigh`/`max`) — الأعلى أذكى وأبطأ وأغلى (5.44) |

الخادم يقدّم كذلك الصفحات القانونية التي يطلبها المتجران على `/privacy.html` و`/terms.html` و`/licenses.html` — تُولَّد وقت البناء من نصّ واحد داخل اللعبة (`⟦legal⟧` في `index.html`) فلا يفترق ما يقرؤه اللاعب عمّا يقرؤه المراجع. املأ `LEGAL.contact` و`LEGAL.entity` و`LEGAL.law` هناك مرّة واحدة قبل الرفع.

`/health` يجيب `{ok:true, …إحصاءات}` مع `access-control-allow-origin:*` ليستطيع عميل على مضيف آخر أن يتأكّد قبل فتح WebSocket.

اللعبة ملفّ واحد ٩٫٦ م.ب، فالخادم يقرأه مرّة إلى الذاكرة ويعطي لكل ملفّ `ETag` ونسختين
مضغوطتين تُحسبان مرّة خارج زمن الطلب: زيارة أولى ≈ ٣٫٩ م.ب بـ brotli بدل ٩٫١٩، وزيارة
معادة `304` بلا بايت واحد. ولولا ذلك لكان كل طلب صفحة يقرأ عشرة ميجابايت من القرص ويحجب
حلقة الأحداث عن غرف WebSocket الحيّة.

**الآليون بالذكاء الاصطناعي (5.43)**: في مافيا وبرا السالفة ضد الكمبيوتر يقرأ الآليون النقاش ويفهمون ما يكتبه اللاعب عبر نموذج لغوي. العميل لا يحمل أي مفتاح: يسأل `/ai/status` (`{on,model}`) ثم يرسل `POST /ai/chat {prompt}` ويستلم `{json,text}`. بلا `ANTHROPIC_API_KEY` يجيب الخادم 503 فيعمل العقل المحلي في العميل كما هو. حدّ الطلبات لكل عنوان `TAHADDI_AI_RPM`، وحجم الطلب ≤ 96 ك.ب. في نسخة الأرتيفاكت على claude.ai لا يُستخدم الخادم أصلًا: القدرة `sample` تعمل على حساب المشاهد وبموافقته عند أول ردّ.

```bash
fly secrets set ANTHROPIC_API_KEY=sk-ant-...        # يُعاد نشر التطبيق تلقائيًّا
curl -s https://<app>.fly.dev/ai/status             # {"on":true,"model":"claude-opus-5"}
```

## ٢. نسخة الويب على مضيف ثابت (GitHub Pages)

إن أردت اللعبة على GitHub Pages والخادم على Fly:

1. Settings → Secrets and variables → Actions → Variables → `TAHADDI_SERVER` = `https://<app>.fly.dev`.
   (تفعيل الصفحات نفسه يتولّاه العمل بـ`enablement: true`، فلا حاجة لفتحها يدويًّا.)
2. كل دفعة تشغّل `.github/workflows/pages.yml`: يبني `www/` بـ`tools/build-www.cjs` ويكتب الخادم في `<meta name="tahaddi-server">` وينشر.
3. على الخادم اضبط `TAHADDI_ORIGINS` ليشمل `https://<user>.github.io`. (لو قدّم الخادم اللعبة بنفسه فلا حاجة لهذا القسم أصلًا.)

محليًا: `TAHADDI_SERVER=https://<app>.fly.dev npm run web:build` ينتج `www/` الجاهز للرفع إلى أي مضيف ثابت.

ترتيب حلّ عنوان الخادم في العميل: `window.TAHADDI_SERVER` ← `<meta name="tahaddi-server">` ← `?server=https://…` في الرابط (ويُحفظ في localStorage) ← localStorage. بلا أيّ منها يجرّب الأصل الحالي، وإن لم يجب `/health` عمل محليًا.

## ٣. PWA — التثبيت والعمل دون اتصال

`tahaddi/manifest.webmanifest` و`tahaddi/sw.js` و`tahaddi/icons/` جاهزة. عامل الخدمة يُسجَّل فقط على مضيف `http(s)` حقيقي (لا في الأرتيفاكت ولا من ملفّ)، ويخزّن الهيكل كاملًا، ولا يخزّن `/health` و`/ws` أبدًا. الإصدار يأتي من `sw.js?v=APP_VER`: رفع `APP_VER` = عامل جديد ومخزن جديد ومحو القديم.

## ٤. Google Play

طريقان، وكلاهما يحتاج نسخة الويب منشورة على نطاق `https` أولًا:

**أ. TWA بـ Bubblewrap** (الأخفّ — تغليف الموقع نفسه):

```bash
npm i -g @bubblewrap/cli
# عدّل twa-manifest.json: host و iconUrl و webManifestUrl و fullScopeUrl إلى نطاقك
bubblewrap build          # يطلب JDK وAndroid SDK ويولّد app-release-signed.apk و .aab
```
ثم ارفع `assetlinks.json` إلى `https://<نطاقك>/.well-known/assetlinks.json` ببصمة مفتاح التوقيع (Bubblewrap يطبعها) كي يفتح التطبيق بلا شريط متصفح.

**ب. Capacitor** (نفس طريق App Store):

```bash
npm run cap:setup                      # يثبّت Capacitor ويضيف مجلّدَي android/ و ios/
TAHADDI_SERVER=https://<app>.fly.dev npm run cap:android   # يبني www/ ويزامن ويفتح Android Studio
```
في Android Studio: Build → Generate Signed Bundle (AAB) → ارفعه في Play Console. `appId` في `capacitor.config.json` هو `com.almshani.tahaddi`؛ غيّره قبل أول رفع إن أردت.

## ٥. App Store

App Store لا يقبل PWA وحدها؛ Capacitor هو الطريق:

```bash
npm run cap:setup
TAHADDI_SERVER=https://<app>.fly.dev npm run cap:ios       # يفتح Xcode
```
في Xcode: اختر فريق التوقيع، ثم Product → Archive → Distribute → App Store Connect. يلزم حساب Apple Developer (99$/سنة) وجهاز Mac.

ملاحظتان لهما أثر على المراجعة:
- حذف الحساب موجود داخل التطبيق (الإعدادات → البيانات) كما تشترط Apple وGoogle.
- الشراء بالمال يمرّ عبر المتجر ويتحقّق منه الخادم (`docs/PAYMENTS.md`). نسخة الويب تعرض الأسعار فقط وتقول ذلك؛ زرّ التجربة يظهر في وضع المطوّر وحده. قبل الرفع: أنشئ المنتجات بالمعرّفات نفسها في المتجرين واكتب الجسر الأصلي `window.TahaddiBilling` في مشروع Capacitor.

## ٦. ما لا يستطيع هذا المستودع فعله وحده

- لا خادم مستضاف بعد: النشر يحتاج حسابك على Fly أو Render — لا يملك أحد غيرك أن يفتحه، ولا يمرّ رمزه في محادثة. حتى ذلك الحين الرابط المنشور يعمل محليًا (وصادقًا بذلك).
- لا Docker هنا: لا عفريت في هذه البيئة، فالصورة تُفحص ببناء تخطيط مرحلتها الأخيرة وإقلاعه بدلالات node:20 (`tools/test-deploy.cjs`) — وهو ما كشف أنّ الحاوية لم تكن تُقلع أصلًا.
- لا بناء أصلي هنا: Android Studio وXcode على جهازك.
- لا نطاق: TWA يحتاج نطاقًا بـ `https` تملكه (GitHub Pages يعطيك `<user>.github.io`).

## ٧. قائمة التحقّق قبل الإطلاق

1. `npm run test:tahaddi` و`node tools/test-tahaddi-online.cjs` و`node tools/test-deploy.cjs` خضراء.
2. `fly deploy` ثم افتح `https://<app>.fly.dev/health` وتأكّد من `ok:true`.
3. افتح اللعبة من الرابط: «المزيد» يجب أن يعرض حالة الاتصال بالخادم لا «نسخة محلية».
4. جهازان بحسابين: مباراة مصنّفة، ثم لوحة الصدارة تعرض الاثنين.
5. ثبّت PWA على هاتف (Chrome: «إضافة إلى الشاشة الرئيسية»)، افصل الإنترنت، افتحها: تعمل محليًا.
