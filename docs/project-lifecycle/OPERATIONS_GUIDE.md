# ⚙️ راهنمای عملیات، استقرار و نگهداری (Operations & Deployment Guide)
# Maya Spirulina Platform | سند استقرار، مانیتورینگ و بازیابی

---

## ۱. راهنمای راه‌اندازی و اجرای محیط توسعه (Local Development)

### پیش‌نیازها
* **Node.js:** نسخه 20.x یا بالاتر (پیشنهاد: Node 22 LTS).
* **Package Manager:** `npm` یا `pnpm`.
* **پایگاه داده:** PostgreSQL 16 (یا کانتینر داکر).
* **حافظه کش:** Redis 7 (یا سرویس ابری Upstash).

### گام‌های راه‌اندازی
```bash
# ۱. کلون و نصب وابستگی‌ها
npm install

# ۲. ایجاد فایل متغیرهای محیطی
cp .env.example .env

# ۳. تولید کلاینت پریزما و ساخت جداول
npx prisma generate
npx prisma migrate deploy
npm run db:seed

# ۴. اجرای سرور توسعه با پشتیبانی از Turbopack
npm run dev
# دسترسی: http://localhost:3000
```

---

## ۲. روش استقرار با داکر (Docker Production Deployment)

پروژه دارای ساختار آماده چندمرحله‌ای برای کاهش حجم ایمیج (`standalone`) در فایل `Dockerfile` و هماهنگی سرویس‌ها در `docker-compose.yml` است:

```mermaid
graph LR
    Dev[کدبیس و پیکربندی] --> Build[Docker Build Multi-Stage]
    Build --> Web[Next.js App Container :3000]
    Build --> DB[PostgreSQL Container :5432]
    Build --> Cache[Redis Container :6379]
    Web <--> DB
    Web <--> Cache
```

### دستورات استقرار یک‌خطی در سرور
```bash
# بیلد و بالا آوردن کانتینرهای سرویس در پس‌زمینه
docker compose up -d --build

# بررسی وضعیت سلامت کانتینرها
docker compose ps

# مشاهده زنده لاگ‌های سرور Next.js
docker compose logs -f web
```

---

## ۳. متغیرهای محیطی کلیدی (.env Configuration)

```env
# پیکربندی نام و محیط
NODE_ENV="production"
PORT=3000
NEXT_PUBLIC_APP_NAME="اسپیرولینا مایا | Maya Spirulina"
NEXT_PUBLIC_APP_URL="https://mayaspirulina.ir"

# پایگاه داده PostgreSQL
DATABASE_URL="postgresql://postgres:maya_secure_pwd@postgres:5432/maya_spirulina?schema=public"

# حافظه کش Redis
REDIS_URL="redis://redis:6379"

# کلید رمزنگاری سشن‌های JWT (حداقل ۳۲ کاراکتر رندوم)
JWT_SECRET="maya_spirulina_ultra_secure_jwt_secret_token_key_2026"

# وب‌سرویس پیامکی ایران
SMS_PROVIDER="kavenegar"
SMS_API_KEY="your-api-key-here"
SMS_OTP_TEMPLATE="maya-otp"
```

---

## ۴. استراتژی پشتیبان‌گیری و بازیابی داده‌ها (Backup & Recovery)

### ۴.۱. پشتیبان‌گیری خودکار روزانه از PostgreSQL
یک Cron Job استاندارد روی سرور لینوکس برای تهیه Dump فشرده از دیتابیس در ساعت ۲:۰۰ بامداد هر روز:
```bash
# دستور ایجاد دامپ فشرده با تاریخ شمسی/میلادی
docker exec -t maya-postgres pg_dump -U postgres maya_spirulina | gzip > /backups/maya_backup_$(date +%Y%m%d_%H%M%S).sql.gz

# نگهداری پشتیبان‌های ۳۰ روز گذشته و حذف نسخه‌های قدیمی‌تر
find /backups/ -type f -name "maya_backup_*.sql.gz" -mtime +30 -delete
```

### ۴.۲. سناریوی بازیابی بحران (Disaster Recovery)
در صورت بروز نقص در پایگاه داده یا تخریب سرور:
```bash
# بازگردانی فایل دامپ روی دیتابیس تمیز
gunzip < /backups/maya_backup_20261025.sql.gz | docker exec -i maya-postgres psql -U postgres -d maya_spirulina
```

---

## ۵. پایش سلامت و گزارش حوادث (Health Checks & Incident Response)

1. **مسیر پایش سلامت سرویس (Health Check):**
   - سرور آپ‌تایم باید هر ۶۰ ثانیه وضعیت روت `/api/auth/me` یا ریشه `/` را بررسی کرده و کد `200 OK` دریافت کند.
2. **پایش میزان مصرف حافظه و CPU:**
   - استفاده از `docker stats` برای جلوگیری از نشت حافظه (Memory Leaks).
3. **تریاژ حوادث و گزارش باگ (Incident Workflow):**
   - **سطح ۱ (بحرانی - قطع خرید/پرداخت):** رسیدگی فوری ظرف ۱۵ دقیقه، فعال‌سازی حالت نگهداشت و بررسی لاگ‌های پرداخت.
   - **سطح ۲ (اختلال در پیامک):** سوییچ فوری به پنل پیامکی دوم در `.env`.
   - **سطح ۳ (ایراد در ظاهر/طراحی):** اصلاح در محیط تست و استقرار بدون قطعی (Rolling Update).
