import Link from 'next/link';
import { Home, FileText, BookOpen, Users, User, ShieldCheck } from 'lucide-react';
import type { Me } from '@/lib/auth/getMe';
import { cn } from '@/lib/utils';

type Tab = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  hrOnly?: boolean;
};

const TABS: Tab[] = [
  { href: '/inicio', label: 'Inicio', icon: Home },
  { href: '/solicitudes', label: 'Solicitudes', icon: FileText },
  { href: '/ayuda', label: 'Ayuda', icon: BookOpen },
  { href: '/directorio', label: 'Directorio', icon: Users },
  { href: '/perfil', label: 'Perfil', icon: User },
  { href: '/admin', label: 'Admin', icon: ShieldCheck, hrOnly: true },
];

export function BottomTabs({ me, className }: { me: Me; className?: string }) {
  const items = TABS.filter((t) => !t.hrOnly || me.role === 'hr_admin');
  return (
    <nav
      className={cn('grid grid-flow-col auto-cols-fr', className)}
      aria-label="Navegación móvil"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {items.map((tab) => {
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="flex flex-col items-center gap-1 py-2 text-xs text-neutral-700 hover:text-neutral-900"
          >
            <Icon className="h-5 w-5" />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
