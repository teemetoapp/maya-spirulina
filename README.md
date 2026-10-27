# اسپیرولینا مایا (Maya Spirulina)

فروشگاه آنلاین تک‌محصولی (قابل گسترش تا ۴ یا ۵ محصول) برای مکمل اسپیرولینا، با یک **پرتال یکپارچه نقش‌محور** برای مشتریان، سفیران برند و کارکنان.

**استک:** Next.js 16 (App Router, Turbopack, `proxy.ts`) · React 19 · TypeScript 5 · Tailwind CSS v4 · Prisma 6 / PostgreSQL 16 · Redis 7 · Playwright

## مستندات

| سند | موضوع |
| :-- | :-- |
| [docs/project-lifecycle/STATUS.md](./docs/project-lifecycle/STATUS.md) | وضعیت واقعی هر قابلیت، تصمیم‌ها و سؤال‌های باز (اول این را بخوانید) |
| [docs/HANDOVER.md](./docs/HANDOVER.md) | معماری، قراردادهای کد و تعریف «انجام شد» |
| [docs/RBAC.md](./docs/RBAC.md) | نقش‌ها، مجوزها و بخش‌های پرتال |
| [docs/NOTIFICATIONS.md](./docs/NOTIFICATIONS.md) | پیامک، تلگرام، ایمیل و کران |
| [DESIGN.md](./DESIGN.md) | تنها مرجع طراحی و توکن‌های رنگ |
| [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) | استقرار با داکر یا PM2 |
| [docs/README.md](./docs/README.md) | فهرست همه اسناد |

## راه‌اندازی محلی

```bash
npm install
cp .env.example .env            # DATABASE_URL و REDIS_URL را تنظیم کنید
npx prisma migrate deploy       # ساخت جداول
npm run db:seed                 # نقش‌ها، تنظیمات، قالب اعلان‌ها، محصول و مدیر ارشد
npm run dev                     # http://localhost:3000
```

ورود با کد پیامکی است. با `SMS_PROVIDER="mock"` کد در کنسول سرور چاپ می‌شود. در محیط توسعه ورود سریع با هر نقش ممکن است:

```
http://localhost:3000/api/auth/dev-switch?role=super_admin   # admin | accountant | warehouse | support | ambassador | customer
```

(این مسیر در production وجود ندارد.)

## ساختار

```
src/
├── app/
│   ├── (storefront), checkout/, story/, research/ …   # فروشگاه و صفحات محتوایی
│   ├── portal/[section]/page.tsx                    # پرتال یکپارچه؛ هر بخش یک آدرس
│   └── api/
│       ├── auth/        # OTP، خروج، dev-switch
│       ├── checkout/    # پیش‌فاکتور سمت سرور
│       ├── orders/, payments/                      # ثبت سفارش، زرین‌پال، درگاه آزمایشی
│       ├── portal/      # APIهای مشتری و سفیر
│       ├── admin/       # APIهای کارکنان (همه با requireApi)
│       ├── cron/        # کارهای زمان‌بندی‌شده
│       └── telegram/    # وب‌هوک ربات
├── components/
│   ├── portal/          # PortalShell، ui.tsx، customer/، ambassador/، admin/
│   └── storefront/
├── lib/
│   ├── rbac/            # مجوزها، نقش‌های پیش‌فرض، getAccess/requireApi
│   ├── portal/          # رجیستری بخش‌ها و لودرهای داده
│   ├── commerce/        # قیمت‌گذاری، چرخه سفارش، DTO
│   ├── notifications/   # notify، کانال‌ها، رویدادها
│   ├── payments/, sms/, wallet.ts, settings.ts
prisma/
├── schema.prisma, migrations/, seed.ts
e2e/                     # تست Playwright مسیر خرید
```

## دستورها

| دستور | کار |
| :-- | :-- |
| `npm run dev` | سرور توسعه |
| `npm run build` | بیلد production |
| `npm run lint` / `npx tsc --noEmit` | بررسی کد |
| `npm run db:migrate` | اعمال مایگریشن‌ها |
| `npm run db:seed` | مقداردهی تکرارپذیر |
| `npm run test:e2e` | تست مسیر خرید (دیتابیس seed شده لازم است) |

## نکات مهم

- **قیمت فقط در سرور محاسبه می‌شود** (`src/lib/commerce/pricing.ts`). مرورگر فقط SKU و تعداد می‌فرستد.
- **قوانین تجاری** (هزینه ارسال، درصد پورسانت هر سطح سفیر، امتیاز، حداقل تسویه، …) در جدول `Setting` هستند و از «تنظیمات و اعلان‌ها» تغییر می‌کنند.
- **رنگ ثابت (hex) ننویسید**؛ از توکن‌های [DESIGN.md](./DESIGN.md) و اجزای `src/components/portal/ui.tsx` استفاده کنید.
- بخش‌هایی که هنوز داده نمونه دارند با برچسب «داده نمونه» مشخص شده‌اند (فهرست در STATUS.md).
