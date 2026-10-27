# اعلان‌ها (پیامک، تلگرام، ایمیل)

همه پیام‌های سامانه از یک مسیر ارسال می‌شوند: `notify()` در `src/lib/notifications/index.ts`.

```ts
await notify("order.shipped", { userId: order.userId, data: { orderNumber, trackingCode } });
```

## چطور کار می‌کند

1. **قانون‌ها** (`NotificationRule`) تعیین می‌کنند هر رویداد از چه کانالی به چه کسی برسد: مشتری، سفیر مرتبط، اعضای یک نقش (مثلاً انباردار) یا گروه تلگرام تیم.
2. **قالب‌ها** (`NotificationTemplate`) متن هر رویداد در هر کانال را با متغیرهای `{{name}}` نگه می‌دارند.
3. گیرنده‌ها پیدا می‌شوند و **ترجیح هر کاربر** (پیامک / تلگرام / ایمیل در «پروفایل و اعلان‌ها») اعمال می‌شود.
4. هر پیام در `NotificationLog` با وضعیت `QUEUED` ثبت و بلافاصله در پس‌زمینه ارسال می‌شود، تا کندی سرویس پیامک روند سفارش را کند نکند.
5. پیام ناموفق تا ۳ بار توسط کران دوباره ارسال می‌شود. وضعیت‌ها: `QUEUED` → `SENDING` → `SENT` یا `FAILED`.

مدیر ارشد (مجوز `notifications.manage`) در «تنظیمات و اعلان‌ها» قالب‌ها و قانون‌ها را ویرایش می‌کند، گزارش ارسال را می‌بیند، پیام آزمایشی می‌فرستد و ناموفق‌ها را دوباره ارسال می‌کند.

## رویدادها

| رویداد | کلید | متغیرهای قالب |
| :-- | :-- | :-- |
| ثبت و پرداخت سفارش | `order.paid` | `{{name}}` `{{orderNumber}}` `{{amount}}` |
| ارسال سفارش | `order.shipped` | `{{name}}` `{{orderNumber}}` `{{trackingCode}}` |
| تحویل سفارش | `order.delivered` | `{{name}}` `{{orderNumber}}` |
| لغو سفارش | `order.cancelled` | `{{name}}` `{{orderNumber}}` |
| سفارش جدید (برای تیم) | `admin.new_order` | `{{orderNumber}}` `{{amount}}` `{{customer}}` |
| ثبت پورسانت برای سفیر | `ambassador.commission` | `{{name}}` `{{orderNumber}}` `{{commission}}` |
| درخواست تسویه (برای مالی) | `settlement.requested` | `{{name}}` `{{amount}}` |
| پرداخت تسویه سفیر | `settlement.paid` | `{{name}}` `{{amount}}` `{{receipt}}` |
| رد درخواست تسویه | `settlement.rejected` | `{{name}}` `{{amount}}` `{{reason}}` |
| درخواست سفیر جدید (برای تیم) | `ambassador.application` | `{{name}}` `{{profession}}` `{{city}}` |
| تأیید درخواست سفیر | `ambassador.approved` | `{{name}}` |
| پیگیری روز سوم کیت سمپل (برای سفیر) | `samplekit.followup` | `{{name}}` `{{recipient}}` `{{phone}}` |
| تیکت جدید (برای پشتیبانی) | `ticket.created` | `{{subject}}` `{{customer}}` |
| پاسخ به تیکت | `ticket.answered` | `{{name}}` `{{subject}}` |
| درخواست مشاوره جدید (برای مشاوران) | `consult.created` | `{{subject}}` `{{customer}}` |
| پاسخ مشاور تغذیه | `consult.answered` | `{{name}}` `{{subject}}` |
| گفت‌وگوی آنلاین جدید (برای پشتیبانی) | `livechat.new` | `{{customer}}` `{{topic}}` `{{message}}` |
| یادآوری تمدید مصرف | `refill.reminder` | `{{name}}` `{{days}}` `{{product}}` `{{coupon}}` `{{link}}` |
| کمبود موجودی (برای انبار) | `inventory.low_stock` | `{{sku}}` `{{stock}}` |
| نزدیک شدن تاریخ انقضا (برای انبار) | `inventory.expiring` | `{{batchCode}}` `{{sku}}` `{{date}}` |


`name` به‌طور خودکار از نام گیرنده پر می‌شود. قانون‌ها و قالب‌های پیش‌فرض را `npm run db:seed` می‌سازد و مقادیری که مدیر تغییر داده بازنویسی نمی‌شوند.

## کانال‌ها و تنظیمات `.env`

| کانال | متغیرها | نکته |
| :-- | :-- | :-- |
| پیامک | `SMS_PROVIDER` و کلیدهای sms.ir / کاوه‌نگار / فراز اس‌ام‌اس | برای sms.ir ارسال متن آزاد به `SMSIR_LINE_NUMBER` نیاز دارد. کد ورود (OTP) از پترن جداگانه ارسال می‌شود. |
| تلگرام | `TELEGRAM_BOT_TOKEN`، `TELEGRAM_BOT_USERNAME`، `TELEGRAM_ADMIN_CHAT_ID`، `TELEGRAM_WEBHOOK_SECRET` | گروه تیم: ربات را به گروه اضافه کنید و chat id گروه را در `TELEGRAM_ADMIN_CHAT_ID` بگذارید. |
| ایمیل | `SMTP_HOST`، `SMTP_PORT`، `SMTP_SECURE`، `SMTP_USER`، `SMTP_PASSWORD`، `SMTP_FROM` | متن به صورت HTML راست‌چین ارسال می‌شود. |

بدون کلید، در محیط توسعه پیام فقط در کنسول چاپ می‌شود و در محیط production به‌عنوان «ناموفق» ثبت می‌شود (هیچ‌وقت وانمود به ارسال نمی‌کند).

## اتصال حساب مشتری به تلگرام

1. ربات را در BotFather بسازید و توکن و نام کاربری را در `.env` بگذارید.
2. وب‌هوک را یک‌بار ثبت کنید:

   ```
   https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<site>/api/telegram/webhook&secret_token=<TELEGRAM_WEBHOOK_SECRET>
   ```

3. مشتری در «پروفایل و اعلان‌ها» روی لینک ربات می‌زند (`t.me/<bot>?start=<token>`). توکن یک‌بارمصرف و یک‌ساعته است و chat id را به حساب او وصل می‌کند. دستور `/stop` اتصال را قطع می‌کند.

## کارهای زمان‌بندی‌شده (کران)

`GET /api/cron` را هر ۱۰ تا ۱۵ دقیقه با هدر `Authorization: Bearer $CRON_SECRET` صدا بزنید:

```
*/10 * * * * curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://<site>/api/cron
```

هر اجرا (همه کارها تکرارپذیر و بدون ارسال تکراری هستند):

- لغو خودکار سفارش‌های پرداخت‌نشده بعد از `PENDING_ORDER_EXPIRY_HOURS` (بازگشت موجودی و اعتبار کیف پول)
- یادآوری پیگیری کیت سمپل به سفیر (روز سوم)
- هشدار انقضای بچ تولید به انبار (`EXPIRY_ALERT_DAYS`)
- ارسال مجدد پیام‌های ناموفق

## افزودن رویداد جدید

1. رویداد را به `NOTIFICATION_EVENTS` در `src/lib/notifications/events.ts` اضافه کنید.
2. در کد، `notify("event.key", { … })` را صدا بزنید.
3. قالب و قانون پیش‌فرض را به `prisma/seed.ts` اضافه کنید یا مدیر از پنل بسازد.
