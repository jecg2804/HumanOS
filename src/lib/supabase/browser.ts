import { createBrowserClient as supaBrowser } from '@supabase/ssr';

export function createBrowserClient() {
  return supaBrowser(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { db: { schema: 'humanos' } },
  );
}
