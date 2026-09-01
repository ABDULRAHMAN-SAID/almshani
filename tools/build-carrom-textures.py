# -*- coding: utf-8 -*-
"""يبني نسيج لوحَي الكيرم من صورتَي المالك المرجعيتين.
تُقاس مراكز الجيوب في كل صورة، ثم تُقصّ الصورة ويُعاد قياسها بحيث
يقع مربّع الجيوب تمامًا على ساحة اللعب في اللعبة — فيتطابق الرسم مع الفيزياء."""
from PIL import Image
import numpy as np, base64, io, json, os, sys

REF = 'tahaddi/refs'
OUT = 'tahaddi/refs/board-textures.json'
N   = 960          # حجم النسيج المُخرَج
MG  = {'c': 0.135, 'm': 0.195}   # هامش الإطار نسبةً إلى مسافة الجيوب

def erode(m, k):
    e = m.copy()
    for d in range(1, k + 1):
        e[:, d:] &= m[:, :-d]; e[:, :-d] &= m[:, d:]
        e[d:, :] &= m[:-d, :]; e[:-d, :] &= m[d:, :]
    return e

def quad_centers(mask, w, h, q):
    out = []
    for (x0, x1, y0, y1) in [(0,q,0,q),(w-q,w,0,q),(w-q,w,h-q,h),(0,q,h-q,h)]:
        sub = mask[y0:y1, x0:x1]; ys, xs = np.nonzero(sub)
        out.append((xs.mean() + x0, ys.mean() + y0))
    return out

def pocket_rect(path, kind):
    im = Image.open(path).convert('RGB')
    a = np.asarray(im).astype(int); h, w, _ = a.shape
    if kind == 'c':
        pts = quad_centers(erode(a.sum(2) < 80, 12), w, h, int(w * .26))
    else:
        r, g, b = a[:,:,0], a[:,:,1], a[:,:,2]
        red = erode((r > 110) & (r - g > 55) & (r - b > 55), 10)
        grn = erode((g > 80) & (g - r > 35) & (g - b > 25), 8)
        q = int(w * .22)
        one = lambda m, x0, x1, y0, y1: (
            lambda ys, xs: (xs.mean() + x0, ys.mean() + y0))(*np.nonzero(m[y0:y1, x0:x1])[:2][::-1][::-1])
        def pick(m, x0, x1, y0, y1):
            ys, xs = np.nonzero(m[y0:y1, x0:x1]); return (xs.mean() + x0, ys.mean() + y0)
        pts = [pick(red,0,q,0,q), pick(red,w-q,w,0,q), pick(grn,w-q,w,h-q,h), pick(grn,0,q,h-q,h)]
    L = (pts[0][0] + pts[3][0]) / 2; R = (pts[1][0] + pts[2][0]) / 2
    T = (pts[0][1] + pts[1][1]) / 2; B = (pts[2][1] + pts[3][1]) / 2
    return im, L, T, R, B

def build(path, kind):
    im, L, T, R, B = pocket_rect(path, kind)
    sx, sy = R - L, B - T
    mg = MG[kind]
    # المستطيل المصدر الذي سيملأ النسيج كاملًا
    x0, y0 = L - mg * sx, T - mg * sy
    x1, y1 = R + mg * sx, B + mg * sy
    src = im.crop((int(round(x0)), int(round(y0)), int(round(x1)), int(round(y1))))
    tex = src.resize((N, N), Image.LANCZOS)
    buf = io.BytesIO(); tex.save(buf, 'JPEG', quality=86, optimize=True, progressive=True)
    return buf.getvalue(), dict(mg=round(mg, 4), span=[round(sx, 1), round(sy, 1)])

out = {}
for kind, fn in (('c', 'carrom-classic.jpg'), ('m', 'carrom-4players.jpg')):
    data, meta = build(os.path.join(REF, fn), kind)
    out[kind] = dict(meta, src=fn, bytes=len(data),
                     uri='data:image/jpeg;base64,' + base64.b64encode(data).decode())
    print(kind, fn, '->', len(data), 'bytes', meta)
json.dump(out, open(OUT, 'w'), ensure_ascii=False)
print('wrote', OUT, os.path.getsize(OUT))
