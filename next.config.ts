import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  // The SQLite db file is only referenced at runtime via DATABASE_URL, so Next's
  // build-time dependency tracing can't see it and won't bundle it into the
  // deployed serverless function unless told to explicitly.
  outputFileTracingIncludes: {
    "/**": ["./prisma/prisma/dev.db"],
  },
};

export default nextConfig;
