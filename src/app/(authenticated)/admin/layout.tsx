// Audit 2026-05-29 BE-4/SEC-5: route-boundary authorization for /admin/*.
// Previously the admin pages relied solely on RLS + sidebar link-hiding; a non-hr_admin who
// navigated directly was bounded only by per-table RLS (fragile — a future join to a
// looser-policy table or a service-role data source would leak). This layout enforces the
// hr_admin gate at the route boundary for every current and future /admin/* page.
import { redirect } from 'next/navigation';
import { AuthorizationError, requireHrAdmin } from '@/lib/auth/require-hr-admin';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  try {
    await requireHrAdmin();
  } catch (e) {
    if (e instanceof AuthorizationError) {
      redirect('/dashboard');
    }
    throw e;
  }
  return <>{children}</>;
}
