// middleware.js

import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const secret = process.env.NEXTAUTH_SECRET;

export async function middleware(req) {
  const token = await getToken({ req, secret });
  console.log("token::::::::::::::::::::::",token )
console.log("trigerring.......")
  // 🔑 If not logged in → redirect to sign-in
  if (!token) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  // ✅ OWNER-ONLY pages
  const ownerOnlyPaths = [
  
    "/income",
    "/paydetails",
    "/staff",
    "/staff-registation",
    "/StaffAdvancesPage",
    "/reports",
  ];
console.log("req.nextUrl.pathname",req.nextUrl.pathname)
  // Check for /owner/ or any explicit owner-only page
  if (
    req.nextUrl.pathname.startsWith("/owner") ||
    ownerOnlyPaths.includes(req.nextUrl.pathname)
  ) {
    if (token.role !== "owner") {
      // Not an owner → block access
      return NextResponse.redirect(new URL("/sign-in", req.url));
    }
  }

  // ✅ Everything else is accessible for both owner & staff123

  return NextResponse.next();
}

// ✅ Only match protected routes
export const config = {
  matcher: [
    "/owner/:path*",
    "/expenses",
    "/income",
    "/paydetails/:path*",
    "/staff",
    "/staff-registation",
    "/StaffAdvancesPage",
    "/reports",
  ],
};

