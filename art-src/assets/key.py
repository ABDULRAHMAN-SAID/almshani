# يزيل الخلفيّة الخضراء (كروما) ويقصّ الصورة على حدودها ثمّ يصغّرها: python3 key.py in.png out.png 320
import sys, numpy as np
from PIL import Image
src,out,size=sys.argv[1],sys.argv[2],int(sys.argv[3]) if len(sys.argv)>3 else 320
a=np.asarray(Image.open(src).convert('RGB')).astype(float);r,g,b=a[...,0],a[...,1],a[...,2]
# قدر «الخضرة»: الأخضر فوق أعلى القناتين الأخريين
gx=g-np.maximum(r,b)
alpha=np.clip(1-(gx-40)/80,0,1)            # ≤40 معتم، ≥120 شفّاف
# إزالة انسكاب الأخضر على الحواف
g2=np.where(gx>0,np.maximum(r,b)+np.clip(gx,0,None)*0.15,g)
rgba=np.dstack([r,g2,b,alpha*255]).clip(0,255).astype(np.uint8)
im=Image.fromarray(rgba,'RGBA');bb=im.getchannel('A').point(lambda v:255 if v>20 else 0).getbbox()
im=im.crop(bb);w,h=im.size;s=max(w,h);c=Image.new('RGBA',(s,s),(0,0,0,0));c.paste(im,((s-w)//2,(s-h)//2))
c.resize((size,size),Image.LANCZOS).save(out,optimize=True)
