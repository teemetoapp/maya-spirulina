import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import Script from "next/script";
import { ThemeProvider } from "@/lib/theme-context";
import LiveChatWidget from "@/components/livechat/LiveChatWidget";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import "./globals.css";

const vazir = localFont({
  src: "../fonts/Vazirmatn-Variable.woff2",
  variable: "--font-vazirmatn",
  display: "swap",
  weight: "100 900",
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#070a10" },
  ],
};

export const metadata: Metadata = {
  title: "مایا اسپیرولینا | سوپرفود خالص بیوتکنولوژی (Maya Spirulina)",
  description: "پودر و کپسول اسپیرولینا مایا، تولید مستقیم مزرعه آفرینش مایا با اطلاعات شفاف درباره مزرعه، فرایند تولید و مجوزها",
  appleWebApp: { capable: true, title: "مایا", statusBarStyle: "default" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning className={`${vazir.variable} font-sans`}>
      <body className="min-h-screen bg-bg-page text-text-main flex flex-col font-sans selection:bg-emerald-500 selection:text-white transition-colors duration-200">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:right-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-emerald-500 focus:text-black focus:font-extrabold focus:text-xs focus:rounded-lg focus:shadow-lg focus:outline-none"
        >
          پرش به محتوای اصلی
        </a>
        <Script
          id="maya-theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var t = localStorage.getItem('maya_theme');
                  var isDark = t === 'dark';
                  if (isDark) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
        <ThemeProvider>
          {children}
          <LiveChatWidget />
          <ServiceWorkerRegister />
        </ThemeProvider>
      </body>
    </html>
  );
}

