import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Compress responses with gzip/brotli (default in production, explicit for clarity)
  compress: true,

  // Optimize package imports to reduce bundle size via tree-shaking
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },

  images: {
    // Deliver modern formats (AVIF first, then WebP, fallback to original)
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
    // Cache optimized images for 1 week on the device
    minimumCacheTTL: 604800,
  },

  // HTTP cache headers for static assets and API routes
  async headers() {
    return [
      {
        // Next.js static assets are content-hashed — cache forever
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // Public folder assets (favicon, images, etc.)
        source: "/public/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
