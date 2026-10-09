"use client";

import { useCallback, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import {
  removeSubmissionFileAction,
  saveAssignmentAnswerAction,
  submitAssignmentAction,
  uploadSubmissionFileAction,
} from "@/lib/actions/assignments";

type Question = { id: string; order: number; text: string; points: number };
type FileItem = { id: string; fileName: string; url: string };

export function AssignmentRoom({
  submissionId,
  assignmentId,
  questions,
  initialAnswers,
  initialFiles,
}: {
  submissionId: string;
  assignmentId: string;
  questions: Question[];
  initialAnswers: Record<string, string>;
  initialFiles: FileItem[];
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers);
  const [files, setFiles] = useState<FileItem[]>(initialFiles);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const pendingSaves = useRef(new Set<Promise<unknown>>());

  function updateAnswer(questionId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    const promise = saveAssignmentAnswerAction(submissionId, questionId, value).then((result) => {
      if (!result.ok) setNotice(result.error);
      return result;
    });
    pendingSaves.current.add(promise);
    promise.finally(() => pendingSaves.current.delete(promise));
  }

  async function handleFileSelect(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    const result = await uploadSubmissionFileAction(submissionId, file);
    setUploading(false);
    if (!result.ok) {
      setNotice(result.error);
      return;
    }
    setFiles((prev) => [...prev, result.file]);
  }

  async function handleRemoveFile(fileId: string) {
    const result = await removeSubmissionFileAction(fileId);
    if (!result.ok) {
      setNotice(result.error);
      return;
    }
    setFiles((prev) => prev.filter((file) => file.id !== fileId));
  }

  const submit = useCallback(async () => {
    setSubmitting(true);
    // Make sure every answer autosave has actually reached the server before submitting —
    // mirrors the exam room's pending-saves flush so a fast type-then-submit never loses an answer.
    await Promise.all(pendingSaves.current);
    const result = await submitAssignmentAction(submissionId);
    if (result.ok) {
      router.push(`/student/assignments/${assignmentId}`);
      router.refresh();
    } else {
      setNotice(result.error);
      setSubmitting(false);
    }
  }, [submissionId, assignmentId, router]);

  return (
    <div className="space-y-4">
      {notice && <p className="lms-error">{notice}</p>}

      <div className="space-y-4">
        {questions.map((question, index) => (
          <div key={question.id} className="lms-attempt">
            <p className="font-bold">
              {index + 1}. {question.text} <span className="font-normal text-muted-foreground">({question.points} pts)</span>
            </p>
            <textarea
              rows={4}
              className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={answers[question.id] ?? ""}
              onChange={(event) => updateAnswer(question.id, event.target.value)}
              placeholder="Write your answer…"
            />
          </div>
        ))}
      </div>

      <div className="lms-panel">
        <p className="lms-panel-title">Files</p>
        <ul className="mt-2 space-y-1">
          {files.map((file) => (
            <li key={file.id} className="flex items-center justify-between gap-3 text-sm">
              <a href={file.url} target="_blank" rel="noreferrer">{file.fileName}</a>
              <button type="button" onClick={() => handleRemoveFile(file.id)} className="lms-btn lms-btn-ghost">
                Remove
              </button>
            </li>
          ))}
        </ul>
        <input
          type="file"
          onChange={handleFileSelect}
          disabled={uploading}
          className="mt-3"
          accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
        />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">You can keep editing until you submit.</p>
        <button type="button" onClick={submit} disabled={submitting} className="lms-btn lms-btn-primary">
          {submitting ? "Submitting…" : "Submit"}
        </button>
      </div>
    </div>
  );
}
