#!/usr/bin/env python3
"""ينزّل صور OpenArt المذكورة في art-src/**/openart.json ويجهّزها للّعبة في art-src/out/<name>.webp

يُشغَّل في GitHub Actions (.github/workflows/art-fetch.yml) لأنّ جلسة العمل لا تصل إلى cdn.openart.ai.
لكلّ عنصر «kind»:
  disc  قرصٌ منظورٌ من فوق: يُقصّ دائرةً شفّافة الحواف بحجم size (الجيس والقطع)
  key   خلفيّةٌ خضراء (كروما) تُزال ويُقصّ الشكل على حدوده (الصناديق والأيقونات)
  tex   خامةٌ تملأ الإطار: تُصغَّر إلى size (سطح اللوح وخشب الإطار)
  bg    خلفيّة شاشة: تُصغَّر عرضًا إلى size وتُضغط
والعنصر الذي له ملفّ جاهز لا يُعاد إلّا إذا تغيّر رابطه (يُحفظ الرابط في out/manifest.json)."""
import json, glob, os, io, urllib.request
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
ROOT=os.path.dirname(os.path.abspath(__file__)); OUT=os.path.join(ROOT,'out'); os.makedirs(OUT,exist_ok=True)
MF=os.path.join(OUT,'manifest.json'); done=json.load(open(MF)) if os.path.exists(MF) else {}

def fetch(u):
    req=urllib.request.Request(u,headers={'User-Agent':'tahaddi-art/1'})
    with urllib.request.urlopen(req,timeout=120) as r: return Image.open(io.BytesIO(r.read())).convert('RGB')

def despill(a):
    r,g,b=a[...,0],a[...,1],a[...,2]; gx=g-np.maximum(r,b)
    return gx, np.where(gx>0,np.maximum(r,b)+np.clip(gx,0,None)*.15,g)

def disc(im,size):
    a=np.asarray(im).astype(float); H,W,_=a.shape
    corner=np.median(np.concatenate([a[:24,:24].reshape(-1,3),a[:24,-24:].reshape(-1,3),a[-24:,:24].reshape(-1,3),a[-24:,-24:].reshape(-1,3)]),axis=0)
    m=np.abs(a-corner).sum(axis=2)>70
    ys,xs=np.nonzero(m); cx,cy=xs.mean(),ys.mean()
    r=np.percentile(np.sqrt((xs-cx)**2+(ys-cy)**2),99.3)*.99
    gx,g2=despill(a); a[...,1]=np.where(corner[1]>corner[0]+60,g2,a[...,1])   # على الخلفيّة الخضراء فقط
    im=Image.fromarray(a.clip(0,255).astype(np.uint8))
    crop=im.crop((int(cx-r),int(cy-r),int(cx+r),int(cy+r))).resize((size*4,size*4),Image.LANCZOS)
    mask=Image.new('L',crop.size,0); ImageDraw.Draw(mask).ellipse((2,2,size*4-3,size*4-3),fill=255)
    crop.putalpha(mask.filter(ImageFilter.GaussianBlur(2)))
    return crop.resize((size,size),Image.LANCZOS)

def key(im,size):
    a=np.asarray(im).astype(float); gx,g2=despill(a)
    alpha=np.clip(1-(gx-40)/80,0,1)
    rgba=np.dstack([a[...,0],g2,a[...,2],alpha*255]).clip(0,255).astype(np.uint8)
    im=Image.fromarray(rgba,'RGBA'); bb=im.getchannel('A').point(lambda v:255 if v>20 else 0).getbbox(); im=im.crop(bb)
    w,h=im.size; s=max(w,h); c=Image.new('RGBA',(s,s),(0,0,0,0)); c.paste(im,((s-w)//2,(s-h)//2))
    return c.resize((size,size),Image.LANCZOS)

def tex(im,size): return im.resize((size,size),Image.LANCZOS)
def bg(im,size):
    w,h=im.size; return im.resize((size,round(h*size/w)),Image.LANCZOS)

FN={'disc':disc,'key':key,'tex':tex,'bg':bg}
changed=0
for mfile in sorted(glob.glob(os.path.join(ROOT,'**','openart.json'),recursive=True)):
    d=json.load(open(mfile,encoding='utf-8')); prefix=d.get('prefix','')
    for k,it in d['items'].items():
        u=it.get('url'); kind=it.get('kind',d.get('kind','disc')); size=int(it.get('size',d.get('size',256)))
        if not u: continue
        name=prefix+k; out=os.path.join(OUT,name+'.webp')
        if done.get(name)==u+'|'+kind+'|'+str(size) and os.path.exists(out): continue
        try:
            res=FN[kind](fetch(u),size)
            res.save(out,'WEBP',quality=int(it.get('q',d.get('q',86))),method=6)
            done[name]=u+'|'+kind+'|'+str(size); changed+=1
            print('✓',name,kind,size,os.path.getsize(out)//1024,'KB')
        except Exception as e:
            print('✗',name,e)
json.dump(done,open(MF,'w'),indent=1,ensure_ascii=False)
print('changed',changed)
