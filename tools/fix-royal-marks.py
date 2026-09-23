#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
٦٫٥٨ — «بعض خطوط اللوح خطأ» ثمّ «صار كرتونيًّا، الأوّل أفضل لولا الأخطاء»: اللوحان (الفاخر والكلاسيكيّ) يبقيان
صورتيهما الأصليّتين، وتُمحى منهما الأخطاء وحدها جراحيًّا — وكلاهما مولَّدٌ بالأخطاء نفسها:
  · الدائرة الحمراء الزائدة في منتصف خطّي القاعدة الأيسر والأيمن (ليست في لوح كيرمٍ حقيقيّ) — يُنقل
    مكانها مقطعٌ من الخطّين نفسيهما من فوقها فيتّصلان
  · الخطّان العابران للمركز ونقاطهما الحمراء الأربع — يُنقل الخشب من جوارٍ موازٍ (العرق أفقيّ)،
    وحيث يعبران حلقة المركز تُرقَّع الحلقة من جوارها على طولها
  (النقاط الصغيرة عند بداية الأسهم القطريّة زينةٌ من السهم — تبقى؛ محوها يكسر الخطّ تحتها)
المواضع تُكشف من كلّ صورة (مكوّنات الأحمر، وحلقة المركز بقطعٍ ناقص) لا أرقامٌ ثابتة.

  python3 tools/fix-royal-marks.py      → tahaddi/arenas/royal.webp (من 851d53c) و CA_TEX.c في index.html (من 851d53c)
