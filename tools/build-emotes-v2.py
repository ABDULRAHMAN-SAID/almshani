# -*- coding: utf-8 -*-
# يضمّن تعبيرات المالك المرسومة (5.41) داخل tahaddi/index.html من أربع لوحات في art/emotes:
#   sheet-chibi.png     8×6 وجوه صغيرة بخلفيات ضبابية → ميداليات دائرية (الحلقة ترسمها اللعبة)      → shape ring
#   sheet-tiles.png     8×5 بلاطات مربّعة على أبيض → بلاطة بحواف مستديرة وإطار بلون الندرة              → shape tile
#   sheet-premium-1/2   5×2 ملصقات كبيرة بخلفية داكنة → ملصق كامل للفقاعات والمعاينة + ميدالية للرأس  → shape tall
#   sheet.png           الميداليات الاثنتا عشرة القديمة (ممتازة/أسطورية) تبقى كما هي من index.html    → shape medal
#
#   python3 tools/build-emotes-v2.py
#
# يكتب في index.html: خريطة EMO_IMG (الميداليات)، EMO_BIG (الملصقات الكبيرة)، EMO_SHAPE (شكل كل مفتاح)،
# وقائمة EMOTES (المفتاح والاسم والعبارة والندرة والمصدر). المفاتيح القديمة الستّة عشر (ضحك، حزن…)
# تُعاد إلى وجوه مرسومة من اللوحة الصغيرة فتبقى تشكيلات اللاعبين صالحة.
import base64, io, os, re, sys
import numpy as np
from PIL import Image, ImageFilter, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ART = os.path.join(ROOT, 'art', 'emotes')
GAME = os.path.join(ROOT, 'tahaddi', 'index.html')
MEDAL = 200          # دقة الميدالية والبلاطة (تُعرض حتى 64 بكسل على شاشات 3×)
STK_W, STK_H = 300, 470   # أقصى مقاس للملصق الكبير
QUALITY = 82

