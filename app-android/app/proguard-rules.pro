# المنطق كلّه في صفحة الويب، وطبقة جافا غلاف رقيق — فالقواعد قليلة ومقصودة.

# WebView يستدعي الجسر بالانعكاس من جافاسكربت، فلا يرى المصغِّر أحدًا يناديه.
-keepclasseswithmembers class * { @android.webkit.JavascriptInterface <methods>; }
-keep class com.almshani.tahaddi.MainActivity$Bridge { *; }

# النشاط يُبنى بالاسم من البيان.
-keep class com.almshani.tahaddi.MainActivity { *; }

# أسماء الملفّات وأرقام الأسطر تبقى في آثار الأعطال، وإلّا صار التقرير طلاسم.
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
