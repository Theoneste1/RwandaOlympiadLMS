import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE, signSessionToken, verifySessionToken, type SessionPayload } from "@/lib/auth";

const DEMO_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: false,
  path: "/",
  maxAge: 60 * 60 * 8,
};

async function getDemoSession(role: "TEACHER" | "STUDENT"): Promise<SessionPayload | null> {
  if (process.env.NODE_ENV === "production") return null;
  const user = await prisma.user.findFirst({
    where: { username: role === "TEACHER" ? "teacher1" : "student1", role },
  });
  return user ? { userId: user.id, role: user.role, name: user.name } : null;
}

async function withDemoCookie(response: NextResponse, session: SessionPayload | null) {
  if (session && process.env.NODE_ENV !== "production") {
    response.cookies.set(SESSION_COOKIE, await signSessionToken(session), DEMO_COOKIE_OPTIONS);
  }
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  let session = token ? await verifySessionToken(token) : null;

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

  const requiredDemoRole = isTeacherArea ? "TEACHER" : isStudentArea ? "STUDENT" : null;
  if (requiredDemoRole && (!session || session.role !== requiredDemoRole)) {
    const demoSession = await getDemoSession(requiredDemoRole);
    if (demoSession) session = demoSession;
  }

  if ((isTeacherArea || isStudentArea || isAccountArea) && !session) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (isTeacherArea && session?.role !== "TEACHER") {
    return withDemoCookie(NextResponse.redirect(new URL("/Student/Dashboard", request.url)), session);
  }

  if (isStudentArea && session?.role !== "STUDENT") {
    return withDemoCookie(NextResponse.redirect(new URL("/Teacher/Dashboard", request.url)), session);
  }

  if (isTeacherDashboard) {
    return withDemoCookie(NextResponse.rewrite(new URL("/teacher", request.url)), session);
  }

  if (isTeacherExams) {
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = "/teacher/exams";
    return withDemoCookie(NextResponse.rewrite(rewriteUrl), session);
  }

  if (isStudentDashboard) {
    return withDemoCookie(NextResponse.rewrite(new URL("/student", request.url)), session);
  }

  if (isStudentExams) {
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = "/student/exams";
    return withDemoCookie(NextResponse.rewrite(rewriteUrl), session);
  }

  if (isStudentResults) {
    return withDemoCookie(NextResponse.rewrite(new URL("/results", request.url)), session);
  }

  if (isStudentSupport) {
    return withDemoCookie(NextResponse.rewrite(new URL("/support", request.url)), session);
  }

  if (isAuthPage && session) {
    return NextResponse.redirect(
      new URL(session.role === "TEACHER" ? "/teacher" : "/student", request.url),
    );
  }

  return withDemoCookie(NextResponse.next(), session);
}

export const config = {
  matcher: ["/teacher/:path*", "/Teacher/Dashboard", "/Teacher/Exams", "/student/:path*", "/Student/Dashboard", "/Student/Exams", "/Student/Results", "/Student/Support", "/account/:path*", "/login", "/register"],
};
