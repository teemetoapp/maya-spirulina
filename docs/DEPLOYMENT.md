# 🚀 راهنمای استقرار در سرور و محیط عملیاتی (Maya Spirulina Production Deployment Guide)

این راهنما مراحل استقرار پلتفرم تک‌محصولی و سیستم مدیریت یکپارچه «مایا اسپیرولینا» روی سرورهای ابری، هاست‌های اختصاصی لینوکس (Ubuntu 22.04 / 24.04 LTS) و کانتینرهای داکر (Docker & Docker Compose) را تشریح می‌کند.

---

## 🛠️ روش ۱: استقرار با Docker Compose (روش استاندارد و پیشنهادی)

داکر پایدارترین و سریع‌ترین روش برای راه‌اندازی تمام سرویس‌های همبسته (Next.js 16 + PostgreSQL 16 + Redis 7) در محیط ایزوله و بهینه‌سازی‌شده است.

### پیش‌نیازها
روی سرور لینوکس ابزارهای Docker و Docker Compose را نصب کنید:
```bash
sudo apt update && sudo apt install -y docker.io docker-compose-plugin
sudo systemctl enable --now docker
```

### مراحل راه‌اندازی گام به گام:
۱. دریافت کدهای پروژه روی سرور:
```bash
git clone https://github.com/<your-repo>/maya-spirulina.git /var/www/maya-spirulina
cd /var/www/maya-spirulina
```

۲. تنظیم متغیرهای محیطی:
```bash
cp .env.example .env
nano .env
```
*نکات مهم امنیتی در `.env`:*
- `POSTGRES_PASSWORD`: کلمه عبور قوی دیتابیس پستگرس
- `JWT_SECRET`: کلید رمزنگاری توکن‌ها (حداقل ۳۲ کاراکتر تصادفی)
- `SUPER_ADMIN_PHONE`: شماره موبایلی که نقش مدیر ارشد می‌گیرد
- `SMS_PROVIDER`: انتخاب وب‌سرویس پیامکی (`smsir` یا `kavenegar` یا `farazsms`) به همراه API Key مربوطه
- `PAYMENT_GATEWAY_MODE`: روی `production` (زرین‌پال) با `ZARINPAL_MERCHANT_ID`. حالت `mock` در production رد می‌شود.
- `CRON_SECRET`، کلیدهای تلگرام و SMTP: [NOTIFICATIONS.md](./NOTIFICATIONS.md)

۳. بیلد و اجرای کانتینرها در پس‌زمینه:
```bash
docker compose up --build -d
```

۴. مایگریشن و مقداردهی اولیه پایگاه‌داده **خودکار** است: سرویس `migrate` پیش از بالا آمدن `app` دستورهای `prisma migrate deploy` و `prisma db seed` را اجرا می‌کند (نقش‌ها، تنظیمات، قالب اعلان‌ها، محصول و مدیر ارشد). seed تکرارپذیر است و تغییرات مدیر را بازنویسی نمی‌کند.

۵. کران و وب‌هوک تلگرام (یک‌بار):
```bash
# crontab -e
*/10 * * * * curl -fsS -H "Authorization: Bearer <CRON_SECRET>" https://<site>/api/cron
```
ثبت وب‌هوک تلگرام در [NOTIFICATIONS.md](./NOTIFICATIONS.md) توضیح داده شده است.

۶. بررسی وضعیت سلامت کانتینرها:
```bash
docker compose ps
docker compose logs -f app
```

---

## 🖥️ روش ۲: استقرار مستقیم روی سرور با Node.js و PM2 و Nginx

اگر مایلید پروژه را بدون داکر به‌صورت Native بر روی سرور اجرا کنید:

### ۱. نصب Node.js 20 و PM2
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

### ۲. نصب پکیج‌ها و بیلد اپلیکیشن
```bash
cd /var/www/maya-spirulina
npm ci
npx prisma generate
npx prisma migrate deploy
npm run db:seed
npm run build
```

### ۳. راه‌اندازی سرویس با PM2
```bash
pm2 start npm --name "maya-spirulina" -- start
pm2 save
pm2 startup
```

### ۴. پیکربندی وب‌سرور Nginx (Reverse Proxy)
فایل `/etc/nginx/sites-available/mayaspirulina.conf` را ایجاد کنید:

