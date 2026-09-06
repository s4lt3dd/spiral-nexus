import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Next.js root "proxy" convention (formerly "middleware"). Runs on every
// matched request to refresh the Supabase session and guard app routes.
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Run on all paths except static assets, images, and the /up liveness
    // probe, which must answer without touching auth or the database.
    "/((?!_next/static|_next/image|favicon.ico|up$|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
