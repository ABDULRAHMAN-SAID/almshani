# -*- coding: utf-8 -*-
# يقصّ دروع الرتب العشرة من لوحة المالك art/rank-emblems-owner.png (صفّان × خمسة، بخلفية ضبابية داكنة)
# ويخبزها شريطًا واحدًا 3200×320 (عشر خلايا مربّعة) في art/rank-emblems.webp و.png ثم يضمّنه في
# المتغيّر --ranks داخل tahaddi/index.html — الصيغة نفسها التي يقرأها tierEmblem و.rkEmb.
#
#   python3 tools/build-rank-owner.py
#
# الفصل عن الخلفية: الخلفية بقعة ضوء مموّهة (تباين محلي منخفض) والدرع مرسوم بتفاصيل حادّة (تباين عالٍ)،
# فنحسب الانحراف المعياري المحلي، نسدّ الفجوات، نعبّئ الخارج من الحواف، ونحذف البقع والأجزاء الدخيلة
# من الدروع المجاورة. لوحة المالك تتقدّم على المولّد المتّجهي (tools/build-rank-emblems.cjs).
import base64, io, os, re, sys
import numpy as np
from PIL import Image, ImageFilter, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'art', 'rank-emblems-owner.png')
GAME = os.path.join(ROOT, 'tahaddi', 'index.html')
OUT_WEBP = os.path.join(ROOT, 'art', 'rank-emblems.webp')
OUT_PNG = os.path.join(ROOT, 'art', 'rank-emblems.png')
CELL = 320
COLS, ROWS = 5, 2

def box(a, r):
    p = np.pad(a, r, mode='edge'); c = np.cumsum(np.cumsum(p, axis=0), axis=1); c = np.pad(c, ((1, 0), (1, 0)))
    k = 2 * r + 1; H, W = a.shape
    return (c[k:k + H, k:k + W] - c[0:H, k:k + W] - c[k:k + H, 0:W] + c[0:H, 0:W]) / (k * k)

def sdmap(im, pre=1.2, r=3):
    """الانحراف المعياري المحلي لكل قناة (أقصاها) بعد تنعيم خفيف يقتل الحبيبات."""
    im = im.convert('RGB').filter(ImageFilter.GaussianBlur(pre)); a = np.asarray(im).astype(np.float32)
    out = np.zeros(a.shape[:2], np.float32)
    for ch in range(3):
        x = a[:, :, ch]; v = box(x * x, r) - box(x, r) ** 2; out = np.maximum(out, np.sqrt(np.clip(v, 0, None)))
    return out

def flood_outside(mask):
    """تعبئة من حواف الخلية عبر الخلفية → قناع الخارج المتّصل بالحواف."""
    h, w = mask.shape; L = Image.fromarray(np.where(mask, 255, 0).astype(np.uint8), 'L').copy()   # copy: صورة fromarray للقراءة فقط فلا تقبل التعبئة
    seeds = [(x, 0) for x in range(0, w, 5)] + [(x, h - 1) for x in range(0, w, 5)] + [(0, y) for y in range(0, h, 5)] + [(w - 1, y) for y in range(0, h, 5)]
    for x, y in seeds:
        if L.getpixel((x, y)) == 0: ImageDraw.floodfill(L, (x, y), 128)
    return np.array(L) == 128

def components(mask):
    img = Image.fromarray(np.where(mask, 1, 0).astype(np.int32), 'I').copy(); n = 0
    ys, xs = np.nonzero(mask); arr = np.asarray(img)
    for y, x in zip(ys[::3], xs[::3]):
        if arr[y, x] == 1:
            n += 1; ImageDraw.floodfill(img, (int(x), int(y)), n + 1); arr = np.asarray(img)
    return arr, n

