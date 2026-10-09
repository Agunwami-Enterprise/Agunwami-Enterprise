import type { NextConfig } from "next";
import path from "path";

const MAIN_HOST = 'agunwamienterprise.com';
const ADMIN_HOST = 'admin.agunwamienterprise.com';
// The CEO workstation (app/(ae-ws): /auth/* and /ceo/*) lives on the admin
// subdomain; everything else is the public site. /api and /_next are served
// on both hosts, and the session cookie is per host, so the whole admin flow
// (login included) must stay on ADMIN_HOST.
const ADMIN_PATHS = ['ceo', 'auth'];

const nextConfig: NextConfig = {
  transpilePackages: ['agunwami-backend'],
  devIndicators: false,
  images: {
    unoptimized: true,
  },
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'www.agunwamienterprise.com',
          },
        ],
        destination: 'https://agunwamienterprise.com/:path*',
        permanent: true,
      },
      // Admin subdomain root opens the dashboard (which sends signed-out
      // visitors to /auth/login). Must come before the catch-all below.
      ...['/', '/ceo'].map(source => ({
        source,
        has: [{ type: 'host' as const, value: ADMIN_HOST }],
        destination: '/ceo/dashboard',
        permanent: false,
      })),
      // Workstation pages on the main site move to the admin subdomain.
      ...ADMIN_PATHS.flatMap(section => [
        {
          source: `/${section}`,
          has: [{ type: 'host' as const, value: MAIN_HOST }],
          destination: `https://${ADMIN_HOST}/${section}`,
          permanent: false,
        },
        {
          source: `/${section}/:path*`,
          has: [{ type: 'host' as const, value: MAIN_HOST }],
          destination: `https://${ADMIN_HOST}/${section}/:path*`,
          permanent: false,
        },
      ]),
      // Public pages requested on the admin subdomain go back to the main
      // site. API routes, Next.js assets and files (e.g. /logo.png) stay put.
      {
        source: `/:path((?!(?:${ADMIN_PATHS.join('|')})(?:/|$)|api/|_next/|.*\\.[A-Za-z0-9]+$).*)`,
        has: [{ type: 'host', value: ADMIN_HOST }],
        destination: `https://${MAIN_HOST}/:path`,
        permanent: false,
      },
    ];
  },
  async headers() {
    return [
      // Keep the private admin subdomain out of search results.
      {
        source: '/:path*',
        has: [{ type: 'host', value: ADMIN_HOST }],
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
      {
        source: '/_next/static/media/:path*',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noindex',
          },
        ],
      },
    ];
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
