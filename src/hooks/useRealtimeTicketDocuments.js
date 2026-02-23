import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export default function useRealtimeTicketDocuments(ticketId) {
  const [newDocuments, setNewDocuments] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!ticketId) return;

    // Subscribe to new document uploads for this ticket
    const channel = supabase
      .channel(`ticket_documents_${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ticket_documents',
          filter: `ticket_id=eq.${ticketId}`
        },
        (payload) => {
          console.log('New document uploaded:', payload.new);
          setNewDocuments((prev) => [payload.new, ...prev]);
        }
      )
      .on('subscribe', () => {
        setIsConnected(true);
      })
      .on('unsubscribe', () => {
        setIsConnected(false);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketId]);

  return { newDocuments, isConnected };
}
