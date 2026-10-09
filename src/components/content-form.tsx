"use client";

import { useActionState } from "react";
import { createContentAction, updateContentAction } from "@/lib/actions/content";
import type { ActionState } from "@/lib/actions/auth";

type State = ActionState & { success?: string };
const initialState: State = {};

const TYPE_OPTIONS = [
  { value: "LESSON", label: "Lesson" },
  { value: "VIDEO", label: "Video" },
  { value: "NOTE", label: "Note" },
  { value: "WORKSHEET", label: "Worksheet" },
  { value: "PROBLEM_SET", label: "Problem set" },
];

export function ContentForm({
  mode,
  classes,
  content,
}: {
  mode: "create" | "edit";
  classes: { id: string; name: string }[];
  content?: { id: string; title: string; body: string; type: string; classId: string; attachmentUrl: string | null };
}) {
  const action = mode === "create" ? createContentAction : updateContentAction;
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="lms-form lms-panel">
      {content && <input type="hidden" name="id" value={content.id} />}

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

      <div className="lms-form-row">
        <label>
          Type
          <select name="type" required defaultValue={content?.type ?? ""}>
            <option value="" disabled>Select a type</option>
            {TYPE_OPTIONS.map((type) => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </label>
        <label>
          Title
          <input name="title" required defaultValue={content?.title} />
        </label>
      </div>

      <label>
        Body
        <textarea name="body" rows={8} required defaultValue={content?.body} />
      </label>

      <label>
        Attachment (optional — PDF, image, or Word doc, up to 10MB)
        <input type="file" name="attachment" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" />
      </label>
      {content?.attachmentUrl && (
        <p className="lms-attachment-note">
          Current attachment:{" "}
          <a href={content.attachmentUrl} target="_blank" rel="noreferrer">view file</a> (uploading a new one replaces it)
        </p>
      )}

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
