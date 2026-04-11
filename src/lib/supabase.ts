import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _supabase: SupabaseClient | null = null;

export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    if (!_supabase) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!url || !key) {
        throw new Error(
          "Supabase env vars missing. Copy .env.local.example to .env.local and fill in your credentials."
        );
      }
      _supabase = createClient(url, key, {
        realtime: { params: { eventsPerSecond: 10 } },
      });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const value = (_supabase as any)[prop as string];
    if (typeof value === "function") {
      return value.bind(_supabase);
    }
    return value;
  },
});
