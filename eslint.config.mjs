import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import noAdminClientInClient from './eslint-rules/no-admin-client-in-client.js';
import noVoseo from './eslint-rules/no-voseo.js';

const config = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  // FE-3 (W4): full jsx-a11y recommended RULES as the durable a11y floor (next ships only a subset).
  // next already REGISTERS the jsx-a11y plugin, so we cannot re-add it ("Cannot redefine plugin") —
  // we apply its recommended rules on top. Permanent lint gate, like the anti-voseo + no-hex guards.
  {
    files: ['src/**/*.{jsx,tsx}'],
    rules: {
      ...jsxA11y.flatConfigs.recommended.rules,
      // Onboarding ack checkboxes wrap the control + a label whose visible text is nested ~2 levels
      // deep (title/description divs). That is accessible (browsers compute the full label text); the
      // default depth (2) just doesn't see it. Allow depth 3 — association is still required.
      'jsx-a11y/label-has-associated-control': ['error', { depth: 3 }],
    },
  },
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
      iconsa: {
        rules: {
          'no-admin-client-in-client': noAdminClientInClient,
          'no-voseo': noVoseo,
        },
      },
    },
    rules: {
      'iconsa/no-admin-client-in-client': 'error',
      // R6/R15 anti-voseo guard (audit 2026-05-29 H9). Escalated to 'error' on 2026-06-01 (W0.5 H-3)
      // after `npm run lint` confirmed the codebase voseo count is zero. The gate now blocks any new
      // voseo from shipping; never downgrade without Jaime sign-off.
      'iconsa/no-voseo': 'error',
    },
  },
  {
    // FE-1 guard (audit 2026-05-29): no hardcoded hex colors in app code — use the design tokens
    // from globals.css @theme (bg-navy-500, text-gold-500, etc.). Escalated to 'error' on
    // 2026-06-01 (FE-1b) after migrating the 22 app files (49 arbitrary-value classes) to tokens.
    files: ['src/**/*.{ts,tsx}'],
    // src/emails/**: React Email templates MUST use inline hex (email clients don't support CSS
    // vars/Tailwind tokens). src/components/ui/**: shadcn vendor primitives, migrated separately.
    // src/app/manifest.ts: the PWA manifest spec requires real color values, not Tailwind tokens.
    ignores: ['src/components/ui/**', 'src/emails/**', 'src/app/manifest.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/#[0-9a-fA-F]{3,8}/]',
          message:
            'No hardcodear colores hex. Usa design tokens (navy-500, gold-500, info-500...) de globals.css @theme.',
        },
      ],
    },
  },
];

export default config;
