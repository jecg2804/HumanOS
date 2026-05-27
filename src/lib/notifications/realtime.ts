'use client';

import { useEffect, useState, useCallback } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import type { Database } from '@/lib/supabase/database.types';

type OutboxRow = Database['notifications']['Tables']['outbox']['Row'];

interface UseNotificationsRealtime {
  notifications: OutboxRow[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

export function useNotificationsRealtime(
  currentPersonId: string | null
): UseNotificationsRealtime {
  const [notifications, setNotifications] = useState<OutboxRow[]>([]);
  const client = createSupabaseBrowserClient();

  useEffect(() => {
    if (!currentPersonId) return;
    const personId = currentPersonId;
    let active = true;

    async function loadInitial() {
      const { data } = await client
        .schema('notifications')
        .from('outbox')
        .select('*')
        .eq('recipient_id', personId)
        .eq('channel', 'in_app')
        .in('status', ['pending', 'queued', 'sent'])
        .order('created_at', { ascending: false })
        .limit(50);
      if (active && data) setNotifications(data as OutboxRow[]);
    }

    loadInitial();

    const channel = client
      .channel(`notifications-${personId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'notifications',
          table: 'outbox',
          filter: `recipient_id=eq.${personId}`,
        },
        (payload) => {
          if (!active) return;
          if (payload.eventType === 'INSERT' && (payload.new as OutboxRow).channel === 'in_app') {
            setNotifications((prev) => [payload.new as OutboxRow, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setNotifications((prev) =>
              prev.map((n) =>
                n.id === (payload.new as OutboxRow).id ? (payload.new as OutboxRow) : n
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setNotifications((prev) => prev.filter((n) => n.id !== (payload.old as OutboxRow).id));
          }
        }
      )
      .subscribe();

    return () => {
      active = false;
      client.removeChannel(channel);
    };
  }, [currentPersonId, client]);

  const unreadCount = notifications.filter(
    (n) => n.channel === 'in_app' && n.status !== 'read' && n.status !== 'dismissed'
  ).length;

  const markAsRead = useCallback(
    async (id: string) => {
      await client
        .schema('notifications')
        .from('outbox')
        .update({ status: 'read', read_at: new Date().toISOString() })
        .eq('id', id);
    },
    [client]
  );

  const markAllAsRead = useCallback(async () => {
    if (!currentPersonId) return;
    await client
      .schema('notifications')
      .from('outbox')
      .update({ status: 'read', read_at: new Date().toISOString() })
      .eq('recipient_id', currentPersonId)
      .eq('channel', 'in_app')
      .in('status', ['pending', 'queued', 'sent']);
  }, [client, currentPersonId]);

  return { notifications, unreadCount, markAsRead, markAllAsRead };
}
