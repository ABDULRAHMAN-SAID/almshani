# يقصّ القرص من صورة على خلفيّة سوداء: يجد الدائرة من القناع، ثمّ يقصّها دائرةً شفّافة الحواف بحجمٍ ثابت
import sys, numpy as np
from PIL import Image, ImageDraw, ImageFilter
src,out,size=sys.argv[1],sys.argv[2],int(sys.argv[3]) if len(sys.argv)>3 else 256
im=Image.open(src).convert('RGB');a=np.asarray(im).astype(int)
lum=a.max(axis=2);H,W=lum.shape
# خلفيّة: ألوان قريبة من لون الزوايا
corner=np.median(np.concatenate([a[:20,:20].reshape(-1,3),a[:20,-20:].reshape(-1,3),a[-20:,:20].reshape(-1,3),a[-20:,-20:].reshape(-1,3)]),axis=0)
d=np.abs(a-corner).sum(axis=2)
m=d>60
ys,xs=np.nonzero(m)
# المركز ونصف القطر من المساحة (أثبت من الحدود مع لمعة أو شعاع شارد)
cx,cy=xs.mean(),ys.mean();r=np.sqrt(m.sum()/np.pi)
# تحسين: نصف القطر = الشريحة 99٫5 من المسافات
dist=np.sqrt((xs-cx)**2+(ys-cy)**2);r=np.percentile(dist,99.3)
print(f'center {cx:.0f},{cy:.0f} r {r:.0f} of {W}x{H}',file=sys.stderr)
r*=0.995
box=(cx-r,cy-r,cx+r,cy+r)
crop=im.crop(tuple(int(round(v)) for v in box)).resize((size*4,size*4),Image.LANCZOS)
mask=Image.new('L',(size*4,size*4),0);ImageDraw.Draw(mask).ellipse((2,2,size*4-3,size*4-3),fill=255)
mask=mask.filter(ImageFilter.GaussianBlur(2))
crop.putalpha(mask);crop=crop.resize((size,size),Image.LANCZOS)
crop.save(out,optimize=True)
