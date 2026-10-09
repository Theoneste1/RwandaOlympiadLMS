"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Container } from "@/components/container";
import { saveAnswerAction, submitExamAction } from "@/lib/actions/exam";

type Question = {
  id: string;
  order: number;
  text: string;
  points: number;
  choices: string[];
};

function formatTime(totalSeconds: number) {
  const clamped = Math.max(0, totalSeconds);
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function ExamRoom({
  attemptId,
  competitionName,
  deadlineIso,
  questions,
  initialAnswers,
}: {
  attemptId: string;
  competitionName: string;
  deadlineIso: string;
  questions: Question[];
  initialAnswers: Record<string, number>;
}) {
  const router = useRouter();
  const deadlineMs = new Date(deadlineIso).getTime();
  const [answers, setAnswers] = useState<Record<string, number>>(initialAnswers);
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.round((deadlineMs - Date.now()) / 1000)),
  );
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const hasFinalized = useRef(false);
  const pendingSaves = useRef(new Set<Promise<unknown>>());

  const finishExam = useCallback(async () => {
    if (hasFinalized.current) return;
    hasFinalized.current = true;
    setSubmitting(true);
    // Make sure every answer click's save has actually reached the server
    // before grading — otherwise a fast "select then submit" could grade
    // against a stale answer set.
    await Promise.all(pendingSaves.current);
    const result = await submitExamAction(attemptId);
    if (result.ok) {
      router.push(`/results/${result.attemptId}`);
    } else {
      setNotice(result.error);
      setSubmitting(false);
      hasFinalized.current = false;
    }
  }, [attemptId, router]);

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.round((deadlineMs - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        finishExam();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [finishExam, deadlineMs]);

  function selectAnswer(questionId: string, index: number) {
    setAnswers((prev) => ({ ...prev, [questionId]: index }));
    const promise = saveAnswerAction(attemptId, questionId, index).then((result) => {
      if (!result.ok) {
        setNotice(result.error);
        if (result.expired) {
          router.push(`/results/${attemptId}`);
        }
      }
      return result;
    });
    pendingSaves.current.add(promise);
    promise.finally(() => pendingSaves.current.delete(promise));
  }

  const answeredCount = Object.keys(answers).length;
  const lowTime = secondsLeft <= 60;

  return (
    <>
      <div className="sticky top-14 z-30 border-b border-border bg-background/95 backdrop-blur md:top-0">
        <Container className="flex items-center justify-between py-4">
          <div>
            <p className="font-semibold">{competitionName}</p>
            <p className="text-xs text-muted-foreground">{answeredCount}/{questions.length} answered</p>
          </div>
          <div className={`rounded-md px-4 py-2 text-lg font-bold tabular-nums ${lowTime ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300" : "bg-muted"}`}>
            {formatTime(secondsLeft)}
          </div>
        </Container>
        <Container className="flex flex-wrap gap-1.5 pb-3" aria-label="Jump to question">
          {questions.map((q, i) => (
            <a
              key={q.id}
              href={`#q-${q.id}`}
              className={`flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold ${
                answers[q.id] !== undefined ? "bg-brand text-brand-foreground" : "border border-border text-muted-foreground"
              }`}
            >
              {i + 1}
            </a>
          ))}
        </Container>
      </div>

      <Container className="py-10">
        {notice && (
          <p className="mb-6 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {notice}
          </p>
        )}

        <div className="space-y-8">
          {questions.map((q, i) => (
            <fieldset key={q.id} id={`q-${q.id}`} className="scroll-mt-28 rounded-lg border border-border p-5">
              <legend className="px-1 text-sm font-semibold text-muted-foreground">
                Question {i + 1} of {questions.length} ({q.points} {q.points === 1 ? "point" : "points"})
              </legend>
              <p className="mt-2 font-medium">{q.text}</p>
              <div className="mt-4 space-y-2">
                {q.choices.map((choice, index) => (
                  <label
                    key={index}
                    className={`flex cursor-pointer items-center gap-3 rounded-md border px-4 py-2.5 text-sm ${
                      answers[q.id] === index ? "border-brand bg-brand/10" : "border-border hover:bg-muted"
                    }`}
                  >
                    <input
                      type="radio"
                      name={q.id}
                      checked={answers[q.id] === index}
                      onChange={() => selectAnswer(q.id, index)}
                      className="h-4 w-4"
                    />
                    {choice}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>

        <div className="mt-8 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            You can change your answers until you submit or time runs out.
          </p>
          <button
            type="button"
            onClick={() => {
              const unanswered = questions.length - answeredCount;
              const warning = unanswered > 0
                ? `You have ${unanswered} unanswered question${unanswered === 1 ? "" : "s"}. Submit anyway? You won't be able to change your answers after this.`
                : "Submit your exam? You won't be able to change your answers after this.";
              if (window.confirm(warning)) finishExam();
            }}
            disabled={submitting}
            className="rounded-md bg-brand px-6 py-3 text-sm font-semibold text-brand-foreground hover:bg-brand-dark disabled:opacity-60"
          >
            {submitting ? "Submitting…" : "Submit Exam"}
          </button>
        </div>
      </Container>
    </>
  );
}