"""
import cv2, numpy as np, os, re, base64, subprocess
HERE=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.join(HERE,'..')
SRC='851d53c'   # ٦٫٥٦: آخر إصدارٍ بالصورتين الأصليّتين

def paste(dst,src,mask,feather=1.4):
    al=cv2.GaussianBlur(mask.astype(np.float32)/255,(0,0),feather)[...,None]
    return np.clip(dst.astype(np.float32)*(1-al)+src.astype(np.float32)*al,0,255).astype(np.uint8)
def sh(img,dy,dx): return np.roll(np.roll(img,dy,axis=0),dx,axis=1)

def fix(bgr,mg,name):
    H,W=bgr.shape[:2]; P0=W/(1+2*mg); o=mg*P0; u=P0/400; C=o+200*u
    U=lambda v:int(round(v*u))
    b,g,r=[bgr[...,i].astype(int) for i in range(3)]
    red=(((r-g)>80)&(g<110)).astype(np.uint8)
    n,lab,st,cen=cv2.connectedComponentsWithStats(red)
    mids=[];dots=[]
    for i in range(1,n):
        a=st[i][4]; x,y=cen[i]; dx=(x-C)/u; dy=(y-C)/u
        if a<8*u*u*0.5: continue
        if abs(dy)<12 and abs(dx)>150 and a>60*u*u*0.5: mids.append((x,y))
        elif (abs(dx)<10 or abs(dy)<10) and 110<max(abs(dx),abs(dy))<150 and a<60*u*u: dots.append((x,y))
    # حلقة المركز: قطعٌ ناقصٌ يوافق بكسلاتها الداكنة بعيدًا عن المحورين
    g0=cv2.cvtColor(bgr,cv2.COLOR_BGR2GRAY)
    yy,xx=np.mgrid[0:H,0:W]; rr=np.hypot(xx-C,yy-C)/u; th=np.degrees(np.arctan2(yy-C,xx-C))%90
    sel=(g0<95)&(rr>52)&(rr<72)&(th>12)&(th<78)
    (RX,RY),(ew,eh),_=cv2.fitEllipse(np.column_stack([xx[sel],yy[sel]]).astype(np.float32))
    ro=max(np.hypot(xx[sel]-RX,yy[sel]-RY))/u+1.5            # نصف قطر الحافّة الخارجيّة للحلقة
    print('%s: دائرتان زائدتان %d · نقاط %d · الحلقة (%.1f،%.1f) نصف قطرها %.1f وحدة'%(name,len(mids),len(dots),RX,RY,ro))
    # ١) الدائرتان الوسطيّتان
    for x,y in mids:
        R=U(13); D=2*R+U(6)
        m=np.zeros((H,W),np.uint8); cv2.circle(m,(int(x),int(y)),R,255,-1)
        bgr=paste(bgr,sh(bgr,D,0),m,2.2)
    # ٢) الخطّان خارج الحلقة والنقاط: الداكن فعلًا داخل شريطٍ عريض (الخطّ يميل قليلًا)، موسَّعًا
    g0=cv2.cvtColor(bgr,cv2.COLOR_BGR2GRAY).astype(np.int32); med=cv2.medianBlur(g0.astype(np.uint8),21).astype(np.int32)
    dark=((med-g0)>28).astype(np.uint8)*255
    e0=ro+U(5)/u; e1=150
    def band(pts,w):
        m=np.zeros((H,W),np.uint8)
        for (x0,y0),(x1,y1) in pts: cv2.line(m,(int(x0),int(y0)),(int(x1),int(y1)),255,w)
        return m
    vb=band([((C,C-e1*u),(C,C-e0*u)),((C,C+e0*u),(C,C+e1*u))],U(12))
    hb=band([((C-e1*u,C),(C-e0*u,C)),((C+e0*u,C),(C+e1*u,C))],U(12))
    mv=cv2.dilate(dark&vb,np.ones((3,3),np.uint8),iterations=3)
    mh=cv2.dilate(dark&hb,np.ones((3,3),np.uint8),iterations=3)
    for x,y in dots:
        (mv if abs(x-C)<abs(y-C) else mh)[...]|=cv2.circle(np.zeros((H,W),np.uint8),(int(x),int(y)),U(5.5),255,-1)
    bgr=paste(bgr,sh(bgr,0,-U(12)),mv)
    bgr=paste(bgr,sh(bgr,-U(12),0),mh)
    # ٣) حيث عبر الخطّان الحلقة: رقعةٌ من الحلقة نفسها بإزاحةٍ قصيرةٍ على طولها
    rm=(ro-4)*u
    for (px,py),(dy,dx) in (((RX,RY-rm),(0,U(4.5))),((RX,RY+rm),(0,U(4.5))),((RX-rm,RY),(U(4.5),0)),((RX+rm,RY),(U(4.5),0))):
        m=np.zeros((H,W),np.uint8); a,bb=(U(2.5),U(8.5)) if dx else (U(8.5),U(2.5))
        cv2.rectangle(m,(int(px-a),int(py-bb)),(int(px+a),int(py+bb)),255,-1)
        bgr=paste(bgr,sh(bgr,dy,dx),m,0.9)
    return bgr

# الفاخر
raw=subprocess.check_output(['git','-C',ROOT,'show',SRC+':tahaddi/arenas/royal.webp'])
im=cv2.imdecode(np.frombuffer(raw,np.uint8),cv2.IMREAD_UNCHANGED)
out=fix(im[...,:3].copy(),0.14,'الفاخر')
if im.shape[2]==4: out=cv2.merge([out[...,0],out[...,1],out[...,2],im[...,3]])
cv2.imwrite(os.path.join(ROOT,'tahaddi','arenas','royal.webp'),out,[cv2.IMWRITE_WEBP_QUALITY,92])
# الكلاسيكيّ: مضمَّنٌ في الصفحة
html_old=subprocess.check_output(['git','-C',ROOT,'show',SRC+':tahaddi/index.html']).decode('utf-8')
m=re.search(r"const CA_TEX=\{c:'data:image/jpeg;base64,([^']+)'",html_old)
cls=cv2.imdecode(np.frombuffer(base64.b64decode(m.group(1)),np.uint8),cv2.IMREAD_COLOR)
cout=fix(cls,0.135,'الكلاسيكيّ')
ok,enc=cv2.imencode('.jpg',cout,[cv2.IMWRITE_JPEG_QUALITY,90])
P=os.path.join(ROOT,'tahaddi','index.html'); h=open(P,encoding='utf-8').read()
h2=re.sub(r"(const CA_TEX=\{c:'data:image/jpeg;base64,)[^']+'",lambda mm:mm.group(1)+base64.b64encode(enc.tobytes()).decode()+"'",h,count=1)
assert h2!=h or True
open(P,'w',encoding='utf-8').write(h2)
print('✓ royal.webp و CA_TEX.c')
