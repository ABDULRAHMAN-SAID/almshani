# يضمّن لوحات فن البطاقات الأربع المرسومة من المالك داخل tahaddi/index.html
#
# المتوقع في art/cards/ (أو جذر المستودع — الأداة تبحث في الاثنين):
#   sheet-common.png    شبكة 4×4 — البطاقات الشائعة 1..16
#   sheet-rare.png      شبكة 4×3 — النادرة 17..28
#   sheet-epic.png      شبكة 4×2 — الملحمية 29..36
#   sheet-legendary.png شبكة 2×2 — الأسطورية 37..40
# (خرائط الخلايا أدناه من معاينة اللوحات — تُعاير الحدود بعد وصول الملفات)
#
#   python3 tools/build-cards.py
import base64, io, os, sys
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GAME = os.path.join(ROOT, 'tahaddi', 'index.html')
OUT = 180
QUALITY = 80
# قصّ داخل إطار كل خانة (نسبة من عرض الخلية تُقتطع من كل جانب)
INSET = 0.10

# كل لوحة: أعمدة، صفوف، ومصفوفة أرقام البطاقات صفاً صفاً من اليسار لليمين
SHEETS = [
    ('sheet-common.png', 4, 4, [[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16]]),
    ('sheet-rare.png', 4, 3, [[17, 18, 19, 20], [21, 22, 23, 24], [25, 26, 27, 28]]),
    ('sheet-epic.png', 4, 2, [[29, 30, 31, 32], [33, 34, 35, 36]]),
    ('sheet-legendary.png', 2, 2, [[37, 38], [39, 40]]),
]

def rounded_webp(im: Image.Image) -> str:
    im = im.resize((OUT, OUT), Image.LANCZOS).convert('RGBA')
    r = OUT // 7
    mask = Image.new('L', (OUT * 4, OUT * 4), 0)
    ImageDraw.Draw(mask).rounded_rectangle((2, 2, OUT * 4 - 2, OUT * 4 - 2), radius=r * 4, fill=255)
    im.putalpha(mask.resize((OUT, OUT), Image.LANCZOS))
    buf = io.BytesIO()
    im.save(buf, 'WEBP', quality=QUALITY, method=6)
    return 'data:image/webp;base64,' + base64.b64encode(buf.getvalue()).decode()

def find(fname: str):
    for d in (os.path.join(ROOT, 'art', 'cards'), ROOT):
        p = os.path.join(d, fname)
        if os.path.exists(p):
            return p
    return None

def main() -> None:
    entries, total = {}, 0
    for fname, cols, rows, cellmap in SHEETS:
        p = find(fname)
        if not p:
            print(f'  ⚠ لم أجد {fname} — تُتخطى')
            continue
        im = Image.open(p).convert('RGBA')
        W, H = im.size
        cw, ch = W / cols, H / rows
        pad = cw * INSET
        for r in range(rows):
            for c in range(cols):
                cid = cellmap[r][c]
                box = (round(c * cw + pad), round(r * ch + pad),
                       round((c + 1) * cw - pad), round((r + 1) * ch - pad))
                crop = im.crop(box)
                side = min(crop.size)
                w2, h2 = crop.size
                crop = crop.crop(((w2 - side) // 2, (h2 - side) // 2,
                                  (w2 + side) // 2, (h2 + side) // 2))
                uri = rounded_webp(crop)
                entries[cid] = uri
                total += len(uri)
    if not entries:
        sys.exit('لا لوحات — ارفع الملفات الأربعة أولاً')
    src = open(GAME, encoding='utf-8').read()
    a = src.index('const CARD_IMG={')
    b = src.index('};', a) + 2
    body = ',\n'.join(f"{k}:'{v}'" for k, v in sorted(entries.items()))
    src = src[:a] + 'const CARD_IMG={' + body + '};' + src[b:]
    open(GAME, 'w', encoding='utf-8').write(src)
    print(f'ضُمّنت {len(entries)} بطاقة ({total // 1024}KB) في اللعبة ✔')

if __name__ == '__main__':
    main()
