// Seeds a realistic-looking demo dataset — two coaches, eight students spread across three
// classes and every grade band, four Olympiad question sets, a term's worth of content and
// assignments in every status, and a spread of exam results so rankings, topic mastery, and
// coach-intelligence panels all have something real to show immediately after `npm run db:seed`.

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function hash(plain) {
  return bcrypt.hash(plain, 10);
}

function daysAgo(n) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

function daysFromNow(n) {
  return new Date(Date.now() + n * 24 * 60 * 60 * 1000);
}

/** Grades the first `correctCount` questions correct (in order) and the rest wrong — a real, deterministic simulation of a student's attempt, scored the same way the app's own grading logic scores it. */
async function gradeAttempt(registrationId, questions, correctCount, submittedAt = new Date()) {
  const attempt = await prisma.examAttempt.create({
    data: { registrationId, status: "SUBMITTED", submittedAt },
  });
  let score = 0;
  let totalPoints = 0;
  for (const [i, q] of questions.entries()) {
    totalPoints += q.points;
    const isCorrect = i < correctCount;
    const selectedIndex = isCorrect ? q.correctIndex : (q.correctIndex + 1) % 4;
    if (isCorrect) score += q.points;
    await prisma.answer.create({ data: { attemptId: attempt.id, questionId: q.id, selectedIndex, isCorrect } });
  }
  await prisma.examAttempt.update({ where: { id: attempt.id }, data: { score, totalPoints } });
  return { score, totalPoints };
}

async function registerAndComplete(studentId, competitionId, teacherId, correctCount, submittedAt) {
  const registration = await prisma.registration.create({
    data: { studentId, competitionId, assignedById: teacherId, status: "COMPLETED" },
  });
  const questions = await prisma.question.findMany({ where: { competitionId }, orderBy: { order: "asc" } });
  const result = await gradeAttempt(registration.id, questions, correctCount, submittedAt);
  return { registration, ...result };
}

