import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  transpilePackages: ['agunwami-backend'],
  devIndicators: false,
  images: {
    unoptimized: true,
  },
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      firebase: path.resolve(__dirname, 'node_modules/firebase'),
      '@firebase': path.resolve(__dirname, 'node_modules/@firebase'),
    };

    // Next.js 16's css-loader misinterprets the `&` selector in Tailwind v4
    // @variant rules as a url() import (resolves as './&').
    // Disabling url resolution in css-loader fixes this.
    for (const rule of config.module.rules) {
      if (!rule || typeof rule !== 'object') continue;
      const oneOf = (rule as { oneOf?: unknown[] }).oneOf;
      if (!Array.isArray(oneOf)) continue;
      for (const subRule of oneOf) {
        if (!subRule || typeof subRule !== 'object') continue;
        const use = (subRule as { use?: unknown[] }).use;
        if (!Array.isArray(use)) continue;
        for (const loader of use) {
          if (!loader || typeof loader !== 'object') continue;
          const l = loader as { loader?: string; options?: Record<string, unknown> };
          if (typeof l.loader === 'string' && l.loader.includes('css-loader') && !l.loader.includes('postcss')) {
            if (l.options) {
              l.options.url = false;
            }
          }
        }
      }
    }
    return config;
  },
};

export default nextConfig;
