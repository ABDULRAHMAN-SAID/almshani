# -*- coding: utf-8 -*-
"""يضمّن لوحة أيقونات الواجهة المرسومة من المالك في tahaddi/index.html.

المتوقع: art/ui-icons.png — شبكة 8 أعمدة × 5 صفوف (40 خانة) بخلفية شفّافة أو موحّدة اللون،
كل أيقونة في وسط خانتها. ترتيب الخانات (من اليسار إلى اليمين ثم الصفّ التالي) هو ORDER أدناه.
الأداة تقصّ الخانات، تفرغ الخلفية إن كانت لونًا واحدًا، تبني لوحة WebP، وتحقنها كـ --uiIcons
مع الخريطة UI_ICONS؛ ومن ثمّ يفضّل ico() هذه الأيقونات على كل ما سواها.

    python3 tools/build-ui-icons.py [art/ui-icons.png]
"""
import base64, io, os, re, sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GAME = os.path.join(ROOT, 'tahaddi', 'index.html')
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'art', 'ui-icons.png')
COLS, ROWS, CELL = 8, 5, 128
ORDER = ['check','lock','info','energy','gem','cross','swords','medal',
         'trophy','crown','back','timer','coin','star','reset','group',
         'gift','shield','search','flame','cards','user','save','wild',
         'up','target','mute','flag','scroll','play','door','bell',
         'ticket','robot','plus','heart','chart','web','scale','sound']

def clear_bg(im):
    """يفرغ خلفية موحّدة اللون (من الزوايا) إن لم تكن شفّافة أصلًا."""
    im = im.convert('RGBA')
    w, h = im.size
    corners = [im.getpixel((0, 0)), im.getpixel((w-1, 0)), im.getpixel((0, h-1)), im.getpixel((w-1, h-1))]
    if all(c[3] == 0 for c in corners):
        return im
    bg = corners[0][:3]
    px = im.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if abs(r-bg[0]) < 18 and abs(g-bg[1]) < 18 and abs(b-bg[2]) < 18:
                px[x, y] = (r, g, b, 0)
    return im

def main():
    if not os.path.exists(SRC):
        sys.exit(f'✗ لا يوجد {SRC} — ضع لوحة 8×5 باسم art/ui-icons.png (الترتيب في رأس هذه الأداة)')
    im = clear_bg(Image.open(SRC))
    w, h = im.size
    cw, ch = w / COLS, h / ROWS
    sheet = Image.new('RGBA', (COLS*CELL, ROWS*CELL), (0, 0, 0, 0))
    for i in range(COLS*ROWS):
        c, r = i % COLS, i // COLS
        cell = im.crop((int(c*cw), int(r*ch), int((c+1)*cw), int((r+1)*ch)))
        bbox = cell.getbbox()
        if bbox:
            cell = cell.crop(bbox)
        cell.thumbnail((int(CELL*0.9), int(CELL*0.9)), Image.LANCZOS)
        sheet.paste(cell, (c*CELL + (CELL-cell.width)//2, r*CELL + (CELL-cell.height)//2), cell)
    buf = io.BytesIO(); sheet.save(buf, 'WEBP', quality=86, method=6)
    uri = 'data:image/webp;base64,' + base64.b64encode(buf.getvalue()).decode()
    s = open(GAME, encoding='utf-8').read()
    s = re.sub(r'/\* ⟦ui-icons⟧ \*/\n(--uiIcons:url\([^)]*\);\n)?', '/* ⟦ui-icons⟧ */\n--uiIcons:url(' + uri + ');\n', s, count=1)
    m = {n: i for i, n in enumerate(ORDER)}
    s = re.sub(r'/\* ⟦ui-icons-map⟧ \*/\n(const UI_ICONS=\{[^\n]*\n)?', '/* ⟦ui-icons-map⟧ */\nconst UI_ICONS=' + str(m).replace("'", '"') + ';\n', s, count=1)
    open(GAME, 'w', encoding='utf-8').write(s)
    print(f'✓ لوحة أيقونات الواجهة: {len(ORDER)} أيقونة · {len(buf.getvalue())//1024} ك.ب — ico() صار يفضّلها')

if __name__ == '__main__':
    main()
