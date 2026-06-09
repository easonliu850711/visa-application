const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: '/visa-application',
  trailingSlash: false,
  reactStrictMode: true,

  images: {
    unoptimized: true,
  },

  webpack: (config) => {
    config.resolve.alias['@'] = path.resolve(__dirname, 'src')
    return config
  },
};

module.exports = nextConfig;