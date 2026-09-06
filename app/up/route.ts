// Liveness probe for kamal-proxy (default path /up) and external uptime
// checks. Deliberately does not touch the database: a DB incident must not
// make the proxy pull the app out of rotation and hide the real error page.
export const dynamic = "force-dynamic";

export function GET() {
  return new Response("ok", {
    status: 200,
    headers: { "cache-control": "no-store" },
  });
}
