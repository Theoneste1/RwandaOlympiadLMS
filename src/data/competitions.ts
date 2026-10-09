// PLACEHOLDER CONTENT — sample competition catalog for scaffolding purposes.
// Replace names, grade groups, dates, and descriptions with the Foundation's
// real competition calendar before launch.

export type Competition = {
  slug: string;
  name: string;
  subject: "Mathematics" | "Science" | "Informatics";
  format: "Written Exam" | "Online Competition" | "Event";
  gradeGroups: string[];
  registrationDeadline: string; // ISO date, placeholder
  examDate: string; // ISO date, placeholder
  summary: string;
  description: string;
};

export const COMPETITIONS: Competition[] = [
  {
    slug: "rwanda-mathematical-olympiad",
    name: "Rwanda Mathematical Olympiad",
    subject: "Mathematics",
    format: "Written Exam",
    gradeGroups: ["P4–P6", "S1–S3", "S4–S6"],
    registrationDeadline: "2027-02-15",
    examDate: "2027-03-21",
    summary: "The Foundation's flagship national mathematics competition, open to primary and secondary students.",
    description:
      "A national written competition designed to build problem-solving skills and identify mathematically talented students across all provinces. Sample/placeholder description — replace with the official competition brief.",
  },
  {
    slug: "rwanda-science-olympiad",
    name: "Rwanda Science Olympiad",
    subject: "Science",
    format: "Written Exam",
    gradeGroups: ["S1–S3", "S4–S6"],
    registrationDeadline: "2027-02-15",
    examDate: "2027-04-18",
    summary: "A national science competition covering physics, chemistry, and biology fundamentals.",
    description:
      "Tests core scientific reasoning and applied problem solving. Sample/placeholder description — replace with the official competition brief.",
  },
  {
    slug: "rwanda-informatics-challenge",
    name: "Rwanda Informatics Challenge",
    subject: "Informatics",
    format: "Online Competition",
    gradeGroups: ["S4–S6"],
    registrationDeadline: "2027-03-01",
    examDate: "2027-05-09",
    summary: "An online coding and computational-thinking challenge for upper-secondary students.",
    description:
      "Delivered online through the Foundation's exam platform, testing algorithmic thinking and basic programming. Sample/placeholder description — replace with the official competition brief.",
  },
  {
    slug: "junior-math-challenge",
    name: "Junior Math Challenge",
    subject: "Mathematics",
    format: "Event",
    gradeGroups: ["P1–P3"],
    registrationDeadline: "2027-02-01",
    examDate: "2027-03-07",
    summary: "A playful, low-stakes introduction to mathematical competitions for the youngest students.",
    description:
      "Focuses on engagement and confidence-building rather than ranking. Sample/placeholder description — replace with the official competition brief.",
  },
];

export function getCompetitionBySlug(slug: string) {
  return COMPETITIONS.find((c) => c.slug === slug);
}
