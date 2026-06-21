import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Refreshes the auth session on every request and guards app routes.
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protect authenticated surfaces. Add prefixes here as the app grows.
  // /listings (browse + detail) and /u (public profiles) are sign-in-only:
  // trademarks and member profiles are visible only to signed-in users
  // (founder decision — invite-only pre-launch). Reopen to anon for SEO at
  // Launch. /onboarding is the first-sign-in flow, so it requires auth too.
  const protectedPrefixes = [
    "/dashboard",
    "/messages",
    "/listings",
    "/network",
    "/saved",
    "/u",
    "/onboarding",
  ];
  const needsAuth = protectedPrefixes.some((p) =>
    request.nextUrl.pathname.startsWith(p),
  );

  if (!user && needsAuth) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
