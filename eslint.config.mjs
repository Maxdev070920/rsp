import coreWebVitals from 'eslint-config-next/core-web-vitals';

const config = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'artifacts/**',
      'cache/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
    ],
  },
  ...coreWebVitals,
  {
    rules: {
      // Reward and champion art is generated SVG markup from fixed palettes;
      // next/image cannot render an inline SVG string.
      '@next/next/no-img-element': 'off',
    },
  },
];

export default config;
