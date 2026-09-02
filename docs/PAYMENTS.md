# المدفوعات في تحدّي — كيف يسير المال ومن يحتاج ماذا (v5.20)

## القاعدة الأولى: لا بيانات بنكية في أي مكان من هذا المشروع

المال لا يمرّ باللعبة ولا بالخادم ولا بأي محادثة. المسار كلّه:

1. اللاعب يضغط «شراء عبر المتجر» → نافذة **Apple** أو **Google** نفسها تأخذ الدفع.
2. المتجر يعطي الهاتف **إيصالًا** (App Store receipt أو Google purchaseToken).
3. الهاتف يرسل الإيصال إلى **خادم تحدّي**.
4. الخادم يسأل المتجر «هل هذا الإيصال حقيقي ولهذا المنتج؟» ثم يمنح من الكتالوج ويسجّل الإيصال كي لا يُستخدم مرّتين.
5. Apple وGoogle يحوّلان أرباحك (بعد عمولتهما) إلى **حسابك البنكي الذي تكتبه أنت** في App Store Connect وPlay Console. لا أحد غيرهما يراه.

فلا تُرسل بيانات بنكية لأحد. ما تحتاجه هو حسابان لديهما.

## ما تفعله أنت (لا يستطيع أحد فعله عنك)

| الخطوة | أين | ملاحظة |
|---|---|---|
| حساب Apple Developer (99$/سنة) | developer.apple.com | ثم App Store Connect → Agreements → Paid Apps: اتفاقية + معلومات البنك والضرائب |
| حساب Google Play Console (25$ مرّة) | play.google.com/console | ثم Payments profile: البنك والضرائب |
| إنشاء المنتجات بالمعرّفات نفسها | App Store Connect → In-App Purchases · Play Console → Monetize → Products | القائمة أدناه |
| Apple: App-Specific Shared Secret | App Store Connect → App Information | يوضع في الخادم كـ `APPLE_SHARED_SECRET` |
| Google: حساب خدمة | Play Console → Setup → API access → Service account بصلاحية View financial data + Manage orders | ملفّ JSON يوضع في الخادم كـ `GOOGLE_SERVICE_ACCOUNT_JSON` |
| استضافة الخادم | Fly.io أو Render (`docs/DEPLOY.md`) | الأسرار تُضبط بـ `fly secrets set` لا في الكود |

## المنتجات (`src/economy/catalog.js` — القائمة الوحيدة للهاتف والخادم)

| المعرّف | النوع | السعر المرجعي | ما يمنحه الخادم |
|---|---|---|---|
| `gems_80` | استهلاكي | 0.99$ | 80 جوهرة |
| `gems_500` | استهلاكي | 4.99$ | 500 جوهرة |
| `gems_1200` | استهلاكي | 9.99$ | 1,200 جوهرة |
| `gems_2500` | استهلاكي | 19.99$ | 2,500 جوهرة |
| `gems_6500` | استهلاكي | 49.99$ | 6,500 جوهرة |
| `gems_14000` | استهلاكي | 99.99$ | 14,000 جوهرة |
| `bundle_start` | استهلاكي | 2.99$ | 300 جوهرة + 3,000 عملة + جوكر نادر |
| `season_pass` | غير استهلاكي | 9.99$ | تذكرة الموسم + 200 جوهرة |

أنشئ المنتجات في المتجرين بهذه المعرّفات حرفيًا. السعر الفعلي تحدّده في المتجر بعملات كل بلد؛ الدولارات هنا للعرض في نسخة الويب فقط.

## الخادم

| المتغيّر | المعنى |
|---|---|
| `APPLE_SHARED_SECRET` | يفعّل التحقّق من إيصالات App Store (`verifyReceipt`، الإنتاج ثم الساندبوكس) |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | مسار ملفّ حساب الخدمة أو محتواه — يفعّل `purchases.products.get` والإقرار (acknowledge) |
| `ANDROID_PACKAGE` | افتراضي `com.almshani.tahaddi` |
| `TAHADDI_IAP_TEST_SECRET` | محقّق اختبار للاختبارات الآلية فقط — **لا تضبطه في الإنتاج** |

بلا متغيّر منصّة ما، يُرفض شراؤها بـ `iap_unavailable` ولا يُمنح شيء. `/health` يعرض `iap:{ios,android,test}` لتعرف ما المفعّل.

الرسائل: `purchase {claim:{platform, productId, receipt, transactionId?}}` → `purchased {grant, txId, duplicate}` أو `error {code}`؛ `purchases` → قائمة مشتريات الحساب. الإيصال المستخدم في حساب آخر يُرفض بـ `already_used`، وفي الحساب نفسه يعود `duplicate:true` بلا منح ثانٍ (استعادة آمنة).

## الهاتف

- **نسخة الويب** (GitHub Pages، PWA): لا شراء بالمال. الورقة تقول ذلك بصراحة، والأسعار تُعرض فقط.
- **تطبيق المتجر** (Capacitor): يضع جسرًا على `window.TahaddiBilling` بعقد ثلاث دوال (`buy`, `finish`, `restore`) مشروح في `src/economy/billing.js`. أسهل تنفيذ له: إضافة `cordova-plugin-purchase` (يعمل مع Capacitor) وكتابة الجسر في `www/billing-bridge.js` — عشرون سطرًا تحوّل `store.order()` إلى `{receipt, transactionId}`.
- **وضع المطوّر** فقط يعرض زرّ «تجربة الشراء — بلا مال» ليُختبر الاقتصاد. لا يظهر للاعبين.

## ما لا يزال بيد المالك

- الحسابان والاتفاقيات والضرائب.
- كتابة الجسر الأصلي داخل مشروع Capacitor وتجربته على جهاز حقيقي بحساب Sandbox (Apple) وLicense tester (Google).
- ضبط الأسرار على الخادم المستضاف.
