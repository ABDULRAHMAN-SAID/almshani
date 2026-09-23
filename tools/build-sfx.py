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
import scipy.io.wavfile as wavfile
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
# ٦٫٤٦ «real»: مضبوطٌ على قياس تسجيلٍ حقيقيّ أرسله المالك (٨ طقّات + انزلاق):
#   ضربة الضارب: نقرةٌ عريضة الطيف (مركزها ~٥ ك.هرتز، معظم طاقتها فوق ٢٫٢ ك.هرتز) تهبط ١٥ dB في
#   مللي ثانية واحدة و٢٢ dB في ثلاث، ثمّ ذيلٌ خافت (−٢٧ dB) فيه ٤٠٠–٢٢٠٠ هرتز.
#   قطعةٌ بقطعة: أخفض بـ٧–١١ dB، مركزها ~٣٫٩ ك.هرتز، رنينٌ عند ~١٧٣٠ و~٦٦٠ هرتز، تهبط ١٣ dB في
#   ٢ م.ث و٢٢ dB في ١٢ م.ث. الصيغتان الأوليان للضارب والأخريان للقطع؛ sample() يختار بالسرعة.
def real_hit_strike():
    n=int(0.06*SR); y=np.zeros(n)
    y+=1.0*noise_burst(60,2200,14000,0.55)
    y+=0.15*noise_burst(60,800,3000,2.0)
    y+=modes(60,[420,1100,1730],[0.05,0.04,0.03],[25,15,9],0.03)
    return y*attack(n,0.25)
def real_hit_coin():
    n=int(0.05*SR); y=np.zeros(n)
    y+=1.0*noise_burst(50,2000,8000,0.9)
    y+=modes(50,[1730,3900,660,1100],[0.30,0.30,0.10,0.12],[6,3.5,7,5],0.02)
    return y*attack(n,0.3)*0.5
_real_i=[0]
def real_hit(v=1.0):
    _real_i[0]+=1
    return real_hit_strike() if _real_i[0]<=2 else real_hit_coin()
def real_wall():
    n=int(0.07*SR); y=np.zeros(n)
    y+=1.0*noise_burst(70,600,3000,2.5)
    y+=modes(70,[320,900,1700],[0.35,0.25,0.12],[20,12,7],0.03)
    return y*attack(n,0.5)
def real_pot():
    b=700
    n=int(0.20*SR); y=np.zeros(n)
    y[:len(modes(60,[b],[1],[30]))]+=modes(60,[b,b*2,b*3.6],[1.0,0.45,0.2],[24,13,8],0.03)
    y[:int(0.06*SR)]+=0.8*noise_burst(60,900,6000,6)
    for i,dt in enumerate([0.055,0.095,0.128,0.152]):
        c=modes(30,[b*3.6,b*6.9],[0.5,0.25],[5,3],0.05)*(0.7*0.72**i)
        s_=int(dt*SR); e=min(n,s_+len(c)); y[s_:e]+=c[:e-s_]
    return y*attack(n,0.5)
def flick():
    """نقرة الإصبع على الضارب: في الواقع تكاد لا تُسمع — همسةٌ قصيرة لا طرقة"""
    y=modes(30,[2600,4100],[0.6,0.3],[4,3],0.05)
    y+=1.0*noise_burst(30,1800,7000,2.0)
    return y*attack(len(y),0.3)*0.55

SEG=[('flick',2,flick),('real_hit',4,real_hit),('real_wall',3,real_wall),('real_pot',2,real_pot)]
for _name,_st in STYLES.items():
    SEG+=[(_name+'_hit',4,hit_of(_st)),(_name+'_wall',3,wall_of(_st)),(_name+'_pot',2,pot_of(_st))]
# ٦٫٦٦ — «الصوت أبدًا مش مناسب»: الأنماط المركَّبة (real/wood/dry/heavy) لا تُحزم بعد اليوم — الأصوات كلّها من
# تسجيل صاحب اللعبة (orig_*)، والسقوط في الجيب من طقّاته هو (tools/cut-orig-sfx.py)
SEG=[]
GAP=int(0.03*SR)
parts=[]; sprite={}; pos=0
OPUS_LAG=0.0   # ٦٫٦٦: الترميز بـffmpeg/libopus (pre-skip مضبوط) — التأخّر المقيس بالارتباط المتبادل صفر (كان ٧٫٢ م.ث بمسجّل المتصفّح)

# ٦٫٤٨: الأصليّ — مقاطع من تسجيل صاحب اللعبة (tools/cut-orig-sfx.py). لا تُسوّى كلٌّ على حدة:
# عاملٌ واحدٌ للجميع فتبقى النسب بين الإطلاق والطقّة والحافة كما سُجّلت
_src=os.path.join(os.path.dirname(__file__),'sfx-src')
_oj=json.load(open(os.path.join(_src,'orig.json')))
_sr,_ow=wavfile.read(os.path.join(_src,'orig.wav')); assert _sr==SR
_ow=_ow.astype(np.float64)/32768
_oc={}; _i=0
for _name in _oj['order']:
    _oc[_name]=[]
    for _n in _oj['len'][_name]: _oc[_name].append(_ow[_i:_i+_n].copy()); _i+=_n
