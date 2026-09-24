# -*- coding: utf-8 -*-
# ٦٫٩٥ — تعابير جديدة كلّها (المالك: «امسح جميع التعابير القديمة وسوِّ جديدة قريبة من الرسم»): أربعٌ وعشرون
# لوحةً مرسومة بأسلوب البطاقات الملوّنة، من ورقتين 4×3 يولّدهما المالك في OpenArt ويضعهما في art/emotes:
#   sheet-v3-a.png   4×3 — الشخصيّة «أبو سالم»: ضحك، حزن، غمزة، تصفيق، تفكير، صدمة، بالتوفيق، تحيّة، غضب، واثق، نعسان، توتّر
#   sheet-v3-b.png   4×3 — قهوة، يا خيبة، دعاء، على نار، الصقر، الجمل، الشيخ، البطل، صه، انفجار، الضارب الذهبيّ، الميداليّة
#
#   python3 tools/build-emotes-v3.py            ← يقصّ ويضمّن
#   python3 tools/build-emotes-v3.py --svg      ← من الرسوم المتّجهة المرسومة بالكود: art/emotes/render/<key>.png (يولّدها tools/render-emotes-svg.cjs)
#   python3 tools/build-emotes-v3.py --fake     ← يولّد ورقتين اصطناعيّتين للاختبار ثمّ يضمّنهما (لا يمسّ الورقتين الحقيقيّتين)
#
# يكتب في index.html: EMO_IMG (بلاطات 200 بكسل على خلفيّة اللوحة الكحليّة)، EMO_BIG (الممتازة والأسطوريّة بحجم 300 للفقاعات)،
# EMO_SHAPE (كلّها tile: إطار الندرة ترسمه اللعبة)، وقائمة EMOTES الجديدة. المفاتيح القديمة تختفي؛ ترحيل ما يملكه اللاعب في
# اللعبة نفسها (emoMigrate).
import base64, io, os, re, sys
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ART = os.path.join(ROOT, 'art', 'emotes')
GAME = os.path.join(ROOT, 'tahaddi', 'index.html')
TILE, BIG, QUALITY = 200, 300, 82
NAVY = (11, 21, 48)

# (المفتاح، الورقة، الصفّ، العمود، الندرة، الاسم، العبارة) — الصفّ والعمود من ١
A, B = 'a', 'b'
ROSTER = [
 ('laugh',   A, 1, 1, 'common', 'ضحك',          'ضحكتني!'),
 ('sad',     A, 1, 2, 'common', 'حزن',          'آه…'),
 ('wink',    A, 1, 3, 'common', 'غمزة',         'سهلة'),
 ('clap',    A, 1, 4, 'common', 'تصفيق',        'أحسنت!'),
 ('think',   A, 2, 1, 'common', 'تفكير',        'خلّني أفكّر'),
 ('shock',   A, 2, 2, 'common', 'صدمة',         'مستحيل!'),
 ('thumbs',  A, 2, 3, 'common', 'بالتوفيق',     'بالتوفيق'),
 ('salute',  A, 2, 4, 'common', 'تحيّة',        'احترامي'),
 ('angry',   A, 3, 1, 'rare',   'غضب',          'يا حرّ قلبي!'),
 ('cool',    A, 3, 2, 'rare',   'واثق',         'على راحتي'),
 ('sleepy',  A, 3, 3, 'rare',   'نعسان',        'زهّقتني'),
 ('nervous', A, 3, 4, 'rare',   'توتّر',        'يا ويلي'),
 ('coffee',  B, 1, 1, 'rare',   'قهوة',         'تفضّل فنجالك'),
 ('facepalm',B, 1, 2, 'rare',   'يا خيبة',      'يا خيبتي'),
 ('pray',    B, 1, 3, 'rare',   'دعاء',         'يا ربّ'),
 ('fire',    B, 1, 4, 'rare',   'على نار',      'أنا على نار!'),
 ('falcon',  B, 2, 1, 'epic',   'الصقر',        'انقضاض!'),
 ('camel',   B, 2, 2, 'epic',   'الجمل',        'ولا يهمّك'),
 ('sheikh',  B, 2, 3, 'epic',   'الشيخ',        'التاج لي'),
 ('trophy',  B, 2, 4, 'epic',   'البطل',        'الكأس لي'),
 ('shh',     B, 3, 1, 'epic',   'صه',           'اهدأ يا بطل'),
 ('mind',    B, 3, 2, 'epic',   'انفجار',       'ما صدّقت عيوني'),
 ('striker', B, 3, 3, 'legendary', 'الضارب الذهبيّ', 'ضربة الأسطورة'),
 ('medal',   B, 3, 4, 'legendary', 'الميداليّة',     'بطل الأبطال'),
]
FREE = {'laugh', 'sad', 'wink', 'clap', 'think', 'shock', 'thumbs', 'salute'}
SOURCES = ['المتجر', 'الصناديق', 'الإنجازات', 'تذكرة الموسم', 'طريق الكؤوس', 'تحدّي الاثني عشر']

