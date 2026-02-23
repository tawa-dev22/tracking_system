import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export default function useRealtimeAuditLogs() {
  const [newLogs, setNewLogs] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Subscribe to new audit log insertions
    const channel = supabase
      .channel('audit_logs_realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'audit_logs'
        },
        (payload) => {
          console.log('New audit log:', payload.new);
          setNewLogs((prev) => [payload.new, ...prev]);
        }
      )
      .on('subscribe', () => {
        setIsConnected(true);
        console.log('Connected to audit logs realtime');
      })
      .on('unsubscribe', () => {
        setIsConnected(false);
        console.log('Disconnected from audit logs realtime');
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { newLogs, isConnected };
}
