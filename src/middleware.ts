import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const { token } = req.nextauth;

    if (pathname.startsWith("/admin") && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    if (pathname.startsWith("/doctor") && token?.role !== "DOCTOR" && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    if (pathname.startsWith("/book") && !token) {
      // Need to be logged in to book, NextAuth will redirect to login anyway if matcher covers it,
      // but let's be explicit if they aren't patient/doctor/admin
      return NextResponse.redirect(new URL("/api/auth/signin", req.url));
    }
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: ["/admin/:path*", "/doctor/:path*", "/book/:path*"],
};
