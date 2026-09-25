# -*- coding: utf-8 -*-
"""٦٫٩٦ — الشخصيّات المرسومة: تقطيع لوحتَي البورتريهات المولَّدتين في OpenArt وتضمينهما في اللعبة.
  art/avatars/sheet-a.png  (٨ رجالٍ وفتيان: a1…a8)      art/avatars/sheet-b.png  (٨: نساءٌ وأطفال والأسطورة والشيخ: b1…b8)
  كلّ لوحةٍ شبكة ٤×٢ على خلفيّةٍ أرجوانيّة #FF00FF. لوحةٌ واحدة تكفي: اللعبة تفعّل كلّ بورتريهٍ وصلت صورته وحده.
  ١ التنقيح (frame.json → paint): مناطق تُمحى وتُملأ من قماشها المجاور قبل القطع — علاماتٌ تجاريّة رسمها المولِّد (b6: شعار
    الحجاب والخطوط الثلاثة وشارة الصدر وشعار الكمّ). مربوطٌ ببصمة اللوحة: لوحةٌ جديدة لا يُطبَّق عليها تنقيحُ القديمة.
  ٢ القطع (K.keyout_matte): الخلفيّة شفّافة ومعها الفراغات المظلَّلة بين الأصابع والخصل (الثقوب)، وشريط الحافّة يُحسب ألفاه من
    أرجوانيّة البكسل ويُنزع منه لون الخلفيّة، وتُعاد الأطراف المصبوغة بالأرجوانيّ إلى لونها — لا هالة ولا ثقب وردي.
  ٣ الاكتشاف: أكبر ٨ مكوّناتٍ متّصلة هي البورتريهات، ويُلحق بكلٍّ ما انفصل عنه قريبًا (--attach بكسل: صقرٌ أو بريق)؛ غير ذلك
    خطأٌ صريح بلا كتابة (لا تُزاح التسميات بصمت) — إلّا مع map.json. ترتيب القراءة: يسار→يمين، أعلى→أسفل.
  ٤ التأطير: مربّعٌ على الوجه لا على الكتفين — يُكتشف الوجه بلون البشرة، ويوضع الأنف قرب منتصف المربّع، وعرضه لا يتجاوز عرض
    البطاقة. تعديلٌ يدويّ لكلّ بورتريه في frame.json (z تكبير المربّع، dx/dy إزاحة المركز بنسبةٍ من ضلعه؛ سالب dy = أعلى).
  ٥ الكتابة: ٣٢٠×٣٢٠ webp بشفافيّة (أكبر عرضٍ في اللعبة ١٠٤ نقطة × ٣ = ٣١٢ بكسلًا) في AV_PIC_IMG بين /*AVPIC-BEGIN*/ و /*AVPIC-END*/.
  python3 tools/build-avatars.py [--dry] [--src art/avatars] [--game tahaddi/index.html] [--tol 45] [--hole 120] [--tint 35]
                                 [--band 3] [--spill 12] [--attach 40] [--size 320] [--q 80]
  ترتيبٌ يدويّ: art/avatars/map.json  {"a1":"sheet-a-03.png", …} (أسماء القصاصات في art/avatars/cut/)
  frame.json: {"sheet-b":{"sha1":"<أوّل ١٢ حرفًا من sha1 اللوحة>","b7":{"z":1.25,"dy":-0.06},
               "b6":{"paint":[{"box":[x0,y0,x1,y1],"sel":"gold"|"warm","seed":[x,y],"grow":3}]}}}   (إحداثيّات اللوحة)
  المعاينات (مُتجاهَلة في git): cut/ · _cut-X.png (القصاصات) · _avatars.png (المربّعات) · _avatars-circle.png (الدوائر بأحجام اللعبة)"""
import base64, hashlib, io, json, os, re, sys
import numpy as np
from PIL import Image, ImageDraw
try:
    from scipy import ndimage as nd
except Exception:
    sys.exit('build-avatars.py يحتاج scipy (pip install scipy) — لم يُكتب شيء')
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)));import _keyslice as K
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def arg(k,d):return sys.argv[sys.argv.index(k)+1] if k in sys.argv else d
SRC=os.path.join(ROOT,arg('--src','art/avatars'));GAME=os.path.join(ROOT,arg('--game','tahaddi/index.html'))
TOL=int(arg('--tol',45));HOLE=int(arg('--hole',120));TINT=int(arg('--tint',35));BAND=int(arg('--band',3));SPILL=int(arg('--spill',12))
ATT=int(arg('--attach',40));SIZE=int(arg('--size',320));Q=int(arg('--q',80))
DRY='--dry' in sys.argv
CUT=os.path.join(SRC,'cut');os.makedirs(CUT,exist_ok=True)
def find(name):
    for e in ('.png','.jpg','.jpeg','.webp'):
        p=os.path.join(SRC,name+e)
        if os.path.exists(p):return p
