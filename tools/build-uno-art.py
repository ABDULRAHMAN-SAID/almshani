# -*- coding: utf-8 -*-
"""٦٫٩٦ — تضمين لوحات OpenArt الخاصّة بأونو (art/uno/) في tahaddi/index.html — تملأ خانات UNO_ART بين /*UNOART-BEGIN*/ و/*UNOART-END*/:
  scene.png  → UNO_ART.bg     مشهد الطاولة (9:16، طاولةٌ مستديرة كحليّة وذهبيّة في مجلس، زاوية ثلاثة أرباع) — يصير خلفيّة الغرفة خلف الطاولة
  sheet.png  → لوحةٌ على خلفيّةٍ أرجوانيّة صافية (#FF00FF) فيها ثلاثة عناصر، تُقصّ بـ tools/_keyslice.py:
               ظهر البطاقة (مستطيلٌ طوليّ)  → UNO_ART.back   (ظهر البطاقات المجسّمة وظهر بطاقات DOM)
               زرّ «أونو!» الأحمر (دائريّ)   → UNO_ART.btn    (وجه الزرّ المستدير فوق اليد؛ النصّ العربيّ يبقى فوقه)
               ميدالية اللون (دائريّة)       → UNO_ART.medal  (قبل اسم اللون في شارة الطاولة، ولون اللعب تحتها)
  fronts.png → UNO_ART.fronts  لوحةٌ أرجوانيّة (21:9) فيها خمسة وجوهٍ فارغة في صفٍّ واحد بهذا الترتيب من اليسار: أحمر، أزرق، أصفر، أخضر،
               جوكر كحليّ بأربعة أقواس — إطارٌ ذهبيّ وبيضاويّ أبيض مائل بلا أرقام؛ يطبع عليها المجسّم الرقم والرمز، وبطاقات اليد تلبسها كذلك
  hero.png   → UNO_ART.hero و REAL_ART.ui_mode_uno   صورة أونو المربّعة (مروحة بطاقات فوق الطاولة في المجلس) لبطاقة أونو في الواجهة وشاشة البدء
  الترتيب يُستنتج: الطوليّ ظهرٌ، وأحمر الدائريّين زرّ، والآخر ميدالية — أو صراحةً: --order back,btn,medal (بترتيب القراءة في اللوحة)
  الامتدادات png/jpg/jpeg/webp كلّها مقبولة.
  python3 tools/build-uno-art.py           ← يضمّن ما وجده ويطبع تقريرًا، ومعاينةً في art/uno/_slices.png
  python3 tools/build-uno-art.py --dry     ← يحسب الأحجام دون كتابة
  (--game PATH لملفٍّ آخر، --src DIR لمجلّدٍ آخر)
بعدها: node tools/splash-total.cjs"""
import base64, io, os, re, sys
from PIL import Image
HERE=os.path.dirname(os.path.abspath(__file__))
ROOT=os.path.dirname(HERE) if os.path.basename(HERE)=='tools' else '/home/user/almshani'
for d in (HERE,os.path.join(ROOT,'tools')):
    if d not in sys.path:sys.path.insert(0,d)
from _keyslice import keyout, components, grid_order, crop, preview
import numpy as np
def arg(name,default=None):
    if name in sys.argv:
        i=sys.argv.index(name)
        if i+1<len(sys.argv):return sys.argv[i+1]
    return default
SRC=arg('--src',os.path.join(ROOT,'art','uno'));GAME=arg('--game',os.path.join(ROOT,'tahaddi','index.html'))
EXT=('.png','.jpg','.jpeg','.webp')
def find(name):
    for e in EXT:
        p=os.path.join(SRC,name+e)
        if os.path.exists(p):return p
def webp(im,q,alpha=False):
    b=io.BytesIO()
    if alpha:im.save(b,'WEBP',quality=q,method=6,exact=True)
    else:im.convert('RGB').save(b,'WEBP',quality=q,method=6)
    d=b.getvalue();return 'data:image/webp;base64,'+base64.b64encode(d).decode(),len(d)
def cover(im,w,h):
    im=im.convert('RGB');r=max(w/im.width,h/im.height);im=im.resize((round(im.width*r),round(im.height*r)),Image.LANCZOS)
    x=(im.width-w)//2;y=(im.height-h)//2;return im.crop((x,y,x+w,y+h))
