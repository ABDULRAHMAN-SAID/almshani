# -*- coding: utf-8 -*-
"""وحدة مشتركة: إزالة خلفيّة الأرجوانيّ (#FF00FF) من لوحات OpenArt إلى شفافيّة، واكتشاف العناصر وترتيبها شبكيًّا.
تستعملها tools/build-avatars.py و tools/slice-uikit.py (٦٫٩٦: وkeyout_matte للبورتريهات)"""
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
def keyout_matte(im,tol=45,band=3,spill=12,hole=120,tint=35):
    """٦٫٩٦ — قطعٌ أنظف للبورتريهات (tools/build-avatars.py): صورة → RGBA.  keyout() كما هي لبقيّة الأدوات.
    ١ الخلفيّة: ما قرب من لون الحافّة الوسيط (فرقٌ < tol) شفّاف — ومعه «الثقوب»: كلّ مكوّنٍ متّصل أرجوانيّته min(R,B)−G > hole
      وفيه نواةٌ ساطعةٌ صريحة (> hole+40 وR,B > 150): فراغٌ بين الأصابع أو خصل الشعر أو ذراع النظّارة مظلَّلٌ فلا يقع في tol.
      لكلّ ثقبٍ لونُ خلفيّته (وسيطه المظلَّل) لا لون الحافّة.
    ٢ الداخل الأبعد من band بكسلًا صلبٌ كما رُسم. شريط الحافّة: الألفا من أرجوانيّة البكسل مصحَّحةً بأرجوانيّة أقرب لونٍ داخليّ
      (الذهبيّ والبشرة سالبان — بدونها يُقدَّر الألفا زائدًا فتبقى هالةٌ وردية)، ثمّ يُنزع لون الخلفيّة المجاورة (unmix).
    ٣ الصبغة (tint): ما قرب من الخلفيّة (≤ band+spill) وكان مزيجًا صريحًا من لونٍ نظيفٍ مجاور والأرجوانيّ (بقيّةٌ < tint عن خطّ
      المزج) يُعاد إلى لونه — أطراف التاج والإطار الذهبيّ والبشرة. ما ليس مزيجًا (قماشٌ أرجوانيّ حقيقيّ، عدسةٌ بنفسجيّة) لا يُمسّ.
    ٤ ثمّ يُطفأ ما بقي من انعكاس الأرجوانيّ على بعد spill بكسلًا ويتلاشى إلى الداخل."""
    if _nd is None:raise RuntimeError('keyout_matte تحتاج scipy: pip install scipy')
    C=np.asarray(im.convert('RGB')).astype(np.float32);H,W=C.shape[:2]
    brd=np.concatenate([C[:8].reshape(-1,3),C[-8:].reshape(-1,3),C[:,:8].reshape(-1,3),C[:,-8:].reshape(-1,3)])
    Kc=np.median(brd,axis=0);bg0=np.abs(C-Kc).sum(2)<tol
    m=np.minimum(C[...,0],C[...,2])-C[...,1]
    Km=np.broadcast_to(Kc,C.shape).copy();bg=bg0.copy()
    if hole>0:
        lab,_=_nd.label((m>hole)&~bg0);core=(m>hole+40)&(np.minimum(C[...,0],C[...,2])>150)
        for j in np.unique(lab[core&(lab>0)]):
            s=lab==j;Km[s]=np.median(C[s],axis=0);bg|=s
    dist,(by,bx)=_nd.distance_transform_edt(~bg,return_indices=True)
    Kn=Km[by,bx];mK=np.maximum(1.0,np.minimum(Kn[...,0],Kn[...,2])-Kn[...,1])
    inner=(~bg)&(dist>band);edge=(~bg)&~inner
    _,(iy,ix)=_nd.distance_transform_edt(~inner,return_indices=True);mF=np.minimum(m[iy,ix],0)
    A=np.ones((H,W),np.float32);A[bg]=0;A[edge]=np.clip((mK-m)/np.maximum(1,mK-mF),0,1)[edge];A[A<.04]=0
    F=C.copy();sel=edge&(A>0);aa=A[sel][:,None];F[sel]=np.clip((C[sel]-(1-aa)*Kn[sel])/aa,0,255)
    if tint>0 and spill>0:
        clean=(~bg)&(dist>band+1)&(m<8);_,(ry,rx)=_nd.distance_transform_edt(~clean,return_indices=True)
        z=np.where((~bg)&(dist<=band+spill));Rc=C[ry[z],rx[z]];Kz=Kn[z];Fz=F[z];d=Kz-Rc
        s=((Fz-Rc)*d).sum(1)/np.maximum(1,(d*d).sum(1));res=np.sqrt(((Fz-(Rc+s[:,None]*d))**2).sum(1))
        s=(s*((s>.03)&(s<.9)&(res<tint))*np.clip(1.5-1.5*(dist[z]-band)/spill,0,1))[:,None]
        F[z]=np.where(s>0,np.clip((Fz-s*Kz)/np.maximum(.1,1-s),0,255),Fz)
    if spill>0:
        w=np.clip(1-(dist-band)/spill,0,1)*(~bg);red=np.clip(np.minimum(F[...,0],F[...,2])-F[...,1],0,None)*w
        F[...,0]-=red;F[...,2]-=red;F=np.clip(F,0,255)
    return np.dstack([F.astype(np.uint8),(A*255+.5).astype(np.uint8)])
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
