# يبني client/src/art.ts من لوحات المالك المرفوعة في art/reference/
# قصّ ملصق الوحدات إلى بورتريهات + شارات رأسية، وضغط الخلفيات، ثم تضمين
# كل شيء Data URIs بحيث يعمل الخادم والنسخة الفردية المنشورة بلا أي مسار خارجي.
import base64, io, os
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF = os.path.join(ROOT, 'art', 'reference')
OUT_TS = os.path.join(ROOT, 'client', 'src', 'art.ts')

SHEET = 'units-sheet.png'    # ملصق الوحدات العشر (صف 5×2 بخلفية كحلية)
BATTLE = 'battle-scene.png'  # لوحة ساحة المعركة
CITY = 'city-scene.png'      # لوحة المدينة

COLS = [(6, 334), (334, 669), (669, 1003), (1003, 1337), (1337, 1666)]
ROWS = [(95, 487), (545, 864)]
IDS = [
    ['steel_guard', 'vale_archers', 'spear_bearers', 'hollow_knights', 'flame_casters'],
    ['bat_riders', 'siege_engineers', 'banner_guards', 'running_shadows', 'stone_golem']
]

def webp_uri(im: Image.Image, q: int) -> str:
    buf = io.BytesIO()
    im.save(buf, 'WEBP', quality=q, method=6)
    return 'data:image/webp;base64,' + base64.b64encode(buf.getvalue()).decode()

def main() -> None:
    entries: list[tuple[str, str]] = []
    total = 0

    sheet = Image.open(os.path.join(REF, SHEET)).convert('RGB')
    for r, (y0, y1) in enumerate(ROWS):
        for c, (x0, x1) in enumerate(COLS):
            uid = IDS[r][c]
            tile = sheet.crop((x0, y0, x1, y1))
            # بورتريه البطاقة
            port = tile.copy(); port.thumbnail((300, 360))
            u = webp_uri(port, 82); total += len(u)
            entries.append((f'p_{uid}', u))
            # شارة دائرية: الرأس والصدر (مربع علوي مركزي)
            w, h = tile.size
            side = int(w * 0.62)
            cx = w // 2
            head = tile.crop((cx - side // 2, int(h * 0.03), cx + side // 2, int(h * 0.03) + side))
            head = head.resize((96, 96))
            u = webp_uri(head, 80); total += len(u)
            entries.append((f'm_{uid}', u))

    battle = Image.open(os.path.join(REF, BATTLE)).convert('RGB')
    battle = battle.crop((0, 0, battle.width, int(battle.height * 0.8)))
    battle.thumbnail((1280, 1280))
    u = webp_uri(battle, 68); total += len(u)
    entries.append(('bg_battle', u))

    city = Image.open(os.path.join(REF, CITY)).convert('RGB')
    # خريطة القاعدة التفاعلية: وسط اللوحة بلا لوحات الواجهة المرسومة على الأطراف
    cmap = city.crop((255, 75, 1470, 845))
    u = webp_uri(cmap, 78); total += len(u)
    entries.append(('city_map', u))
    city.thumbnail((1280, 1280))
    u = webp_uri(city, 68); total += len(u)
    entries.append(('bg_city', u))

    with open(OUT_TS, 'w') as f:
        f.write('// ملف مولّد — لا تعدّله يدوياً: tools/build-art.py يبنيه من لوحات art/reference/\n')
        f.write('// بورتريهات الوحدات (p_)، شارات رأسية (m_)، خلفيات (bg_) — كلها Data URIs.\n')
        f.write('export const ART: Record<string, string> = {\n')
        for k, v in entries:
            f.write(f"  {k}: '{v}',\n")
        f.write('};\n')
    print(f'art.ts: {len(entries)} أصلاً، {total // 1024}KB')

if __name__ == '__main__':
    main()
