# فانتازي فچالة ليج — نسخة React + Vite

نفس اللعبة اللي كانت شغالة كملف HTML واحد، دلوقتي معمولة بـ React
و Vite بهيكل مشاريع منظّم بدل ملف واحد ضخم.

## الهيكل

```
src/
  lib/
    supabaseClient.js   — الاتصال بـ Supabase (fetch + رفع صور)
    db.js               — كل عمليات قاعدة البيانات (لاعبين، حسابات، إعلانات...)
    scoring.js          — نظام النقط والتحقق من صحة التشكيلة
  context/
    AppContext.jsx      — الحالة العامة (اليوزر، اللاعبين، الجيم ويك...)
    UIContext.jsx        — التوستات والنوافذ المنبثقة (تأكيد/إدخال/اختيار)
  hooks/
    useRankInfo.js       — حساب الترتيب والنقط الإجمالية
  components/            — أجزاء UI قابلة لإعادة الاستخدام
  pages/                 — الصفحات الرئيسية (دخول، فريقي، الترتيب)
  pages/admin/           — أقسام لوحة الهوست (الجيم ويك، اللاعبين، المواعيد...)
supabase-schema.sql       — كل جداول قاعدة البيانات في ملف واحد
```

## الإعداد

### 1) قاعدة البيانات

1. اعمل مشروع مجاني على [supabase.com](https://supabase.com) (أو استخدم
   المشروع الموجود بالفعل لو عندك واحد)
2. **SQL Editor → New query**، الصق `supabase-schema.sql` كامل، ودوس **Run**
   (آمن تشغّله أكتر من مرة)
3. من **Settings → API** خد الـ **Project URL** والـ **anon public key**
4. افتح `src/lib/supabaseClient.js` وحط القيمتين دول:
   ```js
   export const SUPABASE_URL = 'https://xxxxx.supabase.co';
   export const SUPABASE_ANON_KEY = 'eyJ...';
   ```

### 2) باسورد الهوست

في `src/context/AppContext.jsx`:
```js
const HOST_PASSWORD = '874569';
```
غيّره لأي باسورد تحبه.

### 3) التشغيل محليًا

```bash
npm install
npm run dev
```
هيفتح على `http://localhost:5173`.

### 4) البناء والنشر

```bash
npm run build
```
ده بيطلع فولدر `dist/` — ده اللي ترفعه على Vercel/Netlify (مش الكود المصدري
نفسه). أسهل طريقة:

- **Vercel**: اربط الريبو من GitHub، Vercel بيكتشف Vite تلقائي (build command:
  `npm run build`, output directory: `dist`)
- **Netlify**: نفس الفكرة، أو اسحب فولدر `dist/` بعد ما تعمل build يدوي

## PWA (تثبيت اللعبة كأبليكيشن)

اللعبة دلوقتي PWA كامل، مبني يدوي (مش plugin بيولّد حاجات مخفية) عشان
يبقى واضح ومضمون:

- `public/manifest.json` — ملف الـ manifest الحقيقي
- `public/sw.js` — الـ Service Worker (تخزين مؤقت + استقبال إشعارات)
- `src/registerSW.js` — الكود اللي بيسجّل الـ Service Worker، وبيطبع في
  الـ Console لما يسجّل أو لو فشل (افتح Console وشوف `[SW] registered`)
- **زرار "تثبيت التطبيق"** ظاهر دايمًا في الشريط العلوي (طالما اللعبة مش
  متثبتة بالفعل)، بالإضافة لبانر في صفحة "فريقي"

### مهم: امتى الزرار بيشتغل فعليًا؟

المتصفح (كروم/أندرويد) هو اللي بيقرر امتى "يسمح" بالتثبيت التلقائي
(`beforeinstallprompt`)، مش الكود بتاعنا — وده بياخد لحظات بعد أول فتحة
للصفحة أحيانًا. عشان كده الزرار شغال دايمًا:
- لو المتصفح جاهز للتثبيت التلقائي → هتفتح نافذة التثبيت الرسمية فورًا
- لو لسه مجهزش (أو Safari على آيفون اللي أصلاً مبيدعمش التثبيت التلقائي) →
  هيوريك تعليمات يدوية بسيطة بدل ما يختفي

### اتأكد إنه شغال (بعد النشر على Vercel)

1. افتح الموقع، دوس F12 → Console، لازم تشوف `[SW] registered, scope: ...`
2. F12 → Application → Manifest — المفروض تشوف اسم اللعبة والأيقونات
3. F12 → Application → Service Workers — المفروض تشوف `sw.js` بحالة "activated"

