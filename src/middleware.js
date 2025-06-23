import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const secret = process.env.NEXTAUTH_SECRET;

export async function middleware(req) {
  const token = await getToken({ req, secret });
  console.log("token::::::::", token);
  console.log("checking::::::::", req.nextUrl.pathname);

  // ⛔️ Block all protected routes if not authenticated
  if (!token) {
    return NextResponse.redirect(`${req.nextUrl.origin}/sign-in`);
  }



  // ✅ Owner-only enforcement
  const ownerOnlyPaths = [
    "/income",
    "/paydetails",
    "/staff",
    "/staff-registation",
    "/StaffAdvancesPage",
    "/reports",
    "/staff-list",
       "/attendence", 
        "/sign-up" 
  ];

  if (
    req.nextUrl.pathname.startsWith("/owner") ||
    ownerOnlyPaths.includes(req.nextUrl.pathname)
  ) {
    if (token.role !== "owner") {
      return NextResponse.redirect(`${req.nextUrl.origin}/sign-in`);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/owner/:path*",
    "/expenses/:path*",
    "/income",
    "/paydetails/:path*",
    "/staff",
    "/staff-list",
    "/staff-registation",
    "/StaffAdvancesPage",
    "/reports",
  ],
};
