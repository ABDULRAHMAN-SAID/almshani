#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
اللوح «الفاخر» (٦٫٥٠) — من صورة التصميم التي أرسلها المالك: «أريد بالضبط».

  python3 tools/build-carrom-royal.py [صورة.png]
      → tahaddi/arenas/royal.webp  (نسيجٌ مستوٍ من فوق بخلفيّةٍ شفّافة، مربّع الجيوب في مكانه)
      → tahaddi/arenas/hand.webp   (اليد الحقيقيّة بكمّها، بخلفيّةٍ شفّافة)
  ثمّ (٦٫٥٧): python3 tools/clean-royal-lines.py — يستبدل سطح اللعب بخشبٍ بلا خطوط، والعلامات ترسمها اللعبة
      → يطبع زوايا المنظور (CA_ROYAL.q) ومقاس اليد وطرف إصبعها (CA_HANDR) لـ tahaddi/index.html

بلا وسيط: تُستخرج الصورة من تاريخ git (الإيداع 5ef3c78).

كيف:
 ١. تُكشف مراكز الجيوب الأربعة في الصورة (بقعٌ سوداء عميقة)، ويُحسب التحويل المنظوريّ
    (homography) الذي يعيد اللوح المائل مربّعًا يُرى من فوق — فيقع كلّ جيبٍ على ركن
    ساحة اللعب كما تفترضه الفيزياء. (قيس: حافّة الإطار الداخليّة تقع على خطّ الجيوب.)
 ٢. ما حجبته الصورة يُعاد من الصورة نفسها أو من تصميم اللوح:
    • القطع في الوسط ← الدائرة والنجمة من نسيج اللوح الكلاسيكيّ، مضبوطةً على دائرة الصورة
    • الضارب واليد ولوحة النسبة أسفل الساحة ← مرآة أعلى الساحة (اللوح متناظر)
    • اليد فوق الإطار السفليّ ← خشب الإطار نفسه منقولًا على طول عرقه
    • بطاقة الاسم فوق الإطار العلويّ ← كذلك
    الدمج بمعادلة بواسون (seamlessClone) فيتّصل الضوء واللون بلا حدود.
 ٣. في اللعبة يُرسم النسيج مستويًا من فوق (الميل عُطّل ٦٫٥١ بطلب المالك)، وفوقه إطارٌ وجيوبٌ مرسومةٌ
    برمجيًّا من فوق (٦٫٥٢) — فالمأخوذ من الصورة هو سطح اللعب وخطوطه.
