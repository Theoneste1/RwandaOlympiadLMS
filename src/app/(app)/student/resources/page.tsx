import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell, AuthGate } from "@/components/app-shell";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ContentType } from "@prisma/client";

export const metadata: Metadata = { title: "Resource Library" };

const TYPE_LABELS: Record<ContentType, string> = {
  LESSON: "Lesson",
  VIDEO: "Video",
  NOTE: "Note",
  WORKSHEET: "Worksheet",
  PROBLEM_SET: "Problem set",
};

function buildQuery(params: Record<string, string | undefined>, overrides: Record<string, string>) {
  const next = new URLSearchParams();
  const merged = { ...params, ...overrides };
  for (const [key, value] of Object.entries(merged)) {
    if (value) next.set(key, value);
  }
  const qs = next.toString();
  return qs ? `/student/resources?${qs}` : "/student/resources";
}

export default async function StudentResourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; classId?: string }>;
}) {
  const session = await getSession();
  if (!session || session.role !== "STUDENT") redirect("/login");

  const params = await searchParams;
  const enrollments = await prisma.classEnrollment.findMany({
    where: { studentId: session.userId },
    include: { class: true },
  });
  const classIds = enrollments.map((e) => e.classId);

  const content = classIds.length === 0 ? [] : await prisma.content.findMany({
    where: {
      status: "PUBLISHED",
      classId: { in: classIds },
      ...(params.type ? { type: params.type as ContentType } : {}),
      ...(params.classId ? { classId: params.classId } : {}),
    },
    include: { class: true },
    orderBy: { publishedAt: "desc" },
  });

  return (
    <AuthGate role="student">
      <AppShell role="student">
        <div className="lms-page space-y-6 p-1">
          <section className="lms-banner">
            <div>
              <p className="lms-banner-kicker">Content library</p>
              <h1>Resource Library</h1>
              <p>Lessons, videos, notes, worksheets, and problem sets from your classes.</p>
            </div>
          </section>

          {enrollments.length === 0 ? (
            <div className="lms-empty">You aren&apos;t enrolled in a class yet. Ask your teacher to add you.</div>
          ) : (
            <>
              <div className="lms-filter-bar" aria-label="Filter by class">
                <Link href={buildQuery(params, { classId: "" })} className={`lms-filter-chip ${!params.classId ? "active" : ""}`}>
                  All classes
                </Link>
                {enrollments.map((enrollment) => (
                  <Link
                    key={enrollment.classId}
                    href={buildQuery(params, { classId: enrollment.classId })}
                    className={`lms-filter-chip ${params.classId === enrollment.classId ? "active" : ""}`}
                  >
                    {enrollment.class.name}
                  </Link>
                ))}
              </div>

              {content.length === 0 ? (
                <div className="lms-empty">No resources published yet. Check back soon.</div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {content.map((item) => (
                    <Link key={item.id} href={`/student/content/${item.id}`} className="lms-panel block transition hover:border-sky-300">
                      <p className="text-xs font-bold uppercase tracking-wide text-brand">{TYPE_LABELS[item.type]}</p>
                      <p className="mt-2 text-lg font-black">{item.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{item.class.name}</p>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </AppShell>
    </AuthGate>
  );
}
