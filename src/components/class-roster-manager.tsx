"use client";

import { useActionState } from "react";
import { createClassAction, enrollStudentAction, unenrollStudentAction } from "@/lib/actions/classes";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import type { ActionState } from "@/lib/actions/auth";

type State = ActionState & { success?: string };
const initialState: State = {};

type ClassWithEnrollments = {
  id: string;
  name: string;
  subject: string;
  enrollments: { id: string; student: { id: string; name: string } }[];
};

function CreateClassForm() {
  const [state, formAction, pending] = useActionState(createClassAction, initialState);
  return (
    <form action={formAction} className="lms-form lms-panel">
      <p className="lms-panel-title">Create a class</p>
      <div className="lms-form-row">
        <label>
          Class name
          <input name="name" required placeholder="e.g. Senior Mathematics" />
        </label>
        <label>
          Subject
          <input name="subject" required placeholder="e.g. Mathematics" />
        </label>
      </div>
      {state.error && <p className="lms-error">{state.error}</p>}
      {state.success && <p className="lms-success">{state.success}</p>}
      <div className="lms-form-actions">
        <button type="submit" disabled={pending} className="lms-btn lms-btn-primary">
          {pending ? "Creating…" : "Create class"}
        </button>
      </div>
    </form>
  );
}

export function EnrollForm({ classId, students }: { classId: string; students: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(enrollStudentAction, initialState);
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="classId" value={classId} />
      <label className="flex-1 min-w-[12rem]">
        Add student
        <select name="studentId" required defaultValue="">
          <option value="" disabled>Select a student</option>
          {students.map((student) => (
            <option key={student.id} value={student.id}>{student.name}</option>
          ))}
        </select>
      </label>
      <button type="submit" disabled={pending} className="lms-btn lms-btn-ghost">
        {pending ? "Adding…" : "Enroll"}
      </button>
      {state.error && <p className="lms-error w-full">{state.error}</p>}
    </form>
  );
}

export function UnenrollButton({ enrollmentId, studentName }: { enrollmentId: string; studentName: string }) {
  const [, formAction] = useActionState(unenrollStudentAction, initialState);
  return (
    <form action={formAction}>
      <input type="hidden" name="enrollmentId" value={enrollmentId} />
      <ConfirmSubmitButton confirmText={`Remove ${studentName} from this class?`} className="lms-btn lms-btn-ghost">
        Remove
      </ConfirmSubmitButton>
    </form>
  );
}

export function ClassRosterManager({
  classes,
  students,
}: {
  classes: ClassWithEnrollments[];
  students: { id: string; name: string }[];
}) {
  return (
    <div className="space-y-6">
      <CreateClassForm />
      {classes.map((classItem) => {
        const enrolledIds = new Set(classItem.enrollments.map((e) => e.student.id));
        const available = students.filter((student) => !enrolledIds.has(student.id));
        return (
          <div key={classItem.id} className="lms-panel space-y-3">
            <div>
              <p className="lms-panel-title">{classItem.name}</p>
              <p className="text-xs text-muted-foreground">{classItem.subject}</p>
            </div>
            <ul className="grid gap-2">
              {classItem.enrollments.length === 0 ? (
                <li className="text-xs text-muted-foreground">No students enrolled yet.</li>
              ) : (
                classItem.enrollments.map((enrollment) => (
                  <li key={enrollment.id} className="flex items-center justify-between gap-3 text-sm">
                    <span>{enrollment.student.name}</span>
                    <UnenrollButton enrollmentId={enrollment.id} studentName={enrollment.student.name} />
                  </li>
                ))
              )}
            </ul>
            {available.length > 0 && <EnrollForm classId={classItem.id} students={available} />}
          </div>
        );
      })}
    </div>
  );
}
