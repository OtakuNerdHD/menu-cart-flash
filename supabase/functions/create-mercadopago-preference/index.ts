// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { withCors, json } from "../_shared/cors.ts";
import { decryptToPlain } from "../_shared/crypto.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return withCors(new Response(null, { status: 204 }));
  try {
    if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, { status: 405 });

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

    const body = await req.json().catch(() => ({}));
    const { team_slug, items, payer, back_urls, notification_url, external_reference, statement_descriptor, metadata } = body ?? {};
    if (!team_slug || !Array.isArray(items) || items.length === 0) {
      return json({ error: "MISSING_FIELDS" }, { status: 400 });
    }

    // Validação de isolamento multi-tenant por origem do subdomínio
    try {
      const origin = (req.headers.get("origin") || "").toLowerCase();
      const host = origin.replace(/^https?:\/\//, "").split("/")[0];
      const parts = host.split(".");
      const isLocal = host.includes("localhost") || host.includes("127.0.0.1");
      const originSlug = parts.length > 2 ? parts[0] : "";
      if (!isLocal && originSlug && originSlug !== String(team_slug)) {
        return json({ error: "TENANT_MISMATCH", details: { origin, originSlug, team_slug } }, { status: 403 });
      }
    } catch { /* ignore validação de origem se indisponível */ }

    const { data: team, error: tErr } = await sb.from("teams").select("id, slug").eq("slug", team_slug).maybeSingle();
    if (tErr || !team) return json({ error: "TEAM_NOT_FOUND" }, { status: 400 });

    const { data: creds } = await sb
      .from("team_payment_credentials")
      .select("public_key, access_token_cipher, access_token_iv, test_mode, status")
      .eq("team_id", team.id)
      .eq("provider", "mercadopago")
      .maybeSingle();
    if (!creds || creds.status !== "valid") return json({ error: "CREDENTIALS_INVALID" }, { status: 400 });

    // Decrypt access token
    let token = "";
    try {
      token = await decryptToPlain(creds.access_token_cipher, creds.access_token_iv);
    } catch (e) {
      return json({ error: "DECRYPT_FAILED", details: String(e) }, { status: 500 });
    }

    const functionsBase = `${SUPABASE_URL}/functions/v1`;
    const notifyUrl = notification_url || `${functionsBase}/mercadopago-webhook?team_slug=${encodeURIComponent(team_slug)}`;

    const prefBody: any = {
      items: items.map((i: any) => ({
        title: i.title,
        quantity: i.quantity,
        unit_price: i.unit_price,
        currency_id: i.currency_id || "BRL",
      })),
      payer: payer || null,
      back_urls: back_urls || null,
      notification_url: notifyUrl,
      external_reference,
      statement_descriptor,
      auto_return: "approved",
      binary_mode: false,
    };
    if (metadata && typeof metadata === "object") prefBody.metadata = metadata;

    const prefRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(prefBody),
    });
    const prefJson = await prefRes.json().catch(() => ({}));
    if (!prefRes.ok) {
      try {
        await sb.from("payment_events").insert({ team_id: team.id, event_type: "preference_failed", payload: { request: prefBody, response: prefJson } });
      } catch { /* ignore */ }
      return json({ error: "PREFERENCE_FAILED", details: prefJson }, { status: 400 });
    }

    try {
      await sb.from("payment_preferences").upsert({
        preference_id: prefJson.id,
        team_id: team.id,
        external_reference: external_reference ?? null,
        init_point: prefJson.init_point ?? null,
      });
    } catch { /* ignore */ }

    return json({ ok: true, preference: prefJson, test_mode: !!creds.test_mode });
  } catch (e) {
    return json({ error: "UNEXPECTED", details: String(e) }, { status: 500 });
  }
});
