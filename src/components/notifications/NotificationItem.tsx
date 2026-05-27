'use client';
import Link from 'next/link';
import type { Database } from '@/lib/supabase/database.types';

type OutboxRow = Database['notifications']['Tables']['outbox']['Row'];

interface Props {
  notification: OutboxRow;
  onMarkRead: (id: string) => void;
}

export function NotificationItem({ notification, onMarkRead }: Props) {
  const deepLink =
    (notification.metadata as { deep_link?: string } | null)?.deep_link ?? '/notificaciones';
  const unread = notification.status !== 'read' && notification.status !== 'dismissed';

  return (
    <Link
      href={deepLink}
      onClick={() => unread && onMarkRead(notification.id)}
      className={`block p-3 border-b hover:bg-gray-50 ${unread ? 'bg-blue-50' : ''}`}
    >
      <div className="text-sm font-medium">{notification.subject}</div>
      <div className="text-xs text-gray-600 line-clamp-2">{notification.body}</div>
      <div className="text-xs text-gray-400 mt-1">
        {new Date(notification.created_at).toLocaleString('es-PA')}
      </div>
    </Link>
  );
}
