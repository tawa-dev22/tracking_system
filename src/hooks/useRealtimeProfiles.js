import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export default function useRealtimeProfiles() {
  const [newUsers, setNewUsers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Subscribe to new user profile creations
    const channel = supabase
      .channel('profiles_realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'profiles'
        },
        (payload) => {
          console.log('New user profile:', payload.new);
          setNewUsers((prev) => [payload.new, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles'
        },
        (payload) => {
          console.log('User profile updated:', payload.new);
          // Update existing user in list
          setNewUsers((prev) =>
            prev.map((u) => (u.id === payload.new.id ? payload.new : u))
          );
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
  }, []);

  return { newUsers, isConnected };
}