def cut(cell, pre=1.2, t=5, close=4, open_=2, min_area=350):
    sd = sdmap(cell, pre); obj = sd > t; h, w = obj.shape
    C = np.array(Image.fromarray(np.where(obj, 255, 0).astype(np.uint8), 'L').filter(ImageFilter.MaxFilter(close * 2 + 1)).filter(ImageFilter.MinFilter(close * 2 + 1))) > 127
    inside = ~flood_outside(C)
    inside = np.array(Image.fromarray(np.where(inside, 255, 0).astype(np.uint8), 'L').filter(ImageFilter.MinFilter(open_ * 2 + 1)).filter(ImageFilter.MaxFilter(open_ * 2 + 1))) > 127
    lab, n = components(inside); keep = np.zeros_like(inside)
    for i in range(2, n + 2):
        b = lab == i
        if b.sum() < min_area: continue
        ys, xs = np.nonzero(b)
        if ((xs.min() <= 1) or (xs.max() >= w - 2)) and not ((xs > w / 3) & (xs < 2 * w / 3)).any(): continue   # جزء من الدرع المجاور
        keep |= b
    A = Image.fromarray(np.where(keep, 255, 0).astype(np.uint8), 'L').filter(ImageFilter.GaussianBlur(.9))
    out = cell.convert('RGBA'); out.putalpha(A); return out

def grid_by_content(im, cols, rows):
    """حدود الخلايا عند أدنى كثافة تفاصيل قرب مواضع القسمة المتساوية — الدروع ليست على شبكة دقيقة."""
    rgb = np.asarray(im.convert('RGB')).astype(np.float32)
    bl = np.asarray(im.convert('RGB').filter(ImageFilter.GaussianBlur(36))).astype(np.float32)
    mask = np.abs(rgb - bl).max(axis=2) > 14
    def cuts(density, n, win=.18):
        Ln = len(density); out = [0]
        for k in range(1, n):
            c = int(Ln * k / n); w = int(Ln * win / n); seg = density[max(0, c - w):min(Ln, c + w)]
            out.append(max(0, c - w) + int(np.argmin(seg)))
        return out + [Ln]
    k9 = np.ones(9) / 9
    xs = cuts(np.convolve(mask.sum(axis=0).astype(np.float32), k9, 'same'), cols)
    ys = cuts(np.convolve(mask.sum(axis=1).astype(np.float32), k9, 'same'), rows)
    return [[im.crop((xs[c], ys[r], xs[c + 1], ys[r + 1])) for c in range(cols)] for r in range(rows)]

def trim(im, pad=6):
    bb = im.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox()
    if not bb: return im
    x0, y0, x1, y1 = bb; return im.crop((max(0, x0 - pad), max(0, y0 - pad), min(im.size[0], x1 + pad), min(im.size[1], y1 + pad)))

def fit_cell(im, size=CELL, pad=8):
    im = im.copy(); im.thumbnail((size - pad * 2, size - pad * 2), Image.LANCZOS)
    c = Image.new('RGBA', (size, size), (0, 0, 0, 0)); c.alpha_composite(im, ((size - im.size[0]) // 2, (size - im.size[1]) // 2)); return c

def main():
    sheet = Image.open(SRC); grid = grid_by_content(sheet, COLS, ROWS)
    cells = [fit_cell(trim(cut(grid[r][c]))) for r in range(ROWS) for c in range(COLS)]
    strip = Image.new('RGBA', (CELL * len(cells), CELL), (0, 0, 0, 0))
    for i, c in enumerate(cells): strip.alpha_composite(c, (i * CELL, 0))
    strip.save(OUT_PNG); strip.save(OUT_WEBP, 'WEBP', quality=84, method=6)
    buf = io.BytesIO(); strip.save(buf, 'WEBP', quality=84, method=6)
    uri = 'data:image/webp;base64,' + base64.b64encode(buf.getvalue()).decode()
    src = open(GAME, encoding='utf-8').read()
    new, n = re.subn(r'--ranks:url\(data:image/webp;base64,[A-Za-z0-9+/=]+\)', lambda m: '--ranks:url(' + uri + ')', src, count=1)
    if n != 1: sys.exit('لم أجد المتغيّر --ranks في index.html')
    open(GAME, 'w', encoding='utf-8').write(new)
    print('✓ عشرة دروع من لوحة المالك → %s (%.0f ك.ب) و --ranks في index.html' % (os.path.relpath(OUT_WEBP, ROOT), len(buf.getvalue()) / 1024))

if __name__ == '__main__':
    main()
