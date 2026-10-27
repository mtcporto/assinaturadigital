import nextConfig from 'eslint-config-next/core-web-vitals';

const config = [
  ...nextConfig,
  {
    ignores: ['.next/**', 'node_modules/**', '.vercel/**'],
    rules: {
      // Existing navigation and async-loading patterns are intentional in this App Router migration.
      '@next/next/no-html-link-for-pages': 'off',
      'react-hooks/set-state-in-effect': 'off',
    },
  },
];

export default config;
