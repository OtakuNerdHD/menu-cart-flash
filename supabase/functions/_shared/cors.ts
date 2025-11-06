export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
  });
  return withCors(res);
}
