import type { MetadataRoute } from "next";

// نصب سایت روی گوشی (PWA)
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "مایا اسپیرولینا",
    short_name: "مایا",
    description: "خرید اسپیرولینا، پیگیری سفارش، کیف پول و پنل سفیران",
    lang: "fa",
    dir: "rtl",
    start_url: "/portal",
    scope: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#047857",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "سفارش‌های من", url: "/portal/my-orders" },
      { name: "خرید", url: "/#order" },
    ],
  };
}
