#!/usr/bin/env node
/**
 * يبني نسخة الأرتيفاكت من اللعبة: الأرتيفاكت يغلّف الصفحة بهيكله (doctype/head/body) فنعطيه
 * ما بين <meta charset> وآخر </script>، مع سكربت يضبط الاتجاه واللغة على الجذر، وبلا روابط
 * البيان والأيقونات (لا تُخدَم من أصل الأرتيفاكت). عامل الخدمة لا يُسجَّل هناك أصلًا.
 *   node tools/build-artifact.cjs [out]   (الافتراضي: .build/tahaddi-artifact.html)
 */
const fs=require('fs'),path=require('path');
const SRC=path.join(__dirname,'..','tahaddi','index.html');
const OUT=process.argv[2]||path.join(__dirname,'..','.build','tahaddi-artifact.html');
let s=fs.readFileSync(SRC,'utf8');
const a=s.indexOf('<meta charset');const b=s.lastIndexOf('</script>');
if(a<0||b<0)throw new Error('لم أجد <meta charset> أو </script>');
s=s.slice(a,b+'</script>'.length);
s=s.replace(/<link rel="manifest"[^>]*>\n?/,'').replace(/<link rel="icon"[^>]*>\n?/,'').replace(/<link rel="apple-touch-icon"[^>]*>\n?/,'');
const head='<script>document.documentElement.setAttribute("dir","rtl");document.documentElement.setAttribute("lang","ar");</script>\n';
fs.mkdirSync(path.dirname(OUT),{recursive:true});
fs.writeFileSync(OUT,head+s);
console.log(`✓ ${path.relative(process.cwd(),OUT)} — ${(fs.statSync(OUT).size/1048576).toFixed(2)} م.ب · الإصدار ${(s.match(/APP_VER='([^']+)'/)||[])[1]}`);
