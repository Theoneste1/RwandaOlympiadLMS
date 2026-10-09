import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AppShell, AuthGate } from "@/components/app-shell";
import { ContentForm } from "@/components/content-form";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Edit Content" };

export default async function EditContentPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "TEACHER") redirect("/login");

  const { id } = await params;
  const content = await prisma.content.findUnique({ where: { id }, include: { class: true } });
  if (!content || content.class.teacherId !== session.userId) notFound();

  return (
    <AuthGate role="teacher">
      <AppShell role="teacher">
        <div className="lms-page space-y-6 p-1">
          <section className="lms-banner">
            <div>
              <p className="lms-banner-kicker">{content.class.name}</p>
              <h1>Edit content</h1>
            </div>
          </section>

          <ContentForm
            mode="edit"
            classes={[]}
            content={{
              id: content.id,
              title: content.title,
              body: content.body,
              type: content.type,
              classId: content.classId,
              attachmentUrl: content.attachmentUrl,
            }}
          />
        </div>
      </AppShell>
    </AuthGate>
  );
}
