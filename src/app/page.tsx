import { getFeaturedProduct } from "@/lib/commerce/catalog";
import { getModuleStates } from "@/lib/modules/server";
import { getSettings } from "@/lib/settings";
import StorePage from "@/components/storefront/StorePage";
import Hero from "@/components/storefront/home/Hero";
import Features from "@/components/storefront/home/Features";
import Section from "@/components/storefront/home/Section";
import ProductPicker from "@/components/storefront/home/ProductPicker";
import HowToUse from "@/components/storefront/home/HowToUse";
import Farm from "@/components/storefront/home/Farm";
import Faq from "@/components/storefront/home/Faq";
import CtaBand from "@/components/storefront/home/CtaBand";
import LatestArticles from "@/components/storefront/home/LatestArticles";
import VerifiedReviews from "@/components/storefront/VerifiedReviews";

export const metadata = {
  title: "مایا اسپیرولینا | پودر و کپسول اسپیرولینا از مزرعه آفرینش مایا",
  description: "پودر و کپسول اسپیرولینا مایا، مستقیم از مزرعه آفرینش مایا؛ با اطلاعات شفاف درباره مزرعه، فرایند تولید و مجوزها.",
  alternates: { canonical: "/" },
};

// صفحه اصلی: معرفی کوتاه، چرا مایا، خرید، راهنمای مصرف، مزرعه، نظرها، پرسش‌ها
export default async function HomePage() {
  const [product, m, s] = await Promise.all([getFeaturedProduct(), getModuleStates(), getSettings()]);
  return (
    <StorePage>
      <div id="main-content">
        <Hero license={s.LICENSE_SHILAT} trace={m.trace} />
        <Features consult={m.consultation} />
        {product && product.variants.length > 0 && (
          <Section id="order" title="خرید اسپیرولینا" subtitle="بسته متناسب با دوره مصرفتان را انتخاب کنید." muted>
            <ProductPicker product={product} />
          </Section>
        )}
        <HowToUse refill={m.refill} />
        <Farm trace={m.trace} />
        <VerifiedReviews />
        {m.blog && <LatestArticles />}
        <Faq returnDays={Number(s.RETURN_WINDOW_DAYS) || 0} trace={m.trace} />
        <CtaBand ambassadors={m.ambassadors} wholesale={m.wholesale} />
      </div>
    </StorePage>
  );
}
