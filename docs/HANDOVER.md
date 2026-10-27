# سند تحویل فنی (برای توسعه‌دهنده یا ایجنت بعدی)

این سند جایگزین `AGENT_MASTER_BLUEPRINT.md` و `MAYA_SPIRULINA_AGENT_HANDOVER_SPEC.md` است (نسخه قبلی در [archive/](./archive/)).

## پیش از شروع

1. [STATUS.md](./project-lifecycle/STATUS.md) را بخوانید: چه چیزی واقعی است و چه چیزی نمونه.
2. این نسخه از Next.js تغییرات ناسازگار دارد؛ پیش از نوشتن کد راهنمای مربوط را در `node_modules/next/dist/docs/` ببینید ([AGENTS.md](../AGENTS.md)).
3. برای ظاهر، فقط [DESIGN.md](../DESIGN.md) مرجع است.

## محصول در یک نگاه

- یک محصول اصلی (اسپیرولینا) در دو شکل قرص و پودر و سه دوره ۳۰، ۶۰ و ۱۲۰ روزه. هر بسته یک `ProductVariant` با SKU، قیمت، بهای تمام‌شده و موجودی است. محصول دوم تا پنجم فقط ردیف تازه در `Product` است.
- فروش از دو مسیر: خرید مستقیم و **سفیران برند** (پزشک، مشاور تغذیه، مربی) که با لینک `/ref/<slug>` یا کد معرفی، به مشتری تخفیف می‌دهند و پورسانت می‌گیرند. پورسانت پس از **تحویل** سفارش به کیف پول سفیر می‌رود.
- کیت سمپل: سفیر کیت را به مشتری بالقوه می‌دهد، ثبت می‌کند و روز سوم یادآوری پیگیری می‌گیرد.

## معماری

| موضوع | محل | نکته |
| :-- | :-- | :-- |
| احراز هویت | `src/lib/auth.ts`، `api/auth/otp/*` | OTP با ۵ تلاش؛ JWT در کوکی HttpOnly `maya_session` |
| دسترسی | `src/lib/rbac/*` | [RBAC.md](./RBAC.md) |
| پرتال | `src/app/portal/[section]/page.tsx`، `src/lib/portal/sections.ts` | یک پوسته، یک منو، هر بخش یک آدرس؛ تب‌ها با `?tab=` |
| قیمت‌گذاری | `src/lib/commerce/pricing.ts` | کد تخفیف و تخفیف سفیر جمع نمی‌شوند؛ بیشتر اعمال می‌شود |
| سفارش | `src/lib/commerce/orders.ts` | تنها جای تغییر وضعیت سفارش؛ موجودی، کیف پول، پورسانت، امتیاز و اعلان را هماهنگ نگه می‌دارد |
| کیف پول | `src/lib/wallet.ts` | هر تغییر موجودی یک ردیف `WalletTransaction` دارد |
| پرداخت | `src/lib/payments/index.ts` | `production`/`sandbox` زرین‌پال؛ `mock` درگاه آزمایشی |
| اعلان | `src/lib/notifications/*` | [NOTIFICATIONS.md](./NOTIFICATIONS.md) |
| تنظیمات | `src/lib/settings.ts`، `settings-defaults.ts` | مقادیر از جدول `Setting` با پیش‌فرض کد |
| لاگ امنیتی | `logAudit()` | هر تغییر حساس کارکنان |

### چرخه سفارش

```
PENDING → PAID → PROCESSING → SHIPPED → DELIVERED → (REFUNDED)
     ↘ CANCELLED (قبل از ارسال؛ موجودی و مبلغ برمی‌گردد)
```

- موجودی هنگام ثبت سفارش رزرو می‌شود. سفارش پرداخت‌نشده بعد از `PENDING_ORDER_EXPIRY_HOURS` با کران لغو می‌شود.
- `SHIPPED` بدون کد رهگیری ممکن نیست. `DELIVERED` پورسانت و امتیاز را آزاد می‌کند و `REFUNDED` پورسانت را پس می‌گیرد.

## قراردادهای کد

- هر API کارکنان با `requireApi("permission")` شروع می‌شود؛ ورودی‌ها با `str()` / `int()` از `src/lib/api/respond.ts` خوانده می‌شوند.
- خطای قابل نمایش به کاربر به فارسی و با `fail("…")`؛ پاسخ موفق با `ok({...}, "پیام")`.
- اجزای مشترک پرتال در `src/components/portal/ui.tsx` (عنوان، جدول، کارت آمار، مدال، `useMutation`). بعد از هر تغییر، `router.refresh()` داده سرور را تازه می‌کند.
- ثابت‌ها و برچسب‌هایی که کامپوننت کلاینت لازم دارد در فایل‌های بدون import سروری باشند (مثل `src/lib/portal/labels.ts`، `src/lib/commerce/dto.ts`). import کردن لودر دیتابیس در کامپوننت `"use client"` بیلد را خراب می‌کند.
- ارقام فارسی با `toPersianDigits` و مبالغ با `formatToman`؛ تاریخ با `src/lib/jalali.ts`.
- تغییر اسکیما: `npx prisma migrate dev --name <نام>` و commit پوشه `prisma/migrations`.

## تعریف «انجام شد»

1. `npx tsc --noEmit` و `npm run lint` بدون خطا.
2. `npm run build` موفق.
3. `npm run test:e2e` سبز (برای تغییرات فروشگاه، پرداخت یا سفارش).
4. API تازه با `requireApi` محافظت و تغییر حساس با `logAudit` ثبت شده است.
5. بدون رنگ hex تازه؛ فقط توکن‌های DESIGN.md.
6. STATUS.md (ماتریس قابلیت‌ها و دفتر تصمیم) به‌روز شده است.
