import { LogOut } from 'lucide-react';
import type { Me } from '@/lib/auth/getMe';
import { logoutAction } from '@/app/login/actions';

export function UserMenu({ me }: { me: Me }) {
  const initials = me.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <div className="flex items-center gap-3">
      <div className="hidden sm:flex flex-col items-end leading-tight">
        <span className="text-sm text-white">{me.name}</span>
        <span className="text-xs text-white/70">
          {me.role === 'hr_admin' ? 'Recursos Humanos' : me.position ?? me.department ?? ''}
        </span>
      </div>
      <div
        className="h-9 w-9 rounded-full flex items-center justify-center text-sm font-semibold"
        style={{ background: '#F5A623', color: '#1B3A5C' }}
      >
        {initials || '?'}
      </div>
      <form action={logoutAction}>
        <button
          type="submit"
          className="text-white/90 hover:text-white p-2"
          title="Cerrar sesión"
          aria-label="Cerrar sesión"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
