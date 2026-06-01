import { Home, Settings, Shield, type LucideIcon } from 'lucide-react';
// Pending-feature icons (FileText, Users, Bell, BookOpen) re-added with their nav items.

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  requiresHrAdmin?: boolean;
};

// FE-2: only destinations that actually exist are shown. The items below were
// linking to routes with no page (404). Re-enable each one in the group that
// ships its feature:
//   - /directorio      -> Group 3 (employee directory)
//   - /ayuda           -> Group 3 (knowledge base)
//   - /solicitudes     -> Group 4 (requests/tickets)
//   - /notificaciones  -> Group 4 (full notifications page; the bell/dropdown covers it for now)
export const NAV_ITEMS: readonly NavItem[] = [
  { href: '/dashboard', label: 'Inicio', icon: Home },
  { href: '/perfil', label: 'Mi perfil', icon: Settings },
  { href: '/admin', label: 'Admin', icon: Shield, requiresHrAdmin: true },
] as const;

// Pending features (re-add to NAV_ITEMS when shipped):
//   { href: '/directorio', label: 'Directorio', icon: Users },
//   { href: '/ayuda', label: 'Ayuda', icon: BookOpen },
//   { href: '/solicitudes', label: 'Solicitudes', icon: FileText },
//   { href: '/notificaciones', label: 'Notificaciones', icon: Bell },
