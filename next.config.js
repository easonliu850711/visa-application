/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: '/visa-application',
  trailingSlash: false,
  reactStrictMode: true,

  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;