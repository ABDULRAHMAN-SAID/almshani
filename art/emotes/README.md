صور التعبيرات المرسومة من المالك — ملف واحد (اللوحة كاملة) أو صور مفردة باسم مفتاح كل تعبير.

- الصفّان الأوّلان في `sheet.png` (الأسطورية والممتازة) هما الشخصيات المرسومة، وتُضمَّن كما هي.
- الصفّان الثالث والرابع كانا وجوه إيموجي، فاستُبدلت بهما شعارات مرسومة برمجيًا داخل اللعبة (`EMO_EMBLEM`) إلى أن تُرسم وجوه حقيقية.
- **لوجوه حقيقية للعادية والنادرة:** ولِّد لوحة **`faces.png`** بالوصف أدناه (شبكة 4×4 = 16 ميدالية بهذا الترتيب صفًّا صفًّا:
  ضحك · حزن · غمزة · تصفيق · تفكير · صدمة · بالتوفيق · لعب رائع · ثقة · غضب · توتر · إعجاب · نعسان · تحية · مراقبة · الوقت يمضي)،
  ضعها في `art/emotes/faces.png` وشغّل `python3 tools/build-emotes.py` — تُقصّ وتُضمَّن وتتقدّم على الشعارات تلقائيًا.
- صورة مفردة `art/emotes/<المفتاح>.png` تتقدّم على كل شيء.

## الوصف الجاهز (انسخه كما هو إلى مولّد الصور)

> A single sprite sheet of 16 premium mobile-game emote medallions in a strict 4x4 grid, equal cells, each medallion centered with equal padding, plain flat dark background (#0B1020) with no borders between cells. All 16 are the SAME character: a charismatic golden falcon knight mascot (stylized, expressive, painted 3D game art like Clash Royale / Brawl Stars emotes, NOT emoji, NOT flat vector). Each medallion is a round coin with a metallic ring: rows 1-2 silver ring, rows 3-4 sapphire-blue ring. Consistent light from top-left, rich enamel colors, soft rim light, no text.
> Expressions in this exact order, left to right, top to bottom:
> 1 laughing hard with eyes shut, 2 sad with a single tear, 3 playful wink, 4 clapping hands proudly, 5 thinking with a finger on beak and a raised brow, 6 shocked with wide eyes and open beak, 7 thumbs up cheering, 8 shaking hands warmly with a second identical falcon (good game), 9 confident smirk wearing gold aviator sunglasses, 10 furious with steam and flame-red eyes, 11 nervous sweating and biting a feather, 12 heart-eyes in love, 13 sleepy yawning with a nightcap, 14 sharp military salute, 15 watching suspiciously through binoculars, 16 tapping an hourglass impatiently.

## التكلفة على OpenArt

أرخص نموذج صور يكلّف 10 نقاط للصورة (Kling 3 Omni 1K)، وSeedream 4.5 بدقّة 2K يكلّف 15. الحساب فيه 8 نقاط الآن — أضف نقاطًا أو ولِّد اللوحة بمولّدك المعتاد ثم ضعها في المسار أعلاه.
