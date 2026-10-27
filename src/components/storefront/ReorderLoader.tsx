"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useCart, type CartItem } from "@/lib/cart-context";

// «سفارش دوباره» از یادآوری تمدید: سبد را با اقلام سفارش قبلی پر می‌کند
export default function ReorderLoader({ items, coupon }: { items: CartItem[]; coupon: string | null }) {
  const { replaceItems, isHydrated, setIsOpen } = useCart();
  const router = useRouter();
  const done = useRef(false);

  useEffect(() => {
    if (!isHydrated || done.current) return;
    done.current = true;
    replaceItems(items);
    setIsOpen(false);
    // پارامتر reorder حذف می‌شود تا با رفرش صفحه، سبد دوباره بازنویسی نشود
    router.replace(coupon ? `/checkout?coupon=${encodeURIComponent(coupon)}` : "/checkout");
  }, [isHydrated, items, coupon, replaceItems, setIsOpen, router]);

  return null;
}
