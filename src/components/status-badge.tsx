export const STATUS_LABELS: Record<string, string> = {
  ASSIGNED: "Not started",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  DRAFT: "Draft",
  PUBLISHED: "Published",
  ARCHIVED: "Archived",
  PENDING_GRADING: "Submitted — Pending grading",
  GRADED: "Graded",
  RESUBMISSION_REQUIRED: "Resubmission required",
  NOT_STARTED: "Not started",
  OVERDUE: "Overdue",
};

const CLASSES: Record<string, string> = {
  ASSIGNED: "bg-muted text-muted-foreground",
  IN_PROGRESS: "bg-accent/15 text-accent",
  COMPLETED: "bg-success/15 text-success",
  DRAFT: "bg-muted text-muted-foreground",
  PUBLISHED: "bg-success/15 text-success",
  ARCHIVED: "bg-muted text-muted-foreground",
  PENDING_GRADING: "bg-accent/15 text-accent",
  GRADED: "bg-success/15 text-success",
  RESUBMISSION_REQUIRED: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  NOT_STARTED: "bg-muted text-muted-foreground",
  OVERDUE: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${CLASSES[status] ?? "bg-muted text-muted-foreground"}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
