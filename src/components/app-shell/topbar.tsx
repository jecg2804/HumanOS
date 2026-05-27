import { SidebarTrigger } from '@/components/ui/sidebar';
import { UserMenu } from './user-menu';
import { NotificationBell } from '@/components/notifications/NotificationBell';

export function AppTopbar({
  user,
  personId,
}: {
  user: { full_name: string; email: string; initials: string };
  personId: string;
}) {
  return (
    <header className="h-14 border-b border-border bg-background flex items-center gap-3 px-4 sticky top-0 z-10">
      <SidebarTrigger />
      <div className="flex-1" />
      <NotificationBell personId={personId} />
      <UserMenu
        fullName={user.full_name}
        email={user.email}
        initials={user.initials}
      />
    </header>
  );
}
