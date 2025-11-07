export function withCors(resp: Response): Response {
  const corsHeaders = new Headers({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-tenant-id, x-app-role, x-restaurant-id, x-client-info",
  });
  const headers = new Headers(resp.headers);
  for (const [k, v] of corsHeaders.entries()) headers.set(k, v);
  return new Response(resp.body, { status: resp.status, headers });
}

export function json(data: unknown, init?: { status?: number; headers?: Record<string, string> }): Response {
  const headers = new Headers({ "Content-Type": "application/json" });
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, apikey, x-tenant-id, x-app-role, x-restaurant-id, x-client-info");
  if (init?.headers) {
    for (const [k, v] of Object.entries(init.headers)) headers.set(k, v);
  }
  return new Response(JSON.stringify(data), { status: init?.status ?? 200, headers });
}
