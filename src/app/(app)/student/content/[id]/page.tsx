import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppShell, AuthGate } from "@/components/app-shell";
import { CommentThread, type CommentWithAuthor } from "@/components/comment-thread";
import { isEnrolledInClass } from "@/lib/assignments";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Content" };

export default async function StudentContentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "STUDENT") redirect("/login");

  const { id } = await params;
  const content = await prisma.content.findUnique({ where: { id }, include: { class: true, author: true } });
  if (!content) notFound();

  // Draft content is never reachable by a student, even by direct URL. Archived content stays
  // viewable to students who remain enrolled, but drops out of the default library list.
  const enrolled = await isEnrolledInClass(content.classId, session.userId);
  if (!enrolled || content.status === "DRAFT") notFound();

  const comments = await prisma.comment.findMany({
    where: { targetType: "CONTENT", targetId: id },
    include: { author: true },
    orderBy: { createdAt: "asc" },
  });
  const commentData: CommentWithAuthor[] = comments.map((comment) => ({
    id: comment.id,
    body: comment.body,
    authorId: comment.authorId,
    authorName: comment.author.name,
    createdAt: comment.createdAt.toISOString(),
    deletedAt: comment.deletedAt ? comment.deletedAt.toISOString() : null,
    parentId: comment.parentId,
  }));

  return (
    <AuthGate role="student">
      <AppShell role="student">
        <div className="lms-page space-y-6 p-1">
          <section className="lms-banner">
            <div>
              <p className="lms-banner-kicker">{content.class.name}</p>
              <h1>{content.title}</h1>
              <p>By {content.author.name}</p>
            </div>
          </section>

          <Link href="/student/resources" className="lms-btn lms-btn-ghost inline-flex w-fit">← Back to library</Link>

          <div className="lms-panel">
            <p className="whitespace-pre-wrap">{content.body}</p>
            {content.attachmentUrl && (
              <p className="mt-3">
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
            canModerate={false}
          />
        </div>
      </AppShell>
    </AuthGate>
  );
}
