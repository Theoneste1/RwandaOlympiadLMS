import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell, AuthGate } from "@/components/app-shell";
import { AddStudentForm } from "@/components/add-student-form";
import { AssignCompetitionForm } from "@/components/assign-competition-form";
import { TeacherRoster, type RosterEntry } from "@/components/teacher-roster";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatTopicLabel, topicMasteryFromAttempts } from "@/lib/insights";

export const metadata: Metadata = { title: "Teacher Dashboard" };

function average(scores: { score: number | null; maxScore: number | null }[]) {
  const usable = scores.filter((s) => s.score != null && s.maxScore);
  if (usable.length === 0) return null;
  const pct = usable.reduce((sum, s) => sum + (s.score! / s.maxScore!) * 100, 0) / usable.length;
  return Math.round(pct);
}

export default async function TeacherDashboardPage() {
  const session = await getSession();
  if (!session || session.role !== "TEACHER") redirect("/login");

  const [classes, pendingSubmissions, pendingCount, studentCount, myStudents, competitions, registrations, draftContentCount, managedStudentAttempts] =
    await Promise.all([
      prisma.class.findMany({
        where: { teacherId: session.userId },
        include: { enrollments: true, assignments: { include: { submissions: true } } },
        orderBy: { createdAt: "asc" },
      }),
      prisma.assignmentSubmission.findMany({
        where: { status: "PENDING_GRADING", assignment: { class: { teacherId: session.userId } } },
        include: { assignment: true, student: true },
        orderBy: { submittedAt: "asc" },
        take: 6,
      }),
      prisma.assignmentSubmission.count({
        where: { status: "PENDING_GRADING", assignment: { class: { teacherId: session.userId } } },
      }),
      prisma.user.count({ where: { role: "STUDENT", managedById: session.userId } }),
      prisma.user.findMany({ where: { role: "STUDENT", managedById: session.userId }, orderBy: { name: "asc" } }),
      prisma.competition.findMany({ orderBy: { name: "asc" } }),
      prisma.registration.findMany({
        where: { assignedById: session.userId },
        include: { student: true, competition: true, attempt: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.content.count({ where: { authorId: session.userId, status: "DRAFT" } }),
      prisma.examAttempt.findMany({
        where: { status: "SUBMITTED", registration: { student: { managedById: session.userId } } },
        select: { score: true, totalPoints: true, registration: { select: { competition: { select: { topic: true } }, studentId: true } } },
      }),
    ]);

  const allGraded = classes.flatMap((c) => c.assignments.flatMap((a) => a.submissions.filter((s) => s.status === "GRADED")));
  const overallAverage = average(allGraded);

  const classTopicMastery = topicMasteryFromAttempts(
    managedStudentAttempts.map((a) => ({ score: a.score, totalPoints: a.totalPoints, topic: a.registration.competition.topic })),
  );
  const weakestClassTopic = classTopicMastery.length ? classTopicMastery[classTopicMastery.length - 1] : null;
  const strugglingOnWeakestTopic = weakestClassTopic
    ? new Set(
        managedStudentAttempts
          .filter((a) => a.registration.competition.topic === weakestClassTopic.topic && a.totalPoints && (a.score ?? 0) / a.totalPoints < 0.6)
          .map((a) => a.registration.studentId),
      ).size
    : 0;
  const activeStudentIds = new Set([
    ...classes.flatMap((c) => c.assignments.flatMap((a) => a.submissions.filter((s) => s.status !== "IN_PROGRESS").map((s) => s.studentId))),
    ...managedStudentAttempts.map((a) => a.registration.studentId),
  ]);
  const inactiveStudentCount = myStudents.filter((s) => !activeStudentIds.has(s.id)).length;

  const rosterEntries: RosterEntry[] = registrations.map((r) => ({
    registrationId: r.id,
    studentId: r.studentId,
    studentName: r.student.name,
    studentIdNumber: r.student.studentIdNumber,
    grade: r.student.grade,
    competitionName: r.competition.name,
    status: r.status,
    attemptId: r.attempt?.id ?? null,
    score: r.attempt?.score ?? null,
    totalPoints: r.attempt?.totalPoints ?? null,
  }));

  return (
    <AuthGate role="teacher">
      <AppShell role="teacher">
        <div className="space-y-6">
          <section className="rounded-[2rem] bg-gradient-to-r from-emerald-900 via-sky-900 to-indigo-900 p-6 text-white shadow-xl sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-emerald-200">Teacher portal</p>
            <h1 className="mt-3 text-3xl font-black sm:text-4xl">Welcome back, {session.name.split(" ")[0]}</h1>
            <p className="mt-2 text-sm text-emerald-100/80">Your classes, submissions, and student roster.</p>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Classes", value: String(classes.length) },
              { label: "Students", value: String(studentCount) },
              { label: "Pending grading", value: String(pendingCount) },
              { label: "Average score", value: overallAverage != null ? `${overallAverage}%` : "—" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">{stat.label}</p>
                <p className="mt-3 text-3xl font-black text-slate-900">{stat.value}</p>
              </div>
            ))}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black text-slate-900">Coach Intelligence</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {weakestClassTopic && weakestClassTopic.percentage < 70 && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="font-black text-slate-900">{formatTopicLabel(weakestClassTopic.topic)} needs attention</p>
                  <p className="mt-1 text-sm text-slate-700">
                    Your students are averaging {weakestClassTopic.percentage}% in {formatTopicLabel(weakestClassTopic.topic).toLowerCase()}
                    {strugglingOnWeakestTopic > 0 ? `, and ${strugglingOnWeakestTopic} student${strugglingOnWeakestTopic === 1 ? " is" : "s are"} scoring below 60%.` : "."}
                  </p>
                  <Link href="/teacher/assignments/new" className="mt-2 inline-flex text-sm font-semibold text-amber-800 hover:underline">Create a practice assignment →</Link>
                </div>
              )}
              {pendingCount > 0 && (
                <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
                  <p className="font-black text-slate-900">Grading needs attention</p>
                  <p className="mt-1 text-sm text-slate-700">{pendingCount} submission{pendingCount === 1 ? "" : "s"} waiting for grading.</p>
                  <Link href="/teacher/assignments" className="mt-2 inline-flex text-sm font-semibold text-sky-800 hover:underline">Review submissions →</Link>
                </div>
              )}
              {draftContentCount > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="font-black text-slate-900">Draft content waiting</p>
                  <p className="mt-1 text-sm text-slate-700">{draftContentCount} item{draftContentCount === 1 ? "" : "s"} saved as draft and not visible to students yet.</p>
                  <Link href="/teacher/resources?status=DRAFT" className="mt-2 inline-flex text-sm font-semibold text-slate-700 hover:underline">Review drafts →</Link>
                </div>
              )}
              {inactiveStudentCount > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="font-black text-slate-900">No activity yet</p>
                  <p className="mt-1 text-sm text-slate-700">{inactiveStudentCount} of your student{inactiveStudentCount === 1 ? "" : "s"} {inactiveStudentCount === 1 ? "hasn't" : "haven't"} submitted any assignment or exam yet.</p>
                </div>
              )}
              {!weakestClassTopic && pendingCount === 0 && draftContentCount === 0 && inactiveStudentCount === 0 && (
                <p className="text-sm text-slate-500">Nothing needs your attention right now.</p>
              )}
            </div>
          </section>

          <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-black text-slate-900">My Classes</h2>
                <Link href="/teacher/classes" className="text-sm font-semibold text-sky-700 hover:underline">Manage</Link>
              </div>

              {classes.length === 0 ? (
                <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                  You don&apos;t have any classes yet.
                  <Link href="/teacher/classes" className="mt-2 block font-semibold text-sky-700 hover:underline">Create your first class →</Link>
                </div>
              ) : (
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {classes.map((item) => {
                    const submissions = item.assignments.flatMap((a) => a.submissions);
                    const pending = submissions.filter((s) => s.status === "PENDING_GRADING").length;
                    const avg = average(submissions.filter((s) => s.status === "GRADED"));
                    return (
                      <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-lg font-black text-slate-900">{item.name}</p>
                          {pending > 0 && <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700">{pending} pending</span>}
                        </div>
                        <p className="mt-2 text-sm text-slate-600">{item.subject}</p>
                        <p className="mt-2 text-sm text-slate-500">{item.enrollments.length} students</p>
                        <p className="mt-2 text-sm text-slate-500">Average: {avg != null ? `${avg}%` : "No grades yet"}</p>
                        <Link href={`/teacher/classes/${item.id}`} className="mt-4 inline-flex rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700">
                          Open Class
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-black text-slate-900">To Review</h2>
              {pendingSubmissions.length === 0 ? (
                <p className="mt-5 text-sm text-slate-500">No submissions are waiting for grading.</p>
              ) : (
                <div className="mt-5 space-y-3">
                  {pendingSubmissions.map((submission) => (
                    <Link
                      key={submission.id}
                      href={`/teacher/assignments/${submission.assignmentId}/submissions/${submission.id}`}
                      className="block rounded-2xl border border-slate-200 bg-slate-50 p-4 hover:border-sky-200 hover:bg-sky-50"
                    >
                      <p className="font-black text-slate-900">{submission.assignment.title}</p>
                      <p className="mt-2 text-sm text-slate-600">{submission.student.name}</p>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black text-slate-900">Quick Actions</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Link href="/teacher/assignments/new" className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left text-sm font-semibold text-slate-700 hover:border-sky-200 hover:bg-sky-50">
                Create Assignment
              </Link>
              <Link href="/teacher/content/new" className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left text-sm font-semibold text-slate-700 hover:border-sky-200 hover:bg-sky-50">
                Add Material
              </Link>
              <Link href="/teacher/classes" className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left text-sm font-semibold text-slate-700 hover:border-sky-200 hover:bg-sky-50">
                Manage Classes
              </Link>
              <Link href="/teacher/exams" className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left text-sm font-semibold text-slate-700 hover:border-sky-200 hover:bg-sky-50">
                Assign a Competition
              </Link>
            </div>
          </section>

          <section id="assign-competition" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black text-slate-900">Students &amp; Competitions</h2>
            <p className="mt-1 text-sm text-slate-500">Add students to your roster and register them for Olympiad competitions.</p>
            <div className="mt-5 space-y-5">
              <AddStudentForm />
              {myStudents.length > 0 && competitions.length > 0 ? (
                <AssignCompetitionForm
                  students={myStudents.map((s) => ({ id: s.id, label: `${s.name}${s.studentIdNumber ? ` (${s.studentIdNumber})` : ""}` }))}
                  competitions={competitions.map((c) => ({ id: c.id, label: c.name }))}
                />
              ) : (
                <p className="text-sm text-slate-500">Add a student above to start assigning competitions.</p>
              )}
              <TeacherRoster entries={rosterEntries} />
            </div>
          </section>
        </div>
      </AppShell>
    </AuthGate>
  );
}
