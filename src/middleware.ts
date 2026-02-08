import { NextRequest, NextResponse } from "next/server";
import { verifySupabaseJwt } from "@/lib/auth/jwt";
import { withRateLimit, getRateLimitType } from "@/lib/rateLimit";

const PUBLIC_PATHS = ["/", "/login", "/signup", "/contact", "/auth/callback","/support"];
const PUBLIC_PREFIXES = ["/_next", "/favicon.ico", "/robots.txt", "/sitemap.xml"];

const isPublicPath = (pathname: string) => {
  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return true;
  }

  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
};

const getProjectRef = () => {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!baseUrl) {
    return null;
  }

  try {
    const hostname = new URL(baseUrl).hostname;
    const ref = hostname.split(".")[0];
    return ref || null;
  } catch {
    return null;
  }
};

type TokenResult = { token: string | null; debugNote?: string };

const parseMaybeSessionJson = (rawValue: string): string | null => {
  try {
    const parsed = JSON.parse(rawValue);
    if (typeof parsed === "string") {
      return parsed;
    }
    if (parsed?.access_token && typeof parsed.access_token === "string") {
      return parsed.access_token;
    }
  } catch {
    return null;
  }
  return null;
};

const decodeBase64Url = (value: string): string | null => {
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
    return atob(padded);
  } catch {
    return null;
  }
};

const tryDecodeBase64Json = (value: string): string | null => {
  const raw = value.startsWith("base64-") ? value.slice("base64-".length) : value;
  const decoded = decodeBase64Url(raw);
  if (!decoded) {
    return null;
  }
  return parseMaybeSessionJson(decoded);
};

