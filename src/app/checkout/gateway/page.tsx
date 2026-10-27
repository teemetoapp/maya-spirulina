import { Suspense } from "react";
import TestGatewayClient from "@/components/storefront/TestGatewayClient";

export const metadata = {
  title: "درگاه پرداخت آزمایشی | مایا اسپیرولینا",
};

export default function TestGatewayPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bg-page" />}>
      <TestGatewayClient />
    </Suspense>
  );
}
