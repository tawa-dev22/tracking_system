import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";

/**
 * A light-weight "notification" model:
 * - Admin: watch new users, new tickets, and new messages (unread)
 * - User: watch new messages (unread)
 *
 * Requires `messages` table with `recipient_id` and `read_at` columns.
 */
export default function useRealtimeNotifications({ userId, isAdmin }) {
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [newTickets, setNewTickets] = useState(0);
  const [newUsers, setNewUsers] = useState(0);

  // Initial counts
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    (async () => {
      // unread messages for me
      const msgRes = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("recipient_id", userId)
        .is("read_at", null);
      if (!cancelled) setUnreadMessages(msgRes.count || 0);

      if (isAdmin) {
        // just store deltas since page load (not total)
        setNewTickets(0);
        setNewUsers(0);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, isAdmin]);

  // Realtime subscriptions
  useEffect(() => {
    if (!userId) return;

    const ch = supabase.channel(`notif:${userId}:${isAdmin ? "admin" : "user"}`);

    // Messages: when I receive a message, bump unread count
    ch.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages", filter: `recipient_id=eq.${userId}` },
      () => setUnreadMessages((n) => n + 1)
    );

    // Messages: if I mark messages as read, refresh count (cheap exact count)
    ch.on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "messages", filter: `recipient_id=eq.${userId}` },
      async () => {
        const msgRes = await supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("recipient_id", userId)
          .is("read_at", null);
        setUnreadMessages(msgRes.count || 0);
      }
    );

    if (isAdmin) {
      // New tickets
      ch.on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "tickets" },
        () => setNewTickets((n) => n + 1)
      );

      // New users (profiles row inserted)
      ch.on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "profiles" },
        () => setNewUsers((n) => n + 1)
      );
    }

    ch.subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [userId, isAdmin]);

  const totalBadge = useMemo(() => {
    const base = unreadMessages + (isAdmin ? newTickets + newUsers : 0);
    return base;
  }, [unreadMessages, newTickets, newUsers, isAdmin]);

  return { unreadMessages, newTickets, newUsers, totalBadge };
}

