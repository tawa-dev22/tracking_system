import { supabase } from "./supabase";

export async function listUsers() {
  if (!supabase) return { data: [], error: null };
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .order("createdAt", { ascending: false });
  return { data: data ?? [], error };
}

export async function deleteUserById(id) {
  if (!supabase) return { error: new Error("Supabase not configured") };
  const { error } = await supabase.from("users").delete().eq("id", id);
  return { error };
}

export async function toggleUserSuspended(id, suspend) {
  if (!supabase) return { error: new Error("Supabase not configured") };
  const { error } = await supabase
    .from("users")
    .update({ isSuspended: suspend })
    .eq("id", id);
  return { error };
}

export async function createUser({ name, email, role }) {
  if (!supabase) return { error: new Error("Supabase not configured") };
  const { data, error } = await supabase
    .from("users")
    .insert({
      name,
      email,
      role,
      isSuspended: false,
    })
    .select()
    .limit(1)
    .single();
  return { data, error };
}

export async function updateUserRole(id, role) {
  if (!supabase) return { error: new Error("Supabase not configured") };
  const { error } = await supabase
    .from("users")
    .update({ role })
    .eq("id", id);
  return { error };
}
