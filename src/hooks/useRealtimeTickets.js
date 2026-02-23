import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export default function useRealtimeTickets(userId) {
  const [ticketUpdates, setTicketUpdates] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!userId) return;

    // Subscribe to all ticket changes (INSERT, UPDATE, DELETE)
    const channel = supabase
      .channel('tickets_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets',
          filter: `created_by=eq.${userId}` // Only user's own tickets
        },
        (payload) => {
          console.log('Ticket update:', payload);
          setTicketUpdates((prev) => [
            {
              id: payload.new?.id || payload.old?.id,
              event: payload.eventType,
              data: payload.new || payload.old,
              timestamp: new Date()
            },
            ...prev
          ]);
        }
      )
      .on('subscribe', () => {
        setIsConnected(true);
        console.log('Connected to tickets realtime');
      })
      .on('unsubscribe', () => {
        setIsConnected(false);
        console.log('Disconnected from tickets realtime');
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return { ticketUpdates, isConnected };
}
