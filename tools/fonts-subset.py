# -*- coding: utf-8 -*-
"""خطوطٌ عربيّة مفتوحة الرخصة من مستودع google/fonts (يُتاح عبر raw.githubusercontent.com)، تُقتطع إلى العربيّة والأرقام
والترقيم ثمّ تُحوَّل إلى woff2 وتُكتب في art/fonts/<Family>-<style>.woff2 مع سطر @font-face جاهزٍ للتضمين.
  python3 tools/fonts-subset.py lalezar changa tajawal        ← تنزيلٌ واقتطاع وتقرير أحجام
  python3 tools/fonts-subset.py --css lalezar changa          ← يطبع @font-face بـ base64 (للّصق في index.html)"""
import os, sys, subprocess, base64, urllib.request
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)));OUT=os.path.join(ROOT,'art','fonts');os.makedirs(OUT,exist_ok=True)
RAW='https://raw.githubusercontent.com/google/fonts/main/ofl/'
FAM={  # family → (dir, [(file, css-family, weight-descriptor)])
 'lalezar':('lalezar',[('Lalezar-Regular.ttf','Lalezar','400')]),
 'changa':('changa',[('Changa%5Bwght%5D.ttf','Changa','200 800')]),
 'tajawal':('tajawal',[('Tajawal-Regular.ttf','Tajawal','400'),('Tajawal-Medium.ttf','Tajawal','500'),('Tajawal-Bold.ttf','Tajawal','700'),('Tajawal-ExtraBold.ttf','Tajawal','800')]),
 'almarai':('almarai',[('Almarai-Regular.ttf','Almarai','400'),('Almarai-Bold.ttf','Almarai','700'),('Almarai-ExtraBold.ttf','Almarai','800')]),
 'elmessiri':('elmessiri',[('ElMessiri%5Bwght%5D.ttf','El Messiri','400 700')]),
 'reemkufi':('reemkufi',[('ReemKufi%5Bwght%5D.ttf','Reem Kufi','400 700')]),
 'rakkas':('rakkas',[('Rakkas-Regular.ttf','Rakkas','400')]),
 'cairo':('cairo',[('Cairo%5Bslnt%2Cwght%5D.ttf','Cairo','200 1000')]),
 'notokufiarabic':('notokufiarabic',[('NotoKufiArabic%5Bwght%5D.ttf','Noto Kufi Arabic','100 900')]),
 'lemonada':('lemonada',[('Lemonada%5Bwght%5D.ttf','Lemonada','300 700')]),
}
UNI='U+0020-007E,U+00A0,U+00AB,U+00BB,U+0600-06FF,U+0750-077F,U+08A0-08FF,U+FB50-FDFF,U+FE70-FEFF,U+200C-200F,U+2010-2027,U+202A-202E,U+2066-2069,U+20AC,U+2212,U+2022,U+2026,U+00D7'
def fetch(url,dst):
    if os.path.exists(dst) and os.path.getsize(dst)>1000:return
    req=urllib.request.Request(url,headers={'User-Agent':'tahaddi-fonts'});data=urllib.request.urlopen(req,timeout=60).read()
    open(dst,'wb').write(data)
def main():
    css='--css' in sys.argv;fams=[a for a in sys.argv[1:] if not a.startswith('--')] or ['lalezar','changa','tajawal']
    lines=[]
    for f in fams:
        d,files=FAM[f]
        for fn,cssfam,wt in files:
            src=os.path.join(OUT,fn.replace('%5B','[').replace('%5D',']').replace('%2C',','));fetch(RAW+d+'/'+fn,src)
            out=os.path.join(OUT,os.path.splitext(os.path.basename(src))[0].replace('[','_').replace(']','').replace(',','-')+'.woff2')
            subprocess.check_call(['pyftsubset',src,'--flavor=woff2','--unicodes='+UNI,'--layout-features=*','--output-file='+out,'--no-hinting','--desubroutinize'])
            print('%-42s %7.1f KB  →  %7.1f KB' % (os.path.basename(out),os.path.getsize(src)/1024,os.path.getsize(out)/1024))
            if css:
                b=base64.b64encode(open(out,'rb').read()).decode()
                lines.append("@font-face{font-family:'%s';font-style:normal;font-weight:%s;font-display:swap;src:url(data:font/woff2;base64,%s) format('woff2')}"%(cssfam,wt,b))
    if css:open(os.path.join(OUT,'embed.css'),'w',encoding='utf-8').write('\n'.join(lines));print('→ art/fonts/embed.css',sum(len(l) for l in lines)//1024,'KB')
if __name__=='__main__':main()
