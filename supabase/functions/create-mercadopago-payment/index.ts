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
    const {
      team_slug,
      transaction_amount,
      payment_method_id,
      token,
      issuer_id,
      installments,
      payer,
      description,
      metadata,
    } = body ?? {};

    if (!team_slug || !transaction_amount) {
      return json({ error: "MISSING_FIELDS" }, { status: 400 });
    }

    // Isolamento multi-tenant por origem
    try {
      const origin = (req.headers.get("origin") || "").toLowerCase();
      const host = origin.replace(/^https?:\/\//, "").split("/")[0];
      const parts = host.split(".");
      const isLocal = host.includes("localhost") || host.includes("127.0.0.1");
      const originSlug = parts.length > 2 ? parts[0] : "";
      if (!isLocal && originSlug && originSlug !== String(team_slug)) {
        return json({ error: "TENANT_MISMATCH", details: { origin, originSlug, team_slug } }, { status: 403 });
      }
    } catch {}

    const { data: team } = await sb
      .from("teams")
      .select("id, slug")
      .eq("slug", team_slug)
      .maybeSingle();
    if (!team) return json({ error: "TEAM_NOT_FOUND" }, { status: 400 });

    const { data: creds } = await sb
      .from("team_payment_credentials")
      .select("public_key, access_token_cipher, access_token_iv, test_mode, status")
      .eq("team_id", team.id)
      .eq("provider", "mercadopago")
      .maybeSingle();
    if (!creds || creds.status !== "valid") return json({ error: "CREDENTIALS_INVALID" }, { status: 400 });

    let accessToken = "";
    try {
      accessToken = await decryptToPlain(creds.access_token_cipher, creds.access_token_iv);
    } catch (e) {
      return json({ error: "DECRYPT_FAILED", details: String(e) }, { status: 500 });
    }

    const payBody: any = {
      transaction_amount: Number(transaction_amount),
      description: description || "",
      payment_method_id: payment_method_id || "",
      payer: payer || undefined,
    };

    if (metadata && typeof metadata === "object") payBody.metadata = metadata;

    // Regras específicas para PIX: garantir payer com email
    const isPix = (String(payment_method_id || "").toLowerCase() === "pix");
    if (isPix) {
      // PIX sempre precisa de um email no payer
      let email = (payer?.email || "").trim();
      
      // Se não fornecido, tentar buscar do perfil do usuário
      if (!email && metadata && typeof metadata === "object" && (metadata as any).created_by) {
        try {
          const { data: profile } = await sb
            .from("profiles")
            .select("email")
            .eq("id", (metadata as any).created_by)
            .maybeSingle();
          if (profile?.email) email = String(profile.email).trim();
        } catch {}
      }
      
      // Se ainda não tiver email, usar um email padrão (será substituído no frontend)
      if (!email) {
        email = "cliente@exemplo.com";
      }
      
      payBody.payer = { email };
    }

    // Dados específicos de cartão
    if ((payment_method_id || "").toLowerCase().includes("card") || token) {
      payBody.token = token;
      if (issuer_id) payBody.issuer_id = issuer_id;
      payBody.installments = Number(installments || 1);
    }

    console.log('[create-payment] Enviando para Mercado Pago:', JSON.stringify(payBody));
    
    // Gera chave de idempotência obrigatória pelo Mercado Pago
    const idempotencyKey = String(
      (metadata && ((metadata as any).client_token || (metadata as any).order_id)) || `${team.slug}-${Date.now()}`
    );

    const res = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: { 
        Authorization: `Bearer ${accessToken}`, 
        "Content-Type": "application/json",
        "X-Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(payBody),
    });

    const paymentJson = await res.json().catch(() => ({}));
    
    console.log('[create-payment] Resposta Mercado Pago:', { status: res.status, body: JSON.stringify(paymentJson) });

    try {
      await sb.from("payment_events").insert({
        team_id: team.id,
        event_type: res.ok ? "payment_created" : "payment_failed",
        payload: { request: payBody, response: paymentJson },
      });
    } catch (e) {
      console.warn('[create-payment] Erro ao salvar evento:', e);
    }

    if (!res.ok) {
      console.error('[create-payment] Erro do Mercado Pago:', paymentJson);
      return json({ error: "PAYMENT_FAILED", details: paymentJson }, { status: 400 });
    }

    // Retornar o JSON do pagamento
    return json(paymentJson);
  } catch (e) {
    return json({ error: "UNEXPECTED", details: String(e) }, { status: 500 });
  }
});