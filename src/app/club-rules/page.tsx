import type { Metadata } from "next";
import StorePage from "@/components/storefront/StorePage";
import { getSettings } from "@/lib/settings";
import { getModuleStates } from "@/lib/modules/server";
import { toPersianDigits, formatToman } from "@/lib/currency";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "قوانین باشگاه مشتریان، مرجوعی و حریم خصوصی | مایا اسپیرولینا" };

// همه اعداد از قوانین زنده ماژول‌ها خوانده می‌شوند تا متن با رفتار سایت یکی باشد
export default async function ClubRulesPage() {
  const [s, m] = await Promise.all([getSettings(), getModuleStates()]);
  const n = (k: keyof typeof s) => toPersianDigits(Number(s[k]) || 0);
  const expiry = Number(s.POINTS_EXPIRY_DAYS) || 0;
  return (
    <StorePage>
      <article className="max-w-3xl mx-auto px-4 py-12 space-y-8 text-sm leading-8">
        <header className="space-y-2">
          <h1 className="text-2xl font-black">قوانین باشگاه مشتریان مایا</h1>
          <p className="text-text-muted">این صفحه همیشه با تنظیمات فعلی سایت به‌روز است.</p>
        </header>

        {m.loyalty && (
          <section className="space-y-2">
            <h2 className="text-lg font-bold">امتیاز</h2>
            <ul className="list-disc pr-5 space-y-1">
              <li>هدیه عضویت: {n("SIGNUP_REWARD_POINTS")} امتیاز.</li>
              <li>به ازای هر ۱۰۰ هزار تومان خرید تحویل‌شده: {n("PURCHASE_POINTS_PER_100K")} امتیاز.</li>
              <li>ارزش هر امتیاز {formatToman(Number(s.POINTS_TO_TOMAN_RATIO) || 0)} است و از {n("MIN_POINTS_TO_REDEEM")} امتیاز به بالا به اعتبار کیف پول تبدیل می‌شود.</li>
              <li>{expiry > 0 ? `هر امتیاز ${toPersianDigits(expiry)} روز پس از دریافت منقضی می‌شود؛ امتیازهای قدیمی‌تر زودتر مصرف می‌شوند.` : "امتیازها تاریخ انقضا ندارند."}</li>
              <li>با مرجوع شدن سفارش، امتیاز آن سفارش باطل می‌شود.</li>
            </ul>
          </section>
        )}

        {m.loyalty && Number(s.REFERRAL_REWARD_POINTS) > 0 && (
          <section className="space-y-2">
            <h2 className="text-lg font-bold">معرفی دوستان</h2>
            <ul className="list-disc pr-5 space-y-1">
              <li>وقتی دوستی با کد شما عضو شود و اولین خریدش تحویل شود، {n("REFERRAL_REWARD_POINTS")} امتیاز می‌گیرید.</li>
              <li>پاداش فقط به معرف مستقیم داده می‌شود (یک سطح). از خریدهای افرادی که دوستتان معرفی می‌کند پاداشی به شما نمی‌رسد؛ مایا بازاریابی چندسطحی ندارد.</li>
              <li>پاداش پس از پایان مهلت مرجوعی ({n("RETURN_WINDOW_DAYS")} روز) آزاد می‌شود. سقف پاداش هر نفر {n("REFERRAL_MAX_PER_MONTH")} معرفی در ماه است.</li>
              <li>معرفی خود (شماره یا آدرس یکسان) پاداش ندارد.</li>
            </ul>
          </section>
        )}

        {m.ambassadors && (
          <section className="space-y-2">
            <h2 className="text-lg font-bold">سفیران برند</h2>
            <p>
              خرید با لینک یا کد سفیر {n("AMBASSADOR_CUSTOMER_DISCOUNT")}٪ تخفیف دارد. پورسانت سفیر فقط از فروش مستقیم خودش است، پس از تحویل سفارش پرداخت
              می‌شود و با مرجوعی کسر می‌شود. پورسانت از زیرمجموعه‌های سفیران دیگر وجود ندارد.
            </p>
          </section>
        )}

        <section className="space-y-2">
          <h2 className="text-lg font-bold">مرجوعی</h2>
          <p>
            تا {n("RETURN_WINDOW_DAYS")} روز پس از تحویل می‌توانید از «سفارش‌های من» درخواست مرجوعی ثبت کنید. پس از بررسی و دریافت کالا، مبلغ به کیف پول
            شما برمی‌گردد و قابل تسویه است.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-bold">پیامک و حریم خصوصی</h2>
          <ul className="list-disc pr-5 space-y-1">
            <li>پیامک‌های سفارش (کد ورود، پرداخت، ارسال) برای همه ارسال می‌شود.</li>
            <li>پیامک تخفیف و جشنواره فقط با رضایت شما ارسال می‌شود و با ارسال «۱۱» یا از صفحه پروفایل لغو می‌شود.</li>
            <li>اطلاعات شما فقط برای ارسال سفارش، پشتیبانی و مشاوره استفاده می‌شود و به شخص دیگری فروخته نمی‌شود.</li>
          </ul>
        </section>
      </article>
    </StorePage>
  );
}
