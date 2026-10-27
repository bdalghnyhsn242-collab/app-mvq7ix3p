import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getUserFromRequest } from "../_shared/db.ts";
import { encryptText } from "../_shared/utils/encryption.ts";

type RequestBody = {
  category: string;
  key: string;
  value: unknown;
};

const NEEDS_ENCRYPTION = /(api_key|token|access_key|secret|password)/i;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { supabase, user } = await getUserFromRequest(req);
    const body = (await req.json()) as RequestBody;

    if (!body.category || !body.key) {
      return new Response(JSON.stringify({ error: "category and key are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.value === null) {
      const { error } = await supabase
        .from("user_settings")
        .delete()
        .eq("user_id", user.id)
        .eq("category", body.category)
        .eq("key", body.key);

      if (error) throw error;
    } else {
      let valueToStore = body.value;
      if (typeof body.value === "string" && NEEDS_ENCRYPTION.test(body.key)) {
        const encryptionSecret = Deno.env.get("ENCRYPTION_SECRET");
        if (!encryptionSecret) {
          throw new Error("ENCRYPTION_SECRET is required for secure settings");
        }
        valueToStore = await encryptText(body.value, encryptionSecret);
      }

      const { error } = await supabase.from("user_settings").upsert(
        {
          user_id: user.id,
          category: body.category,
          key: body.key,
          value: valueToStore,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,category,key" },
      );

      if (error) throw error;
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save setting";
    const status = /authorization/i.test(message) ? 401 : 500;
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
