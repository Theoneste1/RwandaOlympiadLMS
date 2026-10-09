import { redirect } from "next/navigation";

// Quizzes were a mock-only concept with no backing data model — in this platform, timed
// multiple-choice assessments ARE exams (see /student/exams). Redirect rather than keep a
// second, disconnected page for the same idea.
export default function StudentQuizzesPage() {
  redirect("/student/exams");
}
