#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
يؤلّف موسيقى القائمة **ملفَّ صوتٍ جاهزًا**، لا شيفرةً تُولّدها في الهاتف.

لماذا: كانت تُركَّب لحظيًّا بـWeb Audio داخل غلاف أندرويد — عشرات المذبذبات
والمرشّحات تعمل مع رسم اللعبة على معالجٍ واحد. وصاحب اللعبة يسمع تشوّهًا
وانقطاعًا مهما هُذِّب اللحن، وست محاولاتٍ لم تُصلحه: العلّة في **الطريقة**
لا في النغمات. فالملفّ الجاهز يمرّ على مسار الوسائط في النظام — وهو الذي
يشغّل كل مقطعٍ يسمعه على هاتفه — لا على خيطٍ يزاحمه الرسم.

  python3 tools/build-music.py            → tahaddi/audio/menu.wav

والتأليف هنا لا في المتصفّح: numpy تعطي تحكّمًا كاملًا ونتيجةً واحدة لا
تختلف بين جهازٍ وجهاز.
"""
import numpy as np, struct, os, sys
from scipy.signal import butter, sosfilt, fftconvolve

SR   = 32000          # يكفي لموسيقى ناعمة، ويقطع نصف حجم الملفّ
BARS = 4
BAR  = 6.0            # ثانيات — ٤٠ نبضة في الدقيقة تقريبًا: هادئ عن قصد
LOOP = BARS*BAR       # ٢٤ ثانية تدور بلا فاصل
TAIL = 3.0            # ذيلٌ يُطوى على البداية فلا تُسمع وصلة

def hz(n):
    S={'C':0,'D':2,'E':4,'F':5,'G':7,'A':9,'B':11}
    import re
    m=re.match(r'^([A-G])([b#]?)(-?\d)$',n)
    s=S[m.group(1)]+(1 if m.group(2)=='#' else -1 if m.group(2)=='b' else 0)+(int(m.group(3))+1)*12
    return 440.0*2**((s-69)/12.0)

N=int((LOOP+TAIL)*SR)
t=np.arange(N)/SR
L=np.zeros(N); R=np.zeros(N)

def put(buf,start,sig):
    i=int(start*SR); j=min(N,i+len(sig))
    if i<N: buf[i:j]+=sig[:j-i]

def env(n,a,d,s,r,sus):
    """غلافٌ ناعم: لا حافّة حادّة فلا نقرة"""
    e=np.zeros(n); A=int(a*SR); D=int(d*SR); Rl=int(r*SR)
    S=max(0,n-A-D-Rl)
    p=0
    if A: e[:A]=np.linspace(0,1,A)**1.6; p=A
    if D: e[p:p+D]=np.linspace(1,sus,D); p+=D
    if S: e[p:p+S]=sus; p+=S
    if Rl and p<n: e[p:]=np.linspace(e[p-1] if p else sus,0,n-p)**1.4
    return e

def pad(f,start,dur,g,pan=0.0):
    """وسادة: ثلاث توافقيّات مع انحرافٍ طفيف يعطي دفئًا ويمنع الجفاف"""
    n=int(dur*SR); x=np.arange(n)/SR
    vib=1+0.0022*np.sin(2*np.pi*0.23*x+f%3)
    w =np.sin(2*np.pi*f*vib*x)
    w+=0.42*np.sin(2*np.pi*f*1.002*x+0.7)
    w+=0.26*np.sin(2*np.pi*2*f*x+1.3)
    w+=0.11*np.sin(2*np.pi*3*f*x+2.1)
    w*=env(n,1.5,1.2,0.72,dur*0.42,0.72)*g
    put(L,start,w*(1-max(0,pan))); put(R,start,w*(1+min(0,pan)))

def bell(f,start,g,dur=3.2,pan=0.0):
    """نقرةٌ ناعمة: هجومٌ في ١٥ مللي ثانية — محسوسٌ لا قارع"""
    n=int(dur*SR); x=np.arange(n)/SR
    w =np.sin(2*np.pi*f*x)*np.exp(-x*1.05)
    w+=0.30*np.sin(2*np.pi*2.01*f*x)*np.exp(-x*1.9)
    w+=0.13*np.sin(2*np.pi*3.0*f*x)*np.exp(-x*3.0)
    w*=env(n,0.015,0.10,0.55,dur*0.8,0.55)*g
    put(L,start,w*(1-max(0,pan))); put(R,start,w*(1+min(0,pan)))

# ── القطعة: ري الصغرى، أربعة أوتار تتنفّس ──
CH=[['D4','F4','A4'],['Bb3','D4','F4'],['F4','A4','C5'],['A3','C#4','E4']]
MEL=[['A5','D5','F5'],['F5','D5','Bb4'],['C6','A5','F5'],['E5','C#5','A4']]
for i,(ch,mel) in enumerate(zip(CH,MEL)):
    b=i*BAR
    for k,nn in enumerate(ch):
        pad(hz(nn),b,BAR+2.2,0.16,pan=(-0.35,0.0,0.35)[k])
    for k,nn in enumerate(mel):
        bell(hz(nn),b+1.2+k*1.5,0.10-0.02*k,pan=(0.3,-0.25,0.15)[k])

# ── صدىً قصير معتم: يعطي مكانًا بلا هسيس ──
rl=int(1.1*SR); rt=np.arange(rl)/SR
imp=np.random.RandomState(7).randn(rl)*np.exp(-rt*5.2)
sos_d=butter(2,2200/(SR/2),btype='low',output='sos')
imp=sosfilt(sos_d,imp); imp/=np.max(np.abs(imp))
for buf in (L,R):
    wet=fftconvolve(buf,imp)[:N]
    buf*=1.0; buf+=0.20*wet/max(1e-9,np.max(np.abs(wet)))*np.max(np.abs(buf))

# ── الطيّ: الذيل يُضاف إلى البداية فتدور بلا وصلة ──
nl=int(LOOP*SR); tl=min(N-nl,int(TAIL*SR))
for buf in (L,R):
    buf[:tl]+=buf[nl:nl+tl]
L=L[:nl]; R=R[:nl]

# ── حراسة النطاق: لا شيء تحت ٢٠٠ هرتز يصل سمّاعة الهاتف، ولا حدّةً تُتعب ──
sos_h=butter(4,200/(SR/2),btype='high',output='sos')
sos_l=butter(2,5200/(SR/2),btype='low', output='sos')
L=sosfilt(sos_l,sosfilt(sos_h,L)); R=sosfilt(sos_l,sosfilt(sos_h,R))

# تلاشٍ قصير على الحافّتين يقتل أي نقرةٍ عند نقطة الدوران
f=int(0.012*SR)
for buf in (L,R):
    buf[:f]*=np.linspace(0,1,f); buf[-f:]*=np.linspace(1,0,f)

pk=max(np.max(np.abs(L)),np.max(np.abs(R)))
L*=0.50/pk; R*=0.50/pk

out=os.path.join(os.path.dirname(__file__),'..','tahaddi','audio')
os.makedirs(out,exist_ok=True)
path=os.path.join(out,'menu.wav')
il=np.empty(nl*2,dtype=np.int16)
il[0::2]=np.clip(L,-1,1)*32767; il[1::2]=np.clip(R,-1,1)*32767
data=il.tobytes()
with open(path,'wb') as fh:
    fh.write(b'RIFF'+struct.pack('<I',36+len(data))+b'WAVEfmt '+
             struct.pack('<IHHIIHH',16,1,2,SR,SR*4,4,16)+b'data'+
             struct.pack('<I',len(data))+data)
print('✓ %s — %.1f ثانية · %.2f م.ب · %d هرتز · أعلى قيمة %.2f'
      %(os.path.relpath(path,os.path.join(os.path.dirname(__file__),'..')),
        nl/SR,len(data)/1048576,SR,max(np.max(np.abs(L)),np.max(np.abs(R)))))
