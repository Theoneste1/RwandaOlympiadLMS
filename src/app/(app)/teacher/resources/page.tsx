import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell, AuthGate } from "@/components/app-shell";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { StatusBadge } from "@/components/status-badge";
import { publishContentAction, unpublishContentAction, archiveContentAction } from "@/lib/actions/content";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ContentStatus, ContentType } from "@prisma/client";

export const metadata: Metadata = { title: "Resource Library" };

async function publishAction(formData: FormData) {
  "use server";
  await publishContentAction({}, formData);
}
async function unpublishAction(formData: FormData) {
  "use server";
  await unpublishContentAction({}, formData);
}
async function archiveAction(formData: FormData) {
  "use server";
  await archiveContentAction({}, formData);
}

const TYPE_LABELS: Record<ContentType, string> = {
  LESSON: "Lesson",
  VIDEO: "Video",
  NOTE: "Note",
  WORKSHEET: "Worksheet",
  PROBLEM_SET: "Problem set",
};

const STATUS_FILTERS: { value: ContentStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "DRAFT", label: "Draft" },
  { value: "PUBLISHED", label: "Published" },
  { value: "ARCHIVED", label: "Archived" },
];

function buildQuery(params: Record<string, string | undefined>, overrides: Record<string, string>) {
  const next = new URLSearchParams();
  const merged = { ...params, ...overrides };
  for (const [key, value] of Object.entries(merged)) {
    if (value) next.set(key, value);
  }
  const qs = next.toString();
  return qs ? `/teacher/resources?${qs}` : "/teacher/resources";
}

export default async function TeacherResourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string; status?: string; type?: string }>;
}) {
  const session = await getSession();
  if (!session || session.role !== "TEACHER") redirect("/login");

  const params = await searchParams;
  const classes = await prisma.class.findMany({ where: { teacherId: session.userId }, orderBy: { name: "asc" } });

  const content = await prisma.content.findMany({
    where: {
      class: { teacherId: session.userId },
      ...(params.classId ? { classId: params.classId } : {}),
      ...(params.status ? { status: params.status as ContentStatus } : {}),
      ...(params.type ? { type: params.type as ContentType } : {}),
    },
    include: { class: true, author: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <AuthGate role="teacher">
      <AppShell role="teacher">
        <div className="lms-page space-y-6 p-1">
          <section className="lms-banner">
            <div>
              <p className="lms-banner-kicker">Content library</p>
              <h1>Resource Library</h1>
              <p>Lessons, videos, notes, worksheets, and problem sets for your classes.</p>
            </div>
            <div className="lms-banner-actions">
              <Link href="/teacher/my-classes" className="lms-btn lms-btn-ghost">Manage classes</Link>
              <Link href="/teacher/content/new" className="lms-btn lms-btn-primary">Create content</Link>
            </div>
          </section>

          {classes.length === 0 ? (
            <div className="lms-empty">
              <p>You don&apos;t have any classes yet. Create one to start adding content.</p>
              <Link href="/teacher/my-classes" className="lms-btn lms-btn-primary mt-4 inline-flex">
                Create your first class
              </Link>
            </div>
          ) : (
            <>
              <div className="lms-filter-bar" aria-label="Filter by status">
                {STATUS_FILTERS.map((item) => (
                  <Link
                    key={item.value}
                    href={buildQuery(params, { status: item.value === "ALL" ? "" : item.value })}
                    className={`lms-filter-chip ${(params.status ?? "ALL") === item.value ? "active" : ""}`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
              <div className="lms-filter-bar" aria-label="Filter by class">
                <Link href={buildQuery(params, { classId: "" })} className={`lms-filter-chip ${!params.classId ? "active" : ""}`}>
                  All classes
                </Link>
                {classes.map((c) => (
                  <Link
                    key={c.id}
                    href={buildQuery(params, { classId: c.id })}
                    className={`lms-filter-chip ${params.classId === c.id ? "active" : ""}`}
                  >
                    {c.name}
                  </Link>
                ))}
              </div>

              {content.length === 0 ? (
                <div className="lms-empty">No content matches these filters yet.</div>
              ) : (
                <div className="lms-table-wrap">
                  <table className="lms-table">
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Class</th>
                        <th>Created by</th>
                        <th>Created</th>
                        <th>Published</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {content.map((item) => (
                        <tr key={item.id}>
                          <td>{item.title}</td>
                          <td>{TYPE_LABELS[item.type]}</td>
                          <td><StatusBadge status={item.status} /></td>
                          <td>{item.class.name}</td>
                          <td>{item.author.name}</td>
                          <td>{item.createdAt.toLocaleDateString()}</td>
                          <td>{item.publishedAt ? item.publishedAt.toLocaleDateString() : "—"}</td>
                          <td>
                            <div className="lms-table-actions">
                              <Link href={`/teacher/content/${item.id}`}>Preview</Link>
                              <Link href={`/teacher/content/${item.id}/edit`}>Edit</Link>
                              {item.status === "PUBLISHED" ? (
                                <form action={unpublishAction}>
                                  <input type="hidden" name="id" value={item.id} />
                                  <button type="submit">Unpublish</button>
                                </form>
                              ) : item.status === "DRAFT" ? (
                                <form action={publishAction}>
                                  <input type="hidden" name="id" value={item.id} />
                                  <button type="submit">Publish</button>
                                </form>
                              ) : null}
                              {item.status !== "ARCHIVED" && (
                                <form action={archiveAction}>
                                  <input type="hidden" name="id" value={item.id} />
                                  <ConfirmSubmitButton confirmText={`Archive "${item.title}"? Students will no longer see it in their library.`}>
                                    Archive
                                  </ConfirmSubmitButton>
                                </form>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </AppShell>
    </AuthGate>
  );
}