"""
import cv2, numpy as np, subprocess, sys, os, base64, re, json

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..')
N = 1024          # حجم النسيج
MG = 0.14         # هامش الإطار نسبةً إلى مسافة الجيوب
SRC_COMMIT = '5ef3c78'

def load():
    if len(sys.argv) > 1:
        return cv2.imread(sys.argv[1])
    name = subprocess.check_output(['git', '-C', HERE, '-c', 'core.quotePath=false', 'show', '--name-only',
                                    '--format=', SRC_COMMIT]).decode().strip().splitlines()[0]
    raw = subprocess.check_output(['git', '-C', HERE, 'show', SRC_COMMIT + ':' + name])
    return cv2.imdecode(np.frombuffer(raw, np.uint8), cv2.IMREAD_COLOR)

im = load()
H0, W0 = im.shape[:2]
g = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY)

# ١ — مراكز الجيوب: دوائر هاف تقريبيّة ثم مركز البقعة السوداء حولها
est = {'tl': (116, 370), 'tr': (904, 368), 'bl': (72, 1038), 'br': (954, 1036)}
circ = cv2.HoughCircles(cv2.medianBlur(g, 5), cv2.HOUGH_GRADIENT, 1, 200, param1=100, param2=30, minRadius=30, maxRadius=70)
if circ is not None:
    for k, (x, y) in list(est.items()):
        c = min(circ[0], key=lambda c: (c[0] - x) ** 2 + (c[1] - y) ** 2)
        if (c[0] - x) ** 2 + (c[1] - y) ** 2 < 40 ** 2:
            est[k] = (float(c[0]), float(c[1]))
P = {}
for k, (x, y) in est.items():
    x, y, r = int(x), int(y), 60
    ys, xs = np.nonzero(g[y - r:y + r, x - r:x + r] < 30)
    P[k] = (float(xs.mean() + x - r), float(ys.mean() + y - r))

P0 = N / (1 + 2 * MG); o = MG * P0
src = np.float32([P['tl'], P['tr'], P['br'], P['bl']])
dst = np.float32([[o, o], [o + P0, o], [o + P0, o + P0], [o, o + P0]])
H = cv2.getPerspectiveTransform(src, dst)
rect = cv2.warpPerspective(im, H, (N, N), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
cx = cy = N / 2
u = P0 / 400.0                                   # بكسل لكلّ وحدة فيزياء

orig = rect.copy()

def paste(dst_img, src_img, mask, feather=5, match=None):
    """لصقٌ مباشر بحافّةٍ ناعمة — بلا بواسون: ذاك يمزج خطوط اللوح إن اختلفت قليلًا فيضبّبها.
    match=(قناع حلقة المقارنة): تُعدَّل إضاءة المصدر لتطابق ما حوله قبل اللصق"""
    srcf = src_img.astype(np.float32)
    if match is not None:
        a = cv2.cvtColor(src_img, cv2.COLOR_BGR2LAB).astype(np.float32)
        b = cv2.cvtColor(dst_img, cv2.COLOR_BGR2LAB).astype(np.float32)
        mk = match > 0
        for ch in range(3):
            ma, sa = a[..., ch][mk].mean(), a[..., ch][mk].std() + 1e-3
            mb, sb = b[..., ch][mk].mean(), b[..., ch][mk].std() + 1e-3
            a[..., ch] = (a[..., ch] - ma) * (sb / sa if ch == 0 else 1) + mb
        srcf = cv2.cvtColor(np.clip(a, 0, 255).astype(np.uint8), cv2.COLOR_LAB2BGR).astype(np.float32)
    al = cv2.GaussianBlur(mask.astype(np.float32) / 255, (0, 0), feather)[..., None]
    return np.clip(dst_img.astype(np.float32) * (1 - al) + srcf * al, 0, 255).astype(np.uint8)

def shifted(img, dx=0, dy=0):
    return cv2.warpAffine(img, np.float32([[1, 0, dx], [0, 1, dy]]), (N, N), borderMode=cv2.BORDER_REPLICATE)

def box(x0, y0, x1, y1):
    m = np.zeros((N, N), np.uint8); m[int(y0):int(y1), int(x0):int(x1)] = 255; return m

oP = o + P0                                       # خطّ الجيوب السفليّ/الأيمن
# ٢أ — بطاقة الاسم على الإطار العلويّ ← خشب الإطار من يسارها (الجيب الأيسر ينتهي عند o+55)
# البطاقة تمتدّ ≈ x ٣٠٠–٧٢٠ ولا تنزل تحت أعلى الإطار إلا قليلًا: خشبٌ مستقيم العرق يُرقَّع من يسارها ويمينها
rect = paste(rect, shifted(orig, dx=135), box(295, 0, 440, o - 12), feather=2)
rect = paste(rect, shifted(orig, dx=-280), box(440, 0, 580, o - 12), feather=2)
rect = paste(rect, shifted(orig, dx=415), box(580, 0, 725, o - 12), feather=2)

# ٢ب — أسفل الساحة: الضارب ولوحة النسبة ودائرة القوّة ← مرآة أعلاها، مضبوطةً رأسيًّا على خطوط القاعدة
flip = cv2.flip(orig, 0)
ref_rows = slice(int(oP - 110), int(oP - 20))
cols = np.r_[int(cx - 250):int(cx - 140), int(cx + 150):int(cx + 260)]
G = lambda im: cv2.cvtColor(im, cv2.COLOR_BGR2GRAY).astype(np.float32)
best = min(range(-12, 13), key=lambda d: np.abs(G(shifted(flip, dy=d))[ref_rows][:, cols] - G(orig)[ref_rows][:, cols]).mean())
flip = shifted(flip, dy=best)
rect = paste(rect, flip, box(cx - 120, oP - 205, cx + 120, oP - 6), feather=4, match=box(cx - 170, oP - 250, cx + 170, oP - 215))

# ٢ج — اليد فوق الإطار السفليّ ← خشب الإطار نفسه: النصف الأيسر من يساره والأيمن من يمينه
rect = paste(rect, shifted(orig, dx=200), box(cx - 80, oP - 6, cx + 55, N), feather=3)
rect = paste(rect, shifted(orig, dx=-150), box(cx + 55, oP - 6, cx + 185, N), feather=3)   # من يمينها قبل الجيب

# ٢د — الوسط: الدائرة والنجمة من نسيج اللوح الكلاسيكيّ، مقاسةً على دائرة الصورة
html = open(os.path.join(ROOT, 'tahaddi', 'index.html'), encoding='utf-8').read()
m = re.search(r"const CA_TEX=\{c:'data:image/jpeg;base64,([^']+)'", html)
cls = cv2.imdecode(np.frombuffer(base64.b64decode(m.group(1)), np.uint8), cv2.IMREAD_COLOR)
n = cls.shape[0]; mgc = 0.135; Pc = n / (1 + 2 * mgc); oc = mgc * Pc
A = cv2.getPerspectiveTransform(np.float32([[oc, oc], [oc + Pc, oc], [oc + Pc, oc + Pc], [oc, oc + Pc]]), dst)
ours = cv2.warpPerspective(cls, A, (N, N), flags=cv2.INTER_CUBIC)

def ring_polar(img, lo, hi, dark=60):
    """أبعد خطٍّ داكن بين lo وhi على ٢٤ اتّجاهًا — القطع داخلها لا تُحسب — ثم قطعٌ ناقصٌ يوافقها"""
    L = G(img); pts = []
    for deg in range(0, 360, 15):
        a = np.radians(deg); rr = None
        for r in range(hi, lo, -1):
            if L[int(round(cy + r * np.sin(a))), int(round(cx + r * np.cos(a)))] < dark: rr = r; break
        if rr: pts.append((cx + rr * np.cos(a), cy + rr * np.sin(a)))
    (ex, ey), (w, h), ang = cv2.fitEllipse(np.float32(pts))
    return ex, ey, w / 2, h / 2
mx, my, mrx, mry = ring_polar(orig, int(52 * u), int(72 * u))
ox_, oy_, orx, ory = ring_polar(ours, int(45 * u), int(75 * u))
# ٦٫٥٢: دائرةٌ حقًّا لا قطعٌ ناقص («ليش الدائرة في النصّ شكلها بيضاوي؟»): دائرة الصورة المولَّدة ناقصة
# (١١٥×١٣٢) ونسيج الكلاسيكيّ ناقصٌ قليلًا أيضًا (صورته الأصليّة غير مربّعة). يُصحَّح نسيجنا إلى دائرةٍ
# نصف قطرها وسط المحورين، في مركز الساحة تمامًا، والقناع يغطّي القطع الناقص القديم كلّه
Rr = (mrx + mry) / 2
T = np.float32([[Rr / orx, 0, cx - Rr / orx * ox_], [0, Rr / ory, cy - Rr / ory * oy_]])
ours_fit = cv2.warpAffine(ours, T, (N, N), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
mask = np.zeros((N, N), np.uint8)
cv2.ellipse(mask, (int(mx), int(my)), (int(max(mrx, Rr) + 11 * u), int(max(mry, Rr) + 11 * u)), 0, 0, 360, 255, -1)
ann = np.zeros((N, N), np.uint8)
cv2.ellipse(ann, (int(mx), int(my)), (int(mrx + 30 * u), int(mry + 30 * u)), 0, 0, 360, 255, -1)
cv2.ellipse(ann, (int(mx), int(my)), (int(mrx + 12 * u), int(mry + 12 * u)), 0, 0, 360, 0, -1)
rect = paste(rect, ours_fit, mask, feather=4, match=ann)

# ٢و (٦٫٥٢) — الجيوب الأسطوانيّة تُمحى من سطح اللعب: اللعبة ترسم فوقها ثقوبًا من فوق (caPocket)،
#     وما يطلّ من الأسطوانة المائلة خارج الثقب الجديد كان هلالًا داكنًا تحته. البقعة السوداء المتّصلة
#     بمركز الجيب (بعد فتحٍ يزيل الخطوط الرفيعة) تُرمَّم من الخشب حولها
Gr = cv2.cvtColor(rect, cv2.COLOR_BGR2GRAY)
hole = np.zeros((N, N), np.uint8)
for (px, py) in ((o, o), (oP, o), (o, oP), (oP, oP)):
    dark = ((Gr < 70).astype(np.uint8) * 255)
    win = np.zeros_like(dark); cv2.circle(win, (int(px), int(py)), int(40 * u), 255, -1)
    dark = cv2.bitwise_and(dark, win)
    dark = cv2.morphologyEx(dark, cv2.MORPH_OPEN, np.ones((9, 9), np.uint8))
    n_, lab, st, _ = cv2.connectedComponentsWithStats(dark)
    if n_ > 1:
        k = 1 + int(np.argmax(st[1:, 4])); hole |= np.where(lab == k, 255, 0).astype(np.uint8)
hole = cv2.dilate(hole, np.ones((13, 13), np.uint8))
rect = cv2.inpaint(rect, hole, 9, cv2.INPAINT_TELEA)

# ٢هـ — ما خارج الإطار (خلفيّة الصورة وشرائطها) شفّاف: اللوح يطفو على خلفيّة الشاشة
OUTER = (20, 33, 1004, 1000)                      # حوافّ الإطار الخارجيّة في النسيج (مقيسة)
alpha = np.zeros((N, N), np.uint8)
x0, y0, x1, y1 = OUTER; rr = 12
cv2.rectangle(alpha, (x0 + rr, y0), (x1 - rr, y1), 255, -1); cv2.rectangle(alpha, (x0, y0 + rr), (x1, y1 - rr), 255, -1)
for (ex, ey) in ((x0 + rr, y0 + rr), (x1 - rr, y0 + rr), (x0 + rr, y1 - rr), (x1 - rr, y1 - rr)):
    cv2.circle(alpha, (ex, ey), rr, 255, -1)
alpha = cv2.GaussianBlur(alpha, (0, 0), 0.8)
from PIL import Image
rgba = np.dstack([cv2.cvtColor(rect, cv2.COLOR_BGR2RGB), alpha])
out = os.path.join(ROOT, 'tahaddi', 'arenas', 'royal.webp')
Image.fromarray(rgba, 'RGBA').save(out, 'WEBP', quality=86, method=6)

# ٣ — زوايا النسيج الأربع في الصورة (مطبَّعةً بعرضها): منها يُبنى الميل على الشاشة
Hi = np.linalg.inv(H)
def back(x, y):
    v = Hi @ np.array([x, y, 1.0]); return [round(v[0] / v[2] / W0, 5), round(v[1] / v[2] / W0, 5)]
q = [back(0, 0), back(N, 0), back(N, N), back(0, N)]
print('✓', os.path.relpath(out, ROOT), '%.0f ك.ب' % (os.path.getsize(out) / 1024), '· mg', MG)
print('  الجيوب في الصورة:', {k: [round(v[0], 1), round(v[1], 1)] for k, v in P.items()})
print('  الدائرة: الصورة', [round(mx), round(my), round(mrx), round(mry)], '· النسيج', [round(ox_), round(oy_), round(orx), round(ory)], '→ دائرة نصف قطرها', round(Rr))
print('  CA_ROYAL.q =', json.dumps(q))

# ٤ — اليد الحقيقيّة بكمّ الدشداشة (arenas/hand.webp): قصٌّ بـ GrabCut من الصورة نفسها
#     يُثبَّت المؤكَّد (ظهر الكفّ، السبّابة، الكمّ) ويُستبعد المؤكَّد (خشب اللوح حول الإصبع، الضارب فوق طرفه)،
#     ويُرسم طرف الإصبع الأوسط قطعًا ناقصًا — كان يخرج مسطّحًا لأنّ لون ظفره قريبٌ من لون الخشب.
from PIL import Image
x0, y0, x1, y1 = 440, 955, 800, 1222                    # صندوق اليد في الصورة
roi = im[y0:y1, x0:x1].copy()
hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)
Hh, Ss, Vv = [hsv[..., i].astype(int) for i in range(3)]
gm = np.full(roi.shape[:2], cv2.GC_PR_BGD, np.uint8)
gm[(((Hh < 25) | (Hh > 170)) & (Ss > 40) & (Ss < 175) & (Vv > 80)) | ((Ss < 45) & (Vv > 165))] = cv2.GC_PR_FGD
gm[Vv < 45] = cv2.GC_BGD
band = np.zeros_like(gm, bool); band[:100, :] = True; band[:100, 50:118] = False
gm[band] = cv2.GC_BGD; gm[:18, :] = cv2.GC_BGD
cv2.ellipse(gm, (134, 97), (23, 27), 0, 0, 360, cv2.GC_FGD, -1)
cv2.circle(gm, (150, 170), 30, cv2.GC_FGD, -1); cv2.line(gm, (85, 30), (95, 120), cv2.GC_FGD, 10)
cv2.rectangle(gm, (150, 235), (300, 262), cv2.GC_FGD, -1)
cv2.grabCut(roi, gm, None, np.zeros((1, 65)), np.zeros((1, 65)), 8, cv2.GC_INIT_WITH_MASK)
hm = np.where((gm == 1) | (gm == 3), 255, 0).astype(np.uint8)
n_, lab, st, _ = cv2.connectedComponentsWithStats(hm); hm = np.where(lab == 1 + np.argmax(st[1:, 4]), 255, 0).astype(np.uint8)
hm = cv2.morphologyEx(hm, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8)); hm = cv2.morphologyEx(hm, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
a = cv2.GaussianBlur(hm.astype(np.float32), (0, 0), 1.1); a = np.clip((a - 40) * 255 / (255 - 80), 0, 255)
fade = np.ones(a.shape[0]); fade[-30:] = np.linspace(1, 0, 30) ** 1.3; a = (a * fade[:, None]).astype(np.uint8)   # الكمّ يغيب في أسفلها
ys, xs = np.nonzero(a > 8); bx0, bx1, by0, by1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
rgba = np.dstack([cv2.cvtColor(roi, cv2.COLOR_BGR2RGB), a])[by0:by1, bx0:bx1]
hout = os.path.join(ROOT, 'tahaddi', 'arenas', 'hand.webp')
Image.fromarray(rgba, 'RGBA').save(hout, 'WEBP', quality=88, method=6)
ty = int(np.argmax((a > 128).any(1))); tx = int(np.mean(np.nonzero(a[ty] > 128)[0]))
print('✓', os.path.relpath(hout, ROOT), '%.0f ك.ب' % (os.path.getsize(hout) / 1024),
      '· CA_HANDR = {w:%d,h:%d,tx:%d,ty:%d}' % (rgba.shape[1], rgba.shape[0], tx - bx0, ty - by0))
