import { Home, FileText, Users, Bell, Settings, Shield, BookOpen, type LucideIcon } from 'lucide-react';

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  requiresHrAdmin?: boolean;
};

export const NAV_ITEMS: readonly NavItem[] = [
  { href: '/dashboard', label: 'Inicio', icon: Home },
  { href: '/solicitudes', label: 'Solicitudes', icon: FileText },
  { href: '/directorio', label: 'Directorio', icon: Users },
  { href: '/notificaciones', label: 'Notificaciones', icon: Bell },
  { href: '/ayuda', label: 'Ayuda', icon: BookOpen },
  { href: '/perfil', label: 'Mi perfil', icon: Settings },
  { href: '/admin', label: 'Admin', icon: Shield, requiresHrAdmin: true },
] as const;