### أيقونة الأبليكيشن

عشان تغيّر أيقونة التثبيت (منفصلة عن "اللوجو" اللي بتحطه من لوحة الهوست،
لأن أيقونة الـ PWA لازم تكون ملف ثابت وقت الـ build مش حاجة من الداتابيز):

1. جهّز صورة مربعة (يفضّل 512×512 بيكسل أو أكبر)
2. استبدل الملفات دي بصورتك (بنفس الأسماء بالظبط):
   - `public/icons/icon-192.png` (192×192)
   - `public/icons/icon-512.png` (512×512)
   - `public/icons/apple-touch-icon.png` (180×180)
   - `public/icons/favicon-32.png` (32×32)
3. اعمل `npm run build` تاني

## إشعارات الموبايل (Push Notifications)

لما الهوست يضيف إعلان جديد، بتوصل إشعار لموبايلات كل اللاعبين اللي
فعّلوا الإشعارات — حتى لو مش فاتحين اللعبة. الأبليكيشن نفسها هي اللي
بتستقبل الإشعار وترسله (عن طريق Vercel)، مش سيرفر تاني.

### الإعداد (خطوتين، مرة واحدة بس)

**١) اعمل مشروع Firebase (مجاني):**

1. روح [console.firebase.google.com](https://console.firebase.google.com)
   واعمل مشروع جديد
2. **Project settings → General → Your apps** → دوس أيقونة الويب `</>`
   وسجّل أبليكيشن جديد — هيديك object فيه apiKey, projectId, إلخ
3. الصق القيم دي في **مكانين** (لازم يكونوا نفس القيم بالظبط في الاتنين):
   - `src/lib/firebase.js`
   - `public/sw.js` (تحت في آخر الملف)
4. **Project settings → Cloud Messaging → Web configuration → Web Push
   certificates** → دوس "Generate key pair"، وانسخ الـ key وحطه في
   `VAPID_KEY` جوه `src/lib/firebase.js`
5. **Project settings → Service accounts → Generate new private key** —
   هيتنزّل ملف JSON. افتحه وانسخ محتواه كامل (هتحتاجه في الخطوة الجاية)

**٢) ضيف متغيّر بيئة في Vercel:**

1. روح مشروعك في Vercel → **Settings → Environment Variables**
2. ضيف متغيّر اسمه `FIREBASE_SERVICE_ACCOUNT_JSON`، والقيمة = محتوى ملف
   الـ JSON اللي نزّلته فوق (الصقه كله كنص واحد)
3. اعمل Redeploy عشان المتغيّر يتفعّل

### شغّل الـ SQL

`supabase-schema.sql` (اللي جوا الفولدر) فيه جدول `push_subscriptions`
الجديد — شغّله زي العادي في Supabase SQL Editor.

### جرّب

1. افتح اللعبة، دوس "فعّل الإشعارات" في صفحة "فريقي"، اسمح للمتصفح
2. من لوحة الهوست، ضيف إعلان جديد
3. المفروض يوصلك إشعار خلال ثواني (حتى لو قفلت التاب)

### ملاحظات أمان

- ملف الـ Service Account JSON **متحطش خالص** في الكود أو في GitHub —
  ده سر كامل بيديك تحكم كامل في مشروع Firebase بتاعك. مكانه الوحيد هو
  متغيّر البيئة في Vercel
- قيم `firebaseConfig` في `src/lib/firebase.js` و `public/sw.js` مش سر —
  زيها زي مفتاح Supabase anon، مفروض تكون ظاهرة في كود الفرونت إند

## ملاحظات

- الباسوردات متخزنة كـ SHA-256 hash، مش نص واضح
- كل الجداول شغالة بصلاحيات مفتوحة (RLS) عشان الأبليكيشن يقدر يقرا ويكتب
  مباشرة من غير سيرفر خاص بيه — مقبول للعبة صغيرة بين أصحاب، بس يعني أي حد
  يعرف مفتاح الـ anon يقدر يعدّل البيانات لو فهم في الـ API
- رفع الصور (الإعلانات) بيستخدم Supabase Storage — الملف الرئيسي بيعمل الباكت
  ده تلقائي (`media`) مع صلاحيات قراءة/كتابة عامة
- الكود اتعمله `npm run build` و `npm run lint` هنا قبل ما يتبعت، وشغّال من
  غير أخطاء
