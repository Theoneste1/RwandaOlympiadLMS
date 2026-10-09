import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell, AuthGate } from "@/components/app-shell";
import { ContentForm } from "@/components/content-form";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Create Content" };

export default async function NewContentPage() {
  const session = await getSession();
  if (!session || session.role !== "TEACHER") redirect("/login");

  const classes = await prisma.class.findMany({ where: { teacherId: session.userId }, orderBy: { name: "asc" } });

  return (
    <AuthGate role="teacher">
      <AppShell role="teacher">
        <div className="lms-page space-y-6 p-1">
          <section className="lms-banner">
            <div>
              <p className="lms-banner-kicker">Content library</p>
              <h1>Create content</h1>
              <p>Lessons, videos, notes, worksheets, and problem sets start as a draft until you publish them.</p>
            </div>
          </section>

          {classes.length === 0 ? (
            <div className="lms-empty">You need a class before you can add content. Create one first.</div>
          ) : (
            <ContentForm mode="create" classes={classes.map((c) => ({ id: c.id, name: c.name }))} />
          )}
        </div>
      </AppShell>
    </AuthGate>
  );
}
