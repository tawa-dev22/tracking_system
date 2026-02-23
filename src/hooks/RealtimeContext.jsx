import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const RealtimeContext = createContext();

export function RealtimeProvider({ children }) {
  const [connections, setConnections] = useState({
    auditLogs: false,
    tickets: false,
    profiles: false,
    documents: false
  });

  const [updates, setUpdates] = useState({
    auditLogs: [],
    tickets: [],
    profiles: [],
    documents: []
  });

  useEffect(() => {
    // Audit logs subscription
    const auditLogsChannel = supabase
      .channel('audit_logs_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'audit_logs' },
        (payload) => {
          setUpdates((prev) => ({
            ...prev,
            auditLogs: [payload.new, ...prev.auditLogs]
          }));
        }
      )
      .on('subscribe', () => {
        setConnections((prev) => ({ ...prev, auditLogs: true }));
      })
      .on('unsubscribe', () => {
        setConnections((prev) => ({ ...prev, auditLogs: false }));
      })
      .subscribe();

    // Tickets subscription
    const ticketsChannel = supabase
      .channel('tickets_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tickets' },
        (payload) => {
          setUpdates((prev) => ({
            ...prev,
            tickets: [payload, ...prev.tickets]
          }));
        }
      )
      .on('subscribe', () => {
        setConnections((prev) => ({ ...prev, tickets: true }));
      })
      .on('unsubscribe', () => {
        setConnections((prev) => ({ ...prev, tickets: false }));
      })
      .subscribe();

    // Profiles subscription
    const profilesChannel = supabase
      .channel('profiles_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        (payload) => {
          setUpdates((prev) => ({
            ...prev,
            profiles: [payload, ...prev.profiles]
          }));
        }
      )
      .on('subscribe', () => {
        setConnections((prev) => ({ ...prev, profiles: true }));
      })
      .on('unsubscribe', () => {
        setConnections((prev) => ({ ...prev, profiles: false }));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(auditLogsChannel);
      supabase.removeChannel(ticketsChannel);
      supabase.removeChannel(profilesChannel);
    };
  }, []);

  return (
    <RealtimeContext.Provider value={{ connections, updates }}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  return useContext(RealtimeContext);
}
