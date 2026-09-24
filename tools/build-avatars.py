# -*- coding: utf-8 -*-
"""٦٫٩٦ — الشخصيّات المرسومة: تقطيع لوحتَي البورتريهات المولَّدتين في OpenArt وتضمينهما في اللعبة.
  art/avatars/sheet-a.png  (٨ رجالٍ وفتيان: a1…a8)      art/avatars/sheet-b.png  (٨: نساءٌ وأطفال والأسطورة والشيخ: b1…b8)
  كلّ لوحةٍ شبكة ٤×٢ على خلفيّةٍ أرجوانيّة #FF00FF؛ تُزال الخلفيّة، تُكتشف البورتريهات وتُرتّب قراءةً (يسار→يمين، أعلى→أسفل)،
  ثمّ تُقصّ مربّعةً ٢٥٦×٢٥٦ webp بشفافيّة وتُكتب في AV_PIC_IMG بين /*AVPIC-BEGIN*/ و /*AVPIC-END*/.
  python3 tools/build-avatars.py [--dry] [--src art/avatars] [--game tahaddi/index.html] [--tol 60]
  ترتيبٌ يدويّ عند الحاجة: art/avatars/map.json  {"a1":"sheet-a-03.png", …} (أسماء القصاصات التي يطبعها البرنامج في art/avatars/cut/)"""
import base64, io, json, os, re, sys
from PIL import Image
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)));import _keyslice as K
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def arg(k,d):return sys.argv[sys.argv.index(k)+1] if k in sys.argv else d
SRC=os.path.join(ROOT,arg('--src','art/avatars'));GAME=os.path.join(ROOT,arg('--game','tahaddi/index.html'));TOL=int(arg('--tol',60));DRY='--dry' in sys.argv
CUT=os.path.join(SRC,'cut');os.makedirs(CUT,exist_ok=True)
def find(name):
    for e in ('.png','.jpg','.jpeg','.webp'):
        p=os.path.join(SRC,name+e)
        if os.path.exists(p):return p
def square(t,size=256):
    """مربّعٌ مثبَّت من الأعلى (الرأس)، متمركزٌ أفقيًّا، ثمّ تصغير"""
    s=max(t.width,t.height);c=Image.new('RGBA',(s,s),(0,0,0,0));c.paste(t,((s-t.width)//2,int(s*.03) if t.height<s else 0),t)
    return c.resize((size,size),Image.LANCZOS)
def uri(im,q=82):
    b=io.BytesIO();im.save(b,'WEBP',quality=q,method=6);d=b.getvalue();return 'data:image/webp;base64,'+base64.b64encode(d).decode(),len(d)
tiles={};report=[]
for sh in ('a','b'):
    p=find('sheet-'+sh)
    if not p:report.append('sheet-%s: غير موجودة'%sh);continue
    rgba=K.keyout(Image.open(p),TOL);boxes=K.grid_order(K.components(rgba[...,3],min_px=rgba.shape[0]*rgba.shape[1]//400))
    cuts=[K.crop(rgba,b,10) for b in boxes]
    for i,t in enumerate(cuts,1):t.save(os.path.join(CUT,'sheet-%s-%02d.png'%(sh,i)))
    K.preview(cuts,os.path.join(SRC,'_cut-%s.png'%sh))
    report.append('sheet-%s: %d قصاصة%s'%(sh,len(cuts),'' if len(cuts)==8 else ' ⚠ المتوقّع ٨ — راجع _cut-%s.png وعدّل --tol أو اكتب map.json'%sh))
    for i,t in enumerate(cuts[:8],1):tiles['%s%d'%(sh,i)]=t
mp=os.path.join(SRC,'map.json')
if os.path.exists(mp):
    for k,f in json.load(open(mp,encoding='utf-8')).items():tiles[k]=Image.open(os.path.join(CUT,f)).convert('RGBA')
    report.append('map.json: %d تعيينًا'%len(json.load(open(mp,encoding='utf-8'))))
if not tiles:sys.exit('\n'.join(report)+'\nضع sheet-a.png و sheet-b.png في art/avatars ثمّ أعد التشغيل')
sq={k:square(t) for k,t in tiles.items()};K.preview([sq[k] for k in sorted(sq)],os.path.join(SRC,'_avatars.png'),cols=8)
body='';total=0
for k in sorted(sq):u,n=uri(sq[k]);body+="%s:'%s',"%(k,u);total+=n
print(' · '.join(report));print('%d بورتريهًا، %.0f ك.ب مضمّنة'%(len(sq),total/1024))
s=open(GAME,encoding='utf-8').read()
assert s.count('/*AVPIC-BEGIN*/')==1 and s.count('/*AVPIC-END*/')==1,'لم أجد علامتَي AVPIC في اللعبة (طبّق مقطع الشخصيّات أوّلًا)'
s2=re.sub(r'/\*AVPIC-BEGIN\*/.*?/\*AVPIC-END\*/','/*AVPIC-BEGIN*/'+body.rstrip(',')+'/*AVPIC-END*/',s,count=1,flags=re.S)
if DRY:print('(تجربة — لم يُكتب شيء)');sys.exit()
open(GAME,'w',encoding='utf-8').write(s2);print('✓ كُتب في',os.path.relpath(GAME,ROOT),'— شغّل الآن: node tools/splash-total.cjs')
