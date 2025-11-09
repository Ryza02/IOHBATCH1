/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["mysql2"],
  productionBrowserSourceMaps: false,
  swcMinify: false,
  webpack: (config, { dev }) => {
    if (dev) {
      // Kurangi jejak memori saat dev
      config.cache = false;
      config.infrastructureLogging = { level: "error" };
      config.snapshot = { module: {}, resolve: {}, resolveBuildDependencies: {} };
    }
    return config;
  },
};

export default nextConfig;
