import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppShell, AuthGate } from "@/components/app-shell";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { StatusBadge } from "@/components/status-badge";
import { CommentThread, type CommentWithAuthor } from "@/components/comment-thread";
import { publishContentAction, unpublishContentAction, archiveContentAction } from "@/lib/actions/content";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Content" };

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

export default async function TeacherContentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "TEACHER") redirect("/login");

  const { id } = await params;
  const content = await prisma.content.findUnique({ where: { id }, include: { class: true, author: true } });
  if (!content || content.class.teacherId !== session.userId) notFound();

  const comments = await prisma.comment.findMany({
    where: { targetType: "CONTENT", targetId: id },
    include: { author: true },
    orderBy: { createdAt: "asc" },
  });
  const commentData: CommentWithAuthor[] = comments.map((c) => ({
    id: c.id,
    body: c.body,
    authorId: c.authorId,
    authorName: c.author.name,
    createdAt: c.createdAt.toISOString(),
    deletedAt: c.deletedAt ? c.deletedAt.toISOString() : null,
    parentId: c.parentId,
  }));

  return (
    <AuthGate role="teacher">
      <AppShell role="teacher">
        <div className="lms-page space-y-6 p-1">
          <section className="lms-banner">
            <div>
              <p className="lms-banner-kicker">{content.class.name}</p>
              <h1>{content.title}</h1>
              <p>By {content.author.name}</p>
            </div>
            <div className="lms-banner-actions">
              <StatusBadge status={content.status} />
            </div>
          </section>

          <div className="lms-panel space-y-4">
            <div className="lms-table-actions">
              <Link href={`/teacher/content/${content.id}/edit`} className="lms-btn lms-btn-ghost">Edit</Link>
              {content.status === "PUBLISHED" ? (
                <form action={unpublishAction}>
                  <input type="hidden" name="id" value={content.id} />
                  <button type="submit" className="lms-btn lms-btn-ghost">Unpublish</button>
                </form>
              ) : content.status === "DRAFT" ? (
                <form action={publishAction}>
                  <input type="hidden" name="id" value={content.id} />
                  <button type="submit" className="lms-btn lms-btn-primary">Publish</button>
                </form>
              ) : null}
              {content.status !== "ARCHIVED" && (
                <form action={archiveAction}>
                  <input type="hidden" name="id" value={content.id} />
                  <ConfirmSubmitButton
                    confirmText={`Archive "${content.title}"? Students will no longer see it in their library.`}
                    className="lms-btn lms-btn-danger"
                  >
                    Archive
                  </ConfirmSubmitButton>
                </form>
              )}
            </div>

            <p className="whitespace-pre-wrap">{content.body}</p>

            {content.attachmentUrl && (
              <p>
                <a href={content.attachmentUrl} target="_blank" rel="noreferrer" className="lms-btn lms-btn-ghost">
                  View attachment
                </a>
              </p>
            )}
          </div>

          <CommentThread
            targetType="CONTENT"
            targetId={content.id}
            comments={commentData}
            currentUserId={session.userId}
            canModerate
          />
        </div>
      </AppShell>
    </AuthGate>
  );
}
