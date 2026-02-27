import createMDX from "@next/mdx";

const withMDX = createMDX({
  extension: /\.(md|mdx)$/u
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions: ["ts", "tsx", "md", "mdx"],
  experimental: {
    externalDir: true
  }
};

export default withMDX(nextConfig);
