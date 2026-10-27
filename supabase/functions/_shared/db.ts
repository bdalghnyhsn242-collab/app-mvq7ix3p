import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export function createSupabaseServiceClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function getUserFromRequest(req: Request) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) {
    throw new Error("Missing authorization token");
  }

  const supabase = createSupabaseServiceClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    throw new Error("Invalid authorization token");
  }

  return { supabase, user };
}
