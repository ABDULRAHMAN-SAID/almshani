# -*- coding: utf-8 -*-
# يحوّل طبقات المشهد المصوَّرة (tools/render-scenes.cjs) إلى لوحة مرسومة: عمق ميداني (تمويه البعيد)، توهّج للأضواء،
# نسيج قماشي خفيف وحبيبات، تدرّج لوني (ظلال باردة وأضواء دافئة)، وتعتيم أطراف — ثم يحفظها في art/scenes/<kind>.png
#   node tools/render-scenes.cjs art/scenes/layers && python3 tools/paint-scenes.py && python3 tools/build-scenes.py
import os, sys
import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LAY = os.path.join(ROOT, 'art', 'scenes', 'layers')
OUT = os.path.join(ROOT, 'art', 'scenes')
PARAMS = {'mafia': dict(far=3.2, mid=.7, bloom=.75, bsig=22, cool=.07, vig=.5), 'barra': dict(far=1.4, mid=.5, bloom=.6, bsig=26, cool=.02, vig=.42)}

def blur_np(a, sigma):
    im = Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(sigma))
    return np.asarray(im).astype(np.float32) / 255

def paint(kind, p):
    far = Image.open(os.path.join(LAY, kind + '-far.png')).convert('RGBA').filter(ImageFilter.GaussianBlur(p['far']))
    mid = Image.open(os.path.join(LAY, kind + '-mid.png')).convert('RGBA').filter(ImageFilter.GaussianBlur(p['mid']))
    near = Image.open(os.path.join(LAY, kind + '-near.png')).convert('RGBA')
    img = Image.new('RGBA', far.size, (4, 6, 14, 255)); img.alpha_composite(far); img.alpha_composite(mid); img.alpha_composite(near)
    rgb = np.asarray(img.convert('RGB')).astype(np.float32) / 255
    h, w = rgb.shape[:2]
    # توهّج: ما فوق العتبة يُموَّه ويُضاف بمزج الشاشة
    lum = rgb.max(axis=2); mask = np.clip((lum - .6) / .4, 0, 1)[..., None]
    bloom = blur_np(rgb * mask, p['bsig']); rgb = 1 - (1 - rgb) * (1 - bloom * p['bloom'])
    # نسيج قماشي منخفض التردّد + حبيبات ناعمة
    rs = np.random.RandomState(7)
    tex = rs.rand(h // 6 + 1, w // 6 + 1).astype(np.float32)
    tex = np.asarray(Image.fromarray((tex * 255).astype(np.uint8)).resize((w, h), Image.BILINEAR)).astype(np.float32) / 255
    rgb *= (0.955 + 0.09 * tex)[..., None]
    rgb += (rs.rand(h, w, 1).astype(np.float32) - .5) * .035
    # تدرّج لوني: ظلال أبرد قليلًا وأضواء أدفأ، وتباين خفيف
    rgb = np.clip(rgb, 0, 1); l = rgb.mean(axis=2, keepdims=True)
    rgb[..., 2:3] += p['cool'] * (1 - l) ** 2; rgb[..., 0:1] += .035 * l ** 2
    rgb = np.clip((rgb - .5) * 1.08 + .5, 0, 1)
    # تعتيم الأطراف
    yy, xx = np.mgrid[0:h, 0:w]; d = np.sqrt(((xx - w / 2) / (w / 2)) ** 2 + ((yy - h / 2) / (h / 2)) ** 2)
    v = 1 - p['vig'] * np.clip((d - .55) / .7, 0, 1) ** 1.6; rgb *= v[..., None]
    out = Image.fromarray((np.clip(rgb, 0, 1) * 255).astype(np.uint8))
    out.save(os.path.join(OUT, kind + '.png')); print('✓ لوحة', kind, out.size)

if __name__ == '__main__':
    for k, p in PARAMS.items():
        if os.path.exists(os.path.join(LAY, k + '-far.png')): paint(k, p)
        else: print('· لا طبقات لـ', k)
