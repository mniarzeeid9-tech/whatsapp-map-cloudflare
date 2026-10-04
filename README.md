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