def paint(C,regions,Kc):
    """تنقيح: يُختار في كلّ صندوقٍ ما لونه ذهبيّ (sel=gold) أو أدفأ من القماش الكحليّ (sel=warm) — ومع seed المكوّن الذي
    يحويه وحده — ويُوسَّع grow بكسلًا، ثمّ يُملأ من الأطراف إلى الداخل بألوان القماش النظيفة حوله (لا الخلفيّة ولا الضوء
    الأرجوانيّ المنعكس)، ثمّ استرخاءٌ توافقيّ يُنعّم الملء. C تُعدَّل في مكانها؛ يعيد عدد البكسلات لكلّ منطقة"""
    H,W=C.shape[:2];out=[];k8=np.ones((3,3),np.float32);k4=np.array([[0,1,0],[1,0,1],[0,1,0]],np.float32)
    for r in regions:
        x0,y0,x1,y1=[int(v) for v in r['box']];X0,Y0,X1,Y1=max(0,x0-10),max(0,y0-10),min(W,x1+10),min(H,y1+10)
        S=C[Y0:Y1,X0:X1];dk=np.abs(S-Kc).sum(2);inb=np.zeros(S.shape[:2],bool);inb[y0-Y0:y1-Y0,x0-X0:x1-X0]=True
        hsv=np.asarray(Image.fromarray(S.clip(0,255).astype(np.uint8)).convert('HSV')).astype(np.float32)
        h=hsv[...,0]*360/255;s=hsv[...,1]/255;v=hsv[...,2]/255
        sel=((h>=18)&(h<=62)&(s>=.3)&(v>=.3)) if r.get('sel','gold')=='gold' else (S[...,0]>S[...,2]+15)
        sel&=inb&(dk>=90)
        if r.get('seed'):
            lab,_=nd.label(nd.binary_dilation(sel)&inb);j=lab[int(r['seed'][1])-Y0,int(r['seed'][0])-X0];sel&=(lab==j)&(j>0)
        M=nd.binary_dilation(sel,iterations=int(r.get('grow',3)))&inb&(dk>=45)
        known=~M&(dk>=90)&((np.minimum(S[...,0],S[...,2])-S[...,1])<24)
        V=S.copy();V[~known]=0;fil=known.copy()
        for _ in range(300):
            if fil[M].all():break
            num=np.stack([nd.convolve(V[...,c]*fil,k8,mode='nearest') for c in range(3)],-1);den=nd.convolve(fil.astype(np.float32),k8,mode='nearest')
            nw=M&~fil&(den>0);V[nw]=num[nw]/den[nw][:,None];fil|=nw
        use=(known|M).astype(np.float32)
        for _ in range(250):
            num=np.stack([nd.convolve(V[...,c]*use,k4,mode='nearest') for c in range(3)],-1);den=nd.convolve(use,k4,mode='nearest')
            ok=M&(den>0);V[ok]=num[ok]/den[ok][:,None]
        S[M]=V[M];out.append(int(M.sum()))
    return out
def tiles_of(rgba):
    """البورتريهات: المكوّنات بحجم بورتريه (كلٌّ ≥ ٢٠٪ من الأكبر) وما انفصل عنها قريبًا يُلحق بأقربها، مرتّبةً قراءةً
    → (قصاصات، ملاحظة، خطأ): الخطأ إن لم تكن ٨ بالضبط — والقصاصات تُكتب مع ذلك ليُكتب map.json منها"""
    a=rgba[...,3];lab,n=nd.label(a>40,structure=np.ones((3,3)));sl=nd.find_objects(lab)
    px=nd.sum(np.ones_like(a),lab,range(1,n+1)) if n else np.zeros(0)
    idx=[int(i) for i in np.argsort(-px)];big=[i for i in idx if px[i]>=.2*px[idx[0]]] if n else []
    err='' if len(big)==8 else '%d مكوّنًا بحجم بورتريه (المتوقّع ٨): %s'%(len(big),', '.join(str(int(px[i])) for i in big[:12]))
    if not big:return [],'',err
    box=lambda i:[sl[i][0].start,sl[i][1].start,sl[i][0].stop-1,sl[i][1].stop-1]
    grp={i:[i] for i in big};B={i:box(i) for i in big};lost=0
    for i in idx:
        if i in grp or px[i]<30:continue
        b=box(i);dd=lambda m:max(0,B[m][0]-b[2],b[0]-B[m][2])+max(0,B[m][1]-b[3],b[1]-B[m][3])
        m=min(big,key=dd)
        if dd(m)<=ATT:grp[m].append(i)
        else:lost+=1
    out=[]
    for m in big:
        bb=np.array([box(i) for i in grp[m]]);y0,x0=bb[:,0].min(),bb[:,1].min();y1,x1=bb[:,2].max(),bb[:,3].max()
        out.append([y0,x0,y1,x1,int(sum(px[i] for i in grp[m])),grp[m]])
    out=K.grid_order(out);res=[]
    for y0,x0,y1,x1,_p,g in out:
        Y0,X0,Y1,X1=max(0,y0-4),max(0,x0-4),min(a.shape[0],y1+5),min(a.shape[1],x1+5)
        mk=nd.binary_dilation(np.isin(lab[Y0:Y1,X0:X1],[i+1 for i in g]),iterations=4)   # حوافّه الناعمة، لا بكسلات جاره
        t=rgba[Y0:Y1,X0:X1].copy();t[...,3]=np.where(mk,t[...,3],0);res.append(Image.fromarray(t))
    return res,('%d قطعة صغيرة بعيدة أُهملت'%lost if lost else ''),err
