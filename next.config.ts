import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  env: {
    DATABASE_URL: process.env.DATABASE_URL || "file:./prisma/dev.db",
    AUTH_SECRET: process.env.AUTH_SECRET || "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    AUTH_TRUST_HOST: process.env.AUTH_TRUST_HOST || "true",
    META_TOKEN_ENCRYPTION_KEY: process.env.META_TOKEN_ENCRYPTION_KEY || "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  },
};

export default nextConfig;
