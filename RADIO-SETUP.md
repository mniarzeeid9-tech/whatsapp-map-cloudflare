# إعداد راديو موجة عبر Meshtastic وESP32

## ما تحتاجه

- عقدة Meshtastic مبنية على ESP32 وتدعم Wi‑Fi.
- Firmware Meshtastic حديث.
- شبكة Wi‑Fi محلية مشتركة بين العقدة والهاتف/الكمبيوتر.
- متصفح حديث مثل Chrome أو Edge أو Firefox حديث.

## التحقق من العقدة

من وثائق Meshtastic الرسمية، HTTP API يستخدم:

- `OPTIONS /api/v1/toradio` لفحص الوصول.
- `PUT /api/v1/toradio` لإرسال حزم Protobuf.
- `GET /api/v1/fromradio` لاستقبال الحزم.

موجة لا تنفذ بروتوكول Protobuf يدويًا؛ تستخدم حزم Meshtastic الرسمية لتقليل أخطاء التوافق.

## الإعداد المقترح

1. افتح تطبيق Meshtastic الرسمي.
2. فعّل Wi‑Fi في العقدة.
3. سجل عنوان IP الذي حصلت عليه العقدة.
4. تأكد أن الهاتف والNode على نفس الشبكة.
5. افتح موقع موجة.
6. أدخل عنوان IP بدل `meshtastic.local` إذا لم يعمل mDNS.
7. ابدأ الإرسال من غرفة الدردشة.

## إذا فشل الاتصال

- جرّب عنوان IP المحلي بدل الاسم.
- عطّل VPN مؤقتًا على الهاتف.
- تأكد أن الشبكة لا تعزل الأجهزة عن بعضها عبر AP Isolation.
- جرّب `http://` داخل الشبكة المحلية، وليس `https://`.
- لا تفتح منفذ العقدة مباشرة للإنترنت.
- تأكد من إعدادات CORS في Firmware إذا كان المتصفح يمنع الطلب.

## ما الذي يعرضه موجة؟

- الحالة: غير متصل / متصل بالراديو.
- اسم عقدة الواجهة.
- الرسائل النصية الواردة.
- عدد العقد المرئية عندما تصل معلومات العقد.
- توفر أحداث الموقع.

## القيود

لا ترسل صورًا أو فيديو أو تسجيلات عبر LoRa في هذه النسخة. حزم LoRa صغيرة وبطيئة، والأفضل أن تستخدمها للنص والموقع والتنبيهات. أي بث صوتي حقيقي يحتاج تقنية مختلفة مثل WebRTC أو Radio-over-IP.

## مصادر رسمية

- [Meshtastic HTTP API](https://meshtastic.org/docs/development/device/http-api/)
- [Meshtastic Client API](https://meshtastic.org/docs/development/device/client-api/)
- [Meshtastic JavaScript](https://meshtastic.org/docs/development/js/)
- [Meshtastic Web SDK](https://github.com/meshtastic/web)
