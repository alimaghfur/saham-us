/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    // Proxy /api/* to backend in dev so we don't fight CORS
    const backend = process.env.BACKEND_URL || "http://localhost:8000";
    return [
      {
        source: "/api/v1/:path*",
        destination: `${backend}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
