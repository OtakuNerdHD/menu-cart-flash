<<<<<<< HEAD
export function withCors(resp: Response): Response {
  const corsHeaders = new Headers({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-tenant-id, x-app-role, x-restaurant-id, x-client-info",
=======
export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-app-role, x-tenant-id, x-restaurant-id, x-requested-with",
};

export function withCors(res: Response): Response {
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(corsHeaders)) headers.set(k, v);
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  return new Response(res.body, { status: res.status, headers });
}

export function json(body: unknown, init?: ResponseInit): Response {
  const res = new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: new Headers({ "Content-Type": "application/json", ...(init?.headers || {}) }),
>>>>>>> d25b33b431c73611ccee8a3d119fb19b2d1138d0
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
