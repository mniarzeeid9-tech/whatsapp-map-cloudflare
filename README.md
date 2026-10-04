# واتساب ماب — نسخة Cloudflare HTML/CSS/JavaScript

نسخة تسليم مستقلة تستخدم HTML وCSS وJavaScript عادي في الواجهة، مع Cloudflare Worker وDurable Object للغرف المؤقتة.

## النشر على GitHub Pages

يمكن نشر الواجهة تلقائياً من خلال ملف GitHub Actions الموجود في `.github/workflows/pages.yml`. فعّل GitHub Pages من إعدادات المستودع باختيار **GitHub Actions** كمصدر.

> تنبيه: GitHub Pages استضافة ملفات ثابتة فقط، ولا تشغّل WebSocket أو Durable Object. لذلك يلزم ضبط متغير المستودع `SIGNALING_URL` على عنوان Worker عام حتى تعمل الغرف والمكالمات والرسائل بين الأجهزة. بدون ذلك ستظهر الواجهة فقط.

## النشر الكامل على Cloudflare Workers

1. فك الضغط.
2. ثبّت Wrangler أو استخدم الأمر المرفق:

```bash
npx wrangler@4.147.0 login
npx wrangler@4.147.0 deploy
```

ملف `dist/` موجود مسبقاً، و`wrangler.toml` يربط الأصول الثابتة مع Worker وDurable Object. لا يحتاج المشروع إلى D1 أو KV أو R2.

## إعادة البناء من المصدر

```bash
pnpm install
pnpm build
npx wrangler@4.147.0 deploy
```

## التشغيل المحلي

للتشغيل كواجهة فقط:

```bash
pnpm install
pnpm dev
```

ولتجربة Worker وWebSocket وDurable Object محلياً:

```bash
npx wrangler@4.147.0 dev --local --port 8787
```

## إعداد الإنتاج خطوة بخطوة

### GitHub Pages

1. افتح `Settings → Pages` واختر **GitHub Actions**.
2. أضف متغير Actions باسم `SIGNALING_URL`، وضع فيه عنوان Worker مثل `https://whatsapp-map.example.workers.dev` من دون `/ws`.
3. شغّل Workflow `Deploy static web app to GitHub Pages`.

### Cloudflare Worker

للنشر اليدوي:

```bash
pnpm install --frozen-lockfile
pnpm run deploy:cloudflare
```

للنشر التلقائي، أضف Secrets باسم `CLOUDFLARE_API_TOKEN` و`CLOUDFLARE_ACCOUNT_ID` ثم شغّل Workflow `Deploy Cloudflare Worker`. استخدم API Token محدودًا بصلاحية **Edit Cloudflare Workers** ولا تضعه في الكود.

الخطة المجانية لا تعني موارد غير محدودة؛ راقب حدود Workers وDurable Objects، خصوصًا عدد الاتصالات المتزامنة والرسائل.

## الملفات

- `index.html`: صفحة HTML الرئيسية.
- `src/main.js`: منطق الواجهة والتفاعل.
- `src/room.js`: WebRTC وWebSocket للغرف.
- `src/styles/main.css`: التصميم المتجاوب.
- `cloudflare/worker.js`: Worker وRoomHub Durable Object.
- `wrangler.toml`: إعداد Cloudflare.
- `dist/`: نسخة البناء الجاهزة للنشر.
- `PRIVACY.md` و`SECURITY.md`: الخصوصية وحدود الأمان.

لا يحتوي هذا الإصدار على `node_modules` أو ملفات مؤقتة أو أسرار حساب Cloudflare.