# ═══════════ القائمة: (المفتاح، اللوحة، الصف، العمود، الندرة، الاسم، العبارة) — الصف والعمود من 1 ═══════════
CH, TL, P1, P2 = 'chibi', 'tiles', 'prem1', 'prem2'
ROSTER = [
 # ── عادية (المفاتيح القديمة الثمانية مجانية) ──
 ('laugh',   CH, 1, 2, 'common', 'ضحك',        'ضحكتني!'),
 ('sad',     CH, 4, 1, 'common', 'حزن',        'آه…'),
 ('wink',    CH, 1, 1, 'common', 'غمزة',       'سهلة'),
 ('clap',    CH, 5, 7, 'common', 'تصفيق',      'أحسنت!'),
 ('think',   CH, 3, 8, 'common', 'فكرة',       'لقيتها!'),
 ('shock',   CH, 2, 6, 'common', 'صدمة',       'مستحيل!'),
 ('thumbs',  CH, 2, 7, 'common', 'بالتوفيق',   'بالتوفيق'),
 ('shake',   CH, 1, 3, 'common', 'لعب رائع',   'لعب رائع'),
 ('c_shiba', CH, 1, 8, 'common', 'شيبا',       'هلا هلا!'),
 ('c_ghost', CH, 3, 5, 'common', 'شبح مرح',    'بوو!'),
 ('c_hearts',CH, 5, 8, 'common', 'قلوب',       'حب'),
 ('c_coffee',CH, 6, 7, 'common', 'قهوة',       'قهوتك جاهزة'),
 ('c_letter',CH, 6, 3, 'common', 'رسالة',      'وصلتك'),
 ('c_sign',  CH, 6, 4, 'common', 'مفترق طرق',  'وين نروح؟'),
 ('c_boba',  CH, 6, 5, 'common', 'بوبا',       'استراحة'),
 ('c_coin',  CH, 6, 8, 'common', 'عملة',       'ذهب!'),
 # ── نادرة ──
 ('confident',CH, 2, 1, 'rare', 'ثقة',         'واثق تماماً'),
 ('angry',   CH, 1, 4, 'rare', 'غضب',          'غاضب!'),
 ('tense',   CH, 3, 4, 'rare', 'توتر',         'لحظة حرجة'),
 ('love',    CH, 1, 5, 'rare', 'إعجاب',        'أعجبني!'),
 ('sleep',   CH, 2, 5, 'rare', 'نعسان',        'مملّ…'),
 ('salute',  CH, 1, 6, 'rare', 'تحية',         'احترامي'),
 ('watch',   CH, 3, 1, 'rare', 'مراقبة',       'أراقبك'),
 ('hourglass',CH, 6, 2, 'rare', 'الوقت يمضي',  'الوقت يمضي!'),
 ('c_hood',  CH, 1, 7, 'rare', 'المتخفّي',     'أراقب من الظل'),
 ('c_heartgirl',CH, 2, 2, 'rare', 'قلب كبير',  'حبّيتك'),
 ('c_panda', CH, 2, 3, 'rare', 'باندا',        'على مهلي'),
 ('c_penguin',CH, 2, 4, 'rare', 'بطريق يلوّح', 'سلام عليكم'),
 ('c_monster',CH, 2, 8, 'rare', 'وحش مبتهج',   'يا سلام!'),
 ('c_witch', CH, 3, 2, 'rare', 'الساحرة',      'سحر!'),
 ('c_music', CH, 3, 3, 'rare', 'على المزاج',   'موسيقى!'),
 ('c_boxcat',CH, 3, 6, 'rare', 'قط الصندوق',   'أنا هنا'),
 ('c_shark', CH, 3, 7, 'rare', 'قرش واثق',     'سهلة!'),
 ('c_pray',  CH, 4, 2, 'rare', 'دعاء',         'يا رب'),
 ('c_pinkgirl',CH, 4, 3, 'rare', 'هيا!',       'هيا هيا!'),
 ('c_catsleep',CH, 4, 4, 'rare', 'قط نائم',    'نمت'),
 ('c_bomb',  CH, 4, 5, 'rare', 'قنبلة',        'بنفجر!'),
 ('c_pizza', CH, 4, 6, 'rare', 'بيتزا كول',    'على راحتي'),
 ('c_skull', CH, 4, 7, 'rare', 'هيكل الروك',   'صخب!'),
 ('c_frog',  CH, 4, 8, 'rare', 'ضفدع',         'مرحى!'),
 ('c_facepalm',CH, 5, 1, 'rare', 'يا خيبة',    'يا خيبتي'),
 ('c_duck',  CH, 5, 2, 'rare', 'بطة الثراء',   'فلوس فلوس'),
 ('c_bunny', CH, 5, 3, 'rare', 'أرنب مشجّع',   'شجّعوا!'),
 ('c_ninja', CH, 5, 4, 'rare', 'قط النينجا',   'بصمت'),
 ('c_cupid', CH, 5, 5, 'rare', 'كيوبيد',       'سهم الحب'),
 ('c_tornado',CH, 5, 6, 'rare', 'إعصار',       'اكتساح!'),
 ('c_trophy',CH, 6, 1, 'rare', 'الكأس',        'الفوز لي'),
 ('c_pad',   CH, 6, 6, 'rare', 'يد التحكم',    'نلعب؟'),
 # ── ممتازة: بلاطات ──
 ('t_student',TL, 1, 1, 'epic', 'الطالب',      'ما فهمت'),
 ('t_idea',  TL, 1, 2, 'epic', 'فكرة!',        'لقيتها!'),
 ('t_boss',  TL, 1, 3, 'epic', 'الزعيم',       'صه…'),
 ('t_detective',TL, 1, 4, 'epic', 'المحقق',    'كشفتك'),
 ('t_cheat', TL, 1, 5, 'epic', 'الغشّاش',      'ورقة تحت الكم'),
 ('t_foxuno',TL, 1, 6, 'epic', 'ثعلب الأونو',  'أونو!'),
 ('t_kingpenguin',TL, 1, 7, 'epic', 'البطريق الملك', 'الملك وصل'),
 ('t_hacker',TL, 1, 8, 'epic', 'القرصان',      'اخترقتك'),
 ('t_painter',TL, 2, 1, 'epic', 'الرسّامة',    'لوحة!'),
 ('t_colors',TL, 2, 2, 'epic', 'فوضى الألوان', 'ألوان!'),
 ('t_carrom',TL, 2, 3, 'epic', 'لوح الكيرم',   'ضربة!'),
 ('t_unoqueen',TL, 2, 4, 'epic', 'ملكة الأونو', 'دورك'),
 ('t_shocked',TL, 2, 5, 'epic', 'مستحيل!',     'مستحيل!'),
 ('t_sweat', TL, 2, 6, 'epic', 'توتّر',        'يا ويلي'),
 ('t_coolcat',TL, 2, 7, 'epic', 'القط الفخم',  'ستايل'),
 ('t_robot', TL, 2, 8, 'epic', 'الروبوت',      'تمّت المعالجة'),
 ('t_ghost', TL, 3, 1, 'epic', 'الشبح',        'بوو!'),
 ('t_dino',  TL, 3, 2, 'epic', 'الديناصور الباكي', 'ليش…'),
 ('t_dog',   TL, 3, 3, 'epic', 'كلب التشجيع',  'أحسنت!'),
 ('t_facepalm',TL, 3, 4, 'epic', 'يا خسارة',   'يا خسارة'),
 ('t_laughcry',TL, 3, 5, 'epic', 'ضحك حتى الدموع', 'ما قدرت أمسك نفسي'),
 ('t_hearts',TL, 3, 6, 'epic', 'حب',           'حبّيتك'),
 ('t_panda', TL, 3, 7, 'epic', 'باندا نعسان',  'تصبحون على خير'),
 ('t_angrybird',TL, 3, 8, 'epic', 'طير غاضب',  'زعلان'),
 ('t_salute',TL, 4, 1, 'epic', 'تحية عسكرية',  'احترامي'),
 ('t_thumbs',TL, 4, 2, 'epic', 'ممتاز!',       'ممتاز!'),
 ('t_star',  TL, 4, 3, 'epic', 'نجمة الحفلة',  'حفلتنا الليلة'),
 ('t_bunny', TL, 4, 4, 'epic', 'أرنب يبكي',    'ظلمتني'),
 ('t_fist',  TL, 4, 5, 'epic', 'يلا!',         'يلا!'),
 ('t_king',  TL, 4, 6, 'epic', 'الملك والكأس', 'الكأس لي'),
 ('t_party', TL, 4, 7, 'epic', 'احتفال',       'مبروك!'),
 ('t_rapper',TL, 4, 8, 'epic', 'بطريق الراب',  'أنا الأسطورة'),
 ('t_book',  TL, 5, 1, 'epic', 'كتاب الأسرار', 'سرّ'),
 ('t_chest', TL, 5, 2, 'epic', 'الصندوق',      'كنز!'),
 ('t_coins', TL, 5, 3, 'epic', 'كنز',          'غني!'),
 ('t_diamond',TL, 5, 4, 'epic', 'الماسة',      'جوهرة'),
 ('t_mic',   TL, 5, 5, 'epic', 'المايك',       'اسمعوني'),
 ('t_mask',  TL, 5, 6, 'epic', 'القناع',       'مقنّع'),
 ('t_potion',TL, 5, 7, 'epic', 'جرعة',         'جرعة قوة'),
 ('t_shield',TL, 5, 8, 'epic', 'الدرع',        'محمي'),
 # ── أسطورية: ملصقات كبيرة ──
 ('p_king',  P1, 1, 1, 'legendary', 'الملك المتكبّر', 'التاج لي'),
 ('p_jester',P1, 1, 2, 'legendary', 'المهرج',        'مهرجان الضحك'),
 ('p_penguin',P1, 1, 3, 'legendary', 'بطريق الغرور', 'ولا يهمّني'),
 ('p_reaper',P1, 1, 4, 'legendary', 'حاصد الأرواح',  'انتهى أمرك'),
 ('p_goblin',P1, 1, 5, 'legendary', 'الغول الساخر',  'تستاهل!'),
 ('p_richcat',P1, 2, 1, 'legendary', 'القط الثري',   'صحّة!'),
 ('p_mirror',P1, 2, 2, 'legendary', 'مرآة الظل',     'شوف حالك'),
 ('p_orc',   P1, 2, 3, 'legendary', 'محطّم الدروع',  'كسرت درعك'),
 ('p_angel', P1, 2, 4, 'legendary', 'ملاك القلوب',   'مع السلامة يا قلبي'),
 ('p_boot',  P1, 2, 5, 'legendary', 'مستواك',        'مستواك'),
 ('p_throne',P2, 1, 1, 'legendary', 'ارجع الويبي',   'ارجع الويبي'),
 ('p_shark', P2, 1, 2, 'legendary', 'قرش الشماتة',   'الله يرحمك'),
 ('p_pumpkin',P2, 1, 3, 'legendary', 'اليقطينة',     'سهلة!'),
 ('p_llama', P2, 1, 4, 'legendary', 'اللاما',        'وين دفاعك؟'),
 ('p_knight',P2, 1, 5, 'legendary', 'فارس الغلط',    'لا تكرر الغلط'),
 ('p_crow',  P2, 2, 1, 'legendary', 'الغراب',        'يا مسكين'),
 ('p_mime',  P2, 2, 2, 'legendary', 'المهرج الخاسر', 'خسران'),
 ('p_dragon',P2, 2, 3, 'legendary', 'التنين الذهبي', 'انتهى دورك'),
 ('p_shadow',P2, 2, 4, 'legendary', 'ظل السقوط',     'سقطت'),
 ('p_redpanda',P2, 2, 5, 'legendary', 'خذ استراحة',  'خذ استراحة'),
]
# الميداليات القديمة الاثنتا عشرة — تبقى كما هي (شكل medal: حلقتها جزء من الصورة)
LEGACY = [
 ('crown', 'epic', 'الدب الملك', 'الملك هنا'), ('brain', 'epic', 'العبقري', 'عبقرية!'),
 ('fire', 'epic', 'النمر الأبيض', 'زمجرة!'), ('wizard', 'epic', 'الساحر', 'خدعة سحرية'),
 ('pirate', 'epic', 'الثعلب الماكر', 'خدعتك!'), ('champion', 'epic', 'العملاق الصخري', 'صلب كالصخر'),
 ('cat', 'legendary', 'القط الساخر', 'مضحك جداً!'), ('falcon', 'legendary', 'الصقر الملكي', 'انقضاض!'),
 ('camel', 'legendary', 'الجمل المستهزئ', 'ولا يهمك'), ('lion', 'legendary', 'ملك الغابة', 'زئير!'),
 ('monkey', 'legendary', 'القرد المشاغب', 'ما شفت شي'), ('owl', 'legendary', 'البومة الحكيمة', 'حكمة اليوم'),
]
FREE = {'laugh', 'sad', 'wink', 'clap', 'think', 'shock', 'thumbs', 'shake'}
SOURCES = ['المتجر', 'الصناديق', 'الأحداث', 'الإنجازات', 'تذكرة الموسم', 'البطولات', 'الإتقان']

