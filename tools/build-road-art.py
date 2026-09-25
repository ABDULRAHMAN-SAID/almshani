# -*- coding: utf-8 -*-
"""٦٫٩٦ — تضمين لوحات OpenArt لطريق الكؤوس (art/road/) في tahaddi/index.html:
  dio-01.png … dio-10.png  → ARENA_DIO[0..9]  مجسّم كلّ ساحة (خلفيّة أرجوانيّة #FF00FF تُزال إلى شفافيّة)
  slabs.png                → SLAB_IMG[0..9]   عشر منصّات: صفّان × خمس، بترتيب الساحات (يسارًا إلى يمين، ثمّ الصفّ الثاني)
حتّى تصل الصور تُرسَم المجسّمات والمنصّات داخل اللعبة بـ three.js مرّةً وتُخزَّن صورًا؛ متى ضُمّنت حلّت محلّ الرسم.
الصورة تُقصّ على حدود الشكل (tools/_keyslice.py)، وتُوضع في لوحةٍ بنسبة عنصرها في اللعبة (المجسّم 1.12:1، المنصّة 2.55:1)
بمحاذاة الأسفل (القاعدة على الأرض)، وتُرمَّز webp بشفافيّة. في اللعبة تُحقن كلّ صورةٍ فئةَ CSS مرّةً واحدة (rd3Rule) — لا data-URI في كلّ رسم.
  python3 tools/build-road-art.py            ← يضمّن ما وجده ويطبع تقريرًا ولوحة معاينة art/road/_preview.png
  python3 tools/build-road-art.py --dry      ← يحسب الأحجام ويكتب المعاينة دون تعديل اللعبة
  python3 tools/build-road-art.py --game ملفّ ← هدفٌ آخر (نسخة للتجربة)،  --src مجلّد ← مصدرٌ غير art/road
بعدها: node tools/splash-total.cjs"""
import base64, io, os, re, sys
from PIL import Image
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from _keyslice import keyout, components, grid_order, preview
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)));SRC=os.path.join(ROOT,'art','road')
GAME=os.path.join(ROOT,'tahaddi','index.html')
if '--game' in sys.argv:GAME=os.path.abspath(sys.argv[sys.argv.index('--game')+1])
if '--src' in sys.argv:SRC=os.path.abspath(sys.argv[sys.argv.index('--src')+1])
EXT=('.png','.webp','.jpg','.jpeg')
DIO=(1000,893,86)     # عرض × ارتفاع × جودة — نسبة .rdDio (1.12) وضعف عرضه الأقصى (350)
SLAB=(820,322,82)    # نسبة .rdSl (2.55)
PLAT=(760,380,82)    # ٧٫٠٦: منصّة الصفّ بقطعتيها (٢:١)
PROP=(240,240,84)    # ٧٫٠٦: مجسّم زينةٍ على قطعة
def find(name):
    for e in EXT:
        p=os.path.join(SRC,name+e)
        if os.path.exists(p):return p
