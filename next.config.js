/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: { 
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/privacy.html',
        destination: '/privacy',
      },
    ]
  },
};

module.exports = nextConfig;