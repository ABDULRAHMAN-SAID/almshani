# نشر تحدّي — الويب والخادم والمتاجر (v5.19)

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

**Fly.io** (الملف `fly.toml` جاهز):

```bash
fly launch --no-deploy --copy-config          # يسأل عن الاسم والمنطقة
fly volumes create tahaddi_data --size 1      # قرص للحسابات والنتائج
fly deploy
fly open                                      # https://<app>.fly.dev — اللعبة والخادم معًا
```

**Render**: اربط المستودع، اختر Blueprint، وسيقرأ `render.yaml` (خدمة Docker + قرص 1GB على `/data`).

متغيّرات البيئة:

| المتغيّر | الافتراضي | المعنى |
|---|---|---|
| `PORT` / `HOST` | `8090` / `0.0.0.0` | المنفذ والواجهة |
| `TAHADDI_DIR` | `./tahaddi` | مجلّد اللعبة الذي يقدّمه HTTP |
| `TAHADDI_DATA_FILE` | `.data/tahaddi.json` | ملفّ الحالة (ضعه على قرص دائم) |
| `TAHADDI_ORIGINS` | فارغ = الكل | أصول مسموح لها بفتح WebSocket، مثل `https://<user>.github.io,capacitor://localhost,https://localhost` |
| `TAHADDI_RESULT_WAIT_MS` | `90000` | مهلة انتظار تقارير كل المشاركين قبل اعتماد النتيجة |
| `IOS_BUNDLE_ID` | `com.almshani.tahaddi` | معرّف حزمة iOS — إيصال من تطبيق آخر يُرفض |

`/health` يجيب `{ok:true, …إحصاءات}` مع `access-control-allow-origin:*` ليستطيع عميل على مضيف آخر أن يتأكّد قبل فتح WebSocket.

## ٢. نسخة الويب على مضيف ثابت (GitHub Pages)

إن أردت اللعبة على GitHub Pages والخادم على Fly:

1. Settings → Pages → Source: **GitHub Actions** (مرّة واحدة).
2. Settings → Secrets and variables → Actions → Variables → `TAHADDI_SERVER` = `https://<app>.fly.dev`.
3. كل دفعة تشغّل `.github/workflows/pages.yml`: يبني `www/` بـ`tools/build-www.cjs` ويكتب الخادم في `<meta name="tahaddi-server">` وينشر.
4. على الخادم اضبط `TAHADDI_ORIGINS` ليشمل `https://<user>.github.io`.

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

- لا خادم مستضاف بعد: `fly deploy` أو Render يحتاجان حسابك. حتى ذلك الحين الرابط المنشور يعمل محليًا (وصادقًا بذلك).
- لا بناء أصلي هنا: Android Studio وXcode على جهازك.
- لا نطاق: TWA يحتاج نطاقًا بـ `https` تملكه (GitHub Pages يعطيك `<user>.github.io`).

## ٧. قائمة التحقّق قبل الإطلاق

1. `npm run test:tahaddi` و`node tools/test-tahaddi-online.cjs` خضراء.
2. `fly deploy` ثم افتح `https://<app>.fly.dev/health` وتأكّد من `ok:true`.
3. افتح اللعبة من الرابط: «المزيد» يجب أن يعرض حالة الاتصال بالخادم لا «نسخة محلية».
4. جهازان بحسابين: مباراة مصنّفة، ثم لوحة الصدارة تعرض الاثنين.
5. ثبّت PWA على هاتف (Chrome: «إضافة إلى الشاشة الرئيسية»)، افصل الإنترنت، افتحها: تعمل محليًا.
