# يضمّن صور التعبيرات المرسومة من المالك داخل tahaddi/index.html
#
# الوضع الأساسي: لوحة واحدة art/emotes/sheet.png (أربعة صفوف: أسطورية 6،
# ممتازة 6، عادية 8، نادرة 8) — الإحداثيات أدناه معايرة على دقة 1536×1024.
# أي صورة مفردة باسم مفتاح التعبير (art/emotes/<key>.png) تتقدم على قصّة اللوحة.
#
#   python3 tools/build-emotes.py
#
# كل ميدالية تُقص دائرياً بحافة ناعمة وتُضمّن Data URI في خريطة EMO_IMG،
# والحلقة المرسومة في اللوحة تبقى هي إطار الميدالية داخل اللعبة.
import base64, io, os, sys
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DIR = os.path.join(ROOT, 'art', 'emotes')
GAME = os.path.join(ROOT, 'tahaddi', 'index.html')
OUT = 200          # دقة كل ميدالية المضمّنة
QUALITY = 80
GROW = 1.14        # توسيع نصف القطر المكتشف ليشمل الحلقة الذهبية كاملة

# (المفتاح، مركز س، مركز ص، نصف القطر) — من كشف حواف الحلقات على اللوحة
SHEET_MAP = [
    # الصف الأول — أسطورية
    ('cat', 123, 131, 91), ('falcon', 335, 141, 91), ('camel', 555, 136, 92),
    ('lion', 762, 134, 91), ('monkey', 974, 132, 91), ('wizard', 1188, 133, 91),
    # الصف الثاني — ممتازة (العملاق الصخري، الثعلب، النمر، البومة، العبقري، الدب الملك)
    ('champion', 110, 411, 91), ('pirate', 325, 405, 91), ('fire', 538, 405, 91),
    ('owl', 768, 398, 91), ('brain', 971, 401, 91), ('crown', 1189, 401, 91),
    # الصف الثالث — عادية
    ('laugh', 98, 646, 66), ('sad', 264, 640, 65), ('wink', 430, 640, 65),
    ('clap', 599, 637, 65), ('think', 773, 638, 65), ('shock', 940, 637, 65),
    ('thumbs', 1100, 639, 65), ('shake', 1282, 637, 69),
    # الصف الرابع — نادرة
    ('confident', 98, 869, 65), ('angry', 265, 871, 66), ('tense', 437, 869, 65),
    ('love', 604, 872, 67), ('sleep', 774, 870, 65), ('salute', 942, 869, 65),
    ('watch', 1106, 872, 67), ('hourglass', 1278, 869, 66),
]

def circle_webp(im: Image.Image) -> str:
    """قص دائري بحافة ناعمة (قناع مكبّر 4× ثم مصغّر) → webp بشفافية."""
    im = im.resize((OUT, OUT), Image.LANCZOS).convert('RGBA')
    mask = Image.new('L', (OUT * 4, OUT * 4), 0)
    ImageDraw.Draw(mask).ellipse((4, 4, OUT * 4 - 4, OUT * 4 - 4), fill=255)
    im.putalpha(mask.resize((OUT, OUT), Image.LANCZOS))
    buf = io.BytesIO()
    im.save(buf, 'WEBP', quality=QUALITY, method=6)
    return 'data:image/webp;base64,' + base64.b64encode(buf.getvalue()).decode()

def main() -> None:
    entries, total = {}, 0
    sheet_path = os.path.join(SRC_DIR, 'sheet.png')
    if os.path.exists(sheet_path):
        sheet = Image.open(sheet_path).convert('RGBA')
        for k, cx, cy, r in SHEET_MAP:
            R = round(r * GROW)
            entries[k] = circle_webp(sheet.crop((cx - R, cy - R, cx + R, cy + R)))
    # الصور المفردة تتقدم على اللوحة
    for k, *_ in SHEET_MAP:
        for ext in ('png', 'jpg', 'jpeg', 'webp'):
            p = os.path.join(SRC_DIR, f'{k}.{ext}')
            if os.path.exists(p):
                im = Image.open(p).convert('RGBA')
                w, h = im.size
                side = min(w, h)
                im = im.crop(((w - side) // 2, (h - side) // 2, (w + side) // 2, (h + side) // 2))
                entries[k] = circle_webp(im)
                break
    if not entries:
        sys.exit('لا لوحة ولا صور مفردة في art/emotes/')
    total = sum(len(v) for v in entries.values())
    src = open(GAME, encoding='utf-8').read()
    a = src.index('const EMO_IMG={')
    b = src.index('};', a) + 2
    body = ',\n'.join(f"{k}:'{v}'" for k, v in entries.items())
    src = src[:a] + 'const EMO_IMG={' + body + '};' + src[b:]
    open(GAME, 'w', encoding='utf-8').write(src)
    print(f'ضُمّنت {len(entries)} ميدالية ({total // 1024}KB) في اللعبة ✔')

if __name__ == '__main__':
    main()