# ═══════════ أدوات الصورة ═══════════
def box(a, r):
    p = np.pad(a, r, mode='edge'); c = np.cumsum(np.cumsum(p, axis=0), axis=1); c = np.pad(c, ((1, 0), (1, 0)))
    k = 2 * r + 1; H, W = a.shape
    return (c[k:k + H, k:k + W] - c[0:H, k:k + W] - c[k:k + H, 0:W] + c[0:H, 0:W]) / (k * k)

def sdmap(im, pre, r=3):
    im = im.convert('RGB').filter(ImageFilter.GaussianBlur(pre)); a = np.asarray(im).astype(np.float32)
    out = np.zeros(a.shape[:2], np.float32)
    for ch in range(3):
        x = a[:, :, ch]; v = box(x * x, r) - box(x, r) ** 2; out = np.maximum(out, np.sqrt(np.clip(v, 0, None)))
    return out

def Lmask(mask):   # copy: صورة fromarray للقراءة فقط فلا تقبل التعبئة
    return Image.fromarray(np.where(mask, 255, 0).astype(np.uint8), 'L').copy()

def flood_outside(mask):
    h, w = mask.shape; L = Lmask(mask)
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

def cut_dark(cell, pre=3.0, t=6, pre_open=1, close=4, open_=2, min_area=400):
    """خلفية ضبابية داكنة: تباين محلي ← إزالة الحبيبات ← سدّ الفجوات ← تعبئة الخارج ← حذف البقع والأجزاء الدخيلة."""
    sd = sdmap(cell, pre); obj = sd > t; h, w = obj.shape
    if pre_open: obj = np.array(Lmask(obj).filter(ImageFilter.MinFilter(pre_open * 2 + 1)).filter(ImageFilter.MaxFilter(pre_open * 2 + 1))) > 127
    C = np.array(Lmask(obj).filter(ImageFilter.MaxFilter(close * 2 + 1)).filter(ImageFilter.MinFilter(close * 2 + 1))) > 127
    inside = ~flood_outside(C)
    inside = np.array(Lmask(inside).filter(ImageFilter.MinFilter(open_ * 2 + 1)).filter(ImageFilter.MaxFilter(open_ * 2 + 1))) > 127
    lab, n = components(inside); keep = np.zeros_like(inside)
    for i in range(2, n + 2):
        b = lab == i
        if b.sum() < min_area: continue
        ys, xs = np.nonzero(b)
        if ((xs.min() <= 1) or (xs.max() >= w - 2)) and not ((xs > w / 3) & (xs < 2 * w / 3)).any(): continue
        if ((ys.min() <= 1) or (ys.max() >= h - 2)) and not ((ys > h / 3) & (ys < 2 * h / 3)).any(): continue   # جزء من الملصق المجاور فوق أو تحت
        keep |= b
    A = Lmask(keep).filter(ImageFilter.GaussianBlur(.9)); out = cell.convert('RGBA'); out.putalpha(A); return out

