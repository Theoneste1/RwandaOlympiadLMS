import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell, AuthGate } from "@/components/app-shell";
import { AssignmentForm } from "@/components/assignment-form";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Create Assignment" };

export default async function NewAssignmentPage() {
  const session = await getSession();
  if (!session || session.role !== "TEACHER") redirect("/login");

  const classes = await prisma.class.findMany({ where: { teacherId: session.userId }, orderBy: { name: "asc" } });

  return (
    <AuthGate role="teacher">
      <AppShell role="teacher">
        <div className="lms-page space-y-6 p-1">
          <section className="lms-banner">
            <div>
              <p className="lms-banner-kicker">Assignments</p>
              <h1>Create assignment</h1>
              <p>Add questions, an optional attachment, and a due date. Save as a draft or publish right away.</p>
            </div>
          </section>

          {classes.length === 0 ? (
            <div className="lms-empty">You need a class before you can create an assignment. Create one first.</div>
          ) : (
            <AssignmentForm mode="create" classes={classes.map((c) => ({ id: c.id, name: c.name }))} />
          )}
        </div>
      </AppShell>
    </AuthGate>
  );
}
