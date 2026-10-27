# 🤝 راهنمای مشارکت و توسعه در پروژه (Contribution & Forking Guide)

از علاقه شما به مشارکت در توسعه پلتفرم «لوسیا بیوتی» سپاسگزاریم. این سند راهنمایی جامع برای نحوه ایجاد فورک، افزودن ماژول‌های جدید، استانداردسازی کد و ارسال پول‌ریکوئست‌ها (Pull Requests) است.

---

## 🍴 ۱. ایجاد فورک و آماده‌سازی مخزن محلی (Fork & Setup)

۱. دکمه **Fork** در بالای صفحه مخزن گیت‌هاب را بزنید.
۲. مخزن فورک‌شده خود را کلون نمایید:
   ```bash
   git clone https://github.com/<your-username>/lucia-cosmetics.git
   cd lucia-cosmetics
   ```
۳. ریموت مخزن اصلی (Upstream) را جهت همگام‌سازی‌های بعدی ثبت کنید:
   ```bash
   git remote add upstream https://github.com/original-owner/lucia-cosmetics.git
   ```
۴. وابستگی‌ها را نصب نمایید:
   ```bash
   npm install
   ```

---

## 🌿 ۲. استراتژی برنچ‌بندی (Branching Strategy)

همواره شاخه جدیدی از `main` جدا کنید و از ارسال مستقیم تغییرات روی شاخه اصلی خودداری فرمایید:

- ماژول یا قابلیت جدید: `feature/module-name` (مانند `feature/skin-quiz`)
- اصلاح باگ یا ایراد ظاهری: `fix/checkout-sheba-validation`
- به‌روزرسانی مستندات: `docs/readme-updates`
- بهینه‌سازی عملکرد یا ریفکتور: `refactor/cart-drawer-state`

---

## 📐 ۳. استانداردهای کدنویسی و اصول معماری

### ۱. رعایت قوانین واژگان و ادبیات برند (Mandatory Terminology)
در این پلتفرم رعایت واژگان اختصاصی الزامی است:
- بخش مالی همواره با عنوان **«حسابداری و تراز مالی»** قید شود (از درج واژه «سبک» پس از حسابداری اکیداً پرهیز شود).
- همکاران افیلیت و تولیدکنندگان محتوا منحصراً با عنوان **«سفیران»** یا **«سفیران برند»** نام‌گذاری شوند (واژگان بلاگر در سراسر پروژه ممنوع است).
- از استفاده از نام‌های متفرقه قالب‌های ادمین پرهیز شده و صرفاً از عناوین بومی سازمانی مانند «پرتال مدیریت» استفاده شود.

### ۲. نمایش ارقام، مبالغ و تاریخ‌ها
- تمامی اعداد در رابط کاربری باید فارسی باشند: از توابع `toPersianDigits()` در `src/lib/currency.ts` استفاده کنید.
- تمامی مبالغ مالی باید با واحد تومان و فرمت‌بندی استاندارد هزارگان با `formatToman()` نمایش داده شوند.
- تاریخ‌ها باید تقویم جلالی شمسی باشند (`lib/jalali.ts`).

### ۳. استایل‌دهی و تم (Tailwind CSS v4 & Theming)
- تمام کامپوننت‌ها باید هر دو حالت **تم روز (Light)** و **تم شب (Dark)** را به‌صورت روان و با کنتراست استاندارد پشتیبانی کنند:
  - کانتینرها: `bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800`
  - متون اصلی: `text-stone-900 dark:text-white`
  - متون فرعی: `text-stone-500 dark:text-stone-400`
  - رنگ‌های اکسنت و دکمه‌های اقدام: زرشکی رزگلد لوسیا (`bg-rose-700 hover:bg-rose-800 text-white`) یا زمردی انبارداری (`bg-emerald-600 text-white`).

### ۴. افزودن ماژول جدید به پنل ادمین
برای افزودن یک ماژول مدیریتی جدید:
۱. کامپوننت ماژول را در پوشه `src/components/admin/` بسازید (همانند `MyNewManager.tsx`).
۲. تایپ `AdminTab` را در `src/components/admin/AdminDashboardClient.tsx` با تب جدید گسترش دهید.
۳. در `src/components/admin/AdminOverview.tsx` نوع تابع `onNavigate` را با تب جدید همگام کنید.
۴. آیتم تب را در نوار کناری (Sidebar) در یکی از ۴ گروه متناسب قرار دهید (`NAVIGATION`, `E-COMMERCE`, `APPLICATION`, `SYSTEM`).
۵. کارت کنترل ماژول را در سوئیچ‌برد سراسری `src/components/admin/StoreSettingsManager.tsx` ثبت نمایید.
۶. مشخصات ماژول را در `PROJECT_ROADMAP.md` مستند کنید.

---

## 🧪 ۴. تست و اعتبارسنجی بیلد (Verification Checklist)

قبل از کامیت و ارسال هر پول‌ریکوئست، اجرای دستور زیر در ترمینال **اجباری** است:

```bash
npm run build
```

✅ شرط پذیرش تغییرات:
- اتمام بیلد با **Exit Code 0**
- عدم وجود هرگونه خطای تایپ‌اسکریپت (`TypeScript Type Errors`)
- کامپایل موفق تمامی روت‌های استاتیک و دینامیک Next.js

---

## 📝 ۵. ساختار کامیت‌ها (Commit Message Conventions)

از استانداردهای مرسوم Conventional Commits بهره بگیرید:
- `feat: add skin diagnostic quiz module`
- `fix: resolve mobile cart drawer overflow issue`
- `docs: update roadmap with phase 8 milestones`
- `style: refine dark mode contrast on audit logs table`

---

با تشکر از همکاری و همیاری شما در ارتقای این پروژه!
