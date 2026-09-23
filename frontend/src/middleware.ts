import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const accessToken = request.cookies.get("access_token")?.value;
  const refreshToken = request.cookies.get("refresh_token")?.value;
  const isAuthenticated = Boolean(accessToken || refreshToken);

  const isAuthPage =
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password");

  const isProtectedRoute =
    pathname === "/" ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/reviews") ||
    pathname.startsWith("/agents") ||
    pathname.startsWith("/posts") ||
    pathname.startsWith("/analytics") ||
    pathname.startsWith("/qr") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/social") ||
    pathname.startsWith("/gmb");

  // Redirect root URL to /dashboard if logged in or /login if not
  if (pathname === "/") {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    } else {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // If user is authenticated and trying to access login/signup -> redirect to /dashboard
  if (isAuthPage && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // If user is NOT authenticated and trying to access a protected route -> redirect to /login
  if (isProtectedRoute && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/reviews/:path*",
    "/agents/:path*",
    "/posts/:path*",
    "/analytics/:path*",
    "/qr/:path*",
    "/settings/:path*",
    "/social/:path*",
    "/gmb/:path*",
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password"
  ]
};

