import { getSession, getCurrentUser } from "@/lib/auth";
import { CartProvider } from "@/lib/cart-context";
import StoreHeader from "@/components/storefront/StoreHeader";
import StoreFooter from "@/components/storefront/StoreFooter";
import CartDrawer from "@/components/storefront/CartDrawer";

// قاب مشترک صفحه‌های ساده سایت (سربرگ، سبد خرید، پابرگ)
export default async function StorePage({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const user = session ? await getCurrentUser() : null;
  const userSession = session ? { name: user?.name || "کاربر گرامی", phone: session.phone } : null;
  return (
    <CartProvider>
      <div className="min-h-screen bg-white text-neutral-900 dark:bg-bg-page dark:text-neutral-100 flex flex-col justify-between">
        <StoreHeader userSession={userSession} />
        <main className="flex-1">{children}</main>
        <CartDrawer />
        <StoreFooter />
      </div>
    </CartProvider>
  );
}
