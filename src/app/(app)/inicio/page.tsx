import { getMe } from '@/lib/auth/getMe';

export default async function InicioPage() {
  const me = await getMe();
  const firstName = me.name.split(' ')[0];
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold">Hola, {firstName}</h1>
        <p className="text-neutral-500 mt-1">
          {me.role === 'hr_admin'
            ? 'Tienes acceso al panel de Recursos Humanos.'
            : 'Bienvenido a HumanOS.'}
        </p>
      </div>
    </div>
  );
}
