import nextConfig from 'eslint-config-next/core-web-vitals';

const config = [
  ...nextConfig,
  {
    ignores: ['.next/**', 'node_modules/**', '.vercel/**'],
    rules: {
      // Existing async-loading patterns are intentional in this App Router migration.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
];

export default config;
