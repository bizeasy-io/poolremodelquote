// If your repo already has a Supabase client module, delete this file and
// point the imports in src/rep/* and src/lib/slots.js at your existing one.
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);
