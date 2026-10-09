import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AppShell, AuthGate } from "@/components/app-shell";
import { AssignmentForm } from "@/components/assignment-form";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Edit Assignment" };

function toDateTimeLocal(date: Date | null) {
  if (!date) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default async function EditAssignmentPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "TEACHER") redirect("/login");

  const { id } = await params;
  const assignment = await prisma.assignment.findUnique({
    where: { id },
    include: { class: true, questions: { orderBy: { order: "asc" } } },
  });
  if (!assignment || assignment.class.teacherId !== session.userId) notFound();

  return (
    <AuthGate role="teacher">
      <AppShell role="teacher">
        <div className="lms-page space-y-6 p-1">
          <section className="lms-banner">
            <div>
              <p className="lms-banner-kicker">{assignment.class.name}</p>
              <h1>Edit assignment</h1>
            </div>
          </section>

          <AssignmentForm
            mode="edit"
            classes={[]}
            assignment={{
              id: assignment.id,
              title: assignment.title,
              instructions: assignment.instructions,
              classId: assignment.classId,
              dueAt: toDateTimeLocal(assignment.dueAt),
              attachmentUrl: assignment.attachmentUrl,
              questions: assignment.questions.map((q) => ({ id: q.id, text: q.text, points: q.points })),
            }}
          />
        </div>
      </AppShell>
    </AuthGate>
  );
}
