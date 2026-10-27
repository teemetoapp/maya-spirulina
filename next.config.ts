import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  devIndicators: false, // the floating «N» badge in dev mode
  async redirects() {
    return [
      // آدرس قدیمی فرم سفیران
      { source: "/portal/ambassador/register", destination: "/portal/become-ambassador", permanent: true },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