```nginx
server {
    listen 80;
    server_name mayaspirulina.ir www.mayaspirulina.ir;

    client_max_body_size 20M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

فعال‌سازی کانفیگ و دریافت SSL رایگان با Let's Encrypt:
```bash
sudo ln -s /etc/nginx/sites-available/mayaspirulina.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d mayaspirulina.ir -d www.mayaspirulina.ir
```

---

## 📲 راهنمای پیکربندی سامانه‌های پیامکی ایران

### ۱. سامانه هوشمند پیامک ایران (`SMS_PROVIDER=smsir`):
برای اعلان‌های متنی (غیر از کد ورود) شماره خط `SMSIR_LINE_NUMBER` هم لازم است.

- `SMSIR_MARKETING_LINE_NUMBER`: خط تبلیغاتی جدا برای کمپین‌ها و پیامک بازگشت مشتری (اگر خالی باشد از خط خدماتی استفاده می‌شود؛ توصیه نمی‌شود).
- `SMS_INBOUND_SECRET`: رمز وب‌هوک پیامک دریافتی برای «لغو۱۱». آدرس وب‌هوک در پنل sms.ir: `https://<site>/api/sms/inbound?key=<SMS_INBOUND_SECRET>`
- `NEXT_PUBLIC_APP_URL`: باید دامنه واقعی سایت باشد؛ QR بچ‌ها، لینک پیامک‌ها و نقشه سایت از آن ساخته می‌شوند. QR چاپ‌شده با آدرس اشتباه قابل اصلاح نیست.
- کار زمان‌بندی‌شده `/api/cron` حالا این کارها را هم انجام می‌دهد: آزادسازی پاداش معرفی پس از مهلت مرجوعی، انقضای امتیاز، پیامک بازگشت مشتری (اگر روشن باشد) و درخواست نظر پس از تحویل.
- فایل‌های PDF برگه آزمایش را در `public/lab-reports/` بگذارید.
- هشدار خرابی: `TELEGRAM_BOT_TOKEN` و `TELEGRAM_ADMIN_CHAT_ID` (شناسه گروه مدیران) لازم است؛ از «مرکز کنترل ← سلامت سرویس‌ها» پیام آزمایشی بفرستید. برای حالت خاموشی کامل سرور، `https://<site>/api/health` را در یک سرویس پایش بیرونی (مثل UptimeRobot) ثبت کنید.
- PWA فقط روی HTTPS (یا localhost) نصب‌شدنی است.

- در پنل sms.ir یک کلید API بسازید و در `.env` قرار دهید:
  ```env
  SMS_PROVIDER="sms.ir"
  SMSIR_API_KEY="your-api-key"
  SMSIR_TEMPLATE_ID=100000  # قالب حاوی پارامتر {Code} برای ورود بدون رمز
  ```

### ۲. سامانه کاوه‌نگار (`kavenegar`):
- در پنل کاوه‌نگار الگوی Verify بسازید:
  ```env
  SMS_PROVIDER="kavenegar"
  KAVENEGAR_API_KEY="your-api-key"
  KAVENEGAR_OTP_TEMPLATE="maya-otp"
  ```

### ۳. سامانه فراز اس‌ام‌اس / IPPanel (`farazsms`):
- ایجاد پترن خدماتی در پنل:
  ```env
  SMS_PROVIDER="farazsms"
  FARAZSMS_API_KEY="your-api-key"
  FARAZSMS_PATTERN_CODE="pattern-code"
  FARAZSMS_ORIGINATOR="+983000..."
  ```

## پشتیبان‌گیری از اطلاعات

- **پشتیبان دیتابیس:** `npm run db:backup` یک نسخه فشرده کامل در پوشه `backups/` می‌سازد و ۳۰ نسخه آخر را نگه می‌دارد. این پوشه در گیت نمی‌رود.
  - **روزانه خودکار روی ویندوز:** در Task Scheduler یک کار روزانه با دستور `bash scripts/backup-db.sh` (Git Bash) در پوشه پروژه بسازید.
  - **روی سرور لینوکس:** `0 3 * * * cd /path/to/maya-spirulina && bash scripts/backup-db.sh` را در crontab بگذارید.
  - یک نسخه از `backups/` را هر هفته بیرون از سرور هم نگه دارید.
- **بازگردانی:** `gunzip -c backups/<file>.sql.gz | docker exec -i maya-spirulina-postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'` (روی یک دیتابیس خالی).
- **خروجی اکسل:**
  - مخاطبان: «مخاطبان › خروجی اکسل مخاطبان»، با دسترسی ویرایش کاربران
  - سود و زیان، سفارش‌ها و هزینه‌ها: «حسابداری و سود»
