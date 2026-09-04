# -*- coding: utf-8 -*-
# يضمّن مشهدَي المسرح المرسومَين (إن وُجدا) في tahaddi/index.html بدل الرسم المتّجهي:
#   art/scenes/mafia.png   ساحة البلدة الليلية بطاولة مستديرة فارغة (بلا شخصيات ولا نصوص)
#   art/scenes/barra.png   المجلس بوسائد فارغة حول صينية الشاي (بلا شخصيات ولا نصوص)
# المقاس المفضّل 1600×984 (نسبة 400:246) — يُقصّ إلى النسبة ويُصغَّر إلى 1200 عرضًا ويُحفظ WebP ويُكتب في VB_SCENE_IMG.
#   python3 tools/build-scenes.py
import base64, io, os, re, sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GAME = os.path.join(ROOT, 'tahaddi', 'index.html')
SCENES = os.path.join(ROOT, 'art', 'scenes')
W, H = 1200, 738

def fit(im):
    im = im.convert('RGB'); w, h = im.size; r = W / H
    if w / h > r: nw = int(h * r); im = im.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
    else: nh = int(w / r); im = im.crop((0, (h - nh) // 2, w, (h - nh) // 2 + nh))
    return im.resize((W, H), Image.LANCZOS)

def main():
    out = {}
    for k in ('mafia', 'barra'):
        p = os.path.join(SCENES, k + '.png')
        if not os.path.exists(p): p = os.path.join(SCENES, k + '.jpg')
        if not os.path.exists(p): print('· لا يوجد', k); continue
        im = fit(Image.open(p)); buf = io.BytesIO(); im.save(buf, 'WEBP', quality=82, method=6)
        out[k] = 'data:image/webp;base64,' + base64.b64encode(buf.getvalue()).decode()
        print('✓ %s — %.0f ك.ب' % (k, len(buf.getvalue()) / 1024))
    src = open(GAME, encoding='utf-8').read()
    js = 'const VB_SCENE_IMG={' + ','.join("%s:'%s'" % (k, v) for k, v in out.items()) + '};'
    new, n = re.subn(r"const VB_SCENE_IMG=\{[^\n]*\};", lambda m: js, src, count=1)
    if n != 1: sys.exit('لم أجد VB_SCENE_IMG في index.html')
    open(GAME, 'w', encoding='utf-8').write(new); print('✓ VB_SCENE_IMG:', ', '.join(out) or 'فارغ (الرسم المتّجهي)')

if __name__ == '__main__':
    main()
