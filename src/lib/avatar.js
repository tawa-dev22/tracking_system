import { supabase } from "../supabaseClient";

export function getAvatarUrlFromPath(avatar_path) {
  const p = String(avatar_path || "").trim();
  if (!p) return "";
  const { data } = supabase.storage.from("avatars").getPublicUrl(p);
  return data?.publicUrl || "";
}

