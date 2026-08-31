# يضمّن صور التعبيرات المرسومة من المالك داخل tahaddi/index.html
#
# الاستخدام:
#   1) ارفع الصور إلى art/emotes/ — صورة مربعة لكل تعبير باسم مفتاحه:
#      laugh.png sad.png wink.png clap.png think.png shock.png thumbs.png shake.png
#      confident.png angry.png tense.png love.png sleep.png salute.png watch.png hourglass.png
#      crown.png brain.png fire.png wizard.png pirate.png champion.png
#      cat.png falcon.png camel.png lion.png monkey.png owl.png
#      (png أو jpg أو webp — أي مجموعة جزئية تكفي؛ الناقص يبقى مرسوماً بالكود)
#   2) python3 tools/build-emotes.py
#
# كل صورة تُقص مربعاً من مركزها وتُصغّر ثم تُضمّن Data URI داخل خريطة EMO_IMG،
# فتظهر داخل الميدالية المعدنية نفسها (الحلقة واللمعة تبقيان من الرسم).
import base64, io, os, re, sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DIR = os.path.join(ROOT, 'art', 'emotes')
GAME = os.path.join(ROOT, 'tahaddi', 'index.html')
SIZE = 112          # كافية لأكبر عرض (المعاينة 132px على شاشات عادية)
QUALITY = 82

KEYS = ['laugh','sad','wink','clap','think','shock','thumbs','shake',
        'confident','angry','tense','love','sleep','salute','watch','hourglass',
        'crown','brain','fire','wizard','pirate','champion',
        'cat','falcon','camel','lion','monkey','owl']

def webp_uri(im: Image.Image) -> str:
    buf = io.BytesIO()
    im.save(buf, 'WEBP', quality=QUALITY, method=6)
    return 'data:image/webp;base64,' + base64.b64encode(buf.getvalue()).decode()

def load_square(path: str) -> Image.Image:
    im = Image.open(path).convert('RGB')
    w, h = im.size
    side = min(w, h)
    im = im.crop(((w - side) // 2, (h - side) // 2, (w + side) // 2, (h + side) // 2))
    return im.resize((SIZE, SIZE), Image.LANCZOS)

def main() -> None:
    if not os.path.isdir(SRC_DIR):
        sys.exit(f'لا يوجد مجلد {SRC_DIR} — ارفع الصور أولاً')
    entries, total = [], 0
    for k in KEYS:
        for ext in ('png', 'jpg', 'jpeg', 'webp'):
            p = os.path.join(SRC_DIR, f'{k}.{ext}')
            if os.path.exists(p):
                uri = webp_uri(load_square(p))
                entries.append(f"{k}:'{uri}'")
                total += len(uri)
                print(f'  {k}: {len(uri)//1024}KB')
                break
    if not entries:
        sys.exit('لم أجد أي صورة باسم مفتاح تعبير في art/emotes/')
    src = open(GAME, encoding='utf-8').read()
    a = src.index('const EMO_IMG={')
    b = src.index('};', a) + 2
    src = src[:a] + 'const EMO_IMG={' + ',\n'.join(entries) + '};' + src[b:]
    open(GAME, 'w', encoding='utf-8').write(src)
    print(f'ضُمّنت {len(entries)} صورة ({total//1024}KB) في اللعبة ✔')

if __name__ == '__main__':
    main()
