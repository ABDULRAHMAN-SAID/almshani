# -*- coding: utf-8 -*-
# يضمّن مشهدَي المسرح المرسومَين (إن وُجدا) في tahaddi/index.html بدل الرسم المتّجهي — ومشاهد أماكن اللعب الستة vn-*.png (800×1600) في VN_SCENE_IMG:
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

VN_W, VN_H = 800, 1600   # أماكن اللعب بطول الشاشة (نسبة 1:2)

def fit_to(im, W, H):
    im = im.convert('RGB'); w, h = im.size; r = W / H
    if w / h > r: nw = int(h * r); im = im.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
    else: nh = int(w / r); im = im.crop((0, (h - nh) // 2, w, (h - nh) // 2 + nh))
    return im.resize((W, H), Image.LANCZOS)

def pack(names, prefix, W, H, q):
    out = {}
    for k in names:
        p = os.path.join(SCENES, prefix + k + '.png')
        if not os.path.exists(p): p = os.path.join(SCENES, prefix + k + '.jpg')
        if not os.path.exists(p): print('· لا يوجد', prefix + k); continue
        im = fit_to(Image.open(p), W, H); buf = io.BytesIO(); im.save(buf, 'WEBP', quality=q, method=6)
        out[k] = 'data:image/webp;base64,' + base64.b64encode(buf.getvalue()).decode()
        print('✓ %s%s — %.0f ك.ب' % (prefix, k, len(buf.getvalue()) / 1024))
    return out

def write_const(src, name, out):
    js = 'const %s={' % name + ','.join("%s:'%s'" % (k, v) for k, v in out.items()) + '};'
    new, n = re.subn(r"const %s=\{[^\n]*\};" % name, lambda m: js, src, count=1)
    if n != 1: sys.exit('لم أجد %s في index.html' % name)
    print('✓ %s:' % name, ', '.join(out) or 'فارغ (الرسم المتّجهي)'); return new

def main():
    src = open(GAME, encoding='utf-8').read()
    src = write_const(src, 'VB_SCENE_IMG', pack(('mafia', 'barra'), '', W, H, 82))
    src = write_const(src, 'VN_SCENE_IMG', pack(('carrom', 'uno', 'atelier', 'mafia', 'barra', 'studio'), 'vn-', VN_W, VN_H, 80))
    open(GAME, 'w', encoding='utf-8').write(src)

if __name__ == '__main__':
    main()
