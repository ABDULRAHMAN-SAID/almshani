#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
أصوات الكيرم — خشبٌ على خشب، مؤلَّفةً ملفًّا لا مركَّبةً في الهاتف.

  python3 tools/build-sfx.py      → tahaddi/audio/carrom.wav + tahaddi/audio/carrom.json

لماذا: كان الصوت الوحيد في المباراة طقّةً واحدة عند الإطلاق وأخرى عند السقوط،
وكلّ اصطدامٍ بينهما صامت — المحرّك يبلّغ عنه ولا أحد يسمعه. وصاحب اللعبة
قال: «يجب أن يكون صوت احتكاك الخشب بالقطع». فهذه عيّنات قصيرة لأربعة أحداث،
بأكثر من صيغةٍ لكلٍّ حتى لا تتكرّر كالرشّاش، في ملفٍّ واحدٍ (sprite) يُفكّ
مرّةً ويُقتطع منه عند اللعب — أخفّ طريقةٍ على الهاتف وأقلّها تأخّرًا.

الوصفة الصوتية لطقّة قطعةٍ خشبيّة على لوح:
  هجومٌ من ضجيجٍ مرشَّح ٢–٦ ك.هرتز لبضع مللي ثوانٍ (لمسة السطح)،
  ثم رنيناتٌ خشبيّة قليلة (١٫١ · ٢٫٣ · ٣٫٩ ك.هرتز) تخمد في ١٠–٢٥ مللي ثانية.
  الحاجز أعمق وأبطأ خمودًا، والسقوط طرقةٌ ثم رجرجةٌ قصيرة داخل الجيب.
كل شيءٍ فوق ٢٠٠ هرتز — سمّاعة الهاتف لا تُصدر ما دونها فيصير ارتجاجًا.
"""
import numpy as np, struct, os, json
from scipy.signal import butter, sosfilt

SR=32000
rng=np.random.RandomState(11)

def env_exp(n,tau):
    t=np.arange(n)/SR; return np.exp(-t/tau)
def attack(n,ms):
    a=max(1,int(ms/1000*SR)); e=np.ones(n); e[:a]=np.linspace(0,1,a)**2; return e
def noise_burst(ms,lo,hi,decay_ms):
    n=int(ms/1000*SR); x=rng.randn(n)
    sos=butter(2,[lo/(SR/2),min(hi,SR/2-100)/(SR/2)],btype='band',output='sos')
    return sosfilt(sos,x)*env_exp(n,decay_ms/1000)
def modes(ms,freqs,amps,decays_ms,detune=0.0):
    n=int(ms/1000*SR); t=np.arange(n)/SR; y=np.zeros(n)
    for f,a,d in zip(freqs,amps,decays_ms):
        f2=f*(1+detune*(rng.rand()-0.5))
        y+=a*np.sin(2*np.pi*f2*t+rng.rand()*6.28)*np.exp(-t/(d/1000))
    return y

def hit(v=1.0):
    """اصطدام قطعةٍ بقطعة أو الضارب بقطعة — الطقّة الأساسية"""
    # ٦٫٤٣: كانت الرنينات ١٫١–٥٫٦ ك.هرتز فبدت «بلاستيكًا» — الخشب أعمق وأكتم وأكثر
    # ضجيجًا في الهجوم: رنيناتٌ من ٦٤٠ هرتز مع جسمٍ خافتٍ عند ٢٤٠ وهجومٍ ٧٠٠–٤٠٠٠.
    k=0.92+0.16*rng.rand()                     # اختلافٌ طفيف في النبرة بين الصيغ
    y=modes(60,[640*k,1380*k,2250*k,3400*k],[1.0,0.62,0.34,0.14],[18,12,8,5],0.02)
    y+=0.35*modes(60,[240*k],[1.0],[22],0.03)
    y+=1.25*noise_burst(60,700,4200,4.5)
    return y*attack(len(y),0.5)*v
def strike():
    """إطلاق الضارب: نقرة الإصبع — أثقل وفيها جسمٌ خشبيّ أعرض"""
    y=modes(85,[480,960,1700,2900],[1.0,0.6,0.35,0.18],[28,17,11,7],0.02)
    y+=0.5*modes(85,[215],[1.0],[30],0.03)            # جسم اللوح تحت الإصبع
    y+=1.3*noise_burst(85,600,4000,6.0)
    return y*attack(len(y),0.6)
def wall():
    """ارتداد عن الحاجز: أعمق وأكتم — خشبٌ سميك لا قرصٌ رقيق"""
    y=modes(85,[300,640,1200,1900],[1.0,0.5,0.25,0.1],[32,20,11,7],0.03)
    y+=0.7*noise_burst(85,400,2400,8.0)
    return y*attack(len(y),0.8)
def pot():
    """سقوطٌ في الجيب: طرقةٌ ثم رجرجةُ القرص وهو يستقرّ"""
    n=int(0.20*SR); y=np.zeros(n)
    y[:len(modes(60,[420],[1],[30]))]+=modes(60,[420,840,1500],[1.0,0.45,0.2],[32,17,9],0.03)
    y[:int(0.06*SR)]+=0.5*noise_burst(60,600,3000,12)
    for i,dt in enumerate([0.055,0.095,0.128,0.152]):     # الرجرجة تتقارب وتخفت
        c=modes(30,[1500,2900],[0.5,0.25],[6,4],0.05)*(0.7*0.72**i)
        s=int(dt*SR); e=min(n,s+len(c)); y[s:e]+=c[:e-s]
    return y*attack(n,0.6)

SEG=[('hit',4,hit),('strike',2,strike),('wall',3,wall),('pot',2,pot)]
GAP=int(0.03*SR)
parts=[]; sprite={}; pos=0
for name,count,fn in SEG:
    sprite[name]=[]
    for i in range(count):
        y=fn()
        # حراسة النطاق وتسوية كل عيّنة إلى قمّةٍ واحدة — التفاوت يُضبط عند اللعب بالسرعة
        sos_h=butter(4,180/(SR/2),btype='high',output='sos'); y=sosfilt(sos_h,y)
        y/=max(1e-9,np.max(np.abs(y))); y*=0.9
        f=int(0.004*SR); y[-f:]*=np.linspace(1,0,f)
        sprite[name].append([round(pos/SR,4),round(len(y)/SR,4)])
        parts.append(y); parts.append(np.zeros(GAP)); pos+=len(y)+GAP
data=np.concatenate(parts)

out=os.path.join(os.path.dirname(__file__),'..','tahaddi','audio'); os.makedirs(out,exist_ok=True)
i16=(np.clip(data,-1,1)*32767).astype(np.int16).tobytes()
with open(os.path.join(out,'carrom.wav'),'wb') as fh:
    fh.write(b'RIFF'+struct.pack('<I',36+len(i16))+b'WAVEfmt '+struct.pack('<IHHIIHH',16,1,1,SR,SR*2,2,16)+b'data'+struct.pack('<I',len(i16))+i16)
json.dump({'rate':SR,'seg':sprite},open(os.path.join(out,'carrom.json'),'w'),ensure_ascii=False,separators=(',',':'))
print('✓ carrom.wav — %.2f ث · %.0f ك.ب · مقاطع: %s'%(len(data)/SR,len(i16)/1024,', '.join('%s×%d'%(k,len(v)) for k,v in sprite.items())))
