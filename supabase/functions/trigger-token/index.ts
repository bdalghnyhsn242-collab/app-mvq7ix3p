import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getUserFromRequest } from "../_shared/db.ts";

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
    const { user } = await getUserFromRequest(req);
    const triggerSecretKey = Deno.env.get("TRIGGER_SECRET_KEY");
    if (!triggerSecretKey) {
      throw new Error("TRIGGER_SECRET_KEY is not configured");
    }

    const { configure, auth } = await import("npm:@trigger.dev/sdk@4.4.4/v3");
    configure({ accessToken: triggerSecretKey });

    const token = await auth.createPublicToken({
      expiresIn: "15m",
      scopes: {
        read: {
          tags: [`user:${user.id}`],
        },
      },
    });

    return new Response(JSON.stringify({ token }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create Trigger token";
    const status = /authorization/i.test(message) ? 401 : 500;
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
