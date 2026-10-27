# نقش‌ها و سطح دسترسی (RBAC)

این سند توضیح می‌دهد چه کسی چه چیزی را در پرتال می‌بیند و چطور مدیر ارشد آن را تغییر می‌دهد.

## مدل

- **مجوز (Permission):** کوچک‌ترین واحد دسترسی، مثل `orders.manage`. فهرست کامل در `src/lib/rbac/permissions.ts` است و فقط با تغییر کد اضافه می‌شود.
- **نقش (Role):** مجموعه‌ای از مجوزها که در جدول `Role` ذخیره می‌شود. مدیر ارشد در «مدیریت › نقش‌ها و دسترسی‌ها» نقش می‌سازد، تیک مجوزها را تغییر می‌دهد و پیش‌نمایش منوی هر نقش را در هر سه محیط می‌بیند.
- **کاربر** می‌تواند چند نقش داشته باشد (`UserRole`).
- **دسترسی فردی:** مدیر ارشد از «مدیریت › مخاطبان › تب دسترسی‌ها» می‌تواند برای یک نفر مجوزی را **اضافه** (`User.extraPermissions`) یا **بگیرد** (`User.revokedPermissions`)، بدون اینکه نقش را برای همه تغییر دهد. مثال: اجازه ساخت گروه در پیام‌ها فقط برای یک پشتیبان.
- **دسترسی مؤثر** = مجوزهای همه نقش‌ها + مجوزهای اضافه‌شده − مجوزهای گرفته‌شده. از مدیر ارشد هیچ مجوزی گرفته نمی‌شود.
- مجوزها در **هر درخواست** از دیتابیس خوانده می‌شوند (`getAccess()` در `src/lib/rbac/server.ts`)، پس تغییر بلافاصله اعمال می‌شود. توکن نشست (JWT) فقط شناسه کاربر را دارد.
- **بلاک در پیام‌ها:** `User.chatBlocked`؛ کاربر بلاک‌شده گفتگوها را می‌بیند ولی نمی‌تواند پیام بفرستد یا گفتگو بسازد.

## قوانین محافظتی

- نقش «مدیر ارشد» (`super_admin`) همه مجوزها را دارد و قابل محدود کردن نیست. `npm run db:seed` مجوزهای تازه را به آن اضافه می‌کند.
- فقط مدیر ارشد می‌تواند نقش مدیر ارشد بدهد یا بگیرد و دسترسی فردی تعیین کند.
- هیچ‌کس نمی‌تواند حساب خودش را غیرفعال کند، خودش را بلاک کند یا نقش مدیر ارشد را از خودش بگیرد. مدیر ارشد بلاک نمی‌شود.
- نقش‌های سیستمی (`super_admin`، `ambassador`، `customer`) حذف نمی‌شوند؛ نقش غیرسیستمی فقط وقتی کاربری ندارد حذف می‌شود.
- هر تغییر نقش، مجوز، کیف پول، بلاک، و هر ویرایش یا حذف پیام توسط ناظر در «لاگ امنیتی» ثبت می‌شود.
- اولین مدیر ارشد: شماره `SUPER_ADMIN_PHONE` در `.env` هنگام `npm run db:seed`.

## سه لایه کنترل

| لایه | کجا | چه می‌کند |
| :-- | :-- | :-- |
| Proxy | `src/proxy.ts` | فقط بررسی می‌کند کاربر وارد شده باشد (`/portal/*`) |
| صفحه | `src/app/portal/[section]/page.tsx` | بخش بدون مجوز را به صفحه شروع کاربر برمی‌گرداند |
| API | `requireApi("…")` در هر route | بدون مجوز پاسخ ۴۰۳ می‌دهد؛ **مرجع اصلی امنیت همین لایه است** |

```ts
const auth = await requireApi("orders.manage");
if (auth instanceof Response) return auth;
// auth.userId, auth.permissions, auth.roleKeys, auth.chatBlocked
```

## مجوزها

