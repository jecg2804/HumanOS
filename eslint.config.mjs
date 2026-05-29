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
  {
    // FE-1 guard (audit 2026-05-29): no hardcoded hex colors in app code — use the design tokens
    // from globals.css @theme (bg-navy, text-gold, etc.). 'warn' for now because ~47 pre-existing
    // violations are migrated in Group 3; escalate to 'error' once that migration lands.
    files: ['src/**/*.{ts,tsx}'],
    // src/emails/**: React Email templates MUST use inline hex (email clients don't support CSS
    // vars/Tailwind tokens). src/components/ui/**: shadcn vendor primitives, migrated separately.
    ignores: ['src/components/ui/**', 'src/emails/**'],
    rules: {
      'no-restricted-syntax': [
        'warn',
        {
          selector: 'Literal[value=/#[0-9a-fA-F]{3,8}/]',
          message:
            'No hardcodear colores hex. Usa design tokens (navy, gold, blue...) de globals.css @theme. Escala a error tras migracion FE-1 (Group 3).',
        },
      ],
    },
  },
];

export default config;
