// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { withCors, json } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return withCors(new Response(null, { status: 204 }));
  try {
    if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, { status: 405 });

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

    const body = await req.json().catch(() => ({}));
    const { team_slug } = body ?? {};
    if (!team_slug) return json({ error: "MISSING_FIELDS" }, { status: 400 });

    const { data: team } = await sb.from("teams").select("id, slug").eq("slug", team_slug).maybeSingle();
    if (!team) return json({ exists: false });

    const { data: creds } = await sb
      .from("team_payment_credentials")
      .select("public_key, test_mode, status, updated_at")
      .eq("team_id", team.id)
      .eq("provider", "mercadopago")
      .maybeSingle();

    if (!creds) return json({ exists: false });
    return json({ exists: true, public_key: creds.public_key || null, test_mode: !!creds.test_mode, status: creds.status || null, updated_at: creds.updated_at || null });
  } catch (e) {
    return json({ error: "UNEXPECTED", details: String(e) }, { status: 500 });
  }
});
