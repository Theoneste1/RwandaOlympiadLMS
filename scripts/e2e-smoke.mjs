import { PrismaClient } from '@prisma/client';
import { chromium } from '@playwright/test';

const baseUrl = 'http://localhost:3000';
const prisma = new PrismaClient();
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

async function expectRenderedPage(page, path) {
  await page.goto(`${baseUrl}${path}`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { level: 1 }).first().waitFor();
}

async function demoSignIn(page, label) {
  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Try a demo account' }).waitFor();
  // The demo buttons submit a real Server Action form — give the page a beat to hydrate so the
  // click doesn't race a plain native submit (same class of issue as the registration form).
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: label }).click();
}

try {
  // --- Public marketing site (untouched by the LMS rework) ---
  await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Advancing mathematical excellence for every Rwandan student' }).waitFor();

  await page.locator('header nav').getByRole('link', { name: 'Competitions' }).click();
  await page.waitForURL('**/competitions');
  await page.getByRole('heading', { name: 'National competitions for every grade level' }).waitFor();
  await page.getByRole('tab', { name: 'Science' }).click();
  await page.getByRole('heading', { name: 'Rwanda Science Olympiad' }).waitFor();

  const publicPages = ['/about', '/competitions', '/competitions/rwanda-mathematical-olympiad', '/contact', '/exam-centers', '/schools', '/technical-reports', '/register'];
  for (const path of publicPages) await expectRenderedPage(page, path);

  const invalidCompetition = await page.goto(`${baseUrl}/competitions/not-a-real-competition`, { waitUntil: 'domcontentloaded' });
  if (invalidCompetition?.status() !== 404) throw new Error(`Expected an unknown competition to return 404, got ${invalidCompetition?.status()}`);
  await page.getByRole('heading', { name: 'Page not found' }).waitFor();

  await page.setViewportSize({ width: 700, height: 900 });
  await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Toggle menu' }).click();
  await page.waitForFunction(() => document.querySelector('#mobile-menu') !== null);
  const mobileMenu = page.locator('#mobile-menu');
  for (const item of ['Competitions', 'Exam Centers', 'Schools', 'About Us', 'Technical Reports', 'Contact', 'Log In', 'Register']) {
    await mobileMenu.getByRole('link', { name: item, exact: true }).waitFor({ state: 'visible' });
  }
  await mobileMenu.getByRole('link', { name: 'Technical Reports', exact: true }).click();
  await page.waitForURL('**/technical-reports');
  await page.getByRole('heading', { level: 1 }).first().waitFor();
  await page.setViewportSize({ width: 1280, height: 900 });
  console.log('Public marketing site passed.');

  // --- Real demo sign-in (real session cookie, not localStorage) ---
  await demoSignIn(page, /Student demo/i);
  await page.waitForURL('**/student');
  await page.getByRole('heading', { name: /Good morning, Alice/i }).waitFor();
  await page.getByRole('button', { name: 'Notifications' }).click();
  await page.getByRole('dialog', { name: 'Notifications' }).waitFor({ timeout: 2000 });
  await page.getByRole('button', { name: /Profile/ }).click();
  await page.getByRole('dialog', { name: 'Profile' }).getByText('Alice Mutesi').waitFor({ timeout: 2000 });

  const studentPages = [
    { path: '/student', heading: /Good morning, Alice/i, nav: 'Dashboard' },
    { path: '/student/classes', heading: 'My Classes', nav: 'My Classes' },
    { path: '/student/classwork', heading: 'Classwork', nav: 'Classwork' },
    { path: '/student/assignments', heading: 'Assignments', nav: 'Assignments' },
    { path: '/student/exams', heading: 'Exams', nav: 'Exams' },
    { path: '/student/calendar', heading: 'Deadlines', nav: 'Calendar' },
    { path: '/student/grades', heading: 'Grades & Progress', nav: 'Grades' },
    { path: '/results', heading: /My results/i, nav: 'My Results' },
    { path: '/rankings', heading: 'Leaderboards', nav: 'Rankings' },
    { path: '/student/resources', heading: 'Resource Library', nav: 'Resources' },
    { path: '/support', heading: 'Support', nav: 'Support' },
    { path: '/account', heading: 'Profile information', nav: 'Profile' },
  ];
  for (const studentPage of studentPages) {
    await page.locator('aside nav').getByRole('link', { name: new RegExp(`^${studentPage.nav}`) }).click();
    await page.waitForURL(`**${studentPage.path}`);
    await page.getByRole('heading', { name: studentPage.heading, exact: typeof studentPage.heading === 'string' }).waitFor();
  }
  console.log('Student nav walk passed.');

  const seniorMath = await prisma.class.findFirstOrThrow({ where: { name: 'Senior Mathematics' } });
  await expectRenderedPage(page, `/student/classes/${seniorMath.id}`);
  await page.getByRole('heading', { name: 'Senior Mathematics', exact: true }).waitFor();
  await page.getByRole('link', { name: 'Classwork', exact: true }).click();
  await page.waitForURL(`**/student/classes/${seniorMath.id}?tab=classwork`);
  await page.getByRole('link', { name: 'People', exact: true }).click();
  await page.waitForURL(`**/student/classes/${seniorMath.id}?tab=people`);
  await page.getByRole('link', { name: 'Grades', exact: true }).click();
  await page.waitForURL(`**/student/classes/${seniorMath.id}?tab=grades`);

  // Search + the discovery panel on the exams page
  await expectRenderedPage(page, '/search?q=Senior');
  await page.getByText('Senior Mathematics').first().waitFor();

  await page.getByRole('button', { name: /Sign out/i }).click();
  await page.waitForURL('**/login');
  console.log('Student class detail, search, and sign-out passed.');

  // --- Teacher ---
  const teacher = await prisma.user.findUniqueOrThrow({ where: { username: 'teacher1' } });
  await demoSignIn(page, /Teacher \/ Coach demo/i);
  await page.waitForURL('**/teacher');
  await page.getByRole('heading', { name: new RegExp(`Welcome back, ${teacher.name.split(' ')[0]}`) }).waitFor();
  await page.getByRole('heading', { name: 'Coach Intelligence' }).waitFor();

  const teacherPages = [
    { path: '/teacher', heading: new RegExp(`Welcome back, ${teacher.name.split(' ')[0]}`), nav: 'Dashboard' },
    { path: '/teacher/classes', heading: 'My Classes', nav: 'My Classes' },
    { path: '/teacher/assignments', heading: 'Assignments', nav: 'Assignments' },
    { path: '/teacher/exams', heading: 'Exams', nav: 'Exams' },
    { path: '/teacher/question-bank', heading: 'Question Bank', nav: 'Question Bank' },
    { path: '/teacher/grades', heading: 'Gradebook', nav: 'Grades' },
    { path: '/teacher/resources', heading: 'Resource Library', nav: 'Resources' },
    { path: '/teacher/reports', heading: 'Reports & Analytics', nav: 'Reports' },
    { path: '/rankings', heading: 'Leaderboards', nav: 'Rankings' },
    { path: '/account', heading: 'Profile information', nav: 'Profile' },
  ];
  for (const teacherPage of teacherPages) {
    await page.locator('aside nav').getByRole('link', { name: new RegExp(`^${teacherPage.nav}`) }).click();
    await page.waitForURL(`**${teacherPage.path}`);
    await page.getByRole('heading', { name: teacherPage.heading, exact: typeof teacherPage.heading === 'string' }).waitFor();
  }
  console.log('Teacher nav walk passed.');

  await expectRenderedPage(page, `/teacher/classes/${seniorMath.id}`);
  await page.getByRole('heading', { name: 'Senior Mathematics', exact: true }).waitFor();
  await page.getByRole('link', { name: 'People', exact: true }).click();
  await page.waitForURL(`**/teacher/classes/${seniorMath.id}?tab=people`);
  await page.getByRole('link', { name: 'Grades', exact: true }).click();
  await page.waitForURL(`**/teacher/classes/${seniorMath.id}?tab=grades`);
  await page.getByRole('columnheader', { name: 'Rank' }).waitFor();

  // Question bank: create a competition and add a question end-to-end
  const competitionName = `E2E Smoke Test Set ${Date.now()}`;
  await expectRenderedPage(page, '/teacher/question-bank');
  await page.getByText('+ Create a new competition / question set').click();
  await page.getByLabel('Name').fill(competitionName);
  await page.getByLabel('Summary').fill('Created by the smoke test.');
  await page.getByRole('button', { name: 'Create' }).click();
  await page.getByText(competitionName).waitFor();
  await page.getByRole('link', { name: new RegExp(`^${competitionName}`) }).click();
  await page.waitForURL(/\/teacher\/question-bank\/.+/);
  await page.getByText('+ Add a question').click();
  await page.getByLabel('Question text').fill('What is 1 + 1?');
  const choiceInputs = page.getByPlaceholder(/Choice \d/);
  await choiceInputs.nth(0).fill('1');
  await choiceInputs.nth(1).fill('2');
  await choiceInputs.nth(2).fill('3');
  await choiceInputs.nth(3).fill('4');
  await page.locator('input[name="correctIndex"]').nth(1).check();
  await page.getByRole('button', { name: 'Add question' }).click();
  await page.locator('summary').filter({ hasText: 'What is 1 + 1?' }).waitFor();
  console.log('Question bank create-competition/add-question flow passed.');

  const createdCompetition = await prisma.competition.findFirstOrThrow({ where: { name: competitionName } });
  if (createdCompetition.subject !== 'Mathematics') throw new Error('New competition did not persist the expected subject.');
  // Clean up: this is test-created data, not seed/demo fixtures other assertions depend on.
  await prisma.question.deleteMany({ where: { competitionId: createdCompetition.id } });
  await prisma.competition.delete({ where: { id: createdCompetition.id } });

  await page.getByRole('button', { name: /Sign out/i }).click();
  await page.waitForURL('**/login');

  // --- Admin (any teacher session viewing the platform-wide screens) ---
  await demoSignIn(page, /Admin demo/i);
  await page.waitForURL('**/admin');
  await page.getByRole('heading', { name: 'Platform overview', exact: true }).waitFor();

  const adminPages = [
    { path: '/admin', heading: 'Platform overview', nav: 'Dashboard' },
    { path: '/admin/users', heading: 'User Directory', nav: 'Users' },
    { path: '/admin/students', heading: 'Student Management', nav: 'Students' },
    { path: '/admin/classes', heading: 'Class Management', nav: 'Classes' },
    { path: '/admin/competitions', heading: 'Competition Catalog', nav: 'Competitions' },
  ];
  for (const adminPage of adminPages) {
    await page.locator('aside nav').getByRole('link', { name: new RegExp(`^${adminPage.nav}`) }).click();
    await page.waitForURL(`**${adminPage.path}`);
    await page.getByRole('heading', { name: adminPage.heading, exact: true }).waitFor();
  }
  console.log('Admin nav walk passed.');

  // Real admin user edit (writes to the actual User row, not localStorage)
  await page.locator('aside nav').getByRole('link', { name: /^Users/ }).click();
  await page.waitForURL('**/admin/users');
  await page.waitForTimeout(300); // let the page hydrate before relying on the Server Action form
  const ericDetails = page.locator('details').filter({ hasText: 'Eric Habimana' });
  await ericDetails.locator('summary').click();
  await ericDetails.locator('form').getByLabel('Grade').fill('S6');
  await ericDetails.locator('form').getByRole('button', { name: 'Save' }).click();
  await page.waitForTimeout(800); // allow the action's navigation/refresh to land before asserting
  await page.locator('details').filter({ hasText: 'Eric Habimana' }).getByText('Grade S6').waitFor({ timeout: 10000 });

  const updatedEric = await prisma.user.findFirstOrThrow({ where: { name: 'Eric Habimana' } });
  if (updatedEric.grade !== 'S6') throw new Error('Admin user edit did not persist to the real User row.');
  console.log('Admin real user-edit flow passed.');

  await page.getByRole('button', { name: /Sign out/i }).click();
  await page.waitForURL('**/login');

  // --- Real registration (creates a real Prisma User, not a localStorage draft) ---
  const uniqueEmail = `e2e.${Date.now()}@example.test`;
  await page.goto(`${baseUrl}/register`, { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Full name').fill('E2E Test Student');
  await page.getByLabel('Email').fill(uniqueEmail);
  await page.getByLabel(/^Password/).fill('ValidPass123');
  await page.getByLabel(/^Confirm password/).fill('DifferentPass123');
  await page.getByRole('button', { name: 'Create student account' }).click();
  await page.locator('[role="alert"]').filter({ hasText: 'Passwords do not match.' }).waitFor();

  await page.getByLabel(/^Confirm password/).fill('ValidPass123');
  await page.getByRole('button', { name: 'Create student account' }).click();
  await page.waitForURL('**/student');
  await page.getByRole('heading', { name: /Good morning, E2E/i }).waitFor();

  const createdUser = await prisma.user.findUnique({ where: { email: uniqueEmail } });
  if (!createdUser) throw new Error('Registration did not create a real User row.');
  if (createdUser.passwordHash === 'ValidPass123') throw new Error('Password was stored in plain text.');
  console.log('Real registration flow passed.');

  await page.getByRole('button', { name: /Sign out/i }).click();
  await page.waitForURL('**/login');

  // --- Content/assignment workflow: Draft -> Publish -> Submit -> Grade -> Resubmission -> Resubmit ---
  // These pages were already real before this round's changes and are exercised unchanged.
  const teacherFlow = await browser.newPage();
  await demoSignIn(teacherFlow, /Teacher \/ Coach demo/i);
  await teacherFlow.waitForURL('**/teacher');

  const studentFlow = await browser.newPage();
  await demoSignIn(studentFlow, /Student demo/i);
  await studentFlow.waitForURL('**/student');

  await teacherFlow.goto(`${baseUrl}/teacher/assignments/new`, { waitUntil: 'domcontentloaded' });
  await teacherFlow.getByLabel('Class').selectOption({ label: 'Senior Mathematics' });
  await teacherFlow.getByLabel('Title').fill('E2E Workflow Quiz');
  await teacherFlow.getByLabel('Instructions').fill('Answer the question below.');
  await teacherFlow.getByPlaceholder('Question 1').fill('What is 2 + 2?');
  await teacherFlow.getByRole('button', { name: 'Save Draft' }).click();
  await teacherFlow.getByRole('heading', { name: 'E2E Workflow Quiz' }).waitFor();
  await teacherFlow.getByText('Draft', { exact: true }).first().waitFor();
  const assignmentId = teacherFlow.url().split('/').filter(Boolean).pop();

  await teacherFlow.goto(`${baseUrl}/teacher/assignments/${assignmentId}/edit`, { waitUntil: 'domcontentloaded' });
  await teacherFlow.getByLabel('Title').fill('E2E Workflow Quiz (edited)');
  await teacherFlow.getByRole('button', { name: 'Save changes' }).click();
  await teacherFlow.getByRole('heading', { name: 'E2E Workflow Quiz (edited)' }).waitFor();

  await teacherFlow.getByRole('button', { name: 'Publish' }).click();
  await teacherFlow.getByText('Published', { exact: true }).first().waitFor();

  await studentFlow.goto(`${baseUrl}/student/assignments`, { waitUntil: 'domcontentloaded' });
  await studentFlow.getByRole('link', { name: /E2E Workflow Quiz \(edited\)/ }).click();
  await studentFlow.waitForURL(`**/student/assignments/${assignmentId}`);
  await studentFlow.getByPlaceholder('Write your answer…').fill('4');
  await studentFlow.waitForTimeout(400);
  await studentFlow.getByRole('button', { name: 'Submit' }).click();
  await studentFlow.waitForURL(`**/student/assignments/${assignmentId}`);
  await studentFlow.getByText('Submitted — Pending grading').first().waitFor();

  await teacherFlow.goto(`${baseUrl}/teacher/assignments/${assignmentId}`, { waitUntil: 'domcontentloaded' });
  await teacherFlow.getByRole('link', { name: 'Grade', exact: true }).click();
  await teacherFlow.getByLabel(/Score/).fill('1');
  await teacherFlow.getByLabel('Feedback').fill('Correct!');
  await teacherFlow.getByRole('button', { name: 'Mark Graded' }).click();
  await teacherFlow.getByText('Graded.').waitFor();

  await studentFlow.goto(`${baseUrl}/student/assignments/${assignmentId}`, { waitUntil: 'domcontentloaded' });
  await studentFlow.getByText('Score: 1/1').waitFor();
  await studentFlow.getByText('Correct!').waitFor();

  await teacherFlow.goto(`${baseUrl}/teacher/assignments/${assignmentId}`, { waitUntil: 'domcontentloaded' });
  await teacherFlow.getByRole('link', { name: 'Review' }).click();
  await teacherFlow.getByRole('button', { name: 'Request Resubmission' }).click();
  await teacherFlow.getByLabel(/Reason/).fill('Please show your working.');
  await teacherFlow.getByRole('button', { name: 'Send resubmission request' }).click();
  await teacherFlow.getByText('Resubmission requested.').waitFor();

  await studentFlow.goto(`${baseUrl}/student/assignments/${assignmentId}`, { waitUntil: 'domcontentloaded' });
  await studentFlow.getByText('Please show your working.').first().waitFor();
  await studentFlow.getByPlaceholder('Write your answer…').fill('2 + 2 = 4');
  await studentFlow.waitForTimeout(400);
  await studentFlow.getByRole('button', { name: 'Submit' }).click();
  await studentFlow.waitForURL(`**/student/assignments/${assignmentId}`);
  await studentFlow.getByText('Submitted — Pending grading').first().waitFor();
  await studentFlow.getByText('Attempt history').waitFor();
  await studentFlow.getByText('Attempt #1').waitFor();
  await studentFlow.getByText('Reason: Please show your working.').waitFor();

  // Overdue status now derives from dueAt, including on the dashboard's Your Tasks panel
  await studentFlow.goto(`${baseUrl}/student`, { waitUntil: 'domcontentloaded' });
  await studentFlow.getByRole('heading', { name: 'Your Tasks' }).waitFor();

  await teacherFlow.goto(`${baseUrl}/teacher/assignments/new`, { waitUntil: 'domcontentloaded' });
  await teacherFlow.getByLabel('Class').selectOption({ label: 'Senior Mathematics' });
  await teacherFlow.getByLabel('Title').fill('Still a Draft');
  await teacherFlow.getByLabel('Instructions').fill('Not ready yet.');
  await teacherFlow.getByPlaceholder('Question 1').fill('Placeholder question.');
  await teacherFlow.getByRole('button', { name: 'Save Draft' }).click();
  await teacherFlow.getByRole('heading', { name: 'Still a Draft' }).waitFor();
  const draftAssignmentId = teacherFlow.url().split('/').filter(Boolean).pop();

  await studentFlow.goto(`${baseUrl}/student/assignments/${draftAssignmentId}`, { waitUntil: 'domcontentloaded' });
  await studentFlow.getByRole('heading', { name: 'Page not found' }).waitFor();
  if (await studentFlow.getByText('Still a Draft').count() > 0) {
    throw new Error('A student could see a draft assignment — backend draft enforcement failed.');
  }

  await teacherFlow.close();
  await studentFlow.close();

  console.log('Content/assignment workflow (draft -> edit -> publish -> submit -> grade -> resubmission -> resubmit) and draft-enforcement test passed.');
  console.log('All E2E smoke tests passed.');
} catch (error) {
  console.error('E2E smoke test failed:', error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
  await browser.close();
}
