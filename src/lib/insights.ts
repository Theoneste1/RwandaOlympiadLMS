/**
 * Shared, read-only computations over already-fetched Prisma data — no new tables, no stored
 * "earned" state. Everything here is re-derived from real rows every render, which is why it's
 * safe to call these "mastery"/"achievements"/"overdue" instead of faking persisted state for
 * features the schema doesn't support yet (streaks, badges, topic tags on questions, etc.).
 */

/** Folds a due date into the displayed status so "overdue" is consistent everywhere, without a stored OVERDUE enum value. */
export function effectiveAssignmentStatus(
  submissionStatus: string | null | undefined,
  dueAt: Date | null,
): string {
  const isPastDue = Boolean(dueAt && dueAt.getTime() < Date.now());
  if (!submissionStatus) return isPastDue ? "OVERDUE" : "NOT_STARTED";
  if (submissionStatus === "IN_PROGRESS" && isPastDue) return "OVERDUE";
  return submissionStatus;
}

export type TopicScore = { topic: string; percentage: number; attempts: number };

/** Competition.topic (e.g. "GEOMETRY", "ALGEBRA") is the only topic-level tag the schema has — assignments aren't topic-tagged, so mastery here is scoped to Olympiad exam results. */
export function topicMasteryFromAttempts(
  attempts: { score: number | null; totalPoints: number | null; topic: string }[],
): TopicScore[] {
  const byTopic = new Map<string, { score: number; points: number; attempts: number }>();
  for (const a of attempts) {
    if (a.score == null || !a.totalPoints) continue;
    const entry = byTopic.get(a.topic) ?? { score: 0, points: 0, attempts: 0 };
    entry.score += a.score;
    entry.points += a.totalPoints;
    entry.attempts += 1;
    byTopic.set(a.topic, entry);
  }
  return Array.from(byTopic.entries())
    .map(([topic, e]) => ({ topic, percentage: Math.round((e.score / e.points) * 100), attempts: e.attempts }))
    .sort((a, b) => b.percentage - a.percentage);
}

export function formatTopicLabel(topic: string) {
  return topic.charAt(0) + topic.slice(1).toLowerCase().replace(/_/g, " ");
}

/** Longest run of consecutive calendar days (ending today or yesterday) with at least one real submission/attempt timestamp. */
export function currentStreakDays(timestamps: Date[]): number {
  const days = new Set(timestamps.map((d) => d.toISOString().slice(0, 10)));
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  if (!days.has(cursor.toISOString().slice(0, 10))) {
    cursor.setDate(cursor.getDate() - 1); // streak can still count as "current" if today has no activity yet
    if (!days.has(cursor.toISOString().slice(0, 10))) return 0;
  }
  let streak = 0;
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