def fit(im,w,h):
    """داخل مربّعٍ w×h بلا تشويه، والمتبقّي شفّاف"""
    im=im.convert('RGBA');bb=im.getchannel('A').point(lambda a:255 if a>24 else 0).getbbox()
    if bb:im=im.crop(bb)
    r=min(w/im.width,h/im.height);im=im.resize((max(1,round(im.width*r)),max(1,round(im.height*r))),Image.LANCZOS)
    out=Image.new('RGBA',(w,h),(0,0,0,0));out.paste(im,((w-im.width)//2,(h-im.height)//2),im);return out
def redness(tile):
    a=np.asarray(tile.convert('RGBA')).astype(int);m=a[...,3]>128
    if not m.any():return 0
    r,g,b=a[...,0][m],a[...,1][m],a[...,2][m];return float(((r-np.maximum(g,b))>60).mean())
def main():
    dry='--dry' in sys.argv;s=open(GAME,encoding='utf-8').read()
    m=re.search(r"/\*UNOART-BEGIN\*/const UNO_ART=\{.*?\};/\*UNOART-END\*/",s,re.S)
    if not m:sys.exit('لم أجد خانات UNO_ART في %s — طبّق p696/uno3d.py أوّلًا'%GAME)
    cur=dict(re.findall(r"(bg|back|btn|medal|hero):(null|'[^']*')",m.group(0)))
    val={k:(None if v=='null' else v[1:-1]) for k,v in cur.items()};rep=[];total=0
    fm=re.search(r"fronts:(null|\[[^\]]*\])",m.group(0));val['fronts']=None if not fm or fm.group(1)=='null' else re.findall(r"'([^']*)'",fm.group(1))
    p=find('fronts')
    if p:
        rgba=keyout(Image.open(p));boxes=components(rgba[...,3],min_px=2500)
        boxes=sorted(sorted(boxes,key=lambda b:-(b[2]-b[0])*(b[3]-b[1]))[:5],key=lambda b:b[1])   # أكبر خمسة، من اليسار إلى اليمين
        if len(boxes)!=5:sys.exit('fronts: وجدتُ %d وجوهٍ — المطلوب خمسة في صفٍّ واحد على أرجوانيٍّ صافٍ'%len(boxes))
        us=[];tiles=[crop(rgba,b,pad=0) for b in boxes]
        for t in tiles:u,n=webp(fit(t,256,374),86,alpha=True);us.append(u);total+=n
        val['fronts']=us;rep.append('fronts→5 وجوه %dKB'%(sum(len(u) for u in us)*3//4//1024))
        try:preview([fit(t,128,187) for t in tiles],os.path.join(SRC,'_fronts.png'),cols=5)
        except Exception:pass
    hero_u=None;p=find('hero')
    if p:hero_u,n=webp(cover(Image.open(p),720,720),80);val['hero']=hero_u;total+=n;rep.append('hero→hero+ui_mode_uno %dKB'%(n//1024))
    p=find('scene')
    if p:u,n=webp(cover(Image.open(p),720,1280),76);val['bg']=u;total+=n;rep.append('scene→bg %dKB'%(n//1024))
    p=find('sheet')
    if p:
        rgba=keyout(Image.open(p));boxes=grid_order(components(rgba[...,3],min_px=2500))
        tiles=[crop(rgba,b,pad=2) for b in boxes]
        if len(tiles)<3:sys.exit('اللوحة فيها %d عنصرًا — المطلوب ثلاثة (ظهر، زرّ، ميدالية) على أرجوانيٍّ صافٍ'%len(tiles))
        order=arg('--order')
        if order:
            names=order.split(',')
            if len(names)!=len(tiles):sys.exit('--order فيه %d أسماء واللوحة فيها %d عناصر'%(len(names),len(tiles)))
            pick={n:t for n,t in zip(names,tiles)}
        else:
            if len(tiles)>3:tiles=sorted(tiles,key=lambda t:-t.width*t.height)[:3]   # أكبر ثلاثة: فتاتُ القصّ لا يُحسب
            asp=[t.height/t.width for t in tiles];bi=max(range(3),key=lambda i:asp[i])
            if asp[bi]<1.2:sys.exit('لا عنصر طوليّ يصلح ظهرًا للبطاقة — حدّد الترتيب بـ --order')
            rest=[i for i in range(3) if i!=bi];rest.sort(key=lambda i:-redness(tiles[i]))
            pick={'back':tiles[bi],'btn':tiles[rest[0]],'medal':tiles[rest[1]]}
        for k,(w,h,q) in {'back':(256,374,88),'btn':(256,256,88),'medal':(128,128,90)}.items():
            if k in pick:
                u,n=webp(fit(pick[k],w,h),q,alpha=True);val[k]=u;total+=n;rep.append('sheet→%s %dKB'%(k,n//1024))
        try:
            preview([fit(pick[k],128,187 if k=='back' else 128) for k in ('back','btn','medal') if k in pick],os.path.join(SRC,'_slices.png'),cols=3)
            rep.append('معاينة: %s'%os.path.join(SRC,'_slices.png'))
        except Exception as e:rep.append('المعاينة تعذّرت: %s'%e)
    if not rep:sys.exit('لا صور في %s — ضع scene / sheet / fronts / hero ثمّ أعد التشغيل'%SRC)
    one=lambda k:"%s:%s"%(k,("'%s'"%val.get(k)) if val.get(k) else 'null')
    fr="fronts:"+("[%s]"%','.join("'%s'"%u for u in val['fronts']) if val.get('fronts') else 'null')
    body="/*UNOART-BEGIN*/const UNO_ART={%s};/*UNOART-END*/"%','.join([one('bg'),one('back'),one('btn'),one('medal'),fr,one('hero')])
    s2=s[:m.start()]+body+s[m.end():]
    if hero_u:   # بطاقة أونو في الواجهة (REAL_ART.ui_mode_uno) — كما يفعل build-keyart.py
        pat=re.compile(r"(\n ?ui_mode_uno:')data:image/\w+;base64,[A-Za-z0-9+/=]+(')")
        if pat.search(s2):s2=pat.sub(lambda mm:mm.group(1)+hero_u+mm.group(2),s2,count=1)
        else:
            i=s2.index('const REAL_ART={')+len('const REAL_ART={');s2=s2[:i]+"\n ui_mode_uno:'%s',"%hero_u+s2[i:]
    print(' · '.join(rep));print('المجموع المضمّن %.0f ك.ب'%(total/1024))
    if dry or s2==s:print('(لم يُكتب شيء)' if dry else '(لا تغيير)');return
    open(GAME,'w',encoding='utf-8').write(s2);print('✓ كُتب %s — شغّل الآن: node tools/splash-total.cjs'%GAME)
if __name__=='__main__':main()