def cut_white(cell, thr=228):
    rgb = np.asarray(cell.convert('RGB')).astype(np.int16); obj = ~(rgb.min(axis=2) > thr)
    A = Lmask(~flood_outside(obj)).filter(ImageFilter.GaussianBlur(.8)); out = cell.convert('RGBA'); out.putalpha(A); return out

def trim(im, pad=4):
    bb = im.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox()
    if not bb: return im
    x0, y0, x1, y1 = bb; return im.crop((max(0, x0 - pad), max(0, y0 - pad), min(im.size[0], x1 + pad), min(im.size[1], y1 + pad)))

def grid_by_content(im, cols, rows, mask):
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

def detail_mask(im, thr=14, blur=36):
    rgb = np.asarray(im.convert('RGB')).astype(np.float32)
    bl = np.asarray(im.convert('RGB').filter(ImageFilter.GaussianBlur(blur))).astype(np.float32)
    return np.abs(rgb - bl).max(axis=2) > thr

def fixed_grid(im, cols, rows):
    w, h = im.size; cw, ch = w / cols, h / rows
    return [[im.crop((round(c * cw), round(r * ch), round((c + 1) * cw), round((r + 1) * ch))) for c in range(cols)] for r in range(rows)]

def circle_mask(size):
    m = Image.new('L', (size * 4, size * 4), 0); ImageDraw.Draw(m).ellipse((4, 4, size * 4 - 4, size * 4 - 4), fill=255)
    return m.resize((size, size), Image.LANCZOS)

