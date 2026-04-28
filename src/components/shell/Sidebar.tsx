import Link from 'next/link';
import { Home, FileText, BookOpen, Users, User, ShieldCheck } from 'lucide-react';
import type { Me } from '@/lib/auth/getMe';
import { cn } from '@/lib/utils';

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  hrOnly?: boolean;
};

const NAV: NavItem[] = [
  { href: '/inicio', label: 'Inicio', icon: Home },
  { href: '/solicitudes', label: 'Solicitudes', icon: FileText },
  { href: '/ayuda', label: 'Ayuda', icon: BookOpen },
  { href: '/directorio', label: 'Directorio', icon: Users },
  { href: '/perfil', label: 'Mi Perfil', icon: User },
  { href: '/admin', label: 'Admin', icon: ShieldCheck, hrOnly: true },
];

export function Sidebar({ me, className }: { me: Me; className?: string }) {
  const items = NAV.filter((i) => !i.hrOnly || me.role === 'hr_admin');
  return (
    <nav className={cn('p-4', className)} aria-label="Navegación principal">
      <ul className="space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className="flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-neutral-100 transition"
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
