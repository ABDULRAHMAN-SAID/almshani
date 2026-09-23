#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
٦٫٥٧ — «بعض خطوط اللوح خطأ»: خطوط اللوح الفاخر كانت من صورةٍ مولَّدة، فيها ما ليس في لوح كيرمٍ حقيقيّ
(دائرةٌ حمراء في منتصف خطّي القاعدة الجانبيّين، خطّان يعبران المركز بنقاطٍ حمراء، أسهمٌ وأقواسٌ غير
متناظرة). مسحُها من الصورة يترك أشباحها (جرّبناه)، فيُستبدل سطح اللعب كلّه بخشبٍ مولَّدٍ بلون الخشب
الأصليّ وعرقه، والعلامات الصحيحة ترسمها اللعبة برمجيًّا (caMarks) بمقاساتٍ متناظرة تمامًا.
الإطار والزوايا خارج مربّع الجيوب تبقى كما هي (وتغطّيها عوارض caRails في اللعبة أصلًا).

  python3 tools/build-carrom-royal.py && python3 tools/clean-royal-lines.py   → tahaddi/arenas/royal.webp
  (أو --from-git REV لقراءة الصورة من إيداعٍ سابق بدل الملفّ الحاليّ؛ الإطار يُؤخذ منها، والسطح يُولَّد بالبذرة نفسها)
"""
import cv2, numpy as np, os, sys, subprocess
HERE=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.join(HERE,'..')
OUT=os.path.join(ROOT,'tahaddi','arenas','royal.webp')
if '--from-git' in sys.argv:
    rev=sys.argv[sys.argv.index('--from-git')+1]
    raw=subprocess.check_output(['git','-C',ROOT,'show',rev+':tahaddi/arenas/royal.webp'])
    im=cv2.imdecode(np.frombuffer(raw,np.uint8),cv2.IMREAD_UNCHANGED)
else:
    im=cv2.imread(OUT,cv2.IMREAD_UNCHANGED)   # ناتج build-carrom-royal.py (والسطح المولَّد يُستبدل كلّه — فالتشغيل مرّتين آمن)
N=im.shape[0]; P0=N/1.28; o=0.14*P0
a0=int(round(o))-6; a1=int(round(o+P0))+6; S=a1-a0
# لون الخشب الأصليّ: وسطٌ وتباينٌ من منطقةٍ خالية بين الأقواس والقاعدة
lab=cv2.cvtColor(im[...,:3],cv2.COLOR_BGR2LAB).astype(np.float32)
g=cv2.cvtColor(im[...,:3],cv2.COLOR_BGR2GRAY)
play=lab[a0+40:a1-40,a0+40:a1-40].reshape(-1,3); gp=g[a0+40:a1-40,a0+40:a1-40].reshape(-1)
wood=play[gp>140]; mu=wood.mean(0); sd=wood.std(0)
rng=np.random.default_rng(657)
def noise(h,w,sy,sx):
    n=rng.standard_normal((h,w)).astype(np.float32)
    n=cv2.GaussianBlur(n,(0,0),sigmaX=sx,sigmaY=sy)
    return (n-n.mean())/(n.std()+1e-6)
yy,xx=np.mgrid[0:S,0:S].astype(np.float32)
warp=noise(S,S,90,90)*22+noise(S,S,30,60)*6          # العرق يتموّج على طول اللوح
v=yy+warp
rings=np.sin(v*0.075+noise(S,S,120,120)*1.6)          # حلقات النموّ: تموّجٌ لونيّ عريض
streak=noise(S,S,0.8,26)                               # الألياف: خيوطٌ قصيرةٌ رفيعة على طول العرق
blot=noise(S,S,70,70)                                  # بقعٌ لونيّة واسعة خفيفة
# خطوط العرق نفسها: خيوطٌ داكنةٌ رفيعةٌ متموّجة كثافتها تتغيّر — ما يجعل السطح خشبًا لا معدنًا مصقولًا
ph=v*0.21+noise(S,S,40,160)*2.2
fr=np.abs(((ph/(2*np.pi))%1.0)-0.5)*2                   # ٠ عند الخطّ
lines=np.clip(1-fr/0.10,0,1)**1.6*(0.55+0.45*np.clip(noise(S,S,20,140),-1,1))
fine=noise(S,S,0.7,3)
L=mu[0]+sd[0]*(0.30*rings+0.22*streak+0.40*blot+0.10*fine)*0.9-lines*sd[0]*1.25
A=mu[1]+sd[1]*0.5*(0.4*rings+0.6*blot)+lines*2.2
B=mu[2]+sd[2]*0.5*(0.3*rings+0.7*blot)+lines*1.2
# إضاءةٌ خفيفة من أعلى اليسار كما في الصورة
L+= ( (S-xx)+(S-yy) )/(2*S)*6-3
lab2=np.dstack([L,A,B]).clip(0,255).astype(np.uint8)
surf=cv2.cvtColor(lab2,cv2.COLOR_LAB2BGR)
out=im.copy()
out[a0:a1,a0:a1,:3]=surf
if out.shape[2]==4: out[a0:a1,a0:a1,3]=255
cv2.imwrite(OUT,out,[cv2.IMWRITE_WEBP_QUALITY,90])
print('✓ %s — سطحٌ جديد %dpx · لون الخشب L=%.0f a=%.0f b=%.0f'%(OUT,S,mu[0],mu[1],mu[2]))
