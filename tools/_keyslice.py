# -*- coding: utf-8 -*-
"""وحدة مشتركة: إزالة خلفيّة الأرجوانيّ (#FF00FF) من لوحات OpenArt إلى شفافيّة، واكتشاف العناصر وترتيبها شبكيًّا.
تستعملها tools/build-avatars.py و tools/slice-uikit.py"""
import numpy as np
from PIL import Image
try:
    from scipy import ndimage as _nd
except Exception:  # pragma: no cover
    _nd=None
KEY=np.array([255,0,255],dtype=np.int16)
def keyout(im,tol=60):
    """صورة → مصفوفة RGBA: الأرجوانيّ الصافي شفّاف، حافّةٌ ناعمة، وإزالة انعكاس الأرجوانيّ من الحوافّ"""
    a=np.asarray(im.convert('RGB')).astype(np.int16)
    d=np.abs(a-KEY).sum(axis=2)
    soft=np.clip((d-tol)/(tol*1.5),0,1);alpha=(soft*255).astype(np.uint8);alpha[d<tol]=0
    rgba=np.dstack([a.astype(np.uint8),alpha])
    r,g,b=rgba[...,0].astype(int),rgba[...,1].astype(int),rgba[...,2].astype(int)
    spill=(r-g>70)&(b-g>70)&(alpha>0)&(alpha<255)
    rgba[...,1][spill]=((r[spill]+b[spill])//2).clip(0,255).astype(np.uint8)
    return rgba
def components(alpha,min_px=400,thresh=40,gap=14):
    """مكوّنات متّصلة فوق عتبة الشفافيّة → صناديق (y0,x0,y1,x1,px)، مع دمج المتجاورة"""
    mask=alpha>thresh
    if _nd is not None:
        lab,n=_nd.label(mask);boxes=[]
        for i,sl in enumerate(_nd.find_objects(lab),1):
            if sl is None:continue
            px=int((lab[sl]==i).sum())
            if px<min_px:continue
            boxes.append([sl[0].start,sl[1].start,sl[0].stop-1,sl[1].stop-1,px])
    else:
        H,W=mask.shape;f=4;small=mask[::f,::f];lab=np.zeros(small.shape,np.int32);n=0;boxes=[]
        from collections import deque
        for y in range(small.shape[0]):
            for x in range(small.shape[1]):
                if small[y,x] and not lab[y,x]:
                    n+=1;q=deque([(y,x)]);lab[y,x]=n;ys=[y];xs=[x]
                    while q:
                        cy,cx=q.popleft()
                        for ny,nx in ((cy-1,cx),(cy+1,cx),(cy,cx-1),(cy,cx+1)):
                            if 0<=ny<small.shape[0] and 0<=nx<small.shape[1] and small[ny,nx] and not lab[ny,nx]:lab[ny,nx]=n;q.append((ny,nx));ys.append(ny);xs.append(nx)
                    if len(ys)*f*f>=min_px:boxes.append([min(ys)*f,min(xs)*f,min(H-1,max(ys)*f+f),min(W-1,max(xs)*f+f),len(ys)*f*f])
    def near(a,b):return not(a[3]+gap<b[1] or b[3]+gap<a[1] or a[2]+gap<b[0] or b[2]+gap<a[0])
    merged=True
    while merged:
        merged=False
        for i in range(len(boxes)):
            for j in range(i+1,len(boxes)):
                if near(boxes[i],boxes[j]):
                    a,b=boxes[i],boxes[j];boxes[i]=[min(a[0],b[0]),min(a[1],b[1]),max(a[2],b[2]),max(a[3],b[3]),a[4]+b[4]];boxes.pop(j);merged=True;break
            if merged:break
    return boxes
def grid_order(boxes):
    """ترتيب قراءةٍ شبكيّ: صفوفٌ بحسب مركز y (فجوة > نصف الارتفاع الوسيط)، ثمّ من اليسار إلى اليمين"""
    if not boxes:return boxes
    hs=sorted(b[2]-b[0] for b in boxes);med=hs[len(hs)//2] or 1
    bs=sorted(boxes,key=lambda b:(b[0]+b[2])/2);rows=[[bs[0]]]
    for b in bs[1:]:
        cy=(b[0]+b[2])/2;ry=sum((x[0]+x[2])/2 for x in rows[-1])/len(rows[-1])
        if abs(cy-ry)<med*.5:rows[-1].append(b)
        else:rows.append([b])
    out=[]
    for r in rows:out+=sorted(r,key=lambda b:b[1])
    return out
def crop(rgba,box,pad=6):
    y0,x0,y1,x1=box[:4];H,W=rgba.shape[:2]
    return Image.fromarray(rgba[max(0,y0-pad):min(H,y1+pad+1),max(0,x0-pad):min(W,x1+pad+1)])
def preview(tiles,path,cols=4,bg=(11,21,48,255)):
    if not tiles:return
    tw=max(t.width for t in tiles);th=max(t.height for t in tiles);rows=(len(tiles)+cols-1)//cols
    sh=Image.new('RGBA',(cols*(tw+10),rows*(th+10)),bg)
    for i,t in enumerate(tiles):
        r,c=divmod(i,cols);sh.paste(t,(c*(tw+10)+5,r*(th+10)+5),t)
    sh.save(path)