| مجوز | توضیح | گروه |
| :-- | :-- | :-- |
| `portal.customer` | حساب کاربری (سفارش‌ها، کیف پول، امتیاز) | پرتال‌ها |
| `portal.ambassador` | پرتال سفیر (لینک معرفی، پورسانت، کیت سمپل) | پرتال‌ها |
| `portal.wholesale` | پنل همکار عمده (قیمت پلکانی، سفارش تعدادی؛ نقش سیستمی «همکار عمده») | پرتال‌ها |
| `dashboard.view` | داشبورد مدیریتی | عمومی |
| `chat.use` | پیام‌ها و هماهنگی داخلی (گفتگوی خصوصی) | عمومی |
| `chat.groups.create` | ساخت گروه در پیام‌ها | عمومی |
| `chat.moderate` | دیدن همه گفتگوها، ویرایش و حذف پیام دیگران، بلاک کاربر | عمومی |
| `orders.view` | مشاهده همه سفارش‌های سازمان | فروش |
| `orders.manage` | تغییر وضعیت سفارش و ثبت کد رهگیری | فروش |
| `carts.view` | سبدهای رهاشده | فروش |
| `products.view` | مشاهده محصولات | محصول و انبار |
| `products.manage` | ویرایش محصولات و قیمت‌ها | محصول و انبار |
| `inventory.manage` | موجودی و بچ‌های تولید | محصول و انبار |
| `costing.manage` | تعریف برگه بهای تمام‌شده کالاها | محصول و انبار |
| `ambassadors.manage` | سفیران و درخواست‌های همکاری | بازاریابی |
| `settlements.approve` | تأیید و پرداخت تسویه سفیران | بازاریابی |
| `samplekits.manage` | کیت‌های سمپل | بازاریابی |
| `marketing.manage` | کدهای تخفیف و کمپین‌ها | بازاریابی |
| `content.manage` | نظرات خریداران، بلاگ و محتوای آموزشی، پرونده‌های بالینی | بازاریابی |
| `finance.view` | حسابداری، سود و زیان (و مشاهده بهای تمام‌شده) | مالی |
| `finance.manage` | ثبت و ویرایش هزینه‌ها | مالی |
| `tickets.manage` | کانبان تیکت‌ها، پاسخ، ارجاع و اولویت | پشتیبانی |
| `users.view` | مشاهده مخاطبان | مدیریت سامانه |
| `users.manage` | ویرایش مخاطب، برچسب و یادداشت CRM، غیرفعال‌سازی | مدیریت سامانه |
| `roles.manage` | تعریف نقش و تعیین سطح دسترسی | مدیریت سامانه |
| `settings.manage` | تنظیمات فروشگاه و قوانین تجاری | مدیریت سامانه |
| `notifications.manage` | قالب‌ها و قوانین اعلان | مدیریت سامانه |
| `audit.view` | لاگ امنیتی | مدیریت سامانه |

## نقش‌های پیش‌فرض

| نقش | شناسه | مجوزها |
| :-- | :-- | :-- |
| مدیر ارشد | `super_admin` | همه |
| مدیر فروشگاه | `admin` | `portal.customer`، `dashboard.view`، `chat.use`، `orders.view`، `orders.manage`، `carts.view`، `products.view`، `products.manage`، `inventory.manage`، `ambassadors.manage`، `samplekits.manage`، `marketing.manage`، `content.manage`، `tickets.manage`، `users.view` |
| حسابدار | `accountant` | `portal.customer`، `dashboard.view`، `chat.use`، `orders.view`، `finance.view`، `finance.manage`، `costing.manage`، `settlements.approve` |
| انباردار | `warehouse` | `portal.customer`، `chat.use`، `orders.view`، `orders.manage`، `products.view`، `inventory.manage` |
| پشتیبان | `support` | `portal.customer`، `chat.use`، `orders.view`، `tickets.manage`، `users.view` |
| سفیر برند | `ambassador` | `portal.customer`، `portal.ambassador` |
| مشتری | `customer` | `portal.customer` |

## محیط‌ها (سوییچر منوی بالا)

پرتال سه محیط دارد و هر کاربر در منوی بالا فقط محیط‌هایی را می‌بیند که حداقل یک بخش آن برایش باز است؛ «نمای فروشگاه» هم همیشه هست. منوی راست فقط بخش‌های محیط فعلی را نشان می‌دهد (`getAllowedAreas()` در `src/lib/portal/sections.ts`).

