/**
 * ESLint rule: block import of @/lib/supabase/admin from 'use client' files.
 * Enforces ADR-0006 exception scope (admin client only in server-side code).
 */
'use strict';

module.exports = {
  meta: {
    type: 'problem',
    docs: { description: 'Disallow @/lib/supabase/admin in client components' },
    schema: [],
    messages: {
      noAdminInClient:
        "@/lib/supabase/admin must not be imported in 'use client' files (ADR-0006 exception scope)",
    },
  },
  create(context) {
    let isClientFile = false;
    return {
      Program(node) {
        const firstStatement = node.body[0];
        if (
          firstStatement &&
          firstStatement.type === 'ExpressionStatement' &&
          firstStatement.expression.type === 'Literal' &&
          firstStatement.expression.value === 'use client'
        ) {
          isClientFile = true;
        }
      },
      ImportDeclaration(node) {
        if (!isClientFile) return;
        const src = node.source.value;
        if (src === '@/lib/supabase/admin' || src.endsWith('/lib/supabase/admin')) {
          context.report({ node, messageId: 'noAdminInClient' });
        }
      },
    };
  },
};