def face(t):
    """الوجه في القصاصة من لون البشرة (أكبر كتلةٍ في أعلى ٧٨٪) → (مركز x، مستوى الأنف y، عرض الوجه) أو None"""
    a=np.asarray(t.convert('RGBA'));hsv=np.asarray(t.convert('RGB').convert('HSV')).astype(np.float32)
    h=hsv[...,0]*360/255;s=hsv[...,1]/255;v=hsv[...,2]/255
    m=(h>=6)&(h<=32)&(s>=.28)&(s<=.72)&(v>=.38)&(a[...,3]>200);m[int(t.height*.78):]=False
    m=nd.binary_opening(m,iterations=3);lab,n=nd.label(m)
    if not n:return None
    sz=nd.sum(m,lab,range(1,n+1));j=int(np.argmax(sz))+1
    if sz[j-1]<t.width*t.height*.02:return None
    ys,xs=np.where(lab==j);fw=float(xs.max()-xs.min())
    return (xs.min()+xs.max())/2.0, ys.min()+.62*fw, fw
def frame(t,ov):
    """مربّعٌ على الوجه: ضلعه ١٫٩× عرض الوجه (لا يتجاوز عرض البطاقة)، والأنف عند ٥٢٪ من ارتفاعه؛ فوق الرأس شفافيّة"""
    f=face(t)
    if not f:   # احتياط: المربّع القديم المثبَّت من الأعلى
        s=max(t.width,t.height);c=Image.new('RGBA',(s,s),(0,0,0,0));c.paste(t,((s-t.width)//2,0),t);return c.resize((SIZE,SIZE),Image.LANCZOS),'—'
    cx,cy,fw=f;s=min(float(t.width),1.9*fw)*float(ov.get('z',1));s=min(s,float(t.width)*1.04)
    cx+=float(ov.get('dx',0))*s;cy+=float(ov.get('dy',0))*s
    cx=min(max(cx,s/2),t.width-s/2) if s<=t.width else t.width/2
    L=int(round(cx-s/2));T=int(round(cy-.52*s));S=int(round(s))
    c=Image.new('RGBA',(S,S),(0,0,0,0));c.paste(t,(-L,-T),t)
    return c.resize((SIZE,SIZE),Image.LANCZOS),'وجه %dpx · مربّع %dpx'%(fw,S)
def uri(im,q=Q):
    b=io.BytesIO();im.save(b,'WEBP',quality=q,method=6);d=b.getvalue();return 'data:image/webp;base64,'+base64.b64encode(d).decode(),len(d)
def circles(sq,path,sizes=(26,44,56,104),dpr=2):
    """معاينة الدوائر بأحجام اللعبة الحقيقيّة (×٢ كشاشة هاتف) على خلفيّة الشخصيّة الكحليّة"""
    ks=sorted(sq);cell=max(sizes)*dpr;W=16+sum(s*dpr+16 for s in sizes);H=16+len(ks)*(cell+16)
    P=Image.new('RGBA',(W,H),(11,21,48,255));dr=ImageDraw.Draw(P)
    for r,k in enumerate(ks):
        x=16;y=16+r*(cell+16)
        for s in sizes:
            d=s*dpr;g=Image.new('RGBA',(d,d),(28,44,92,255));g.alpha_composite(sq[k].resize((d,d),Image.LANCZOS))
            mk=Image.new('L',(d,d),0);ImageDraw.Draw(mk).ellipse([0,0,d-1,d-1],fill=255)
            P.paste(g,(x,y+(cell-d)//2),mk);dr.ellipse([x,y+(cell-d)//2,x+d-1,y+(cell-d)//2+d-1],outline=(232,178,58,255),width=2);x+=d+16
    P.save(path)
fov={};fp=os.path.join(SRC,'frame.json')
if os.path.exists(fp):fov=json.load(open(fp,encoding='utf-8'))
mp=os.path.join(SRC,'map.json');MAP=json.load(open(mp,encoding='utf-8')) if os.path.exists(mp) else None
tiles={};report=[];errs=[];ovs={}
for sh in ('a','b'):
    p=find('sheet-'+sh)
    if not p:report.append('sheet-%s: غير موجودة'%sh);continue
    sha=hashlib.sha1(open(p,'rb').read()).hexdigest()[:12];o=fov.get('sheet-'+sh) or {}
    if o.get('sha1') and o['sha1']!=sha:report.append('⚠ frame.json: بصمة sheet-%s لا تطابق (%s≠%s) — تأطيرٌ تلقائيّ وبلا تنقيح؛ راجع العلامات في _cut-%s.png'%(sh,o['sha1'],sha,sh));o={}
    for k,v in o.items():
        if k!='sha1':ovs[k]=v
    im=Image.open(p).convert('RGB');regs=[r for k,v in sorted(o.items()) if k!='sha1' for r in v.get('paint',[])]
    if regs:
        C=np.asarray(im).astype(np.float32).copy()
        brd=np.concatenate([C[:8].reshape(-1,3),C[-8:].reshape(-1,3),C[:,:8].reshape(-1,3),C[:,-8:].reshape(-1,3)])
        n=paint(C,regs,np.median(brd,axis=0));im=Image.fromarray(C.clip(0,255).astype(np.uint8))
        report.append('sheet-%s: تنقيح %d منطقة (%s بكسل)'%(sh,len(regs),'+'.join(map(str,n))))
    rgba=K.keyout_matte(im,TOL,BAND,SPILL,HOLE,TINT)
    cuts,note,err=tiles_of(rgba)
    for f in os.listdir(CUT):
        if f.startswith('sheet-%s-'%sh):os.remove(os.path.join(CUT,f))   # لا تبقى قصاصةٌ قديمة يشير إليها map.json خطأً
    for i,t in enumerate(cuts,1):t.save(os.path.join(CUT,'sheet-%s-%02d.png'%(sh,i)))
    if cuts:K.preview(cuts,os.path.join(SRC,'_cut-%s.png'%sh))
    if err:errs.append('sheet-%s [%s]: %s — القصاصات في cut/ و_cut-%s.png؛ راجع --tol/--attach أو اكتب map.json'%(sh,sha,err,sh));continue
    report.append('sheet-%s [%s]: ٨ بورتريهات%s'%(sh,sha,(' · '+note) if note else ''))
    for i,t in enumerate(cuts,1):tiles['%s%d'%(sh,i)]=t
if MAP:
    for k,f in MAP.items():tiles[k]=Image.open(os.path.join(CUT,f)).convert('RGBA')
    report.append('map.json: %d تعيينًا'%len(MAP)+((' · '+' · '.join(errs)) if errs else ''))
elif errs:sys.exit('\n'.join(report+errs)+'\nلم يُكتب شيء في اللعبة')
if not tiles:sys.exit('\n'.join(report)+'\nضع sheet-a.png و/أو sheet-b.png في art/avatars ثمّ أعد التشغيل')
sq={};fr={}
for k,t in tiles.items():sq[k],fr[k]=frame(t,ovs.get(k,{}))
K.preview([sq[k] for k in sorted(sq)],os.path.join(SRC,'_avatars.png'),cols=8);circles(sq,os.path.join(SRC,'_avatars-circle.png'))
body='';total=0;sizes=[]
for k in sorted(sq):u,n=uri(sq[k]);body+="%s:'%s',"%(k,u);total+=n;sizes.append('%s %.1f'%(k,n/1024))
print(' · '.join(report));print('%d بورتريهًا (%s) %d×%d، %d بايت = %.1f ك.ب مضمّنة'%(len(sq),', '.join(sorted(sq)),SIZE,SIZE,total,total/1024))
print('  ك.ب: '+' · '.join(sizes))
for k in sorted(fr):print('  %s: %s%s'%(k,fr[k],(' · يدويّ '+json.dumps({a:b for a,b in ovs[k].items() if a!='paint'})) if k in ovs else ''))
s=open(GAME,encoding='utf-8').read()
assert s.count('/*AVPIC-BEGIN*/')==1 and s.count('/*AVPIC-END*/')==1,'لم أجد علامتَي AVPIC في اللعبة (طبّق مقطع الشخصيّات أوّلًا)'
s2=re.sub(r'/\*AVPIC-BEGIN\*/.*?/\*AVPIC-END\*/',lambda _m:'/*AVPIC-BEGIN*/'+body.rstrip(',')+'/*AVPIC-END*/',s,count=1,flags=re.S)
if DRY:print('(تجربة — لم يُكتب شيء)');sys.exit()
open(GAME,'w',encoding='utf-8').write(s2);print('✓ كُتب في',os.path.relpath(GAME,ROOT),'— شغّل الآن: node tools/splash-total.cjs')