| محیط | شناسه | صفحه شروع | چه کسی |
| :-- | :-- | :-- | :-- |
| پنل مدیریت | `admin` | `/portal/overview` | کارکنان و مدیر ارشد |
| پرتال سفیر | `ambassador` | `/portal/ambassador` | سفیران و مدیر ارشد |
| حساب من | `account` | `/portal/home` | همه |

مدیر ارشد به هر سه محیط و نمای فروشگاه دسترسی دارد.

## بخش‌ها

| بخش | آدرس | محیط / گروه | مجوز لازم (یکی کافی است) |
| :-- | :-- | :-- | :-- |
| داشبورد | `/portal/home` | حساب من | `portal.customer` |
| سفارش‌های من | `/portal/my-orders` | حساب من | `portal.customer` |
| کیف پول و امتیاز | `/portal/wallet` | حساب من | `portal.customer` |
| آدرس‌ها | `/portal/addresses` | حساب من | `portal.customer` |
| تیکت | `/portal/my-tickets` | حساب من | `portal.customer` |
| پروفایل (اطلاعات تکمیلی به «مخاطبان» وصل است) | `/portal/profile` | حساب من | `portal.customer` |
| سفیر برند شوید | `/portal/become-ambassador` | حساب من | `portal.customer` (برای سفیر پنهان) |
| داشبورد سفیر | `/portal/ambassador` | پرتال سفیر | `portal.ambassador` |
| لینک و QR | `/portal/ambassador-links` | پرتال سفیر | `portal.ambassador` |
| زیرمجموعه‌ها | `/portal/ambassador-referrals` | پرتال سفیر | `portal.ambassador` |
| پورسانت و تسویه | `/portal/ambassador-settlements` | پرتال سفیر | `portal.ambassador` |
| کیت سمپل | `/portal/ambassador-samples` | پرتال سفیر | `portal.ambassador` |
| تیکت | `/portal/ambassador-tickets` | پرتال سفیر | `portal.ambassador` |
| پروفایل | `/portal/ambassador-profile` | پرتال سفیر | `portal.ambassador` |
| داشبورد مدیریتی (نمودارها و شاخص‌های سازمان) | `/portal/overview` | مدیریت / عمومی | `dashboard.view` |
| پیام‌ها و هماهنگی | `/portal/messages` | مدیریت / عمومی | `chat.use` |
| همه سفارش‌ها (`?q=` برای جستجو) | `/portal/orders` | مدیریت / فروش | `orders.view` |
| سبدهای رهاشده | `/portal/abandoned` | مدیریت / فروش | `carts.view` |
| محصولات و انبار | `/portal/catalog` | مدیریت / محصول | `products.view` یا `inventory.manage` |
| بهای تمام‌شده | `/portal/costing` | مدیریت / محصول | `costing.manage` یا `finance.view` (ذخیره: `costing.manage`) |
| سفیران و تسویه | `/portal/ambassadors` | مدیریت / بازاریابی | `ambassadors.manage` یا `settlements.approve` |
| کیت سمپل | `/portal/samplekits` | مدیریت / بازاریابی | `samplekits.manage` |
| کوپن و کمپین | `/portal/promotions` | مدیریت / بازاریابی | `marketing.manage` |
| دیدگاه‌ها و پرونده‌های بالینی | `/portal/content` | مدیریت / بازاریابی | `content.manage` |
| حسابداری و سود | `/portal/finance` | مدیریت / مالی | `finance.view` |
| تیکت‌ها (کانبان) | `/portal/tickets` | مدیریت / پشتیبانی | `tickets.manage` |
| مخاطبان (`?id=` پرونده یک نفر) | `/portal/contacts` | مدیریت | `users.view` |
| نقش‌ها و دسترسی‌ها | `/portal/users` | مدیریت | `roles.manage` یا `users.view` |
| تنظیمات و قوانین | `/portal/settings` | مدیریت | `settings.manage` یا `notifications.manage` |
| لاگ امنیتی | `/portal/audit` | مدیریت | `audit.view` |

## ماژول‌ها (مرکز کنترل سازمان › ماژول‌ها و قوانین)

هر قابلیت سایت یک ماژول در `src/lib/modules/registry.ts` است و مدیر ارشد (مجوز `modules.manage`) آن را خاموش یا روشن می‌کند و قوانینش را ویرایش می‌کند.

