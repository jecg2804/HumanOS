import { LoginForm } from './login-form';

const ERROR_MESSAGES: Record<string, string> = {
  no_access:
    'Tu cuenta no tiene acceso a HumanOS. Solicita acceso al equipo de RRHH.',
  session_expired: 'Tu sesion expiro. Ingresa nuevamente.',
  no_profile:
    'Tu cuenta no tiene perfil de empleado vinculado. Contacta a RRHH.',
};

// SIGNUP-session-bug (A6): cuando el onboarding detecta que la cuenta ya existia en otra app de
// ICONSA, hace merge (agrega humanOS a allowed_apps) y redirige aqui con merged=1 -- el usuario
// inicia sesion con su credencial ya existente (no se eleva sesion cross-app silenciosa).
const NOTICE_MESSAGES: Record<string, string> = {
  '1': 'Tu cuenta ya existia en otra app de ICONSA. Inicia sesion con tu correo y contrasena de siempre; ya tienes acceso a HumanOS.',
};

type LoginSearchParams = { next?: string; error?: string; merged?: string };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<LoginSearchParams>;
}) {
  const params = await searchParams;
  const errorKey = params.error;
  const initialError = errorKey ? ERROR_MESSAGES[errorKey] : undefined;
  const initialNotice = params.merged ? NOTICE_MESSAGES[params.merged] : undefined;

  return (
    <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-xl p-8 space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-primary">HumanOS</h1>
        <p className="text-sm text-muted-foreground">
          Portal de Recursos Humanos ICONSA
        </p>
      </div>
      {initialNotice && (
        <p
          role="status"
          className="text-sm text-foreground bg-info-500/10 border border-info-500/30 rounded-md p-3"
        >
          {initialNotice}
        </p>
      )}
      <LoginForm next={params.next} initialError={initialError} />
    </div>
  );
}