_pk=max(np.max(np.abs(y)) for k,l in _oc.items() if k!='orig_roll' for y in l)
_k=0.9/_pk
def _rms20(y):
    n=int(0.02*SR); return max(np.sqrt(np.mean(y[i:i+n]**2)) for i in range(0,max(1,len(y)-n),n//4))
_loud=max(_rms20(y*_k) for k,l in _oc.items() if k!='orig_roll' for y in l)
for _name in _oc:
    if _name=='orig_roll':
        # الزحف في التسجيل أخفض من أعلى طقّةٍ بنحو ٣٠ dB (جذر متوسّط ٢٠ م.ث) — يُحفظ عند −٢٨ dB
        # فيكون هذا مستواه حين تتحرّك القطع كلّها (slide(1))، وأخفض كلّما هدأت
        _r=_oc[_name][0]; _r*=(_loud*10**(-28/20))/np.sqrt(np.mean(_r**2)); _oc[_name]=[_r]
    else:
        _oc[_name]=[y*_k for y in _oc[_name]]
        if _name=='orig_hit':
            # الطقّات الأربع إلى علوٍّ واحد (مستوى صيغتَي الضارب) ثم صيغتا القطعة بقطعة −٧٫٥ dB كما في «real»:
            # في التسجيل كانت طقّتا القطعة المختارتان أعلى من طقّتَي الضارب بـ٦ dB لأنّهما سُجِّلتا في ضرباتٍ أقوى —
            # والعلوّ عند اللعب تحدّده السرعة في sfx.js، فلا يُترك لصدفة التسجيل
            _t=np.mean([_rms20(y) for y in _oc[_name][:2]])
            _oc[_name]=[y*(_t/_rms20(y))*(0.42 if i>=2 else 1) for i,y in enumerate(_oc[_name])]
    sprite[_name]=[]
    for y in _oc[_name]:
        sprite[_name].append([round(pos/SR+OPUS_LAG,4),round(len(y)/SR+0.002,4)])
        parts.append(y); parts.append(np.zeros(GAP)); pos+=len(y)+GAP
for name,count,fn in SEG:
    sprite[name]=[]
    for i in range(count):
        y=fn()
        # حراسة النطاق وتسوية كل عيّنة إلى قمّةٍ واحدة — التفاوت يُضبط عند اللعب بالسرعة
        sos_h=butter(4,180/(SR/2),btype='high',output='sos'); y=sosfilt(sos_h,y)
        pk=max(1e-9,np.max(np.abs(y)))
        y/=pk; y*=0.9
        if name=='real_hit' and i>=2: y*=0.42   # قطعةٌ بقطعة: −٧٫٥ dB عن ضربة الضارب كما في التسجيل
        f=int(0.004*SR); y[-f:]*=np.linspace(1,0,f)
        sprite[name].append([round(pos/SR+OPUS_LAG,4),round(len(y)/SR+0.002,4)])
        parts.append(y); parts.append(np.zeros(GAP)); pos+=len(y)+GAP
parts.append(np.zeros(int(0.30*SR)))   # ذيلُ صمتٍ: مسجّل المتصفّح يقصّ آخر الملفّ فلا يُقصّ آخر مقطع
data=np.concatenate(parts)

out=os.path.join(os.path.dirname(__file__),'..','tahaddi','audio'); os.makedirs(out,exist_ok=True)
i16=(np.clip(data,-1,1)*32767).astype(np.int16).tobytes()
with open(os.path.join(out,'carrom.wav'),'wb') as fh:
    fh.write(b'RIFF'+struct.pack('<I',36+len(i16))+b'WAVEfmt '+struct.pack('<IHHIIHH',16,1,1,SR,SR*2,2,16)+b'data'+struct.pack('<I',len(i16))+i16)
json.dump({'rate':SR,'seg':sprite},open(os.path.join(out,'carrom.json'),'w'),ensure_ascii=False,separators=(',',':'))
# ٦٫٦٦: الترميز هنا لا يدويًّا — Opus أحاديّ ٦٤ ك.ب/ث، ثم يُحذف الـwav (لا يُشحن)
import imageio_ffmpeg,subprocess as _sp
_wav=os.path.join(out,'carrom.wav')
_sp.check_call([imageio_ffmpeg.get_ffmpeg_exe(),'-hide_banner','-loglevel','error','-y','-i',_wav,'-c:a','libopus','-b:a','64k','-ac','1',os.path.join(out,'carrom.webm')])
os.remove(_wav)
print('✓ carrom.webm — %.2f ث · %.0f ك.ب · مقاطع: %s'%(len(data)/SR,len(i16)/1024,', '.join('%s×%d'%(k,len(v)) for k,v in sprite.items())))
