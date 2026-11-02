import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Car photo uploads (admin fleet form) go through a Server Action and may be up to 5 MB;
      // the default 1 MB limit would reject them. Extra room for multipart overhead.
      bodySizeLimit: "6mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/dwfe5swye/**",
      },
    ],
  },
  async redirects() {
    return [
      // The previous live site served the fleet at /gallery — keep that URL working.
      { source: "/gallery", destination: "/fleet", permanent: true },
    ];
  },
};

export default nextConfig;
