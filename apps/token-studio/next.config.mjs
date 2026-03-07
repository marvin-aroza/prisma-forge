import createMDX from "@next/mdx";

const withMDX = createMDX({
  extension: /\.(md|mdx)$/u
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions: ["ts", "tsx", "md", "mdx"],
  allowedDevOrigins: ["http://127.0.0.1:3100", "127.0.0.1:3100"],
  experimental: {
    externalDir: true
  }
};

export default withMDX(nextConfig);
