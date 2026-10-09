"use client";

import { useActionState, useState } from "react";
import { gradeSubmissionAction, requestResubmissionAction } from "@/lib/actions/assignments";
import type { ActionState } from "@/lib/actions/auth";

type State = ActionState & { success?: string };
const initialState: State = {};

export function GradingPanel({
  submissionId,
  maxScore,
  currentScore,
  currentFeedback,
}: {
  submissionId: string;
  maxScore: number;
  currentScore: number | null;
  currentFeedback: string | null;
}) {
  const [gradeState, gradeAction, gradePending] = useActionState(gradeSubmissionAction, initialState);
  const [resubmitState, resubmitAction, resubmitPending] = useActionState(requestResubmissionAction, initialState);
  const [showResubmit, setShowResubmit] = useState(false);

  return (
    <div className="space-y-4">
      <form action={gradeAction} className="lms-form lms-panel">
        <input type="hidden" name="submissionId" value={submissionId} />
        <p className="lms-panel-title">Grade this submission</p>
        <label>
          Score (out of {maxScore})
          <input type="number" name="score" min={0} max={maxScore} required defaultValue={currentScore ?? undefined} />
        </label>
        <label>
          Feedback
          <textarea name="feedback" rows={4} defaultValue={currentFeedback ?? ""} placeholder="General feedback and comments for the student" />
        </label>
        {gradeState.error && <p className="lms-error">{gradeState.error}</p>}
        {gradeState.success && <p className="lms-success">{gradeState.success}</p>}
        <div className="lms-form-actions">
          <button type="submit" disabled={gradePending} className="lms-btn lms-btn-primary">
            {gradePending ? "Saving…" : "Mark Graded"}
          </button>
        </div>
      </form>

      <div className="lms-panel">
        {!showResubmit ? (
          <button type="button" onClick={() => setShowResubmit(true)} className="lms-btn lms-btn-ghost">
            Request Resubmission
          </button>
        ) : (
          <form action={resubmitAction} className="lms-form">
            <input type="hidden" name="submissionId" value={submissionId} />
            <label>
              Reason (shown to the student)
              <textarea name="reason" rows={3} required placeholder="e.g. Please review question 4 and submit your solution again." />
            </label>
            {resubmitState.error && <p className="lms-error">{resubmitState.error}</p>}
            {resubmitState.success && <p className="lms-success">{resubmitState.success}</p>}
            <div className="lms-form-actions">
              <button type="submit" disabled={resubmitPending} className="lms-btn lms-btn-danger">
                {resubmitPending ? "Sending…" : "Send resubmission request"}
              </button>
              <button type="button" onClick={() => setShowResubmit(false)} className="lms-btn lms-btn-ghost">
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
