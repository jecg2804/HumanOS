'use client';
import Link from 'next/link';
import { useNotificationsRealtime } from '@/lib/notifications/realtime';
import { NotificationItem } from './NotificationItem';

interface Props {
  personId: string;
  onClose: () => void;
}

export function NotificationDropdown({ personId, onClose }: Props) {
  const { notifications, markAsRead, markAllAsRead } = useNotificationsRealtime(personId);
  const top = notifications.slice(0, 10);

  return (
    <div className="absolute right-0 top-12 w-96 bg-white rounded-lg shadow-lg border z-50">
      <div className="flex items-center justify-between p-3 border-b">
        <h3 className="font-bold">Notificaciones</h3>
        <button onClick={markAllAsRead} className="text-xs text-[#0A6EBD] underline">
          Marcar todas leídas
        </button>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {top.length === 0 ? (
          <p className="text-sm text-gray-500 p-4 text-center">Sin notificaciones</p>
        ) : (
          top.map((n) => (
            <NotificationItem key={n.id} notification={n} onMarkRead={markAsRead} />
          ))
        )}
      </div>
      <Link
        href="/notificaciones"
        onClick={onClose}
        className="block p-3 text-sm text-center border-t text-[#0A6EBD]"
      >
        Ver todas
      </Link>
    </div>
  );
}
