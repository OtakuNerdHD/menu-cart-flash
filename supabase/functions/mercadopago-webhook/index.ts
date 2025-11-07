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

    const url = new URL(req.url);
    const qsTeam = url.searchParams.get("team_slug");
    const bodyRaw = await req.json().catch(() => ({}));
    const team_slug = qsTeam || bodyRaw?.team_slug || null;
    if (!team_slug) return json({ error: "MISSING_TEAM" }, { status: 400 });

    const { data: team, error: tErr } = await sb.from("teams").select("id, slug").eq("slug", team_slug).maybeSingle();
    if (tErr || !team) return json({ error: "TEAM_NOT_FOUND" }, { status: 400 });

    const paymentId = bodyRaw?.data?.id || bodyRaw?.id || (bodyRaw?.resource ? String(bodyRaw.resource).split("/").pop() : null);
    const eventType = bodyRaw?.type || bodyRaw?.action || "unknown";

    try { await sb.from("payment_events").insert({ team_id: team.id, event_type: "webhook_received", payload: { eventType, body: bodyRaw } }); } catch {}

    const { data: creds } = await sb
      .from("team_payment_credentials")
      .select("access_token_cipher, access_token_iv, status, test_mode")
      .eq("team_id", team.id)
      .eq("provider", "mercadopago")
      .maybeSingle();
    if (!creds || creds.status !== "valid") return json({ error: "CREDENTIALS_INVALID" }, { status: 400 });

    let token = "";
    try { token = await decryptToPlain(creds.access_token_cipher, creds.access_token_iv); }
    catch (e) { return json({ error: "DECRYPT_FAILED", details: String(e) }, { status: 500 }); }

    if (!paymentId) return json({ ok: true, ignored: true, reason: "NO_PAYMENT_ID" });

    const payRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    const payJson: any = await payRes.json().catch(() => ({}));
    if (!payRes.ok) {
      try { await sb.from("payment_events").insert({ team_id: team.id, event_type: "payment_fetch_failed", payload: { paymentId, response: payJson } }); } catch {}
      return json({ error: "PAYMENT_FETCH_FAILED", details: payJson }, { status: 400 });
    }

    const status = (payJson?.status || "").toLowerCase();
    if (!["approved", "accredited"].includes(status)) {
      try {
        const ct = payJson?.metadata?.client_token || null;
        const pid = String(payJson?.id || paymentId);
        await sb.from("orders")
          .update({ payment_status: status || "pending", payment_id: pid })
          .eq("team_id", team.id)
          .or(`payment_id.eq.${pid},client_token.eq.${ct}`);
      } catch {}
      return json({ ok: true, status, skipped: true });
    }

    const metadata = payJson?.metadata || {};
    const address = metadata?.address || null;
    const cartItems = Array.isArray(metadata?.cart_items) ? metadata.cart_items : [];
    const total = metadata?.total ?? payJson?.transaction_amount ?? 0;
    const payment_method = metadata?.payment_method || (payJson?.payment_method_id || "card");

    const client_token = metadata?.client_token || null;
    const created_by = metadata?.created_by || null;

    const { data: existing } = await sb.from("orders")
      .select("id")
      .eq("team_id", team.id)
      .or(`payment_id.eq.${paymentId},client_token.eq.${client_token}`)
      .maybeSingle();
    if (existing?.id) {
      try { await sb.from("orders").update({ payment_status: status, payment_id: String(payJson?.id || paymentId) }).eq("id", existing.id); } catch {}
      try { await sb.from("payment_events").insert({ team_id: team.id, event_type: "order_exists", payload: { order_id: existing.id, payment_id: paymentId } }); } catch {}
      return json({ ok: true, order_id: existing.id, status: "already_exists" });
    }

    const insertOrder = {
      total,
      status: "pending",
      delivery_type: "delivery",
      payment_method,
      address,
      team_id: team.id,
      created_by: created_by ?? null,
      items_json: cartItems,
      client_token,
      payment_id: String(payJson?.id || paymentId),
      payment_status: status,
    } as Record<string, unknown>;
    const { data: orderRow, error: oErr } = await sb.from("orders").insert(insertOrder).select("id").single();
    if (oErr || !orderRow?.id) {
      try { await sb.from("payment_events").insert({ team_id: team.id, event_type: "order_insert_failed", payload: { insertOrder, error: oErr } }); } catch {}
      return json({ error: "ORDER_INSERT_FAILED", details: oErr?.message || oErr }, { status: 500 });
    }

    if (cartItems.length) {
      const itemsPayload = cartItems.map((i: any) => ({
        order_id: orderRow.id,
        product_id: Number(i.product_id),
        quantity: Number(i.quantity),
        price: Number(i.price),
        notes: i.notes ?? null,
        team_id: team.id,
      }));
      try { await sb.from("order_items").insert(itemsPayload); } catch (e) {
        try { await sb.from("payment_events").insert({ team_id: team.id, event_type: "order_items_failed", payload: { order_id: orderRow.id, error: String(e), items: itemsPayload } }); } catch {}
      }
    }

    try { await sb.from("payment_events").insert({ team_id: team.id, event_type: "order_created", payload: { order_id: orderRow.id, payment_id: payJson?.id || paymentId } }); } catch {}
    return json({ ok: true, order_id: orderRow.id });
  } catch (e) {
    return json({ error: "UNEXPECTED", details: String(e) }, { status: 500 });
  }
});