def to_uri(im, q=QUALITY):
    buf = io.BytesIO(); im.save(buf, 'WEBP', quality=q, method=6)
    return 'data:image/webp;base64,' + base64.b64encode(buf.getvalue()).decode(), len(buf.getvalue())

def medal_ring(cell):
    """وجه صغير: نفصله عن خلفيته الضبابية (شفافية كاملة) ثم نضعه داخل دائرة — الحلقة والقرص ترسمهما اللعبة."""
    s = trim(cut_dark(cell, pre=2.6, t=6, close=4, open_=2, min_area=300), pad=2)
    s.thumbnail((int(MEDAL * .86), int(MEDAL * .86)), Image.LANCZOS)
    c = Image.new('RGBA', (MEDAL, MEDAL), (0, 0, 0, 0)); c.alpha_composite(s, ((MEDAL - s.size[0]) // 2, (MEDAL - s.size[1]) // 2))
    c.putalpha(Image.fromarray(np.minimum(np.asarray(c.getchannel('A')), np.asarray(circle_mask(MEDAL))).astype(np.uint8), 'L')); return c

def medal_tile(cell):
    """بلاطة: نفصلها عن الأبيض ثم نقصّ إطارها الأسود وحاشيتها البيضاء (7% من كل جهة) — الإطار ترسمه اللعبة بلون الندرة."""
    t = trim(cut_white(cell), pad=0); w, h = t.size; k = .08
    t = t.crop((int(w * k), int(h * k), int(w * (1 - k)), int(h * (1 - k))))
    t = trim(cut_white(t, thr=222), pad=2)          # الأبيض داخل البلاطة (والحاشية البيضاء) يصير شفافًا
    t.thumbnail((int(MEDAL * .9), int(MEDAL * .9)), Image.LANCZOS)
    c = Image.new('RGBA', (MEDAL, MEDAL), (0, 0, 0, 0)); c.alpha_composite(t, ((MEDAL - t.size[0]) // 2, (MEDAL - t.size[1]) // 2)); return c

def sticker_and_medal(cell):
    """ملصق كبير بشفافية + ميدالية دائرية من صدره على قرص متدرّج ذهبي داكن."""
    s = trim(cut_dark(cell), pad=6); s.thumbnail((STK_W, STK_H), Image.LANCZOS)
    w, h = s.size; r = int(w * .40); cx, cy = w // 2, max(r, int(h * .27))   # الرأس والصدر — يُقرأ في 40 بكسل
    disc = Image.new('RGBA', (2 * r, 2 * r), (0, 0, 0, 0)); px = disc.load()
    for y in range(2 * r):
        for x in range(2 * r):
            d = ((x - r) ** 2 + (y - r) ** 2) ** .5 / r
            k = max(0.0, 1 - d); px[x, y] = (int(40 + 60 * k), int(28 + 40 * k), int(12 + 20 * k), 255)
    crop = s.crop((cx - r, cy - r, cx + r, cy + r)); disc.alpha_composite(crop)
    disc = disc.resize((MEDAL, MEDAL), Image.LANCZOS); disc.putalpha(circle_mask(MEDAL))
    return s, disc

# ═══════════ التجميع ═══════════
def load_sheets():
    ch = Image.open(os.path.join(ART, 'sheet-chibi.png')); chibi = grid_by_content(ch, 8, 6, sdmap(ch, 3.0) > 6)   # الوجوه ليست على شبكة دقيقة: القصّ في الفجوات بين الملصقات
    tl = Image.open(os.path.join(ART, 'sheet-tiles.png')); rgb = np.asarray(tl.convert('RGB')).astype(np.int16)
    tiles = grid_by_content(tl, 8, 5, ~(rgb.min(axis=2) > 228))
    prem = {}
    for key, f in ((P1, 'sheet-premium-1.png'), (P2, 'sheet-premium-2.png')):
        im = Image.open(os.path.join(ART, f)); prem[key] = grid_by_content(im, 5, 2, detail_mask(im))
    return {CH: chibi, TL: tiles, P1: prem[P1], P2: prem[P2]}

def legacy_uris(src):
    m = re.search(r'const EMO_IMG=\{(.*?)\};', src, re.S)   # أوّل «};» بعد الخريطة — القيم base64 لا تحوي أقواسًا
    if not m: sys.exit('لم أجد EMO_IMG في index.html')
    out = {}
    for k, uri in re.findall(r"\b([a-z_0-9]+):'(data:image/webp;base64,[A-Za-z0-9+/=]+)'", m.group(1)):
        out[k] = uri
    return out, m

def js_str(s): return "'" + s.replace('\\', '\\\\').replace("'", "\\'") + "'"

def main():
    src = open(GAME, encoding='utf-8').read()
    old, m_img = legacy_uris(src)
    sheets = load_sheets()
    img, big, shape, sizes = {}, {}, {}, {}
    for key, sh, r, c, rar, name, msg in ROSTER:
        cell = sheets[sh][r - 1][c - 1]
        if sh == CH: med = medal_ring(cell); shape[key] = 'ring'
        elif sh == TL: med = medal_tile(cell); shape[key] = 'tile'
        else:
            stk, med = sticker_and_medal(cell); shape[key] = 'tall'
            big[key], n = to_uri(stk, 84); sizes[key + '@big'] = n
        img[key], n = to_uri(med); sizes[key] = n
    for key, rar, name, msg in LEGACY:
        if key not in old: sys.exit('الميدالية القديمة %s غير موجودة في index.html' % key)
        img[key] = old[key]; shape[key] = 'medal'
    # ── EMO_IMG / EMO_BIG / EMO_SHAPE ──
    lines = ['const EMO_IMG={', ' // ⟦emotes-v2⟧ لوحات المالك: sheet-chibi (دوائر) · sheet-tiles (بلاطات) · sheet-premium-1/2 (ملصقات) · sheet.png (12 ميدالية) — يولّدها tools/build-emotes-v2.py']
    keys = [k for k, *_ in ROSTER] + [k for k, *_ in LEGACY]
    lines += [' %s:%s,' % (k, js_str(img[k])) for k in keys]
    lines.append('};')
    lines.append('/** الملصقات الكبيرة للأسطورية المرسومة — تظهر في فقاعة المباراة والمعاينة والشراء */')
    lines.append('const EMO_BIG={'); lines += [' %s:%s,' % (k, js_str(big[k])) for k in big]; lines.append('};')
    lines.append("/** شكل كل تعبير: medal حلقة داخل الصورة · ring صورة دائرية واللعبة ترسم الحلقة · tile بلاطة مستديرة · tall ملصق كبير وميدالية للرأس */")
    lines.append('const EMO_SHAPE={' + ','.join('%s:%s' % (k, js_str(shape[k])) for k in keys) + '};')
    block = '\n'.join(lines)
    # حذف أي EMO_BIG/EMO_SHAPE سابقة قبل الاستبدال (تشغيل متكرّر)
    tail = src[m_img.end():]
    tail = re.sub(r'^\n/\*\* الملصقات الكبيرة[^\n]*\nconst EMO_BIG=\{.*?\n\};\n/\*\* شكل كل تعبير[^\n]*\nconst EMO_SHAPE=\{[^\n]*\};', '', tail, count=1, flags=re.S)
    src = src[:m_img.start()] + block + tail
    # ── قائمة EMOTES ──
    m_ro = re.search(r'const EMOTES=\[\n.*?\n\];', src, re.S)
    if not m_ro: sys.exit('لم أجد EMOTES')
    ro = ['const EMOTES=[']
    sec = {'common': ' // عادية — الثمانية الأولى مجانية للجميع', 'rare': ' // نادرة', 'epic': ' // ممتازة', 'legendary': ' // أسطورية — متحركة'}
    allr = [(k, rar, name, msg) for k, sh, r, c, rar, name, msg in ROSTER] + [(k, rar, name, msg) for k, rar, name, msg in LEGACY]
    i = 0
    for rar in ('common', 'rare', 'epic', 'legendary'):
        ro.append(sec[rar])
        for k, rr, name, msg in allr:
            if rr != rar: continue
            if k in FREE: ro.append(" {k:'%s',n:'%s',m:'%s',r:'%s',free:1}," % (k, name, msg, rar))
            else: ro.append(" {k:'%s',n:'%s',m:'%s',r:'%s',src:'%s'}," % (k, name, msg, rar, SOURCES[i % len(SOURCES)])); i += 1
    ro[-1] = ro[-1].rstrip(','); ro.append('];')
    src = src[:m_ro.start()] + '\n'.join(ro) + src[m_ro.end():]
    open(GAME, 'w', encoding='utf-8').write(src)
    tot = sum(sizes.values())
    print('✓ %d تعبيرًا (%d ميدالية جديدة + %d ملصقًا كبيرًا + %d قديمة) — %.0f ك.ب مضمّنة' % (len(keys), len(ROSTER), len(big), len(LEGACY), tot / 1024))

if __name__ == '__main__':
    main()
