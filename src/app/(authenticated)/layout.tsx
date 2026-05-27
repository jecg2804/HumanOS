import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Toaster } from '@/components/ui/sonner';
import { AppSidebar } from '@/components/app-shell/sidebar';
import { AppTopbar } from '@/components/app-shell/topbar';

function initialsOf(name: string): string {
  const parts = name.split(' ').filter(Boolean).slice(0, 2);
  const result = parts.map((part) => part[0]?.toUpperCase() ?? '').join('');
  return result || '?';
}

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: person } = await supabase
    .schema('hr')
    .from('people')
    .select('id, full_name')
    .eq('auth_id', user.id)
    .maybeSingle();

  if (!person) {
    redirect('/login?error=no_profile');
  }

  const { data: currentEmployment } = await supabase
    .schema('hr')
    .from('employments')
    .select('app_role')
    .eq('person_id', person.id)
    .eq('is_current', true)
    .maybeSingle();

  const isHrAdmin = currentEmployment?.app_role === 'hr_admin';

  const displayUser = {
    full_name: person.full_name,
    email: user.email ?? '',
    initials: initialsOf(person.full_name),
  };

  return (
    <SidebarProvider>
      <AppSidebar isHrAdmin={isHrAdmin} />
      <div className="flex-1 flex flex-col min-h-screen">
        <AppTopbar user={displayUser} personId={person.id} />
        <main className="flex-1 p-6">{children}</main>
      </div>
      <Toaster />
    </SidebarProvider>
  );
}
