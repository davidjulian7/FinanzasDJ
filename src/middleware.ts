import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const LOGIN_PATH = "/login";
const PUBLIC_API = ["/api/auth/login", "/api/auth/logout", "/api/auth/me", "/api/auth/register"];
const METODOS_MUTANTES = ["POST", "PUT", "PATCH", "DELETE"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // CSRF: en métodos mutantes, si llega header Origin (navegadores siempre lo
  // envían), debe coincidir con el host del sitio. Sin header (curl, SSRF) se permite.
  if (METODOS_MUTANTES.includes(req.method)) {
    const origin = req.headers.get("origin");
    if (origin) {
      try {
        if (new URL(origin).host !== req.nextUrl.host) {
          return NextResponse.json({ error: "Origen no permitido" }, { status: 403 });
        }
      } catch {
        return NextResponse.json({ error: "Origen no permitido" }, { status: 403 });
      }
    }
  }

  const res = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, {
              ...options,
              sameSite: "strict",
              secure: process.env.NODE_ENV === "production",
            })
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const authed = !!user;

  if (PUBLIC_API.some((p) => pathname.startsWith(p))) {
    return res;
  }

  if (pathname === LOGIN_PATH) {
    if (authed) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return res;
  }

  if (!authed) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const url = new URL(LOGIN_PATH, req.url);
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|manifest.webmanifest|icons|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};