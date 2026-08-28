import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const secret = process.env.NEXTAUTH_SECRET;

export async function middleware(req) {
  // Allow NextAuth API routes and public static assets
  if (
    req.nextUrl.pathname.startsWith("/api/auth") ||
    req.nextUrl.pathname.startsWith("/_next") ||
    req.nextUrl.pathname.startsWith("/favicon.ico") ||
    req.nextUrl.pathname.startsWith("/icons")
  ) {
    return NextResponse.next();
  }

  const token = await getToken({ req, secret });

  // Block all protected routes if not authenticated
  if (!token) {
    const signInUrl = new URL("/sign-in", req.url);
    signInUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Owner-only route enforcement
  const ownerOnlyPaths = [
    "/income",
    "/paydetails",
    "/staff",
    "/staff-registation",
    "/staffAdvancesPage",
    "/StaffAdvancesPage",
    "/reports",
    "/monthly-reports",
    "/staff-list",
    "/sign-up",
    "/admin-users",
    "/dashboard-users",
    "/analytics",
    "/images",
  ];

  const isOwnerPath =
    req.nextUrl.pathname.startsWith("/owner") ||
    ownerOnlyPaths.some((p) => req.nextUrl.pathname.startsWith(p));

  if (isOwnerPath && token.role !== "owner") {
    return NextResponse.redirect(new URL("/expenses", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/owner/:path*",
    "/expenses/:path*",
    "/income/:path*",
    "/paydetails/:path*",
    "/staff/:path*",
    "/staff",
    "/staff-list/:path*",
    "/staff-list",
    "/staff-registation/:path*",
    "/staff-registation",
    "/StaffAdvancesPage/:path*",
    "/StaffAdvancesPage",
    "/staffAdvancesPage/:path*",
    "/staffAdvancesPage",
    "/reports/:path*",
    "/reports",
    "/monthly-reports/:path*",
    "/monthly-reports",
    "/extra-expenses/:path*",
    "/extra-expenses",
    "/sign-up/:path*",
    "/sign-up",
    "/admin-users/:path*",
    "/admin-users",
    "/dashboard-users/:path*",
    "/dashboard-users",
    "/analytics/:path*",
    "/analytics",
    "/attendence/:path*",
    "/attendence",
    "/staffAttendance/:path*",
    "/staffAttendance",
    "/proof/:path*",
    "/proof",
    "/images/:path*",
    "/images",
  ],
};