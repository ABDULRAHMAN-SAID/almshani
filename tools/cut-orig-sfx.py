#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
الأصوات الأصليّة (٦٫٤٨): مقتطعةٌ من تسجيل صاحب اللعبة نفسه، لا مركَّبة.

  python3 tools/cut-orig-sfx.py [ملف.wav بـ٤٨ ك.هرتز أحاديّ]
      → tools/sfx-src/orig.wav (٣٢ ك.هرتز) + tools/sfx-src/orig.json

بلا وسيط: يستخرج التسجيل من تاريخ git (الإيداع 6def8aa) ويفكّه بـ ffmpeg.

كيف صُنِّفت الطقّات (مطابقةً للصوت مع صور الفيديو المرفوع في ca4e062 —
الصوت فيه متأخّرٌ عن الصورة ٠٫٢٢ ث تقريبًا):
  • الإطلاق: همسةٌ ثم نقرةٌ بعدها بـ٧٠ م.ث، متطابقةٌ في كلّ ضربة (٢٫٠٩ · ٧٫٧٨ · ١٦٫٤٠ · ٢٢٫٢٩ ث)
  • الضارب بالقطعة: بعد الإطلاق بـ١٥٠–٢٢٠ م.ث في الضربات الأربع — ويطابق لحظة التماسّ في الصور
  • القطعة بالحافة: الطقّة العميقة (~٣٫٣ ك.هرتز، ~٥٠ م.ث) — رأيناها في الصور مرّتين
    (قطعةٌ سوداء تلمس الحافة السفلى عند ٠٫٤٤ ث، وبيضاء تلمس اليسرى عند ٥٫١٥ ث)
  • القطعة بالقطعة: الطقّات الحادّة القصيرة الباقية أثناء الحركة
  • الزحف: حفيف الحركة بين ٢٫٨٢ و٣٫٣٢ ث حين لا طقّة — مسطَّحًا ليصلح حلقة
  • السقوط في الجيب: لم يقع في التسجيل، فيبقى المركَّب
"""
import numpy as np, subprocess, sys, os, json, tempfile, struct
from scipy.signal import resample_poly
import scipy.io.wavfile as wavfile

HERE=os.path.dirname(os.path.abspath(__file__))
OUT=os.path.join(HERE,'sfx-src'); os.makedirs(OUT,exist_ok=True)

def ffmpeg():
    try:
        import imageio_ffmpeg; return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception: return 'ffmpeg'

def source():
    if len(sys.argv)>1: return sys.argv[1]
    tmp=tempfile.mkdtemp()
    name=subprocess.check_output(['git','-C',HERE,'-c','core.quotePath=false','show','--name-only','--format=','6def8aa']).decode().strip().splitlines()[0]
    mp3=os.path.join(tmp,'ref.mp3')
    with open(mp3,'wb') as fh: fh.write(subprocess.check_output(['git','-C',HERE,'show','6def8aa:'+name]))
    wav=os.path.join(tmp,'ref.wav')
    subprocess.check_call([ffmpeg(),'-hide_banner','-loglevel','error','-y','-i',mp3,'-ac','1','-ar','48000',wav])
    return wav

sr,x=wavfile.read(source())
assert sr==48000, 'متوقَّع ٤٨ ك.هرتز'
x=x.astype(np.float64)/32768

def onset(t):
    """أوّل عيّنةٍ تبلغ ربع القمّة في ±١٢ م.ث حول الموضع التقريبيّ — بداية الطقّة لا قمّتها"""
    a=int((t-0.012)*sr); b=int((t+0.012)*sr); w=np.abs(x[a:b]); pk=w.max()
    return (a+int(np.argmax(w>=0.25*pk)))/sr

def cut(t,dur,fade,pre=0.0015,exact=False):
    t0=(t if exact else onset(t))-pre
    y=x[int(t0*sr):int((t0+dur)*sr)].copy()
    a=int(0.0006*sr); y[:a]*=np.linspace(0,1,a)            # لا نقرة عند أوّل العيّنة
    f=int(fade*sr); y[-f:]*=np.linspace(1,0,f)**1.5         # خفوتٌ في آخرها
    return y

# الأزمنة بالثواني في التسجيل (mp3) — انظر التصنيف أعلاه
CUTS=[
 ('orig_flick',[(7.7885,0.12,0.035,True),(16.4035,0.12,0.035,True)]),
 # الأوليان: الضارب بالقطعة · الأخريان: قطعةٌ بقطعة (sfx.js يختار الصنف بعلَم الاصطدام)
 ('orig_hit',  [(7.940,0.075,0.030,False),(22.511,0.075,0.030,False),(2.460,0.070,0.030,False),(16.774,0.070,0.030,False)]),
 ('orig_wall', [(8.113,0.085,0.035,False),(22.784,0.085,0.035,False),(3.396,0.085,0.035,False)]),
]
segs={}; parts=[]
for name,lst in CUTS:
    segs[name]=[]
    for (t,d,fd,ex) in lst:
        y=cut(t,d,fd,exact=ex); segs[name].append(len(y)); parts.append(y)

# الزحف: ٠٫٥ ث من الحفيف، يُسطَّح غلافه (كان يخبو) ثم تُوصل نهايته ببدايته
r=x[int(2.82*sr):int(3.32*sr)].copy()
k=int(0.04*sr); env=np.sqrt(np.convolve(r**2,np.ones(k)/k,mode='same'))+1e-6
r/=env
xf=int(0.06*sr); head=r[:xf].copy(); r=r[xf:]; g=np.linspace(0,1,xf)
r[-xf:]=r[-xf:]*np.sqrt(1-g)+head*np.sqrt(g)                  # تساوي القدرة: ضجيجان غير مترابطين — الخطّيّ يهبط ٣ dB في المنتصف
r*=0.1/np.sqrt(np.mean(r**2))                               # جذر متوسّط المربّعات ٠٫١ — المستوى الفعليّ يضبطه build-sfx.py
segs['orig_roll']=[len(r)]; parts.append(r)

# إلى ٣٢ ك.هرتز كبقيّة الملفّ
parts=[resample_poly(p,2,3) for p in parts]
lens=[len(p) for p in parts]
i=0
for name in segs:
    segs[name]=[lens[i+j] for j in range(len(segs[name]))]; i+=len(segs[name])
data=np.concatenate(parts)
i16=(np.clip(data,-1,1)*32767).astype(np.int16)
wavfile.write(os.path.join(OUT,'orig.wav'),32000,i16)
json.dump({'rate':32000,'order':list(segs.keys()),'len':segs,
           'src':'تسجيل صاحب اللعبة (6def8aa) — الأزمنة: '+'; '.join('%s@%s'%(n,','.join('%.3f'%c[0] for c in l)) for n,l in CUTS)+'; orig_roll@2.82–3.32'},
          open(os.path.join(OUT,'orig.json'),'w'),ensure_ascii=False,indent=1)
print('✓ tools/sfx-src/orig.wav — %.2f ث · %s'%(len(data)/32000,', '.join('%s×%d'%(k,len(v)) for k,v in segs.items())))
