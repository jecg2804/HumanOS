import { LoginForm } from './login-form';

const ERROR_MESSAGES: Record<string, string> = {
  no_access:
    'Tu cuenta no tiene acceso a HumanOS. Solicita acceso al equipo de RRHH.',
  session_expired: 'Tu sesion expiro. Ingresa nuevamente.',
  no_profile:
    'Tu cuenta no tiene perfil de empleado vinculado. Contacta a RRHH.',
};

type LoginSearchParams = { next?: string; error?: string };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<LoginSearchParams>;
}) {
  const params = await searchParams;
  const errorKey = params.error;
  const initialError = errorKey ? ERROR_MESSAGES[errorKey] : undefined;

  return (
    <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-xl p-8 space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-primary">HumanOS</h1>
        <p className="text-sm text-muted-foreground">
          Portal de Recursos Humanos ICONSA
        </p>
      </div>
      <LoginForm next={params.next} initialError={initialError} />
    </div>
  );
}
