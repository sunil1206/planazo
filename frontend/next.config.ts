import type { NextConfig } from "next";

/**
 * INTERNAL_API_URL  = internal Docker service URL (http://django:8000)
 *                     used for server-side rewrites when running in Docker
 * NEXT_PUBLIC_API_URL = browser-visible URL (http://localhost:8000)
 *                     used by client-side JS
 */
const INTERNAL_API  = process.env.INTERNAL_API_URL  || process.env.NEXT_PUBLIC_API_URL  || "http://localhost:8000";
const INTERNAL_FAST = process.env.INTERNAL_FAST_URL || process.env.NEXT_PUBLIC_FASTAPI_URL || "http://localhost:8001";

const nextConfig: NextConfig = {
  // Production standalone build (used by Dockerfile.prod)
  output: process.env.NODE_ENV === "production" ? "standalone" : undefined,

  // Allow HMR from Docker / Nginx IPs in development
  allowedDevOrigins: [
    "127.0.0.1",
    "localhost",
    "172.21.0.1",
    "172.20.0.1",
    "0.0.0.0",
  ],

  images: {
    remotePatterns: [
      { protocol: "http",  hostname: "localhost" },
      { protocol: "http",  hostname: "127.0.0.1" },
      { protocol: "http",  hostname: "django" },
      { protocol: "https", hostname: "planazo.in" },
      { protocol: "https", hostname: "*.planazo.in" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },

  async redirects() {
    return [
      { source: "/dashboard/invitations", destination: "/dashboard/invites",    permanent: false },
      { source: "/dashboard/gallery",     destination: "/dashboard/gallery-v2", permanent: false },
    ];
  },

  async rewrites() {
    return [
      // Proxy Django REST API — destination uses INTERNAL_API so Docker SSR works
      {
        source:      "/api/backend/:path*",
        destination: `${INTERNAL_API}/api/:path*`,
      },
      // Proxy FastAPI AI service
      {
        source:      "/api/v1/:path*",
        destination: `${INTERNAL_FAST}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;

