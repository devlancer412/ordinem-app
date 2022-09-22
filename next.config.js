const path = require('path');
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: !!process.env.ANALYZE,
});

module.exports = withBundleAnalyzer({
  webpack(
    config,
    {
      dev = process.env.NODE_ENV === 'development',
      isServer = typeof window === 'undefined',
    }
  ) {
    // if (isServer) {
    //   require('./scripts/generate-sitemap');
    // }
    /**
     * !dev ? preact/compat : react, react-dom on build
     * reduce page weight in production by ~10%
     */
    if (!dev && !isServer) {
      Object.assign((config.resolve.alias['@/'] = path.resolve('./')), {
        react: 'preact/compat',
        'react-dom': 'preact/compat',
      });
    }
    return config;
  },
  sourceMaps: {
    productionBrowserSourceMaps: true,
  },
  images: {
    domains: ['ipfs.io'],
  },
  future: {
    webpack5: true,
    strictPostcssConfiguration: true,
  },
  i18n: {
    locales: ['en-US'],
    defaultLocale: 'en-US',
  },
});
