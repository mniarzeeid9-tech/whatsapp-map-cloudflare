# طريقة النشر الصحيحة على Cloudflare

## النسخة الكاملة — الدردشة والمكالمات والغرف

هذه النسخة تحتاج **Cloudflare Workers + Durable Object**. لا ترفع مجلد المشروع إلى شاشة `Upload static files` في Cloudflare Pages، لأن هذه الشاشة تقبل ملفات الواجهة فقط ولا تشغّل WebSocket أو Durable Object.

من جهاز يحتوي على Node.js شغّل:

```bash
cd whatsapp-map-cloudflare
npx wrangler@4.147.0 login
npx wrangler@4.147.0 deploy
```

أو:

```bash
pnpm install
pnpm run deploy:cloudflare
```

بعد النشر سيظهر رابط Worker. استخدمه كرابط التطبيق.

## لماذا ظهرت الرسالة في لوحة Cloudflare؟

لأنك استخدمت صفحة رفع الملفات الثابتة. Cloudflare اكتشف وجود `wrangler.toml` وأخبرك أن هذا المشروع يحتاج `wrangler deploy` بسبب إعدادات Worker.

هذه الرسالة **ليست خطأ في المشروع**؛ هي اختيار نشر غير مناسب لنوع التطبيق.

## خطوات لوحة Cloudflare

1. افتح **Workers & Pages**.
2. اختر **Create application**.
3. اختر **Workers** وليس **Pages — Upload static files**.
4. استخدم النشر من Wrangler بالأوامر أعلاه.
5. اترك `wrangler.toml` في جذر المشروع.
6. لا تحذف `cloudflare/worker.js` أو إعداد `RoomHub`.

## تنبيه مهم

إذا رفعت `dist/` فقط إلى Pages، ستظهر الصفحة، لكن الدردشة والمكالمات لن تعمل؛ لأن Pages Static لا يشغّل مسار `/ws` ولا Durable Object. النسخة الكاملة يجب نشرها كـ Worker.

## اختبار قبل النشر

```bash
npx wrangler@4.147.0 deploy --dry-run
npx wrangler@4.147.0 dev --local --port 8787
```

لا توجد مفاتيح أو أسرار داخل الحزمة. أمر `wrangler login` يربط النشر بحساب Cloudflare الخاص بك.
