/** @type {import('next').NextConfig} */
const nextConfig = {
  publicRuntimeConfig: {
    apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
  },
  eslint: {
    // Disable ESLint during build to prevent warnings from blocking deployment
    ignoreDuringBuilds: false,
  },
}

module.exports = nextConfig
