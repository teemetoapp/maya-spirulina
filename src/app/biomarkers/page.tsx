import { Metadata } from "next";
import { getSession, getCurrentUser } from "@/lib/auth";
import { CartProvider } from "@/lib/cart-context";
import StoreHeader from "@/components/storefront/StoreHeader";
import StoreFooter from "@/components/storefront/StoreFooter";
import CartDrawer from "@/components/storefront/CartDrawer";
import BiomarkerMatcherClient from "@/components/biomarkers/BiomarkerMatcherClient";

export const metadata: Metadata = {
  title: "سامانه تطبیق هوشمند آزمایش خون و نسخه مصرف | مایا اسپیرولینا",
  description:
    "تحلیل بیوشیمیایی نتایج آزمایش خون (فریتین، هموگلوبین، آنزیم‌های کبدی ALT/AST، تری‌گلیسرید و CRP) و تجویز دقیق‌ترین پروتکل دوزبندی ارگانیک مایا اسپیرولینا.",
  keywords: [
    "تطبیق آزمایش خون اسپیرولینا",
    "کبد چرب و اسپیرولینا",
    "فریتین پایین",
    "کم خونی فقر آهن",
    "آنزیم کبدی ALT",
    "تری گلیسرید",
    "بیومارکرهای آزمایشگاهی",
  ],
  openGraph: {
    title: "سامانه تطبیق هوشمند آزمایش خون | مایا اسپیرولینا",
    description:
      "تحلیل هوشمند شاخص‌های آزمایشگاهی و تجویز پروتکل مصرف بالینی سوپرفود مایا.",
    type: "website",
    locale: "fa_IR",
  },
};

export default async function BiomarkersPage() {
  const session = await getSession();
  const currentUser = await getCurrentUser();

  const userSession = session
    ? {
        name: currentUser?.name || "کاربر گرامی",
        phone: session.phone,
      }
    : null;

  return (
    <CartProvider>
      <div className="min-h-screen bg-white text-neutral-900 dark:bg-bg-page dark:text-neutral-100 flex flex-col justify-between">
        <StoreHeader userSession={userSession} />
        <main className="flex-1">
          <BiomarkerMatcherClient />
        </main>
        <CartDrawer />
        <StoreFooter />
      </div>
    </CartProvider>
  );
}
