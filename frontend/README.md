# WESTONE — Final Frontend

واجهة Frontend نهائية لبوابة التقديم في Westone، مصممة لتكون جاهزة للربط مع Backend حقيقي بدون تغيير تجربة المستخدم.

## ما تم تضمينه
- Hero سينمائي + Scroll Reveal تدريجي (Blur → Fade → Translate).
- بدون شاشة Loading عند فتح الموقع.
- ربط Discord من الـ Navbar.
- منع بدء التقديم إذا لم توجد جلسة Discord.
- صورة Discord في الـ Navbar بعد تسجيل الدخول.
- نافذة حساب Discord مركزية ومتجاوبة داخل الشاشة بالكامل (ليست Dropdown قابلة للقص).
- عرض Display Name / Username / Discord ID / Role.
- نسخ Discord ID.
- User Dashboard + Admin Dashboard.
- Dynamic application form من API.
- جميع أنواع الأسئلة الأساسية الموجودة في النظام.
- Application status / application number.
- Admin: طلبات، حالات، ملاحظات، صفحات، أسئلة، طاقم الإدارة، إعدادات.
- واجهة مخصصة لإضافة/تعديل طاقم الإدارة مع رفع صورة للمعاينة وإرسال `image_url` للباك اند.
- Scrollbars مخفية بصريًا مع استمرار التمرير.
- Responsive للجوال والكمبيوتر.

## Backend Contract
```text
GET  /api/auth/me
GET  /api/auth/discord
POST /api/auth/logout
GET  /api/application/form
POST /api/application/submit
GET  /api/application/my
GET  /api/members
GET  /api/admin/applications
GET  /api/admin/applications/:id
PATCH /api/admin/applications/:id/status
POST /api/admin/applications/:id/notes
GET/POST/PATCH/DELETE /api/admin/pages
GET/POST/PATCH/DELETE /api/admin/pages/:id/questions
PATCH/DELETE /api/admin/questions/:id
GET/POST/PATCH/DELETE /api/admin/members
GET/PATCH /api/admin/settings
```

## API base
افتراضيًا تستخدم الواجهة نفس الدومين. إذا كان الباك اند على دومين مختلف، عرّف قبل `script.js`:
```html
<script>window.WESTONE_API_BASE = 'https://api.example.com'</script>
```

## أهم مبدأ أمني
الواجهة لا تعتبر نفسها مصدر صلاحيات. الباك اند يجب أن يتحقق من Session وRole (`ADMIN`) في كل endpoint إداري.
