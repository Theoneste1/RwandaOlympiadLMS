import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  const isTeacherDashboard = pathname === "/Teacher/Dashboard";
  const isTeacherExams = pathname === "/Teacher/Exams";
  const isTeacherArea = pathname.startsWith("/teacher") || isTeacherDashboard || isTeacherExams;
  const isStudentDashboard = pathname === "/Student/Dashboard";
  const isStudentExams = pathname === "/Student/Exams";
  const isStudentResults = pathname === "/Student/Results";
  const isStudentSupport = pathname === "/Student/Support";
  const isStudentArea = pathname.startsWith("/student") || isStudentDashboard || isStudentExams || isStudentResults || isStudentSupport;
  const isAccountArea = pathname.startsWith("/account");
  const isAuthPage = pathname === "/login" || pathname === "/register";

  if ((isTeacherArea || isStudentArea || isAccountArea) && !session) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (isTeacherArea && session?.role !== "TEACHER") {
    return NextResponse.redirect(new URL("/Student/Dashboard", request.url));
  }

  if (isStudentArea && session?.role !== "STUDENT") {
    return NextResponse.redirect(new URL("/Teacher/Dashboard", request.url));
  }

  if (isTeacherDashboard) {
    return NextResponse.rewrite(new URL("/teacher", request.url));
  }

  if (isTeacherExams) {
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = "/teacher/exams";
    return NextResponse.rewrite(rewriteUrl);
  }

  if (isStudentDashboard) {
    return NextResponse.rewrite(new URL("/student", request.url));
  }

  if (isStudentExams) {
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = "/student/exams";
    return NextResponse.rewrite(rewriteUrl);
  }

  if (isStudentResults) {
    return NextResponse.rewrite(new URL("/results", request.url));
  }

  if (isStudentSupport) {
    return NextResponse.rewrite(new URL("/support", request.url));
  }

  if (isAuthPage && session) {
    return NextResponse.redirect(
      new URL(session.role === "TEACHER" ? "/teacher" : "/student", request.url),
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/teacher/:path*", "/Teacher/Dashboard", "/Teacher/Exams", "/student/:path*", "/Student/Dashboard", "/Student/Exams", "/Student/Results", "/Student/Support", "/account/:path*", "/login", "/register"],
};
