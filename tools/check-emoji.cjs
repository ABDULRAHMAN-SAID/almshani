#!/usr/bin/env node
/**
 * لا إيموجي في واجهة اللعبة — الأيقونات من نظام اللعبة (ico) أو من رسوم المالك.
 * يفحص الشيفرة والقوالب (لا الصور المضمّنة ولا التعليقات) ويرفض أي رمز إيموجي.
 * الرموز المطبعية المسموح بها: ★ ● ✕ ⇄ ⊘ ↻ ↺ · — ‹ › «» ✓(داخل CSS فقط)
 *   node tools/check-emoji.cjs   → 0 إن كان الملفّ نظيفًا، 1 عند أول مخالفة
 */
const fs=require('fs'),path=require('path');
let s=fs.readFileSync(path.join(__dirname,'..','tahaddi','index.html'),'utf8');
s=s.replace(/data:[a-z/+.-]+;base64,[A-Za-z0-9+/=]+/g,'');
s=s.replace(/\/\*[\s\S]*?\*\//g,m=>m.replace(/[^\n]/g,' '));      // تعليقات الكتل
s=s.replace(/^[ \t]*\/\/.*$/gm,'');                                 // تعليقات الأسطر
const EMO=/[\u{1F300}-\u{1FAFF}\u{1F000}-\u{1F2FF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{23E9}-\u{23FA}\u{25A0}-\u{25FF}]\u{FE0F}?/gu;
const ALLOW=new Set(['★','●','✕','◉','○','⬛','⬜','▪','▫']);
const bad=[];let m;
while((m=EMO.exec(s))){
 const ch=m[0].replace('️','');
 if(ALLOW.has(ch))continue;
 const line=s.slice(0,m.index).split('\n').length;
 const ctx=s.slice(Math.max(0,m.index-40),m.index+20).replace(/\n/g,'⏎');
 bad.push(`سطر ${line}: ${ch}  …${ctx}`);
 if(bad.length>=25)break;
}
if(bad.length){console.log('✗ إيموجي في الواجهة ('+bad.length+'):\n  '+bad.join('\n  '));process.exit(1)}
console.log('✓ لا إيموجي في الواجهة — الأيقونات من نظام اللعبة');
