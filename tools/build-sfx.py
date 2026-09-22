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

# ٦٫٤٥: ثلاثة أنماطٍ للطقّات يختار بينها اللاعب بالسماع — لأنّ «خشبيّ» في أذنٍ «بلاستيك» في أخرى.
#   dry   : جافٌّ قصير — قرصٌ صغير صلب، رنينٌ عالٍ يخمد في مللي ثوانٍ، ونقرةٌ عريضة.
#   wood  : خشبيّ — رنينٌ متوسّط وجسمٌ خفيف من اللوح.
#   heavy : ثقيل — أعمق وأطول، مع دمدمة اللوح.
# ونسب الرنينات غير توافقيّة كأقراصٍ حقيقيّة (1 · 1.62 · 2.41 · 3.30) لا مضاعفاتٍ نغميّة.
STYLES={
 'dry':  dict(base=1900,ratios=[1,1.62,2.41,3.30],amps=[1.0,0.55,0.30,0.14],dec=[9,6,4,3],  noise=(1500,7000,2.0,1.4),body=(480,18,0.16)),
 'wood': dict(base=1150,ratios=[1,1.62,2.41,3.30],amps=[1.0,0.60,0.34,0.15],dec=[16,10,7,5],noise=(800,4500,4.0,1.1), body=(320,30,0.28)),
 'heavy':dict(base=640, ratios=[1,2.16,3.52,5.31],amps=[1.0,0.62,0.34,0.14],dec=[18,12,8,5], noise=(700,4200,4.5,1.25),body=(240,22,0.35)),
}
def hit_of(st):
    def hit(v=1.0):
        k=0.92+0.16*rng.rand()
        fr=[st['base']*r*k for r in st['ratios']]
        y=modes(60,fr,st['amps'],st['dec'],0.02)
        bf,bd,ba=st['body']; y+=ba*modes(60,[bf*k],[1.0],[bd],0.03)
        lo,hi,nd,na=st['noise']; y+=na*noise_burst(60,lo,hi,nd)
        return y*attack(len(y),0.4)*v
    return hit
def wall_of(st):
    def wall():
        b=st['base']*0.42
        y=modes(85,[b,b*2.1,b*3.7,b*5.9],[1.0,0.5,0.25,0.1],[32,20,11,7],0.03)
        y+=0.7*noise_burst(85,max(150,b*1.2),b*7,8.0)
        return y*attack(len(y),0.8)
    return wall
def pot_of(st):
    def pot():
        b=st['base']*0.36
        n=int(0.20*SR); y=np.zeros(n)
        y[:len(modes(60,[b],[1],[30]))]+=modes(60,[b,b*2,b*3.6],[1.0,0.45,0.2],[32,17,9],0.03)
        y[:int(0.06*SR)]+=0.5*noise_burst(60,b*1.4,b*7,12)
        for i,dt in enumerate([0.055,0.095,0.128,0.152]):
            c=modes(30,[b*3.6,b*6.9],[0.5,0.25],[6,4],0.05)*(0.7*0.72**i)
            s_=int(dt*SR); e=min(n,s_+len(c)); y[s_:e]+=c[:e-s_]
        return y*attack(n,0.6)
    return pot
def flick():
    """نقرة الإصبع على الضارب: في الواقع تكاد لا تُسمع — همسةٌ قصيرة لا طرقة"""
    y=modes(30,[2600,4100],[0.6,0.3],[4,3],0.05)
    y+=1.0*noise_burst(30,1800,7000,2.0)
    return y*attack(len(y),0.3)*0.55

SEG=[('flick',2,flick)]
for _name,_st in STYLES.items():
    SEG+=[(_name+'_hit',4,hit_of(_st)),(_name+'_wall',3,wall_of(_st)),(_name+'_pot',2,pot_of(_st))]
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
        OPUS_LAG=0.0072   # MediaRecorder/Opus يترك ٧٫٢ م.ث صمتٍ في أوّل الملفّ (pre_skip=0) — قِيس بالارتباط المتبادل
        sprite[name].append([round(pos/SR+OPUS_LAG,4),round(len(y)/SR+0.002,4)])
        parts.append(y); parts.append(np.zeros(GAP)); pos+=len(y)+GAP
data=np.concatenate(parts)

out=os.path.join(os.path.dirname(__file__),'..','tahaddi','audio'); os.makedirs(out,exist_ok=True)
i16=(np.clip(data,-1,1)*32767).astype(np.int16).tobytes()
with open(os.path.join(out,'carrom.wav'),'wb') as fh:
    fh.write(b'RIFF'+struct.pack('<I',36+len(i16))+b'WAVEfmt '+struct.pack('<IHHIIHH',16,1,1,SR,SR*2,2,16)+b'data'+struct.pack('<I',len(i16))+i16)
json.dump({'rate':SR,'seg':sprite},open(os.path.join(out,'carrom.json'),'w'),ensure_ascii=False,separators=(',',':'))
print('✓ carrom.wav — %.2f ث · %.0f ك.ب · مقاطع: %s'%(len(data)/SR,len(i16)/1024,', '.join('%s×%d'%(k,len(v)) for k,v in sprite.items())))
