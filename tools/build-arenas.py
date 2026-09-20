# -*- coding: utf-8 -*-
"""يبني ساحات الكيرم من صور المالك.

اللوح المرسوم لا يكفي أن يكون جميلًا — يجب أن **ينطبق على الفيزياء**: الجيب
الذي تراه العين هو الجيب الذي تسقط فيه القطعة. فلا تُقصّ الصورة بالعين، بل
تُقاس: تُكشف مراكز الجيوب الأربعة، ويُقاس إطار اللوح، ثم تُقصّ وتُقاس بحيث
يقع مربّع الجيوب على ساحة اللعب تمامًا.

والمخرَج هامشٌ لكل ساحة (`mg`) تقرؤه اللعبة — لا رقم واحد لكل الصور، فإطار
كل لوحٍ يختلف عن أخيه.

    python3 tools/build-arenas.py
"""
from PIL import Image
import numpy as np, json, os
from scipy import ndimage

SRC = 'tahaddi/refs/arenas'
OUT = 'tahaddi/arenas'
N   = 960

ARENAS = [
    ('madain',  'src-5.webp', 'مدائن'),
    ('sahil',   'src-6.webp', 'الساحل'),
    ('mina',    'src-7.webp', 'الميناء'),
    ('marsa',   'src-8.webp', 'المرسى'),
    ('hisn',    'src-9.webp', 'الحصن'),
]

def measure(path):
    im = Image.open(path).convert('RGBA')
    a = np.asarray(im).astype(int)
    h, w, _ = a.shape
    al = a[:, :, 3]
    rgb = a[:, :, :3]

    # حدود اللوح: ما ليس شفافًا
    solid = al > 16
    ys, xs = np.nonzero(solid)
    bx0, bx1, by0, by1 = xs.min(), xs.max(), ys.min(), ys.max()

    # الجيوب: أغمق ما في الصورة.
    #
    # وكانت تُطلب في أرباع الصورة بعتبةٍ واسعة، فالتُقطت زخرفةُ الإطار الداكنة
    # في ركنٍ أو ركنين وخرجت مسافةٌ غير مربّعة على لوحٍ مربّع. والجيوب أغمق من
    # كل زخرفة: عند عتبة ٤٠ تصير أكبر أربع كتلٍ في الصورة كلّها هي الجيوب
    # الأربعة، فتُؤخذ عالميًّا ثم تُنسب إلى أركانها.
    dark = (rgb.max(axis=2) < 40) & (al > 200)
    lab, n = ndimage.label(dark)
    if n < 4:
        raise SystemExit(f'✗ {path}: وُجدت {n} كتل داكنة — أقلّ من أربعة جيوب')
    sizes = ndimage.sum(dark, lab, range(1, n + 1))
    top = (np.argsort(sizes)[::-1][:4] + 1)
    cen = [ndimage.center_of_mass(lab == t)[::-1] for t in top]   # (x, y)
    mx = sum(c[0] for c in cen) / 4; my = sum(c[1] for c in cen) / 4
    def corner(left, top_):
        m = [c for c in cen if (c[0] < mx) == left and (c[1] < my) == top_]
        if len(m) != 1:
            raise SystemExit(f'✗ {path}: الجيوب الأربعة لا تقع في أربعة أركان')
        return m[0]
    pts = [corner(True, True), corner(False, True), corner(False, False), corner(True, False)]
    sp = [abs(pts[1][0] - pts[0][0]), abs(pts[2][1] - pts[1][1])]
    if abs(sp[0] - sp[1]) / max(sp) > 0.06:
        raise SystemExit(f'✗ {path}: مسافة الجيوب {sp[0]:.0f}×{sp[1]:.0f} — واللوح مربّع')

    L = (pts[0][0] + pts[3][0]) / 2; R = (pts[1][0] + pts[2][0]) / 2
    T = (pts[0][1] + pts[1][1]) / 2; B = (pts[2][1] + pts[3][1]) / 2
    span = ((R - L) + (B - T)) / 2
    # الهامش: متوسّط ما بين حافة اللوح ومركز الجيب، نسبةً إلى مسافة الجيوب
    mg = ((L - bx0) + (bx1 - R) + (T - by0) + (by1 - B)) / 4 / span
    return im, (bx0, by0, bx1, by1), (L, T, R, B), mg

os.makedirs(OUT, exist_ok=True)
meta = {}
for aid, fn, name in ARENAS:
    im, (bx0, by0, bx1, by1), (L, T, R, B), mg = measure(os.path.join(SRC, fn))
    sx, sy = R - L, B - T
    x0, y0 = L - mg * sx, T - mg * sy
    x1, y1 = R + mg * sx, B + mg * sy
    crop = im.crop((round(x0), round(y0), round(x1), round(y1)))
    flat = Image.new('RGB', crop.size, (8, 11, 20))       # خلف الزوايا المستديرة: لون الشاشة لا أبيض
    flat.paste(crop, (0, 0), crop)
    tex = flat.resize((N, N), Image.LANCZOS)
    p = os.path.join(OUT, aid + '.jpg')
    tex.save(p, 'JPEG', quality=86, optimize=True, progressive=True)
    meta[aid] = dict(n=name, mg=round(mg, 4), bytes=os.path.getsize(p))
    print(f'{aid:8} {name:10} mg={mg:.4f}  span={sx:.0f}×{sy:.0f}  {os.path.getsize(p)//1024} ك.ب')

json.dump(meta, open(os.path.join(OUT, 'arenas.json'), 'w'), ensure_ascii=False, indent=1)
print('✓', OUT + '/arenas.json')