def fit(tile,W,H,pad=.03):
    """يضع الشكل داخل لوحة W×H شفّافة بنسبته، محاذًى للأسفل وفي الوسط أفقيًّا"""
    tile=tile.convert('RGBA');bb=tile.getbbox()
    if bb:tile=tile.crop(bb)
    iw,ih=int(W*(1-2*pad)),int(H*(1-pad))
    r=min(iw/tile.width,ih/tile.height);tile=tile.resize((max(1,round(tile.width*r)),max(1,round(tile.height*r))),Image.LANCZOS)
    out=Image.new('RGBA',(W,H),(0,0,0,0));out.alpha_composite(tile,((W-tile.width)//2,H-tile.height-int(H*pad*.5)));return out
def uri(im,q):
    b=io.BytesIO();im.save(b,'WEBP',quality=q,method=6,alpha_quality=90);d=b.getvalue()
    return 'data:image/webp;base64,'+base64.b64encode(d).decode(),len(d)
def cut_one(path):
    """مجسّمٌ واحد: كلّ ما ليس أرجوانيًّا — المكوّنات كلّها معًا (القاعدة والديكور المنفصل)"""
    rgba=keyout(Image.open(path));im=Image.fromarray(rgba);return im
def cut_grid(path,n,name='slabs.png'):
    rgba=keyout(Image.open(path));bx=grid_order(components(rgba[...,3],min_px=3000,gap=10))
    if len(bx)!=n:sys.exit('✗ %s: وُجد %d شكلًا والمتوقّع %d (شبكة على خلفيّة #FF00FF بفراغٍ بينها)'%(name,len(bx),n))
    return [Image.fromarray(rgba[b[0]:b[2]+1,b[1]:b[3]+1]) for b in bx]
def put(s,name,items):
    body='const %s={%s};   // ⟦road-art:%s⟧ %s — tools/build-road-art.py\n'%(name,','.join('%d:%r'%(i,u) for i,u in sorted(items.items())),{'ARENA_DIO':'dio','SLAB_IMG':'slab','ROAD_PLAT':'plat','ROAD_PROP':'prop'}[name],{'ARENA_DIO':'مجسّمات الساحات','SLAB_IMG':'منصّة لكلّ ساحة','ROAD_PLAT':'منصّة الصفّ بقطعتين لكلّ ساحة','ROAD_PROP':'مجسّما زينةٍ لكلّ ساحة'}[name])
    pat=re.compile(r'const %s=\{[^\n]*\n'%name);n=len(pat.findall(s))
    if n!=1:sys.exit('✗ %s: موجود %d مرّة في اللعبة (المتوقّع 1) — هل طُبّق طريق الكؤوس المجسّم (road3d)؟'%(name,n))
    return pat.sub(lambda m:body,s,count=1)
def main():
    dry='--dry' in sys.argv;rep=[];total=0;dio={};slab={};prev=[]
    for i in range(1,11):
        p=find('dio-%02d'%i)
        if not p:continue
        t=fit(cut_one(p),*DIO[:2]);u,n=uri(t,DIO[2]);dio[i-1]=u;total+=n;rep.append('dio-%02d %dKB'%(i,n//1024));prev.append(t)
    p=find('slabs')
    if p:
        for i,t in enumerate(cut_grid(p,10)):
            t=fit(t,*SLAB[:2]);u,n=uri(t,SLAB[2]);slab[i]=u;total+=n;prev.append(t)
        rep.append('slabs ×10 %dKB'%(sum(len(v) for v in slab.values())*3//4//1024))
    # ٧٫٠٦ — منصّات الطريق ذات القطعتين (platforms.png: ٥×٢) ومجسّمات الزينة (props.png: ٥×٤، صفّان للمجسّم الأوّل لكلّ ساحة ثمّ صفّان للثاني)
    plat={};prop={}
    p=find('platforms')
    if p:
        for i,t in enumerate(cut_grid(p,10,'platforms.png')):
            t=fit(t,*PLAT[:2]);u,n=uri(t,PLAT[2]);plat[i]=u;total+=n;prev.append(t)
        rep.append('platforms ×10 %dKB'%(sum(len(v) for v in plat.values())*3//4//1024))
    p=find('props')
    if p:
        for i,t in enumerate(cut_grid(p,20,'props.png')):
            t=fit(t,*PROP[:2],pad=.02);u,n=uri(t,PROP[2]);prop[i]=u;total+=n;prev.append(t)
        rep.append('props ×20 %dKB'%(sum(len(v) for v in prop.values())*3//4//1024))
    if not rep:sys.exit('لا صور في art/road — ضع dio-01..10.png و/أو slabs.png (خلفيّة #FF00FF) ثمّ أعد التشغيل')
    try:preview([x.resize((x.width//2,x.height//2)) for x in prev],os.path.join(SRC,'_preview.png'),cols=5)
    except Exception as e:rep.append('(المعاينة: %s)'%e)
    print(' · '.join(rep));print('المجموع المضمّن %.0f ك.ب'%(total/1024))
    s=open(GAME,encoding='utf-8').read();orig=s
    if dio:s=put(s,'ARENA_DIO',dio)
    if slab:s=put(s,'SLAB_IMG',slab)
    if plat:s=put(s,'ROAD_PLAT',plat)
    if prop:s=put(s,'ROAD_PROP',prop)
    if dry or s==orig:print('(لم يُكتب شيء)' if dry else '(لا تغيير)');return
    open(GAME,'w',encoding='utf-8').write(s);print('✓ كُتب',GAME,'— شغّل الآن: node tools/splash-total.cjs')
if __name__=='__main__':main()