def to_uri(im, q=QUALITY):
    buf = io.BytesIO(); im.save(buf, 'WEBP', quality=q, method=6)
    return 'data:image/webp;base64,' + base64.b64encode(buf.getvalue()).decode(), len(buf.getvalue())

def cells(im, cols=4, rows=3, inset=.035):
    """شبكةٌ منتظمة (الورقة المولَّدة مربّعاتها متساوية) مع قصّ الحوافّ الذهبيّة الفاصلة"""
    w, h = im.size; cw, ch = w / cols, h / rows
    out = []
    for r in range(rows):
        row = []
        for c in range(cols):
            x0, y0 = c * cw, r * ch
            dx, dy = cw * inset, ch * inset
            row.append(im.crop((round(x0 + dx), round(y0 + dy), round(x0 + cw - dx), round(y0 + ch - dy))))
        out.append(row)
    return out

def tile(cell, size):
    """مربّعٌ بحجمٍ ثابت: الخليّة تُوسَّط على خلفيّة اللوحة الكحليّة (إن لم تكن مربّعةً تمامًا)"""
    cell = cell.convert('RGB'); w, h = cell.size; s = max(w, h)
    base = Image.new('RGB', (s, s), NAVY); base.paste(cell, ((s - w) // 2, (s - h) // 2))
    return base.resize((size, size), Image.LANCZOS)

def fake_sheets():
    """ورقتان اصطناعيّتان بألوانٍ مختلفة لاختبار المسار قبل وصول الرسم"""
    os.makedirs(os.path.join(ART, 'fake'), exist_ok=True)
    paths = {}
    for name, hue0 in ((A, 0), (B, 180)):
        W, H = 1792, 1344; im = Image.new('RGB', (W, H), NAVY); d = ImageDraw.Draw(im)
        for i in range(12):
            r, c = divmod(i, 4); x0, y0 = c * W / 4, r * H / 3
            col = tuple(int(v) for v in Image.new('HSV', (1, 1), ((hue0 + i * 21) % 256, 200, 230)).convert('RGB').getpixel((0, 0)))
            d.ellipse((x0 + 90, y0 + 90, x0 + W / 4 - 90, y0 + H / 3 - 90), fill=col)
            d.ellipse((x0 + 150, y0 + 140, x0 + 200, y0 + 190), fill=(20, 20, 30)); d.ellipse((x0 + 250, y0 + 140, x0 + 300, y0 + 190), fill=(20, 20, 30))
        for k in range(1, 4): d.line((k * W / 4, 0, k * W / 4, H), fill=(232, 178, 58), width=6)
        for k in range(1, 3): d.line((0, k * H / 3, W, k * H / 3), fill=(232, 178, 58), width=6)
        p = os.path.join(ART, 'fake', 'sheet-v3-%s.png' % name); im.save(p); paths[name] = p
    return paths

def js_str(s): return "'" + s.replace('\\', '\\\\').replace("'", "\\'") + "'"

def svg_cells():
    """الوضع --svg: كلّ تعبيرٍ صورةٌ مستقلّة 600×600 على الكحليّ من art/emotes/render — لا ورقة تُقصّ"""
    rend = os.path.join(ART, 'render'); out = {}
    for key, *_ in ROSTER:
        p = os.path.join(rend, key + '.png')
        if not os.path.exists(p): sys.exit('الرسم غير موجود: %s — شغّل node tools/render-emotes-svg.cjs أوّلًا' % p)
        out[key] = Image.open(p).convert('RGB')
    return out

def main():
    fake = '--fake' in sys.argv; svg = '--svg' in sys.argv
    if svg:
        singles = svg_cells(); sheets = None
    else:
        paths = fake_sheets() if fake else {A: os.path.join(ART, 'sheet-v3-a.png'), B: os.path.join(ART, 'sheet-v3-b.png')}
        for p in paths.values():
            if not os.path.exists(p): sys.exit('الورقة غير موجودة: %s — ضعها في art/emotes ثمّ أعد التشغيل' % p)
        sheets = {k: cells(Image.open(p)) for k, p in paths.items()}
    src = open(GAME, encoding='utf-8').read()
    m_img = re.search(r'const EMO_IMG=\{(.*?)\};', src, re.S)
    if not m_img: sys.exit('لم أجد EMO_IMG')
    img, big, shape, total = {}, {}, {}, 0
    for key, sh, r, c, rar, name, msg in ROSTER:
        cell = singles[key] if svg else sheets[sh][r - 1][c - 1]
        img[key], n = to_uri(tile(cell, TILE)); total += n; shape[key] = 'tile'
        if rar in ('epic', 'legendary'): big[key], n2 = to_uri(tile(cell, BIG), 84); total += n2
    keys = [k for k, *_ in ROSTER]
    src_note = 'رسومٌ متّجهة مرسومة بالكود (art/emotes/svg) — مؤقّتة حتّى تصل لوحتا المالك' if svg else 'لوحتا المالك sheet-v3-a/b (4×3) — بلاطاتٌ مرسومة بأسلوب البطاقات'
    lines = ['const EMO_IMG={', ' // ⟦emotes-v3⟧ ' + src_note + '؛ تولّدها tools/build-emotes-v3.py']
    lines += [' %s:%s,' % (k, js_str(img[k])) for k in keys]; lines.append('};')
    lines.append('/** الملصقات الكبيرة للممتازة والأسطوريّة — فقاعة المباراة والمعاينة والشراء */')
    lines.append('const EMO_BIG={'); lines += [' %s:%s,' % (k, js_str(big[k])) for k in big]; lines.append('};')
    lines.append('/** شكل كل تعبير: tile بلاطة مستديرة بإطار الندرة (كلّ التعابير الجديدة) */')
    lines.append('const EMO_SHAPE={' + ','.join('%s:%s' % (k, js_str(shape[k])) for k in keys) + '};')
    block = '\n'.join(lines)
    tail = src[m_img.end():]
    tail = re.sub(r'^\n/\*\* الملصقات الكبيرة[^\n]*\nconst EMO_BIG=\{.*?\n\};\n/\*\* شكل كل تعبير[^\n]*\nconst EMO_SHAPE=\{[^\n]*\};', '', tail, count=1, flags=re.S)
    src = src[:m_img.start()] + block + tail
    m_ro = re.search(r'const EMOTES=\[\n.*?\n\];', src, re.S)
    if not m_ro: sys.exit('لم أجد EMOTES')
    ro = ['const EMOTES=[']
    sec = {'common': ' // عادية — الثمانية مجانية للجميع', 'rare': ' // نادرة', 'epic': ' // ممتازة', 'legendary': ' // أسطورية — متحركة'}
    i = 0
    for rar in ('common', 'rare', 'epic', 'legendary'):
        ro.append(sec[rar])
        for k, sh, r, c, rr, name, msg in ROSTER:
            if rr != rar: continue
            if k in FREE: ro.append(" {k:'%s',n:'%s',m:'%s',r:'%s',free:1}," % (k, name, msg, rar))
            else: ro.append(" {k:'%s',n:'%s',m:'%s',r:'%s',src:'%s'}," % (k, name, msg, rar, SOURCES[i % len(SOURCES)])); i += 1
    ro[-1] = ro[-1].rstrip(','); ro.append('];')
    src = src[:m_ro.start()] + '\n'.join(ro) + src[m_ro.end():]
    open(GAME, 'w', encoding='utf-8').write(src)
    print('✓ %d تعبيرًا جديدًا (%d ملصقًا كبيرًا) — %.0f ك.ب مضمّنة%s' % (len(keys), len(big), total / 1024, ' (اصطناعيّة للاختبار)' if fake else (' (رسوم متّجهة مؤقّتة)' if svg else '')))

if __name__ == '__main__':
    main()
