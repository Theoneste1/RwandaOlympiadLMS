import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell, AuthGate } from "@/components/app-shell";
import { createCompetitionAction } from "@/lib/actions/competitions";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Question Bank" };

const SUBJECTS = ["Mathematics", "Physics", "Computing", "Astronomy"];
const TOPICS = ["ALGEBRA", "GEOMETRY", "COMBINATORICS", "NUMBER_THEORY"];

async function createAction(formData: FormData) {
  "use server";
  await createCompetitionAction({}, formData);
}

export default async function QuestionBankPage() {
  const session = await getSession();
  if (!session || session.role !== "TEACHER") redirect("/login");

  const competitions = await prisma.competition.findMany({
    include: { _count: { select: { questions: true, registrations: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <AuthGate role="teacher">
      <AppShell role="teacher">
        <div className="lms-page space-y-6 p-1">
          <section className="lms-banner">
            <div>
              <p className="lms-banner-kicker">Question bank</p>
              <h1>Question Bank</h1>
              <p>Organize Olympiad questions by subject and topic, then reuse them when assigning exams. Shared across all coaches.</p>
            </div>
          </section>

          <details className="lms-panel">
            <summary className="cursor-pointer lms-panel-title">+ Create a new competition / question set</summary>
            <form action={createAction} className="lms-form mt-4">
              <div className="lms-form-row">
                <label>
                  Name
                  <input name="name" required placeholder="e.g. Junior Algebra Set 3" />
                </label>
                <label>
                  Subject
                  <select name="subject" required defaultValue="Mathematics">
                    {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>
                <label>
                  Topic
                  <select name="topic" required defaultValue="ALGEBRA">
                    {TOPICS.map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
                  </select>
                </label>
                <label>
                  Time limit (minutes)
                  <input name="durationMinutes" type="number" min={5} required defaultValue={20} />
                </label>
              </div>
              <label>
                Summary
                <textarea name="summary" rows={2} required placeholder="Short description shown to coaches and students" />
              </label>
              <div className="lms-form-actions">
                <button type="submit" className="lms-btn lms-btn-primary">Create</button>
              </div>
            </form>
          </details>

          {competitions.length === 0 ? (
            <div className="lms-empty">No question sets yet — create one above.</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {competitions.map((c) => (
                <Link key={c.id} href={`/teacher/question-bank/${c.id}`} className="lms-panel hover:border-sky-200">
                  <p className="lms-panel-title">{c.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{c.subject} · {c.topic.replace("_", " ")}</p>
                  <p className="mt-3 text-sm text-slate-600">{c._count.questions} question{c._count.questions === 1 ? "" : "s"} · {c.durationMinutes} min</p>
                  <p className="mt-1 text-xs text-slate-500">{c._count.registrations} registration{c._count.registrations === 1 ? "" : "s"}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </AppShell>
    </AuthGate>
  );
}
