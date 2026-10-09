-- Add a topic so students can browse mathematics exams by focus area.
ALTER TABLE "Competition" ADD COLUMN "topic" TEXT NOT NULL DEFAULT 'ALGEBRA';