- **دسترسی نهایی** = مجوزهای نقش + دسترسی فردی − دسترسی گرفته‌شده − **مجوزهای ماژول‌های خاموش**. مدیر ارشد همیشه همه مجوزها را دارد، جز مجوزهای ماژول خاموش.
- `getAccess()` علاوه بر `permissions`، فهرست `modules` (ماژول‌های روشن) و `tokens` (مجوزها + `module:<key>`) برمی‌گرداند. منو و دسترسی صفحه‌ها با `tokens` ساخته می‌شوند.
- بخشی که در `sections` یک ماژول آمده فقط وقتی دیده می‌شود که آن ماژول روشن باشد.
- API ماژول‌هایی که مجوز اختصاصی ندارند با `moduleGuard("key")` بسته می‌شوند. اثرهای سمت سرور (پرداخت، کوپن، لینک سفیر، امتیاز، اعلان، cron) با `isModuleEnabled` / `getModuleStates` چک می‌شوند.
- `dependsOn`: ماژولی که پیش‌نیازش خاموش است، خودش هم عملاً خاموش است (مثلاً کیت سمپل بدون سفیران).
- خاموش کردن ماژول هسته (`core`) تأیید تایپی می‌خواهد. هر تغییر در لاگ امنیتی ثبت می‌شود (`module.enable`, `module.disable`, `module.rules`, `module.rules_reset`).
- قوانین هر ماژول همان کلیدهای `Setting` هستند با نوع، حداقل و حداکثر؛ تب «فروشگاه» در تنظیمات حذف شد چون همه قوانین به کارت ماژول‌ها منتقل شدند.

## پرتال مشاور

نقش `consultant` (مشاور تغذیه) با مجوز `portal.consultant` درخواست‌های مشاوره ارجاع‌شده به خودش و ارجاع‌نشده‌ها را می‌بیند و پاسخ می‌دهد. `consult.manage` همه درخواست‌ها را می‌بیند و به مشاوران ارجاع می‌دهد. مشتری از «حساب من › مشاوره تغذیه» فرم مشاوره پر می‌کند.

## افزودن مجوز یا بخش جدید

1. مجوز را به `PERMISSIONS` در `src/lib/rbac/permissions.ts` اضافه کنید (و در صورت نیاز به نقش‌های پیش‌فرض).
2. بخش را با `area` و `group` به `PORTAL_SECTIONS` در `src/lib/portal/sections.ts` اضافه کنید و آیکون آن را در `portal-icons.tsx` بگذارید.
3. رندر بخش را در `src/app/portal/[section]/page.tsx` اضافه کنید.
4. هر API آن بخش را با `requireApi` محافظت کنید.
5. `npm run db:seed` تا مدیر ارشد مجوز تازه را بگیرد؛ برای نقش‌های دیگر، مدیر ارشد تیک آن را می‌زند یا از «مخاطبان» به یک نفر می‌دهد.


## گفت‌وگوی آنلاین و ارتباط با مشتری

- `livechat.answer`: پاسخ به همه گفت‌وگوهای آنلاین سایت (پشتیبانی، فروش، مشاوره)، ارجاع، بستن و تبدیل به تیکت. مشاور بدون این مجوز فقط گفت‌وگوهای «مشاوره» را در «پرتال مشاور › گفت‌وگوی آنلاین مشاوره» می‌بیند.
- `crm.followup`: ثبت تماس و ارتباط در پرونده مخاطب (کانال، موضوع، رضایت، یادآوری پیگیری)، تعیین مرحله قیف و مسئول ارتباط، و صفحه «پیگیری‌ها».
- این دو مجوز یک‌بار هنگام seed به نقش‌های `admin` و `support` موجود اضافه می‌شوند (نشانه در لاگ امنیتی: `seed.permission_grant`)؛ اگر مدیر بعداً برشان دارد دوباره اضافه نمی‌شوند.
- منوی هر نقش در «نقش‌ها و دسترسی‌ها › منوی هر نقش» با تیک هر بخش قابل ویرایش است (دسترسی `roles.manage`). روشن کردن بخش، اولین مجوز لازم آن را می‌دهد و خاموش کردن، همه مجوزهای بازکننده آن را برمی‌دارد؛ اگر بخش دیگری هم از منو بیفتد هشدار داده می‌شود.
