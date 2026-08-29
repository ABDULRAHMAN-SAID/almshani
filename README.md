# قائد الحشود ⚔️ — Warlord: Crowd Commander

لعبة موبايل تنافسية فورية قيد البناء من نوع **Real-Time Tactical Army Arena**: قائدان، ساحة بثلاثة قطاعات، فرق عسكرية تُنشر وتُرى وهي تفقد أفرادها، ومقرّ يسقط — في جولات من 3:30 إلى 5 دقائق. ليست لعبة أوراق، وليست نسخة من أي شيء.

> **ابدأ من هنا**: وثائق التصميم العشر في [`/docs`](docs/GAME_VISION.md) — وأولها [`GAME_VISION.md`](docs/GAME_VISION.md).

## هيكل المشروع

| المسار | الدور |
|---|---|
| [`/docs`](docs/) | وثائق التصميم الحاكمة العشر + دليل النموذج الأولي (`game-guide.html`) |
| [`/shared`](shared/) | قلب اللعبة: تعريفات Data-Driven (وحدات/قادة/ساحات/اقتصاد/ترجمات) + مكتبة المحاكاة الحتمية (المرحلة 1) |
| [`/client`](client/) | عميل اللعبة الإنتاجي (Unity + URP — انظر قرار المحرك في `docs/ONLINE_ARCHITECTURE.md` §2) |
| [`/server`](server/) | الخادم الحاكم: Nakama + PostgreSQL + خوادم جولات مخصصة |
| [`/tools`](tools/) | مدقق التعريفات، مشغّل المحاكاة، نموذج الاقتصاد، فحص ميزانيات الأصول |
| [`/assets`](assets/) | مصادر الأصول الخام قبل التصدير |
| [`/config`](config/) | بيئات النشر وCI/CD وRemote Config |
| [`/legacy-prototype`](legacy-prototype/) | **النموذج الأولي** الكامل (عدّاء حشود 3D بملف واحد) — محفوظ كمرجع وبذرة طور البعثات PvE |
| `tahaddi/` | لعبة «تحدي — عالم المعرفة» (مشروع آخر يشارك المستودع) |

## وثائق التصميم

1. [`GAME_VISION.md`](docs/GAME_VISION.md) — الهوية والأعمدة وفلتر الميزات
2. [`CORE_GAMEPLAY.md`](docs/CORE_GAMEPLAY.md) — قوانين الجولة: القطاعات، نقاط القيادة، النصر
3. [`UNIT_SYSTEM.md`](docs/UNIT_SYSTEM.md) — 24 وحدة، الكاونترات، القادة، الترقيات
4. [`ARENA_ROAD.md`](docs/ARENA_ROAD.md) — 12 ساحة، الكؤوس، الرتب، المواءمة
5. [`ECONOMY.md`](docs/ECONOMY.md) — 4 عملات، متجر نظيف، حدود البيع
6. [`LIVE_OPS.md`](docs/LIVE_OPS.md) — المواسم، Pass، الأحداث، العشائر، الإعادات
7. [`ONLINE_ARCHITECTURE.md`](docs/ONLINE_ARCHITECTURE.md) — التدقيق التقني، قرار المحرك، الخادم الحاكم
8. [`ART_DIRECTION.md`](docs/ART_DIRECTION.md) — واقعية داكنة: لوحات، خطوط، صوت
9. [`UI_UX.md`](docs/UI_UX.md) — معسكر الحرب، HUD المعركة، RTL/LTR
10. [`ROADMAP.md`](docs/ROADMAP.md) — الشريحة العمودية ثم ثلاث مراحل حتى العالمية

## تجربة النموذج الأولي

```
cd legacy-prototype && python3 -m http.server 8000
```

ثم افتح `http://localhost:8000` — أو افتح `legacy-prototype/index.html` مباشرة (يعمل دون إنترنت). دليله الدراسي الكامل: `docs/game-guide.html`.