const getAccessToken = (request: NextRequest): TokenResult => {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return { token: authHeader.slice("Bearer ".length), debugNote: "header" };
  }

  const cookieToken = request.cookies.get("sb-access-token")?.value;
  if (cookieToken) {
    return { token: cookieToken, debugNote: "sb-access-token" };
  }

  const allCookies = request.cookies.getAll();
  const projectRef = getProjectRef();
  const authCookies = allCookies.filter((cookie) => /-auth-token(\.\d+)?$/.test(cookie.name));
  const scopedAuthCookies = projectRef
    ? authCookies.filter((cookie) => cookie.name.startsWith(`sb-${projectRef}-auth-token`))
    : authCookies;

  const cookiesToParse = scopedAuthCookies.length ? scopedAuthCookies : authCookies;

  if (cookiesToParse.length) {
    const combinedValue = cookiesToParse
      .slice()
      .sort((a, b) => {
        const aMatch = a.name.match(/\.(\d+)$/);
        const bMatch = b.name.match(/\.(\d+)$/);
        const aIndex = aMatch ? Number(aMatch[1]) : 0;
        const bIndex = bMatch ? Number(bMatch[1]) : 0;
        return aIndex - bIndex;
      })
      .map((cookie) => cookie.value)
      .join("");

    const direct = parseMaybeSessionJson(combinedValue);
    if (direct) {
      return { token: direct, debugNote: "auth-cookie-json" };
    }

    const uriDecoded = (() => {
      try {
        const once = decodeURIComponent(combinedValue);
        const twice = decodeURIComponent(once);
        return twice !== once ? twice : once;
      } catch {
        return null;
      }
    })();

    if (uriDecoded) {
      const uriParsed = parseMaybeSessionJson(uriDecoded);
      if (uriParsed) {
        return { token: uriParsed, debugNote: "auth-cookie-uri-json" };
      }
    }

    const base64Parsed = tryDecodeBase64Json(combinedValue) ?? (uriDecoded ? tryDecodeBase64Json(uriDecoded) : null);
    if (base64Parsed) {
      return { token: base64Parsed, debugNote: "auth-cookie-base64-json" };
    }

    if (combinedValue.split(".").length === 3) {
      return { token: combinedValue, debugNote: "auth-cookie-raw-jwt" };
    }

    if (uriDecoded && uriDecoded.split(".").length === 3) {
      return { token: uriDecoded, debugNote: "auth-cookie-uri-jwt" };
    }

    return { token: null, debugNote: "auth-cookie-parse-failed" };
  }

  return { token: null, debugNote: "no-auth-cookie" };
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isDev = process.env.NODE_ENV !== "production";
  const cookieNames = isDev ? request.cookies.getAll().map((cookie) => cookie.name) : [];
  const authCookieNames = isDev
    ? cookieNames.filter((name) => /-auth-token(\.\d+)?$/.test(name))
    : [];

  if (isDev) {
    console.log("[middleware] cookies:", cookieNames);
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const tokenResult = getAccessToken(request);
  const token = tokenResult.token;
  if (isDev) {
    console.log("[middleware] has token:", Boolean(token), tokenResult.debugNote);
  }
  if (!token) {
    return handleUnauthorized(request, {
      path: pathname,
      cookieNames,
      authCookieNames,
      hasToken: false,
      isDev,
      note: tokenResult.debugNote,
    });
  }

  const payload = await verifySupabaseJwt(token);
  if (!payload?.sub) {
    return handleUnauthorized(request, {
      path: pathname,
      cookieNames,
      authCookieNames,
      hasToken: true,
      isDev,
      note: tokenResult.debugNote,
    });
  }

  // Apply rate limiting for API endpoints using user ID
  if (pathname.startsWith("/api")) {
    const rateLimitType = getRateLimitType(pathname, request.method);
    const rateLimitResult = await withRateLimit(payload.sub, rateLimitType);
    
    if (!rateLimitResult.success) {
      return withDebugHeaders(rateLimitResult.response!, {
        path: pathname,
        cookieNames,
        authCookieNames,
        hasToken: true,
        isDev,
        note: `rate-limited:${rateLimitType}`,
      });
    }
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-id", payload.sub);

  if (typeof payload.email === "string") {
    requestHeaders.set("x-user-email", payload.email);
  }

  const appMetadata = payload.app_metadata as { role?: string } | undefined;
  const role = typeof payload.role === "string" ? payload.role : appMetadata?.role;
  if (role) {
    requestHeaders.set("x-user-role", role);
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  
  // Add rate limit headers for API responses
  if (pathname.startsWith("/api")) {
    const rateLimitType = getRateLimitType(pathname, request.method);
    const info = await withRateLimit(`${payload.sub}:info`, rateLimitType);
    response.headers.set("X-RateLimit-Limit", info.limit.toString());
    response.headers.set("X-RateLimit-Remaining", info.remaining.toString());
    response.headers.set("X-RateLimit-Reset", info.reset.toString());
  }
  
  return withDebugHeaders(response, {
    path: pathname,
    cookieNames,
    authCookieNames,
    hasToken: true,
    isDev,
    note: tokenResult.debugNote,
  });
}

type DebugInfo = {
  path: string;
  cookieNames: string[];
  authCookieNames: string[];
  hasToken: boolean;
  isDev: boolean;
  note?: string;
};

const withDebugHeaders = (response: NextResponse, debug: DebugInfo) => {
  if (!debug.isDev) {
    return response;
  }

  response.headers.set("x-debug-path", debug.path);
  response.headers.set("x-debug-has-token", String(debug.hasToken));
  response.headers.set("x-debug-cookie-names", debug.cookieNames.join(","));
  response.headers.set("x-debug-auth-cookie-names", debug.authCookieNames.join(","));
  if (debug.note) {
    response.headers.set("x-debug-token-note", debug.note);
  }
  return response;
};

const handleUnauthorized = (request: NextRequest, debug: DebugInfo) => {
  if (request.nextUrl.pathname.startsWith("/api")) {
    const response = NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    return withDebugHeaders(response, debug);
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", request.nextUrl.pathname);
  const response = NextResponse.redirect(loginUrl);
  return withDebugHeaders(response, debug);
};

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|map|txt)$).*)"],
};
