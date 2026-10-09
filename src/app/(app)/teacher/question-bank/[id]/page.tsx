import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppShell, AuthGate } from "@/components/app-shell";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { addQuestionAction, deleteQuestionAction, updateQuestionAction } from "@/lib/actions/competitions";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Question Bank" };

async function addAction(formData: FormData) {
  "use server";
  await addQuestionAction({}, formData);
}
async function updateAction(formData: FormData) {
  "use server";
  await updateQuestionAction({}, formData);
}
async function deleteAction(formData: FormData) {
  "use server";
  await deleteQuestionAction({}, formData);
}

// `scope` (e.g. "Question 2") disambiguates accessible names across the add-question form and
// every (collapsed-but-still-in-the-DOM) per-question edit form, so screen readers and
// form-filling tools never see two fields both just called "Choice 1 is correct".
function ChoiceFields({ scope, defaults, correctIndex }: { scope?: string; defaults?: string[]; correctIndex?: number }) {
  const label = (i: number) => (scope ? `${scope} choice ${i + 1}` : `Choice ${i + 1}`);
  return (
    <div className="grid gap-2">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-2">
          <input type="radio" name="correctIndex" value={i} defaultChecked={correctIndex === i} required aria-label={`${label(i)} is correct`} />
          <input name="choice" required defaultValue={defaults?.[i] ?? ""} placeholder={`Choice ${i + 1}`} aria-label={label(i)} className="flex-1" />
        </div>
      ))}
    </div>
  );
}

export default async function QuestionBankDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "TEACHER") redirect("/login");

  const { id } = await params;
  const competition = await prisma.competition.findUnique({
    where: { id },
    include: { questions: { orderBy: { order: "asc" }, include: { _count: { select: { answers: true } } } } },
  });
  if (!competition) notFound();

  const totalPoints = competition.questions.reduce((sum, q) => sum + q.points, 0);

  return (
    <AuthGate role="teacher">
      <AppShell role="teacher">
        <div className="lms-page space-y-6 p-1">
          <section className="lms-banner">
            <div>
              <p className="lms-banner-kicker">{competition.subject} · {competition.topic.replace("_", " ")}</p>
              <h1>{competition.name}</h1>
              <p>{competition.questions.length} questions · {totalPoints} points · {competition.durationMinutes} min</p>
            </div>
            <div className="lms-banner-actions">
              <Link href="/teacher/question-bank" className="lms-btn lms-btn-ghost">Back</Link>
              <Link href="/teacher#assign-competition" className="lms-btn lms-btn-primary">Assign to students</Link>
            </div>
          </section>

          <details className="lms-panel">
            <summary className="cursor-pointer lms-panel-title">+ Add a question</summary>
            <form action={addAction} className="lms-form mt-4">
              <input type="hidden" name="competitionId" value={competition.id} />
              <label>
                Question text
                <textarea name="text" rows={2} required placeholder="What is...?" />
              </label>
              <p className="text-xs text-muted-foreground">Mark the correct choice with the radio button.</p>
              <ChoiceFields />
              <div className="lms-form-row">
                <label className="lms-question-points">
                  Marks
                  <input name="points" type="number" min={1} defaultValue={1} required />
                </label>
              </div>
              <div className="lms-form-actions">
                <button type="submit" className="lms-btn lms-btn-primary">Add question</button>
              </div>
            </form>
          </details>

          {competition.questions.length === 0 ? (
            <div className="lms-empty">No questions yet — add your first one above.</div>
          ) : (
            <div className="space-y-3">
              {competition.questions.map((q, i) => {
                const choices = JSON.parse(q.choices) as string[];
                const hasAnswers = q._count.answers > 0;
                return (
                  <details key={q.id} className="lms-panel">
                    <summary className="flex cursor-pointer items-start justify-between gap-3">
                      <span>
                        <span className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Question {i + 1} · {q.points} pt{q.points === 1 ? "" : "s"}</span>
                        <span className="mt-1 block font-semibold">{q.text}</span>
                      </span>
                    </summary>
                    <form action={updateAction} className="lms-form mt-4">
                      <input type="hidden" name="id" value={q.id} />
                      <label>
                        {`Question ${i + 1} text`}
                        <textarea name="text" rows={2} required defaultValue={q.text} />
                      </label>
                      <ChoiceFields scope={`Question ${i + 1}`} defaults={choices} correctIndex={q.correctIndex} />
                      <div className="lms-form-row">
                        <label className="lms-question-points">
                          {`Question ${i + 1} marks`}
                          <input name="points" type="number" min={1} defaultValue={q.points} required />
                        </label>
                      </div>
                      <div className="lms-form-actions">
                        <button type="submit" className="lms-btn lms-btn-primary">Save changes</button>
                      </div>
                    </form>
                    <form action={deleteAction} className="mt-2">
                      <input type="hidden" name="id" value={q.id} />
                      {hasAnswers ? (
                        <p className="text-xs text-muted-foreground">Can&apos;t delete — students have already answered this question.</p>
                      ) : (
                        <ConfirmSubmitButton confirmText="Delete this question?" className="lms-btn lms-btn-danger">
                          Delete question
                        </ConfirmSubmitButton>
                      )}
                    </form>
                  </details>
                );
              })}
            </div>
          )}
        </div>
      </AppShell>
    </AuthGate>
  );
}
