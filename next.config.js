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
  experimental: {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://yoursite.com'),
  },
};

module.exports = nextConfig;