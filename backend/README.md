# Westone Backend

باك اند رسمي لمنصة **Westone** (بوابة التقديم) — Node.js + Express + PostgreSQL.
مبني ليطابق 100% ملف `Backend Contract` الموجود في README الفرونت اند (WESTONE — Final Frontend) بدون أي تعديل على الواجهة.

## المكدس (Stack)
- Node.js 18+ / Express 4
- PostgreSQL (`pg`) — بدون ORM، SQL خام لتحكم وأداء أفضل
- Discord OAuth2 (`identify` scope) لتسجيل الدخول
- JWT داخل httpOnly Cookie للجلسات (يتحقق من قاعدة البيانات في كل طلب، مو من التوكن فقط)

## هيكلة المشروع
```
src/
  index.js          نقطة البداية: تحقق من env + migrate + تشغيل السيرفر
  app.js            إعداد Express (middleware + ربط الراوترات)
  config.js         قراءة متغيرات البيئة مركزياً
  db/
    pool.js         اتصال PostgreSQL
    schema.sql       تعريف الجداول (Idempotent)
    migrate.js       تشغيل schema.sql + بيانات ابتدائية
  lib/               جلب المستخدم، Discord OAuth، JWT، Validation
  middleware/        auth (requireAuth/requireAdmin)، errorHandler، rate limiters
  routes/
    auth.js, application.js, members.js
    admin/           stats, applications, builder (pages+questions), members, settings
```

## التشغيل محلياً
```bash
cp .env.example .env   # وعبّي القيم
npm install
npm run dev             # أو npm start
```
عند أول تشغيل، السيرفر ينشئ الجداول تلقائياً (`CREATE TABLE IF NOT EXISTS`) ويزرع إعدادات افتراضية + صفحة تقديم مثال واحدة تقدر تعدلها أو تحذفها من لوحة التحكم.

## إعداد تطبيق Discord
1. https://discord.com/developers/applications → **New Application**
2. من **OAuth2 → General** خذ `Client ID` و `Client Secret`
3. من **OAuth2 → Redirects** أضف بالضبط:
   ```
   https://<دومين-الباك-اند>/api/auth/discord/callback
   ```
4. حط القيم في `.env`: `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_REDIRECT_URI`

## النشر: GitHub + Render

### الطريقة السريعة (Blueprint)
1. ادفع هذا المجلد لريبو جديد على GitHub.
2. Render Dashboard → **New → Blueprint** → اختر الريبو (فيه `render.yaml` جاهز، ينشئ الباك اند + قاعدة PostgreSQL مجانية تلقائياً، ويربطهم ببعض عبر `DATABASE_URL`).
3. عبّي المتغيرات المعلّمة `sync: false` من Render Dashboard:
   `FRONTEND_URL`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_REDIRECT_URI`, `ADMIN_DISCORD_IDS`
4. بعد أول Deploy، حدّث `DISCORD_REDIRECT_URI` بدومين Render النهائي (`https://xxx.onrender.com/api/auth/discord/callback`)، وحدّث نفس الرابط في Discord Developer Portal.

### الطريقة اليدوية
1. أنشئ PostgreSQL من Render (Free) وخذ Connection String.
2. أنشئ Web Service من نفس الريبو: Build Command `npm install`، Start Command `npm start`.
3. أضف كل متغيرات `.env.example` تحت Environment.
4. Health Check Path: `/api/health`

## ربط الفرونت اند
في الفرونت اند، قبل `script.js`:
```html
<script>window.WESTONE_API_BASE = 'https://<دومين-الباك-اند>'</script>
```
الباك اند يسمح فقط للأصل (Origin) المحدد في `FRONTEND_URL` مع Cookies بين نطاقين مختلفين (`Secure` + `SameSite=None` تلقائياً في الإنتاج).

## صلاحيات الأدمن
ما فيه Endpoint لترقية مستخدم إلى ADMIN من داخل التطبيق (تفادياً لثغرة تصعيد صلاحيات ذاتي). بدلها:
- حط الـ Discord ID تبعك (وأي أدمن ثاني) في `ADMIN_DISCORD_IDS` مفصولين بفاصلة.
- أي حساب Discord ID موجود بالقائمة يترقى تلقائياً لـ `ADMIN` عند تسجيل الدخول، ولا يتم تخفيض رتبة أي أدمن غير موجود بالقائمة تلقائياً.

> ملاحظة: جدول `members` (طاقم الإدارة الظاهر بالموقع) هو عرض تجميلي فقط ولا علاقة له بصلاحيات `ADMIN`.

## نقاط النهاية (Endpoints)
```
GET   /api/health
GET   /api/auth/me
GET   /api/auth/discord
GET   /api/auth/discord/callback
POST  /api/auth/logout

GET   /api/application/form
POST  /api/application/submit
GET   /api/application/my
GET   /api/application/my/:id

GET   /api/members

GET    /api/admin/stats
GET    /api/admin/applications
GET    /api/admin/applications/:id
PATCH  /api/admin/applications/:id/status
POST   /api/admin/applications/:id/notes
GET    /api/admin/pages
POST   /api/admin/pages
PATCH  /api/admin/pages/:id
DELETE /api/admin/pages/:id
POST   /api/admin/pages/:id/duplicate
GET    /api/admin/pages/:id/questions
POST   /api/admin/pages/:id/questions
PATCH  /api/admin/questions/:id
DELETE /api/admin/questions/:id
GET    /api/admin/members
POST   /api/admin/members
PATCH  /api/admin/members/:id
DELETE /api/admin/members/:id
GET    /api/admin/settings
PATCH  /api/admin/settings
```

## ملاحظات أمنية
- كل Endpoint إداري يتحقق من الجلسة (JWT + Cookie httpOnly) **ومن الرتبة (ADMIN) من قاعدة البيانات مباشرة في كل طلب** — نفس المبدأ المذكور في README الفرونت اند.
- Rate limiting عام على `/api/*`، وأشد على `/api/application/submit` و `/api/auth/discord`.
- حذف صفحة أو سؤال يحافظ على نسخة (Snapshot) من الإجابات القديمة حتى لو انحذف السؤال الأصلي (`question_id` يصير NULL بدل ما تنحذف الإجابة).
- `application_number` يتولد من Sequence ذرّية في قاعدة البيانات (`APP-00001`) - لا يوجد تعارض حتى مع طلبات متزامنة.
- إرسال الطلب (submit) داخل Transaction واحدة (الطلب + كل الإجابات معاً أو ولا شي).
