import { getMe, NoLinkedProfileError } from '@/lib/auth/getMe';
import { AppShell } from '@/components/shell/AppShell';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let me;
  try {
    me = await getMe();
  } catch (e) {
    if (e instanceof NoLinkedProfileError) {
      return (
        <main className="min-h-screen flex items-center justify-center p-6 text-center">
          <div>
            <h1 className="text-xl font-semibold mb-2">Cuenta no vinculada</h1>
            <p className="text-neutral-500 max-w-md">
              Tu cuenta de auth no está vinculada a un perfil de empleado. Contacta a Recursos Humanos.
            </p>
          </div>
        </main>
      );
    }
    throw e;
  }
  return <AppShell me={me}>{children}</AppShell>;
}
