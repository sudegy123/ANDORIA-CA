# ANDORIA — Solar Smart Advisor

ثلاثة أجزاء مستقلة، كل جزء مجلد جاهز للنشر لوحده (بدون أي build):

| المجلد | الوصف | الجمهور |
|---|---|---|
| `website/` (يُفتح على `/website/`) | الموقع التعريفي (صفحة هبوط) | الزوار |
| `app/` (الرابط الرئيسي `/`) | تطبيق "المستشار الذكي" — حاسبة الطاقة الشمسية (12 خطوة) تحفظ الطلب في قاعدة البيانات | العملاء |
| `system/` (يُفتح على `/system/`) | النظام الداخلي (CRM/ERP): الطلبات، المخزون، الباقات، المشاريع، المستخدمين، الإعدادات + مجلد `supabase/` لقاعدة البيانات | فريق أندوريا |

## التشغيل محلياً
شغّل `start-local.bat` (يحتاج Node.js) — يفتح الموقع على 3000 والتطبيق على 3001 والنظام على 3002.

## النشر
كل مجلد يُنشر كموقع ثابت مستقل (Cloudflare Pages / Netlify / GitHub Pages):
- Build command: *(لا شيء)* — Output directory: اسم المجلد (`website` أو `app` أو `system`).
- بعد نشر التطبيق على رابطه الفعلي، حدّث `APP_URL` في آخر `website/index.html`.

## قاعدة البيانات (Supabase)
المشروع: `ywjvmnzutsphkkljbqwe`. مفتاح `anon` العام موجود في `assets/js/supabase-client.js` في `app/` و`system/` (آمن للنشر؛ الحماية عبر سياسات RLS).
- كل تغيير على القاعدة = ملف جديد في `system/supabase/migrations/` ثم `supabase db push`.
- كلمة سر القاعدة تُحفظ محلياً في `system/supabase/.db-password` (مستثناة من git — لا تُرفع أبداً).
- ملفات الـ migrations القديمة تتضمن تنظيفات واختبارات سابقة؛ هي سجل تاريخي مطبّق على القاعدة الحية ويجب إبقاؤها.

## ملاحظات
- أنشئ أول حساب Owner من لوحة Supabase → Authentication، ثم ادخل من `system/login.html`.
- بوابة الدفع (Stripe) غير مفعّلة: `app/assets/js/payment.js` مفتاحه فارغ عمداً.
- مقاييس Google Analytics مفعّلة؛ Facebook Pixel جاهز لكن ينتظر Pixel ID في `app/index.html`.

## النشر على Cloudflare Pages (مشروع واحد)
المستودع كله يُنشر كما هو (Build command فارغ، Output directory = `/` أو فارغ):
- `/` يحوّل إلى التطبيق `/app/`
- `/website/` الموقع التعريفي
- `/system/login.html` النظام الداخلي
