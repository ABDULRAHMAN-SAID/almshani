# -*- coding: utf-8 -*-
"""٦٫٩٦ — تضمين لوحات OpenArt التي يرسلها المالك (art/keyart/) في tahaddi/index.html:
  arena-01.jpg … arena-10.jpg  → ARENA_BG (خلفيّات الساحات العشر، 9:16، تُعرض خلف اللوح وفي شاشة الساحات)
  win.jpg   → REAL_ART.ui_win_bg      lose.jpg  → REAL_ART.ui_lose_bg      chest.jpg → REAL_ART.ui_chest_bg
  splash.jpg → صورة شاشة الدخول (#ld .ldArt)      (الامتدادات png/jpg/jpeg/webp كلّها مقبولة)
  python3 tools/build-keyart.py            ← يضمّن ما وجده ويطبع تقريرًا
  python3 tools/build-keyart.py --dry      ← يحسب الأحجام دون كتابة
بعدها: node tools/splash-total.cjs"""
import base64, io, os, re, sys
from PIL import Image
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)));SRC=os.path.join(ROOT,'art','keyart');GAME=os.path.join(ROOT,'tahaddi','index.html')
EXT=('.png','.jpg','.jpeg','.webp')
def find(name):
    for e in EXT:
        p=os.path.join(SRC,name+e)
        if os.path.exists(p):return p
def uri(im,w,h,q,mode='cover'):
    im=im.convert('RGB');
    if mode=='cover':
        r=max(w/im.width,h/im.height);im=im.resize((round(im.width*r),round(im.height*r)),Image.LANCZOS)
        x=(im.width-w)//2;y=(im.height-h)//2;im=im.crop((x,y,x+w,y+h))
    else: im.thumbnail((w,h),Image.LANCZOS)
    b=io.BytesIO();im.save(b,'WEBP',quality=q,method=6);d=b.getvalue()
    return 'data:image/webp;base64,'+base64.b64encode(d).decode(),len(d)
def set_real(s,key,u):
    pat=re.compile(r"(\n ?%s:')data:image/\w+;base64,[A-Za-z0-9+/=]+(')"%key)
    if pat.search(s):return pat.sub(lambda m:m.group(1)+u+m.group(2),s,count=1),'replaced'
    i=s.index('const REAL_ART={')+len('const REAL_ART={');return s[:i]+"\n %s:'%s',"%(key,u)+s[i:],'added'
def main():
    dry='--dry' in sys.argv;s=open(GAME,encoding='utf-8').read();orig=s;rep=[];total=0
    # الساحات
    ar={}
    for i in range(1,11):
        p=find('arena-%02d'%i)
        if p:u,n=uri(Image.open(p),540,960,74);ar[i]=u;total+=n;rep.append('arena-%02d %dKB'%(i,n//1024))
    if ar:
        body='const ARENA_BG={'+','.join('%d:%r'%(i-1,u) for i,u in sorted(ar.items()))+'};   // ٦٫٩٦: لوحات OpenArt للساحات (540×960 webp) — tools/build-keyart.py\n'
        if 'const ARENA_BG=' in s:s=re.sub(r'const ARENA_BG=\{[^\n]*\n',body,s,count=1)
        else:
            i=s.index('const ARENAS=[');s=s[:i]+body+s[i:]
    for name,key,w,h,q in (('win','ui_win_bg',720,1280,78),('lose','ui_lose_bg',720,1280,74),('chest','ui_chest_bg',720,960,78)):
        p=find(name)
        if p:u,n=uri(Image.open(p),w,h,q);s,how=set_real(s,key,u);total+=n;rep.append('%s→%s %s %dKB'%(name,key,how,n//1024))
    p=find('splash')
    if p:
        u,n=uri(Image.open(p),810,1440,80);total+=n
        m=re.search(r"(#ld \.ldArt\{[^}]*?background:url\()data:image/\w+;base64,[A-Za-z0-9+/=]+(\))",s)
        if m:s=s[:m.start(1)]+m.group(1)+u+m.group(2)+s[m.end(2):];rep.append('splash %dKB'%(n//1024))
        else:rep.append('splash: لم أجد #ld .ldArt')
    if not rep:sys.exit('لا صور في art/keyart — ضع arena-01..10 / win / lose / chest / splash ثمّ أعد التشغيل')
    print(' · '.join(rep));print('المجموع المضمّن %.0f ك.ب'%(total/1024))
    if dry or s==orig:print('(لم يُكتب شيء)' if dry else '(لا تغيير)');return
    open(GAME,'w',encoding='utf-8').write(s);print('✓ كُتب — شغّل الآن: node tools/splash-total.cjs')
if __name__=='__main__':main()