async function main() {
  await prisma.answer.deleteMany();
  await prisma.examAttempt.deleteMany();
  await prisma.registration.deleteMany();
  await prisma.question.deleteMany();
  await prisma.competition.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.submissionFile.deleteMany();
  await prisma.assignmentAnswer.deleteMany();
  await prisma.assignmentSubmission.deleteMany();
  await prisma.assignmentQuestion.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.content.deleteMany();
  await prisma.classEnrollment.deleteMany();
  await prisma.class.deleteMany();
  await prisma.user.deleteMany();

  // --- Coaches ---
  const teacher = await prisma.user.create({
    data: {
      email: "teacher1@rwandaolympiad.example",
      username: "teacher1",
      name: "Jean Uwimana",
      role: "TEACHER",
      passwordHash: await hash("Teacher123!"),
    },
  });

  const teacher2 = await prisma.user.create({
    data: {
      email: "teacher2@rwandaolympiad.example",
      username: "teacher2",
      name: "Aline Uwase",
      role: "TEACHER",
      passwordHash: await hash("Teacher123!"),
    },
  });

  // --- Students (grade bands S1-S6, varied performance so analytics have real signal) ---
  const studentDefs = [
    { key: "alice", email: "student1@rwandaolympiad.example", username: "student1", name: "Alice Mutesi", studentIdNumber: "STU1001", grade: "S3", managedBy: teacher, password: "STU1001" },
    { key: "eric", email: "student2@rwandaolympiad.example", username: "student2", name: "Eric Habimana", studentIdNumber: "STU1002", grade: "S3", managedBy: teacher, password: "STU1002" },
    { key: "grace", email: "student3@rwandaolympiad.example", username: "student3", name: "Grace Ingabire", studentIdNumber: "STU1003", grade: "S4", managedBy: teacher, password: "STU1003" },
    { key: "paul", email: "student4@rwandaolympiad.example", username: "student4", name: "Paul Nshimiyimana", studentIdNumber: "STU1004", grade: "S4", managedBy: null, password: "Student123!" },
    { key: "david", email: "student5@rwandaolympiad.example", username: "student5", name: "David Mugisha", studentIdNumber: "STU1005", grade: "S2", managedBy: teacher, password: "STU1005" },
    { key: "divine", email: "student6@rwandaolympiad.example", username: "student6", name: "Divine Uwimana", studentIdNumber: "STU1006", grade: "S5", managedBy: teacher, password: "STU1006" },
    { key: "patrick", email: "student7@rwandaolympiad.example", username: "student7", name: "Patrick Kagame", studentIdNumber: "STU1007", grade: "S1", managedBy: teacher, password: "STU1007" },
    { key: "josiane", email: "student8@rwandaolympiad.example", username: "student8", name: "Josiane Mukamana", studentIdNumber: "STU1008", grade: "S6", managedBy: teacher2, password: "STU1008" },
  ];

  const students = {};
  for (const def of studentDefs) {
    students[def.key] = await prisma.user.create({
      data: {
        email: def.email,
        username: def.username,
        name: def.name,
        role: "STUDENT",
        studentIdNumber: def.studentIdNumber,
        grade: def.grade,
        managedById: def.managedBy?.id ?? null,
        passwordHash: await hash(def.password),
      },
    });
  }
  const { alice, eric, grace, paul, david, divine, patrick, josiane } = students;

  // --- Classes ---
  const seniorMath = await prisma.class.create({ data: { name: "Senior Mathematics", subject: "Mathematics", teacherId: teacher.id } });
  const geometryLab = await prisma.class.create({ data: { name: "Geometry Lab", subject: "Mathematics", teacherId: teacher.id } });
  const physicsFoundations = await prisma.class.create({ data: { name: "Physics Foundations", subject: "Physics", teacherId: teacher2.id } });

  await prisma.classEnrollment.createMany({
    data: [
      { classId: seniorMath.id, studentId: alice.id },
      { classId: seniorMath.id, studentId: eric.id },
      { classId: seniorMath.id, studentId: grace.id },
      { classId: seniorMath.id, studentId: david.id },
      { classId: seniorMath.id, studentId: divine.id },
      { classId: geometryLab.id, studentId: alice.id },
      { classId: geometryLab.id, studentId: grace.id },
      { classId: physicsFoundations.id, studentId: josiane.id },
    ],
  });
  // Patrick is managed by teacher1 but enrolled nowhere and has zero activity — this is what lets
  // the coach-intelligence "no activity yet" signal be real instead of fabricated.

  // --- Question bank: four Olympiad sets, one per core topic ---
  const mathOlympiad = await prisma.competition.create({
    data: {
      slug: "rwanda-mathematical-olympiad",
      name: "Rwanda Mathematical Olympiad",
      subject: "Mathematics",
      topic: "GEOMETRY",
      summary: "The Foundation's flagship national mathematics competition.",
      durationMinutes: 20,
      questions: {
        create: [
          { order: 1, text: "What is 17 + 28?", choices: JSON.stringify(["43", "45", "44", "35"]), correctIndex: 1, points: 1 },
          { order: 2, text: "What is 9 × 7?", choices: JSON.stringify(["56", "63", "72", "54"]), correctIndex: 1, points: 1 },
          { order: 3, text: "A rectangle has length 8 and width 5. What is its area?", choices: JSON.stringify(["13", "26", "40", "45"]), correctIndex: 2, points: 1 },
          { order: 4, text: "What is the next number in the sequence 2, 4, 8, 16, ...?", choices: JSON.stringify(["24", "30", "32", "18"]), correctIndex: 2, points: 1 },
          { order: 5, text: "If a pencil costs 150 RWF and a notebook costs 350 RWF, how much do 2 pencils and 1 notebook cost together?", choices: JSON.stringify(["500", "650", "700", "800"]), correctIndex: 1, points: 2 },
          { order: 6, text: "The angles of a triangle are in ratio 2:3:4. What is the largest angle?", choices: JSON.stringify(["60°", "80°", "100°", "90°"]), correctIndex: 1, points: 2 },
          { order: 7, text: "A circle has radius 7. What is its circumference (using π ≈ 22/7)?", choices: JSON.stringify(["44", "22", "14", "49"]), correctIndex: 0, points: 2 },
        ],
      },
    },
  });

  const juniorChallenge = await prisma.competition.create({
    data: {
      slug: "junior-math-challenge",
      name: "Junior Math Challenge",
      subject: "Mathematics",
      topic: "ALGEBRA",
      summary: "A short, low-stakes introduction to competitions for younger students.",
      durationMinutes: 15,
      questions: {
        create: [
          { order: 1, text: "What is 4 + 5?", choices: JSON.stringify(["8", "9", "10", "7"]), correctIndex: 1, points: 1 },
          { order: 2, text: "What is 3 × 3?", choices: JSON.stringify(["6", "9", "12", "3"]), correctIndex: 1, points: 1 },
          { order: 3, text: "Which number is the biggest?", choices: JSON.stringify(["12", "21", "9", "18"]), correctIndex: 1, points: 1 },
          { order: 4, text: "Solve for x: x + 6 = 11.", choices: JSON.stringify(["4", "5", "6", "17"]), correctIndex: 1, points: 2 },
          { order: 5, text: "Solve for x: 3x = 21.", choices: JSON.stringify(["6", "7", "8", "63"]), correctIndex: 1, points: 2 },
        ],
      },
    },
  });

  const combinatoricsSprint = await prisma.competition.create({
    data: {
      slug: "combinatorics-sprint",
      name: "Combinatorics Sprint",
      subject: "Mathematics",
      topic: "COMBINATORICS",
      summary: "Counting, arrangements, and probability warm-ups for the national team pool.",
      durationMinutes: 25,
      questions: {
        create: [
          { order: 1, text: "How many ways can 4 students be arranged in a line?", choices: JSON.stringify(["12", "16", "24", "8"]), correctIndex: 2, points: 2 },
          { order: 2, text: "How many 2-person committees can be formed from 5 people?", choices: JSON.stringify(["20", "10", "15", "5"]), correctIndex: 1, points: 2 },
          { order: 3, text: "A coin is flipped 3 times. How many possible outcomes are there?", choices: JSON.stringify(["6", "8", "9", "3"]), correctIndex: 1, points: 1 },
          { order: 4, text: "How many diagonals does a hexagon have?", choices: JSON.stringify(["6", "9", "12", "15"]), correctIndex: 1, points: 3 },
          { order: 5, text: "In how many ways can you choose 3 books from a shelf of 6 if order doesn't matter?", choices: JSON.stringify(["18", "20", "120", "6"]), correctIndex: 1, points: 2 },
        ],
      },
    },
  });

  const numberTheoryTrials = await prisma.competition.create({
    data: {
      slug: "number-theory-trials",
      name: "Number Theory Trials",
      subject: "Mathematics",
      topic: "NUMBER_THEORY",
      summary: "Divisibility, primes, and modular arithmetic practice.",
      durationMinutes: 20,
      questions: {
        create: [
          { order: 1, text: "What is the remainder when 29 is divided by 6?", choices: JSON.stringify(["4", "5", "3", "2"]), correctIndex: 1, points: 1 },
          { order: 2, text: "Which of these numbers is prime?", choices: JSON.stringify(["21", "27", "29", "33"]), correctIndex: 2, points: 1 },
          { order: 3, text: "What is the greatest common divisor of 18 and 24?", choices: JSON.stringify(["6", "4", "8", "12"]), correctIndex: 0, points: 2 },
          { order: 4, text: "What is the least common multiple of 4 and 6?", choices: JSON.stringify(["24", "10", "12", "18"]), correctIndex: 2, points: 2 },
          { order: 5, text: "How many positive divisors does 28 have?", choices: JSON.stringify(["4", "5", "6", "8"]), correctIndex: 2, points: 2 },
        ],
      },
    },
  });

  // --- Registrations + results: a realistic spread per student, by design ---
  // Alice: strong across every topic (top of the leaderboard).
  await registerAndComplete(alice.id, mathOlympiad.id, teacher.id, 6, new Date());
  await registerAndComplete(alice.id, juniorChallenge.id, teacher.id, 5, daysAgo(1));
  await registerAndComplete(alice.id, combinatoricsSprint.id, teacher.id, 4, daysAgo(3));
  await registerAndComplete(alice.id, numberTheoryTrials.id, teacher.id, 4, daysAgo(6));

  // Eric: solid in algebra, genuinely weak in geometry — feeds the "needs attention" signal.
  await registerAndComplete(eric.id, mathOlympiad.id, teacher.id, 2, daysAgo(2));
  await registerAndComplete(eric.id, juniorChallenge.id, teacher.id, 4, daysAgo(5));
  const ericInProgressReg = await prisma.registration.create({
    data: { studentId: eric.id, competitionId: combinatoricsSprint.id, assignedById: teacher.id, status: "IN_PROGRESS" },
  });
  await prisma.examAttempt.create({ data: { registrationId: ericInProgressReg.id, startedAt: daysAgo(0) } });

  // Grace: a consistent mid-performer.
  await registerAndComplete(grace.id, mathOlympiad.id, teacher.id, 4, daysAgo(4));
  await registerAndComplete(grace.id, combinatoricsSprint.id, teacher.id, 3, daysAgo(7));
  await prisma.registration.create({ data: { studentId: grace.id, competitionId: numberTheoryTrials.id, assignedById: teacher.id, status: "ASSIGNED" } });

  // David: weak specifically in number theory.
  await registerAndComplete(david.id, numberTheoryTrials.id, teacher.id, 1, daysAgo(2));
  await registerAndComplete(david.id, juniorChallenge.id, teacher.id, 3, daysAgo(8));

  // Divine: the other top performer, so rankings have real competition at the top.
  await registerAndComplete(divine.id, mathOlympiad.id, teacher.id, 7, daysAgo(1));
  await registerAndComplete(divine.id, combinatoricsSprint.id, teacher.id, 5, daysAgo(2));
  await registerAndComplete(divine.id, numberTheoryTrials.id, teacher.id, 5, daysAgo(3));

  // Josiane (a different coach's student) — moderate, keeps the leaderboard cross-class.
  await registerAndComplete(josiane.id, mathOlympiad.id, teacher2.id, 4, daysAgo(4));

  // Paul (self-registered, unmanaged) — proves a teacher's roster stays scoped to their own students.
  await registerAndComplete(paul.id, mathOlympiad.id, teacher.id, 3, daysAgo(5));

  // --- Content: every type, every status, spread across both of teacher1's classes ---
  await prisma.content.create({
    data: {
      classId: seniorMath.id, authorId: teacher.id, type: "LESSON",
      title: "Advanced Factoring Techniques",
      body: "Still being written — covers grouping, sum/difference of cubes, and the rational root theorem.",
      status: "DRAFT",
    },
  });

  const publishedNote = await prisma.content.create({
    data: {
      classId: seniorMath.id, authorId: teacher.id, type: "NOTE",
      title: "Quadratic Formula Cheat Sheet",
      body: "x = (-b ± √(b² - 4ac)) / 2a. Remember to check the discriminant before assuming two real roots.",
      status: "PUBLISHED", publishedAt: daysAgo(10), publishedById: teacher.id,
    },
  });

  await prisma.content.create({
    data: {
      classId: seniorMath.id, authorId: teacher.id, type: "VIDEO",
      title: "Introduction to Number Theory",
      body: "A 20-minute walkthrough of divisibility rules, primes, and modular arithmetic with worked examples.",
      status: "PUBLISHED", publishedAt: daysAgo(4), publishedById: teacher.id,
    },
  });

  await prisma.content.create({
    data: {
      classId: geometryLab.id, authorId: teacher.id, type: "WORKSHEET",
      title: "Triangle Similarity Practice",
      body: "Ten problems on similar triangles, scale factors, and proofs — show every step.",
      status: "PUBLISHED", publishedAt: daysAgo(1), publishedById: teacher.id,
    },
  });

  await prisma.content.create({
    data: {
      classId: geometryLab.id, authorId: teacher.id, type: "PROBLEM_SET",
      title: "Circle Theorems Problem Set",
      body: "Olympiad-style problems applying the inscribed angle theorem and power of a point.",
      status: "ARCHIVED", publishedAt: daysAgo(30), publishedById: teacher.id,
    },
  });

  await prisma.content.create({
    data: {
      classId: physicsFoundations.id, authorId: teacher2.id, type: "LESSON",
      title: "Kinematics: Motion in a Straight Line",
      body: "Displacement, velocity, and acceleration — with the standard SUVAT equations derived from first principles.",
      status: "PUBLISHED", publishedAt: daysAgo(2), publishedById: teacher2.id,
    },
  });

  // --- Assignments: due dates spanning overdue / due soon / future, every submission status ---
  const algebraSet = await prisma.assignment.create({
    data: {
      classId: seniorMath.id, authorId: teacher.id,
      title: "Algebra Practice Set",
      instructions: "Solve each problem and show your working. Submit when you're confident in your answers.",
      dueAt: daysFromNow(7), status: "PUBLISHED", publishedAt: daysAgo(3), publishedById: teacher.id,
      questions: { create: [{ order: 1, text: "Factor x² - 5x + 6.", points: 2 }, { order: 2, text: "Solve for x: 2x + 7 = 19.", points: 1 }] },
    },
    include: { questions: { orderBy: { order: "asc" } } },
  });

  await prisma.assignmentSubmission.create({
    data: {
      assignmentId: algebraSet.id, studentId: alice.id, attemptNumber: 1, status: "IN_PROGRESS",
      answers: { create: [{ questionId: algebraSet.questions[0].id, answerText: "(x - 2)(x - 3)" }] },
    },
  });
  await prisma.assignmentSubmission.create({
    data: {
      assignmentId: algebraSet.id, studentId: eric.id, attemptNumber: 1, status: "PENDING_GRADING",
      submittedAt: daysAgo(1), maxScore: 3,
      answers: { create: [{ questionId: algebraSet.questions[0].id, answerText: "(x - 2)(x - 3)" }, { questionId: algebraSet.questions[1].id, answerText: "x = 6" }] },
    },
  });
  await prisma.assignmentSubmission.create({
    data: {
      assignmentId: algebraSet.id, studentId: grace.id, attemptNumber: 1, status: "GRADED",
      submittedAt: daysAgo(2), score: 3, maxScore: 3, gradedAt: daysAgo(1), gradedById: teacher.id,
      feedback: "Clean working throughout — nice job.",
      answers: { create: [{ questionId: algebraSet.questions[0].id, answerText: "(x - 2)(x - 3)" }, { questionId: algebraSet.questions[1].id, answerText: "x = 6" }] },
    },
  });

  const geometryChallenge = await prisma.assignment.create({
    data: {
      classId: seniorMath.id, authorId: teacher.id,
      title: "Geometry Proof Challenge",
      instructions: "Prove that the base angles of an isosceles triangle are equal.",
      dueAt: daysFromNow(5), status: "PUBLISHED", publishedAt: daysAgo(6), publishedById: teacher.id,
      questions: { create: [{ order: 1, text: "Write a full proof with justifications for each step.", points: 5 }] },
    },
    include: { questions: { orderBy: { order: "asc" } } },
  });

  await prisma.assignmentSubmission.create({
    data: {
      assignmentId: geometryChallenge.id, studentId: alice.id, attemptNumber: 1, status: "GRADED",
      submittedAt: daysAgo(2), score: 4, maxScore: 5, gradedAt: daysAgo(1), gradedById: teacher.id,
      feedback: "Solid proof — just missing a justification for the base angle congruence step.",
      answers: { create: [{ questionId: geometryChallenge.questions[0].id, answerText: "Let triangle ABC be isosceles with AB = AC..." }] },
    },
  });
  await prisma.assignmentSubmission.create({
    data: {
      assignmentId: geometryChallenge.id, studentId: eric.id, attemptNumber: 1, status: "RESUBMISSION_REQUIRED",
      submittedAt: daysAgo(1),
      resubmissionReason: "Please justify why the two triangles formed by the angle bisector are congruent before concluding the angles are equal.",
      answers: { create: [{ questionId: geometryChallenge.questions[0].id, answerText: "Draw the angle bisector from A to BC, meeting it at D..." }] },
    },
  });
  await prisma.assignmentSubmission.create({
    data: {
      assignmentId: geometryChallenge.id, studentId: david.id, attemptNumber: 1, status: "GRADED",
      submittedAt: daysAgo(3), score: 2, maxScore: 5, gradedAt: daysAgo(2), gradedById: teacher.id,
      feedback: "The core idea is there, but the proof is missing justification for several steps. Review the worked example and try again on the next set.",
      answers: { create: [{ questionId: geometryChallenge.questions[0].id, answerText: "The angles look equal because the triangle is symmetric." }] },
    },
  });

  // Overdue, with one student never having started it — exercises the derived OVERDUE status.
  const combinatoricsHomework = await prisma.assignment.create({
    data: {
      classId: seniorMath.id, authorId: teacher.id,
      title: "Combinatorics Warm-up",
      instructions: "Five short counting problems — no calculators.",
      dueAt: daysAgo(3), status: "PUBLISHED", publishedAt: daysAgo(10), publishedById: teacher.id,
      questions: { create: [{ order: 1, text: "How many ways can 5 runners finish a race (no ties)?", points: 3 }] },
    },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  await prisma.assignmentSubmission.create({
    data: {
      assignmentId: combinatoricsHomework.id, studentId: divine.id, attemptNumber: 1, status: "GRADED",
      submittedAt: daysAgo(4), score: 3, maxScore: 3, gradedAt: daysAgo(3), gradedById: teacher.id,
      feedback: "Perfect.",
      answers: { create: [{ questionId: combinatoricsHomework.questions[0].id, answerText: "120" }] },
    },
  });
  // Eric and David never submitted — their effective status becomes OVERDUE, not just "Not started".

  const similarityWorksheet = await prisma.assignment.create({
    data: {
      classId: geometryLab.id, authorId: teacher.id,
      title: "Triangle Similarity Checkpoint",
      instructions: "Apply AA, SAS, and SSS similarity to the attached triangle set.",
      dueAt: daysFromNow(2), status: "PUBLISHED", publishedAt: daysAgo(1), publishedById: teacher.id,
      questions: { create: [{ order: 1, text: "Prove triangles ABC and DEF are similar given the marked angles.", points: 4 }] },
    },
  });
  await prisma.assignment.create({
    data: {
      classId: geometryLab.id, authorId: teacher.id,
      title: "Circle Theorems Draft Assignment",
      instructions: "Not yet ready to publish — still drafting the diagram set.",
      status: "DRAFT",
      questions: { create: [{ order: 1, text: "State and prove the inscribed angle theorem.", points: 5 }] },
    },
  });

  // --- Discussion: a short thread with a reply, plus a question on an assignment ---
  const rootComment = await prisma.comment.create({
    data: { targetType: "CONTENT", targetId: publishedNote.id, authorId: alice.id, body: "Does this apply to equations with a leading coefficient other than 1?" },
  });
  await prisma.comment.create({
    data: { targetType: "CONTENT", targetId: publishedNote.id, authorId: teacher.id, parentId: rootComment.id, body: "Yes — just divide through by the leading coefficient first, or use the general form directly with a, b, and c as given." },
  });
  await prisma.comment.create({
    data: { targetType: "ASSIGNMENT", targetId: geometryChallenge.id, authorId: grace.id, body: "Can we use the SAS congruence postulate directly, or does it need to be derived first?" },
  });

  // --- Notifications: a realistic mixed-read inbox for the header bell ---
  await prisma.notification.createMany({
    data: [
      { userId: alice.id, type: "ASSIGNMENT_PUBLISHED", message: "New assignment published: Algebra Practice Set", link: `/student/assignments/${algebraSet.id}`, read: true, createdAt: daysAgo(3) },
      { userId: alice.id, type: "GRADED", message: 'Your submission for "Geometry Proof Challenge" was graded: 4/5', link: `/student/assignments/${geometryChallenge.id}`, read: false, createdAt: daysAgo(1) },
      { userId: alice.id, type: "CONTENT_PUBLISHED", message: "New video published: Introduction to Number Theory", link: "/student/resources", read: false, createdAt: daysAgo(4) },
      { userId: eric.id, type: "RESUBMISSION_REQUESTED", message: 'Resubmission requested for "Geometry Proof Challenge"', link: `/student/assignments/${geometryChallenge.id}`, read: false, createdAt: daysAgo(1) },
      { userId: eric.id, type: "ASSIGNMENT_PUBLISHED", message: "New assignment published: Combinatorics Warm-up", link: `/student/assignments/${combinatoricsHomework.id}`, read: true, createdAt: daysAgo(10) },
      { userId: teacher.id, type: "NEW_SUBMISSION", message: 'Eric Habimana submitted "Algebra Practice Set"', link: `/teacher/assignments/${algebraSet.id}`, read: false, createdAt: daysAgo(1) },
      { userId: teacher.id, type: "COMMENT_REPLY", message: 'New comment on "Geometry Proof Challenge"', link: `/teacher/assignments/${geometryChallenge.id}`, read: false, createdAt: daysAgo(0) },
    ],
  });

  console.log("Seed complete.");
  console.log("Teacher logins:  username=teacher1 / teacher2   password=Teacher123!");
  console.log("Student logins:  username=student1..8           password = their Student ID (STU1001..STU1008)");
  console.log("                 (student4 = Paul, self-registered, no managing teacher)");
  console.log(`Classes:         ${seniorMath.name}, ${geometryLab.name}, ${physicsFoundations.name}`);
  console.log(`Question bank:   ${mathOlympiad.slug}, ${juniorChallenge.slug}, ${combinatoricsSprint.slug}, ${numberTheoryTrials.slug}`);
  console.log("Coverage:        content in every status, assignments in every status (incl. overdue),");
  console.log("                 exam results spread across every topic and skill level, a comment thread,");
  console.log("                 and a mixed read/unread notification inbox.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
