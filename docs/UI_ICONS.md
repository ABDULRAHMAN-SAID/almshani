# أيقونات الواجهة — من رسومك لا من أشكال جاهزة

اللعبة تعرض الأيقونات بثلاث طبقات، الأعلى تفضيلًا أولًا:

1. **لوحتك المرسومة** `art/ui-icons.png` عبر `tools/build-ui-icons.py` — إن وُجدت فهي المعتمدة لكل أيقونة فيها.
2. **رموز بطاقاتك** (لوحة رموز البطاقات التي رسمتها) بقناع ذهبي وظلّ — 23 أيقونة عامّة (درع، تاج، قفل، ميزان، صاعقة، بوصلة، عدسة، ساعة، لفافة، روابط، خزنة، عدّاد، بطاقات، تدوير، أعلام، كرة أرضية، عقل، مطرقة، هدف، صمت، صندوق، عاصفة، لوحة).
3. الرسم البرمجي الاحتياطي لما لم يُرسم بعد.

## كيف تُنتج اللوحة (مرّة واحدة)

اطلب من مولّد الصور الذي رسمت به البطاقات ولوح أونو لوحة **واحدة** بهذا الوصف، ثم احفظها باسم `art/ui-icons.png` وشغّل:

```bash
python3 tools/build-ui-icons.py && node tools/build.mjs --check
```

**الوصف (انسخه كما هو):**

> A single sprite sheet of 40 premium mobile-game UI icons, arranged in a strict grid of 8 columns × 5 rows, each icon centered in its cell with equal padding, on a fully transparent background (PNG). Style: glossy, softly lit 3D, rich enamel colors with gold trims, consistent light from top-left, subtle inner glow, no text, no borders between cells, no drop shadows outside the icon. Icons in this exact order, left to right, top to bottom:
> 1 green check mark, 2 golden padlock, 3 info circle, 4 lightning bolt, 5 purple gem, 6 red cross, 7 crossed swords, 8 medal with ribbon,
> 9 golden trophy, 10 royal crown, 11 back arrow, 12 hourglass timer, 13 gold coin, 14 golden star, 15 circular reset arrows, 16 group of people,
> 17 gift box, 18 shield, 19 magnifying glass, 20 flame, 21 fan of playing cards, 22 single user avatar, 23 save disk, 24 joker card,
> 25 upward arrow, 26 target crosshair, 27 muted speaker, 28 flag, 29 rolled scroll, 30 play triangle, 31 door, 32 bell,
> 33 ticket, 34 robot head, 35 plus sign, 36 heart, 37 bar chart, 38 network globe, 39 balance scale, 40 speaker.

الأداة تقصّ كل خانة إلى حدود الأيقونة وتعيد توسيطها، فلا يهمّ إن كانت الأيقونات غير متساوية الحجم تمامًا. إن كانت الخلفية لونًا واحدًا بدل الشفّافية تُفرَّغ تلقائيًا.

## القاعدة

لا إيموجي في الواجهة (`tools/check-emoji.cjs` يمنعها)، ولا أشكال جاهزة حيث توجد رسمة لك. كل أيقونة تحمل `data-i="اسمها"` في الصفحة ليمكن استهدافها بالتنسيق أو الاختبار.

## التعبيرات والشخصيات (5.33)

- **التعبيرات العادية والنادرة (16) شعارات مطلية** لا وجوه إيموجي: قناع الضحك، قناع الحزن بدمعة ياقوتية، عين الغمزة، كفّا التصفيق، مصباح التفكير، صاعقة الصدمة، إبهام التوفيق، مصافحة، نظارة الثقة، قبضة الغضب على شرارة، نبض التوتر، ياقوتة الإعجاب، هلال النعاس، كفّ التحية، عين المراقبة، ساعة الرمل. مصدرها `EMO_EMBLEM` في `tahaddi/index.html`، وحلقة الميدالية بحسب الندرة كما كانت. الممتازة والأسطورية (12) تبقى شخصيات المالك المرسومة من `art/emotes/sheet.png`.
- **الشخصية المرسومة** (`avatarSVG`): رأس بفكّ، ظلّ عنق، ثوب داكن بياقة ذهبية، عيون بقزحية ولمعة، شعر بلمعة، وخلفية متدرّجة ببلّورات خافتة. كل خصم آلي وكل عضو نادٍ يحمل وجهًا مرسومًا من اسمه (`personArt`)، لا ميدالية تعبير.
- **ميدالية النتيجة** (`resMedal`): حلقة ذهب (فولاذ للخسارة) وأشعة وقرص بلون الحال، بدل الحلقة الرفيعة. **بلاطات الإحصاء** (`.stc`): الأيقونة في قرص معدني 38 بكسل بجانب الرقم.
- **مافيا**: قرص الدور بلون الدور (`mafDisc`) وقائمة الأدوار رقاقات ملوّنة (`mafRoleList`).

