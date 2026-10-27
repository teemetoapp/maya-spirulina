import { Metadata } from "next";
import { getSession, getCurrentUser } from "@/lib/auth";
import { CartProvider } from "@/lib/cart-context";
import StoreHeader from "@/components/storefront/StoreHeader";
import StoreFooter from "@/components/storefront/StoreFooter";
import CartDrawer from "@/components/storefront/CartDrawer";
import ResearchHubClient from "@/components/research/ResearchHubClient";

export const metadata: Metadata = {
  title: "پایگاه پژوهش‌های بالینی و مقالات بیوتکنولوژی | مایا اسپیرولینا",
  description:
    "مجموعه مقالات علمی داوری‌شده، کارآزمایی‌های بالینی و مستندات بیوشیمیایی پیرامون خواص فیکوسیانین، درمان کم‌خونی فقر آهن، ریکاوری ورزشی و استانداردهای پرس سرد مایا اسپیرولینا.",
  keywords: [
    "اسپیرولینا",
    "فیکوسیانین",
    "مقالات بالینی اسپیرولینا",
    "درمان کم خونی",
    "ریکاوری ورزشی",
    "کبد چرب",
    "سوپرفود ارگانیک",
  ],
  openGraph: {
    title: "پایگاه پژوهش‌های بالینی و مقالات بیوتکنولوژی | مایا اسپیرولینا",
    description:
      "مطالعات بالینی داوری‌شده و مستندات بیوشیمیایی پیرامون خواص درمانی و بیولوژیک اسپیرولینا مایا.",
    type: "website",
    locale: "fa_IR",
  },
};

export default async function ResearchPage() {
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
          <ResearchHubClient />
        </main>
        <CartDrawer />
        <StoreFooter />
      </div>
    </CartProvider>
  );
}
