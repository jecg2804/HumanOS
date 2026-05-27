'use client';
import { useState } from 'react';
import { Bell } from 'lucide-react';
import { useNotificationsRealtime } from '@/lib/notifications/realtime';
import { NotificationDropdown } from './NotificationDropdown';

interface Props {
  personId: string;
}

export function NotificationBell({ personId }: Props) {
  const [open, setOpen] = useState(false);
  const { unreadCount } = useNotificationsRealtime(personId);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded hover:bg-gray-100"
        aria-label="Notificaciones"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-600 text-white text-xs rounded-full px-1.5 min-w-[20px] text-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      {open && <NotificationDropdown personId={personId} onClose={() => setOpen(false)} />}
    </div>
  );
}
