import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/classify-text": ["./data/cc-cedict-vocabulary-index.json.gz"],
  },
};

export default nextConfig;
