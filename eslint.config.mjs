import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';
import noAdminClientInClient from './eslint-rules/no-admin-client-in-client.js';

const config = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      'src/lib/supabase/database.types.ts',
    ],
  },
  {
    // shadcn-generated primitives: relax React 19 purity rules (Math.random in skeleton, setState in useEffect for window resize listeners).
    files: ['src/components/ui/**', 'src/hooks/use-mobile.ts'],
    rules: {
      'react-hooks/purity': 'off',
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    plugins: {
      iconsa: { rules: { 'no-admin-client-in-client': noAdminClientInClient } },
    },
    rules: {
      'iconsa/no-admin-client-in-client': 'error',
    },
  },
];

export default config;
