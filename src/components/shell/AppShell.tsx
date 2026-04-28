import type { Me } from '@/lib/auth/getMe';
import { Sidebar } from './Sidebar';
import { BottomTabs } from './BottomTabs';
import { UserMenu } from './UserMenu';

export function AppShell({ me, children }: { me: Me; children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header
        className="px-4 md:px-6 py-3 flex items-center justify-between"
        style={{ background: '#1B3A5C' }}
      >
        <div className="flex items-center gap-2">
          <span className="font-bold text-lg" style={{ color: '#F5A623' }}>
            ICONSA
          </span>
          <span className="text-white/90 text-sm">HumanOS</span>
        </div>
        <UserMenu me={me} />
      </header>
      <div className="flex flex-1 min-h-0">
        <Sidebar me={me} className="hidden md:block w-56 border-r border-neutral-200" />
        <main className="flex-1 p-4 md:p-6 pb-24 md:pb-6 overflow-y-auto">{children}</main>
      </div>
      <BottomTabs
        me={me}
        className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-neutral-200"
      />
    </div>
  );
}
