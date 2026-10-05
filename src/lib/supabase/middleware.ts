import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();

  // Gate real: a página /admin e as rotas /api/admin exigem um ADMIN autenticado.
  // Estar logado não basta — o e-mail precisa estar na allow-list (ADMIN_EMAILS).
  const path = request.nextUrl.pathname;
  const isProtected = path.startsWith("/admin") || path.startsWith("/api/admin");
  const allowedAdmins = (process.env.ADMIN_EMAILS ?? "administrador@pax.com")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  const isAdmin = Boolean(user) && allowedAdmins.includes((user!.email ?? "").toLowerCase());

  if (isProtected && !isAdmin) {
    if (path.startsWith("/api/")) {
      return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}