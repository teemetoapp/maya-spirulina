import { Metadata } from "next";
import { notFound } from "next/navigation";
import { ARTICLES_DATA } from "@/data/articles";
import { getSession, getCurrentUser } from "@/lib/auth";
import { CartProvider } from "@/lib/cart-context";
import StoreHeader from "@/components/storefront/StoreHeader";
import StoreFooter from "@/components/storefront/StoreFooter";
import CartDrawer from "@/components/storefront/CartDrawer";
import ArticleDetailClient from "@/components/research/ArticleDetailClient";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return ARTICLES_DATA.map((article) => ({
    slug: article.slug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = ARTICLES_DATA.find((a) => a.slug === slug);

  if (!article) {
    return {
      title: "مقاله یافت نشد | مایا اسپیرولینا",
    };
  }

  return {
    title: `${article.title} | پایگاه مقالات مایا اسپیرولینا`,
    description: article.excerpt,
    keywords: [...article.tags, "اسپیرولینا", "مایا", "بیوتکنولوژی", "پژوهش بالینی"],
    authors: [{ name: article.author.name }],
    openGraph: {
      title: article.title,
      description: article.excerpt,
      type: "article",
      publishedTime: article.publishedAt,
      authors: [article.author.name],
      locale: "fa_IR",
    },
  };
}

export default async function ArticleDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const article = ARTICLES_DATA.find((a) => a.slug === slug);

  if (!article) {
    notFound();
  }

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
          <ArticleDetailClient article={article} />
        </main>
        <CartDrawer />
        <StoreFooter />
      </div>
    </CartProvider>
  );
}
