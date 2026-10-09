"use client";

import { useActionState, useState } from "react";
import { createAssignmentAction, updateAssignmentAction } from "@/lib/actions/assignments";
import type { ActionState } from "@/lib/actions/auth";

type State = ActionState & { success?: string };
const initialState: State = {};

type QuestionDraft = { key: string; id: string | null; text: string; points: number };

function newQuestion(): QuestionDraft {
  return { key: Math.random().toString(36).slice(2), id: null, text: "", points: 1 };
}

export function AssignmentForm({
  mode,
  classes,
  assignment,
}: {
  mode: "create" | "edit";
  classes: { id: string; name: string }[];
  assignment?: {
    id: string;
    title: string;
    instructions: string;
    classId: string;
    dueAt: string;
    attachmentUrl: string | null;
    questions: { id: string; text: string; points: number }[];
  };
}) {
  const action = mode === "create" ? createAssignmentAction : updateAssignmentAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const [questions, setQuestions] = useState<QuestionDraft[]>(
    assignment && assignment.questions.length > 0
      ? assignment.questions.map((q) => ({ key: q.id, id: q.id, text: q.text, points: q.points }))
      : [newQuestion()],
  );

  function updateQuestion(key: string, patch: Partial<QuestionDraft>) {
    setQuestions((current) => current.map((q) => (q.key === key ? { ...q, ...patch } : q)));
  }

  function removeQuestion(key: string) {
    setQuestions((current) => (current.length > 1 ? current.filter((q) => q.key !== key) : current));
  }

  return (
    <form action={formAction} className="lms-form lms-panel">
      {assignment && <input type="hidden" name="id" value={assignment.id} />}

      {mode === "create" && (
        <label>
          Class
          <select name="classId" required defaultValue="">
            <option value="" disabled>Select a class</option>
            {classes.map((classItem) => (
              <option key={classItem.id} value={classItem.id}>{classItem.name}</option>
            ))}
          </select>
        </label>
      )}

      <label>
        Title
        <input name="title" required defaultValue={assignment?.title} />
      </label>

      <label>
        Instructions
        <textarea name="instructions" rows={5} required defaultValue={assignment?.instructions} />
      </label>

      <label>
        Due date (optional)
        <input type="datetime-local" name="dueAt" defaultValue={assignment?.dueAt ?? ""} />
      </label>

      <label>
        Attachment (optional — PDF, image, or Word doc, up to 10MB)
        <input type="file" name="attachment" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" />
      </label>
      {assignment?.attachmentUrl && (
        <p className="lms-attachment-note">
          Current attachment:{" "}
          <a href={assignment.attachmentUrl} target="_blank" rel="noreferrer">view file</a> (uploading a new one replaces it)
        </p>
      )}

      <div>
        <p className="lms-panel-title">Questions</p>
        <div className="mt-2 space-y-3">
          {questions.map((question, index) => (
            <div key={question.key} className="lms-question-row">
              <input type="hidden" name="questionId" value={question.id ?? ""} />
              <textarea
                name="questionText"
                rows={2}
                required
                placeholder={`Question ${index + 1}`}
                value={question.text}
                onChange={(event) => updateQuestion(question.key, { text: event.target.value })}
              />
              <input
                type="number"
                name="questionPoints"
                min={1}
                className="lms-question-points"
                value={question.points}
                onChange={(event) => updateQuestion(question.key, { points: Math.max(1, Number(event.target.value) || 1) })}
              />
              <button type="button" onClick={() => removeQuestion(question.key)} className="lms-btn lms-btn-ghost">
                Remove
              </button>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setQuestions((current) => [...current, newQuestion()])} className="lms-btn lms-btn-ghost mt-3">
          + Add question
        </button>
      </div>

      {state.error && <p className="lms-error">{state.error}</p>}

      <div className="lms-form-actions">
        {mode === "create" ? (
          <>
            <button type="submit" name="intent" value="draft" disabled={pending} className="lms-btn lms-btn-ghost">
              {pending ? "Saving…" : "Save Draft"}
            </button>
            <button type="submit" name="intent" value="publish" disabled={pending} className="lms-btn lms-btn-primary">
              {pending ? "Publishing…" : "Publish"}
            </button>
          </>
        ) : (
          <button type="submit" disabled={pending} className="lms-btn lms-btn-primary">
            {pending ? "Saving…" : "Save changes"}
          </button>
        )}
      </div>
    </form>
  );
}
