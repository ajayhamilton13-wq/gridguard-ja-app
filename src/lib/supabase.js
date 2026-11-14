import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase = SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

export async function isSupabaseReachable() {
  if (!supabase) return false;
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: "HEAD",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    return response.ok || response.status < 500;
  } catch (error) {
    console.log("Supabase connectivity check failed:", error?.message || error);
    return false;
  }
}
