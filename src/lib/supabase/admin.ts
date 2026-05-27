// ADR-0006 exception: this module exposes Supabase service_role admin client.
// Only importable from server-side code (server actions, route handlers, server components).
// ESLint rule `iconsa/no-admin-client-in-client` blocks import from 'use client' files.
// Each call site in a server action MUST include comment: // ADR-0006 exception

import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import { SUPABASE_URL } from './env';

export function createSupabaseAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is required for admin client. ADR-0006 exception unavailable without it.'
    );
  }
  return createClient<Database>(SUPABASE_URL, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
