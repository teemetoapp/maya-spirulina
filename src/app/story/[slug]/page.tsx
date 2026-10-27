import React from "react";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getAmbassadorBySlug, getAllAmbassadors } from "@/data/ambassadors";
import { getCaseStudiesByAmbassadorSlug } from "@/data/case-studies";
import AmbassadorStoryClient from "@/components/story/AmbassadorStoryClient";
import { CartProvider } from "@/lib/cart-context";
import CartDrawer from "@/components/storefront/CartDrawer";

interface Props {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateStaticParams() {
  const ambassadors = getAllAmbassadors();
  return ambassadors.map((a) => ({
    slug: a.slug,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const ambassador = getAmbassadorBySlug(resolvedParams.slug);

  if (!ambassador) {
    return {
      title: "سفیر سلامت یافت نشد | مایا اسپیرولینا",
    };
  }

  return {
    title: `${ambassador.fullName} | پروتکل بالینی و داستان تحول با اسپیرولینا مایا`,
    description: `داستان شخصی، آزمایشات خون و پروتکل تجویزی ${ambassador.fullName} (${ambassador.specialty}) برای مراجعین با اسپیرولینا خالص مایا.`,
  };
}

export default async function AmbassadorStoryPage({ params }: Props) {
  const resolvedParams = await params;
  const ambassador = getAmbassadorBySlug(resolvedParams.slug);

  if (!ambassador) {
    notFound();
  }

  const caseStudies = getCaseStudiesByAmbassadorSlug(ambassador.slug);

  return (
    <CartProvider>
      <AmbassadorStoryClient
        ambassador={ambassador}
        caseStudies={caseStudies}
      />
      <CartDrawer />
    </CartProvider>
  );
}
