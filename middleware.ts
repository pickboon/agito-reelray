import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { generateCsrfToken } from "@/lib/csrf";

const CSRF_COOKIE_NAME = "__csrf_token";

// S-02: 安全响应头
const SECURITY_HEADERS: Record<string, string> = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "X-XSS-Protection": "0",
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://js.stripe.com https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "media-src 'self' https: blob:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.stripe.com https://aip.baidubce.com https://cdn.jsdelivr.net",
    "frame-src https://js.stripe.com",
    "font-src 'self' https://fonts.gstatic.com",
    "worker-src 'self' blob:",
  ].join("; "),
};

export async function middleware(request: NextRequest) {
  // 跳过静态资源
  const { pathname } = request.nextUrl;
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.includes(".") // static files like robots.txt, favicon
  ) {
    const staticRes = NextResponse.next();
    applySecurityHeaders(staticRes);
    return staticRes;
  }

  let supabaseResponse = NextResponse.next({ request });

  // ── CSRF: 为每个请求注入 double-submit cookie ──
  if (!request.cookies.get(CSRF_COOKIE_NAME)?.value) {
    const token = generateCsrfToken();
    supabaseResponse.cookies.set(CSRF_COOKIE_NAME, token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn("[middleware] Supabase env missing, skipping auth check");
    applySecurityHeaders(supabaseResponse);
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 未登录用户访问 /dashboard 重定向到 /login
  if (!user && pathname.startsWith("/dashboard")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", pathname);
    const res = NextResponse.redirect(url);
    applySecurityHeaders(res);
    return res;
  }

  // 已登录用户访问 /login 重定向到 /dashboard
  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    const res = NextResponse.redirect(url);
    applySecurityHeaders(res);
    return res;
  }

  applySecurityHeaders(supabaseResponse);
  return supabaseResponse;
}

function applySecurityHeaders(response: NextResponse): void {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
