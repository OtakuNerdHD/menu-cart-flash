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
    const { team_slug, cart_items, address, payment_method, total, client_token, created_by } = body ?? {};

    if (!team_slug || !Array.isArray(cart_items) || !address || !payment_method || typeof total !== "number") {
      return json({ error: "MISSING_FIELDS" }, { status: 400 });
    }

    if (!["cash", "card_delivery"].includes(String(payment_method))) {
      return json({ error: "UNSUPPORTED_PAYMENT_METHOD" }, { status: 400 });
    }

    const { data: team, error: tErr } = await sb.from("teams").select("id, slug").eq("slug", team_slug).maybeSingle();
    if (tErr || !team) return json({ error: "TEAM_NOT_FOUND" }, { status: 400 });

    const insertOrder = {
      total,
      status: "pending",
      delivery_type: "delivery",
      payment_method,
      address,
      team_id: team.id,
      created_by: created_by ?? null,
      items_json: cart_items,
      client_token: client_token || null,
      payment_status: "pending",
    } as Record<string, unknown>;

    const { data: orderRow, error: oErr } = await sb.from("orders").insert(insertOrder).select("id").single();
    if (oErr || !orderRow?.id) {
      return json({ error: "ORDER_INSERT_FAILED", details: oErr?.message || oErr }, { status: 500 });
    }

    if (Array.isArray(cart_items) && cart_items.length) {
      const itemsPayload = cart_items.map((i: any) => ({
        order_id: orderRow.id,
        product_id: Number(i.product_id),
        quantity: Number(i.quantity),
        price: Number(i.price),
        notes: i.notes ?? null,
        team_id: team.id,
      }));
      try { await sb.from("order_items").insert(itemsPayload); } catch (e) {
        return json({ ok: true, order_id: orderRow.id, items_insert_error: String(e) });
      }
    }

    return json({ ok: true, order_id: orderRow.id });
  } catch (e) {
    return json({ error: "UNEXPECTED", details: String(e) }, { status: 500 });
  }
});