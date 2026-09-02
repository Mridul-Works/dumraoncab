import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
